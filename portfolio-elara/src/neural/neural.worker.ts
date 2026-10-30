import { mappedPhonemes, rawPhonemeSpans } from './pronunciation';
import { alignPhones, speechChunks, voiceChunks, withSpeechPause, compactSilence } from './timing';
import type { PhoneMap } from './timing';
// Public npm runtimes, pinned versions; model files load only after visitor opt-in.
const HF='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';
const PHONEMIZER='https://cdn.jsdelivr.net/npm/ephone@1.0.2/ephone.js';
const MODEL='shawnahmed/Kokoro-82M-v1.0-ONNX-timestamped';
const REVISION='02ff6fe';
const VOICE_ROOT='https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices';
type TensorLike={data:ArrayLike<number|bigint>;dims:number[]};
type Runtime={Tensor:new(type:string,data:Float32Array|BigInt64Array|number[],dims:number[])=>TensorLike;env:{allowLocalModels:boolean;backends:{onnx:{wasm:{numThreads:number}}}};StyleTextToSpeech2Model:{from_pretrained:(id:string,options:unknown)=>Promise<(inputs:unknown)=>Promise<Record<string,TensorLike>>>};AutoTokenizer:{from_pretrained:(id:string,options:unknown)=>Promise<Tokenizer>}};
type Tokenizer=((text:string,options?:unknown)=>{input_ids:TensorLike})&{decode:(ids:number[],options?:unknown)=>string};
const scope=self as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void};
let runtime:Runtime,model:Awaited<ReturnType<Runtime['StyleTextToSpeech2Model']['from_pretrained']>> | undefined,tokenizer:Tokenizer;
let phonemize:(text:string,lang:string)=>Iterable<[string,string]>;
let backend:'webgpu'|'wasm'='wasm';
let loading:Promise<void>|null=null;let preferCpu=false;let canceled=new Set<number>();
const styles=new Map<string,Float32Array>();
async function load(){
  if(model)return;if(loading)return loading;
  loading=(async()=>{
    const [hf,ph]=await Promise.all([import(/* @vite-ignore */ HF),import(/* @vite-ignore */ PHONEMIZER)]);
    if(!hf.StyleTextToSpeech2Model||!hf.Tensor||typeof ph.default!=='function'||!ph.roa||!ph.en_us)throw new Error('Voice runtime unavailable');
    const phones=await ph.default([ph.roa,ph.en_us]);
    phonemize=(text:string,language:string)=>{phones.setVoice(language==='pt-br'?'pt-BR':'en-US');const result=phones.textToIpaWithSourceMap(text);return language==='pt-br'?rawPhonemeSpans(result):result.asSpans();};
    runtime=hf as Runtime;
    runtime.env.allowLocalModels=false;runtime.env.backends.onnx.wasm.numThreads=self.crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined'?Math.max(1,Math.min(4,Math.floor((navigator.hardwareConcurrency||2)/2))):1;
    const gpu=(navigator as Navigator & {gpu?:{requestAdapter:(options:{powerPreference:string})=>Promise<unknown|null>}}).gpu;
    let available=false;if(!preferCpu){try{available=Boolean(gpu&&await gpu.requestAdapter({powerPreference:'high-performance'}));}catch{/* CPU remains supported */}}
    backend=available?'webgpu':'wasm';
    const tokenizerPromise=runtime.AutoTokenizer.from_pretrained(MODEL,{revision:REVISION});
    try{[model,tokenizer]=await Promise.all([createModel(backend),tokenizerPromise]);}
    catch(error){if(backend!=='webgpu')throw error;console.info('Elara GPU unavailable, using local CPU.');backend='wasm';[model,tokenizer]=await Promise.all([createModel('wasm'),tokenizerPromise]);}

  })();
  try{await loading;}catch(e){loading=null;throw e;}
}
async function createModel(device:'webgpu'|'wasm'){
  return runtime.StyleTextToSpeech2Model.from_pretrained(MODEL,{revision:REVISION,dtype:device==='webgpu'?'fp32':'q8',device,progress_callback:(p:{status:string;file?:string;progress?:number})=>{
    scope.postMessage({type:'progress',progress:p.file?.endsWith('.onnx')?p.progress:undefined});
  }});
}
async function inference(inputs:unknown){
  if(!model)throw new Error('Voice model unavailable');
  try{return await model(inputs);}catch(error){
    if(backend!=='webgpu')throw error;
    scope.postMessage({type:'loading'});
    try{await (model as unknown as {dispose?:()=>Promise<void>}).dispose?.();}catch{/* release best effort */}
    backend='wasm';model=await createModel('wasm');
    scope.postMessage({type:'backend',backend,threads:runtime.env.backends.onnx.wasm.numThreads});
    return model(inputs);
  }
}
async function style(voice:string){
  if(styles.has(voice))return styles.get(voice)!;
  let cache: Cache | null = null; try { cache=await caches.open('elara-voice-style-v1'); } catch { /* cache is optional */ } const url=`${VOICE_ROOT}/${voice}.bin`;
  let response=await cache?.match(url);if(!response){response=await fetch(url);if(!response.ok)throw new Error('Voice style unavailable');if(cache)await cache.put(url,response.clone());}
  const data=new Float32Array(await response.arrayBuffer());if(data.length<510*256)throw new Error('Invalid voice style');styles.set(voice,data);return data;
}
function idsOf(text:string):number[]{const data=Array.from(tokenizer(text).input_ids.data,Number);if(data[0]!==0||data.at(-1)!==0)throw new Error('Unsupported phoneme tokenizer');return data.slice(1,-1);}
async function generate(id:number,text:string,language:'pt'|'en'){
  const voice=language==='pt'?'pf_dora':'af_heart';const [,voiceData]=await Promise.all([load(),style(voice)]);if(!model)throw new Error('Model did not load');
  // Desktop keeps the approved chunking; CPU (mobile) gets a short first chunk.
  const chunks=backend==='wasm'&&preferCpu?voiceChunks(text,language,language==='pt'?60:70,100):speechChunks(text,170,language);
  for(const [index,chunk] of chunks.entries()){
    const began=performance.now();
    if(canceled.has(id))break;
    const ids:number[]=[0];const mapping:PhoneMap[]=[{symbol:'',charStart:chunk.offset,charLength:0}];
    // Phonemize the whole clause so vowels, punctuation and rhythm retain context.
    const spans=mappedPhonemes(phonemize(chunk.text,language==='pt'?'pt-br':'en-us'),language,chunk.offset,chunk.text);
    for(const span of spans){
      if(canceled.has(id))break;
      for(const token of idsOf(span.phonemes)){
        ids.push(token);mapping.push({symbol:tokenizer.decode([token],{skip_special_tokens:true}),charStart:span.charStart,charLength:span.charLength});
      }
    }
    ids.push(0);mapping.push({symbol:'',charStart:chunk.offset+chunk.text.length,charLength:0});
    if(ids.length>512)throw new Error('Voice sentence too long');
    const num=Math.min(Math.max(ids.length-2,0),509);const Tensor=runtime.Tensor;
    if(canceled.has(id))break;
    const output=await inference({input_ids:new Tensor('int64',new BigInt64Array(ids.map(BigInt)),[1,ids.length]),style:new Tensor('float32',voiceData.slice(num*256,(num+1)*256),[1,256]),speed:new Tensor('float32',[language==='pt'?1.14:1.08],[1])});
    if(!output.waveform?.data||!output.pred_dur?.data)throw new Error('Phoneme alignment unavailable');
    const audio=Float32Array.from(output.waveform.data,Number);
    const timings=alignPhones(Array.from(output.pred_dur.data,Number),mapping,audio.length,24000);
    if(canceled.has(id))break;
    const compact=language==='pt'?compactSilence(audio,timings,24000):{audio,timings};
    const spoken=withSpeechPause(compact.audio,compact.timings,chunk.text,24000,language);
    scope.postMessage({type:'audio',id,audio:spoken.audio.buffer,sampleRate:24000,timings:spoken.timings,meta:{index,offset:chunk.offset,chars:chunk.text.length,totalChars:text.length,lastChars:chunks[chunks.length-1].text.length,synthMs:Math.round(performance.now()-began),last:index===chunks.length-1}},[spoken.audio.buffer]);
  }
  canceled.delete(id);scope.postMessage({type:'done',id});
}
let queue=Promise.resolve();
scope.onmessage=event=>{
  const m=event.data;
  if(m.type==='cancel'){canceled.add(m.id);return;}
  if(m.type==='load'){if(typeof m.preferCpu==='boolean'&&!model&&!loading)preferCpu=m.preferCpu;void Promise.all([load(),style(m.language==='pt'?'pf_dora':'af_heart')]).then(()=>scope.postMessage({type:'ready',backend,threads:runtime.env.backends.onnx.wasm.numThreads})).catch(e=>scope.postMessage({type:'error',message:String(e)}));return;}
  if(m.type==='generate')queue=queue.then(()=>generate(m.id,m.text,m.language)).catch(e=>scope.postMessage({type:'error',id:m.id,message:String(e)}));
};
