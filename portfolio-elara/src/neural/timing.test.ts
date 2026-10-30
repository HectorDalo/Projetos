import {expect,it} from 'vitest';
import {alignPhones,speechChunks,voiceChunks,visemeFor,punctuationPause,withSpeechPause,compactSilence} from './timing';
it('aligns mouth shapes to model duration output and the actual waveform',()=>{
 const mapping=[{symbol:'',charStart:0,charLength:0},{symbol:'m',charStart:0,charLength:3},{symbol:'a',charStart:0,charLength:3},{symbol:'o',charStart:4,charLength:2}];
 const result=alignPhones([1,2,3,4],mapping,24000,24000);
 expect(result[0].start).toBe(0);expect(result.at(-1)!.end).toBeCloseTo(1);
 expect(result[1].viseme).toBe('closed');expect(result[2].viseme).toBe('open');expect(result[3].viseme).toBe('round');
 expect(result[2].start).toBeCloseTo(.3);expect(result[2].end).toBeCloseTo(.6);
});
it('refuses fabricated or incomplete timing rather than falling back to a mouth loop',()=>{
 expect(()=>alignPhones([1],[],24000,24000)).toThrow();
 expect(()=>alignPhones([NaN],[{symbol:'a',charStart:0,charLength:1}],24000,24000)).toThrow();
});
it('supports Portuguese and English IPA mouth families and closes on pauses',()=>{
 expect(visemeFor('ɐ')).toBe('open');expect(visemeFor('ʊ')).toBe('round');expect(visemeFor('i')).toBe('wide');expect(visemeFor('b')).toBe('closed');expect(visemeFor(' ')).toBe('closed');
});
it('preserves caption character offsets when splitting synthesis into sentences',()=>{
 const text='Uma frase de teste com conteúdo suficiente para ser lida. Another test sentence.';
 const parts=speechChunks(text,60);expect(parts.length).toBeGreaterThan(1);
 for(const part of parts)expect(text.slice(part.offset,part.offset+part.text.length)).toBe(part.text);
});

it('keeps clause boundaries at commas and sentence ends, without splitting decimals or abbreviations',()=>{
 const text='Oi, Hector! O Dr. Silva disse que custa 40,00 reais; vamos conferir.';
 const parts=speechChunks(text);
 expect(parts.map(x=>x.text)).toEqual(['Oi,','Hector!','O Dr. Silva disse que custa 40,00 reais;','vamos conferir.']);
 for(const part of parts)expect(text.slice(part.offset,part.offset+part.text.length)).toBe(part.text);
 expect(punctuationPause('Oi,')).toBe(.12);expect(punctuationPause('Oi!')).toBe(.24);expect(punctuationPause('sem pontuação')).toBe(0);
});
it('gives punctuation a brief silent interval and a closed mouth without accumulating model tail silence',()=>{
 const samples=new Float32Array(1000);samples.fill(.1,0,600);
 const timings=alignPhones([1],[{symbol:'a',charStart:0,charLength:2}],samples.length,1000);
 const result=withSpeechPause(samples,timings,'Oi,',1000);
 expect(result.audio.length).toBe(755);expect(result.audio[599]).toBeCloseTo(.1);expect(result.audio[700]).toBe(0);
 expect(result.timings.at(-1)?.viseme).toBe('closed');expect(result.timings.at(-1)?.start).toBeCloseTo(.635);
 expect(result.timings.at(-1)?.end).toBeCloseTo(.755);
});

it('preserves soft Portuguese ending samples while shortening the added pause',()=>{
 const audio=new Float32Array(1000);audio.fill(.1,0,600);audio.fill(.002,600,650);
 const timing=alignPhones([1],[{symbol:'a',charStart:0,charLength:2}],1000,1000);
 const original=withSpeechPause(audio,timing,'Oi!',1000),english=withSpeechPause(audio,timing,'Oi!',1000,'en'),portuguese=withSpeechPause(audio,timing,'Oi!',1000,'pt');
 expect(english.audio).toEqual(original.audio);expect(portuguese.audio.length).toBe(860);expect(portuguese.audio[640]).toBeCloseTo(.002);
});

it('keeps Portuguese commas inside larger synthesis chunks to avoid generating every clause separately',()=>{
 const text='Hector estuda Ciência da Computação, gosta de tecnologia, está desenvolvendo habilidades em IA; ele criou a Elara, testa as conversas e aprimora o portfólio com dedicação. Depois continua seus estudos em Python e desenvolvimento web.';
 const pt=speechChunks(text,170,'pt'),en=speechChunks(text,170,'en');
 expect(pt.length).toBeLessThan(en.length);expect(pt[0].text.length).toBeLessThanOrEqual(95);
 expect(pt.some(part=>part.text.includes(',')&&part.text.indexOf(',')<part.text.length-1)).toBe(true);
 expect(pt.flatMap(part=>part.text.match(/\S+/gu))).toEqual(text.match(/\S+/gu));
 for(const part of pt)expect(text.slice(part.offset,part.offset+part.text.length)).toBe(part.text);
 expect(punctuationPause('continuar;', 'pt')).toBe(.10);expect(punctuationPause('Fim.', 'pt')).toBe(.14);
 expect(punctuationPause('continuar;', 'en')).toBe(.18);expect(punctuationPause('End.', 'en')).toBe(.24);
});

it('removes only long silence and keeps speech samples and caption times aligned',()=>{
 const audio=new Float32Array(1000);audio.fill(.1,0,200);audio.fill(.2,700);
 const phones=[{symbol:'a',charStart:0,charLength:2,start:0,end:.2,viseme:'open' as const},{symbol:' ',charStart:2,charLength:0,start:.2,end:.7,viseme:'closed' as const},{symbol:'o',charStart:3,charLength:2,start:.7,end:1,viseme:'round' as const}];
 const result=compactSilence(audio,phones,1000);
 expect(result.audio.length).toBe(680);expect(result.audio.slice(0,200)).toEqual(audio.slice(0,200));expect(result.audio.slice(380)).toEqual(audio.slice(700));
 expect(result.timings[2].start).toBeCloseTo(.38);expect(result.timings[2].end).toBeCloseTo(.68);
 const soft=new Float32Array(500).fill(.002);expect(compactSilence(soft,[],1000).audio).toBe(soft);
 const short=new Float32Array(300);expect(compactSilence(short,[],1000).audio).toBe(short);
});
it('keeps short Portuguese sentences together without repeating inference at each period',()=>{
 const text='Oi, tudo bem? Sou a Elara. Posso contar sobre os estudos do Hector. Ele estuda computação.';
 expect(speechChunks(text,170,'pt')).toEqual([{text,offset:0}]);
});
it('keeps the first CPU chunk short, ends it at punctuation when possible and preserves offsets',()=>{
 const text='Hector estuda Ciência da Computação no ENIAC, gosta de tecnologia e está desenvolvendo habilidades em IA; ele criou a Elara.';
 const parts=voiceChunks(text,'pt',60);
 expect(parts[0].text).toBe('Hector estuda Ciência da Computação no ENIAC,');
 expect(parts.flatMap(p=>p.text.match(/\S+/gu))).toEqual(text.match(/\S+/gu));
 for(const part of parts)expect(text.slice(part.offset,part.offset+part.text.length)).toBe(part.text);
 expect(voiceChunks('Oi! Sou a Elara.','pt',60)).toEqual([{text:'Oi! Sou a Elara.',offset:0}]);
 expect(voiceChunks('   ','pt',60)).toEqual([]);
});
