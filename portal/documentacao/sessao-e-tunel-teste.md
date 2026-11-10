# Sessão e hospedagem de testes Sites ADS

- O endereço GitHub Pages é uma **vitrine estática**; não hospeda Node.js nem
  cadastro. Suas páginas de entrar/criar conta redirecionam ao
  `servidor-teste.html`, que lê o endereço atual do túnel pelo Gist.
- Cookies de sessão são `HttpOnly`, `Secure`, `SameSite=Lax` e **restritos
  ao hostname exato** (`__Host-sessao`). Não compartilhe cookies ou credenciais
  entre o domínio do GitHub Pages e o túnel.
- O Cloudflare Quick Tunnel (`trycloudflare.com`) pode trocar hostname
  quando reinicia. Ao trocar, o navegador **precisa fazer login de novo**.
  Isso não significa perda de conta: usuários ficam no SQLite persistente
  local, separado em `%LOCALAPPDATA%\\SitesAdsTeste\\portal.sqlite`.
- Login e cadastro agora validam uma consulta de sessão posterior ao
  recebimento dos cookies. Se o navegador recusá-los, mostram mensagem
  explícita, não um falso sucesso. Navegar para formulário já autenticado
  redireciona para a conta.
- Cabeçalho revalida a sessão ao retomar aba congelada pelo navegador e
  quando recebe evento de autenticação. Não deve manter os botões de
  visitante se a sessão for reconhecida.
- A solução permanente para sessões que sobrevivem a reinícios do túnel
  é um **domínio de aplicação estável** (por exemplo serviço Blitz ativo
  com armazenamento persistente, ou túnel nomeado associado a domínio
  devidamente controlado). Não copie tokens para localStorage para contornar.
- Esta instância de PC é um teste, não processamento de dados sensíveis nem
  produto pago de produção. Backups, recuperação de senha e infraestrutura
  de disponibilidade ainda exigem implementação antes de cadastro público.

Teste automático: `node --test testes/sessao-cliente.test.mjs
testes/redirecionamento-autenticacao.test.mjs`. Depois, testar no navegador
cadastro → conta → home → ferramentas → voltar, no mesmo hostname.
