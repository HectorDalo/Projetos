import readline from 'node:readline';

// The launcher owns the anonymous pipe. Do not persist or log its content.
const lines=readline.createInterface({input:process.stdin,terminal:false});
let server;
let received=false;
const fail=code=>{console.error(`START_FAILED:${code}`);process.exitCode=1;if(server)server.close();lines.close();process.stdin.destroy();};
const timer=setTimeout(()=>fail('CONFIG_TIMEOUT'),15000);
lines.on('line',async line=>{
 if(received)return;
 received=true;clearTimeout(timer);
 try {
  let config;
  try{config=JSON.parse(Buffer.from(line.trim(),'base64').toString('utf8'));}catch{fail('CONFIG_INVALID');return;}
  if(!config || typeof config!=='object' || !Number.isInteger(config.port??0) || (config.port??0)<0 || (config.port??0)>65535){fail('CONFIG_INVALID');return;}
  const {createServer}=await import('./server.mjs');
  server=createServer({key:config.key||'',apiToken:config.token,defaultProvider:'local'});
  server.on('error',error=>fail(['EADDRINUSE','EACCES'].includes(error.code)?error.code:'LISTEN_FAILED'));
  server.listen(config.port??0,'127.0.0.1',()=>console.log(`READY:${server.address().port}`));
 }catch(error){fail(error.code==='ERR_MODULE_NOT_FOUND'?'MISSING_MODULE':error.code==='ERR_INVALID_URL'?'CONFIG_INVALID':'BOOT_ERROR');}
});
lines.on('close',()=>{clearTimeout(timer);if(server)server.close();process.exit(process.exitCode||0);});
