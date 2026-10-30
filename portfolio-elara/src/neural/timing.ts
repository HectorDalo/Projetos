export type Viseme = 'closed' | 'small' | 'open' | 'wide' | 'round';
export type PhoneMap = { symbol: string; charStart: number; charLength: number };
export type PhoneTiming = PhoneMap & { start: number; end: number; viseme: Viseme };
export function visemeFor(symbol: string): Viseme {
  if (!symbol || /^[\s.,!?;:ˈˌː]+$/u.test(symbol) || /^[pbm]$/u.test(symbol)) return 'closed';
  if (/[uʊoɔwɒ]/u.test(symbol)) return 'round';
  if (/[iɪeɛjɨ]/u.test(symbol)) return 'wide';
  if (/[aɑɐæʌ]/u.test(symbol)) return 'open';
  return 'small';
}
export function alignPhones(durations: number[], mapping: PhoneMap[], sampleCount: number, sampleRate: number): PhoneTiming[] {
  if (durations.length !== mapping.length || sampleRate <= 0 || sampleCount <= 0 || durations.some(d=>!Number.isFinite(d)||d<0)) throw new Error('Invalid model alignment');
  const frames = durations.reduce((a,b)=>a+b,0); if (frames<=0) throw new Error('Missing phoneme durations');
  const secondsPerFrame = sampleCount / sampleRate / frames;
  let cursor=0;
  return mapping.map((phone,i)=>{ const start=cursor; cursor+=durations[i]*secondsPerFrame; return {...phone,start,end:cursor,viseme:visemeFor(phone.symbol)}; });
}
export function speechChunks(text: string, limit=170,language:'pt'|'en'='en',firstLimit?:number): {text:string;offset:number}[] {
  const words=[...text.matchAll(/\S+/gu)]; const chunks:{text:string;offset:number}[]=[];
  let start=-1,end=0;
  for(const word of words){const index=word.index!;if(start<0)start=index;
    if(index+word[0].length-start>(chunks.length===0?firstLimit??(language==='pt'?Math.min(limit,95):limit):limit) && end>start){chunks.push({text:text.slice(start,end),offset:start});start=index;}
    end=index+word[0].length;
    const abbreviation=/^(?:sr|sra|dr|dra|prof|ex|mr|mrs|ms)\.$/iu.test(word[0]);
    if(!abbreviation&&(language==='pt'?false:/[,;:.!?…]["'”’)]*$/u.test(word[0]))){chunks.push({text:text.slice(start,end),offset:start});start=-1;}
  }
  if(start>=0&&end>start)chunks.push({text:text.slice(start,end),offset:start});
  return chunks;
}

// First chunk tuned for time-to-first-sound: on slow (CPU) devices it is shorter and,
// when possible, ends at a natural punctuation boundary. Later chunks keep the larger
// size, which is more efficient per character. Offsets always index the original text.
export function voiceChunks(text:string,language:'pt'|'en',firstLimit=language==='pt'?95:170,limit=170):{text:string;offset:number}[] {
  const words=[...text.matchAll(/\S+/gu)];if(!words.length)return [];
  const start=words[0].index!;let end=start,boundary=-1;
  for(const word of words){
    const wordEnd=word.index!+word[0].length;
    if(wordEnd-start>firstLimit&&end>start)break;
    end=wordEnd;
    const abbreviation=/^(?:sr|sra|dr|dra|prof|ex|mr|mrs|ms)\.$/iu.test(word[0]);
    if(!abbreviation&&wordEnd-start>=24&&/[,;:.!?…]["'”’)]*$/u.test(word[0]))boundary=wordEnd;
  }
  const cut=end>=text.trimEnd().length?end:boundary>0?boundary:end;
  const first={text:text.slice(start,cut),offset:start};
  const rest=text.slice(cut);const lead=rest.length-rest.trimStart().length;
  if(!rest.trim())return [first];
  return [first,...speechChunks(rest.trimStart(),limit,language,limit).map(c=>({text:c.text,offset:c.offset+cut+lead}))];
}

export function punctuationPause(text:string,language:'pt'|'en'='en'):number {
  const clean=text.trimEnd().replace(/["'”’)]*$/u,'');
  if(/[,，]$/u.test(clean))return language==='pt'?.07:.12;
  if(/[;:]$/u.test(clean))return language==='pt'?.10:.18;
  if(/[.!?…]$/u.test(clean))return language==='pt'?.14:.24;
  return 0;
}

// Keep punctuation pauses short and explicit instead of stretching every word.
export function withSpeechPause(samples:Float32Array<ArrayBuffer>,timings:PhoneTiming[],text:string,sampleRate:number,language:'pt'|'en'='en'){
  const pause=punctuationPause(text,language);
  if(!pause)return {audio:samples,timings};
  const quiet=language==='pt'?.0015:.003;
  let last=samples.length-1;while(last>=0&&Math.abs(samples[last])<quiet)last--;
  const end=last<0?samples.length:Math.min(samples.length,last+1+Math.round(sampleRate*(language==='pt'?.07:.035)));
  const audio=new Float32Array(end+Math.round(pause*sampleRate));audio.set(samples.subarray(0,end));
  const duration=end/sampleRate;
  const aligned=timings.filter(phone=>phone.start<duration).map(phone=>({...phone,end:Math.min(phone.end,duration)}));
  const charStart=(timings.at(-1)?.charStart??0)+(timings.at(-1)?.charLength??0);
  aligned.push({symbol:' ',charStart,charLength:0,start:duration,end:audio.length/sampleRate,viseme:'closed'});
  return {audio,timings:aligned};
}

// Compress only effectively silent runs; preserve speech samples and remap all
// timestamps so mouth movements and captions follow the edited waveform.
export function compactSilence(samples:Float32Array<ArrayBuffer>,timings:PhoneTiming[],sampleRate:number){
  const cuts:{start:number;end:number}[]=[];
  for(let i=0;i<samples.length;){
    if(Math.abs(samples[i])>0.00001){i++;continue;}
    const start=i;while(i<samples.length&&Math.abs(samples[i])<=0.00001)i++;
    if(i-start>sampleRate*.32)cuts.push({start:start+Math.round(sampleRate*.18),end:i});
  }
  if(!cuts.length)return {audio:samples,timings};
  const audio=new Float32Array(samples.length-cuts.reduce((sum,c)=>sum+c.end-c.start,0));
  let cursor=0,written=0;
  for(const cut of cuts){audio.set(samples.subarray(cursor,cut.start),written);written+=cut.start-cursor;cursor=cut.end;}
  audio.set(samples.subarray(cursor),written);
  const remap=(time:number)=>time-cuts.reduce((sum,c)=>sum+Math.max(0,Math.min(time*sampleRate,c.end)-c.start)/sampleRate,0);
  return {audio,timings:timings.map(p=>({...p,start:remap(p.start),end:remap(p.end)}))};
}
