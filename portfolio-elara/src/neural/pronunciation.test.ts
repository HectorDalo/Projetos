import { expect, it } from 'vitest';
import { browserSpeechText, elaraGreeting, namePhonemes, wordPhonemes, mappedPhonemes, rawPhonemeSpans } from './pronunciation';
it('preserves the written name while giving Portuguese speech an explicit K sound',()=>{
  expect(namePhonemes('Hector.', 'pt')).toBe('ˈɛktoɾ.');
  expect(namePhonemes('Héctor', 'pt')).toBe('ˈɛktoɾ');
  expect(namePhonemes('Hector','en')).toBeUndefined();
  expect(browserSpeechText('Hector Dalonso','pt')).toBe('Héctor Dalonso');
  expect(browserSpeechText(elaraGreeting.pt,'pt').length).toBe(elaraGreeting.pt.length);
  expect(elaraGreeting.pt).toBe('Oi, eu sou Elara, assistente virtual do Hector.');
});

it('speaks accented standalone Portuguese vowels instead of spelling their accent names',()=>{
 expect(wordPhonemes('é','pt')).toBe('ˈɛ');expect(wordPhonemes('É,','pt')).toBe('ˈɛ,');
 expect(wordPhonemes('e\u0301.','pt')).toBe('ˈɛ.');expect(wordPhonemes('é','en')).toBeUndefined();
 expect(wordPhonemes('Hector!','pt')).toBe('ˈɛktoɾ!');expect(wordPhonemes('café','pt')).toBeUndefined();
});

it('preserves full-clause IPA punctuation and source offsets while overriding an isolated accented vowel',()=>{
 const result=mappedPhonemes([['Hector ', 'ɛktɔɾ '],['é ', 'ɛ '],['dedicado,','dedikadu,']],'pt',5);
 expect(result.map(x=>x.phonemes).join('')).toBe('ˈɛktoɾ ˈɛ dedikadu,');
 expect(result.map(x=>[x.charStart,x.charLength])).toEqual([[5,6],[12,1],[14,9]]);
});

it('preserves spaces and accented offsets from the real Portuguese phonemizer source map',()=>{
 const text='O Hector é um estudante de Ciência da Computação.';
 const ipa='ʊ ektˈoɾ ɛ ũŋ ˌestudˈɐ̃ŋtʃy dʒy sjˈeɪŋsjæ da kˌomputasˈɐ̃ʊ̃.';
 const sourceMap:[number,number][]=[[0,0],[2,2],[9,9],[11,11],[14,15],[24,29],[27,33],[35,43],[38,46]];
 const spans=rawPhonemeSpans({text,ipa,sourceMap});
 expect(spans.map(([source])=>source).join('')).toBe(text);
 expect(spans.map(([,phones])=>phones).join('')).toBe(ipa);
 const mapped=mappedPhonemes(spans,'pt',0,text);
 expect(mapped.map(x=>x.charStart)).toEqual([0,2,9,11,14,24,27,35,38]);
 expect(mapped.map(x=>x.phonemes).join('')).toContain('ˈɛ ũŋ ');
});
it('fixes caption positions from trimmed spans without changing English speech phonemes',()=>{
 const spans:[string,string][]=[['He','hi'],['studies','stʌdiz'],['programming.','proʊɡɹæmɪŋ.']];
 const result=mappedPhonemes(spans,'en',10,'He studies programming.');
 expect(result.map(x=>x.charStart)).toEqual([10,13,21]);
 expect(result.map(x=>x.phonemes)).toEqual(spans.map(([,ipa])=>ipa));
});
