# Verificação — atualização de 27/10/2026

## Código e build

- `pnpm build`: TypeScript, Vite e bundle do Worker concluídos.
- `pnpm test`: 41 testes aprovados em 13 arquivos. Incluem validação do servidor, limites por requisição, tratamento de falhas/cota, integração dos cards com o contexto da IA, formação confirmada, idioma, voz básica, ativação/cancelamento/falhas da voz neural, alinhamento fonético e animação dos interesses com movimento reduzido.
- Os testes de provedor usam doubles explicitamente identificados. A verificação de conversa real é separada e registrada abaixo.
- GLB carregado efetivamente no navegador por Three.js, com `data-rig="geometric-face"` e `data-ready="true"`. O arquivo contém oito morph targets faciais. Não é um modelo corporal de 360 graus.
- Pacotes de fonte e publicação verificados como ZIPs íntegros, sem node_modules, caches ou credenciais. O pacote de publicação inclui `_worker.js` e `_routes.json`.

## Testes no navegador

- Prévia Cloudflare inspecionada em 1280px; versão final de produção inspecionada em 963 × 900px e 390 × 844px, sem rolagem horizontal. Nome, conteúdo profissional PT/EN, conhecimentos em estudo, contatos, Elara à direita no desktop e compositor abaixo da personagem.
- O compositor foi convertido em campo fixo, sem histórico visual ou crescimento por respostas. O balão mostra apenas a fala/resposta atual; texto longo pode ser lido com rolagem no próprio balão. O contexto da interação fica somente em memória e é limpo ao encerrar, recarregar, trocar idioma ou ocultar a aba.
- Fluxo ouvir → responder → ouvir validado por testes com doubles: resultados parciais não são enviados, há um único envio por frase final e o microfone não é rearmado durante fala/preparação de áudio. O microfone real não foi aberto durante QA.
- Sem chamadas redundantes de explorar projetos/conhecer assistente, sem versão V.01 ou rodapé genérico.
- Interesses alternam a cada 4,5 segundos, com uma passagem elétrica breve e de baixa intensidade. Descrição acessível estável; a preferência por movimento reduzido mantém texto estático.
- Voz neural: corrigido import de runtime não empacotado e substituído o conversor restrito a inglês por ephone com pacotes de português e inglês.
- Download real do modelo concluído e síntese neural reproduzida nos dois idiomas. Durante português, observado `phase=speaking`, visema `open`, palavra `Elara,`, boca com abertura variável e olhar `0.000`. Em inglês, observado `phase=speaking` e palavra `Hector’s`, sem novos erros de console. Ao terminar, retorno a idle e boca fechada.
- A saudação final foi reduzida à frase solicitada. A escrita pública permanece Hector; uma regra específica da fala em português usa `/ˈɛktoɾ/`, preservando o som K. O modo básico recebe Héctor no texto falado, mantendo a mesma extensão para as legendas.
- Voz não inicia automaticamente. Falhas desativam o estado de voz e exibem mensagem; nenhum áudio básico substitui silenciosamente a voz neural.

## Conversa real em produção

Após publicação, a pergunta sobre formação/conhecimentos/experiência foi enviada ao serviço real. A resposta confirmou Ciência da Computação no Centro Universitário ENIAC, segundo semestre, estudos em Python, C, bancos de dados, HTML e JavaScript, e informou não haver experiência profissional anterior confirmada. Não foi uma resposta simulada.

## Integração e segurança

A conversa de produção usa Cloudflare Workers AI com binding `AI`, acessado somente pelo Worker. Nenhuma chave de provedor é enviada ao frontend. O contexto inclui apenas os dados públicos de `profile.ts`: curso ENIAC/segundo semestre, conhecimentos em desenvolvimento e projetos reais. Emprego anterior e domínio avançado não foram confirmados.

O código não grava conversas em banco/localStorage. O provedor de chat possui suas próprias condições. A voz neural é gerada localmente; os arquivos públicos são obtidos de jsDelivr/Hugging Face. Ditado e voz básica podem utilizar serviços do navegador.

## Limitações práticas

- Sotaque paulista e uma emoção vocal específica não são garantidos pelos modelos gratuitos. A voz não é uma cópia da voz do ChatGPT.
- Boca e mandíbula usam visemas simplificados e intensidade do áudio; não é captura facial ou articulação muscular perfeita.
- O rig é frontal com textura projetada; cabelo e corpo preservam superfícies do retrato. A aparência em movimento ainda pode exigir refinamentos artísticos.
- Primeiro carregamento da voz é grande e a geração pode demorar em aparelhos lentos. Os testes observaram os estados de reprodução e sincronização; a sonoridade subjetiva requer avaliação do proprietário.
- Microfone não foi aberto durante QA. Ditado depende do navegador e de permissão explícita.
- FastAPI e Supabase continuam como estruturas opcionais, sem serviço/banco remoto ativado.
- A prévia `avatar` não tem binding de IA; a conversa real é verificada no endereço principal. O protótipo local não pôde ser acessado pelo navegador nesta sessão devido à restrição de sockets do ambiente; a inspeção visual foi feita em prévia HTTPS.


## Última conferência da versão publicada

“Criação de Soluções Digitais” substituiu “Desenvolvimento Web” no texto rotativo, também em inglês. Saudação curta publicada: “Oi, eu sou Elara, assistente virtual do Hector.” A regra de pronúncia de Héctor continua na síntese. A geração neural desta saudação foi executada em produção sem novos erros de console. O rosto de oito controles carregou efetivamente.

O compositor mediu 128px no layout de computador e 136px no celular. Na pergunta real sobre a instituição, o compositor permaneceu com 136px antes/depois e o DOM continuou sem mensagens de histórico ou role=log. A resposta factual foi exibida somente no balão. Não houve rolagem horizontal nos tamanhos finais de teste. A largura mínima foi posteriormente ajustada para 280px para o painel estreito do navegador integrado.


## Correção de movimento/voz — motion-2

40 testes passaram na suíte completa; o teste adicional de não antecipar legenda passou junto ao teste de conversa por voz (41 casos no total). Build TypeScript/Vite/Worker e validação estrutural do GLB aprovados. O arquivo passou a ter onze controles de rosto/tronco. O teste de sinal de voz confirma silêncio fechado e abertura perceptível em energia de fala normal. A espera da síntese usa trechos iniciais menores e não exibe fala como legenda antes de começar o áudio. O contorno retangular azul no input foi removido; o foco por teclado foi preservado em tom neutro.


## GPU e reprodução real — versão maior autorizada

O proprietário optou depois pela variante maior para buscar menor latência. Confirmado em produção `data-voice-backend=webgpu`. Primeiro carregamento/início da saudação: 23.310ms, incluindo preparação do modelo maior. Com o modelo carregado, repetição da mesma saudação: 516ms até o primeiro áudio (antes, 6.244ms na CPU com uma thread e 4.404ms com quatro).

Uma pergunta real (“Quem é o Hector? Responda em uma frase curta.”) levou aproximadamente 1.852ms desde o envio até o início da fala. Desse tempo, 1.238ms foram a preparação da voz após o retorno do chat. Esses são resultados observados em um ambiente, não garantia de latência universal ou instantânea.

A nova abertura da boca atingiu 0,61 nos controles durante áudio real. Foram capturados 44 quadros da página, 43 durante fala, cobrindo todas as palavras da saudação. O registro animado é uma captura sem áudio; não é uma animação gerada para aparentar funcionamento. O GLB contém arco dental e língua discretos, além de profundidade correta para oclusão de pálpebras/lábios.

O input focado retornou outline=none e a borda do campo ficou em tom neutro rgba(185,204,211,0.467), sem o retângulo azul. O foco posterior à resposta mantém a posição da página para não tirar a Elara do enquadramento.
