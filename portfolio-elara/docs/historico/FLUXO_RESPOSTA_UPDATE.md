# Fluxo da conversa e pausas — 28/10/2026

Versão: 2026-10-28-fluxo-resposta-14.

Referência: gravação 20261028-0452-51.1694029.mp4 (27,17 segundos), cujos quadros mostram o balão anterior desaparecendo e reaparecendo na transição de escuta. Não foi medida a latência real do novo pacote em um celular.

Correções comuns a PC e celular:
- Ao iniciar a próxima escuta, ocultar a resposta e a pergunta anteriores. O histórico necessário à continuidade da IA permanece em memória.
- Manter o balão oculto durante escuta, transcrição e geração da resposta. Com áudio ativado, exibir o novo texto quando a reprodução começar. Com áudio desligado, exibir quando a resposta textual chegar. A conversa ampliada usa um estado de espera, sem reapresentar a resposta anterior.
- Descartar o texto de síntese e o marcador de latência antigos ao interromper uma fala, preservando as verificações de identificação dos trabalhos de áudio.
- Durante a preparação entre trechos da mesma resposta, manter a legenda atual, sem voltar à resposta anterior.

Redução de esperas evitáveis:
- Após o toque que ativa a voz/microfone, iniciar o carregamento do modelo e do estilo da voz em paralelo à escuta/transcrição. Não carrega automaticamente ao abrir o site.
- Em português, deixar vírgulas, dois-pontos e pontos e vírgulas dentro de trechos maiores de síntese, evitando uma nova inferência por oração. Primeiro trecho limitado a 95 caracteres; demais a 170, preservando palavras e posições das legendas.
- Pausas externas PT mais curtas: vírgula 90ms, ponto e vírgula/dois-pontos 120ms, final de frase 180ms. A articulação e o tom da voz permanecem os mesmos; a pontuação dentro dos trechos é interpretada pelo modelo.
- Envio automático após aproximadamente 900ms de silêncio no microfone, antes 1200ms. Continua possível enviar manualmente. No ditado do navegador, o intervalo de segurança após resultado final cai de 900 para 350ms.
- Inglês mantém o modelo, estilo, velocidade e regras de divisão/pausa da síntese previamente aprovados.

Opções preservadas: voz neural padrão e Voz leve · navegador. A leve usa as vozes disponíveis no aparelho, com preferência por brasileiras instaladas e nomes femininos conhecidos. Mantidos Habilidades, foco em IA, legenda móvel em cinco palavras e correção do piscar.

Validação: 112 testes passaram e compilação concluída. Regressões incluem transição com resposta antiga, preparação antecipada sem cumprimento, preservação do contexto após falha do microfone, agrupamento PT e envio após silêncio sem cortar uma pausa curta. Não há promessa de resposta instantânea: transcrição, geração na Cloudflare e síntese no aparelho ainda levam tempo. Desempenho e fluência precisam de avaliação real nos dispositivos.

Publicar hector-cloudflare-pages-fluxo-resposta.zip em Production e concluir Save and Deploy. Este pacote não foi publicado pela sessão.

Conferir após publicar:
1. Fazer duas perguntas seguidas por voz. A primeira resposta não deve reaparecer enquanto a segunda carrega.
2. Ouvir uma frase com vírgulas e ponto e vírgula em português, no PC e no celular.
3. Testar a primeira pergunta após carregar a voz e uma pergunta posterior, distinguindo o download inicial do tempo normal de resposta.
4. Em Opções → Áudio da Elara, confirmar Voz neural e Voz leve · navegador.
