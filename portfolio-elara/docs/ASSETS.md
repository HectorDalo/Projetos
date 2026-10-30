# Estado atual dos assets

O rosto frontal animável atual é `public/models/elara-face.glb`, criado com malha e morph targets pelo gerador próprio `scripts/build-face-rig.py`, usando a textura da Elara existente. Detalhes em FACE_RIG.md. As texturas em camadas continuam como alternativa sem WebGL. Abaixo, histórico de geração das artes preservadas.

# Direção visual e origem da arte

Referência recebida: `Portfólio Futurista com Assistente de IA.png`. Usada apenas como referência estética. Dados pessoais, números e projetos na imagem não foram tratados como fatos.

Arquivo usado no site: `public/images/assistant-hero.webp`.

Geração: ferramenta integrada **ImageGen**, com imagem de referência. A imagem gerada foi convertida para WebP, sem alterar a composição, para reduzir o carregamento. Não há serviço de IA em execução no site para exibir a arte.

Prompt final utilizado:

> Use case: stylized-concept. Asset type: cinematic web hero artwork, landscape 1536x1024. Input image is a STYLE AND COMPOSITION reference only, NOT an edit target. Generate a polished high-end sci-fi 3D illustration for Hector Dalonso portfolio: a friendly adult feminine holographic virtual assistant with dark hair in a high bun, luminous blue eyes, subtle high-tech dark bodysuit with cyan circuits, waist-up emerging from a glowing circular hologram projector. Futuristic space station observatory, Earth visible through window behind on upper right, restrained cyan light strips and dark navy metal. Character at 60% horizontal position, head fully inside image with generous top margin, body in center-right. Left 35% is dark low detail negative space for actual HTML text overlay. Right edge fades to dark. Premium cinematic blue/cyan, realistic 3D render, calm professional welcoming expression. All lighting integrated, deep ink black navy background. NO typography, NO letters, NO UI, NO panels, NO logos, NO numbers, NO watermarks. Only illustration. Do not reproduce the screenshot layout, cards, copy, or navigation.

O fundo do card do projeto e o diagrama orbital foram criados em CSS. Os ícones são SVG próprios. Não há thumbnails de projetos inexistentes.


## Avatar animável e cenário separado

Ferramenta: ImageGen integrada. Os arquivos foram convertidos para WebP, preservando o canal alfa do personagem.

- `public/images/assistant-rig.webp`: personagem feminina holográfica frontal, cabelo escuro preso em coque, roupa azul/ciano com circuitos e peito com diamante luminoso, fundo transparente, visor azul-escuro sem traços faciais para receber olhos e boca animados pela aplicação. Os traços faciais são SVG da interface, não edição da imagem por código.
- `public/images/observatory.webp`: estação espacial vazia azul/ciano com Terra pela janela e base de projeção holográfica central, espaço escuro à esquerda para texto. Sem personagens ou texto.

Prompts de produção: personagem retrato 1024 × 1536 frontal simétrica, busto até cintura, visor completamente vazio, cabelo com coque, membros dentro do enquadramento, cintura com dissolução em partículas, render 3D cinematográfico, transparência real; cenário paisagem 1536 × 1024 no mesmo estilo da referência, observatório espacial vazio, planeta à direita, base holográfica em 60% da largura, 35% à esquerda com poucos detalhes, sem letras, painéis ou pessoas.


## Correção para rosto humano aprovada pela direção do usuário

Arquivo final utilizado: `public/images/assistant-human.webp`, gerado pela ferramenta integrada ImageGen e convertido para WebP com alfa preservado. A versão com visor azul foi substituída na interface. O original foi preservado como material de trabalho.

Prompt final utilizado:

> Use case: identity-preserve. Asset type: transparent character layer for website animation. Reference image is the original user-approved assistant appearance. Recreate that BEAUTIFUL adult HUMAN female virtual assistant, preserve the human feminine face, natural light skin, warm subtle blush, realistic blue eyes, beautiful facial proportions, dark hair in high bun with loose strands. ABSOLUTELY NOT a robot face, NOT a visor, NOT blue skin. Pale natural skin lit by soft neutral-white key light, cyan rim light confined to hair and suit edges. Gentle welcoming closed-mouth smile. Face straight toward viewer, both eyes symmetrically forward, no tilted head. Futuristic fitted high-neck dark navy suit with elegant thin cyan circuits, glowing cyan chest diamond. Waist-up portrait 1024x1536, whole bun visible with margin, shoulders and upper arms inside frame, waist fades into transparent particles. Relaxed professional nonsexual pose, arms down. High-end cinematic detailed realistic 3D beauty render matching original reference female. Genuine transparent background. NO blue halo filling background, NO scenery, NO platform, NO text, NO watermark. IMPORTANT keep complexion human and warmly natural, keep eyelids and lips subtle and photorealistic. This will be animated by separate eye/head layers; provide a single clean symmetric frontal character, normal expressive face fully included.

Olhos usam recortes vetoriais da textura da própria personagem, com deslocamento controlado pelo cursor; piscadas usam pequenas pálpebras locais. A boca usa sobreposição de abertura discreta durante eventos reais de fala, não um vídeo nem sincronização fonética perfeita.


## Texturas finais de expressão de Elara (ImageGen)

`public/images/elara-blink.webp`: edição local da personagem humana com ambos os olhos gentilmente fechados, mantendo alinhamento, identidade, iluminação, pele e todos os demais detalhes. Usada somente na região dos olhos, sem pele ou olhos vetoriais pintados.

Prompt: Edit target: supplied transparent portrait of Elara. Make ONLY this tiny local expression change: both eyes gently and naturally closed in a relaxed blink. Preserve exact identity, head proportions, exact pixel positions of eyes and head, hair, skin color, skin texture, lighting, makeup, eyebrows, lips, expression, suit, pose, framing, image dimensions 1024x1536, and transparency. Do NOT rotate or shift any part. Closed eyelids should be photorealistic with natural lashes forming a subtle curved line where the eyes close, no blur, no smudges, no dark stains, no cartoon lines. Keep ALL other parts identical. This image is a blink texture used over the open-eye portrait, so strict facial alignment and skin/color consistency are essential.

`public/images/elara-speaking.webp`: expressão de fala com lábios ligeiramente entreabertos, usada apenas na área da boca durante áudio real.

Prompt: Edit target: supplied transparent portrait of Elara. Make ONLY one small local change: lips parted slightly in a natural mid-speech expression, a small glimpse of upper teeth and a little mouth interior, warm gentle welcoming expression. Preserve exact identity, original nose/eyes/eyebrows/chin/jaw/face proportions, exact pixel position of the head and lips, natural light skin and makeup, lighting, hair, suit, pose, image dimensions 1024x1536, framing and genuine transparency. No big grin or exaggerated mouth, no jaw movement, do not shift or rotate the head, do not change the eyes. Keep all areas outside the mouth identical. This is an aligned talking texture for the existing character; lips and face must remain precisely aligned with the supplied original.

Ambas foram convertidas para WebP sem edição visual adicional. A composição dinâmica acontece no navegador com máscaras CSS.
