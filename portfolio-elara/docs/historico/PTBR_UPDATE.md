# Português brasileiro e apresentação — 27/10/2026

- Removido o botão da apresentação à esquerda que repetia o acesso à Elara já visível.
- A voz do navegador em português agora aceita somente a região pt-BR, incluindo variantes com separador normalizado. Uma voz pt-PT não é escolhida nem oferecida na lista, mesmo se for feminina ou houver uma seleção antiga.
- Se não houver voz brasileira disponível, o áudio é desligado e a interface orienta selecionar Voz natural · Brasil ou instalar uma voz pt-BR no aparelho. Não há troca silenciosa para português de Portugal.
- A voz neural já utiliza a voz brasileira pf_dora e fonemas pt-BR; não foi trocado o modelo nem prometida uma nova qualidade de sotaque.
- A troca de modo limpa erros de voz anteriores para permitir usar a alternativa escolhida.

Validação: 73 testes aprovados e build concluído. Cobertura inclui BR masculina antes de PT feminina, bloqueio de pt-PT e mensagem de indisponibilidade. O sotaque percebido precisa ser ouvido no aparelho real após publicar. As correções de layout, boca e ritmo da versão anterior foram mantidas.

Versão: 2026-10-27-ptbr-4. Publicação pendente. Pacote: hector-cloudflare-pages-ptbr.zip.
