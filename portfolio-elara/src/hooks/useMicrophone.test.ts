// @vitest-environment jsdom
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
class ReadableBlob extends Blob{arrayBuffer():Promise<ArrayBuffer>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(this);});}}
const cloud=vi.hoisted(()=>vi.fn());
vi.mock('../services/microphone',async importOriginal=>({...await importOriginal<typeof import('../services/microphone')>(),transcribeMicrophone:cloud}));
import {useMicrophone} from './useMicrophone';
let rmsValue=.03;
let tick:FrameRequestCallback,permission:ReturnType<typeof vi.fn>,track:{label:string;readyState:string;stop:ReturnType<typeof vi.fn>;onended:null|(()=>void)};
class Recorder{
 static isTypeSupported=()=>true;state='inactive';mimeType='audio/webm';
 ondataavailable:null|((e:{data:Blob})=>void)=null;onstop:null|(()=>void)=null;onerror:null|(()=>void)=null;
 start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([1,2,3])])});this.onstop?.();}
}
beforeEach(()=>{
 rmsValue=.03;
 track={label:'Headset USB',readyState:'live',stop:vi.fn(),onended:null};
 const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};permission=vi.fn().mockResolvedValue(stream);
 vi.stubGlobal('Blob',ReadableBlob);vi.stubGlobal('MediaRecorder',Recorder);
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:permission,enumerateDevices:vi.fn().mockResolvedValue([{kind:'audioinput',deviceId:'headset',label:'Headset USB'}]),addEventListener:vi.fn(),removeEventListener:vi.fn()}});
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{tick=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('AudioContext',class{destination={};resume=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);createMediaStreamSource=()=>({connect:vi.fn(),disconnect:vi.fn()});createGain=()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()});createAnalyser=()=>({fftSize:1024,connect:vi.fn(),disconnect:vi.fn(),getFloatTimeDomainData:(values:Float32Array)=>values.fill(rmsValue)});decodeAudioData=vi.fn().mockResolvedValue({numberOfChannels:1,sampleRate:16000,getChannelData:()=>new Float32Array(16000).fill(.03)});});
 cloud.mockResolvedValue('Fale sobre o Hector.');
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();vi.restoreAllMocks();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined});});
it('requests permission only after the user starts, respects the exact headset and uploads one final question',async()=>{
 const final=vi.fn();const {result}=renderHook(()=>useMicrophone('pt',final));expect(permission).not.toHaveBeenCalled();
 act(()=>result.current.setDeviceId('headset'));await act(async()=>{await result.current.start();});
 expect(permission).toHaveBeenCalledWith({video:false,audio:{deviceId:{exact:'headset'},echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 expect(result.current.listening).toBe(true);expect(result.current.deviceName).toBe('Headset USB');
 act(()=>tick(10));expect(result.current.level).toBeGreaterThan(0);act(()=>result.current.finish());
 await waitFor(()=>expect(final).toHaveBeenCalledWith('Fale sobre o Hector.'));expect(cloud).toHaveBeenCalledTimes(1);expect(track.stop).toHaveBeenCalled();
});
it('tests permission and signal locally without sending audio to transcription',async()=>{
 const {result}=renderHook(()=>useMicrophone('pt',vi.fn()));await act(async()=>{await result.current.start(true);});
 act(()=>tick(10));expect(result.current.level).toBeGreaterThan(0);act(()=>result.current.finish());
 expect(cloud).not.toHaveBeenCalled();expect(track.stop).toHaveBeenCalled();expect(result.current.testing).toBe(false);
});
it('surfaces permission denial and releases a late permission result after unmount',async()=>{
 permission.mockRejectedValueOnce(new DOMException('Denied','NotAllowedError'));
 const {result,unmount}=renderHook(()=>useMicrophone('pt',vi.fn()));await act(async()=>{await result.current.start();});expect(result.current.error).toBe('mic_denied');expect(cloud).not.toHaveBeenCalled();
 let resolve!:(value:unknown)=>void;permission.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 act(()=>{void result.current.start();});unmount();
 await act(async()=>{resolve({getTracks:()=>[track],getAudioTracks:()=>[track]});await Promise.resolve();});expect(track.stop).toHaveBeenCalled();
});

it('cancels transcription and ignores a late result after ending the microphone session',async()=>{
 let resolve!:(text:string)=>void;cloud.mockImplementationOnce(()=>new Promise<string>(r=>{resolve=r;}));
 const final=vi.fn();const {result}=renderHook(()=>useMicrophone('pt',final));await act(async()=>{await result.current.start();});
 act(()=>tick(10));act(()=>result.current.finish());await waitFor(()=>expect(cloud).toHaveBeenCalledTimes(1));
 const signal=cloud.mock.calls[0][2] as AbortSignal;act(()=>result.current.cancel());expect(signal.aborted).toBe(true);
 await act(async()=>{resolve('late transcript');await Promise.resolve();});expect(final).not.toHaveBeenCalled();expect(result.current.transcribing).toBe(false);
});

it('waits through a short pause but sends the completed phrase after about 900ms of silence',async()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
 const {result}=renderHook(()=>useMicrophone('pt',vi.fn()));await act(async()=>{await result.current.start();});
 now=100;act(()=>tick(now));rmsValue=0;
 now=800;act(()=>tick(now));expect(result.current.listening).toBe(true);expect(cloud).not.toHaveBeenCalled();
 now=1050;act(()=>tick(now));await waitFor(()=>expect(cloud).toHaveBeenCalledTimes(1));
 expect(result.current.listening).toBe(false);expect(track.stop).toHaveBeenCalled();
});
