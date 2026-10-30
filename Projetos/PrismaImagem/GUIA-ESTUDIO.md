# PrismaImagem — estúdio local

Esta atualização corrige a edição que recriava a imagem quando o objetivo era apenas ampliá-la. As tarefas agora são separadas no campo **Ação**.

## Atualizar sem reinstalar o motor

Feche o aplicativo e copie o conteúdo do pacote de atualização para a pasta existente do PrismaImagem, substituindo o executável e a pasta `app`. Preserve `engines` e `data`. Não precisa baixar novamente o ComfyUI ou o checkpoint já instalado.

## Ferramentas

| Ação | Uso e resultado |
|---|---|
| Gerar nova imagem | Prompt, formato e qualidade. SD 1.5 gera em resolução conservadora para a GPU de 8 GB. |
| Ampliar | Escolha 2× para manter proporções; Full HD 1920×1080 ou 1080×1920 usa corte central, sem esticar. Interpolação Lanczos; não recria personagens nem inventa detalhes como um modelo de super-resolução. |
| Transformar por descrição | Nova aparência a partir da referência. Intensidade padrão 0,25; valores menores preservam mais. No SD 1.5, descreva o resultado desejado, preferencialmente em inglês. Não equivale à edição por instruções de modelos avançados. |
| Remover fundo | Recorte com U²-Net, saída PNG RGBA com transparência. Exige o componente adicional abaixo. |
| Remover área marcada | Envie referência, arraste um retângulo sobre a pessoa/objeto, descreva o fundo e processe. O preenchimento é gerado em resolução reduzida e recomposto sobre a imagem original usando a máscara. Fora da seleção, o fluxo usa os pixels da referência; bordas têm transição suave. A reconstrução pode conter artefatos. |

Para trabalhar sobre uma criação, clique em **Usar resultado** e escolha a ação. O botão **Desfazer** restaura a imagem anterior durante a sessão; nenhuma versão é apagada do histórico. O histórico agora mostra miniaturas. O padrão quadriculado indica transparência, não faz parte do PNG salvo.

Durante o processamento, as opções ficam bloqueadas e aparece uma barra de atividade, sem porcentagem fictícia. Fechar apenas as Configurações mantém o estúdio funcionando. Fechar o estúdio encerra os processos iniciados por ele.

## Instalar remoção de fundo

É um componente opcional local, sem chave ou cobrança por chamada de API. Ele precisa baixar bibliotecas e um modelo U²-Net uma vez. Na pasta do aplicativo, execute no PowerShell:

```powershell
.\setup-background.ps1
```

O instalador usa o Python portátil já instalado com o ComfyUI, instala rembg 2.0.67 e ONNX Runtime CPU em `runtime/image-tools` (sem substituir os pacotes do ComfyUI) e salva o modelo em `data/background-models`. Os caches ficam em `data`. O download inicial precisa de internet; depois o processamento usa a máquina local. Documentação: [rembg 2.0.67](https://pypi.org/project/rembg/2.0.67/).

Se houver bloqueio de scripts, siga a política permitida no seu computador; não desative controles da organização. Se o componente não estiver instalado, o aplicativo informa isso, sem fingir que removeu o fundo.

O recorte pode falhar em cabelo fino, vidro, transparências e fundos semelhantes ao objeto. A seleção para remoção de objetos nesta versão é retangular, uma área por operação. Para remover várias pessoas, repita sobre o resultado. Não há camadas, pincel de máscara livre, seleção semântica ou garantia de reconstrução perfeita.

## API das novas ações

Use `POST /v1/images/edits`, provedor `local`, com `image` como data URL, um `prompt` não vazio, `size` e `quality` válidos. Acrescente:

- `editAction: "upscale"` e `upscaleTarget: "2x"`, `"fullhd"` ou `"fullhd-portrait"`.
- `editAction: "transform"` e `editStrength` entre 0,05 e 0,8 (padrão 0,25).
- `editAction: "remove-background"` para PNG transparente (componente instalado).
- `editAction: "inpaint"` e `mask` como data URL PNG. Preto preserva; branco reconstrói; cinza mistura. A máscara deve ter as dimensões da referência. O aplicativo produz a máscara e normaliza a orientação EXIF de fotos antes de enviar.

## Verificação e limites

26 testes automatizados passaram. Eles cobrem os contratos e proteções da API, geração/edição com provedores simulados, ampliação sem amostragem generativa, dimensões Full HD, seleção por máscara, composição sobre a referência e isolamento da remoção de fundo em relação à OpenAI/ComfyUI. O executável compilou e a sintaxe Python/PowerShell foi verificada.

O vídeo enviado confirmou a geração local anterior. As novas ferramentas não foram avaliadas visualmente com o motor real neste ambiente; o recorte U²-Net e o preenchimento real ainda precisam dessa avaliação. As mensagens e prévias não representam uma promessa de qualidade perfeita ou equivalente ao ChatGPT.
