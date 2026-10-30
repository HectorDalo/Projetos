import type { Language } from '../content/profile';
import { skillAssessments } from '../content/skills';
export function Skills({language}:{language:Language}) {
 const pt=language==='pt';
 return <section id="skills" className="section shell skills-section" aria-labelledby="skills-title">
  <div className="section-heading"><p className="eyebrow">{pt?'APRENDIZADO EM CONTINUIDADE':'CONTINUED LEARNING'}</p><h2 id="skills-title">{pt?'Habilidades':'Skills'}</h2><p className="muted">{pt?'Níveis orientativos, com base nos estudos, experiências relatadas e projetos feitos com apoio de IA. O foco agora é consolidar fundamentos e ganhar autonomia.':'Indicative levels based on studies, reported experience and projects built with AI assistance. My current focus is strengthening fundamentals and becoming more independent.'}</p></div>
  <div className="skills-grid">{skillAssessments.map(skill=><article className="skill-card glass" key={skill.name}><h3>{skill.name}</h3><span className="skill-level">{skill.level[language]}</span><p>{skill.evidence[language]}</p><p className="skill-focus"><strong>{pt?'Próximo foco: ':'Next focus: '}</strong>{skill.focus[language]}</p></article>)}</div>
 </section>;
}
