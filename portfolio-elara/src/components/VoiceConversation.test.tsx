// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const control=vi.hoisted(()=>({browserEnabled:false,browserSpeak:vi.fn(),browserToggle:vi.fn(),speaking:false,preparing:false,caption:'',listening:false,error:'',enabled:true,toggle:vi.fn(),final:undefined as undefined|((text:string)=>void),listen:vi.fn(),stopListening:vi.fn(),speak:vi.fn()}));
vi.mock('../hooks/useAssistantVoice',()=>({useAssistantVoice:(_language:unknown,_transcript:unknown,onFinal:(text:string)=>void)=>{
  control.final=onFinal;
  return {supported:true,recognitionSupported:true,enabled:control.browserEnabled,preparing:false,speaking:false,listening:control.listening,caption:'',wordStart:0,wordLength:0,error:control.error,voices:[],voiceURI:'',setVoiceURI:vi.fn(),say:vi.fn(),speakReply:control.browserSpeak,stopSpeech:vi.fn(),startListening:control.listen,stopListening:control.stopListening,toggleVoice:control.browserToggle,clearError:vi.fn()};
}}));
vi.mock('../hooks/useNaturalVoice',()=>({useNaturalVoice:()=>({supported:true,enabled:control.enabled,loaded:true,loading:false,progress:undefined,preparing:control.preparing,speaking:control.speaking,caption:control.caption,wordStart:0,wordLength:0,viseme:'closed',mouthOpen:0,error:'',say:vi.fn(),speakReply:control.speak,stopSpeech:vi.fn(),toggleVoice:control.toggle,clearError:vi.fn()})}));
import { AssistantPanel } from './AssistantPanel';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();control.speaking=false;control.preparing=false;control.caption='';control.listening=false;control.error='';control.enabled=true;control.browserEnabled=false;vi.clearAllMocks();});
it('requires an explicit call, waits for spoken audio and preparation to end, then listens again',async()=>{
  control.speak.mockImplementation(()=>{control.speaking=true;});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})}).mockResolvedValueOnce({ok:true,json:async()=>({reply:'Provider test answer',caption:'Provider test answer'})}));
  const view=render(<AssistantPanel language="en"/>);
  await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
  expect(control.listen).not.toHaveBeenCalled();
  vi.useFakeTimers();fireEvent.click(screen.getByRole('button',{name:'Start voice conversation'}));expect(control.listen).toHaveBeenCalledTimes(1);
  await act(async()=>{control.final?.('A final question');await Promise.resolve();await Promise.resolve();});
  expect(control.speak).toHaveBeenCalledWith('Provider test answer');
  act(()=>vi.advanceTimersByTime(2000));expect(control.listen).toHaveBeenCalledTimes(1);
  control.speaking=false;control.preparing=true;view.rerender(<AssistantPanel language="en"/>);
  act(()=>vi.advanceTimersByTime(2000));expect(control.listen).toHaveBeenCalledTimes(1);
  control.preparing=false;view.rerender(<AssistantPanel language="en"/>);
  act(()=>vi.advanceTimersByTime(700));expect(control.listen).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button',{name:'End conversation'}));
  act(()=>vi.advanceTimersByTime(2000));expect(control.listen).toHaveBeenCalledTimes(2);
});

it('does not show the answer as spoken captions before the real audio starts',async()=>{
 control.speak.mockImplementation((text:string)=>{control.caption=text;control.preparing=true;});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})}).mockResolvedValueOnce({ok:true,json:async()=>({reply:'A reply waiting for audio',caption:'A reply waiting for audio'})}));
 const view=render(<AssistantPanel language="en"/>);
 await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'A question'}});
 fireEvent.click(screen.getByRole('button',{name:'Send message'}));
 await waitFor(()=>expect(control.speak).toHaveBeenCalledWith('A reply waiting for audio'));
 expect(screen.queryByText('A reply waiting for audio')).toBeNull();
 control.preparing=false;control.speaking=true;view.rerender(<AssistantPanel language="en"/>);
 expect(screen.getByText('A reply waiting for audio')).toBeTruthy();
});

it('resumes after silence and preserves context without redisplaying an old reply after microphone failure',async()=>{
  control.speak.mockImplementation(()=>{});
  const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
    .mockResolvedValueOnce({ok:true,json:async()=>({reply:'Hector studies at ENIAC',caption:'Hector studies at ENIAC'})})
    .mockResolvedValueOnce({ok:true,json:async()=>({reply:'More about his studies',caption:'More about his studies'})});
  vi.stubGlobal('fetch',fetch);
  const view=render(<AssistantPanel language="en"/>);
  await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
  vi.useFakeTimers();fireEvent.click(screen.getByRole('button',{name:'Start voice conversation'}));
  await act(async()=>{control.final?.('Who is Hector?');await Promise.resolve();await Promise.resolve();});
  control.listening=true;view.rerender(<AssistantPanel language="en"/>);
  control.listening=false;view.rerender(<AssistantPanel language="en"/>);
  act(()=>vi.advanceTimersByTime(700));expect(control.listen).toHaveBeenCalledTimes(2);
  control.error='mic_denied';view.rerender(<AssistantPanel language="en"/>);
  expect(screen.queryByText('Hector studies at ENIAC')).toBeNull();
  expect(screen.getByRole('button',{name:'Start voice conversation'})).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'Tell me more'}});
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Send message'}));await Promise.resolve();await Promise.resolve();});
  const sent=JSON.parse(fetch.mock.calls[2][1].body).messages;
  expect(sent).toEqual([{role:'user',content:'Who is Hector?'},{role:'assistant',content:'Hector studies at ENIAC'},{role:'user',content:'Tell me more'}]);
});

it('opens the microphone directly on the first tap without playing a greeting or waiting for the voice model',async()=>{
 control.enabled=false;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({chat_available:true,voice_available:false})}));
 render(<AssistantPanel language="en"/>);
 await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Start voice conversation'}));
 expect(control.toggle).toHaveBeenCalledWith(false);expect(control.listen).toHaveBeenCalledTimes(1);
});

it('uses lightweight speech after an explicit mode change without changing the chat language or losing input',async()=>{
 control.browserToggle.mockImplementation(()=>{control.browserEnabled=!control.browserEnabled;});
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})}).mockResolvedValueOnce({ok:true,json:async()=>({reply:'Uma resposta em português.'})});
 vi.stubGlobal('fetch',fetch);render(<AssistantPanel language="pt"/>);
 await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('Áudio da Elara'),{target:{value:'basic'}});
 fireEvent.click(screen.getByRole('button',{name:'Áudio desligado'}));
 fireEvent.change(screen.getByLabelText('Sua mensagem'),{target:{value:'Quem é o Hector?'}});
 fireEvent.click(screen.getByRole('button',{name:'Enviar mensagem'}));
 await waitFor(()=>expect(control.browserSpeak).toHaveBeenCalledWith('Uma resposta em português.'));
 expect(control.speak).not.toHaveBeenCalled();expect(JSON.parse(fetch.mock.calls[1][1].body).language).toBe('pt');
});

it('never flashes an old response between listening, transcription and the first audio of the new response',async()=>{
 let resolveReply!:(response:unknown)=>void;
 const pending=new Promise(resolve=>{resolveReply=resolve;});
 control.speak.mockImplementation((text:string)=>{control.caption=text;control.preparing=true;});
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
 .mockResolvedValueOnce({ok:true,json:async()=>({reply:'The previous answer.'})}).mockImplementationOnce(()=>pending);
 vi.stubGlobal('fetch',fetch);const performance=vi.fn();const view=render(<AssistantPanel language="en" onPerformance={performance}/>);
 await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Start voice conversation'}));
 await act(async()=>{control.final?.('First question');await Promise.resolve();await Promise.resolve();});
 control.preparing=false;control.speaking=true;view.rerender(<AssistantPanel language="en" onPerformance={performance}/>);
 expect(screen.getByText('The previous answer.')).toBeTruthy();
 control.speaking=false;view.rerender(<AssistantPanel language="en" onPerformance={performance}/>);
 await waitFor(()=>expect(control.listen).toHaveBeenCalledTimes(2));
 // The browser temporarily reports no listening and no network request during transcription.
 view.rerender(<AssistantPanel language="en" onPerformance={performance}/>);
 expect(screen.queryByText('The previous answer.')).toBeNull();expect(performance.mock.calls.at(-1)![0].caption).toBe('');
 await act(async()=>{control.final?.('Next question');await Promise.resolve();});
 expect(screen.queryByText('The previous answer.')).toBeNull();
 await act(async()=>{resolveReply({ok:true,json:async()=>({reply:'The new answer.'})});await Promise.resolve();await Promise.resolve();});
 view.rerender(<AssistantPanel language="en" onPerformance={performance}/>);
 expect(screen.queryByText('The previous answer.')).toBeNull();expect(screen.queryByText('The new answer.')).toBeNull();
 control.preparing=false;control.speaking=true;view.rerender(<AssistantPanel language="en" onPerformance={performance}/>);
 expect(screen.getByText('The new answer.')).toBeTruthy();
});
