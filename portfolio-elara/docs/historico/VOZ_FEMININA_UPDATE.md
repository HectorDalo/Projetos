# Voz leve feminina — 28/10/2026

Versão: 2026-10-28-voz-feminina-16.

A voz neural aprovada permanece como padrão, sem mudanças de modelo, timbre ou velocidade.

A opção Voz leve · navegador só seleciona vozes femininas identificáveis no idioma escolhido. Em português, exige pt-BR. Uma voz masculina instalada não passa à frente de uma feminina online. Entre as vozes femininas aceitas, dá preferência às instaladas para reduzir dependência da conexão. Preferências antigas apontando para voz masculina são ignoradas. Regra aplicada também à seleção leve em inglês.

A API do navegador não informa gênero. A identificação usa nomes e identificadores de vozes conhecidas, ou um rótulo explícito feminino. Uma voz de nome genérico não é presumida feminina. Se não identificar uma voz feminina compatível, não inicia síntese com a voz padrão do sistema e mostra uma orientação curta para escolher Voz neural. Não é feita troca automática que baixe o modelo sem escolha do usuário.

Validação: 115 testes passaram e compilação concluída. Inclui regressões com homem local/mulher online, preferência antiga masculina, voz genérica desconhecida, vozes pt-PT e seleção feminina em inglês. A voz real disponível e sua qualidade precisam de avaliação no aparelho.

Inclui todas as melhorias anteriores: estados da conversa sem resposta antiga, pré-carregamento neural, pausas em português, chat móvel ao lado da Elara, legendas em cinco palavras, correção dos olhos, Habilidades, foco em IA e capa estática do LinkedIn. A capa não garante remover o aviso de segurança do LinkedIn, cuja causa permanece sem confirmação.

Publicar hector-cloudflare-pages-voz-feminina.zip em Production e concluir Save and Deploy. Não publicado nesta sessão.

Após publicar, em Opções → Áudio da Elara, escolher Voz leve · navegador e testar uma pergunta em português. Se o aparelho só disponibilizar nomes masculinos ou genéricos, escolher Voz neural. A opção neural mantém a voz já aprovada.
