import type { Language } from '../content/profile';
import { professional } from '../content/professional';

export function ProfessionalHistory({language}:{language:Language}) {
  const pt=language==='pt';
  return <section className="section shell professional-section" aria-labelledby="professional-title">
    <div className="section-heading"><p className="eyebrow">{pt?'TRAJETÓRIA':'BACKGROUND'}</p><h2 id="professional-title">{pt?'Experiência que se transforma em aprendizado.':'Experience that becomes learning.'}</h2><p className="muted">{pt?'Da resolução de problemas no dia a dia ao desenvolvimento de software.':'From everyday problem solving to software development.'}</p></div>
    <div className="professional-columns">
      <div><h3>{pt?'Experiência profissional':'Work experience'}</h3><ol className="experience-list">{professional.experience.map(item=><li key={item.organization}><span className="eyebrow">{item.organization}</span><h4>{item.role[language]}</h4><p className="experience-period">{item.status[language]}</p><ul>{item.activities[language].filter(activity=>!activity.includes('CLT')&&!activity.includes('confirmed direct employment')).map(activity=><li key={activity}>{activity}</li>)}</ul></li>)}</ol></div>
      <div className="learning-column"><h3>{pt?'Cursos complementares':'Additional courses'}</h3><ul className="course-list">{professional.courses.map(course=><li key={course.title}><strong>{course.title}</strong><span>{course.institution}{/^\d{4}$/.test(course.year)?` · ${course.year}`:''}</span></li>)}</ul><div className="learning-note glass"><span className="eyebrow">{pt?'APRENDIZADO CONTÍNUO':'CONTINUOUS LEARNING'}</span><h4>{pt?'C#, .NET e Blazor':'C#, .NET and Blazor'}</h4><p>{pt?'Estudos práticos no exercício Sancall AI, explorando leitura de arquivos, JSON e lógica de consulta. Um projeto de aprendizado em evolução.':'Practical study through the Sancall AI exercise, exploring file reading, JSON and query logic. A learning project in progress.'}</p></div></div>
    </div>
  </section>;
}
