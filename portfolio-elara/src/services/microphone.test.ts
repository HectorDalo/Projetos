import {expect,it,vi,afterEach} from 'vitest';
import {pcmWav,transcribeMicrophone} from './microphone';
afterEach(()=>vi.unstubAllGlobals());
it('encodes a bounded mono 16k PCM WAV with downsampling and stereo mixing',async()=>{
 const wav=pcmWav([new Float32Array(48000).fill(.5),new Float32Array(48000).fill(-.5)],48000);
 const view=new DataView(await wav.arrayBuffer());
 expect(wav.size).toBe(32044);expect(view.getUint32(24,true)).toBe(16000);expect(view.getUint16(22,true)).toBe(1);expect(view.getUint32(40,true)).toBe(32000);
 expect(view.getInt16(44,true)).toBe(0);expect(()=>pcmWav([new Float32Array(16000*21)],16000)).toThrow();
});
it('sends the selected microphone question only to the transcription endpoint and preserves the language',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({text:'Fale sobre o Hector.'})});vi.stubGlobal('fetch',fetch);
 const audio=pcmWav([new Float32Array(16000).fill(.03)],16000),signal=new AbortController().signal;
 expect(await transcribeMicrophone(audio,'pt',signal)).toBe('Fale sobre o Hector.');
 expect(fetch.mock.calls[0][0]).toBe('/api/transcribe?language=pt');expect(fetch.mock.calls[0][1].body).toBe(audio);expect(fetch.mock.calls[0][1].signal).toBe(signal);
});
