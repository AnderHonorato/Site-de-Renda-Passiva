# Portal de Ferramentas do Ander

Camada unificada para os seis produtos existentes do repositório. O portal não substitui as ferramentas atuais: ele organiza, busca e cria um ponto único de entrada.

## O que já funciona

- busca instantânea por nome, categoria e descrição;
- filtros por categoria;
- 49 ferramentas reais agrupadas em seis áreas;
- histórico local de vistos recentemente;
- faixa de avisos rolante;
- banners rotativos a cada 30 segundos;
- animações suaves ao rolar com respeito a `prefers-reduced-motion`;
- modal de boas-vindas na primeira visita;
- ajuda rápida;
- atalho `/` para focar a busca;
- dicas flutuantes periódicas;
- layout responsivo para celular e computador;
- rotas preparadas para Google, Apple e X sem simular login quando o backend não estiver configurado;
- schema Prisma para usuários, contas OAuth, sessões, recentes, downloads e preferências.

## Instalar dependências

Entre na pasta do portal:

```bash
cd portal
npm install
```

Para gerar o cliente Prisma:

```bash
npm run prisma:generate
```

## Executar

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:4480/
```

O healthcheck fica em:

```text
http://127.0.0.1:4480/api/health
```

## Encerrar / liberar a porta 4480

```bash
npm run kill
```

No Windows o script localiza o PID que está ouvindo a porta e encerra somente esse processo.

## Prisma

Copie `.env.example` para `.env` e preencha `DATABASE_URL` antes de criar migrações.

```bash
npm run prisma:migrate
```

Abrir o banco visualmente:

```bash
npm run prisma:studio
```

O schema está em `prisma/schema.prisma`.

## Login Google, Apple e X

A interface e o contrato das rotas já estão preparados, porém OAuth não é considerado ativo até existir backend com os callbacks reais e as credenciais dos provedores. O portal consulta `/api/auth/status` e informa claramente quando a integração ainda não está ativa.

Variáveis previstas:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`
- `AUTH_APPLE_ID` e `AUTH_APPLE_SECRET`
- `AUTH_X_ID` e `AUTH_X_SECRET`

Nunca envie `.env` real para o Git.

## Histórico de downloads

O banco já possui o modelo `Download`. A próxima camada de integração deve chamar o backend somente depois que o arquivo for realmente gerado/baixado, registrando nome do arquivo, tipo, tamanho e ferramenta de origem. Até essa integração ser concluída, nenhuma entrada fictícia é mostrada ao usuário.

## Publicação

### GitHub Pages

A parte estática do portal pode ser publicada em `/portal/`. O Prisma e o login não funcionam em GitHub Pages porque exigem servidor.

### Deploy completo

Para conta, Prisma e sincronização de downloads, publique o portal em um ambiente Node com PostgreSQL e configure as URLs de callback OAuth do domínio final.

## Próximas ondas

1. integrar registro real de downloads nos módulos compartilhados de PDF, XLSX, SVG e ZIP;
2. implementar backend OAuth real e sessões;
3. sincronizar `recentes` local com Prisma quando houver conta;
4. adicionar tela de downloads do usuário;
5. adicionar editor visual com prévia para recorte de imagem/PDF e confirmação antes de baixar;
6. ampliar o catálogo sem criar páginas vazias ou ferramentas de fachada;
7. executar auditoria visual em mobile e desktop antes de integrar ao `main`.
