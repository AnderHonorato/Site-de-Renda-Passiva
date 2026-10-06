# API do portal

Requer Node 22.14 ou superior. Inicie com `node portal/servidor/iniciar.mjs`; a API escuta apenas em `127.0.0.1:4870`. O proxy do portal deve encaminhar `/api/*` pela mesma origem. O banco nasce em `portal/servidor/.execucao/portal.sqlite` e essa pasta não entra no Git; configure `PORTAL_BANCO` para outro caminho persistente. Nunca copie um banco antigo do Ander Flow para cá.

Variáveis:

- `URL_PUBLICA`: origem exata pública (padrão local `http://127.0.0.1:4400`), usada para conferir `Origin` e marcar cookies `__Host-` com HTTPS.
- `PORTAL_API_PORTA`: porta local da API (padrão `4870`).
- `PORTAL_CHAT_LOCAL=1`: libera chat em desenvolvimento. O padrão é desligado. Em produção, somente `PORTAL_CHAT_PUBLICO=1` libera o chat.
- `PORTAL_ADS_ATIVO=1`, `PORTAL_ADS_EDITOR=ca-pub-...`, `PORTAL_ADS_RODAPE`, `PORTAL_ADS_RESULTADO`, `PORTAL_ADS_LISTA`: configuram slots manuais de anúncios; sem IDs válidos o retorno da API não autoriza anúncios.
- `PORTAL_EMAILS_DIR`: pasta para links de recuperação no desenvolvimento. Em produção, a rota de solicitação responde indisponível até integrar entrega; um operador pode gerar um link local pelo script abaixo.

Não há administrador automático. Após a pessoa criar a própria conta, execute `node portal/scripts-admin/conceder-admin.mjs email@exemplo.com` no host do banco. O script audita a alteração e encerra as sessões anteriores. Para gerar um link de redefinição em produção, use `URL_PUBLICA=https://dominio node portal/scripts-admin/gerar-link-recuperacao.mjs email@exemplo.com` no host do banco e entregue o link por canal privado.

Teste de integração: `node portal/testes/api/fluxo.test.mjs`. Ele cria um banco temporário e cobre cadastro, login, CSRF, chat, amizade, bloqueio, denúncia privada, moderação, SSE, redefinição concorrente, exportação e exclusão.
