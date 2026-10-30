import { useCallback,useEffect,useRef,useState } from 'react';
import type { Language } from '../content/profile';
import { microphoneError,pcmWav,transcribeMicrophone } from '../services/microphone';

// The visitor explicitly starts each conversation/test. Audio is temporary and
// sent only for transcription during an active conversation, never in mic tests.
export function useMicrophone(language:Language,onFinal:(text:string)=>void){
 const [devices,setDevices]=useState<MediaDeviceInfo[]>([]),[deviceId,setDeviceId]=useState('');
 const [listening,setListening]=useState(false),[opening,setOpening]=useState(false),[transcribing,setTranscribing]=useState(false);
 const [testing,setTesting]=useState(false),[level,setLevel]=useState(0),[deviceName,setDeviceName]=useState(''),[error,setError]=useState('');
 const alive=useRef(true),generation=useRef(0),callback=useRef(onFinal);callback.current=onFinal;
 const stream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),context=useRef<AudioContext|null>(null);
 const frame=useRef(0),timeout=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),request=useRef<AbortController|null>(null),finishRef=useRef<()=>void>(()=>{});
 const testSupported=typeof navigator!=='undefined'&&typeof navigator.mediaDevices?.getUserMedia==='function'&&typeof AudioContext!=='undefined';
 const supported=testSupported&&typeof MediaRecorder!=='undefined';
 const refresh=useCallback(async()=>{try{const all=await navigator.mediaDevices.enumerateDevices();if(alive.current)setDevices(all.filter(d=>d.kind==='audioinput'));}catch{/* No background permission prompt. */}},[]);
 const release=useCallback(()=>{cancelAnimationFrame(frame.current);clearTimeout(timeout.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;},[]);
 const cancel=useCallback(()=>{
  generation.current++;finishRef.current=()=>{};request.current?.abort();request.current=null;
  const current=recorder.current;recorder.current=null;if(current){current.ondataavailable=null;current.onstop=null;if(current.state!=='inactive')current.stop();}
  release();const ctx=context.current;context.current=null;if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});
  if(alive.current){setOpening(false);setListening(false);setTranscribing(false);setTesting(false);setLevel(0);}
 },[release]);
 const start=useCallback(async(testOnly=false)=>{
  if(!testSupported||(!testOnly&&!supported))return;cancel();const id=generation.current;setError('');setOpening(true);setTesting(testOnly);
  try{
   // This call produces the browser's explicit microphone permission prompt.
   const selected=await navigator.mediaDevices.getUserMedia({video:false,audio:{...(deviceId?{deviceId:{exact:deviceId}}:{}),echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(!alive.current||id!==generation.current){selected.getTracks().forEach(track=>track.stop());return;}
   stream.current=selected;const track=selected.getAudioTracks()[0];
   if(!track||track.readyState==='ended')throw new DOMException('Microphone unavailable','NotFoundError');
   setDeviceName(track.label||'Microfone');void refresh();
   const ctx=new AudioContext();context.current=ctx;await ctx.resume();
   if(!alive.current||id!==generation.current)return;
   const source=ctx.createMediaStreamSource(selected),analyser=ctx.createAnalyser();analyser.fftSize=1024;source.connect(analyser);const silent=ctx.createGain();silent.gain.value=0;analyser.connect(silent);silent.connect(ctx.destination);
   const meter=new Float32Array(analyser.fftSize),chunks:Blob[]=[];
   let heard=false,lastVoice=performance.now(),started=lastVoice,settled=false;
   let current:MediaRecorder|null=null;
   const finish=()=>{
    if(settled||id!==generation.current)return;settled=true;finishRef.current=()=>{};cancelAnimationFrame(frame.current);clearTimeout(timeout.current);
    if(testOnly){release();source.disconnect();analyser.disconnect();silent.disconnect();context.current=null;void ctx.close().catch(()=>{});setTesting(false);setListening(false);setLevel(0);if(!heard)setError('mic_no_signal');}
    else if(current&&current.state!=='inactive')current.stop();
   };finishRef.current=finish;
   if(!testOnly){
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>typeof MediaRecorder.isTypeSupported==='function'&&MediaRecorder.isTypeSupported(type));
    current=new MediaRecorder(selected,mime?{mimeType:mime}:undefined);recorder.current=current;const activeRecorder=current;
    current.ondataavailable=event=>{if(id===generation.current&&event.data.size)chunks.push(event.data);};
    current.onstop=async()=>{
     release();source.disconnect();analyser.disconnect();silent.disconnect();
     if(!alive.current||id!==generation.current)return;
     recorder.current=null;setListening(false);setOpening(false);setLevel(0);
     if(!heard){chunks.length=0;setError('mic_no_signal');context.current=null;if(ctx.state!=='closed')await ctx.close().catch(()=>{});return;}
     setTranscribing(true);const controller=new AbortController();request.current=controller;
     const timer=setTimeout(()=>controller.abort(),30000);
     try{
      const blob=new Blob(chunks,{type:activeRecorder.mimeType}),buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
      if(!alive.current||id!==generation.current)return;
      const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
      const text=await transcribeMicrophone(pcmWav(channels,buffer.sampleRate),language,controller.signal);
      if(alive.current&&id===generation.current)callback.current(text);
     }catch(cause){if(alive.current&&id===generation.current)setError(microphoneError(cause));}
     finally{chunks.length=0;clearTimeout(timer);if(id===generation.current){request.current=null;context.current=null;setTranscribing(false);}if(ctx.state!=='closed')await ctx.close().catch(()=>{});}
    };
    current.onerror=()=>{if(alive.current&&id===generation.current){cancel();setError('mic_busy');}};
    current.start(250);
   }
   track.onended=()=>{if(alive.current&&id===generation.current&&!settled){cancel();setError('mic_device_missing');}};
   const tick=()=>{
    if(id!==generation.current||settled)return;
    analyser.getFloatTimeDomainData(meter);let energy=0;for(const sample of meter)energy+=sample*sample;
    const rms=Math.sqrt(energy/meter.length),now=performance.now();setLevel(Math.min(100,Math.round(rms*1300)));
    if(rms>.004){heard=true;lastVoice=now;}
    if((testOnly&&now-started>6000)||(!testOnly&&((heard&&now-lastVoice>900&&now-started>700)||(!heard&&now-started>8000)))){finish();return;}
    frame.current=requestAnimationFrame(tick);
   };
   setOpening(false);setListening(true);timeout.current=setTimeout(finish,testOnly?6000:19500);frame.current=requestAnimationFrame(tick);
  }catch(cause){if(alive.current&&id===generation.current){cancel();setError(microphoneError(cause));}}
 },[supported,testSupported,cancel,deviceId,language,refresh,release]);
 useEffect(()=>{alive.current=true;const hidden=()=>{if(document.hidden)cancel();};document.addEventListener('visibilitychange',hidden);navigator.mediaDevices?.addEventListener?.('devicechange',refresh);return()=>{alive.current=false;cancel();document.removeEventListener('visibilitychange',hidden);navigator.mediaDevices?.removeEventListener?.('devicechange',refresh);};},[cancel,refresh]);
 useEffect(()=>{cancel();setError('');},[language,cancel]);
 return {supported,testSupported,devices,deviceId,setDeviceId,deviceName,listening,opening,transcribing,testing,level,error,start,cancel,finish:()=>finishRef.current(),clearError:()=>setError('')};
}
