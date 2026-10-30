// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNaturalVoice } from './useNaturalVoice';
let instance: FakeWorker;
class FakeWorker {
  onmessage: ((event: {data:unknown})=>void) | null = null;
  onerror: ((event:unknown)=>void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor(){instance=this;}
}
beforeEach(()=>{
  vi.stubGlobal('Worker',FakeWorker);
  vi.stubGlobal('AudioContext',class {state='running';resume=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('does not download or start speaking before explicit activation',async()=>{
  const {result}=renderHook(()=>useNaturalVoice('pt'));
  expect(result.current.enabled).toBe(false);expect(result.current.loading).toBe(false);
  act(()=>result.current.toggleVoice());
  await waitFor(()=>expect(result.current.loading).toBe(true));
  expect(instance.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'load',language:'pt'}));
  expect(result.current.speaking).toBe(false);
});
it('reports a real runtime failure and switches off rather than pretending audio is active',async()=>{
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  const {result}=renderHook(()=>useNaturalVoice('pt'));
  act(()=>result.current.toggleVoice());
  await waitFor(()=>expect(result.current.loading).toBe(true));
  act(()=>instance.onmessage?.({data:{type:'error',message:'Runtime cannot load'}}));
  await waitFor(()=>expect(result.current.error).toBe('neural_failed'));
  expect(result.current.enabled).toBe(false);expect(result.current.speaking).toBe(false);
});
it('ignores late model readiness and delayed replies after the visitor disables voice',async()=>{
  const {result}=renderHook(()=>useNaturalVoice('en'));
  act(()=>result.current.toggleVoice());
  await waitFor(()=>expect(result.current.loading).toBe(true));
  act(()=>result.current.toggleVoice());
  await act(async()=>{instance.onmessage?.({data:{type:'ready'}});});
  act(()=>result.current.speakReply('A delayed reply'));
  expect(instance.postMessage.mock.calls.some(call=>call[0].type==='generate')).toBe(false);
  expect(result.current.enabled).toBe(false);
});

it('handles audio device initialization failure without leaving voice enabled or preparing',async()=>{
 vi.stubGlobal('AudioContext',class {constructor(){throw new Error('Audio device unavailable');}});
 const {result}=renderHook(()=>useNaturalVoice('pt'));
 act(()=>result.current.toggleVoice());
 await waitFor(()=>expect(result.current.error).toBe('neural_failed'));
 expect(result.current.enabled).toBe(false);expect(result.current.preparing).toBe(false);
});

it('unlocks audio and preloads the model during the microphone gesture without a greeting',()=>{
 const resume=vi.fn().mockResolvedValue(undefined),construct=vi.fn();
 vi.stubGlobal('AudioContext',class{constructor(){construct();}state='running';resume=resume;close=vi.fn().mockResolvedValue(undefined);});
 const {result}=renderHook(()=>useNaturalVoice('en'));
 act(()=>result.current.toggleVoice(false));
 expect(construct).toHaveBeenCalledTimes(1);expect(resume).toHaveBeenCalledTimes(1);
 expect(result.current.enabled).toBe(true);expect(result.current.loading).toBe(true);expect(result.current.preparing).toBe(false);
 expect(instance.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'load',language:'en'}));expect(instance.postMessage.mock.calls.some(call=>call[0].type==='generate')).toBe(false);
});

it('aligns complete caption words to speaker output and mouth shapes to the same audible clock',async()=>{
 let currentTime=0,outputTime=0,frame:FrameRequestCallback=()=>{};
 const analyser={fftSize:512,connect:vi.fn(),disconnect:vi.fn(),getFloatTimeDomainData:(values:Float32Array)=>values.fill(.03)};
 const tone={type:'',frequency:{value:0},gain:{value:0},connect:vi.fn(),disconnect:vi.fn()};
 const gain={gain:{value:0},connect:vi.fn(),disconnect:vi.fn()};
 const node={buffer:null,onended:null as null|(()=>void),connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn()};
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('AudioContext',class{state='running';get currentTime(){return currentTime;}destination={};resume=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);getOutputTimestamp=()=>({contextTime:outputTime});createBuffer=()=>({copyToChannel:vi.fn()});createBufferSource=()=>node;createAnalyser=()=>analyser;createBiquadFilter=()=>tone;createGain=()=>gain;});
 const {result}=renderHook(()=>useNaturalVoice('pt'));let pending:Promise<void>;
 act(()=>{pending=result.current.say('Hector estuda.');});
 await waitFor(()=>expect(result.current.loading).toBe(true));
 await act(async()=>{instance.onmessage?.({data:{type:'ready'}});await pending;});
 const timings=[{symbol:'a',start:0,end:.4,charStart:1,charLength:2,viseme:'open'},{symbol:'o',start:.4,end:1,charStart:8,charLength:2,viseme:'round'}];
 const id=instance.postMessage.mock.calls.find(call=>call[0].type==='generate')![0].id;
 act(()=>instance.onmessage?.({data:{type:'audio',id,audio:new Float32Array(24000).buffer,sampleRate:24000,timings}}));
 currentTime=.9;outputTime=.2;act(()=>frame(900));
 expect(result.current.viseme).toBe('open');expect(result.current.wordStart).toBe(0);expect(result.current.wordLength).toBe(6);
 outputTime=.6;expect(result.current.readMouthFrame().viseme).toBe('round');expect(result.current.viseme).toBe('open');act(()=>frame(1000));expect(result.current.viseme).toBe('round');expect(result.current.wordStart).toBe(7);expect(result.current.wordLength).toBe(7);
 expect(analyser.connect).toHaveBeenCalledWith(tone);expect(gain.gain.value).toBe(.88);
 act(()=>node.onended?.());expect(result.current.wordLength).toBe(0);
});

it('schedules the next chunk on the audio clock right where the current one ends (no gap)',async()=>{
 const starts:number[]=[];const nodes:{onended:null|(()=>void);start:(when:number)=>void;stop:()=>void;connect:()=>void;disconnect:()=>void;buffer:unknown}[]=[];
 const audioNode=()=>({connect:vi.fn(),disconnect:vi.fn(),fftSize:512,type:'',frequency:{value:0},gain:{value:0}});
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('AudioContext',class{state='running';currentTime=0;destination={};resume=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);
  createBuffer=()=>({copyToChannel:vi.fn()});createAnalyser=audioNode;createBiquadFilter=audioNode;createGain=audioNode;
  createBufferSource=()=>{const node={buffer:null as unknown,onended:null as null|(()=>void),connect:vi.fn(),disconnect:vi.fn(),stop:vi.fn(),start:(when:number)=>{starts.push(when);}};nodes.push(node);return node;};});
 const {result}=renderHook(()=>useNaturalVoice('pt'));let pending:Promise<void>;
 act(()=>{pending=result.current.say('Oi, tudo bem com você hoje?');});
 await waitFor(()=>expect(result.current.loading).toBe(true));
 await act(async()=>{instance.onmessage?.({data:{type:'ready'}});await pending;});
 const id=instance.postMessage.mock.calls.find(call=>call[0].type==='generate')![0].id;
 const timings=[{symbol:'a',start:0,end:.5,charStart:0,charLength:2,viseme:'open'}];
 act(()=>instance.onmessage?.({data:{type:'audio',id,audio:new Float32Array(12000).buffer,sampleRate:24000,timings}}));
 act(()=>instance.onmessage?.({data:{type:'audio',id,audio:new Float32Array(24000).buffer,sampleRate:24000,timings}}));
 expect(starts).toEqual([0,.5]);expect(result.current.speaking).toBe(true);
 act(()=>nodes[0].onended?.());expect(result.current.speaking).toBe(true);
 act(()=>instance.onmessage?.({data:{type:'done',id}}));act(()=>nodes[1].onended?.());
 expect(result.current.speaking).toBe(false);
});
it('holds the first chunk briefly when synthesis is slower than real time',async()=>{
 const starts:number[]=[];const audioNode=()=>({connect:vi.fn(),disconnect:vi.fn(),fftSize:512,type:'',frequency:{value:0},gain:{value:0}});
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('AudioContext',class{state='running';currentTime=0;destination={};resume=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);
  createBuffer=()=>({copyToChannel:vi.fn()});createAnalyser=audioNode;createBiquadFilter=audioNode;createGain=audioNode;
  createBufferSource=()=>({buffer:null,onended:null,connect:vi.fn(),disconnect:vi.fn(),stop:vi.fn(),start:(when:number)=>{starts.push(when);}});});
 const {result}=renderHook(()=>useNaturalVoice('pt'));let pending:Promise<void>;
 act(()=>{pending=result.current.say('Uma resposta longa.');});
 await waitFor(()=>expect(result.current.loading).toBe(true));
 await act(async()=>{instance.onmessage?.({data:{type:'ready'}});await pending;});
 const id=instance.postMessage.mock.calls.find(call=>call[0].type==='generate')![0].id;
 // 1 s of audio for 20 chars took 2 s to synthesize; 200 chars remain.
 act(()=>instance.onmessage?.({data:{type:'audio',id,audio:new Float32Array(24000).buffer,sampleRate:24000,timings:[],meta:{index:0,offset:0,chars:20,totalChars:220,synthMs:2000,last:false}}}));
 expect(starts[0]).toBeGreaterThan(0);expect(starts[0]).toBeLessThanOrEqual(3.5);
 expect(result.current.speaking).toBe(false);expect(result.current.metrics.rtf).toBe(2);
});
