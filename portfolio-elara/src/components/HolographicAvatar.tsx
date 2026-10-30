import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { AssistantPerformance } from '../hooks/useAssistantVoice';
import type { CSSProperties } from 'react';
import type { Language } from '../content/profile';

const ElaraFaceRig = lazy(() => import('./ElaraFaceRig'));

const labels = {
  pt: { idle: 'Acompanhando seu cursor', speaking: 'Falando com você', listening: 'Ouvindo seu ditado', thinking: 'Preparando a resposta' },
  en: { idle: 'Following your cursor', speaking: 'Speaking to you', listening: 'Listening to dictation', thinking: 'Preparing a reply' },
};
export function HolographicAvatar({ performance, language }: { performance: AssistantPerformance; language: Language }) {
  const root = useRef<HTMLDivElement>(null);
  const [staticMobile,setStaticMobile]=useState(()=>window.matchMedia('(max-width: 760px) and (pointer: coarse)').matches);
  useEffect(()=>{const query=window.matchMedia('(max-width: 760px) and (pointer: coarse)');const update=()=>setStaticMobile(query.matches);query.addEventListener?.('change',update);return()=>query.removeEventListener?.('change',update);},[]);
  const phase = useRef(performance.phase); phase.current = performance.phase;
  useEffect(() => {
    const host = root.current; if (!host) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if(window.matchMedia('(max-width: 760px) and (pointer: coarse)').matches)return;
    let previousX=NaN, previousY=NaN;
    let targetX = 0, targetY = 0, x = 0, y = 0, visible = true, frame = 0;
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width * .51) / Math.max(window.innerWidth * .35, 1)));
      targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height * .28) / Math.max(window.innerHeight * .45, 1)));
    };
    const reset = () => { targetX = 0; targetY = 0; };
    const animate = () => {
      if (visible && !document.hidden) {
        const tracking = phase.current !== 'speaking' && !motion.matches;
        x += ((tracking ? targetX : 0) - x) * .13; y += ((tracking ? targetY : 0) - y) * .13;
        if (Math.abs(x) < .001) x = 0; if (Math.abs(y) < .001) y = 0;
        if(x!==previousX||y!==previousY){previousX=x;previousY=y;
        host.style.setProperty('--gaze-x', `${x * 11}px`); host.style.setProperty('--gaze-y', `${y * 6}px`);
        host.style.setProperty('--eye-x', `${x * 1.5}px`); host.style.setProperty('--eye-y', `${y * .8}px`);
        host.style.setProperty('--head-yaw', `${x * 7}deg`); host.style.setProperty('--head-pitch', `${-y * 3}deg`);
        host.style.setProperty('--head-roll', `${x * 1.8}deg`);
        host.dataset.gazeX = x.toFixed(3); host.dataset.gazeY = y.toFixed(3);
        }
      }
      frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; });
    observer.observe(host);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset); window.addEventListener('blur', reset);
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('pointermove', pointer); document.documentElement.removeEventListener('pointerleave', reset); window.removeEventListener('blur', reset); };
  }, []);
  const mouth = performance.viseme === 'round' ? '/images/elara-round.webp' : performance.viseme === 'open' ? '/images/elara-open.webp' : '/images/elara-speaking.webp';
  return <div style={{'--mouth-open': performance.phase==='speaking' && performance.viseme!=='closed' ? performance.mouthOpen ?? 0 : 0} as CSSProperties} data-viseme={performance.viseme ?? 'closed'} className={`avatar-stage is-${performance.phase}${staticMobile?' mobile-portrait-static':''}`} ref={root} data-phase={performance.phase} aria-label={language === 'pt' ? 'Elara, assistente virtual animada' : 'Elara, animated virtual assistant'} role="group">
    <div className="avatar-character" aria-hidden="true">
      {staticMobile?<img className="mobile-elara-portrait" src="/images/assistant-human.webp" alt="" width="1024" height="1536" decoding="async" draggable="false"/>:<><img className="avatar-body" src="/images/assistant-human.webp" alt="" width="1024" height="1536" draggable="false" />
      <div className="avatar-head">
        <img src="/images/assistant-human.webp" alt="" width="1024" height="1536" draggable="false" />
        <svg className="elara-eye-rig" viewBox="0 0 1024 1536" aria-hidden="true">
          <defs>
            <clipPath id="elara-left-window"><path d="M409 383Q448 357 484 389Q450 403 409 383Z"/></clipPath>
            <clipPath id="elara-right-window"><path d="M555 391Q590 368 625 389Q593 409 555 391Z"/></clipPath>
            <clipPath id="elara-left-iris"><ellipse cx="450" cy="382" rx="15" ry="14"/></clipPath>
            <clipPath id="elara-right-iris"><ellipse cx="590" cy="388" rx="15" ry="14"/></clipPath>
          </defs>
          <g clipPath="url(#elara-left-window)"><image href="/images/elara-sclera.webp" width="1024" height="1536"/><g className="elara-pupil"><image href="/images/assistant-human.webp" width="1024" height="1536" clipPath="url(#elara-left-iris)"/></g></g>
          <g clipPath="url(#elara-right-window)"><image href="/images/elara-sclera.webp" width="1024" height="1536"/><g className="elara-pupil"><image href="/images/assistant-human.webp" width="1024" height="1536" clipPath="url(#elara-right-iris)"/></g></g>
        </svg>
        <img className="elara-natural-blink" src="/images/elara-blink.webp" alt="" width="1024" height="1536" draggable="false" />
        <img className="elara-natural-mouth" src={mouth} alt="" width="1024" height="1536" draggable="false" />
      </div>
      <Suspense fallback={null}><ElaraFaceRig performance={performance} /></Suspense><div className="avatar-scan" /></>}
    </div>
    {!staticMobile&&<div className="avatar-platform" aria-hidden="true"><i/><i/><i/></div>}
    {!staticMobile&&<><img src="/images/elara-round.webp" alt="" hidden aria-hidden="true"/><img src="/images/elara-open.webp" alt="" hidden aria-hidden="true"/></>}
    {performance.phase!=='idle'&&<div className="avatar-presence"><i/><span>{labels[language][performance.phase]}</span></div>}
  </div>;
}
