import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { captionWordAt } from '../neural/captionTiming';
import { copy } from '../content/copy';
import type { Language } from '../content/profile';
import { identifyVisitor } from '../services/conversation';
import type { VisitorIdentity } from '../services/conversation';
import { capabilities, ChatError, sendMessage } from '../services/assistant';
import type { ChatMessage } from '../services/assistant';
import { Icon } from './Icon';
import { useMicrophone } from '../hooks/useMicrophone';
import { useNaturalVoice } from '../hooks/useNaturalVoice';
import { useAssistantVoice } from '../hooks/useAssistantVoice';
import type { AssistantPerformance } from '../hooks/useAssistantVoice';

export function AssistantPanel({ language, onPerformance }: { language: Language; onPerformance?: (state: AssistantPerformance) => void }) {
  const t = copy[language];
  const [online, setOnline] = useState(false), [checking, setChecking] = useState(false);
  const [draft, setDraft] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [transcriptionOnline,setTranscriptionOnline]=useState(false),[recognitionMode,setRecognitionMode]=useState<'auto'|'browser'|'direct'>('auto');
  // Conversation thread shown as bubbles: the visitor's latest question and Elara's answer.
  const [thread,setThread]=useState({turn:0,question:''});
  const debug=typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('debug');
  const [chatMs,setChatMs]=useState<number|undefined>();
  const [expanded, setExpanded] = useState(false);
  const [lastReply, setLastReply] = useState(''), [quiet, setQuiet] = useState(false);
  const [awaitingReply,setAwaitingReply]=useState(false);
  const [callActive, setCallActive] = useState(false);
  const [voiceMode,setVoiceMode]=useState<'neural'|'basic'>('neural');
  // Context exists only in memory for this conversation. No visual log, storage or recording.
  const identity = useRef<VisitorIdentity>('visitor');
  const history = useRef<ChatMessage[]>([]), call = useRef(false);
  const request = useRef<AbortController|null>(null), checkRequest = useRef<AbortController|null>(null);
  const mounted = useRef(false), failedMessages = useRef<ChatMessage[]|null>(null);
  const input = useRef<HTMLInputElement>(null), spokenTurn = useRef<(text:string)=>void>(()=>{});
  const basic = useAssistantVoice(language, setDraft, text => { if (call.current) spokenTurn.current(text); });
  const microphone=useMicrophone(language,text=>{if(call.current)spokenTurn.current(text);});
  const directAvailable=microphone.supported&&transcriptionOnline;
  const useDirect=directAvailable&&recognitionMode!=='browser';
  const listening=(useDirect?microphone.listening||microphone.opening:basic.listening)||microphone.testing;
  const recognizing=useDirect&&microphone.transcribing;
  const canListen=useDirect||basic.recognitionSupported;
  const natural = useNaturalVoice(language);
  const voice = voiceMode==='neural'?natural:basic;
  const preparing = voice.preparing || (voiceMode==='neural'&&voice.enabled&&natural.loading);
  const phase = voice.speaking ? 'speaking' : listening ? 'listening' : busy || preparing || recognizing ? 'thinking' : 'idle';
  const bufferedCaption=voiceMode==='neural'&&natural.latencyMs!==undefined?voice.caption:'';
  const caption = quiet||awaitingReply||listening||recognizing||busy ? '' : voice.speaking ? voice.caption : preparing&&voice.enabled ? bufferedCaption : lastReply;
  const viseme = voiceMode==='neural'?natural.viseme:basic.speaking&&basic.mouthOpen>.08?'small':'closed';
  const mouthOpen = voiceMode==='neural'?natural.mouthOpen:basic.mouthOpen;
  const captionCursor=voiceMode==='neural'?natural.wordStart:basic.captionCursor??basic.wordStart;
  const highlighted=voice.speaking&&voice.wordLength>0?captionWordAt(caption,voice.wordStart):undefined;
  const hearing=listening||recognizing;
  const visitorText=hearing?(useDirect?'':basic.caption):thread.question;
  const threadTurn=hearing?thread.turn+1:thread.turn;
  const thinking=!hearing&&Boolean(thread.question)&&!caption&&(busy||awaitingReply||preparing);
  useEffect(()=>{onPerformance?.({phase,caption,wordStart:highlighted?.start??0,wordLength:highlighted?.length??0,viseme,mouthOpen,captionCursor,readMouthFrame:voiceMode==='neural'?natural.readMouthFrame:undefined,question:visitorText,turn:threadTurn,hearing,thinking});},[phase,caption,highlighted?.start,highlighted?.length,viseme,mouthOpen,captionCursor,onPerformance,voiceMode,natural.readMouthFrame,visitorText,threadTurn,hearing,thinking]);
  useEffect(()=>{if(!expanded)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
  useEffect(()=>{
    const viewport=window.visualViewport;
    if(!expanded || !viewport)return;
    const update=()=>{
      document.documentElement.style.setProperty('--elara-viewport-height',`${viewport.height}px`);
      document.documentElement.style.setProperty('--elara-viewport-top',`${viewport.offsetTop}px`);
    };
    update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);
    return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);document.documentElement.style.removeProperty('--elara-viewport-height');document.documentElement.style.removeProperty('--elara-viewport-top');};
  },[expanded]);
  function endConversation() {
    call.current=false;setCallActive(false);basic.stopListening();microphone.cancel();basic.stopSpeech();natural.stopSpeech();
    const controller=request.current;request.current=null;controller?.abort();
    history.current=[];identity.current='visitor';failedMessages.current=null;setDraft('');setLastReply('');setThread(current=>({turn:current.turn,question:''}));setBusy(false);setError('');setAwaitingReply(false);setQuiet(true);
  }
  const endRef=useRef(endConversation);endRef.current=endConversation;
  const listenRef=useRef(()=>{});listenRef.current=()=>{setAwaitingReply(true);setLastReply('');voice.stopSpeech();if(useDirect)void microphone.start();else basic.startListening();};
  const inputError=useDirect?microphone.error:/^(mic_|recognition_)/.test(basic.error)?basic.error:'';
  useEffect(()=>{
    if(!callActive || busy || recognizing || preparing || voice.speaking || listening || document.hidden) return;
    if(inputError){call.current=false;setCallActive(false);basic.stopListening();microphone.cancel();return;}
    const timer=setTimeout(()=>{if(call.current && !document.hidden)listenRef.current();},650);
    return()=>clearTimeout(timer);
  },[callActive,busy,recognizing,preparing,voice.speaking,listening,inputError]);
  useEffect(()=>{endRef.current();},[language]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)endRef.current();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  function toggleAudio() {
    if(call.current)endConversation();
    setQuiet(false);basic.stopListening();
    voice.toggleVoice();
  }
  function startConversation(){
    if(!online || !canListen || busy || recognizing) return;
    setQuiet(false);basic.clearError();natural.clearError();microphone.clearError();call.current=true;setCallActive(true);
    // Start recognition in the actual tap gesture, before a greeting or model download.
    voice.stopSpeech();
    if(voice.supported&&!voice.enabled)voice.toggleVoice(false);
    listenRef.current();
  }
  const check=useCallback(async()=>{
    checkRequest.current?.abort();const controller=new AbortController();checkRequest.current=controller;
    setChecking(true);const timeout=setTimeout(()=>controller.abort(),8000);
    try{const data=await capabilities(controller.signal);if(mounted.current&&checkRequest.current===controller){setOnline(data.chat_available);setTranscriptionOnline(data.transcription_available===true);}}
    catch{if(mounted.current&&checkRequest.current===controller)setOnline(false);}
    finally{clearTimeout(timeout);if(mounted.current&&checkRequest.current===controller)setChecking(false);}
  },[]);
  useEffect(()=>{mounted.current=true;void check();return()=>{mounted.current=false;call.current=false;checkRequest.current?.abort();request.current?.abort();history.current=[];};},[check]);
  async function generate(next:ChatMessage[]){
    if(!online || request.current)return;
    voice.stopSpeech();basic.stopListening();setQuiet(false);setBusy(true);setLastReply('');setAwaitingReply(true);setError('');failedMessages.current=null;
    const controller=new AbortController();request.current=controller;
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      identity.current=identifyVisitor(next[next.length-1].content,identity.current);
      const sentAt=performance.now();
      const response=await sendMessage(next,language,controller.signal,identity.current);
      setChatMs(Math.round(performance.now()-sentAt));
      if(!mounted.current || request.current!==controller)return;
      history.current=[...next,{role:'assistant' as const,content:response.reply}].slice(-12);
      setLastReply(response.reply);setAwaitingReply(false);voice.speakReply(response.caption);
    }catch(cause){
      if(mounted.current&&request.current===controller){
        setAwaitingReply(false);setError(cause instanceof ChatError?cause.code:'connection_error');failedMessages.current=next;
        call.current=false;setCallActive(false);
      }
    }finally{
      clearTimeout(timeout);
      if(request.current===controller){request.current=null;if(mounted.current){setBusy(false);if(!call.current)requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));}}
    }
  }
  spokenTurn.current=text=>{
    if(!call.current || request.current || !text.trim())return;
    setDraft('');setThread(current=>({turn:current.turn+1,question:text.trim()}));void generate([...history.current,{role:'user',content:text.trim()}]);
  };
  function submit(event:React.FormEvent){
    event.preventDefault();if(!online||request.current||!draft.trim())return;
    const next:ChatMessage[]=[...history.current,{role:'user',content:draft.trim()}];setThread(current=>({turn:current.turn+1,question:draft.trim()}));setDraft('');void generate(next);
  }
  const errorText=error==='rate_limited'?(language==='pt'?'Muitas perguntas em pouco tempo. Espere um minuto e tente de novo.':'Too many questions in a short time. Wait a minute and try again.'):error==='quota_exhausted'?t.quotaError:error==='provider_busy'?t.busyError:['model_terms_required','not_configured'].includes(error)?t.setupError:t.chatError;
  const voiceError=microphone.error || voice.error || basic.error;
  const voiceErrorText=voiceError==='neural_failed'?t.neuralFailed:voiceError==='mic_denied'?t.micDenied:voiceError==='speech_failed'?t.voiceFailed:voiceError==='voice_locale_unavailable'?t.voiceBRUnavailable:voiceError==='female_voice_unavailable'?t.voiceFemaleUnavailable:voiceError==='recognition_network'?t.micNetwork:voiceError==='mic_unavailable'?t.micUnavailable:voiceError==='mic_device_missing'?t.micDeviceMissing:voiceError==='mic_busy'?t.micBusy:voiceError==='mic_no_signal'?t.micNoSignal:voiceError==='no_speech'?t.micNoSpeech:voiceError==='transcription_failed'?t.micTranscriptionFailed:voiceError==='quota_exhausted'?t.quotaError:voiceError==='provider_busy'?t.busyError:voiceError==='recognition_language'?t.micLanguage:t.micFailed;
  const callLabel=language==='pt'?'Iniciar conversa por voz':'Start voice conversation';
  const endLabel=language==='pt'?'Encerrar conversa':'End conversation';
  const status=error?errorText:voiceError?voiceErrorText:checking?t.checking:!online?t.offline:microphone.testing?(language==='pt'?'Testando seu microfone… Fale para ver o nível.':'Testing your microphone… Speak to check the level.'):recognizing?(language==='pt'?'Entendendo sua pergunta…':'Transcribing your question…'):listening?((useDirect?!microphone.opening:basic.micReady)?(language==='pt'?'Estou ouvindo… Fale sua pergunta.':'I’m listening… Ask your question.'):(language==='pt'?'Abrindo microfone… Permita o acesso se solicitado.':'Opening microphone… Allow access if asked.')):voice.speaking?(language==='pt'?'Elara está falando':'Elara is speaking'):busy?t.thinking:preparing?(natural.loading?t.neuralLoading:t.neuralPreparing):callActive?(language==='pt'?'Pode falar':'You can speak'):!canListen?t.micUnsupported:voiceMode==='neural'&&!natural.loaded?(language==='pt'?'Voz natural: download inicial de 100–450 MB.':'Natural voice: initial download of 100–450 MB.'):'';
  return <aside id="assistant" className="assistant-panel compact-conversation" aria-labelledby="assistant-title" data-expanded={expanded} data-call-active={callActive} data-audio-start-ms={natural.latencyMs} data-voice-threads={natural.threads} data-voice-backend={natural.backend}>
    <h2 id="assistant-title" className="sr-only">{t.panelTitle}</h2>
    <div className="conversation-toolbar"><span>{language==='pt'?'Converse com a Elara':'Talk to Elara'}</span><button type="button" className="voice-control" aria-expanded={expanded} aria-controls="conversation-reply" onClick={()=>setExpanded(!expanded)}>{expanded?(language==='pt'?'Reduzir conversa':'Minimize conversation'):(language==='pt'?'Ampliar conversa':'Expand conversation')}</button></div>
    {expanded&&<div id="conversation-reply" className="conversation-reading" aria-live="polite"><span>{listening?(language==='pt'?'Você':'You'):'Elara'}</span><p>{listening?(useDirect?'':basic.caption)|| (language==='pt'?'Pode falar. Sua pergunta aparecerá aqui.':'Go ahead. Your question will appear here.'):busy||recognizing||awaitingReply||preparing?t.thinking:lastReply|| (language==='pt'?'Oi! Pergunte sobre o Hector, a trajetória dele ou os projetos.':'Hi! Ask about Hector, his background or his projects.')}</p></div>}
    <form onSubmit={submit} className="chat-form">
      <label className="sr-only" htmlFor="chat-message">{t.questionLabel}</label>
      <input ref={input} id="chat-message" disabled={!online||busy||listening||recognizing} value={draft} maxLength={2000} enterKeyHint="send" onChange={e=>setDraft(e.target.value)} placeholder={listening?(language==='pt'?'Ouvindo você…':'Listening…'):t.connectedPlaceholder} autoComplete="off"/>
      <button type="button" className={`chat-call-button ${callActive?'is-active':''}`} onClick={callActive?endConversation:startConversation} disabled={!callActive&&(!online||!canListen||busy||recognizing)} aria-label={callActive?endLabel:callLabel} aria-pressed={callActive} title={callActive?endLabel:callLabel}><Icon name={callActive?'close':'mic'} size={18}/></button>
      <button type="submit" disabled={!online||busy||recognizing||!draft.trim()} aria-label={t.send}><Icon name="send" size={18}/></button>
    </form>
    {(microphone.listening||microphone.opening)&&<div className="microphone-signal"><span>{microphone.deviceName|| (language==='pt'?'Abrindo microfone':'Opening microphone')}</span><meter min="0" max="100" value={microphone.level} aria-label={language==='pt'?'Nível do microfone':'Microphone level'}/>{microphone.listening&&!microphone.testing&&<button type="button" className="voice-control" onClick={microphone.finish}>{language==='pt'?'Enviar fala':'Send speech'}</button>}</div>}
    <div className="compact-controls">
      <button type="button" className="voice-control" disabled={!voice.supported} aria-pressed={voice.enabled} title={voiceMode==='neural'&&!natural.loaded?t.neuralDownload:undefined} onClick={toggleAudio}>{natural.loading&&voiceMode==='neural'?`${t.neuralLoading}${natural.progress===undefined?'':` ${natural.progress}%`}`:language==='pt'?`Áudio ${voice.enabled?'ligado':'desligado'}`:`Audio ${voice.enabled?'on':'off'}`}</button>
      {voice.speaking||preparing?<button type="button" className="voice-control" onClick={voice.stopSpeech}>{t.voiceStop}</button>:lastReply&&voice.supported&&<button type="button" className="voice-control" onClick={()=>voice.say(lastReply)}>{t.voicePlay}</button>}
      <details className="conversation-settings"><summary>{language==='pt'?'Opções':'Options'}</summary><div className="conversation-popover">
        <label>{language==='pt'?'Áudio da Elara':'Elara audio'}<select value={voiceMode} onChange={event=>{endConversation();basic.clearError();natural.clearError();if(basic.enabled)basic.toggleVoice(false);if(natural.enabled)natural.toggleVoice(false);setVoiceMode(event.target.value as 'neural'|'basic');}}><option value="neural">{language==='pt'?'Voz natural · neural':'Natural voice · neural'}</option><option value="basic" disabled={!basic.voices.length}>{basic.voices.length ? (language==='pt'?'Voz leve · aparelho':'Lightweight · device voice') : (language==='pt'?'Voz do aparelho indisponível':'Device voice unavailable')}</option></select></label>
        {voiceMode==='basic'&&basic.voices.length>0&&<label>{language==='pt'?'Voz feminina disponível':'Available female voice'}<select value={basic.voiceURI} onChange={e=>{basic.stopSpeech();basic.setVoiceURI(e.target.value);}}><option value="">{language==='pt'?'Automática · feminina identificada':'Automatic · identified female voice'}</option>{basic.voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.localService?(language==='pt'?'instalada':'installed'):(language==='pt'?'online':'online')}</option>)}</select></label>}
        {voiceMode==='basic'&&<p>{language==='pt'?'A lista vem do seu aparelho. Vozes de nome genérico só são usadas quando você as escolhe. As opções online dependem da conexão.':'This list comes from your device. Generic voice names are used only when you select them. Online voices require a connection.'}</p>}
        {microphone.testSupported&&<div className="microphone-options">
          <label>{language==='pt'?'Microfone / headset':'Microphone / headset'}<select value={microphone.deviceId} disabled={busy||recognizing} onChange={e=>{call.current=false;setCallActive(false);basic.stopListening();microphone.cancel();microphone.setDeviceId(e.target.value);}}><option value="">{language==='pt'?'Padrão do aparelho':'Device default'}</option>{microphone.devices.map((device,i)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Microfone ${i+1}`}</option>)}</select></label>
          <button type="button" className="voice-control" disabled={busy||recognizing} onClick={()=>{call.current=false;setCallActive(false);basic.stopListening();voice.stopSpeech();void microphone.start(true);}}>{language==='pt'?'Permitir e testar microfone':'Allow and test microphone'}</button>
          
        </div>}
        {directAvailable&&<label>{language==='pt'?'Reconhecimento':'Recognition'}<select value={recognitionMode} onChange={e=>{call.current=false;setCallActive(false);basic.stopListening();microphone.cancel();microphone.clearError();basic.clearError();setRecognitionMode(e.target.value as 'auto'|'browser'|'direct');}}><option value="auto">{language==='pt'?'Automático':'Automatic'}</option><option value="direct">{language==='pt'?'Microfone selecionado · Cloudflare':'Selected microphone · Cloudflare'}</option><option value="browser">{language==='pt'?'Ditado do navegador':'Browser dictation'}</option></select></label>}
        {voiceMode==='neural'&&!natural.loaded&&<p>{t.neuralDownload}</p>}
        {!canListen&&<p>{t.micUnsupported}</p>}
        <button type="button" className="voice-control" onClick={endConversation}>{language==='pt'?'Limpar conversa atual':'Clear current conversation'}</button>
      </div></details>
      {!online&&<button type="button" className="connection-retry" disabled={checking} onClick={()=>void check()}>{t.retry}</button>}
    </div>
    <div className="conversation-status" role={error||voiceError?'alert':'status'}><span>{status}</span>{voiceError&&<button type="button" className="connection-retry" onClick={()=>{basic.clearError();natural.clearError();microphone.clearError();if(canListen)startConversation();}}>{language==='pt'?'Tentar voz novamente':'Retry voice'}</button>}{error&&failedMessages.current&&<button type="button" className="connection-retry" disabled={busy} onClick={()=>{if(failedMessages.current)void generate(failedMessages.current);}}>{t.retryMessage}</button>}</div>
    {!expanded&&<p className="sr-only" aria-live="polite" aria-atomic="true">{caption}</p>}
    {debug&&createPortal(<dl className="voice-debug" aria-label="Diagnóstico de voz">
      <dt>isolado</dt><dd>{String(typeof self!=='undefined'&&self.crossOriginIsolated)}</dd>
      <dt>voz</dt><dd>{natural.backend} · {natural.threads} thr{natural.metrics.preferCpu?' · cpu móvel':''}</dd>
      <dt>chat</dt><dd>{chatMs===undefined?'–':`${chatMs} ms`}</dd>
      <dt>1º trecho</dt><dd>{natural.metrics.firstChunkMs===undefined?'–':`${natural.metrics.firstChunkMs} ms · RTF ${natural.metrics.rtf}`}</dd>
      <dt>espera</dt><dd>{natural.metrics.leadMs===undefined?'–':`${natural.metrics.leadMs} ms`}</dd>
      <dt>1º som</dt><dd>{natural.latencyMs===undefined?'–':`${natural.latencyMs} ms`}</dd>
    </dl>,document.body)}
  </aside>;
}
