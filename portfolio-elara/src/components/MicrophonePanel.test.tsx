// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const mic=vi.hoisted(()=>({neuralSpeaking:false,browserStart:vi.fn(),browserSupported:false,start:vi.fn(),cancel:vi.fn(),final:undefined as undefined|((text:string)=>void)}));
vi.mock('../hooks/useMicrophone',()=>({useMicrophone:(_language:unknown,onFinal:(text:string)=>void)=>{mic.final=onFinal;return {supported:true,testSupported:true,devices:[{deviceId:'headset',label:'Headset USB'}],deviceId:'',setDeviceId:vi.fn(),deviceName:'Headset USB',listening:false,opening:false,transcribing:false,testing:false,level:0,error:'',start:mic.start,cancel:mic.cancel,finish:vi.fn(),clearError:vi.fn()};}}));
vi.mock('../hooks/useAssistantVoice',()=>({useAssistantVoice:()=>({supported:false,recognitionSupported:mic.browserSupported,enabled:false,preparing:false,speaking:false,listening:false,micReady:false,caption:'',wordStart:0,wordLength:0,error:'',voices:[],voiceURI:'',setVoiceURI:vi.fn(),say:vi.fn(),speakReply:vi.fn(),stopSpeech:vi.fn(),startListening:mic.browserStart,stopListening:vi.fn(),toggleVoice:vi.fn(),clearError:vi.fn()})}));
vi.mock('../hooks/useNaturalVoice',()=>({useNaturalVoice:()=>({supported:false,enabled:false,loaded:false,loading:false,preparing:false,speaking:mic.neuralSpeaking,viseme:mic.neuralSpeaking?'open':'closed',mouthOpen:mic.neuralSpeaking?.6:0,caption:'',wordStart:0,wordLength:0,error:'',say:vi.fn(),speakReply:vi.fn(),stopSpeech:vi.fn(),toggleVoice:vi.fn(),clearError:vi.fn()})}));
import {AssistantPanel} from './AssistantPanel';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();mic.browserSupported=false;mic.neuralSpeaking=false;});
it('allows a microphone conversation even when browser dictation and speech output are unavailable',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false,transcription_available:true})}).mockResolvedValueOnce({ok:true,json:async()=>({reply:'Hector estuda Ciência da Computação.'})});vi.stubGlobal('fetch',fetch);
 const performance=vi.fn();render(<AssistantPanel language="pt" onPerformance={performance}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:'Iniciar conversa por voz'}) as HTMLButtonElement).disabled).toBe(false));
 expect(mic.start).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Iniciar conversa por voz'}));expect(mic.start).toHaveBeenCalledTimes(1);
 await act(async()=>{mic.final?.('Fale sobre o Hector.');await Promise.resolve();});
 expect(await screen.findByText('Hector estuda Ciência da Computação.')).toBeTruthy();
 // The visitor's question is drawn as a bubble by SpeechCaption, fed through onPerformance.
 expect(performance).toHaveBeenCalledWith(expect.objectContaining({question:'Fale sobre o Hector.'}));
 const body=JSON.parse(fetch.mock.calls[1][1].body);expect(body.messages.at(-1).content).toBe('Fale sobre o Hector.');
});
it('offers explicit microphone permission/testing and a headset selector',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({chat_available:true,voice_available:false,transcription_available:true})}));
 render(<AssistantPanel language="pt"/>);await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 fireEvent.click(screen.getByText('Opções',{exact:true}));
 expect(screen.getByRole('option',{name:'Headset USB'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Permitir e testar microfone'}));expect(mic.start).toHaveBeenCalledWith(true);
});

it('opens the same permission-based microphone in English even when browser dictation exists',async()=>{
 mic.browserSupported=true;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({chat_available:true,voice_available:false,transcription_available:true})}));
 render(<AssistantPanel language="en"/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:'Start voice conversation'}) as HTMLButtonElement).disabled).toBe(false));
 expect(mic.start).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Start voice conversation'}));
 expect(mic.start).toHaveBeenCalledTimes(1);expect(mic.browserStart).not.toHaveBeenCalled();
});

it('passes natural speech mouth movement through on mobile without browser word-boundary events',async()=>{
 mic.neuralSpeaking=true;vi.stubGlobal('matchMedia',()=>({matches:true}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({chat_available:true,voice_available:false,transcription_available:true})}));
 const performance=vi.fn();render(<AssistantPanel language="pt" onPerformance={performance}/>);
 await waitFor(()=>expect(performance).toHaveBeenCalledWith(expect.objectContaining({phase:'speaking',viseme:'open',mouthOpen:.6})));
});
