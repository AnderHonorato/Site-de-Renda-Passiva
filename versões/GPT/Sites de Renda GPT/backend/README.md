# Conta, downloads e Prisma — preparação de integração

O portal em `portal/` é estático e processa os arquivos localmente. Por isso, os botões de Google, Apple e X ficam deliberadamente desativados: não há servidor OAuth, segredo, URL de retorno ou banco configurados nesta cópia.

O esquema em `../prisma/schema.prisma` prepara quatro entidades: usuário, vínculo OAuth, sessão e download. Um backend futuro deve:

1. instalar `prisma`, `@prisma/client` e um provedor de autenticação no serviço de aplicação;
2. criar um PostgreSQL privado e definir `DATABASE_URL` fora do repositório;
3. configurar credenciais e callbacks de Google, Apple e X no provedor e no ambiente de produção;
4. rodar `npx prisma migrate dev --name conta-downloads` no ambiente de desenvolvimento;
5. guardar somente resultado que o usuário escolher enviar, com URL assinada, expiração e exclusão; nunca armazenar automaticamente arquivos de ferramenta;
6. exigir sessão e autorização por `usuarioId` ao listar, baixar ou excluir histórico;
7. exibir o retorno de login e o histórico apenas após esses testes de ponta a ponta.

Não adicione segredos, tokens nem arquivos `.env` ao ZIP ou Git.
