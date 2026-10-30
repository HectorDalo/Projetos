# Voz, celular, idioma e personagem — 27/10/2026

## Alterações
- O toque do microfone inicia a escuta imediatamente, sem esperar uma saudação ou download do modelo. A reprodução neural é desbloqueada no mesmo gesto.
- Indicadores distinguem a abertura do microfone da escuta iniciada. Finais ausentes em alguns navegadores móveis têm recuperação; transcrições duplicadas e resultados de sessões canceladas são ignorados.
- Falhas de permissão, dispositivo, rede e idioma recebem mensagens específicas e ação para tentar novamente. O reconhecimento continua sendo o serviço do navegador, sujeito à sua disponibilidade; não foi conectado um provedor de transcrição alternativo.
- A vogal portuguesa isolada “é” usa fonemas explícitos, evitando a leitura do nome do acento pelo conversor. Não altera o texto escrito.
- No celular, voz básica é a opção inicial, com voz natural ainda disponível em Opções. Controles de 44px, entrada de 16px, área de resposta maior e modo ampliado que acompanha a área visível com teclado.
- A legenda agora mantém o texto integral e destaca a palavra falada. A rolagem automática move apenas a caixa da resposta.
- A superfície do retrato passa continuamente por cabeça, pescoço e torso, com transição progressiva da rotação. A boca tem abertura menor e transições suavizadas.
- A Elara atribui sua criação e a do portfólio a Hector Dalonso, distinguindo ferramentas/modelos usados da autoria do aplicativo.
- “Sou o Hector” ativa tratamento pessoal enquanto a conversa estiver aberta, inclusive após as mensagens antigas saírem da janela de contexto. Não é autenticação e não libera informações privadas. Limpar/encerrar/recarregar reinicia a identificação.
- O modo inglês exige texto em inglês antes de gerar voz em inglês. Uma checagem heurística detecta respostas claramente portuguesas e pede uma tradução ao modelo uma vez; se continuar em português, retorna erro em vez de mandar esse texto para a voz inglesa. Nomes próprios são mantidos. A heurística não é um detector de idioma infalível.

## Validação e limites
68 testes automatizados aprovados, build de produção concluído e estrutura do GLB validada. Testes dos ciclos de fala, microfone, legendas, contexto do visitante, troca de idioma e respostas do provedor; build de produção e validação estrutural do GLB. As respostas do provedor nos testes são simuladas. Microfone físico, pronúncia audível, qualidade visual em movimento e teclados de aparelhos reais ainda precisam de validação após publicar. O controle de navegador disponível nesta sessão falha antes de abrir a aba e não permitiu revisão visual.

Não há publicação automática: enviar o novo pacote em um deployment de produção do projeto hector-dalonso. Confirmar a versão em /release.json. Testar em português e inglês, permitir o microfone, falar uma pergunta, aguardar a resposta e repetir. No celular, testar também Ampliar conversa, teclado aberto, rolagem da resposta e Opções.
