# Rosto animável da Elara

Arquivo: `public/models/elara-face.glb`. Gerador reproduzível: `scripts/build-face-rig.py` (Python + Pillow). A arte original é `public/images/assistant-human.webp`.

O GLB contém uma malha frontal com profundidade e textura projetada da personagem atual. Olhos azuis, pele, cabelo e roupa preservam a referência. As íris são malhas independentes; pálpebras, lábios e mandíbula têm deformações geométricas. Cabelo e corpo continuam como superfícies com a imagem do retrato. **Não é uma personagem de corpo inteiro modelada para rotação de 360 graus.** A vista foi preparada para conversa frontal, com pequenas rotações.

## Controles

- `Head`: pivô do rosto/cabelo para pequenos movimentos.
- `IrisLeft`, `IrisRight`: olhar, limitado à abertura fixa dos olhos.
- `eyeBlinkLeft`, `eyeBlinkRight`: fechamento geométrico das pálpebras.
- `jawOpen`: mandíbula e abertura da boca.
- `mouthFunnel`: lábios arredondados (O/U).
- `mouthSmile`: abertura horizontal (E/I).
- `browInnerUp`: elevação discreta das sobrancelhas ao ouvir/pensar.
- `eyeSquintLeft`, `eyeSquintRight`: pequena contração das pálpebras para expressão.

`ElaraFaceRig.tsx` carrega o arquivo via GLTFLoader e usa esses nomes. O olhar frontal é mantido durante a fala. Fora da fala, a cabeça acompanha mais o cursor e as íris se movem menos; há micromovimentos suaves e piscadas em intervalos variados. A abertura da boca foi reduzida e suavizada para preservar os traços. A intensidade da boca usa o áudio real; as formas usam as durações de fonemas produzidas pelo modelo neural. São formas simplificadas de boca, não uma simulação muscular ou articulação perfeita de todos os sons.

O modo básico usa apenas os eventos disponíveis no navegador e tem sincronização mais limitada. Sem WebGL2, perda do contexto ou erro do GLB, o retrato em camadas continua visível. Não há exigência de câmera ou microfone para olhar e animação.

Renderização limitada a 30 quadros por segundo, densidade de pixels até 1,5; pausa fora da tela/aba oculta. Movimento reduzido interrompe olhar, piscar e movimentos decorativos, mantendo a informação textual.

Para reconstruir:

```sh
python scripts/build-face-rig.py
pnpm build
```

Para uma futura personagem com rotação ampla e corpo articulado, substituir o asset por uma cabeça/corpo com topologia e rig adequados, preservando a interface de controles. Não rotacionar este retrato frontal como se tivesse laterais e nuca reconstruídas.


## Movimento do tronco e correção da abertura da boca

A versão motion-2 adiciona três controles: `bodyBreath`, `weightShift` e `shoulderLift`. O tronco usa uma grade deformável, preservando a textura original. A cabeça acompanha a respiração e faz pequenos movimentos diferentes ao ouvir/falar. São movimentos frontais de rosto e tronco, sem rig de braços/mãos ou corpo completo de 360 graus.

A abertura da mandíbula foi recalibrada para não desaparecer pela dupla atenuação de volume e visema. O volume usa um limiar de silêncio e compressão para fala normal; pausas e consoantes fechadas continuam fechando a boca. `scripts/check-face-rig.py` valida índices, valores finitos, amplitude da mandíbula e isolamento dos controles de tronco para evitar que puxem os lábios.


A versão motion-3 acrescenta arco dental e língua atrás dos lábios. A visibilidade depende da abertura real da mandíbula; superfícies com textura escrevem profundidade com alpha test para que íris, pálpebras e interior da boca se ocluam corretamente.
