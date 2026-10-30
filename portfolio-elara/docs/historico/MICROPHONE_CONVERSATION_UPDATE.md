# Microfone, português e conversa — 27/10/2026

Versão: 2026-10-27-microfone-conversa-6. Pacote para publicar: hector-cloudflare-pages-microfone-conversa.zip.

## Microfone do computador e do celular

- O botão de microfone em português agora solicita acesso por getUserMedia quando a captura aprimorada estiver disponível, independentemente de a saída de voz ou o ditado nativo serem suportados. A permissão só é solicitada após um toque/clique.
- Em Opções, “Permitir e testar microfone” solicita permissão, mostra o nome e o nível de entrada e libera o aparelho ao concluir. O teste é local e não envia áudio. Depois de permitir, é possível selecionar o headset pelo nome.
- Na conversa, o microfone selecionado é solicitado pelo deviceId exato, com cancelamento de eco, redução de ruído e controle automático de ganho. O nível de entrada fica visível; o silêncio após a pergunta encerra a captura. Existe também “Enviar fala” para finalizar manualmente.
- Após autorização explícita do Hector nesta conversa, foi implementado o envio temporário da pergunta para transcrição na Cloudflare. O áudio é convertido para WAV mono 16k, limitado a cerca de 20 segundos, validado no servidor e processado por @cf/openai/whisper-large-v3-turbo. Não há salvamento de gravações pelo portfólio. O teste de microfone não usa esse endpoint.
- O endpoint usa a conexão AI existente e está sujeito à disponibilidade, termos e cotas da conta Cloudflare. Só conteúdo WAV curto é aceito; silêncio e corpo excessivo são rejeitados antes de chamar o modelo. Permissão negada, ausência de sinal, dispositivo desconectado, entrada ocupada e falha de transcrição têm mensagens distintas.
- Encerrar, mudar de idioma, ocultar a página ou sair libera as faixas, cancela requisições e descarta buffers. O modo inglês mantém o ditado do navegador por padrão quando suportado; selecionar um headset ou escolher a captura aprimorada permite usar a nova rota.

## Português e destaque das palavras

- Confirmado com ephone 1.0.2 real: asSpans() remove espaços. O português agora usa o sourceMap bruto para conservar texto e fonemas com seus espaços. O destaque usa as posições originais e não acumula erro por soma de trechos sem espaço.
- Preservados pontos de interrogação e pontuação final. A velocidade brasileira foi ajustada separadamente: 1,16 na voz do navegador e 1,14 na voz neural. Finais suaves têm margem de áudio um pouco maior; pequeno ajuste de tom/timbre em português. Não há promessa de emoção específica ou clonagem da voz inglesa.
- Modelo de voz, fonemas gerados, velocidade (1,08 neural / 1,04 navegador), tom e processamento da saída em inglês permanecem com os valores anteriores. Apenas os offsets do texto inglês são corrigidos sem modificar seus fonemas.
- O destaque não tem mais sombra forte. Rolar manualmente pausa o acompanhamento; “Acompanhar fala” permite retomá-lo. A rolagem automática não força retornos para cima e não volta ao topo ao terminar a fala.

## Conversa e visual

- O português passa a usar por padrão @cf/meta/llama-3.1-8b-instruct-fp8, conferido no catálogo atual da Cloudflare. O inglês mantém @cf/meta/llama-3.2-3b-instruct. CHAT_MODEL preserva configuração explícita e PT_CHAT_MODEL permite escolher apenas o modelo português; o antigo nome de configuração 8b-fp8-fast é normalizado para a variante atual.
- Cumprimento, apresentação curta, curso, instituição e linguagens têm contexto focado e respostas curtas. Uma pergunta de apresentação não recebe a referência detalhada de projetos. “Onde?” após Ciência da Computação mantém o assunto e direciona para o ENIAC. Detalhes são acrescentados conforme as perguntas, sem repetir currículo inteiro ou empurrar outra pergunta ao final de tudo.
- Expressividade conversacional discreta e acolhedora, sem fingir ser uma pessoa real, inventar sentimentos, memórias íntimas ou dados. Dúvidas de ditado como “extra” devem gerar esclarecimento, não um projeto inventado.
- Elara maior no celular; controles de conversa acessíveis e área de resposta legível. O aviso ocioso “Acompanhando seu cursor” foi removido. Anéis da base, atmosfera do planeta e luzes do cenário têm animações suaves, com movimento reduzido respeitado.
- Geometria do rosto, regras visuais da boca e arquivo GLB foram comparados por hash com a versão aprovada: permanecem idênticos. Não foi redesenhada a boca.

## Validação e conferência após publicar

97 testes passaram e o build de produção foi concluído. Incluem integração do microfone sem ditado/saída de voz, seleção exata de headset, permissão negada e tardia, teste sem upload, transcrição válida, silêncio, limite do corpo, cancelamento e preservação do inglês. Além dos testes simulados do provedor, o conversor real ephone foi executado localmente em frases com acentos, vírgula, ponto e pergunta, confirmando espaços/offsets/pontuação. Esses testes não comprovam a captação do headset físico, GPU/teclado móvel, qualidade do timbre ou respostas reais dos novos modelos. O controle do navegador continua indisponível nesta sessão; a versão não foi publicada por esta sessão.

1. Envie o pacote novo em Production no projeto hector-dalonso e confirme a versão em /release.json.
2. No computador, abra Opções → Permitir e testar microfone, permita o acesso, selecione o headset pelo nome e teste o nível. Confira o mute físico se o nível ficar parado. O site não pode substituir uma negativa permanente do navegador ou do Windows.
3. Inicie conversa e diga “oi”, “quero saber sobre ele”, “onde?” e “o que ele já estudou?”. Confira “Você disse” para distinguir erro de transcrição de erro na resposta.
4. No celular, confira tamanho, teclado, microfone, voz brasileira, perguntas/finais e rolagem manual. Confirme que o inglês mantém a experiência aprovada.
