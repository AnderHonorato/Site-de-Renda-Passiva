# API do portal

Backend mínimo para transformar o portal estático em uma aplicação com conta, histórico e persistência.

## Dependências

Na raiz:
`npm install`

Depois:
`cd backend`
`npm install`
`copy .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
`npm run prisma:generate`
`npm run prisma:migrate -- --name inicial`

## Desenvolvimento

`npm run dev`

API: `http://127.0.0.1:4490`
Saúde: `GET /health`

## Login social

O schema já suporta Google, Apple e X. As variáveis OAuth ficam no `.env`. O próximo adaptador de produção deve validar o código/token no provedor e somente então criar/atualizar `User` + `Session`. Não coloque segredo OAuth no JavaScript do navegador.

## Banco

Prisma + SQLite no desenvolvimento. Para produção, altere o datasource para PostgreSQL e use uma `DATABASE_URL` gerenciada. Arquivos de banco e `.env` nunca devem entrar no Git.

## Histórico

`POST /api/recent` registra ferramenta vista e `GET /api/recent` devolve as últimas 12. `POST /api/downloads` registra o arquivo gerado e `GET /api/downloads` lista o histórico da conta.

O armazenamento binário do arquivo é propositalmente separado do banco: em produção use storage de objetos. Guardar PDFs dentro do SQLite seria uma bela maneira de transformar um banco pequeno num porão cheio de caixas.