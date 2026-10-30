# Atualização do visual e fala — 27/10/2026

Referência visual: imagem “Portfólio Futurista com Assistente de IA” enviada pelo Hector. A gravação local de 2min05s foi examinada por quadros; mostrou a mudança do retrato para a camada facial e a caixa abaixo da personagem.

- Composição reorganizada com apresentação à esquerda, Elara ao centro e resposta lateral. O campo de entrada acompanha a coluna da conversa no computador; no celular usa a largura disponível abaixo das duas colunas, mantendo acesso ao teclado e modo ampliado.
- As superfícies originais dos lábios são preservadas. A camada 3D não adiciona mais uma cavidade escura, anel elíptico de lábios e dentes artificiais sobre o retrato. Uma superfície curva, com bordas suaves, mistura as imagens de boca já existentes conforme o áudio. Em repouso/pausa, a mistura volta a zero.
- A frase inteira é convertida em fonemas antes da síntese, mantendo contexto e correspondência de texto. Vírgulas, pontos, dois-pontos e ponto e vírgula criam limites de frase/oração e pausas curtas explícitas. Silêncio excedente no fim do trecho é reduzido para não somar duas pausas longas.
- Velocidade neural alterada de 0,96 para 1,08 no próprio modelo, e leitura do navegador de 0,92 para 1,04.
- Cartões de projetos com colunas de mesma largura e proporção quadrada, incluindo o espaço de próximo projeto. Prévias têm limite de linhas e os detalhes completos continuam disponíveis nos diálogos.

Validação: 71 testes aprovados, build de produção concluído e GLB validado. Foram testados recortes/intervalos de pontuação, espaços e offsets dos fonemas, silêncio e boca fechada, além das regressões anteriores de voz, celular e idioma. Não foi possível validar a interface atualizada num navegador porque a ferramenta falha ao iniciar. A aparência em movimento, a pronúncia final, responsividade real e microfone físico precisam ser conferidos depois da publicação; testes com substitutos não certificam a fala audível ou GPU real.

Pacote atual: hector-cloudflare-pages-layout-fala.zip. Versão esperada em /release.json: 2026-10-27-referencia-3. Ainda não publicado por esta sessão.
