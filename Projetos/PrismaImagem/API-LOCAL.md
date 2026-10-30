# PrismaImagem: aplicativo nativo e API própria

O executável agora abre um estúdio nativo C# / Windows Forms, com prompts, seleção de motor, upload, edição, prévia ampliada, download e histórico em arquivos na pasta do aplicativo. Não abre navegador nem depende de WebView2. A interface HTML permanece como alternativa de desenvolvimento.

## Instalar o motor sem chave OpenAI

O modo local usa ComfyUI + Stable Diffusion 1.5, não um modelo treinado por nós. Hardware detectado: RTX 2070, 8 GB de VRAM. O perfil inicial é conservador, sem medição de velocidade. A edição local é img2img com intensidade padrão 0,25, sem a precisão de edição por instruções de modelos especializados; prompts em inglês tendem a funcionar melhor no SD 1.5.

1. Extraia todo o pacote Windows.
2. Na pasta extraída, execute `./setup-local.ps1` no PowerShell. Baixa aproximadamente 6 GB; reserve 20 GB para downloads e extração. Mantém os arquivos em `engines/`, usa curl/tar do Windows e verifica SHA256. Não instala Python global, não altera PATH ou registro.
3. O script usa o [ComfyUI v0.43.0 NVIDIA CUDA 12.6](https://github.com/Comfy-Org/ComfyUI/releases/tag/v0.43.0) e o [checkpoint SD 1.5](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/blob/main/v1-5-pruned-emaonly.safetensors). Consulte as condições CreativeML Open RAIL-M na [página do modelo](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5).
4. Se tar não conseguir extrair o 7z, use um extrator compatível para extrair manualmente em `engines/` e execute novamente o script. Downloads interrompidos usam `.partial` e são retomados.
5. Feche/reabra PrismaImagem.exe. O aplicativo inicia o motor portátil escondido e verifica seu estado. Selecione **Local**. A inicialização pode demorar.

Estrutura relativa ao EXE:

```text
PrismaImagem.exe
app/
runtime/
engines/ComfyUI_windows_portable/
  python_embeded/python.exe
  ComfyUI/main.py
  ComfyUI/models/checkpoints/v1-5-pruned-emaonly.safetensors
data/
  native-history/       imagens PNG e metadados JSON
  credential.bin       somente se cadastrar chave OpenAI opcional
  comfy-input/         referências
  comfy-output/        saídas do motor
```

Você pode instalar esses arquivos manualmente pelos links oficiais acima. O motor iniciado pelo aplicativo é encerrado ao fechar. Um ComfyUI iniciado por você é independente. O aplicativo nativo escolhe uma porta livre para sua API. O servidor fonte usa 3000 e o motor usa 8188; se já houver motor em 8188, o PrismaImagem conecta a ele. O histórico nativo é separado do histórico do navegador.

O modelo e o ComfyUI **não estão incluídos no ZIP**. Os downloads não puderam ser instalados neste ambiente com rede restrita. Não houve teste de inferência real, do instalador de 6 GB ou da interface nativa; a execução do EXE foi bloqueada por Controle de Aplicativo. A compilação e os testes com motor simulado passaram. Não desative proteções do Windows.

## API v1

Endereço do servidor fonte: `http://localhost:3000`, somente loopback. No aplicativo nativo, a porta é escolhida automaticamente e comunicada à janela principal. O aplicativo nativo usa token aleatório por sessão (`Authorization: Bearer <token>`), não exposto na interface nem salvo. Para outros clientes, inicie o servidor fonte e configure seu próprio `PRISMA_API_TOKEN` no ambiente.

| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/v1/health` | Estado de motores e checkpoint |
| POST | `/v1/images/generations` | Gerar imagem |
| POST | `/v1/images/edits` | Transformar referência |

Corpo JSON para geração:

```json
{"provider":"local","prompt":"A glass house in a forest, cinematic light","size":"1024x1024","quality":"medium"}
```

`provider`: local/openai, padrão local. `quality`: low/medium/high (12/20/30 passos locais). Os formatos existentes são preservados no contrato: no modo local, 1024x1024 mapeia para 512x512, 1536x1024 para 768x512 e 1024x1536 para 512x768. A resposta informa a dimensão efetiva em `size`. OpenAI mantém as dimensões do pedido.

Edição: envie também `image` como data URL base64 de PNG/JPEG/WebP, até 10 MB. `negativePrompt` é opcional (até 2000 caracteres), usado no modo local. Resposta: `image` (data URL PNG), `provider`, `model`, `size`. Os endpoints antigos `/api/status` e `/api/images` continuam disponíveis; neste último, envie `mode` como generate/edit.

Exemplo para iniciar o servidor pelo código-fonte:

```powershell
$env:PRISMA_PROVIDER = 'local'
$env:PRISMA_API_TOKEN = 'substitua-por-um-token-aleatorio-seu'
node server.mjs
```

Em outro terminal:

```powershell
$headers = @{ Authorization = 'Bearer substitua-por-um-token-aleatorio-seu' }
$body = @{ provider='local'; prompt='A glass house in a forest'; size='1024x1024'; quality='medium' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/v1/images/generations -Method Post -Headers $headers -ContentType application/json -Body $body
```

O token acima é ilustrativo, substitua-o. Sem `PRISMA_API_TOKEN`, o servidor fonte não tem autenticação adicional além das proteções de loopback/origem. Não publique nem exponha as portas deste MVP na internet.

Configurações do servidor: `COMFYUI_URL` (somente HTTP loopback), `COMFYUI_CHECKPOINT`, `PRISMA_PROVIDER`, `PRISMA_API_TOKEN`. SD 1.5 é detectado automaticamente quando não há checkpoint explícito. Outros modelos não são escolhidos automaticamente, pois podem exigir outro workflow.

O adaptador usa os [contratos oficiais do ComfyUI](https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/basic_api_example.py): upload → fila → histórico → saída PNG. A espera é de aproximadamente dez minutos mais os tempos das requisições; ao expirar, a tarefa pode continuar no motor. Confira a fila antes de reenviar.

Os campos editAction, upscaleTarget, editStrength e mask das novas ferramentas estão descritos em GUIA-ESTUDIO.md. Remoção de fundo usa o worker local de recorte, sem inferência do ComfyUI ou OpenAI.
