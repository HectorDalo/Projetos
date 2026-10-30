# Atualização da base profissional pelo GitHub

Preparado para HectorDalo/Projetos, branch main. A fonte é portfolio-elara/elara-profile.json (pasta deste projeto dentro do repositório), não qualquer README ou código. O repositório pode continuar organizando projetos sem hospedar o portfólio antigo.

## Ativação pendente
1. Publicar elara-profile.json na raiz do repositório. Contém apenas a base profissional selecionada.
2. No ambiente do portfólio na Cloudflare, definir GITHUB_PROFILE_SYNC=true e publicar a versão atualizada.
3. Alterações no arquivo são consultadas quando alguém pergunta à Elara, com possível cache de até cinco minutos. Não é um monitor com notificações e não publica novos cartões automaticamente na página.

Se a consulta falhar, faltar o arquivo ou os dados forem inválidos, a base local continua funcionando. A consulta usa URL fixa, limite de tamanho e prazo de 2,5 segundos. A integração vem desligada até a configuração explícita.

## Atualização
Editar summary e facts em PT/EN, mantendo schemaVersion=1, owner=Hector Dalonso e updatedAt no formato AAAA-MM-DD. Não incluir documentos pessoais, conversas ou dados de clientes. Para regenerar a base local: node scripts/export-public-profile.mjs. Revisar antes de enviar.

Não existe sincronização do LinkedIn ou pesquisa geral na internet nesta versão. Não foi encontrada integração direta adequada para ler automaticamente o LinkedIn na consulta de plugins. O GitHub ainda não está conectado e nada foi enviado ou publicado.

O modelo atual foi mantido. Ajustes de tom não garantem maior inteligência; trocar de modelo exige validação real e análise de consumo. Referência: https://developers.cloudflare.com/workers-ai/platform/pricing/.
