import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const moduleDir=path.dirname(fileURLToPath(import.meta.url));
export function backgroundProvider({root=path.basename(moduleDir)==='app'?path.dirname(moduleDir):moduleDir,launch=spawn}={}){
 return async image=>{
  const python=path.join(root,'engines','ComfyUI_windows_portable','python_embeded','python.exe');
  if(!existsSync(python))throw Error('Python local não encontrado. Instale o motor com setup-local.ps1.');
  if(!existsSync(path.join(root,'runtime','image-tools','rembg'))||!existsSync(path.join(root,'data','background-models','u2net.onnx')))throw Error('Instale a remoção de fundo uma vez com setup-background.ps1. Ela usa um modelo local adicional, sem chave OpenAI.');
  return new Promise((resolve,reject)=>{
   const env={...process.env};delete env.OPENAI_API_KEY;delete env.PRISMA_API_TOKEN;
   const child=launch(python,['-B','-s',path.join(moduleDir,'background-worker.py')],{cwd:root,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='',size=0,settled=false;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(value);};
   const timer=setTimeout(()=>{child.kill();finish(Error('A remoção de fundo excedeu dez minutos.'));},600000);
   child.stdout.on('data',chunk=>{size+=chunk.length;if(size>45*1024*1024){child.kill();finish(Error('A imagem resultante excedeu o limite de tamanho.'));}else output+=chunk;});
   child.stderr.resume();child.stdin.on('error',()=>{});
   child.once('error',()=>finish(Error('Não foi possível iniciar a ferramenta local de recorte.')));
   child.once('close',()=>{try{const result=JSON.parse(output);if(result.error)throw Error(result.error==='NOT_INSTALLED'?'Instale o componente com setup-background.ps1.':result.error==='IMAGE_TOO_LARGE'?'Use uma imagem de até 20 megapixels.':'A ferramenta não conseguiu recortar esta imagem.');finish(null,{image:`data:image/png;base64,${result.image}`,size:result.size,provider:'local',model:'U²-Net · PNG transparente'});}catch(error){finish(error instanceof SyntaxError?Error('A ferramenta local retornou uma resposta inválida.'):error);}});
   child.stdin.end(JSON.stringify({image:image.bytes.toString('base64')})+'\n');
  });
 };
}
