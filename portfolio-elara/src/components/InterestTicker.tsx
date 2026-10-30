import { useEffect, useState } from 'react';
import type { Language } from '../content/profile';
const interests = {
  pt: ['Criação de Soluções Digitais', 'Programação', 'Inteligência Artificial'],
  en: ['Creating Digital Solutions', 'Programming', 'Artificial Intelligence'],
};
export function InterestTicker({ language }: { language: Language }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => { clearInterval(timer); setIndex(0); if (!motion.matches) timer = setInterval(() => setIndex(i => (i + 1) % 3), 4500); };
    update(); motion.addEventListener('change', update);
    return () => { clearInterval(timer); motion.removeEventListener('change', update); };
  }, []);
  return <div className="interest-ticker"><span className="sr-only">{interests[language].join(', ')}</span><span className="interest-current" key={`${language}-${index}`} aria-hidden="true">{interests[language][index]}<svg className="interest-spark" viewBox="0 0 240 32" preserveAspectRatio="none"><path d="M0 18L30 18 35 12 40 23 47 7 53 23 60 15 83 15 90 9 96 21 102 17 134 17 139 12 144 22 150 14 175 14 182 19 188 11 194 17 240 17"/></svg></span></div>;
}
