# Portfólio — revisão de 27/10/2026

## Entregue no código
- Apresentação bilíngue, contatos profissionais e dois projetos reais.
- Nova seção de experiência e cursos, baseada nos currículos e nos relatos profissionais.
- Cadastro de clientes Python com detalhes e link documentado para o código.
- Elara orientada a falar com visitantes, apresentar Hector no masculino e usar fatos profissionais selecionados.
- Correções de escuta após silêncio, preservação de contexto em falhas e encerramento do microfone inclusive em navegadores sem síntese de voz.
- Tratamento de falha ao iniciar o dispositivo de áudio e proteção contra erros atrasados de uma execução de voz anterior.
- Atualização opcional da base por arquivo profissional no GitHub, com falha segura para a base local.
- Modelo selecionável no servidor pela variável CHAT_MODEL. Padrão mantido: @cf/meta/llama-3.2-3b-instruct. Alternativas permitidas para testes: @cf/meta/llama-3.1-8b-instruct-fp8-fast e @cf/meta/llama-3.3-70b-instruct-fp8-fast. Não existe troca de plano nem cobrança ativada por esta revisão. Comparar respostas reais antes de adotar outra opção. Preços: https://developers.cloudflare.com/workers-ai/platform/pricing/.
- O momento de edição do arquivo profissional não é tratado como a data de uma nova conquista.

## Validação e publicação
54 testes automatizados passaram; build de produção concluído. Os testes de IA e voz usam substitutos, sem validar captação física ou respostas do provedor real.

A ferramenta de controle do navegador falhou nesta sessão. A versão local foi disponibilizada para revisão, mas não há confirmação de inspeção visual desta atualização. A prévia local exibe somente o site; a IA depende do ambiente Cloudflare configurado.

O pacote hector-cloudflare-pages.zip deve ser publicado no projeto Cloudflare existente. A publicação não foi realizada nesta revisão porque não há acesso funcional ao painel. Depois de publicar, validar computador e celular, PT/EN, projetos, contatos, cumprimentos, perguntas de continuidade, Edu Tintas, cadastro Python e alternância de voz e escuta.

A sincronização GitHub vem desligada: publicar elara-profile.json em HectorDalo/Portiflio (branch main), configurar GITHUB_PROFILE_SYNC=true no ambiente e publicar a nova versão. Seguir docs/GITHUB_SYNC.md. Não há acesso automático ao LinkedIn nem pesquisa geral na web.

## Próximos projetos — depois de concluir o portfólio
1. Agente de inglês: aprendizado desde o básico, com meta de fluência próxima à nativa, foco em conversação, escuta, pronúncia, prática e progressão adaptada ao aluno.
2. Jogo para aprender programação: treinamento dentro do jogo, instruções, prática guiada e desafios necessários para avançar de fase. Experiência dinâmica, com dificuldade progressiva.

Essas ideias estão registradas para uma etapa futura. Nenhum desses projetos foi apresentado como pronto ou iniciado nesta revisão.
