# Atualização — Habilidades, IA e voz — 28/10/2026

Versão: 2026-10-28-habilidades-voz-7

- Habilidades na navegação e seção própria em português e inglês, com níveis orientativos, evidências e próximo foco de estudo. Inclui Python, web, IA aplicada, C, C#/.NET/Blazor, SQL, Git/GitHub, Microsoft Office, Google Planilhas/Documentos/Forms/Slides e inglês.
- Apresentação e referência da assistente atualizadas: Hector criou a Elara e está aprimorando conhecimentos em IA aplicada. Os níveis não afirmam domínio avançado ou independência ainda não demonstrada.
- Retirado o link Contato/Contact abaixo da apresentação inicial; a seção de contato permanece.
- Voz natural padrão no celular e no PC, com o mesmo mecanismo de áudio e sincronização de boca. Não houve alteração da geometria aprovada do rosto ou do modelo, velocidade e pronúncia da voz neural em inglês.
- Português: preservados a voz neural brasileira pf_dora, fonemização pt-BR e ritmo aprovado do PC. O modo básico só aceita vozes pt-BR, sem substituição silenciosa por pt-PT. Não há controle comprovado de sotaque paulista específico; validar ouvindo no aparelho.
- Microfone em inglês: o modo automático também abre a captura do microfone via permissão quando a transcrição Cloudflare está disponível, mesmo se o navegador oferecer ditado. Captura apenas após toque, sem salvar gravação no portfólio.

Validação: 101 testes automatizados aprovados; compilação de produção concluída. Inclui regressões do microfone em inglês, boca no celular, habilidades bilíngues e dados de IA para a assistente. Hardware real e sotaque ainda precisam ser avaliados pelo usuário. Os testes do provedor usam substitutos, sem avaliar inferência real.

## Publicação

Enviar hector-cloudflare-pages-habilidades-voz.zip em Production e concluir Save and Deploy. O ZIP contém os arquivos prontos na raiz. Esta atualização ainda não foi publicada por esta sessão.

## Conferência após publicar

1. Atualizar a página e conferir o menu Habilidades (no celular, abrir o menu).
2. Perguntar quem criou a Elara e quais conhecimentos Hector está desenvolvendo em IA.
3. Em inglês, tocar Start voice conversation. Se o navegador já concedeu a permissão, pode abrir o microfone sem mostrar outro pedido. Se estiver bloqueado, liberar o microfone nas permissões do site. Conferir também Options → Allow and test microphone.
4. No celular, usar a voz natural padrão e aguardar o download inicial se necessário. Conferir voz brasileira e boca acompanhando o áudio. O tempo de geração depende do aparelho.

O perfil público exportado está incluído no código-fonte. Não foi enviado automaticamente ao GitHub ou LinkedIn.
