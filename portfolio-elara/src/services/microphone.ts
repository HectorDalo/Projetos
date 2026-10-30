import type { Language } from '../content/profile';
import { ChatError } from './assistant';
const base=(import.meta.env.VITE_API_BASE_URL??'').replace(/\/$/,'');
export function pcmWav(channels:Float32Array[],inputRate:number):Blob {
 const rate=16000,sourceLength=channels[0]?.length??0;
 if(!channels.length||!sourceLength||!Number.isFinite(inputRate)||inputRate<=0||sourceLength/inputRate>20.2)throw new Error('Invalid audio length');
 const count=Math.floor(sourceLength*rate/inputRate),bytes=new ArrayBuffer(44+count*2),view=new DataView(bytes);
 const str=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 str(0,'RIFF');view.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){
  const from=Math.floor(i*inputRate/rate),to=Math.max(from+1,Math.min(sourceLength,Math.floor((i+1)*inputRate/rate)));
  let value=0;for(const channel of channels)for(let j=from;j<to;j++)value+=channel[j]??0;
  value=Math.max(-1,Math.min(1,value/((to-from)*channels.length)));
  view.setInt16(44+i*2,value<0?value*32768:value*32767,true);
 }
 return new Blob([bytes],{type:'audio/wav'});
}
export async function transcribeMicrophone(audio:Blob,language:Language,signal:AbortSignal):Promise<string>{
 const response=await fetch(`${base}/api/transcribe?language=${language}`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio,signal});
 const data=await response.json();if(!response.ok)throw new ChatError(typeof data.error==='string'?data.error:'transcription_failed',response.status);
 if(typeof data.text!=='string'||!data.text.trim()||data.text.length>2000)throw new Error('Invalid transcript');
 return data.text.trim();
}
export function microphoneError(error:unknown):string {
 if(error instanceof ChatError)return error.code;
 const name=error instanceof DOMException?error.name:'';
 return name==='NotAllowedError'||name==='SecurityError'?'mic_denied':name==='NotFoundError'?'mic_unavailable':name==='OverconstrainedError'?'mic_device_missing':name==='NotReadableError'?'mic_busy':'recognition_failed';
}
