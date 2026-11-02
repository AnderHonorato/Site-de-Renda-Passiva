# Checklist do Ander Flow

Legenda: `[x]` feito e testado · `[~]` em andamento · `[ ]` falta · `[!]` problema/decisão. Item só vira `[x]` depois de testado.

## Fundação (Onda 0–1)
- [x] Branch `ander-flow/v1`, esqueleto de pastas, `package.json` com scripts em português
- [x] `.gitignore`, `.env.exemplo`
- [x] Contratos (`docs/contratos.md`), decisões (`docs/decisoes.md`), propriedade (`.orquestracao/propriedade.json`)
- [x] Dependências instaladas: Express 5, better-sqlite3, helmet, compression, pdf-lib, SheetJS 0.20.3 (CDN oficial), Playwright
- [!] Playwright usa o Edge instalado (sem baixar Chromium) — ver decisões 7
- [x] Esquema do banco (migração 001) escrito
- [x] Verificador de propriedade
- [x] Servidor com porta livre automática (4870–4889, nunca 3000 etc.), PID e parar seguro
- [x] Montador de páginas com inclusões, tradução no servidor e acesso por página
- [x] Catálogo gerado dos manifestos; contagens calculadas
- [x] Banco: conexão, migrador, sementes, `admin:criar` sem senha padrão
- [x] Sistema visual: tokens claro/escuro, fontes locais, componentes, ícones em sprite
- [x] Idioma PT-BR/EN no servidor e no navegador, sem piscar
- [x] Tema claro/escuro sem piscar, botão acessível
- [x] Verificadores: nomes, idiomas, textos fixos, propriedade (os três de conteúdo APROVADO)

- [x] Página de erro 404/403/429/500 traduzida; chave `erro.{codigo}.*` resolvida também no navegador (corrigido na Onda 3)
- [!] Worktrees automáticos nasceram num commit antigo; agentes corrigiram ou foram refeitos em worktree criado pelo orquestrador

## Segurança
- [x] CSP estrita sem `unsafe-inline`/`unsafe-eval`, cabeçalhos
- [x] Limite de tráfego por grupo + bloqueio progressivo persistido (1 min → 24 h)
- [x] 429 com `Retry-After` e página traduzida (pt-BR e en)
- [x] CSRF duplo em toda rota que altera
- [x] Sessão HttpOnly/SameSite/Secure, token com hash, expiração e revogação
- [x] scrypt nativo; nenhuma senha padrão
- [x] Corpo máx. 100 kB, timeouts, tamanho de cabeçalho
- [x] Plano e admin verificados no servidor (403 sem admin; cotas e recurso Plus recusados pela API)

## Funcionalidades (Onda 2)
- [x] Autenticação: criar conta, entrar, sair, recuperar e redefinir senha
- [x] Conta: dados, idioma/tema, senha, exportar dados, excluir conta (LGPD)
- [x] Favoritos/Salvos (local e conta, juntar sem substituir, limite do plano) e Trabalhos
- [x] Avisos do sistema, popup administrável, mensagens com o admin
- [x] Planos (Grátis e Plus, pagamento "em breve"; admin libera o Plus manualmente)
- [x] Páginas: Início, Catálogo, Planos, Privacidade, Termos, Cookies, 404/403/429/500
- [x] Páginas: Entrar/Criar conta, Recuperar senha, Conta, Avisos, Trabalho, Salvos
- [x] Ferramentas: Preço de venda (74,41), Ponto de equilíbrio (200 un.), Margem de contribuição (38,40), Contador de texto
- [x] Ferramentas: Juntar PDF, Limpar planilha (em etapas)
- [x] Admin: ferramentas, usuários, avisos e mensagens, bloqueios de tráfego (troca de plano gravada em registros_admin)

## Acabamento (Onda 3)
- [x] Manifestos das ferramentas planejadas
- [x] Inglês completo (paridade de chaves, 22 arquivos)
- [x] Testes de unidade e integração: 387 (386 passam, 1 pulado)
- [x] Testes visuais: 96 combinações (12 telas × 1440/390 × claro/escuro × pt-BR/en) sem erro de console, CSP, 5xx ou chave crua + 5 de teclado — 101/101
- [x] README completo (15 seções; comando inventado `verificar:idiomas` removido na revisão; caminho longo no Windows documentado)

## Integração, debate e entrega (Ondas 4–6)
- [x] Instalação limpa num clone novo: `npm install` (14 s), migrar, semear, verificar e testar sem falhas
- [x] Porta: com a 4870 ocupada, subiu na 4871 e avisou no terminal
- [x] `npm run parar` derrubou só o próprio processo; o outro servidor continuou respondendo
- [x] Todas as telas abertas nos dois servidores: públicas 200, /trabalho e /conta 302 para /entrar, /admin 403, planejada e rota inexistente 404
- [x] Dois links internos quebrados corrigidos (/criar-conta, /conta/avisos) + teste que segue todo link interno
- [!] Clonar numa pasta funda no Windows estoura 260 caracteres → `git config core.longpaths true` (no README)
- [x] Debate dos críticos — rodada 1 + réplica: 1 ALTA, 7 MÉDIA, 4 BAIXA (`docs/debate-criticos.md`)
- [x] Correções (C1 front, C2 servidor; T1 devolvido uma vez) e rodada 2: tudo RESOLVIDO; pendências T4, T6 e resíduo de P5 documentadas
- [x] Verificação final (§13) num clone limpo: npm install, migrar, semear, verificar (3 APROVADO), testar (402 testes, 401 passam, 1 pulado), testar:visual 101/101, desenvolver com porta ocupada → porta seguinte, parar derruba só o próprio processo
- [x] Achados da verificação final corrigidos: package-lock sem "hasInstallScript" (instalação limpa sujava a árvore); caminho de força do `parar` nunca encerrava nada e mentia; testes apagavam o `.execucao/` de servidor ligado (causa dos órfãos)
- [!] Pendência BAIXA: depois de um `parar` limpo no modo desenvolver, o `npm run desenvolver` termina com código 1 (o --watch é encerrado por sinal)
