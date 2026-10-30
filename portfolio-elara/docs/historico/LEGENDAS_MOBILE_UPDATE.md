# Voz leve e legenda móvel — 28/10/2026

Versão: 2026-10-28-legendas-mobile-13.

- Voz neural preservada como padrão no PC e celular.
- Em Opções → Áudio da Elara, alternativa Voz leve · navegador. Prioriza vozes instaladas para reduzir dependência de rede; entre essas vozes, prefere nomes femininos conhecidos. Português aceita apenas pt-BR, nunca substitui silenciosamente por pt-PT. Se não houver voz brasileira, sugere voltar à neural. Voz disponível depende do aparelho; sotaque paulista não é garantido. Algumas vozes do navegador são serviços online.
- Movimentos de boca discretos no modo leve iniciam no evento real de fala e param ao encerrar. São aproximados, pois a API do navegador não disponibiliza a onda de áudio. Mecanismo neural e sua sincronização preservados.
- No celular, Elara e balão de resposta ficam lado a lado. Campo de mensagem e microfone continuam na largura total abaixo. Texto menor (12–13px), com altura limitada e rolagem local quando necessário.
- Durante a fala no celular, aparecem blocos de até cinco palavras; o bloco anterior é substituído. Não volta ao começo durante pausas. A resposta completa permanece na conversa ampliada. Respostas por texto sem reprodução continuam disponíveis no balão com rolagem. No PC, leitura completa preservada.
- A legenda usa eventos de palavras reais quando disponíveis. Na voz leve sem eventos de palavras, avança por estimativa e não inventa destaque exato de palavras. O modelo neural mantém os tempos do áudio.
- Todas as correções anteriores incluídas: Habilidades, autoria da Elara, foco em IA, microfone inglês, painel limpo e recorte dos olhos ao piscar.

Validação: 109 testes passaram e compilação concluída. Testes incluem troca de modo, escolha de voz brasileira instalada, movimento apenas durante fala, legenda em cinco palavras, acentos e pausas. A conferência visual no navegador falhou ao iniciar a ferramenta nesta sessão; layout e áudio precisam de avaliação no celular real.

Publicar hector-cloudflare-pages-legendas-mobile.zip em Production e concluir Save and Deploy. Não publicado nesta sessão.

Após publicar: no celular, conferir uma resposta longa em português e inglês, ampliar para ler tudo, trocar para voz leve em Opções e testar o headset. A voz neural exige download inicial; após carregada, o tempo de geração também depende do processamento do aparelho.
