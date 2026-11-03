export type Language = 'pt' | 'en';
export type Localized = Record<Language, string>;
export type Project = {
  id: string; title: Localized; category: Localized; description: Localized;
  details: Localized; image?: string; imageAlt?: Localized; imageCaption?: Localized; tags: string[]; sourceUrl?: string; liveUrl?: string;
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
  category: { pt: 'IA / Agente e dashboard', en: 'AI / Agent and dashboard' },
  description: {
    pt: 'Agente de IA que lê avaliações de restaurantes de delivery, aponta os problemas mais urgentes, monta um plano de ação e escreve uma resposta para cada cliente.',
    en: 'An AI agent that reads delivery-restaurant reviews, flags the most urgent problems, builds an action plan and drafts a reply for each customer.',
  },
  details: {
    pt: 'O problema: um restaurante em plataforma de delivery recebe dezenas de avaliações por semana, e ler uma por uma, achar o que se repete e responder cada cliente leva horas. O Pulso recebe as avaliações (texto colado ou CSV), classifica cada uma com IA por sentimento, tipo de problema (atraso, comida fria, pedido errado, embalagem, higiene e restrição alimentar, preço e porção, sabor, atendimento) e urgência, e mostra um painel com nota média, percentual de negativas, casos críticos e problemas mais citados. Em seguida gera um plano de ação, com higiene e restrição alimentar sempre em primeiro lugar, escreve uma resposta pública para cada avaliação e exporta tudo em CSV. Arquitetura: um único Cloudflare Worker serve o site e a API, que usa Cloudflare Workers AI (Llama 3.1 8B Instruct FP8). A IA não tem a palavra final: toda resposta do modelo passa por validação com regras. Categorias inventadas são descartadas, a urgência crítica só vale para higiene e alergia, a nota em estrelas decide o sentimento e o JSON do modelo é lido com tolerância; se o modelo responde fora do formato, a avaliação é classificada pelas regras. Sem o servidor de IA há um modo demonstração no navegador, e a interface avisa. Limites: o tempo economizado é uma estimativa (2 minutos por avaliação), não uma medição; as respostas sugeridas devem ser revisadas antes de publicar; o modo demonstração usa palavras-chave e é menos preciso; os textos são analisados e descartados, sem armazenamento, com limite de 60 avaliações por análise. Os dados de exemplo são 36 avaliações fictícias de um restaurante fictício. Projeto desenvolvido com apoio de ferramentas de IA e 11 testes automatizados das regras.',
    en: 'The problem: a restaurant on a delivery platform gets dozens of reviews a week, and reading them one by one, finding what repeats and replying to each customer takes hours. Pulso takes the reviews (pasted text or CSV), classifies each one with AI by sentiment, problem type (delay, cold food, wrong order, packaging, hygiene and dietary restriction, price and portion, taste, service) and urgency, and shows a dashboard with average rating, share of negative reviews, critical cases and most cited problems. It then builds an action plan, always putting hygiene and dietary restrictions first, drafts a public reply for each review and exports everything to CSV. Architecture: a single Cloudflare Worker serves the site and the API, which uses Cloudflare Workers AI (Llama 3.1 8B Instruct FP8). The AI does not have the final word: every model answer goes through rule-based validation. Invented categories are dropped, critical urgency applies only to hygiene and allergy, the star rating decides the sentiment, and the model’s JSON is parsed tolerantly; if the model answers in the wrong format, the review is classified by the rules. Without the AI server there is an in-browser demo mode, and the interface says so. Limits: the time saved is an estimate (2 minutes per review), not a measurement; suggested replies should be reviewed before publishing; demo mode uses keywords and is less accurate; texts are analysed and discarded, with no storage, and an analysis is capped at 60 reviews. The sample data is 36 fictional reviews from a fictional restaurant. Developed with AI assistance and 11 automated tests of the rules.',
  },
  tags: ['IA', 'Cloudflare Workers AI', 'JavaScript'],
  sourceUrl: 'https://github.com/HectorDalo/pulso',
  liveUrl: 'https://pulso-avaliacoes.hector-dalonso.workers.dev',
}, {
  id: 'prisma-studio',
  image: '/images/projects/prisma-studio.png',
  imageAlt: { pt: 'Galeria do Prisma Studio com um gato laranja, um vídeo, uma astronauta sem fundo e a imagem original', en: 'Prisma Studio gallery with an orange cat, a video, a background-removed astronaut and the original image' },
  imageCaption: { pt: 'Captura real do aplicativo, com imagens que ele mesmo gerou neste computador.', en: 'Real screenshot of the app, with images it generated on this computer.' },
  title: { pt: 'Prisma Studio · IA de imagem e vídeo no seu PC', en: 'Prisma Studio · Image and video AI on your PC' },
  category: { pt: 'Aplicativo desktop / IA local', en: 'Desktop app / Local AI' },
  description: {
    pt: 'Aplicativo para Windows que cria imagens e vídeos, remove fundos e amplia fotos com IA rodando no próprio computador, sem nuvem.',
    en: 'Windows app that creates images and videos, removes backgrounds and upscales photos with AI running on your own computer, with no cloud.',
  },
  details: {
    pt: 'O problema: ferramentas online de imagem com IA cobram, filtram, enviam seus textos para fora e muitas vezes entregam resultados ruins. Refiz um estúdio local do zero. Um lançador em C# (Prisma.exe) liga um servidor Node sem dependências, que controla o ComfyUI como motor e abre uma janela própria do aplicativo; ao fechar, tudo desliga e libera a placa de vídeo. O app cria imagens (Stable Diffusion XL e FLUX.1 schnell), vídeos de cerca de 2 segundos (LTX-Video, a partir de texto ou de uma imagem), remove fundo (BiRefNet), amplia até 4 vezes (Real-ESRGAN) e guarda tudo numa galeria local com favoritos. Dá para escrever em português: um modelo pequeno (Qwen2.5 1.5B), também local, traduz o texto para o inglês, que os modelos entendem melhor, e o usuário pode revisar a tradução. Medido numa RTX 2070 de 8 GB: imagem 1024 por 1024 em cerca de 50 s, vídeo em cerca de 45 s, remoção de fundo em 1,5 s. Limites: vídeos são curtos e de resolução média; modelos maiores não cabem em 8 GB; a anatomia de mãos e corpos ainda falha às vezes; precisa de GPU NVIDIA, bastante disco (uns 40 GB de modelos) e memória virtual grande. O app só escuta em 127.0.0.1. Os modelos e o motor não ficam no repositório: um script baixa tudo e confere o SHA-256. As licenças de cada modelo estão documentadas. Projeto desenvolvido com apoio de ferramentas de IA.',
    en: 'The problem: online AI image tools charge, filter, send your prompts elsewhere and often give poor results. I rebuilt a local studio from scratch. A C# launcher (Prisma.exe) starts a dependency-free Node server that drives ComfyUI as the engine and opens the app in its own window; on close, everything shuts down and frees the graphics card. The app creates images (Stable Diffusion XL and FLUX.1 schnell), videos of about 2 seconds (LTX-Video, from text or from an image), removes backgrounds (BiRefNet), upscales up to 4 times (Real-ESRGAN) and keeps everything in a local gallery with favorites. You can write in Portuguese: a small local model (Qwen2.5 1.5B) translates the text to English, which the models understand better, and the user can review the translation. Measured on an 8 GB RTX 2070: a 1024 by 1024 image in about 50 s, a video in about 45 s, background removal in 1.5 s. Limits: videos are short and medium resolution; larger models do not fit in 8 GB; hand and body anatomy still fails sometimes; it needs an NVIDIA GPU, plenty of disk (about 40 GB of models) and a large paging file. The app only listens on 127.0.0.1. Models and engine are not in the repository: a script downloads everything and checks the SHA-256. Each model license is documented. Developed with AI assistance.',
  },
  tags: ['IA', 'C#', 'Node.js', 'ComfyUI'],
  sourceUrl: 'https://github.com/HectorDalo/prisma-studio',
}, {
  id: 'portfolio',
  image: '/images/projects/portfolio.jpg',
  imageAlt: { pt: 'Página inicial do portfólio com a assistente Elara, o campo de conversa e o menu', en: 'Portfolio home page with the Elara assistant, the chat field and the menu' },
  imageCaption: { pt: 'Interface real do portfólio, com a assistente Elara. Toque na imagem para ampliar.', en: 'Actual portfolio interface, with the Elara assistant. Tap the image to enlarge.' },
  title: { pt: 'Portfólio · Uma nova perspectiva', en: 'Portfolio · A new perspective' },
  category: { pt: 'Web / Projeto em desenvolvimento', en: 'Web / Project in development' },
  description: {
    pt: 'O site que você está explorando. Identidade cinematográfica, navegação bilíngue e uma interface pensada para evoluir.',
    en: 'The site you are exploring. A cinematic identity, bilingual navigation and an interface designed to evolve.',
  },
  details: {
    pt: 'O objetivo: apresentar meus projetos com identidade própria e uma assistente virtual, a Elara, que conversa com quem visita o site por texto ou voz. O site é feito em React 19 e TypeScript com Vite, com layout responsivo, tradução PT/EN, acessibilidade e uma camada visual opcional em Three.js. A assistente é um avatar animado com rosto 3D, controles faciais e olhar interativo no computador, e um retrato estático no celular. O chat usa Cloudflare Workers AI (Llama) em um Worker do Cloudflare Pages. O microfone envia o áudio para transcrição com Whisper, e a voz neural (Kokoro) é gerada no próprio aparelho depois de um download inicial, com WebGPU no computador e CPU no celular, e com legendas orientadas pelo áudio. As conversas ficam só na memória da página, sem histórico, e há um limite de 20 requisições por minuto por IP contra abuso. Projetos e fatos profissionais ficam em arquivos do próprio site; o banco de dados ainda não está conectado, e o projeto inclui um esqueleto FastAPI e uma migração Supabase para a próxima etapa. Tem 128 testes automatizados. O ditado alternativo depende do suporte do navegador. Projeto desenvolvido com apoio de ferramentas de IA.',
    en: 'The goal: to present my projects with their own identity and a virtual assistant, Elara, who talks with visitors by text or voice. The site is built with React 19 and TypeScript on Vite, with a responsive layout, PT/EN translation, accessibility and an optional Three.js visual layer. The assistant is an animated avatar with a 3D face, facial controls and interactive gaze on a computer, and a static portrait on a phone. Chat uses Cloudflare Workers AI (Llama) in a Cloudflare Pages Worker. The microphone sends audio for transcription with Whisper, and the neural voice (Kokoro) is generated on the visitor’s own device after an initial download, with WebGPU on a computer and CPU on a phone, and audio-timed captions. Conversations stay only in the page memory, with no history, and there is a limit of 20 requests per minute per IP against abuse. Projects and professional facts live in files of the site itself; the database is not connected yet, and the project includes a FastAPI scaffold and a Supabase migration for the next stage. It has 128 automated tests. Alternative browser dictation depends on browser support. Developed with AI assistance.',
  },
  tags: ['React', 'TypeScript', 'CSS', 'Three.js'],
  sourceUrl: 'https://github.com/HectorDalo/Projetos/tree/main/portfolio-elara',
  liveUrl: 'https://hector-dalonso.pages.dev',
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
    pt: 'O objetivo: cadastrar e consultar clientes (nome, telefone, e-mail e endereço) em um computador, sem internet. O projeto evoluiu de um cadastro inicial em JSON para uma edição local com banco SQLite, e importa os registros antigos (a importação é cancelada por inteiro se houver telefone ou e-mail repetido). Controle de acesso: login com perfis de administrador e operador, permissões verificadas no serviço de dados e não só nos botões, senhas guardadas com PBKDF2-HMAC-SHA256 e salt individual, bloqueio de 5 minutos após cinco tentativas erradas e bloqueio da sessão após 15 minutos sem uso. Rastreio e segurança dos dados: histórico dos últimos 500 eventos, lixeira para recuperar exclusões, exportação CSV só para administrador e backups consistentes, com cópia automática antes da primeira alteração do dia e uma segunda cópia opcional em outra pasta. A busca de CEP é opcional (ViaCEP, que recebe só o CEP). É entregue como executável portátil do Windows (versão 3.0.1) que dispensa instalar Python, sem instalador nem assinatura digital. Limites: atende uso local em um computador, a versão para equipes com servidor não está incluída, o banco e os backups não são criptografados pelo aplicativo e não há vendas, estoque ou notas fiscais. Está em validação e não possui certificação de segurança ou conformidade automática. Projeto desenvolvido com apoio de ferramentas de IA e testes automatizados.',
    en: 'The goal: to register and look up customers (name, phone, email and address) on one computer, offline. The project evolved from an initial JSON register into a local edition with a SQLite database, and it imports the legacy records (the import is cancelled entirely if a phone or email is repeated). Access control: login with administrator and operator roles, permissions checked in the data service and not only in the buttons, passwords stored with PBKDF2-HMAC-SHA256 and an individual salt, a 5-minute lock after five wrong attempts and a session lock after 15 idle minutes. Traceability and data safety: a history of the last 500 events, a recycle bin to recover deletions, CSV export for administrators only, and consistent backups, with an automatic copy before the first change of the day and an optional second copy in another folder. Postal-code lookup is optional (ViaCEP, which receives only the code). It ships as a portable Windows executable (version 3.0.1) that needs no Python installation, with no installer or digital signature. Limits: it supports local use on one computer, a server-based team edition is not included, the database and backups are not encrypted by the application and there are no sales, stock or invoices. It is undergoing validation and does not claim security certification or automatic regulatory compliance. Developed with AI assistance and automated tests.',
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
