// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAssistantVoice } from './useAssistantVoice';
class Utterance {
  text: string; lang=''; rate=1; pitch=1; voice=null;
  onstart: (() => void) | null=null; onend: (() => void) | null=null;
  onerror: ((event:{error:string})=>void) | null=null;
  onboundary: ((event:{charIndex:number;charLength:number})=>void) | null=null;
  constructor(text:string){this.text=text;}
}
let current: Utterance;
const cancel=vi.fn();
beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance',Utterance);
  vi.stubGlobal('speechSynthesis',{speaking:false, cancel, getVoices:()=>[{voiceURI:'pt-br-test',name:'Microsoft Maria',lang:'pt-BR',localService:true,default:false},{voiceURI:'en-us-test',name:'Jenny',lang:'en-US',localService:true,default:false}], addEventListener:vi.fn(),removeEventListener:vi.fn(),speak:vi.fn((u:Utterance)=>{current=u;})});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
it('only enters speaking on actual speech start and exits on completion',()=>{
  const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
  act(()=>result.current.say('Olá visitante'));
  expect(result.current.speaking).toBe(false);
  act(()=>current.onstart?.()); expect(result.current.speaking).toBe(true);
  act(()=>current.onboundary?.({charIndex:4,charLength:9}));
  expect(result.current.wordStart).toBe(4);
  act(()=>current.onend?.()); expect(result.current.speaking).toBe(false);
});
it('stops audio, releases speaking state and reports genuine speech errors',()=>{
  const {result}=renderHook(()=>useAssistantVoice('en',vi.fn()));
  act(()=>result.current.say('Hello'));
  act(()=>current.onstart?.());
  act(()=>result.current.stopSpeech());
  expect(result.current.speaking).toBe(false); expect(cancel).toHaveBeenCalled();
  act(()=>result.current.say('Again')); act(()=>current.onerror?.({error:'not-allowed'}));
  expect(result.current.error).toBe('speech_failed'); expect(result.current.speaking).toBe(false);
});
it('ignores stale completion when another utterance is already speaking',()=>{
  const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
  act(()=>result.current.say('primeira')); const first=current;
  act(()=>result.current.say('segunda')); act(()=>current.onstart?.());
  act(()=>first.onend?.()); expect(result.current.speaking).toBe(true);
});
it('only records after explicit start, surfaces denial and cleans up',()=>{
  let rec!: {onstart:()=>void; onend:()=>void; onerror:(e:{error:string})=>void; abort:ReturnType<typeof vi.fn>};
  class Recognition {constructor(){rec=this as unknown as typeof rec;} start=vi.fn();stop=vi.fn();abort=vi.fn();}
  vi.stubGlobal('webkitSpeechRecognition',Recognition);
  const {result,unmount}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
  expect(result.current.listening).toBe(false);
  act(()=>result.current.startListening()); expect(result.current.listening).toBe(true);
  act(()=>rec.onstart()); expect(result.current.listening).toBe(true);
  act(()=>rec.onerror({error:'not-allowed'})); expect(result.current.error).toBe('mic_denied');
  expect(rec.abort).toHaveBeenCalled(); unmount();
});

it('does not speak a delayed AI reply after the visitor switches voice off',()=>{
  const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
  act(()=>result.current.toggleVoice());
  act(()=>result.current.toggleVoice());
  const previous=current;
  act(()=>result.current.speakReply('delayed answer'));
  expect(current).toBe(previous); expect(result.current.enabled).toBe(false);
});

it('prefers a female Brazilian Portuguese voice and uses a conversational reading rate',()=>{
  const maria={voiceURI:'maria',name:'Microsoft Maria',lang:'pt-BR',localService:true,default:false};
  vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([{...maria,voiceURI:'daniel',name:'Microsoft Daniel'},maria]);
  const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
  act(()=>result.current.say('Bem-vindo ao portfólio'));
  expect(current.voice).toEqual(maria); expect(current.lang).toBe('pt-BR'); expect(current.rate).toBe(1.04);
});
it('emits one final speech turn and never submits interim recognition results',()=>{
  let rec!: {onstart:()=>void;onend:()=>void;onresult:(event:unknown)=>void};
  class Recognition {constructor(){rec=this as unknown as typeof rec;}start=vi.fn();stop=vi.fn();abort=vi.fn();}
  vi.stubGlobal('webkitSpeechRecognition',Recognition);
  const final=vi.fn(),transcript=vi.fn();
  const {result}=renderHook(()=>useAssistantVoice('pt',transcript,final));
  act(()=>result.current.startListening());act(()=>rec.onstart());
  act(()=>rec.onresult({results:[{isFinal:false,0:{transcript:'Qual é'}}]}));
  expect(final).not.toHaveBeenCalled();
  act(()=>rec.onresult({results:[{isFinal:true,0:{transcript:'Qual é a formação dele?'}}]}));
  act(()=>rec.onresult({results:[{isFinal:true,0:{transcript:'Qual é a formação dele?'}}]}));
  act(()=>rec.onend());
  expect(final).toHaveBeenCalledTimes(1);expect(final).toHaveBeenCalledWith('Qual é a formação dele?');
});

it('releases silent sessions so an active call can listen again',()=>{
  const sessions: any[]=[];
  class Recognition {constructor(){sessions.push(this);}start=vi.fn();stop=vi.fn();abort=vi.fn();}
  vi.stubGlobal('webkitSpeechRecognition',Recognition);
  const final=vi.fn();const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn(),final));
  act(()=>result.current.startListening());
  act(()=>sessions[0].onerror({error:'no-speech'}));act(()=>sessions[0].onend());
  expect(result.current.error).toBe('');expect(result.current.listening).toBe(false);
  act(()=>result.current.startListening());expect(sessions).toHaveLength(2);expect(final).not.toHaveBeenCalled();
});
it('joins recognition segments and ignores events after manual stop',()=>{
  let rec: any;
  class Recognition {constructor(){rec=this;}start=vi.fn();stop=vi.fn();abort=vi.fn();}
  vi.stubGlobal('webkitSpeechRecognition',Recognition);
  const final=vi.fn();const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn(),final));
  act(()=>result.current.startListening());
  act(()=>rec.onresult({results:[{isFinal:true,0:{transcript:'Oi Elara'}},{isFinal:true,0:{transcript:'tudo bem?'}}]}));
  act(()=>rec.onend());
  expect(final).toHaveBeenCalledWith('Oi Elara tudo bem?');
  act(()=>result.current.stopListening());act(()=>rec.onerror({error:'not-allowed'}));expect(result.current.error).toBe('');
});

it('releases the microphone on unmount even without speech synthesis support',()=>{
 let rec: any;
 class Recognition {constructor(){rec=this;}start=vi.fn();stop=vi.fn();abort=vi.fn();}
 vi.stubGlobal('speechSynthesis',undefined);vi.stubGlobal('webkitSpeechRecognition',Recognition);
 const {result,unmount}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 expect(result.current.supported).toBe(false);expect(result.current.recognitionSupported).toBe(true);
 act(()=>result.current.startListening());unmount();expect(rec.abort).toHaveBeenCalledTimes(1);
});

it('submits an interim-only mobile result on end and releases the mic before the callback',()=>{
 let rec:any;class Recognition{constructor(){rec=this;}start=vi.fn();stop=vi.fn();abort=vi.fn();}
 vi.stubGlobal('webkitSpeechRecognition',Recognition);
 const final=vi.fn(()=>expect(rec.abort).toHaveBeenCalled());
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn(),final));
 act(()=>result.current.startListening());expect(result.current.micReady).toBe(false);
 act(()=>rec.onstart());expect(result.current.micReady).toBe(true);
 act(()=>rec.onresult({results:[{isFinal:false,0:{transcript:'Quem é o Hector?'}}]}));
 expect(final).not.toHaveBeenCalled();act(()=>rec.onend());
 expect(final).toHaveBeenCalledWith('Quem é o Hector?');expect(result.current.listening).toBe(false);
});
it('delivers once if a mobile recognizer fails to emit end, and discards a failed transcript',()=>{
 vi.useFakeTimers();
 try{
  const sessions:any[]=[];class Recognition{constructor(){sessions.push(this);}start=vi.fn();stop=vi.fn();abort=vi.fn();}
  vi.stubGlobal('webkitSpeechRecognition',Recognition);
  const final=vi.fn();const {result}=renderHook(()=>useAssistantVoice('en',vi.fn(),final));
  act(()=>result.current.startListening());expect(sessions[0].lang).toBe('en-US');
  act(()=>sessions[0].onresult({results:[{isFinal:true,0:{transcript:'Who created you?'}}]}));
  act(()=>vi.advanceTimersByTime(1000));expect(final).toHaveBeenCalledTimes(1);
  act(()=>sessions[0].onend());expect(final).toHaveBeenCalledTimes(1);
  act(()=>result.current.startListening());
  act(()=>sessions[1].onresult({results:[{isFinal:false,0:{transcript:'unfinished'}}]}));
  act(()=>sessions[1].onerror({error:'network'}));act(()=>sessions[1].onend());
  expect(result.current.error).toBe('recognition_network');expect(final).toHaveBeenCalledTimes(1);
 }finally{vi.useRealTimers();}
});
it('never carries a Portuguese voice selection into an English reply',()=>{
 const pt={voiceURI:'maria',name:'Maria',lang:'pt-BR',localService:true,default:false};
 const en={...pt,voiceURI:'jenny',name:'Jenny',lang:'en-US'};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([pt,en]);
 const {result}=renderHook(()=>useAssistantVoice('en',vi.fn()));
 act(()=>result.current.setVoiceURI('maria'));act(()=>result.current.say('Hello, I am Elara.'));
 expect(current.voice).toEqual(en);expect(current.lang).toBe('en-US');
});

it('does not substitute a male Brazilian voice or a female Portugal voice when the requested female locale is missing',()=>{
 const pt={voiceURI:'helena-pt',name:'Helena',lang:'pt-PT',localService:true,default:false};
 const br={...pt,voiceURI:'daniel-br',name:'Daniel',lang:'pt-BR'};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([pt,br]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.setVoiceURI('helena-pt'));act(()=>result.current.say('Olá, tudo bem?'));
 expect(window.speechSynthesis.speak).not.toHaveBeenCalled();expect(result.current.voices).toEqual([]);expect(result.current.error).toBe('female_voice_unavailable');
});
it('explains an unavailable Brazilian voice instead of silently using a Portugal voice',()=>{
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([{voiceURI:'helena-pt',name:'Helena',lang:'pt-PT',localService:true,default:false}]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.say('Olá!'));
 expect(result.current.error).toBe('voice_locale_unavailable');expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
 expect(result.current.preparing).toBe(false);
});

it('preserves the approved English reading speed while speeding up Brazilian Portuguese',()=>{
 const {result}=renderHook(()=>useAssistantVoice('en',vi.fn()));
 act(()=>result.current.say('Hello, I am Elara.'));expect(current.rate).toBe(1.04);
});

it('prefers an installed Brazilian female voice for lightweight output over a remote one',()=>{
 const local={voiceURI:'maria-local',name:'Microsoft Maria',lang:'pt-BR',localService:true,default:false};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([{...local,voiceURI:'francisca-online',name:'Francisca Natural',localService:false},{...local,voiceURI:'daniel',name:'Daniel'},local]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.say('Oi, eu sou a Elara.'));expect(current.voice).toEqual(local);
});
it('moves the mouth during actual browser speech even without word-boundary events, and stops at the end',()=>{
 vi.useFakeTimers();const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.say('Uma resposta.'));expect(result.current.mouthOpen).toBe(0);
 act(()=>current.onstart?.());const initial=result.current.mouthOpen;expect(initial).toBeGreaterThan(0);
 act(()=>vi.advanceTimersByTime(160));expect(result.current.mouthOpen).not.toBe(initial);
 act(()=>current.onend?.());expect(result.current.mouthOpen).toBe(0);
 act(()=>vi.advanceTimersByTime(1000));expect(result.current.mouthOpen).toBe(0);
});

it('advances a coarse caption cursor only after browser speech starts and yields to real boundaries',()=>{
 vi.useFakeTimers();const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.say('Uma resposta longa para acompanhar sem eventos do navegador.'));
 act(()=>vi.advanceTimersByTime(1000));expect(result.current.captionCursor).toBe(0);
 act(()=>current.onstart?.());act(()=>vi.advanceTimersByTime(1000));expect(result.current.captionCursor).toBeGreaterThan(0);
 act(()=>current.onboundary?.({charIndex:30,charLength:10}));
 act(()=>vi.advanceTimersByTime(1000));expect(result.current.captionCursor).toBe(30);
 act(()=>current.onend?.());expect(result.current.captionCursor).toBeGreaterThan(30);
});

it('chooses a remote Brazilian female voice instead of an installed male voice',()=>{
 const male={voiceURI:'daniel-local',name:'Microsoft Daniel',lang:'pt-BR',localService:true,default:true};
 const woman={...male,voiceURI:'francisca-online',name:'Microsoft Francisca Online',localService:false,default:false};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([male,woman]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 act(()=>result.current.setVoiceURI(male.voiceURI));act(()=>result.current.say('Oi, eu sou a Elara.'));
 expect(current.voice).toEqual(woman);expect(result.current.voices).toEqual([woman]);
});
it('does not speak with an unidentified or male default when no identifiable female voice exists',()=>{
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([{voiceURI:'default',name:'Default voice',lang:'pt-BR',localService:true,default:true}]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));act(()=>result.current.toggleVoice());
 expect(window.speechSynthesis.speak).not.toHaveBeenCalled();expect(result.current.enabled).toBe(false);expect(result.current.error).toBe('female_voice_unavailable');
});
it('keeps browser English female too when only a male default is installed',()=>{
 const male={voiceURI:'david',name:'David',lang:'en-US',localService:true,default:true};
 const woman={...male,voiceURI:'jenny',name:'Jenny',localService:false,default:false};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([male,woman]);
 const {result}=renderHook(()=>useAssistantVoice('en',vi.fn()));act(()=>result.current.say('Hello, I am Elara.'));
 expect(current.voice).toEqual(woman);expect(current.lang).toBe('en-US');
});

it('offers generic device voices but uses them only after explicit selection',()=>{
 const generic={voiceURI:'google-br',name:'Google português do Brasil',lang:'pt-BR',localService:false,default:true};
 vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([generic]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));
 expect(result.current.voices).toEqual([generic]);
 act(()=>result.current.say('Teste.'));expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
 act(()=>result.current.setVoiceURI(generic.voiceURI));act(()=>result.current.say('Teste.'));
 expect(current.voice).toEqual(generic);
});

it('refreshes late mobile voices even when voiceschanged is not emitted',()=>{
 vi.useFakeTimers();const getVoices=vi.spyOn(window.speechSynthesis,'getVoices').mockReturnValue([]);
 const {result}=renderHook(()=>useAssistantVoice('pt',vi.fn()));expect(result.current.voices).toEqual([]);
 const maria={voiceURI:'maria',name:'Maria',lang:'pt-BR',localService:true,default:false};
 getVoices.mockReturnValue([maria]);act(()=>vi.advanceTimersByTime(1000));
 expect(result.current.voices).toEqual([maria]);
});
