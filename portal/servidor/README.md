# API do portal

Requer Node 22.14 ou superior. Inicie com `node portal/servidor/iniciar.mjs`; a API escuta apenas em `127.0.0.1:4870`. O proxy do portal deve encaminhar `/api/*` pela mesma origem. O banco nasce em `portal/servidor/.execucao/portal.sqlite` e essa pasta não entra no Git; configure `PORTAL_BANCO` para outro caminho persistente. Nunca copie um banco antigo do Ander Flow para cá.

Variáveis:

- `URL_PUBLICA`: origem exata pública (padrão local `http://127.0.0.1:4400`), usada para conferir `Origin` e marcar cookies `__Host-` com HTTPS. O modo de nuvem exige HTTPS e rejeita nomes e endereços de loopback; ainda é necessário conferir DNS, certificado e acesso externo antes de publicar.
- `PORTAL_API_PORTA`: porta local da API (padrão `4870`).
- `PORTAL_CHAT_LOCAL=1`: libera chat em desenvolvimento. O padrão é desligado. Em produção, somente `PORTAL_CHAT_PUBLICO=1` libera o chat.
- `PORTAL_ADS_ATIVO=1`, `PORTAL_ADS_EDITOR=ca-pub-...`, `PORTAL_ADS_RODAPE`, `PORTAL_ADS_RESULTADO`, `PORTAL_ADS_LISTA`: configuram slots manuais de anúncios; sem IDs válidos o retorno da API não autoriza anúncios.
- `PORTAL_EMAILS_DIR`: pasta para links de recuperação no desenvolvimento. Em produção, a rota de solicitação responde indisponível até integrar entrega; um operador pode gerar um link local pelo script abaixo.

Não há administrador automático. Após a pessoa criar a própria conta, execute `node portal/scripts-admin/conceder-admin.mjs email@exemplo.com` no host do banco. O script audita a alteração e encerra as sessões anteriores. Para gerar um link de redefinição em produção, use `URL_PUBLICA=https://dominio node portal/scripts-admin/gerar-link-recuperacao.mjs email@exemplo.com` no host do banco e entregue o link por canal privado.

Teste de integração: `node portal/testes/api/fluxo.test.mjs`. Ele cria um banco temporário e cobre cadastro, login, CSRF, chat, amizade, bloqueio, denúncia privada, moderação, SSE, redefinição concorrente, exportação e exclusão.

## Cópia privada do banco

Com Node 22.14 ou superior, um operador com acesso ao banco pode criar uma cópia consistente, incluindo transações já gravadas no WAL, sem interromper a API:

```sh
node portal/scripts-admin/backup-banco.mjs /caminho/absoluto/portal.sqlite /pasta/privada/backup-novo.sqlite
```

O destino deve ser um arquivo novo, em uma pasta privada existente fora do repositório. O comando reserva o arquivo sem sobrescrever outro, solicita permissões `0600` em sistemas POSIX e verifica a cópia com `quick_check`. Em Windows, configure e confira as permissões da pasta e do arquivo (ACL) antes do uso. Um erro pode deixar uma cópia incompleta, que não deve ser usada. O backup contém dados privados e credenciais derivadas: guarde-o em local protegido e criptografado, separado do volume ativo, com acesso limitado e política de retenção definida pelo operador. Não envie a cópia ao Git ou a uma pasta pública. O comando não faz upload nem agenda cópias.

Antes de depender de uma cópia, ensaie a recuperação em ambiente isolado: abra uma cópia do backup em um banco separado, confira `PRAGMA integrity_check`, as tabelas e os fluxos essenciais com dados de teste. Para recuperação real, planeje a parada da aplicação, preserve o banco e seus arquivos WAL/SHM originais e siga um procedimento específico do ambiente; nunca copie um banco por cima de uma instância ativa. Ainda não há backup remoto, criptografia, frequência, retenção ou restauração em produção configurados.

## Preparação Docker / Railway
Os arquivos portal/Dockerfile, portal/railway.json e
portal/documentacao/implantacao-railway.md descrevem a implantação.
GET /api/saude retorna apenas estado do SQLite. A partida em nuvem recusa
banco temporário e requer montagem persistente em /data.
