import type { Language } from '../content/profile';
export const elaraGreeting = {
  pt: 'Oi, eu sou Elara, assistente virtual do Hector.',
  en: 'Hi, I’m Elara, Hector’s virtual assistant.',
};
// Spoken form only: keep the official name and caption spelling unchanged.
export function browserSpeechText(text: string, language: Language): string {
  return language === 'pt' ? text.replace(/\bHector\b/giu, 'Héctor') : text;
}
export function namePhonemes(word: string, language: Language): string | undefined {
  const match = /^(?:Hector|Héctor)([.,!?;:]*)$/iu.exec(word);
  return language === 'pt' && match ? `ˈɛktoɾ${match[1]}` : undefined;
}

// The phonemizer spells isolated accented letters ("é" -> "é agudo").
// Supply the spoken vowel for Portuguese function words, preserving punctuation.
export function wordPhonemes(word: string, language: Language): string | undefined {
  const name = namePhonemes(word, language);
  if (name || language !== 'pt') return name;
  const match = /^([éêàáóôúíeaou])([.,!?;:]*)$/iu.exec(word.normalize('NFC'));
  if (!match) return undefined;
  const vowels: Record<string, string> = { é: 'ˈɛ', ê: 'ˈe', à: 'a', á: 'ˈa', ó: 'ˈɔ', ô: 'ˈo', ú: 'ˈu', í: 'ˈi', e: 'i', a: 'ɐ', o: 'u', u: 'u' };
  return vowels[match[1].toLowerCase()] + match[2];
}

export function mappedPhonemes(spans:Iterable<[string,string]>,language:Language,offset:number,sourceText?:string){
  let cursor=offset;
  return Array.from(spans,([source,ipa])=>{
    const override=wordPhonemes(source.trim(),language);
    const phonemes=override===undefined?ipa:(ipa.match(/^\s*/u)?.[0]??'')+override+(ipa.match(/\s*$/u)?.[0]??'');
    const leading=source.length-source.trimStart().length;
    const found=sourceText&&source.trim()?sourceText.indexOf(source.trim(),Math.max(0,cursor-offset)):-1;
    const start=found!==undefined&&found>=0?offset+found:cursor+leading;
    const span={phonemes,charStart:start,charLength:source.trim().length};
    cursor=found!==undefined&&found>=0?start+source.trim().length:cursor+source.length;return span;
  });
}

export function rawPhonemeSpans(result:{text:string;ipa:string;sourceMap:[number,number][]}):[string,string][]{
 return result.sourceMap.map(([sourceStart,ipaStart],i)=>{
  const [sourceEnd,ipaEnd]=result.sourceMap[i+1]??[result.text.length,result.ipa.length];
  return [result.text.slice(sourceStart,sourceEnd),result.ipa.slice(ipaStart,ipaEnd)];
 });
}
