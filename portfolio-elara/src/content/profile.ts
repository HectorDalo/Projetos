export type Language = 'pt' | 'en';
export type Localized = Record<Language, string>;
export type Project = {
  id: string; title: Localized; category: Localized; description: Localized;
  details: Localized; image?: string; imageAlt?: Localized; imageCaption?: Localized; tags: string[]; status: 'done' | 'in-progress'; sourceUrl?: string; liveUrl?: string;
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
  id: 'pulso',
  image: '/images/projects/pulso.png',
  imageAlt: { pt: 'Painel do Pulso com indicadores, problemas mais citados e plano de ação, usando avaliações fictícias de demonstração', en: 'Pulso dashboard with indicators, most cited problems and an action plan, using fictional demonstration reviews' },
  title: { pt: 'Pulso · Avaliações viram ações', en: 'Pulso · Reviews into action' },
  category: { pt: 'IA / Agente e dashboard / Concluído', en: 'AI / Agent and dashboard / Finished' },
  description: {
    pt: 'Lê as avaliações de um restaurante de delivery e mostra o que mais incomoda os clientes.',
    en: 'Reads a delivery restaurant’s reviews and shows what bothers customers the most.',
  },
  details: {
    pt: 'Um restaurante de delivery recebe dezenas de avaliações por semana, e ler uma por uma leva horas. Criei o Pulso para fazer essa leitura: ele separa o que é elogio do que é problema (atraso, comida fria, pedido errado, embalagem...), mostra o que mais se repete e sugere um plano de ação e uma resposta para cada cliente. Usa a IA da Cloudflare, mas as regras do meu código têm a palavra final: higiene e alergia sempre vêm em primeiro lugar. As avaliações do exemplo são fictícias e as respostas sugeridas precisam ser revisadas antes de publicar. Fiz com apoio de ferramentas de IA.',
    en: 'A delivery restaurant gets dozens of reviews a week, and reading them one by one takes hours. I built Pulso to do that reading: it separates praise from problems (delays, cold food, wrong orders, packaging...), shows what repeats most and suggests an action plan and a reply for each customer. It uses Cloudflare’s AI, but the rules in my code have the final word: hygiene and allergies always come first. The sample reviews are fictional and the suggested replies need a review before being published. Built with the help of AI tools.',
  },
  status: 'done',
  tags: ['IA', 'JavaScript', 'HTML', 'CSS', 'Cloudflare Workers', 'Workers AI (Llama)', 'Wrangler', 'Node.js'],
  sourceUrl: 'https://github.com/HectorDalo/pulso',
  liveUrl: 'https://pulso-avaliacoes.hector-dalonso.workers.dev',
}, {
  id: 'prisma-studio',
  image: '/images/projects/prisma-studio.png',
  imageAlt: { pt: 'Galeria do Prisma Studio com um gato laranja, um vídeo, uma astronauta sem fundo e a imagem original', en: 'Prisma Studio gallery with an orange cat, a video, a background-removed astronaut and the original image' },
  imageCaption: { pt: 'Captura real do aplicativo, com imagens que ele mesmo gerou neste computador.', en: 'Real screenshot of the app, with images it generated on this computer.' },
  title: { pt: 'Prisma Studio · IA de imagem e vídeo no seu PC', en: 'Prisma Studio · Image and video AI on your PC' },
  category: { pt: 'Aplicativo desktop / IA local / Em andamento', en: 'Desktop app / Local AI / In progress' },
  description: {
    pt: 'Aplicativo para Windows que cria imagens e vídeos com IA direto no computador, sem nuvem.',
    en: 'Windows app that creates images and videos with AI right on your computer, with no cloud.',
  },
  details: {
    pt: 'Eu queria um estúdio de imagem e vídeo com IA que rodasse no meu próprio computador, sem pagar assinatura e sem mandar meus textos para a internet. O Prisma Studio faz isso: cria imagens e vídeos curtos, tira o fundo de fotos, amplia imagens e guarda tudo numa galeria. Dá para escrever em português, porque um modelo pequeno traduz o texto antes de gerar. Ainda está em evolução: a qualidade das imagens nem sempre é a que eu quero, os vídeos são curtos e ele só funciona em computador com placa de vídeo NVIDIA. Fiz com apoio de ferramentas de IA.',
    en: 'I wanted an AI image and video studio that ran on my own computer, with no subscription and without sending my prompts to the internet. Prisma Studio does that: it creates images and short videos, removes photo backgrounds, upscales images and keeps everything in a gallery. You can write in Portuguese, because a small model translates the text before generating. It is still evolving: image quality is not always what I want, videos are short and it only works on a computer with an NVIDIA graphics card. Built with the help of AI tools.',
  },
  status: 'in-progress',
  tags: ['IA', 'C#', 'Node.js', 'JavaScript', 'HTML', 'CSS', 'Python', 'ComfyUI', 'Stable Diffusion XL', 'FLUX', 'LTX-Video', 'BiRefNet', 'Real-ESRGAN', 'Qwen2.5'],
  sourceUrl: 'https://github.com/HectorDalo/prisma-studio',
}, {
  id: 'portfolio',
  image: '/images/projects/portfolio.jpg',
  imageAlt: { pt: 'Página inicial do portfólio com a assistente Elara, o campo de conversa e o menu', en: 'Portfolio home page with the Elara assistant, the chat field and the menu' },
  imageCaption: { pt: 'Interface real do portfólio, com a assistente Elara. Toque na imagem para ampliar.', en: 'Actual portfolio interface, with the Elara assistant. Tap the image to enlarge.' },
  title: { pt: 'Portfólio · Uma nova perspectiva', en: 'Portfolio · A new perspective' },
  category: { pt: 'Web / Em andamento', en: 'Web / In progress' },
  description: {
    pt: 'O site que você está explorando, com a Elara, uma assistente que conversa por texto ou voz.',
    en: 'The site you are exploring, with Elara, an assistant that talks by text or voice.',
  },
  details: {
    pt: 'Queria um portfólio com identidade própria e alguém para receber quem visita. Por isso criei a Elara, uma assistente virtual que conversa por texto ou por voz e responde sobre mim e sobre meus projetos. O site está em português e inglês e funciona bem no celular. Ainda está em construção: o banco de dados para guardar os projetos não está conectado, hoje eles ficam em arquivos do próprio site. Fiz com apoio de ferramentas de IA.',
    en: 'I wanted a portfolio with its own identity and someone to welcome visitors. So I created Elara, a virtual assistant that talks by text or voice and answers about me and my projects. The site is in Portuguese and English and works well on phones. It is still being built: the database to store projects is not connected yet, so they live in files inside the site. Built with the help of AI tools.',
  },
  status: 'in-progress',
  tags: ['React', 'TypeScript', 'Vite', 'CSS', 'HTML', 'Three.js', 'Cloudflare Pages', 'Cloudflare Workers', 'Workers AI (Llama)', 'Whisper', 'Kokoro (voz)', 'WebGPU', 'Vitest', 'pnpm', 'FastAPI (preparado)', 'Supabase (preparado)'],
  sourceUrl: 'https://github.com/HectorDalo/Projetos/tree/main/portfolio-elara',
  liveUrl: 'https://hector-dalonso.pages.dev',
}, {
  id: 'cadastro-clientes',
  image: '/images/projects/hd-clientes-local.png',
  imageAlt: {pt:'Captura real do HD Clientes Local 3.0.1, com dados fictícios de demonstração',en:'Actual HD Clientes Local 3.0.1 screenshot using fictional demonstration data'},
  title: { pt: 'HD Clientes · Edição Local', en: 'HD Clientes · Local Edition' },
  category: { pt: 'Python / Aplicação desktop / Em andamento', en: 'Python / Desktop application / In progress' },
  description: {
    pt: 'Programa de Windows em Python para cadastrar e consultar clientes, sem internet.',
    en: 'A Windows program in Python to register and look up customers, offline.',
  },
  details: {
    pt: 'Começou como um cadastro simples de clientes em Python e foi crescendo. Hoje o HD Clientes guarda nome, telefone, e-mail e endereço num banco local, tem login com perfis de administrador e operador, histórico de alterações, lixeira para recuperar o que foi apagado e cópias de segurança automáticas. Roda sem internet e sem instalar o Python. Ainda estou validando a versão para Windows, e ele serve para um computador só: não tem versão para equipes, vendas ou notas fiscais. Fiz com apoio de ferramentas de IA e testes automáticos.',
    en: 'It started as a simple customer register in Python and kept growing. Today HD Clientes stores name, phone, email and address in a local database, has login with administrator and operator roles, a change history, a recycle bin to recover deleted records and automatic backups. It runs offline and without installing Python. I am still validating the Windows version, and it is meant for a single computer: there is no team edition, sales or invoicing. Built with the help of AI tools and automated tests.',
  },
  status: 'in-progress',
  tags: ['Python', 'Tkinter', 'SQLite', 'PyInstaller', 'unittest', 'ViaCEP'],
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
