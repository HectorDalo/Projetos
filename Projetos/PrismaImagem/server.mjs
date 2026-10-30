import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {localProvider} from './local-provider.mjs';
import {backgroundProvider} from './background-provider.mjs';

export function validate(input) {
  if (!input || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 4000) throw Error('Escreva um prompt entre 1 e 4.000 caracteres.');
  if (!['generate','edit'].includes(input.mode)) throw Error('Modo inválido.');
  if (!['1024x1024','1536x1024','1024x1536'].includes(input.size)) throw Error('Formato inválido.');
  if (!['low','medium','high'].includes(input.quality)) throw Error('Qualidade inválida.');
  if(input.provider!==undefined && !['local','openai'].includes(input.provider))throw Error('Provedor inválido.');
  if(input.negativePrompt!==undefined && (typeof input.negativePrompt!=='string'||input.negativePrompt.length>2000))throw Error('Prompt negativo inválido.');
  if(input.editAction!==undefined&&!['upscale','transform','remove-background','inpaint'].includes(input.editAction))throw Error('Ação de edição inválida.');
  if(input.editStrength!==undefined&&(typeof input.editStrength!=='number'||!Number.isFinite(input.editStrength)||input.editStrength<0.05||input.editStrength>0.8))throw Error('Intensidade de edição deve estar entre 0,05 e 0,8.');
  if(input.upscaleTarget!==undefined&&!['2x','fullhd','fullhd-portrait'].includes(input.upscaleTarget))throw Error('Formato de ampliação inválido.');
  if (input.mode === 'edit') {
    if (typeof input.image !== 'string') throw Error('Selecione uma imagem para editar.');
    const match = input.image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw Error('Use uma imagem PNG, JPEG ou WebP.');
    const bytes = Buffer.from(match[2], 'base64');
    const valid = match[1] === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
    if (!valid || bytes.length > 10*1024*1024) throw Error('Imagem inválida ou maior que 10 MB.');
    let mask;
    if(input.editAction==='inpaint'){
      if(typeof input.mask!=='string'||!input.mask.startsWith('data:image/png;base64,'))throw Error('Marque uma área para remover primeiro.');
      mask=validate({...input,image:input.mask,mask:undefined,editAction:'transform'});
    }
    return {bytes, type:`image/${match[1]}`,ext:match[1],...(mask?{mask}:{})};
  }
}
export function createServer({key=process.env.OPENAI_API_KEY, model=process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5', upstream=fetch, defaultProvider=process.env.PRISMA_PROVIDER||'local', apiToken=process.env.PRISMA_API_TOKEN, local=localProvider(),removeBackground=backgroundProvider()}={}) {
 let busy=false;
 return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const host=req.headers.host;
  if (!host || !/^(localhost|127\.0\.0\.1):\d+$/.test(host)) return send(403,{error:'Host não autorizado.'});
  if(req.headers.origin && req.headers.origin !== `http://${host}`) return send(403,{error:'Origem não autorizada.'});
  const path=req.url?.split('?')[0];
  if((path?.startsWith('/api/')||path?.startsWith('/v1/'))&&apiToken&&req.headers.authorization!==`Bearer ${apiToken}`)return send(401,{error:'Token da API PrismaImagem necessário.'});
  if(req.method==='GET' && ['/api/status','/v1/health'].includes(path)) {const backend=await local.status();return send(200,{name:'PrismaImagem API',version:1,provider:defaultProvider,configured:defaultProvider==='local'?backend.ready:!!key,model:defaultProvider==='local'?backend.model:model,local:backend,openai:{configured:!!key,model}});}
  if(req.method==='POST' && ['/api/images','/v1/images/generations','/v1/images/edits'].includes(path)) {
   if(!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'Envie JSON.'});
   let total=0,chunks=[],ownsBusy=false;
   try {
    for await(const chunk of req){total+=chunk.length;if(total>15*1024*1024){send(413,{error:'Arquivo muito grande.'});req.resume();return;}chunks.push(chunk);}
    let input;try{input=JSON.parse(Buffer.concat(chunks));}catch{return send(400,{error:'JSON inválido.'});}
    if(!input || typeof input!=='object' || Array.isArray(input))return send(400,{error:'Envie um objeto JSON.'});
    if(path==='/v1/images/generations')input.mode='generate';
    if(path==='/v1/images/edits')input.mode='edit';
    let image;try{image=validate(input);}catch(e){return send(400,{error:e.message});}
    const provider=input.provider||defaultProvider;
    if(['upscale','remove-background','inpaint'].includes(input.editAction)&&(provider!=='local'||input.mode!=='edit'))return send(400,{error:'Esta ferramenta exige motor Local e uma imagem de referência.'});
    if(provider==='openai'&&!key) return send(503,{error:'Cadastre a chave na janela de controle do PrismaImagem. Se estiver executando pelo código-fonte, configure OPENAI_API_KEY e reinicie o servidor.'});
    if(busy) return send(429,{error:'Uma imagem já está sendo processada. Aguarde.'});
    busy=true;ownsBusy=true;
    if(input.editAction==='remove-background'){try{return send(200,await removeBackground(image));}catch(error){return send(503,{error:error.message});}}
    if(provider==='local'){try{return send(200,await local.generate(input,image));}catch(error){return send(error.status||502,{error:error.message});}}
    const fields={model,prompt:input.prompt.trim(),size:input.size,quality:input.quality,n:1,output_format:'png'};
    let body,headers={Authorization:`Bearer ${key}`};
    if(image){body=new FormData();for(const [k,v] of Object.entries(fields))body.set(k,String(v));body.set('image',new Blob([image.bytes],{type:image.type}),`reference.${image.ext}`);}
    else {headers['Content-Type']='application/json';body=JSON.stringify(fields);}
    const response=await upstream(`https://api.openai.com/v1/images/${image?'edits':'generations'}`,{method:'POST',headers,body,signal:AbortSignal.timeout(180000)});
    if(!response.ok){await response.text();return send(response.status===429?429:502,{error:response.status===401?'A chave da API foi recusada. Atualize a chave na janela de controle ou na configuração do servidor.':response.status===429?'Limite da API atingido. Confira créditos e tente mais tarde.':'A API não concluiu a solicitação. Confira o acesso ao modelo, créditos e o conteúdo do prompt.'});}
    const result=await response.json();const b64=result.data?.[0]?.b64_json;
    if(!b64)throw Error('empty');
    return send(200,{image:`data:image/png;base64,${b64}`,model,provider:'openai',size:input.size});
   }catch(e){return send(502,{error:e.name==='TimeoutError'?'O tempo de espera terminou. Tente novamente.':'Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.'});}
   finally{if(ownsBusy)busy=false;}
  }
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  if(req.method!=='GET' || !files[path])return send(404,{error:'Não encontrado.'});
  try{const content=await readFile(new URL(`./public/${files[path]}`,import.meta.url));res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(content);}catch{send(500,{error:'Arquivo indisponível.'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer().listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`PrismaImagem: http://localhost:${Number(process.env.PORT)||3000}`));
