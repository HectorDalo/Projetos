# Voz neural gratuita da Elara

A voz natural é opcional e carrega somente após o visitante clicar em **Voz natural**. O primeiro uso transfere aproximadamente 100–450 MB de bibliotecas e modelo; o navegador tenta manter os arquivos em cache. O processamento é feito no aparelho do visitante, em Web Worker, sem servidor de voz e sem chave no navegador. O chat de IA continua a usar o backend Cloudflare Workers AI.

## Componentes

- Transformers.js 3.5.1, bundle de navegador com ONNX incluído, carregado do jsDelivr.
- Kokoro 82M ONNX fp32 na GPU ou q8 na CPU, com saída `pred_dur`, revisão `02ff6fe` de `shawnahmed/Kokoro-82M-v1.0-ONNX-timestamped` no Hugging Face.
- Voz feminina `pf_dora` em português e `af_heart` em inglês, estilos do repositório `onnx-community/Kokoro-82M-v1.0-ONNX`.
- ephone 1.0.2 com pacotes de pronúncia `roa` (inclui pt-BR) e `en_us`.
- Reprodução real por Web Audio. O relógio do áudio determina a palavra destacada. As durações do modelo orientam as formas de boca; o volume efetivo controla a intensidade.

A voz é uma aproximação disponível em modelo aberto. Não foi clonada a voz do ChatGPT. Não há garantia de sotaque paulista exato, emoção melancólica ou identidade vocal idêntica entre idiomas. O ritmo é ajustado para 0,96. A qualidade e a velocidade dependem do modelo e do aparelho; aparelhos mais lentos podem demorar para preparar cada trecho.

## Controles e falhas

Ativar/desativar áudio, parar fala e ouvir novamente uma resposta. Não há áudio automático ao abrir a página. A voz básica do navegador continua como alternativa **explicitamente selecionada**. Falha da voz neural exibe erro e desativa o estado de voz; não troca silenciosamente por voz básica.

Legendas aparecem em um balão holográfico com palavra destacada e uma pequena nave. Apenas a resposta atual fica no balão, com rolagem para texto longo e uma cópia acessível a leitores de tela. Não há histórico visual. O compositor mantém tamanho fixo. A articulação visual usa um conjunto simplificado de deformações; não representa todos os fonemas com precisão de captura facial.

O ditado usa SpeechRecognition quando disponível, após clique e permissão. Pode usar serviços do navegador; o botão de microfone inicia o modo conversa: uma frase final transcrita é enviada automaticamente, a Elara responde e o microfone volta a ouvir após o áudio terminar. Resultados parciais não são enviados. Encerrar, trocar de idioma ou ocultar a aba interrompe a sessão e limpa o contexto em memória. Nenhum microfone é aberto automaticamente.

O cache não é garantia de funcionamento offline: o site ainda pode precisar das bibliotecas, estilos de voz e do backend de conversa. A conexão aos domínios jsDelivr e Hugging Face deve estar disponível no primeiro uso. Nenhuma conta nesses serviços é exigida para baixar estes recursos públicos.

## Fontes e licenças

- [Transformers.js](https://github.com/huggingface/transformers.js/tree/3.5.1): Apache-2.0.
- [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) e [exportação com durações](https://huggingface.co/shawnahmed/Kokoro-82M-v1.0-ONNX-timestamped): Apache-2.0.
- [ephone / código-fonte e licença](https://github.com/sjmik/ephone-js): GPL-3.0-or-later, derivado de eSpeak NG. Preservar seus avisos e requisitos ao redistribuir esses componentes; o código correspondente está disponível no repositório do autor.

Os recursos são baixados de suas distribuições públicas; os pesos e runtimes não estão incluídos no ZIP do portfólio. O projeto entrega o código de integração. Não use um serviço pago nem acrescente uma chave a variáveis `VITE_*` para esta configuração.


No modo conversa, a escuta e a fala alternam por turnos; não há processamento simultâneo de fala do visitante e resposta da Elara. A reativação da escuta espera o fim da preparação de todos os trechos de áudio, reduzindo o risco de transcrever a própria resposta. O botão Parar fala permite interromper a resposta. O reconhecimento depende das permissões e compatibilidade do navegador.


## Espera e sincronização

O primeiro trecho é limitado a aproximadamente 64 caracteres e os seguintes a 130, preservando os offsets de palavras. Isso permite começar a síntese/reprodução com um trecho menor. A legenda falada não é antecipada antes do primeiro áudio; durante espera entre trechos, é mantido apenas o texto já pronunciado. O relógio de Web Audio continua sendo a referência de sincronização.

A síntese gratuita no aparelho ainda tem latência: download inicial, compilação e geração podem levar segundos, conforme hardware/navegador. Não é um serviço de voz bidirecional de baixa latência. `data-audio-start-ms` no compositor mede o tempo real entre a solicitação de voz e o início do primeiro áudio, sem guardar conteúdo de conversa.


O documento principal envia COOP same-origin e COEP require-corp (o Safari não suporta credentialless; require-corp libera SharedArrayBuffer também no iPhone) para permitir SharedArrayBuffer onde há suporte. O motor solicita até quatro threads (metade dos processadores lógicos), com fallback para uma thread se o navegador não oferecer isolamento/memória compartilhada. Os recursos externos são públicos e não dependem de cookies. Referência de runtime: https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html#envwasmnumthreads.


Após a escolha do proprietário pela versão maior, a aplicação procura um adaptador WebGPU de alto desempenho. Quando disponível, carrega a variante fp32 recomendada pelo projeto Kokoro para GPU (aproximadamente 330 MB de pesos). Sem adaptador, falha de inicialização ou erro de inferência na GPU, retorna à variante q8 na CPU. O primeiro uso pode transferir até cerca de 450 MB se ambos precisarem ser baixados. A inferência acelerada não elimina o tempo da resposta de IA nem garante tempo instantâneo em todos os aparelhos.


## Atualização 2026-10-30 (celular)

- Celular/tablet: a voz roda na CPU (WASM q8, ~90 MB) por padrão em vez de WebGPU fp32 (~330 MB). `?voz=gpu` ou `?voz=cpu` força a escolha para medição.
- Na CPU, o primeiro trecho tem até 60 caracteres (PT) e termina em pontuação quando possível; o PC mantém a divisão aprovada.
- Reprodução sem lacunas: o próximo trecho é agendado no relógio do AudioContext para começar exatamente quando o atual termina.
- Espera inicial adaptativa: com a velocidade medida no primeiro trecho, a fala pode começar até 3,5 s depois para não parar no meio.
- `?debug` mostra isolamento, backend, threads, tempo do chat, RTF do primeiro trecho, espera aplicada e tempo até o primeiro som.
