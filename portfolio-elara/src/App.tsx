import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Skills } from './components/Skills';
import { aiDevelopment } from './content/skills';
import { ProfessionalHistory } from './components/ProfessionalHistory';
import { InterestTicker } from './components/InterestTicker';
import { SpeechCaption } from './components/SpeechCaption';
import { HolographicAvatar } from './components/HolographicAvatar';
import type { AssistantPerformance } from './hooks/useAssistantVoice';
import { AssistantPanel } from './components/AssistantPanel';
import { Icon } from './components/Icon';
import { copy } from './content/copy';
import { profile, projects, technologies } from './content/profile';
import type { Language, Project } from './content/profile';

const OrbitalScene = lazy(() => import('./components/OrbitalScene'));
const anchors = ['home', 'about', 'projects', 'skills', 'technologies', 'contact'];

function initialLanguage(): Language {
  try { return localStorage.getItem('hector-language') === 'en' ? 'en' : 'pt'; } catch { return 'pt'; }
}
function ProjectDialog({ project, language, onClose }: { project: Project; language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = copy[language];
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="project-dialog glass" onCancel={onClose} aria-labelledby="project-dialog-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button className="icon-button dialog-close" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
    <span className="eyebrow">{t.modalStatus}</span><h2 id="project-dialog-title">{project.title[language]}</h2><p>{project.details[language]}</p>{project.image&&<figure className="project-screenshot"><a href={project.image} target="_blank" rel="noreferrer"><img src={project.image} alt={project.imageAlt?.[language]??project.title[language]} width="1282" height="882"/></a><figcaption>{language==='pt'?'Interface real · Dados fictícios para demonstração. Toque na imagem para ampliar.':'Actual interface · Fictional demonstration data. Tap to enlarge.'}</figcaption></figure>}
    <div className="tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    <div className="dialog-actions">{project.sourceUrl && <a className="button secondary" href={project.sourceUrl} target="_blank" rel="noreferrer">{t.projectSource} ↗</a>}{project.liveUrl && <a className="button primary" href={project.liveUrl} target="_blank" rel="noreferrer">{t.projectLive} ↗</a>}</div>
  </dialog>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState('home');
  const [effects, setEffects] = useState(()=>typeof window!=='undefined'&&!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false)&&!(window.matchMedia?.('(max-width: 760px) and (pointer: coarse)').matches??false));
  const [performance, setPerformance] = useState<AssistantPerformance>({ phase: 'idle', caption: '', wordStart: 0, wordLength: 0 });
  const [selected, setSelected] = useState<Project | null>(null);
  const t = copy[language];
  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    document.title = `Hector Dalonso — ${language === 'pt' ? 'Portfólio' : 'Portfolio'}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', profile.introduction[language]);
    try { localStorage.setItem('hector-language', language); } catch { /* private browsing */ }
  }, [language]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    anchors.forEach(id => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, []);
  return <>
    <a className="skip-link" href="#main">{t.skip}</a>
    <header className="header"><div className="header-inner">
      <a href="#home" className="wordmark" aria-label="Hector Dalonso"><span className="brand-mark">H<span>D</span></span><span>HECTOR <b>DALONSO</b></span></a>
      <nav id="mobile-navigation" className={menu ? 'nav open' : 'nav'} aria-label={language === 'pt' ? 'Principal' : 'Main'}>{anchors.map((id, i) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setMenu(false)}>{t.nav[i]}</a>)}</nav>
      <div className="header-controls"><div className="language-switch" aria-label={language === 'pt' ? 'Idioma' : 'Language'}><button lang="pt" aria-pressed={language === 'pt'} onClick={() => setLanguage('pt')}>PT</button><span>/</span><button lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div><button className="icon-button effects-toggle" onClick={() => setEffects(!effects)} aria-pressed={effects} title={effects ? t.motionOff : t.motionOn} aria-label={effects ? t.motionOff : t.motionOn}><Icon name="orbit" /></button><button className="icon-button mobile-menu" aria-label={menu ? t.close : t.menu} aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button></div>
    </div></header>
    <main id="main">
      <section className="hero" data-effects={effects} id="home" aria-labelledby="hero-title">
        <div className="hero-art" aria-hidden="true" />
        {effects && <Suspense fallback={null}><OrbitalScene /></Suspense>}
        <div className="hero-grid shell"><div className="hero-copy"><p className="hello">{t.hello}</p><h1 id="hero-title">Hector<br /><span>Dalonso<span className="period">.</span></span></h1><InterestTicker language={language} /><p className="intro">{profile.introduction[language]}</p></div>
        <div className="elara-column"><div className="elara-presentation"><HolographicAvatar performance={performance} language={language} />
        <div className="elara-response-slot"><SpeechCaption performance={performance} language={language} /></div></div><AssistantPanel language={language} onPerformance={setPerformance} /></div></div>

      </section>
      <section id="about" className="about-section shell section"><div className="section-heading"><p className="eyebrow">{t.aboutLabel}</p><h2>{t.aboutTitle}</h2></div><div className="about-copy">{profile.about[language].split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}<p>{aiDevelopment[language]}</p><div className="study-skills" aria-label={language === 'pt' ? 'Conhecimentos em desenvolvimento' : 'Knowledge in development'}><span>{language === 'pt' ? 'Em estudo' : 'Studying'}</span><ul>{profile.skills.map(skill => <li key={skill}>{skill.includes(' / ') ? skill.split(' / ')[language === 'pt' ? 0 : 1] : skill}</li>)}</ul></div></div><div className="orbit-diagram" aria-hidden="true"><div className="orbit-circle one"/><div className="orbit-circle two"/><div className="orbit-circle three"/><span>HD</span><i/></div></section>
      <ProfessionalHistory language={language} />
      <section id="projects" className="projects-section section shell"><div className="section-head-row"><div className="section-heading"><p className="eyebrow">{t.projectLabel}</p><h2>{t.projectTitle}</h2></div><p className="muted section-description">{t.projectSub}</p></div><div className="project-grid">{projects.map(project => <article className="project-card glass" key={project.id}><div className={`project-art ${project.image?'has-screenshot':''}`}>{project.image?<img className="project-card-screenshot" src={project.image} alt={project.imageAlt?.[language]??project.title[language]} loading="lazy" width="1282" height="882"/>:<><div className="project-art-grid"/><span className="project-art-monogram">{project.id==='cadastro-clientes'?'PY':'HD'}<span>↗</span></span><div className="project-art-label">{project.id==='cadastro-clientes'?'PYTHON / TKINTER':language==='pt'?'PORTFÓLIO INTERATIVO':'INTERACTIVE PORTFOLIO'}</div></>}</div><div className="project-body"><span className="eyebrow">{project.category[language]}</span><h3>{project.title[language]}</h3><p>{project.description[language]}</p><div className="project-bottom"><div className="tags">{project.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><button className="project-open" onClick={() => setSelected(project)} aria-label={`${t.details}: ${project.title[language]}`}><Icon name="arrow" /></button></div></div></article>)}<div className="next-project"><span className="next-cross" aria-hidden="true">+</span><div><span className="eyebrow">{language === 'pt' ? 'EM BREVE' : 'COMING SOON'}</span><h3>{t.next}</h3><p>{t.nextSub}</p></div></div></div></section>
      <div className="projects-hub-links shell"><a className="button secondary" href="https://hectordalo.github.io/Projetos/" target="_blank" rel="noreferrer">{language==='pt'?'Explorar a central de projetos':'Explore the project hub'}<Icon name="arrow" size={17}/></a><a className="button secondary" href="https://github.com/HectorDalo/Projetos" target="_blank" rel="noreferrer">{language==='pt'?'Código e documentação no GitHub':'Code and documentation on GitHub'}<Icon name="arrow" size={17}/></a></div>
      <Skills language={language} />
      <section id="technologies" className="section shell tech-section"><div className="section-heading"><p className="eyebrow">{t.techLabel}</p><h2>{t.techTitle}</h2><p className="muted">{t.techSub}</p></div><div className="technology-grid">{technologies.map(tech => <div className="technology" key={tech.name}><span className="tech-mark" style={{ color: tech.color }} aria-hidden="true">{tech.mark}</span><span>{tech.name}<small>{tech.stage === 'built' ? t.built : t.ready}</small></span><span className={`tech-dot ${tech.stage}`} aria-hidden="true" /></div>)}</div></section>
      <section id="contact" className="contact-section section"><div className="shell contact-inner"><div><p className="eyebrow">{t.contactLabel}</p><h2>{t.contactTitle}</h2></div><div className="contact-copy">{profile.contacts.length ? <div className="contact-links">{profile.contacts.map(contact => <a className="button secondary" href={contact.url} key={contact.label} target="_blank" rel="noreferrer">{contact.label}<Icon name="arrow" size={17} /></a>)}</div> : <><p>{t.contactSub}</p><span className="contact-pending"><span className="status-dot" />{t.contactPending}</span></>}</div><span className="contact-decoration" aria-hidden="true">↗</span></div></section>
    </main>
    <footer className="footer shell"><a className="wordmark" href="#home"><span className="brand-mark">H<span>D</span></span><span>HECTOR DALONSO</span></a><span>© {new Date().getFullYear()} HD</span></footer>
    {selected && <ProjectDialog project={selected} language={language} onClose={() => setSelected(null)} />}
  </>;
}
