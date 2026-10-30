import { audibleElapsed, captionWordAt } from '../neural/captionTiming';
import { audioMouthLevel } from '../neural/avatarDynamics';
import { elaraGreeting } from '../neural/pronunciation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../content/profile';
import type { PhoneTiming, Viseme } from '../neural/timing';
import { startLead, voiceDevicePreference } from '../neural/device';
type AudioPart={id:number;audio:ArrayBuffer;sampleRate:number;timings:PhoneTiming[];meta?:{index:number;offset:number;chars:number;totalChars:number;lastChars?:number;synthMs:number;last:boolean}};
export type VoiceMetrics={rtf?:number;firstChunkMs?:number;leadMs?:number;preferCpu?:boolean};
export function useNaturalVoice(language:Language){
  const [enabled,setEnabled]=useState(false),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(false);
  const [backend,setBackend]=useState('loading');
  const [threads,setThreads]=useState(1);
  const [latencyMs,setLatencyMs]=useState<number|undefined>();
  const requestedAt=useRef(0),firstAudio=useRef(false);
  const [progress,setProgress]=useState<number|undefined>(),[preparing,setPreparing]=useState(false),[speaking,setSpeaking]=useState(false);
  const [caption,setCaption]=useState(''),[wordStart,setWordStart]=useState(0),[wordLength,setWordLength]=useState(0);
  const [viseme,setViseme]=useState<Viseme>('closed'),[mouthOpen,setMouthOpen]=useState(0),[error,setError]=useState('');
  const alive=useRef(true),active=useRef(false),job=useRef(0),worker=useRef<Worker|null>(null),context=useRef<AudioContext|null>(null);
  const frame=useRef(0),parts=useRef<AudioPart[]>([]),done=useRef(false);
  const ready=useRef<Promise<void>|null>(null),resolveReady=useRef<(()=>void)|null>(null),rejectReady=useRef<((e:Error)=>void)|null>(null);
  const spokenText=useRef('');
  type Entry={node:AudioBufferSourceNode;part:AudioPart;samples:Float32Array;started:number;end:number;release:()=>void};
  const current=useRef<Entry|null>(null),queued=useRef<Entry|null>(null);
  const audioCursor=useRef<{part:AudioPart;samples:Float32Array;started:number}|null>(null);
  // The mobile renderer reads the current audio position directly, without waiting
  // for a React render to deliver the next mouth pose.
  const readMouthFrame=useCallback(()=>{
    const cursor=audioCursor.current,ctx=context.current;
    if(!cursor||!ctx)return {viseme:'closed' as Viseme,mouthOpen:0};
    const elapsed=audibleElapsed(ctx,cursor.started),phones=cursor.part.timings;
    let low=0,high=phones.length;
    while(low<high){const middle=(low+high)>>>1;if(phones[middle].end<=elapsed)low=middle+1;else high=middle;}
    const phone=phones[low],shape=phone&&elapsed>=phone.start&&elapsed<phone.end?phone.viseme:'closed';
    const from=Math.max(0,Math.floor(elapsed*cursor.part.sampleRate)),end=Math.min(cursor.samples.length,from+512);
    let sum=0;for(let i=from;i<end;i++)sum+=cursor.samples[i]*cursor.samples[i];
    return {viseme:shape,mouthOpen:shape==='closed'?0:audioMouthLevel(Math.sqrt(sum/Math.max(1,end-from)))};
  },[]);
  const playNext=useRef<()=>void>(()=>{});
  const supported=typeof window!=='undefined'&&'AudioContext' in window&&'Worker' in window&&typeof WebAssembly!=='undefined';
  const stop=useCallback(()=>{
    audioCursor.current=null;const previous=job.current++;worker.current?.postMessage({type:'cancel',id:previous});
    for(const entry of [current.current,queued.current]){if(!entry)continue;entry.node.onended=null;try{entry.node.stop();}catch{/* already stopped */}entry.release();}current.current=null;queued.current=null;parts.current=[];done.current=true;cancelAnimationFrame(frame.current);
    if(alive.current){setSpeaking(false);setPreparing(false);setViseme('closed');setMouthOpen(0);setWordLength(0);setCaption('');setLatencyMs(undefined);}
  },[]);
  // Gapless playback: while one chunk plays, the next is already scheduled on the
  // AudioContext clock, so no main-thread `onended` round trip sits between chunks.
  // Before the first chunk, an optional lead (from measured synthesis speed) trades a
  // short initial wait for continuous speech on slow devices.
  const [metrics,setMetrics]=useState<VoiceMetrics>({});
  const schedule=(ctx:AudioContext,part:AudioPart,when:number):Entry=>{
    const samples=new Float32Array(part.audio);const buffer=ctx.createBuffer(1,samples.length,part.sampleRate);buffer.copyToChannel(samples,0);
    const node=ctx.createBufferSource();node.buffer=buffer;const analyser=ctx.createAnalyser();analyser.fftSize=512;
    node.connect(analyser);
    // Gentle output shaping comes AFTER the analyser, preserving the approved mouth input.
    const tone=ctx.createBiquadFilter();tone.type='highshelf';tone.frequency.value=3800;tone.gain.value=language==='pt'?-2.5:-2;
    const gain=ctx.createGain();gain.gain.value=.88;
    const warmth=language==='pt'?ctx.createBiquadFilter():undefined;
    if(warmth){warmth.type='lowshelf';warmth.frequency.value=240;warmth.gain.value=1.2;tone.connect(warmth);warmth.connect(gain);}else tone.connect(gain);
    analyser.connect(tone);gain.connect(ctx.destination);
    const entry:Entry={node,part,samples,started:when,end:when+samples.length/part.sampleRate,release:()=>{node.disconnect();analyser.disconnect();tone.disconnect();warmth?.disconnect();gain.disconnect();}};
    node.onended=()=>finish.current(entry);
    node.start(when);
    return entry;
  };
  const staticMobile=useRef<boolean|null>(null);
  const begin=(ctx:AudioContext,entry:Entry)=>{
    current.current=entry;audioCursor.current={part:entry.part,samples:entry.samples,started:entry.started};
    if(staticMobile.current===null)staticMobile.current=window.matchMedia?.('(max-width: 760px) and (pointer: coarse)').matches??false;
    const {part,samples,started}=entry;let index=0,captionIndex=0,audible=false;
    let lastWord=-1,lastCaptionLength=-1,lastViseme='',lastUi=0;
    const markAudible=()=>{
      audible=true;
      if(!firstAudio.current){firstAudio.current=true;setLatencyMs(Math.round(performance.now()-requestedAt.current));}
      setSpeaking(true);setPreparing(false);
    };
    const tick=()=>{
      if(current.current!==entry||!alive.current)return;
      if(!audible){if(ctx.currentTime+.001<started){frame.current=requestAnimationFrame(tick);return;}markAudible();}
      const elapsed=audibleElapsed(ctx,started);while(index<part.timings.length-1&&part.timings[index].end<=elapsed)index++;
      const phone=part.timings[index];
      const shape=phone&&elapsed>=phone.start&&elapsed<phone.end?phone.viseme:'closed';
      if(!staticMobile.current){
        const sampleIndex=Math.floor(elapsed*part.sampleRate),to=Math.min(samples.length,sampleIndex+512);let sum=0;for(let i=sampleIndex;i<to;i++)sum+=samples[i]*samples[i];
        const amplitude=audioMouthLevel(Math.sqrt(sum/512));
        if(shape!==lastViseme){lastViseme=shape;setViseme(shape);}
        if(elapsed-lastUi>=1/30){lastUi=elapsed;setMouthOpen(shape==='closed'?0:amplitude);}
      }
      while(captionIndex<part.timings.length-1&&part.timings[captionIndex].end<=elapsed)captionIndex++;
      const currentWord=part.timings[captionIndex];
      const highlighted=currentWord&&elapsed>=currentWord.start&&elapsed<currentWord.end&&currentWord.charLength>0?captionWordAt(spokenText.current,currentWord.charStart):undefined;
      const nextWord=highlighted?.start??-1,nextLength=highlighted?.length??0;
      if(nextWord!==lastWord||nextLength!==lastCaptionLength){lastWord=nextWord;lastCaptionLength=nextLength;setWordStart(Math.max(0,nextWord));setWordLength(nextLength);}
      frame.current=requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    if(ctx.currentTime+.001>=started)markAudible();
    frame.current=requestAnimationFrame(tick);
  };
  const finish=useRef<(entry:Entry)=>void>(()=>{});
  finish.current=entry=>{
    entry.release();
    if(queued.current===entry){queued.current=null;return;}
    if(current.current!==entry)return;
    current.current=null;audioCursor.current=null;cancelAnimationFrame(frame.current);
    const ctx=context.current,next=queued.current;queued.current=null;
    if(next&&ctx&&next.part.id===job.current){begin(ctx,next);playNext.current();return;}
    if(alive.current){setSpeaking(false);setViseme('closed');setMouthOpen(0);setWordLength(0);}
    playNext.current();
  };
  playNext.current=()=>{
    const ctx=context.current;if(!ctx||queued.current)return;
    while(parts.current.length&&parts.current[0].id!==job.current)parts.current.shift();
    const part=parts.current.shift();
    if(!part){if(!current.current&&alive.current){setSpeaking(false);setPreparing(!done.current);setViseme('closed');setMouthOpen(0);}return;}
    if(ctx.state!=='running'){setError('speech_failed');setPreparing(false);return;}
    if(current.current){queued.current=schedule(ctx,part,Math.max(ctx.currentTime,current.current.end));return;}
    let lead=0;
    const meta=part.meta;
    if(meta&&meta.index===0&&!meta.last){
      const firstSec=part.audio.byteLength/4/part.sampleRate;
      lead=startLead({rtf:meta.synthMs/1000/Math.max(.05,firstSec),firstAudio:firstSec,firstChars:meta.offset+meta.chars,totalChars:meta.totalChars,lastChars:meta.lastChars});
      setMetrics(m=>({...m,rtf:Math.round(meta.synthMs/10/Math.max(.05,firstSec))/100,firstChunkMs:meta.synthMs,leadMs:Math.round(lead*1000)}));
    }else if(meta&&meta.index===0){setMetrics(m=>({...m,rtf:Math.round(meta.synthMs/10/Math.max(.05,part.audio.byteLength/4/part.sampleRate))/100,firstChunkMs:meta.synthMs,leadMs:0}));}
    begin(ctx,schedule(ctx,part,ctx.currentTime+lead));
    playNext.current();
  };
  const ensure=useCallback(()=>{
    if(ready.current)return ready.current;
    setLoading(true);setProgress(undefined);setError('');
    ready.current=new Promise<void>((resolve,reject)=>{resolveReady.current=resolve;rejectReady.current=reject;});
    worker.current?.terminate();
    const instance=new Worker(new URL('../neural/neural.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=event=>{
      if(!alive.current||worker.current!==instance)return;
      const m=event.data;
      if(m.type==='progress'){if(typeof m.progress==='number')setProgress(Math.max(0,Math.min(100,Math.round(m.progress))));}
      if(m.type==='loading'){setLoading(true);setProgress(undefined);}
      if(m.type==='backend'){setBackend(m.backend);setLoading(false);setThreads(m.threads??1);}
      if(m.type==='ready'){setBackend(m.backend??'wasm');setThreads(typeof m.threads==='number'?m.threads:1);setLoaded(true);setLoading(false);resolveReady.current?.();}
      if(m.type==='audio'&&m.id===job.current){parts.current.push(m as AudioPart);playNext.current();}
      if(m.type==='done'&&m.id===job.current){done.current=true;if(!current.current&&!parts.current.length){setPreparing(false);setSpeaking(false);}}
      if(m.type==='error'){
        console.warn('Elara neural voice:',m.message);
        if(m.id===undefined){setLoading(false);setLoaded(false);rejectReady.current?.(new Error('Neural voice unavailable'));ready.current=null;}
        if(m.id===undefined||m.id===job.current){stop();active.current=false;setEnabled(false);setError('neural_failed');setPreparing(false);setSpeaking(false);setViseme('closed');setMouthOpen(0);}
      }
    };
    instance.onerror=(event)=>{if(!alive.current||worker.current!==instance)return;stop();console.warn('Elara neural runtime:',event.message);active.current=false;setEnabled(false);setLoading(false);setPreparing(false);setError('neural_failed');rejectReady.current?.(new Error('Neural runtime failed'));ready.current=null;};
    const device=voiceDevicePreference();setMetrics(m=>({...m,preferCpu:device.preferCpu}));
    instance.postMessage({type:'load',language,preferCpu:device.preferCpu});return ready.current;
  },[language]);
  const say=useCallback(async(text:string)=>{
    if(!supported)return;stop();requestedAt.current=performance.now();firstAudio.current=false;setLatencyMs(undefined);setError('');setPreparing(true);const id=job.current;
    try{
      if(!context.current)context.current=new AudioContext();
      await context.current.resume();await ensure();if(!alive.current||job.current!==id)return;
      const clean=text.replace(/[*#`]/g,'').trim();spokenText.current=clean;setCaption(clean);setWordStart(0);setWordLength(0);done.current=false;
      worker.current?.postMessage({type:'generate',id,text:clean,language});
    }catch{if(alive.current&&job.current===id){active.current=false;setEnabled(false);setPreparing(false);setError('neural_failed');}}
  },[supported,stop,ensure,language]);
  const latestSay=useRef(say);latestSay.current=say;
  const speakReply=useCallback((text:string)=>{if(active.current)void latestSay.current(text);},[]);
  function toggle(greet = true){
    if(active.current){active.current=false;setEnabled(false);stop();return;}
    active.current=true;setEnabled(true);
    if(greet)void say(elaraGreeting[language]);
    else {
      // Unlock playback in the mic tap gesture; later replies arrive asynchronously.
      try {
        if(!context.current)context.current=new AudioContext();
        void context.current.resume().catch(()=>{if(alive.current&&active.current){active.current=false;setEnabled(false);setError('neural_failed');}});
        // Load while listening/transcribing instead of waiting until the answer arrives.
        void ensure().catch(()=>{});
      } catch { active.current=false;setEnabled(false);setError('neural_failed'); }
    }
  }
  useEffect(()=>{alive.current=true;const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>{alive.current=false;stop();worker.current?.terminate();worker.current=null;ready.current=null;void context.current?.close();context.current=null;document.removeEventListener('visibilitychange',hidden);};},[stop]);
  useEffect(()=>{stop();setCaption('');},[language,stop]);
  return{readMouthFrame,backend,threads,latencyMs,metrics,enabled,supported,loaded,loading,progress,preparing,speaking,caption,wordStart,wordLength,viseme,mouthOpen,error,clearError:()=>setError(''),say,speakReply,stopSpeech:stop,toggleVoice:toggle};
}
