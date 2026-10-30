import { captionWindow } from '../neural/captionWindow';
import { useEffect, useRef, useState } from 'react';
import type { AssistantPerformance } from '../hooks/useAssistantVoice';
import type { Language } from '../content/profile';

export function SpeechCaption({ performance, language }: { performance: AssistantPerformance; language: Language }) {
  const [following,setFollowing]=useState(true);
  const [mobile,setMobile]=useState(()=>typeof window!=='undefined'&&(window.matchMedia?.('(max-width: 760px)').matches??false));
  useEffect(()=>{const query=window.matchMedia?.('(max-width: 760px)');if(!query)return;const change=()=>setMobile(query.matches);query.addEventListener?.('change',change);return()=>query.removeEventListener?.('change',change);},[]);
  const paragraph = useRef<HTMLParagraphElement>(null);
  const { caption, phase } = performance;
  const progress=useRef({caption:'',cursor:0,spoken:false});
  if(progress.current.caption!==caption)progress.current={caption,cursor:0,spoken:false};
  if(phase==='speaking')progress.current.spoken=true;
  if(progress.current.spoken)progress.current.cursor=Math.max(progress.current.cursor,performance.captionCursor??performance.wordStart);
  const compact=mobile&&progress.current.spoken;
  const segment=compact?captionWindow(caption,progress.current.cursor):{text:caption,start:0,end:caption.length};
  const start = phase === 'speaking'  ? Math.min(caption.length, Math.max(0, performance.wordStart)) : 0;
  const end = phase === 'speaking' ? Math.min(caption.length, start + Math.max(0, performance.wordLength)) : 0;
  const localStart=Math.max(0,Math.min(segment.text.length,start-segment.start));
  const localEnd=Math.max(localStart,Math.min(segment.text.length,end-segment.start));
  useEffect(()=>{if(paragraph.current)paragraph.current.scrollTop=0;setFollowing(true);},[caption]);
  useEffect(() => {
    const box = paragraph.current;
    if (!box) return;
    if (compact||phase !== 'speaking'||!following) return;
    const mark = box.querySelector('mark');
    if (!mark) return;
    const bounds = box.getBoundingClientRect(), word = mark.getBoundingClientRect();
    // Scroll only the caption, never the page or the mobile keyboard viewport.
    if (word.bottom > bounds.bottom) box.scrollTop += word.bottom - bounds.bottom + 20;
    // Never fight manual scrolling or jump back to an earlier line.
  }, [caption, phase, start, end, following, compact]);
  const turn=performance.turn??0;
  const visitor=performance.hearing?(performance.question||(language==='pt'?'Ouvindo…':'Listening…')):performance.question??'';
  const thinking=Boolean(performance.thinking)&&!caption;
  // The previous exchange stays briefly with an exit animation when a new one begins.
  const shown=useRef({turn,visitor:'',caption:''});
  const [leaving,setLeaving]=useState<{turn:number;visitor:string;caption:string}|null>(null);
  useEffect(()=>{
    const before=shown.current;
    if(before.turn!==turn){if(before.visitor||before.caption)setLeaving(before);shown.current={turn,visitor,caption};return;}
    shown.current={turn,visitor:visitor||before.visitor,caption:caption||before.caption};
  },[turn,visitor,caption]);
  useEffect(()=>{if(!leaving)return;const timer=setTimeout(()=>setLeaving(null),420);return()=>clearTimeout(timer);},[leaving]);
  const you=language==='pt'?'Você':'You';
  const exiting=leaving&&<div className="conversation-thread is-leaving" aria-hidden="true" key={`leaving-${leaving.turn}`}>
    {leaving.visitor&&<div className="visitor-bubble"><span>{you}</span><p>{leaving.visitor}</p></div>}
    {leaving.caption&&<div className="elara-speech-bubble conversation-caption is-past"><header><span>Elara</span></header><p>{leaving.caption}</p></div>}
  </div>;
  if (!caption&&!visitor&&!thinking) return exiting||null;
  return <>{exiting}<div className="conversation-thread" key={turn} data-turn={turn}>
  {visitor&&<div className="visitor-bubble" data-hearing={Boolean(performance.hearing)}><span>{you}</span><p>{visitor}</p></div>}
  {!caption&&thinking&&<div className="elara-speech-bubble conversation-caption is-thinking" role="status" aria-label={language==='pt'?'Elara está pensando':'Elara is thinking'}><header><span>Elara</span></header><p className="typing-dots" aria-hidden="true"><i/><i/><i/></p></div>}
  {caption&&<div className="elara-speech-bubble conversation-caption" data-compact={compact}><header><span>Elara</span>{!compact&&!following&&phase==='speaking'&&<button type="button" className="caption-follow" onClick={()=>{const box=paragraph.current,mark=box?.querySelector('mark');if(box&&mark){const bounds=box.getBoundingClientRect(),word=mark.getBoundingClientRect();if(word.top<bounds.top)box.scrollTop=Math.max(0,box.scrollTop-(bounds.top-word.top)-12);}setFollowing(true);}}>{language==='pt'?'Acompanhar fala':'Follow speech'}</button>}</header><p key={compact?segment.start:'full'} ref={paragraph} tabIndex={0} onWheel={()=>setFollowing(false)} onTouchMove={()=>setFollowing(false)} onPointerDown={()=>setFollowing(false)} onKeyDown={event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key))setFollowing(false);}}>{segment.text.slice(0,localStart)}{localEnd>localStart&&<mark>{segment.text.slice(localStart,localEnd)}</mark>}{segment.text.slice(localEnd)}</p></div>}
  </div></>;
}
