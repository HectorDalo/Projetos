# HD Clientes — edição Local 3.0.1

## Começar

1. Copie **HDClientes-Local-3.0.1.exe** para a pasta em que deseja manter o programa, por exemplo, `E:\Aplicativos\HDClientes`. Não é necessário instalar Python, XAMPP ou outro banco no computador que vai usar o aplicativo.
2. Abra o executável. No primeiro acesso, crie um usuário administrador e uma senha de pelo menos 12 caracteres. Não existe senha padrão.
3. Entre com essa conta. Em **Administração → Usuários e permissões**, crie as contas de quem vai usar o sistema. Recomendamos manter um segundo administrador responsável para recuperação de acessos.
4. Para trazer os clientes da versão anterior, use **Administração → Importar JSON antigo…** e escolha o `clientes.json` da pasta original. Confira a quantidade antes de confirmar. O JSON original não é alterado. Se houver telefone ou e-mail repetido, a importação é cancelada por inteiro, sem adicionar parte dos registros.
5. Faça um cadastro fictício, altere-o, teste a busca, a lixeira e a recuperação de um backup antes de usar dados reais.

O sistema funciona offline, exceto pelo botão opcional **Buscar CEP**, que envia somente o CEP ao ViaCEP.

## Perfis de acesso

| Ação | Operador | Administrador |
|---|---|---|
| Consultar, cadastrar e editar clientes | Sim | Sim |
| Alterar a própria senha | Sim | Sim |
| Excluir e recuperar clientes | Não | Sim |
| Exportar CSV | Não | Sim |
| Criar e restaurar backups manualmente | Não | Sim |
| Importar JSON, configurar segunda cópia | Não | Sim |
| Gerenciar usuários e consultar histórico | Não | Sim |

As permissões são verificadas no serviço de dados, além dos botões da interface. A conta é temporariamente bloqueada por cinco minutos após cinco tentativas de senha incorretas. Senhas são guardadas como hashes PBKDF2-HMAC-SHA256 com salt individual e 600 mil iterações, nunca como texto puro.

Use **Minha conta → Bloquear sessão** ao sair da mesa. Após 15 minutos sem interação, a janela é ocultada e exige a senha do mesmo usuário. O formulário não salvo permanece em memória durante o bloqueio; fechar a tela de entrada encerra o aplicativo.

Um administrador pode redefinir a senha de outra conta informando sua própria senha. Não há senha mestra nem recuperação remota. Sem acesso a nenhum administrador, a recuperação exige suporte e verificação do responsável; não há botão para contornar a autenticação.

## Onde ficam os dados

Os dados ficam separados do executável, em `%LOCALAPPDATA%\HDClientes\Local`, no perfil do Windows que abriu o aplicativo. **Administração → Abrir pasta dos dados** mostra o local exato.

- `clientes.sqlite3`: banco de dados.
- `clientes.sqlite3-wal` e `clientes.sqlite3-shm`: arquivos auxiliares do SQLite, quando presentes. Não os apague nem copie o banco manualmente durante o uso.
- `backups`: cópias consistentes feitas pelo aplicativo.
- `aplicativo.log`: diagnóstico de erros inesperados, com limite de tamanho e rotação.

Atualizar ou mover o `.exe` não move nem apaga os dados. Usuários diferentes do Windows têm pastas de dados diferentes. Esta edição não compartilha a base pela rede. O aplicativo impede abrir duas janelas do mesmo banco na mesma sessão do Windows e verifica conflitos de edição no banco.

Para manutenção avançada, `--dados "E:\DadosHD\clientes.sqlite3"` seleciona outro banco local. Mantenha sempre o mesmo caminho ao abrir o aplicativo. Não aponte para uma pasta de rede ou base sincronizada em uso.

## Backup pela interface

Os botões ficam no topo do painel direito, logo abaixo de **Seus clientes**.

- **Criar backup:** guarda um arquivo SQLite consistente. Inclui os dados, contas e histórico existentes naquele instante. Alterações não salvas do formulário não entram no backup.
- **Abrir pasta:** mostra as cópias disponíveis.
- **Restaurar clientes…:** substitui os clientes ativos pelos do arquivo escolhido e guarda uma cópia do banco atual antes da troca. A lixeira é substituída na restauração; para recuperar o estado anterior, use o backup feito antes da troca. **As contas, senhas, configurações e o histórico atuais não são substituídos.** Também aceita o JSON antigo como origem de clientes.

O aplicativo faz um backup automático antes da primeira alteração de clientes de cada dia. Ele não substitui a rotina de cópias externas da empresa.

Em **Administração → Configurar segunda cópia do backup…**, escolha uma pasta acessível, preferencialmente em outro disco ou dispositivo. As novas cópias passam a ser gravadas nos dois destinos. Se o destino configurado estiver indisponível, o backup informa a falha; a primeira alteração do dia é bloqueada até a cópia ser concluída. Reconecte o destino ou configure outro. O administrador também pode usar **Desativar segunda cópia do backup…**; nesse caso, apenas os backups locais continuarão ativos.

As cópias não são apagadas automaticamente. Acompanhe o espaço em disco e guarde versões conforme a política da empresa. Backups incluem hashes de senhas e dados de clientes: mantenha acesso restrito. Teste periodicamente a recuperação usando um banco de teste, sem substituir os dados de produção.

## Histórico e lixeira

**Administração → Histórico de alterações** mostra os últimos 500 eventos: quem entrou, criou ou alterou clientes, excluiu, restaurou, exportou, fez backup ou gerenciou usuários. Não mostra senhas nem os valores anteriores de cada campo. O histórico é operacional e não constitui prova de auditoria inviolável.

**Administração → Lixeira de clientes** recupera exclusões sem restaurar o banco inteiro. Se telefone ou e-mail já estiverem em uso, a recuperação é recusada até resolver o conflito.

## Atualizar e distribuir

Feche o aplicativo, preserve os backups e substitua somente o executável por uma versão compatível. Os dados permanecem na pasta do usuário. O banco possui identificação do produto e versão de esquema para impedir abrir inadvertidamente arquivos de outro sistema.

Esta entrega é um executável portátil, sem instalador, assinatura digital ou atualizador automático. Para distribuição comercial ampla, prepare assinatura digital, instalador, processo de atualização e suporte, e valide o aplicativo nos computadores e na rotina de cada empresa. Não ignore avisos de segurança do Windows; encaminhe o arquivo para verificação quando necessário.

## Limites desta entrega

- Preparada para cadastro local em um computador, não para várias máquinas compartilhando clientes. A edição Equipe com servidor ainda não foi implementada.
- O banco, os backups e o CSV não são criptografados pelo aplicativo. O login controla as ações dentro do programa; alguém com acesso aos arquivos pelo Windows pode lê-los ou alterá-los. Use uma conta do Windows protegida, acesso restrito à pasta e proteção do disco conforme a estrutura da empresa.
- Não inclui vendas, estoque, emissão de notas, integração fiscal ou conformidade legal automática.
- Testes automatizados e diagnóstico do executável não substituem homologação da empresa, teste em outro computador e revisão independente de segurança.

## Desenvolvimento no projeto original

O projeto original foi atualizado. `banco.py` contém a edição SQLite; `acesso.py` contém as telas administrativas; `interface.py` mantém o formulário; `main.py` conserva validações e o leitor JSON legado para migração. `Iniciar.pyw` e `main.py` abrem a edição com login. O modo terminal antigo não é mais o ponto de entrada.

As ferramentas de compilação estão em `E:\Codex\CadastroClientes\ambiente`. O projeto inclui `Compilar.ps1` para reconstruir o executável. Nenhum cadastro ou credencial real é incluído no pacote de distribuição.
