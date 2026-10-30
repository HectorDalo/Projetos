import type { Env } from './index';
export const TRANSCRIPTION_MODEL='@cf/openai/whisper-large-v3-turbo';
const LIMIT=650000;
export async function transcribeRequest(request:Request,env:Env,headers:Record<string,string>):Promise<Response>{
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 if(!env.AI)return json({error:'not_configured'},503);
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('audio/wav'))return json({error:'invalid_audio_type'},415);
 const language=new URL(request.url).searchParams.get('language');if(language!=='pt'&&language!=='en')return json({error:'invalid_language'},400);
 const reader=request.body?.getReader();if(!reader)return json({error:'invalid_audio'},400);
 const chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>LIMIT){await reader.cancel();return json({error:'audio_too_large'},413);}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.length;}
 if(bytes.length<9644)return json({error:'no_speech'},422);
 const view=new DataView(bytes.buffer),tag=(from:number,to:number)=>String.fromCharCode(...bytes.subarray(from,to));
 if(tag(0,4)!=='RIFF'||tag(8,12)!=='WAVE'||tag(12,16)!=='fmt '||tag(36,40)!=='data'||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2!==0)return json({error:'invalid_audio'},400);
 let energy=0;for(let i=44;i<bytes.length;i+=2)energy+=(view.getInt16(i,true)/32768)**2;
 if(Math.sqrt(energy/((bytes.length-44)/2))<.0015)return json({error:'no_speech'},422);
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 try{
  const result=await env.AI.run(TRANSCRIPTION_MODEL,{audio:btoa(binary),language,task:'transcribe',vad_filter:true,condition_on_previous_text:false,initial_prompt:language==='pt'?'Hector Dalonso. Portfólio. ENIAC. Edu Tintas. Python, Tkinter, JSON.':'Hector Dalonso. Portfolio. ENIAC. Python, Tkinter, JSON.'});
  if(!result||typeof result!=='object'||!('text' in result)||typeof result.text!=='string'||!result.text.trim())return json({error:'no_speech'},422);
  if(result.text.length>2000)return json({error:'invalid_transcript'},502);
  return json({text:result.text.trim()});
 }catch(cause){
  const detail=cause instanceof Error?cause.message:String(cause);
  if(/3036|daily free allocation/i.test(detail))return json({error:'quota_exhausted'},429);
  if(/3040|capacity temporarily/i.test(detail))return json({error:'provider_busy'},503);
  return json({error:'transcription_failed'},503);
 }
}
