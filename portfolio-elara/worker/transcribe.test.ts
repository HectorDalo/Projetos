import {expect,it,vi} from 'vitest';
import {handleRequest} from './index';
import {TRANSCRIPTION_MODEL} from './transcribe';
import {pcmWav} from '../src/services/microphone';
const url='https://hd.example/api/transcribe?language=pt';
async function wav(silent=false){return (await pcmWav([new Float32Array(16000).fill(silent?0:.05)],16000).arrayBuffer());}
const request=(body:ArrayBuffer,type='audio/wav',origin='https://hd.example')=>new Request(url,{method:'POST',headers:{'Content-Type':type,Origin:origin},body});
it('transcribes validated short WAV audio with Portuguese names and no translation task',async()=>{
 const run=vi.fn().mockResolvedValue({text:'Fale sobre o Hector.'});
 const response=await handleRequest(request(await wav()),{AI:{run}});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({text:'Fale sobre o Hector.'});
 expect(run.mock.calls[0][0]).toBe(TRANSCRIPTION_MODEL);expect(run.mock.calls[0][1]).toMatchObject({language:'pt',task:'transcribe',vad_filter:true,condition_on_previous_text:false});
 expect(run.mock.calls[0][1].initial_prompt).toContain('Hector Dalonso');
});
it('rejects foreign origins, oversized audio and silence before spending inference',async()=>{
 const run=vi.fn().mockResolvedValue({text:'unexpected'});
 expect((await handleRequest(request(await wav(),'audio/wav','https://other.example'),{AI:{run}})).status).toBe(403);
 expect((await handleRequest(request(new ArrayBuffer(650001)),{AI:{run}})).status).toBe(413);
 const response=await handleRequest(request(await wav(true)),{AI:{run}});expect(response.status).toBe(422);expect(await response.json()).toEqual({error:'no_speech'});
 expect(run).not.toHaveBeenCalled();
});
it('reports microphone transcription quota/service failures without inventing a question',async()=>{
 const run=vi.fn().mockRejectedValue(new Error('3036 daily free allocation'));
 const response=await handleRequest(request(await wav()),{AI:{run}});expect(response.status).toBe(429);expect(await response.json()).toEqual({error:'quota_exhausted'});
});
