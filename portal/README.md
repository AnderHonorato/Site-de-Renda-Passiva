# Portal — versão 1.1.0

O portal escolhido é o da porta **4400**. A identidade visual e as 65 ferramentas prontas foram preservadas. Conta e chat usam uma API separada, na mesma origem através do proxy do portal. O catálogo tem 208 itens; os planejados continuam identificados como planejados.

## Executar

Node 22.14 ou superior. A API não exige dependências npm. O SQLite embutido em Node 22 emite aviso de recurso experimental.

Na pasta `portal`:

```powershell
npm run gerar
npm run dev
```

Abra `http://127.0.0.1:4400/`. O comando inicia site e API, preservando arquivos e banco. A API escuta só em `127.0.0.1:4870`; as páginas usam `/api/` na 4400. Ctrl+C encerra os dois processos. `npm run servir` inicia apenas o site; `npm run api`, apenas a API. O arquivo `.env`, quando existir, é lido pelo comando `dev`.

O comando `dev` habilita o chat local. Em produção o chat fica desligado até `PORTAL_CHAT_PUBLICO=1`; exige as condições do checklist e responsável por moderação. Para LAN ou domínio definitivo, configure `URL_PUBLICA` com a origem exata usada no navegador. Alterações de outra origem são recusadas.

## Conta e administração

Cadastro com e-mail, senha de 12–128 caracteres, @usuário único e declaração de idade. Login, saída, perfil, preferências, exportação e exclusão da conta usam banco próprio. Senhas e tokens de sessão não ficam em localStorage. As ferramentas locais funcionam quando a API cai.

Depois de criar sua conta, conceda a função de administrador **localmente**:

```powershell
npm run admin:criar -- seu-email@exemplo.com
```

Não há senha nem administrador de fábrica. O script concede a função a uma conta ativa existente. O menu da conta oferece moderação, usuários e suporte. Plus/Premium são liberados manualmente, sem preço ou cobrança automática. `/planos.html` descreve a disponibilidade atual.

## Recuperação e armazenamento

Em desenvolvimento, instruções de recuperação são gravadas em `servidor/.execucao/emails/`. O token fica no fragmento `#token`, expira em uma hora e tem uso único. A API não devolve links ou tokens.

Em produção não há SMTP integrado e a recuperação pública retorna indisponível. O operador autorizado pode gerar um link para uma conta existente:

```powershell
npm run admin:recuperar -- seu-email@exemplo.com
```

Esse comando exige `URL_PUBLICA` HTTPS. Entregue o link privadamente ao titular após verificar a identidade; não publique o arquivo de recuperação.

SQLite: `servidor/.execucao/portal.sqlite`, ou o caminho privado `PORTAL_BANCO`. Banco, WAL e e-mails não são publicados nem versionados. Os testes usam bancos temporários. Faça backup privado e teste sua restauração antes de abrir contas ao público. Sessões expiram, trocar/redefinir senha revoga sessões antigas e mensagens são retidas por até 90 dias.

## AdSense

Publicidade vem desligada e sem IDs. Exemplo de `.env` sem credenciais:

```dotenv
PORTAL_ADS_ATIVO=0
PORTAL_ADS_EDITOR=
PORTAL_ADS_RODAPE=
PORTAL_ADS_RESULTADO=
PORTAL_ADS_TESTE=1
```

Editor: `ca-pub-` mais 16 dígitos. Blocos: IDs reais de 6–20 dígitos. Sem configuração, consentimento, autorização da API ou preenchimento, os blocos não ocupam altura nem margem. Posições após o conteúdo de uso e acima do rodapé, longe dos controles. Conta, admin, autenticação, perfis, textos legais, erros, salvos, planos e estudos não recebem anúncios; Plus/Premium também não.

Use apenas blocos manuais no AdSense. Anúncios automáticos/âncoras/vinhetas não fazem parte do formato implementado. A escolha muda em `/cookies.html`. O servidor gera `ads.txt`; HTML autorizado recebe nonce novo e CSP própria. Sem publicidade, mantém a CSP original.

Fontes: [blocos vazios](https://support.google.com/adsense/answer/10762946?hl=en), [posicionamento](https://support.google.com/adsense/answer/1346295?hl=en), [CSP](https://support.google.com/adsense/answer/16283098?hl=en), [consentimento regional](https://support.google.com/adsense/answer/13554116?hl=en). IDs, aprovação, CMP aplicável e anúncio real ainda precisam de validação na conta do proprietário.

## Validar e publicar

```powershell
npm run conferir
npm run testar:api
npm run publicar
```

`publicar` prepara arquivos públicos; não faz deploy nem leva banco/API. Contas exigem os dois processos Node atrás de HTTPS. Hospedagem só estática não entrega login/chat. Quando ligar publicidade, mantenha o proxy Node para HTML com nonce; atualize o Nginx estático antigo antes do deploy.

O exemplo `../documentação/hospedagem/portal-v1.1.conf.exemplo` encaminha também SSE. Use `PORTAL_PROXY_CONFIAVEL=1` somente com proxy local que sobrescreve `X-Forwarded-For` com o IP real; isso permite limites por visitante. Requisições diretas não podem escolher seu IP por cabeçalho.

Estado: `../CHECKLIST.md` e `../documentação/plano-portal-principal.md`.
