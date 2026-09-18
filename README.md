# Sites de Renda Passiva

Portal de ferramentas úteis em PT-BR, com seis produtos independentes e uma base comum.

## Estado da arquitetura

O frontend continua estático e roda no navegador. A partir desta versão, existe uma API opcional em `backend/` para recursos que realmente precisam de servidor: contas, sessões, histórico de downloads, vistos recentes, avisos e banners. A persistência usa Prisma.

> O login social Google, Apple e X está preparado no modelo e nas variáveis de ambiente. A validação OAuth de produção depende das credenciais dos respectivos provedores; nunca coloque client secret no frontend.

## Dependências

Requisitos:
- Node.js 20+
- npm

Frontend:

```bash
npm install
npm run preparar
npm run sincronizar
```

Backend:

```bash
cd backend
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name inicial
npm run dev
```

API local: `http://127.0.0.1:4490`

## Desenvolvimento

Raiz:

```bash
npm run gerar
npm run testar
npm run verificar
npm run construir
```

Para rodar um produto específico, entre na pasta dele e use seu `npm run servir`.

## Encerrar processos

PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 4311,4312,4313,4314,4315,4316,4490 -ErrorAction SilentlyContinue |
  Select-Object OwningProcess,LocalPort |
  Sort-Object LocalPort

Stop-Process -Id <PID> -Force
```

CMD:

```cmd
netstat -ano | findstr ":4311 :4312 :4313 :4314 :4315 :4316 :4490"
taskkill /PID <PID> /F
```

Não mate processos aleatórios: o Windows já tem drama suficiente.

## Prisma

O schema fica em `backend/prisma/schema.prisma`.

Desenvolvimento usa SQLite:

```
DATABASE_URL="file:./dev.db"
```

Produção deve usar PostgreSQL ou outro banco gerenciado compatível. O banco guarda metadados e relações. PDFs, imagens e outros binários devem ficar em storage de objetos, com apenas a referência armazenada em `Download.storageKey`.

## Login e conta

O backend possui:
- User
- Session
- Download
- RecentView
- Notice
- Banner

A home pode consumir `/api/recent` para vistos recentes. A página de downloads pode consumir `/api/downloads`. Avisos e banners podem vir de `/api/notices` e `/api/banners`.

Para OAuth real, configure:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
PUBLIC_BASE_URL=
SESSION_SECRET=
```

O fluxo de produção deve validar o retorno do provedor no servidor, localizar/criar o usuário, criar uma sessão e devolver somente um token de sessão seguro.

## Publicação

Frontend estático:

```bash
npm run construir
```

O pacote publicável de cada produto é gerado em sua pasta `publicação/`.

Backend:
1. Escolha um host Node.
2. Configure as variáveis do `.env`.
3. Use PostgreSQL em produção.
4. Execute `npm run prisma:generate`.
5. Execute a migração de produção.
6. Inicie com `npm start`.
7. Coloque HTTPS e um proxy reverso na frente da API.
8. Configure CORS apenas para os domínios reais dos seis sites.

## UX Plus

As regras detalhadas estão em `documentação/UX-PLUS.md`. A lista completa de evolução está em `documentação/100-funcionalidades.md`.

Princípio central:

**o usuário precisa entender o que a ferramenta faz, enviar o arquivo, ajustar visualmente, conferir o resultado e só então baixar.**

Recursos planejados/implementados nesta linha:
- ajuda contextual por ferramenta;
- dicas flutuantes;
- notificações em faixa horizontal com modal;
- banners finos configuráveis, carrossel de 30 s, hover/swipe;
- ferramentas similares;
- vistos recentemente;
- boas-vindas;
- FAQ;
- animações de entrada no scroll com respeito a `prefers-reduced-motion`;
- processamento visual e estado “arquivo pronto para download”;
- editores visuais para recorte de imagem/PDF;
- histórico de downloads por conta;
- identidade visual consistente em PDF/Excel.

## Segurança

Nunca versionar `.env`, banco SQLite de desenvolvimento, tokens ou client secrets. Em produção, valide autenticação no servidor, limite uploads, gere nomes de arquivos seguros e use autorização por usuário para downloads.

## Estrutura

- `compartilhado/`: base comum dos seis produtos.
- `1. Ferramentas para confeitaria/` até `6. Moldes de caixas e embalagens/`: produtos.
- `backend/`: API opcional + Prisma.
- `documentação/`: arquitetura, UX e roadmap.

Licença: © 2026 Anderson.