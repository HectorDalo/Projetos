import {randomInt,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

export function localEndpoint(value='http://127.0.0.1:8188') {
 const url=new URL(value);
 if(url.protocol!=='http:' || !['localhost','127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw Error('ComfyUI deve usar um endereço HTTP local, sem caminho ou credenciais.');
 return url.origin;
}
export function workflow(input,checkpoint,filename,maskFilename) {
 if(filename && input.editAction==='upscale'){
  const target=input.upscaleTarget||'2x';const dimensions=target==='fullhd'?[1920,1080]:target==='fullhd-portrait'?[1080,1920]:null;
  const scale=dimensions?{class_type:'ImageScale',inputs:{image:['10',0],upscale_method:'lanczos',width:dimensions[0],height:dimensions[1],crop:'center'}}:{class_type:'ImageScaleBy',inputs:{image:['10',0],upscale_method:'lanczos',scale_by:2}};
  return {nodes:{'10':{class_type:'LoadImage',inputs:{image:filename}},'11':scale,'7':{class_type:'SaveImage',inputs:{filename_prefix:'PrismaImagem-ampliada',images:['11',0]}}},size:dimensions?dimensions.join('x'):null};
 }
 const size={'1024x1024':[512,512],'1536x1024':[768,512],'1024x1536':[512,768]}[input.size];
 const nodes={
  '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:checkpoint}},
  '2':{class_type:'CLIPTextEncode',inputs:{text:input.prompt.trim(),clip:['1',1]}},
  '3':{class_type:'CLIPTextEncode',inputs:{text:input.negativePrompt||'blurry, low quality, distorted',clip:['1',1]}},
  '4':{class_type:'EmptyLatentImage',inputs:{width:size[0],height:size[1],batch_size:1}},
  '5':{class_type:'KSampler',inputs:{seed:randomInt(0,4294967296),steps:{low:12,medium:20,high:30}[input.quality],cfg:7,sampler_name:'euler',scheduler:'normal',denoise:filename?(input.editStrength??0.25):1,model:['1',0],positive:['2',0],negative:['3',0],latent_image:[filename?'12':'4',0]}},
  '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
  '7':{class_type:'SaveImage',inputs:{filename_prefix:'PrismaImagem',images:['6',0]}}
 };
 if(filename){delete nodes['4'];nodes['10']={class_type:'LoadImage',inputs:{image:filename}};nodes['11']={class_type:'ImageScale',inputs:{image:['10',0],upscale_method:'lanczos',width:size[0],height:size[1],crop:'center'}};nodes['12']={class_type:'VAEEncode',inputs:{pixels:['11',0],vae:['1',2]}};}
 if(input.editAction==='inpaint'&&maskFilename){nodes['11'].inputs.crop='disabled';nodes['13']={class_type:'LoadImage',inputs:{image:maskFilename}};nodes['15']={class_type:'ImageToMask',inputs:{image:['13',0],channel:'red'}};nodes['12']={class_type:'VAEEncodeForInpaint',inputs:{pixels:['11',0],vae:['1',2],mask:['15',0],grow_mask_by:6}};nodes['5'].inputs.denoise=1;nodes['3'].inputs.text='people, person, human, '+(input.negativePrompt||'blurry, distorted');nodes['8']={class_type:'ImageCompositeMasked',inputs:{destination:['10',0],source:['6',0],x:0,y:0,resize_source:true,mask:['15',0]}};nodes['7'].inputs.images=['8',0];}
 return {nodes,size:size.join('x')};
}
export function localProvider({endpoint=process.env.COMFYUI_URL,checkpoint=process.env.COMFYUI_CHECKPOINT,upstream=fetch,pause=delay,attempts=500}={}) {
 const base=localEndpoint(endpoint);
 async function json(path,options={},timeout=10000){const res=await upstream(base+path,{...options,signal:AbortSignal.timeout(timeout)});if(!res.ok)throw Error('O motor local recusou a operação. Confira o modelo e o console do ComfyUI.');return res.json();}
 async function status(){
  const state={ready:false,connected:false,code:'offline',model:null,models:[]};
  try{
   const response=await upstream(base+'/object_info/CheckpointLoaderSimple',{signal:AbortSignal.timeout(8000)});
   state.connected=true;
   if(!response.ok)return {...state,code:'http_error',message:`O motor respondeu HTTP ${response.status}, mas não disponibilizou o carregador de modelos. Consulte data/comfy-engine.log.`};
   let info;try{info=await response.json();}catch{return {...state,code:'invalid_response',message:'O serviço respondeu, mas não retornou os dados esperados do ComfyUI. Confira a porta 8188.'};}
   const options=info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
   if(!Array.isArray(options))return {...state,code:'loader_unavailable',message:'ComfyUI conectado, mas o carregador CheckpointLoaderSimple não está disponível. Consulte data/comfy-engine.log.'};
   state.models=options.filter(x=>typeof x==='string');
   state.model=checkpoint||state.models.find(x=>/v1[-_. ]?5.*\.safetensors$/i.test(x))||null;
   if(!state.models.length)return {...state,code:'model_missing',message:'ComfyUI conectado, mas não encontrou modelos na pasta models/checkpoints. Confira onde o arquivo .safetensors foi salvo; não é necessário reinstalar o motor.'};
   if(!state.model)return {...state,code:'model_selection_required',message:`ComfyUI conectado. Modelos encontrados: ${state.models.slice(0,4).join(', ')}. Configure COMFYUI_CHECKPOINT com um checkpoint SD 1.5 compatível.`};
   if(!state.models.includes(state.model))return {...state,code:'model_not_found',message:`ComfyUI conectado, mas o checkpoint configurado (${state.model}) não foi encontrado. Modelos disponíveis: ${state.models.slice(0,4).join(', ')}.`};
   return {...state,ready:true,code:'ready',message:`Motor local pronto · ${state.model}`};
  }catch(error){return {...state,code:error.name==='TimeoutError'?'timeout':'offline',message:error.name==='TimeoutError'?'O motor não respondeu em oito segundos. Ele pode estar carregando; aguarde e consulte data/comfy-engine.log.':'Não foi possível conectar ao ComfyUI na porta 8188. Confira data/comfy-engine.log para distinguir falha de inicialização de motor ainda carregando.'};}
 }
 async function generate(input,image){const deadline=Date.now()+600000;const state=await status();const upscale=!!image&&input.editAction==='upscale';if(!state.ready&&!(upscale&&state.connected&&state.code!=='http_error'&&state.code!=='invalid_response')){const error=Error(state.message);error.status=503;throw error;}
  let filename;
  if(image){const form=new FormData();form.set('image',new Blob([image.bytes],{type:image.type}),`prisma-${randomUUID()}.${image.ext}`);form.set('type','input');const uploaded=await json('/upload/image',{method:'POST',body:form});if(!uploaded.name || uploaded.name.includes('..') || uploaded.subfolder?.includes('..'))throw Error('Upload inválido retornado pelo motor.');filename=uploaded.subfolder?`${uploaded.subfolder}/${uploaded.name}`:uploaded.name;}
  let maskFilename;
  if(image?.mask){const form=new FormData();form.set('image',new Blob([image.mask.bytes],{type:'image/png'}),`prisma-mask-${randomUUID()}.png`);form.set('type','input');const uploaded=await json('/upload/image',{method:'POST',body:form});if(!uploaded.name||uploaded.name.includes('..')||uploaded.subfolder?.includes('..'))throw Error('Máscara inválida retornada pelo motor.');maskFilename=uploaded.subfolder?`${uploaded.subfolder}/${uploaded.name}`:uploaded.name;}
  const {nodes,size}=workflow(input,state.model,filename,maskFilename);
  const queued=await json('/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:nodes,client_id:randomUUID()})});
  if(!queued.prompt_id)throw Error('O motor não retornou um identificador da tarefa.');
  for(let attempt=0;attempt<attempts&&Date.now()<deadline;attempt++){
   const history=await json(`/history/${encodeURIComponent(queued.prompt_id)}`);const job=history[queued.prompt_id];
   if(job?.status?.status_str==='error')throw Error('Falha no processamento local. Verifique memória da GPU e compatibilidade do checkpoint.');
   const output=job?.outputs?.['7']?.images?.[0];
   if(output){if(output.type!=='output')throw Error('Tipo de saída local inválido.');const query=new URLSearchParams({filename:output.filename,subfolder:output.subfolder||'',type:'output'});const response=await upstream(`${base}/view?${query}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Não foi possível obter a imagem local.');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>30*1024*1024 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('O motor não retornou um PNG válido.');const actualSize=bytes.length>=24?`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`:size;return {image:`data:image/png;base64,${bytes.toString('base64')}`,provider:'local',model:upscale?'Ampliação Lanczos (sem recriar)':state.model,size:actualSize};}
   await pause(1200);
  }
  throw Error('Tempo limite de geração local atingido. A tarefa pode continuar no ComfyUI; confira a fila antes de repetir.');
 }
 return {status,generate};
}
