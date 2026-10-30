# Prévia do LinkedIn — 28/10/2026

Versão: 2026-10-28-linkedin-15.

Faltavam metadados Open Graph no HTML inicial. Adicionados título, descrição, URL pública canônica e imagem JPEG estática de 1200x630 pixels, 82.588 bytes. A capa não exige JavaScript, modelo 3D, microfone ou autenticação. Ela fica em /images/portfolio-social.jpg. Incluídas dimensões, tipo de imagem, descrição alternativa, tags para outros serviços e robots.txt permitindo o acesso público. A imagem foi inspecionada visualmente.

Validação: compilação concluída, metadados presentes no HTML final, imagem JPEG decodificada e dimensões/tamanho verificados. Nenhuma função da Elara foi alterada nesta etapa. Mantém as correções anteriores, cuja versão passou nos 112 testes.

Foram relatados dois problemas distintos: falha ao acessar a imagem de prévia e aviso de possível conteúdo mal-intencionado no LinkedIn. A capa corrige a ausência de configuração da prévia no código, mas não garante remover classificação de segurança. A causa do aviso não foi confirmada. A revisão pontual do código local não encontrou redirecionamentos automáticos; isso não equivale a uma auditoria de segurança nem à validação da versão publicada.

Acesso HTTP à versão pública não pôde ser validado nesta sessão: ferramenta web não acessou o domínio e a consulta do terminal falhou em DNS. Não houve publicação nem teste autenticado no LinkedIn.

Após publicar hector-cloudflare-pages-linkedin.zip em Production:
1. Abrir https://hector-dalonso.pages.dev/images/portfolio-social.jpg para conferir a imagem pública.
2. Usar o endereço principal https://hector-dalonso.pages.dev/ no Destaque do LinkedIn.
3. Consultar https://www.linkedin.com/post-inspector/ com esse endereço para verificar a prévia.
4. Se continuar o aviso de segurança, pedir revisão na Central de Ajuda do LinkedIn, informando o endereço completo e anexando a captura do aviso. Não foi enviado chamado nesta sessão.

Referência oficial da prévia: https://www.linkedin.com/help/linkedin/answer/a521928
