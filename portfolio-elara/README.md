# Portfólio HD · Hector Dalonso + Elara

Portfólio pessoal com interface azul/ciano, marca HD e a Elara, assistente virtual que conversa com visitantes por texto ou voz.

- Produção: https://hector-dalonso.pages.dev/ (Cloudflare Pages, projeto `hector-dalonso`)
- Repositório: https://github.com/HectorDalo/Projetos — esta fonte fica em `portfolio-elara/`

## Arquitetura

```text
Navegador
 ├─ React 19 + TypeScript + Vite; Three.js para o rosto no PC; retrato estático no celular
 ├─ POST /api/chat ───────► Worker do Pages (dist/_worker.js) ─► Cloudflare Workers AI (Llama)
 ├─ microfone → WAV ──────► POST /api/transcribe ─► Workers AI (Whisper)
 └─ resposta → voz Kokoro no próprio aparelho (Web Worker; WebGPU no PC, CPU no celular)
```

Não há backend separado nem banco de dados: projetos e fatos profissionais ficam em `src/content/` e entram no build. As conversas ficam só na memória da página.

## Rodar e testar

Node.js >= 22.12 e pnpm 11.25:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev        # só o frontend; o chat local precisa da API publicada ou do Wrangler
```

## Publicar

```sh
pnpm build
pnpm dlx wrangler@4 login
pnpm dlx wrangler@4 pages deploy dist --project-name hector-dalonso
```

O projeto Pages precisa do binding **Workers AI** chamado `AI` (Settings → Bindings). Variáveis opcionais no painel: `CHAT_MODEL`, `PT_CHAT_MODEL`, `GITHUB_PROFILE_SYNC=true`, `ALLOWED_ORIGINS`. Depois de publicar, confira `/release.json`, `/api/capabilities` e uma pergunta real em PT e EN.

## Voz no celular

- Celular e tablet geram a voz na CPU (modelo q8, cerca de 90 MB). O PC usa WebGPU (fp32, cerca de 330 MB) quando disponível.
- O primeiro trecho é curto para a fala começar logo. Os seguintes são agendados no relógio de áudio, sem pausas entre trechos.
- Se o aparelho gerar a voz mais devagar do que ela toca, a fala espera até 3,5 s antes de começar, para não parar no meio.
- `?debug` no endereço mostra o diagnóstico: isolamento, GPU/CPU, threads, tempo do chat, velocidade (RTF) e tempo até o primeiro som. `?voz=gpu` e `?voz=cpu` forçam o modo.
- O cabeçalho `Cross-Origin-Embedder-Policy: require-corp` libera várias threads também no Safari/iPhone.

## Conversa

A tela mostra a última troca em balões: a pergunta do visitante e a resposta da Elara, com "digitando…" enquanto ela pensa. Quando chega a próxima pergunta, a troca anterior some com uma animação. Há um limite anti-abuso de 20 requisições por minuto por IP em `/api/chat` e `/api/transcribe`, em `worker/rateLimit.ts`. Uma pessoa conversando não chega nele.

## Editar conteúdo

- `src/content/profile.ts`, `professional.ts`, `skills.ts`: projetos, trajetória e habilidades. O Worker usa os mesmos arquivos como contexto da Elara; republique após editar.
- `node scripts/export-public-profile.mjs` gera `elara-profile.json`. Com `GITHUB_PROFILE_SYNC=true`, o Worker lê esse arquivo em `portfolio-elara/elara-profile.json` na branch `main`, para atualizar fatos sem novo deploy.
- `public/release.json`: troque a versão a cada publicação.

## Arquivos principais

| Arquivo | Função |
|---|---|
| `src/components/AssistantPanel.tsx` | Conversa, microfone, voz, erros, diagnóstico |
| `src/components/SpeechCaption.tsx` | Balões do visitante e da Elara, legenda destacada |
| `src/hooks/useNaturalVoice.ts` | Fila de áudio sem lacunas, espera adaptativa, métricas |
| `src/neural/neural.worker.ts`, `device.ts`, `timing.ts` | Síntese Kokoro, escolha CPU/GPU, divisão em trechos |
| `worker/index.ts`, `rateLimit.ts`, `transcribe.ts`, `publicProfile.ts` | API, limites, transcrição e perfil remoto |
| `scripts/build-worker.mjs` | Gera `dist/_worker.js` e `dist/_routes.json` |

Histórico das versões anteriores: `docs/historico/`. Licenças de terceiros: Kokoro e Transformers.js (Apache-2.0), ephone (GPL-3.0-or-later); veja `docs/NATURAL_VOICE.md`.
