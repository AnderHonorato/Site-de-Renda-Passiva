# Implantação Sites ADS no Railway (sem contratação automática)

Esta configuração prepara um backend com site e API **na mesma origem HTTPS**.
GitHub Pages continua somente uma prévia estática: cookies Secure e proteção CSRF
do backend não devem ser contornados usando CORS amplo.

## Pré-requisitos

1. Criar um projeto **separado** para Sites ADS (não reutilizar serviços existentes).
2. Conectar o repositório AnderHonorato/Site-de-Renda-Passiva na branch ander-flow/v1,
   configurar Root Directory /portal e Dockerfile Dockerfile.
3. Anexar **volume persistente /data**. Nunca guardar SQLite em disco efêmero.
4. No painel secreto do provedor, configurar:
   - NODE_ENV=production
   - PORTAL_BANCO=/data/portal.sqlite
   - URL_PUBLICA=https://DOMINIO-REAL-DO-SERVICO (sem barra final)
   - PORTAL_CHAT_LOCAL=0 e PORTAL_CHAT_PUBLICO=0
   - PORTAL_ADS_ATIVO=0 e PORTAL_ADS_TESTE=0
   - PORT fornecida pelo provedor (normalmente 8080)
5. Confirmar HTTPS e GET /api/saude (HTTP 200, {"estado":"ok"}).
6. Testar cadastro, login, cookies Secure, CSRF, usuários Gratuito/Plus
   bloqueados em rotas Premium e permissões de administrador.
7. Configurar cópias criptografadas fora do volume, agendamento, retenção,
   alerta de falhas e ensaio isolado de restauração.
8. Preparar recuperação de conta em produção, suporte e termos legais antes
   de abrir cadastros reais. A recuperação automática por e-mail ainda não existe.

A assinatura paga e o gateway de cobrança **ainda não existem**. Não anuncie
cobrança automática ou funcionalidade Premium habilitada apenas no Pages.

## Restrições e proteção

- Uma réplica por volume SQLite. Não escalar horizontalmente o banco local.
- API só escuta loopback e servidor encaminha /api/* na mesma origem.
- Processo exige volume montado distinto da raiz efêmera (/proc/self/mountinfo).
- Em Railway compara RAILWAY_VOLUME_MOUNT_PATH e verifica permissão de escrita.
- Imagem roda como usuário node não privilegiado; o volume precisa ser gravável.
- O endpoint /api/saude confirma uma consulta SQLite, não backups nem
  segurança operacional completa.
- O script scripts-admin/backup-banco.mjs não agenda nem envia backups.
- Confirme custos do servidor, volume e saída de dados antes de contratar.
- Nenhuma implantação, volume, domínio ou cobrança é criado por este commit.
