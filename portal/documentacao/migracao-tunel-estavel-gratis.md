# Sites ADS — Migração para HTTPS gratuito com URL estável (Windows AS)

**Situação em 11/11/2026:** implantado no perfil Windows AS, com verificação
HTTPS externa no GitHub Actions, formulário de cadastro/login e perfil
testados no Chrome. Domínio atribuído: **https://wise-oak-d24294b5.tunnl.gg/**
O endereço estável pode ficar temporariamente offline quando o PC estiver
desligado, sem internet ou durante reconexão do túnel.
A API Node e o SQLite ficam no PC; GitHub Pages continua hospedando a vitrine gratuita.

## Provedor escolhido

[tunnl.gg](https://tunnl.gg/stable-urls): túnel HTTPS gratuito, sem cadastro nem cartão.
O servidor atribui um hostname `*.tunnl.gg` estável vinculado à chave SSH do usuário.
A chave privada permanece somente em `%LOCALAPPDATA%\\SitesAdsTeste\\chave-ssh-tunnl`.
O arquivo de contas do sistema **não deve ser copiado ou substituído**:
`%LOCALAPPDATA%\\SitesAdsTeste\\portal.sqlite`.

**Limites atuais do plano gratuito:** 3 túneis/IP, 5 GB/dia, 2 h sem tráfego,
24 h no máximo por conexão, aviso anti-phishing para cada navegador (1 vez
por semana para hostname estável), limites de taxa.
O supervisor realiza reconexão automática a cada falha. **Não é infraestrutura de produção.**
Documentação: https://tunnl.gg/docs

## Procedimento para execução pelo Remote Desktop Commander

No PC AS, com o repositório atualizado na branch `ander-flow/v1`:

1. Verificar que o serviço antigo usa apenas os processos de Sites ADS. Encerrar
   **somente** `supervisor.mjs`, `servidor/iniciar.mjs`,
   `ferramentas/servir.mjs` da pasta `Sites-ADS-Teste` e o `cloudflared.exe`
   criado para a porta 4418. **Nunca alterar processos ou inicialização do perfil Lil.**
2. Abrir no Node 22+ `node portal/ferramentas/configurar-tunel-estavel.mjs --instalar`
   uma única vez, no usuário AS. Ele cria a chave SSH privativa com ACL do usuário
   e troca o valor `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SitesADS-Teste-AS`
   para iniciar o lançador invisível `iniciar-tunel-estavel-oculto.vbs`.
3. Executar `wscript.exe portal/ferramentas/iniciar-tunel-estavel-oculto.vbs`.
   Sem PowerShell persistente nem janela de terminal.
4. Conferir `%LOCALAPPDATA%\\SitesAdsTeste\\estado.json` até
   `"fase":"online"`, bem como `endereco-atual.txt`.
   A página fixa do GitHub Pages já consulta o Gist público de endpoint e
   passará a reconhecer o hostname `*.tunnl.gg`.
5. Testar **por conexão externa** home, cadastro, sessão, logout,
   API `/api/saude`, permissões Premium e redirecionamento da página fixa.
   Não compartilhar URL até confirmar esses testes.

O processo usa apenas `127.0.0.1:4418` (site) e `127.0.0.1:4888` (API)
e não modifica portas do roteador.
A chave SSH não deve ser enviada ao GitHub nem compartilhada por mensagem.
O primeiro handshake do OpenSSH usa `StrictHostKeyChecking=accept-new`
(Trust On First Use). Verificar a identidade do servidor SSH com o fornecedor
antes de usar informações sensíveis.

**Aviso para usuários:** ambiente de testes públicos, não processar dados
reais de clientes, meios de pagamento ou dados protegidos antes da migração
para infraestrutura segura de produção. Conta gratuita do túnel pode exibir
aviso intermediário no navegador. Não incluir credenciais no CSV.

## Contingência

Se o PC AS ficar offline ou o serviço de túnel indisponível, a página
`servidor-teste.html` informa a indisponibilidade e oferece a vitrine
estática, cujas ferramentas locais seguem funcionando. Não apontar usuários
para o último hostname Cloudflare que estava falhando.

Se o tunnl.gg indisponibilizar contas/limites, reavaliar **ngrok gratuito**
(com conta e domínio dev fixo), **Tailscale Funnel** (com tailnet configurada),
ou backend gerenciado com banco persistente. Não hospedar SQLite de contas num
filesystem efêmero do Render Free.

## Auditoria da mudança

- Backup SQLite verificado: `%LOCALAPPDATA%\\SitesAdsTeste\\portal-antes-tunel-estavel.sqlite`
  (2 contas existentes no momento do backup).
- Chave do túnel: gerada no perfil **AS**, sem envio ao repositório.
- Inicialização automática: valor HKCU `SitesADS-Teste-AS` aponta para
  `iniciar-tunel-estavel-oculto.vbs`; não afeta o perfil Lil.
- Supervisor anterior e serviço Cloudflare de testes: encerrados, sem
  remover dados de contas. Novo supervisor oferece reconexão com a mesma chave.
- Gist público antigo reutilizado para publicar somente o URL atualizado:
  `a888f4b63bc461e46552e3b651f1102e`.
- A página fixa `/portal/servidor-teste.html` redireciona ao tunnl.gg
  e informa a indisponibilidade caso o Gist ainda aponte ao Cloudflare antigo.
- [Execução de teste HTTPS no GitHub Actions](https://github.com/AnderHonorato/Site-de-Renda-Passiva/actions/workflows/verificar-tunel-estavel.yml).
- O aviso inicial do túnel gratuito diz explicitamente que o site
  roda num computador particular. **Não usar senhas reutilizadas, dados
  financeiros, nem informações pessoais reais nesse ambiente de testes.**
- Validação pós-migração: cadastrado usuário fictício, verificados cookie de
  sessão, navegação autenticada, salvamento de perfil e exclusão do usuário QA.

## Atenção antes de lançar o site para clientes

Túnel com aviso de phishing, limite de dados, PC doméstico, banco local e
inatividade não equivalem a hospedagem de produção. Para monetizar
e aceitar cadastros reais publicamente, migrar API e banco para
infraestrutura com HTTPS, políticas de acesso, backups e monitoramento
permanentes. O Github Pages permanece disponível para funções locais grátis.
