export type Language = 'pt' | 'en';
export type Localized = Record<Language, string>;
export type Project = {
  id: string; title: Localized; category: Localized; description: Localized;
  details: Localized; image?: string; imageAlt?: Localized; tags: string[]; sourceUrl?: string; liveUrl?: string;
};

// Only confirmed facts belong here. The reference image is visual inspiration,
// not evidence of education, previous employment, proficiency, or project history.
export const profile = {
  name: 'Hector Dalonso',
  role: { pt: 'Estudante de Ciência da Computação', en: 'Computer Science student' },
  education: { institution: 'Centro Universitário ENIAC', course: { pt: 'Ciência da Computação', en: 'Computer Science' }, semester: 2 },
  skills: ['IA aplicada / Applied AI', 'Python', 'C', 'Bancos de dados / Databases', 'HTML', 'JavaScript'],
  introduction: {
    pt: 'Estudante de Ciência da Computação, apaixonado por tecnologia, desenvolvimento de software e criação de soluções digitais. Estou aprimorando meus conhecimentos em inteligência artificial aplicada na prática.',
    en: 'Computer Science student with a passion for technology, software development and creating digital solutions. I am improving my knowledge of applied artificial intelligence through practice.',
  },
  about: {
    pt: 'Sou estudante de Ciência da Computação no Centro Universitário ENIAC, atualmente no segundo semestre.\n\nDurante minha formação, venho desenvolvendo conhecimentos em programação com Python e C, bancos de dados e desenvolvimento web com HTML e JavaScript.\n\nTenho interesse em compreender como as tecnologias funcionam e como utilizá-las para desenvolver soluções práticas.\n\nTenho experiência de estágio no ENIAC, com atividades de desenvolvimento web, automação, apoio a soluções Low Code e colaboração com a equipe dos laboratórios. Também venho ampliando meus estudos com C#, .NET, Blazor e JSON no exercício Sancall AI.\n\nBusco uma oportunidade de estágio em tecnologia com foco em desenvolvimento de software e soluções digitais.',
    en: 'I am a second-semester Computer Science student at Centro Universitário ENIAC.\n\nDuring my studies, I have been developing knowledge of programming with Python and C, databases, and web development with HTML and JavaScript.\n\nI am interested in understanding how technologies work and using them to develop practical solutions.\n\nI have internship experience at ENIAC, involving web development, automation, support for Low Code solutions and collaboration with the laboratory team. I am also expanding my studies with C#, .NET, Blazor and JSON through the Sancall AI exercise.\n\nI am seeking a technology internship focused on software development and digital solutions.',
  },
  // Add only your actual public contact links, e.g. email, github and linkedin.
  contacts: [
    { label: 'WhatsApp', url: 'https://wa.me/5511979934334' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/hdalonso/' },
    { label: 'GitHub', url: 'https://github.com/HectorDalo' },
  ] as { label: string; url: string }[],
};

export const projects: Project[] = [{
  id: 'portfolio',
  title: { pt: 'Portfólio · Uma nova perspectiva', en: 'Portfolio · A new perspective' },
  category: { pt: 'Web / Projeto em desenvolvimento', en: 'Web / Project in development' },
  description: {
    pt: 'O site que você está explorando. Identidade cinematográfica, navegação bilíngue e uma interface pensada para evoluir.',
    en: 'The site you are exploring. A cinematic identity, bilingual navigation and an interface designed to evolve.',
  },
  details: {
    pt: 'Implementação em React e TypeScript, com layout responsivo, tradução PT/EN, acessibilidade e camada visual opcional em Three.js. A assistente é um avatar animado com rosto frontal 3D, controles faciais e olhar interativo. O chat usa Cloudflare Workers AI no backend. A voz neural opcional é gerada no aparelho após um download inicial, com legendas orientadas pelo áudio e movimentos simplificados de boca. A fala usa voz neural por padrão, com opção leve do navegador. O ditado alternativo depende do suporte do navegador. O banco de dados ainda não está conectado. O projeto inclui um esqueleto FastAPI e uma migração Supabase para a próxima etapa.',
    en: 'Built with React and TypeScript, featuring a responsive layout, PT/EN translation, accessibility and an optional Three.js visual layer. The assistant is an animated avatar with a frontal 3D face, facial controls and interactive gaze. Chat uses Cloudflare Workers AI on the backend. Optional neural speech is generated on the visitor’s device after an initial download, with audio-timed captions and simplified mouth shapes. Speech defaults to neural voice, with a lightweight browser option. Alternative browser dictation depends on browser support. The database is not connected yet. The project includes a FastAPI scaffold and a Supabase migration for the next stage.',
  },
  tags: ['React', 'TypeScript', 'CSS', 'Three.js'],
}, {
  id: 'cadastro-clientes',
  image: '/images/projects/hd-clientes-local.png',
  imageAlt: {pt:'Captura real do HD Clientes Local 3.0.1, com dados fictícios de demonstração',en:'Actual HD Clientes Local 3.0.1 screenshot using fictional demonstration data'},
  title: { pt: 'HD Clientes · Edição Local', en: 'HD Clientes · Local Edition' },
  category: { pt: 'Python / Aplicação desktop', en: 'Python / Desktop application' },
  description: {
    pt: 'Aplicação desktop em Python com SQLite, usuários, permissões, histórico, lixeira e backups. Executável Windows em validação.',
    en: 'A Python desktop application with SQLite, user roles, activity history, a recycle bin and backups. Windows executable undergoing validation.',
  },
  details: {
    pt: 'Evolução do cadastro inicial em JSON para uma aplicação local com banco SQLite, login de administrador e operador, verificação de permissões, histórico de alterações, lixeira, exportação CSV e backups com segunda cópia configurável. A interface reúne nome, telefone, e-mail e endereço, com consulta opcional de CEP. Inclui importação dos registros antigos e executável Windows que dispensa instalar Python. Projeto desenvolvido com apoio de ferramentas de IA e testes automatizados. A edição atual atende uso local em um computador; a versão para equipes com servidor não está incluída. Está em validação e não possui certificação de segurança ou conformidade automática.',
    en: 'An evolution from the original JSON customer register into a local application with SQLite, administrator and operator accounts, permission checks, activity history, a recycle bin, CSV export and configurable backup copies. The interface handles names, phones, emails and addresses, with optional Brazilian postal-code lookup. It imports legacy records and includes a standalone Windows executable. Developed with AI assistance and automated tests. This edition supports local use on one computer; a server-based team edition is not included. It is undergoing validation and does not claim security certification or automatic regulatory compliance.',
  },
  tags: ['Python', 'Tkinter', 'SQLite'],
  sourceUrl: 'https://github.com/HectorDalo/Projetos/tree/main/Projetos/Cadastro-Clientes',
}];

// These describe this website's implementation, never the owner's proficiency.
export const technologies = [
  { name: 'React', mark: '⚛', color: '#72def7', stage: 'built' },
  { name: 'TypeScript', mark: 'TS', color: '#65afff', stage: 'built' },
  { name: 'Three.js', mark: '△', color: '#cad9ef', stage: 'built' },
  { name: 'FastAPI', mark: 'ϟ', color: '#4fe0c1', stage: 'ready' },
  { name: 'Supabase', mark: '↯', color: '#71e8ac', stage: 'ready' },
  { name: 'Cloudflare', mark: '☁', color: '#ffb16a', stage: 'built' },
] as const;
