# Fundo, voz e legenda — 27/10/2026

- Pontos quadrados substituídos por luzes circulares de bordas transparentes, com deslocamento e variação de brilho discretos. A arte original do observatório recebe um movimento pequeno e um brilho suave na região do planeta. Efeitos ativos inicialmente, respeitando movimento reduzido, botão de desligar, aba oculta e orçamento menor no celular.
- Legendas passam a destacar palavras inteiras mesmo quando a transcrição fonética fornece fragmentos. O destaque neural usa o relógio de saída do áudio quando disponível; há alternativa pelo atraso informado pelo aparelho. A posição da boca continua usando o mesmo relógio e os mesmos fonemas de antes.
- Texto permanece estável entre os trechos de áudio. A caixa não volta ao topo ao terminar a fala; uma nova resposta reinicia a posição.
- Voz neural suavizada com ajuste leve de agudos e ganho, depois do analisador que controla a boca. Na leitura do navegador, pequeno ajuste de tom e volume, mantendo a velocidade e a seleção pt-BR.
- Barras de rolagem escuras, finas e azuladas na página, resposta e opções, com alternativa nativa de tema escuro.

Preservação: comparados os hashes de ElaraFaceRig.tsx, HolographicAvatar.tsx, avatarDynamics.ts, neural.worker.ts e elara-face.glb antes e depois. Os cinco arquivos permanecem idênticos; nenhuma geometria, imagem de boca, fonema ou regra de animação facial foi alterada.

Validação: 78 testes aprovados e build concluído. Inclui transparência dos cantos do ponto de luz, destaque de palavras por offsets de sílabas, relógio de saída do áudio independente da boca e manutenção da rolagem no fim da leitura. A gravação enviada foi examinada por quadros. A aparência e a voz finais continuam dependentes de validação no navegador/aparelho real, pois a ferramenta de controle do navegador não inicializa nesta sessão. Redução de ganho/suavização não equivale a trocar o modelo vocal ou garantir uma percepção específica de timbre.

Versão: 2026-10-27-luzes-legendas-5. Publicação pendente. Pacote: hector-cloudflare-pages-luzes-legendas.zip.
