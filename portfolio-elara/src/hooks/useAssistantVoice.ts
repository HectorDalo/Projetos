import { browserSpeechText, elaraGreeting } from '../neural/pronunciation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../content/profile';

export type AssistantPhase = 'idle' | 'thinking' | 'speaking' | 'listening';
export type AssistantPerformance = { phase: AssistantPhase; caption: string; wordStart: number; wordLength: number; captionCursor?: number; viseme?: 'closed' | 'small' | 'open' | 'wide' | 'round'; mouthOpen?: number; readMouthFrame?: () => {viseme: 'closed' | 'small' | 'open' | 'wide' | 'round'; mouthOpen:number}; question?: string; turn?: number; hearing?: boolean; thinking?: boolean };
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface BrowserRecognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface VoiceWindow extends Window { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition }

function matchesVoiceLanguage(voice: SpeechSynthesisVoice, language: Language) {
  const locale=voice.lang.replace(/_/g,'-').toLowerCase();
  return language === 'pt' ? /^pt-br(?:-|$)/.test(locale) : /^en(?:-|$)/.test(locale);
}

// The browser API provides no gender field. Accept explicit female labels or known
// female voice identifiers; an unidentified/default voice must never become a male fallback.
function isFemaleVoice(voice:SpeechSynthesisVoice) {
 const label=(voice.name+' '+voice.voiceURI).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /\b(?:female|viola|francisca|maria|luciana|vitoria|fernanda|raquel|helena|joana|lucia|heloisa|camila|brenda|yara|isabela|taina|samantha|zira|jenny|susan|hazel|victoria|aria|ava|emma|michelle|sonia|sara)\b/.test(label);
}

function isKnownMaleVoice(voice:SpeechSynthesisVoice){
 const label=(voice.name+' '+voice.voiceURI).toLowerCase();
 return /\b(?:male|masculin[oa]|daniel|antonio|ricardo|felipe|alex|santa|david|mark|guy|ryan|george|james)\b/.test(label)&&!isFemaleVoice(voice);
}
export function useAssistantVoice(language: Language, onTranscript: (text: string) => void, onFinal?: (text: string) => void) {
  const finalCallback = useRef(onFinal); finalCallback.current = onFinal;
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [caption, setCaption] = useState('');
  const [wordStart, setWordStart] = useState(0);
  const [wordLength, setWordLength] = useState(0);
  const [mouthOpen,setMouthOpen]=useState(0);
  const [captionCursor,setCaptionCursor]=useState(0);
  const mouthTimer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const recognition = useRef<BrowserRecognition | null>(null);
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const transcriptCallback = useRef(onTranscript); transcriptCallback.current = onTranscript;
  const supported = typeof window !== 'undefined' && Boolean(window.speechSynthesis) && typeof window.speechSynthesis?.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function';
  const win = typeof window !== 'undefined' ? window as VoiceWindow : undefined;
  const Recognition = win?.SpeechRecognition ?? win?.webkitSpeechRecognition;
  const stopSpeech = useCallback(() => {
    clearTimeout(speechTimer.current);clearInterval(mouthTimer.current);
    const current = utterance.current; utterance.current = null;
    if (current && supported) window.speechSynthesis.cancel();
    if (alive.current) { setSpeaking(false); setPreparing(false); setWordLength(0);setMouthOpen(0);setCaption(''); }
  }, [supported]);
  const stopListening = useCallback(() => {
    clearTimeout(recognitionTimer.current);
    const current = recognition.current; recognition.current = null; current?.abort();
    if (alive.current) { setListening(false); setMicReady(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    const update = () => { if (alive.current) setVoices(window.speechSynthesis.getVoices()); };
    const retries:ReturnType<typeof setTimeout>[]=[];
    if (supported) { update(); window.speechSynthesis.addEventListener('voiceschanged', update); for(const delay of [250,1000,2500,5000])retries.push(setTimeout(update,delay)); }
    const hidden = () => { if (document.hidden) { stopSpeech(); stopListening(); } };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      alive.current = false; retries.forEach(clearTimeout); stopSpeech(); stopListening();
      if (supported) window.speechSynthesis.removeEventListener('voiceschanged', update);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [supported, stopSpeech, stopListening]);
  useEffect(() => { stopSpeech(); stopListening(); setCaption(''); setError(''); setVoiceURI(''); }, [language, stopSpeech, stopListening]);
  const say = useCallback((text: string) => {
    if (!supported) return;
    stopListening(); stopSpeech(); setError('');
    const clean = text.replace(/[*#`]/g, '').trim();
    if (!clean) return;
    const next = new SpeechSynthesisUtterance(browserSpeechText(clean, language));
    next.lang = language === 'pt' ? 'pt-BR' : 'en-US'; next.rate = language === 'pt' ? 1.04 : 1.04; next.pitch = language === 'pt' ? 1 : 1.06; next.volume = 0.9;
    const available = window.speechSynthesis.getVoices();
    const localeCandidates = available.filter(v => matchesVoiceLanguage(v, language));
    const candidates = localeCandidates.filter(isFemaleVoice);
    // Locality only ranks female voices: an installed male voice cannot outrank a woman.
    const ranked=[...candidates].sort((a,b)=>Number(b.localService)-Number(a.localService));
    const explicit=localeCandidates.find(v=>v.voiceURI===voiceURI&&!isKnownMaleVoice(v));
    const selected = explicit ?? ranked[0];
    if (!selected) { enabledRef.current=false; setEnabled(false); setError(localeCandidates.length?'female_voice_unavailable':'voice_locale_unavailable'); return; }
    next.voice = selected;
    let hasBoundaries=false;
    utterance.current = next; setCaptionCursor(0); setPreparing(true); setCaption(clean); setWordStart(0); setWordLength(0);
    next.onstart = () => {
      if (!alive.current || utterance.current !== next) return;
      clearTimeout(speechTimer.current); setPreparing(false); setSpeaking(true);
      // Browser TTS has no waveform, and some phones omit word boundaries.
      // Keep a subtle approximate motion only while actual speech is active.
      let beat=0;const started=Date.now();setMouthOpen(.18);clearInterval(mouthTimer.current);
      mouthTimer.current=setInterval(()=>{if(!alive.current||utterance.current!==next)return;setMouthOpen(.04+.28*Math.abs(Math.sin(++beat*.85)));if(!hasBoundaries)setCaptionCursor(Math.min(clean.length-1,Math.floor((Date.now()-started)/1000*13*next.rate)));},80);
    };
    next.onboundary = event => {
      if (!alive.current || utterance.current !== next) return;
      hasBoundaries=true;
      const start = Math.max(0, event.charIndex);setCaptionCursor(start);
      setWordStart(start); setWordLength(event.charLength || clean.slice(start).match(/^\S+/)?.[0].length || 0);
    };
    const finish = (failed: boolean) => {
      if (!alive.current || utterance.current !== next) return;
      clearTimeout(speechTimer.current);clearInterval(mouthTimer.current); utterance.current = null; setSpeaking(false); setPreparing(false); setWordLength(0);setMouthOpen(0);
      if (failed) setError('speech_failed');
    };
    next.onend = () => {if(alive.current&&utterance.current===next)setCaptionCursor(clean.length);finish(false);};
    next.onerror = event => finish(!['canceled', 'interrupted'].includes(event.error));
    speechTimer.current = setTimeout(() => {
      if (utterance.current === next && !window.speechSynthesis.speaking) { stopSpeech(); if (alive.current) setError('speech_failed'); }
    }, 8000);
    try { window.speechSynthesis.speak(next); } catch { finish(true); }
  }, [supported, language, voiceURI, stopSpeech, stopListening]);
  const latestSay = useRef(say); latestSay.current = say;
  const speakReply = useCallback((text: string) => { if (enabledRef.current) latestSay.current(text); }, []);
  function toggleVoice(greet = true) {
    if (enabledRef.current) { enabledRef.current = false; setEnabled(false); stopSpeech(); }
    else { enabledRef.current = true; setEnabled(true); if (greet) say(elaraGreeting[language]); }
  }
  function startListening() {
    if (!Recognition || recognition.current) return;
    stopSpeech(); setError(''); setMicReady(false);
    let next: BrowserRecognition;
    try { next = new Recognition(); } catch { setError('recognition_failed'); return; }
    recognition.current = next;
    let delivered = false, transcript = '', confirmed = '';
    const deliver = () => {
      if (!alive.current || recognition.current !== next || delivered) return;
      const text = (transcript || confirmed).trim();
      if (!text) return;
      delivered = true;
      clearTimeout(recognitionTimer.current);
      // Release the mic before triggering a reply, so Elara never hears herself.
      recognition.current = null; next.abort(); setListening(false); setMicReady(false);
      finalCallback.current?.(text);
    };
    setListening(true);
    next.lang = language === 'pt' ? 'pt-BR' : 'en-US'; next.continuous = false; next.interimResults = true;
    next.onstart = () => { if (alive.current && recognition.current === next) { clearTimeout(recognitionTimer.current); setMicReady(true); setCaption(''); } };
    next.onresult = event => {
      if (!alive.current || recognition.current !== next || delivered) return;
      clearTimeout(recognitionTimer.current);
      transcript = Array.from(event.results).map(result => result[0].transcript.trim()).join(' ').trim().slice(0, 2000);
      confirmed = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript.trim()).join(' ').trim().slice(0, 2000);
      setCaption(transcript); transcriptCallback.current(transcript);
      // A few mobile engines omit onend after a final result; don't strand a turn.
      if (event.results[event.results.length - 1]?.isFinal) recognitionTimer.current = setTimeout(deliver, 350);
    };
    next.onerror = event => {
      if (!alive.current || recognition.current !== next) return;
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      clearTimeout(recognitionTimer.current);
      const code = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'mic_denied'
        : event.error === 'network' ? 'recognition_network'
        : event.error === 'audio-capture' ? 'mic_unavailable'
        : event.error === 'language-not-supported' ? 'recognition_language' : 'recognition_failed';
      setError(code); recognition.current = null; next.abort(); setListening(false); setMicReady(false);
    };
    next.onend = () => {
      if (!alive.current || recognition.current !== next) return;
      clearTimeout(recognitionTimer.current);
      // Safari/mobile services can end with an interim transcript but no final event.
      deliver();
      if (recognition.current === next) { recognition.current = null; setListening(false); setMicReady(false); }
    };
    try { recognitionTimer.current=setTimeout(()=>next.onerror?.({error:'network'}),12000); next.start(); } catch { clearTimeout(recognitionTimer.current); recognition.current = null; setListening(false); setMicReady(false); setError('recognition_failed'); }
  }
  return { enabled, supported, recognitionSupported: Boolean(Recognition), preparing, speaking, listening, micReady, caption, wordStart, wordLength, error,
    clearError: () => setError(''),
    mouthOpen, captionCursor, voices: voices.filter(v => matchesVoiceLanguage(v, language)&&!isKnownMaleVoice(v)), voiceURI, setVoiceURI,
    say, speakReply, stopSpeech, startListening, stopListening, toggleVoice };
}
