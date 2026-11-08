# Implantar Sites ADS no Northflank Sandbox

Objetivo: teste grátis; **não** é produção de assinaturas. Confira os limites
de recursos e possíveis exigências de verificação antes de criar o serviço.

## Importação do GitHub
1. Entre em https://app.northflank.com/ e conecte o GitHub.
2. Crie projeto privado `sites-ads-sandbox`.
3. Create new → Service → Combined; nome `sites-ads-premium`.
4. Repositório: `AnderHonorato/Site-de-Renda-Passiva`.
   Branch: `ander-flow/v1` (não use main).
5. Build: Dockerfile; caminho `/portal/Dockerfile`;
   **Build context: `/portal`**.
6. Networking: HTTP público na porta `8080`, HTTPS fornecido pelo provedor.
7. Recursos: somente os incluídos no plano Sandbox; uma única réplica.
8. Advanced → Persistent volume: Single Read/Write, mount `/data`.
   O tamanho deve caber no limite grátis do plano.
9. Variável obrigatória: `PORTAL_BANCO=/data/portal.sqlite`.
   A imagem já define `PORT=8080`, `NODE_ENV=production` e desativa
   chat e publicidade. A origem HTTPS é descoberta de `NF_HOSTS` quando
   `NF_PROJECT_ID` estiver disponível e houver um único hostname
   `.code.run`. Caso falhe, defina `URL_PUBLICA` para o endereço HTTPS
   exato publicado no painel, sem caminho nem credenciais.
10. Teste `GET /api/saude` (200, `{"estado":"ok"}`), home e login.
    Confira sessão Secure, CSRF, permissões Premium e dados fictícios.

## Restrições
- O servidor se recusa a iniciar sem montagem persistente `/data`.
- Usuário do contêiner: `node:node` (o volume deve permitir escrita).
- API e site usam a mesma origem HTTPS, não CORS entre GitHub Pages e API.
- A cobrança Premium, backups remotos, restauração ensaiada e recuperação
  de senha por e-mail **não estão prontos**. Não cadastrar clientes reais.
- A `main` permanece preservada. Não habilitar recursos pagos fora do Sandbox.
- O Sandbox pode ser inadequado para operação comercial pública.
- Este arquivo **não** criou serviço ou conta Northflank.

## Documentação
- https://northflank.com/docs/v1/application/getting-started/build-and-deploy-your-code
- https://northflank.com/docs/v1/application/databases-and-persistence/add-a-volume
- https://northflank.com/pricing
