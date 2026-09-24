# Contratos do Ander Flow

Documento escrito pelo orquestrador antes dos agentes. **É a única fonte que um agente precisa ler sobre os módulos dos outros.** Se algo aqui estiver ambíguo, siga a leitura mais simples e anote em PEDIDOS no relatório. Nunca edite arquivo fora do seu escopo.

Raiz do projeto: `ander-flow/` (dentro do repositório). Todos os caminhos abaixo são relativos a ela.
Design (somente leitura, caminho absoluto):
- `C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\modelo\Portal Ander Flow - 1 Sistema e telas.dc.html` — sistema, Início, Catálogo, Página de ferramenta
- `...\modelo\Portal Ander Flow - 2 Estados e mobile.dc.html` — estados, celular 390px, tema escuro, conta/avisos/privacidade, planos, 404, popup
- `...\modelo\Portal Ander Flow - 3 Trabalho e admin.dc.html` — Trabalho/Salvos, ferramenta em etapas, admin

Os arquivos de design usam `style=""` inline. **Converta para classes**; nunca copie `style=`, `style-hover=` nem `support.js`. Cada tela tem `data-screen-label="..."` — use `grep -n` para achar a seção e leia só ela.

---

## 1. Regras gerais (valem para todos)

- Tudo em português do Brasil: arquivos, pastas, variáveis, funções, rotas, tabelas, colunas, chaves de idioma. Identificadores sem acento (`sessao`), textos com acento (`Sessão`).
- Nome de arquivo: minúsculas, hífen, sem acento/espaço, **prefixado pelo nome da pasta-mãe** (`catalogo-lista.js` dentro de `paginas/catalogo/`). Exceções: `package.json`, `README.md`, `CHECKLIST.md`, `.gitignore`, `.env*`, arquivos em `docs/`, `.orquestracao/`.
- JavaScript em módulos ES (`import`/`export`), Node 22+. Sem TypeScript, sem framework no front, sem bundler.
- Zero `style=""`, zero `onclick=""`, zero `<script>` inline, zero `innerHTML`/`outerHTML`/`insertAdjacentHTML` com dado variável. Montar DOM com `createElement` + `textContent`.
- Cor só por variável CSS. Cor literal (`#`, `rgb(`) só em `compartilhado-tokens.css`, `compartilhado-tema-claro.css`, `compartilhado-tema-escuro.css`.
- Nenhum texto visível escrito no HTML ou no JS: tudo por chave de idioma (§4). Números da interface vêm de dados, nunca fixos.
- SQL sempre parametrizado (`db.prepare('... WHERE email = ?').get(email)`).
- Testes com `node:test` + `node:assert/strict`. Arquivo de teste: `testes/testes-unidade/<modulo>-*.test.js` ou `testes/testes-integracao/<modulo>-*.test.js`.
- Commits: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...` em português.

## 2. Mapa de URLs

| URL | Origem | Acesso |
|---|---|---|
| `/` | `frontend/paginas/principal/principal.html` | público |
| `/ferramentas` | `paginas/catalogo/catalogo.html` | público |
| `/ferramentas/<slug>` | `frontend/ferramentas/<slug>/<slug>.html` (só se manifesto `estado: "pronta"` e ajuste `ativa=1`) | público |
| `/entrar` | `paginas/entrar/entrar.html` (abas Entrar / Criar conta; `/entrar?aba=criar`) | público |
| `/recuperar-senha` | `paginas/recuperar-senha/recuperar-senha.html` (pedir link; com `?token=` mostra "nova senha") | público |
| `/conta` | `paginas/conta/conta.html` | sessão |
| `/avisos` | `paginas/avisos/avisos.html` (abas Avisos do sistema / Mensagens) | público (mensagens exigem sessão) |
| `/trabalho` | `paginas/trabalho/trabalho.html` | sessão |
| `/salvos` | `paginas/salvos/salvos.html` (sem sessão: salvos locais do aparelho) | público |
| `/planos` | `paginas/planos/planos.html` | público |
| `/privacidade`, `/termos`, `/cookies` | `paginas/<nome>/<nome>.html` | público |
| `/admin` | `paginas/admin/admin.html` (seções por `?secao=ferramentas|usuarios|avisos|bloqueios`) | admin |
| `/vitrine` | `paginas/vitrine/vitrine.html` (componentes; só em desenvolvimento) | dev |
| 404 / 403 / 429 / 500 | `paginas/erro/erro.html` renderizado pelo montador | — |
| `/estatico/...` | arquivos de `frontend/` (ver §3.4) | público |
| `/plus/<slug>/<recurso>` | `frontend/ferramentas/<slug>/<slug>-plus-<recurso>.js` | sessão + plano plus |
| `/api/...` | rotas em `servidor/rotas/*/*-rotas.js` (§8) | varia |

Acesso "sessão" sem sessão → redireciona 302 para `/entrar?volta=<caminho>`. Acesso "admin" sem ser admin → página de erro 403. Nomes de página e slugs de ferramenta nunca coincidem.

## 3. Páginas: modelo HTML e montador

### 3.1 Declaração da página (descoberta automática)
Cada `frontend/paginas/<nome>/<nome>.html` declara no `<head>`:
```html
<meta name="af-rota" content="/ferramentas">
<meta name="af-acesso" content="publico">   <!-- publico | sessao | admin | dev -->
```
`erro.html` usa `content=""` (não é rota). Ferramentas não declaram rota: o montador usa `/ferramentas/<slug>` a partir do manifesto.

### 3.2 Esqueleto obrigatório de toda página e ferramenta
```html
<!doctype html>
<html>
<head>
  <!-- incluir: compartilhado-cabeca -->
  <meta name="af-rota" content="/planos">
  <meta name="af-acesso" content="publico">
  <title data-texto="planos.titulo_pagina"></title>
  <meta name="description" data-texto-content="planos.descricao_pagina">
  <link rel="stylesheet" href="/estatico/paginas/planos/planos.css">
  <script type="module" src="/estatico/paginas/planos/planos.js"></script>
</head>
<body>
  <!-- incluir: compartilhado-cabecalho -->
  <main id="conteudo" class="conteudo planos"> ... </main>
  <!-- incluir: compartilhado-rodape -->
  <!-- incluir: compartilhado-navegacao-celular -->
</body>
</html>
```
- O montador escreve em `<html>`: `lang` (`pt-BR`|`en`), `data-idioma`, `data-pagina="<nome ou slug>"`, `data-sessao="ativa|anonima"`, `data-plano="gratis|plus|"`, `data-papel="usuario|admin|"`, `data-ambiente`.
- `compartilhado-cabeca.html` contém: charset, viewport, `compartilhado-tema-inicial.js` (síncrono, primeiro script), folhas `compartilhado-fontes.css`, `-tokens.css`, `-tema-claro.css`, `-tema-escuro.css`, `-base.css`, `-componentes.css`, `-estados.css`, `-cabecalho.css`, `-rodape.css`, `-navegacao-celular.css`, ícone da aba, e `<script type="module" src="/estatico/compartilhado/compartilhado-pagina.js">`.
- Página de ferramenta também inclui `<link rel="stylesheet" href="/estatico/compartilhado/compartilhado-ferramenta.css">`.

### 3.3 Diretivas do montador
- **Inclusão:** `<!-- incluir: nome-do-arquivo -->` (sem extensão). Começando por `compartilhado-` → `frontend/compartilhado/<nome>.html`; senão → mesma pasta da página (`principal-busca` → `paginas/principal/principal-busca.html`). Até 3 níveis.
- **Texto:** elemento com `data-texto="chave"` e **conteúdo vazio no fonte** recebe o texto traduzido (escapado). Ex.: `<h1 class="titulo-display" data-texto="principal.titulo"></h1>`.
- **Atributos:** `data-texto-placeholder`, `data-texto-aria-label`, `data-texto-title`, `data-texto-alt`, `data-texto-content`, `data-texto-value` → preenchem `placeholder`, `aria-label`, `title`, `alt`, `content`, `value`.
- **Negrito:** no valor traduzido, `**trecho**` vira `<strong>trecho</strong>` (todo o resto é escapado). É a única marcação permitida.
- **Variáveis:** `{nome}` dentro de um texto traduzido é substituído. No HTML, `{{nome}}` em texto é substituído pelo valor escapado. Variáveis globais sempre disponíveis: `ferramentas_total`, `ferramentas_prontas`, `ferramentas_planejadas`, `ferramentas_plus`, `ano`, `usuario_nome`, `usuario_inicial`, `usuario_plano`, `preco_plus_mensal` (formatado), `preco_plus_anual`, `limite_lote_gratis`, `limite_lote_plus`, `limite_favoritos_gratis`, `limite_trabalhos_gratis`. Página de erro recebe `codigo` e `minutos`; no atributo `data-texto` o literal `{codigo}` é trocado antes da tradução (`data-texto="erro.{codigo}.titulo"`).
- Chave inexistente: em desenvolvimento o montador escreve a própria chave e registra aviso no log; os verificadores (§4.4) reprovam.

### 3.4 Arquivos estáticos
`/estatico/<caminho>` serve `frontend/<caminho>`, exceto: arquivos `.html`, qualquer caminho com `-plus-`, e `-manifesto.json` (servido pela API). Em desenvolvimento `Cache-Control: no-cache`; em produção `max-age=3600`. Bibliotecas: `/estatico/compartilhado/bibliotecas/pdf-lib.esm.min.js`, `/estatico/compartilhado/bibliotecas/xlsx.mjs` (SheetJS 0.20.3 da CDN oficial). Fontes em `/estatico/compartilhado/fontes/` (copiadas por `scripts-copiar-bibliotecas.js`; nomes: `instrument-sans-latin-{400,500,600,700}-normal.woff2`, `instrument-sans-latin-400-italic.woff2`, `newsreader-latin-opsz-normal.woff2`, `newsreader-latin-opsz-italic.woff2` — Newsreader é variável, pesos 200–800).
Ícones: `/estatico/compartilhado/compartilhado-icones.svg#icone-<nome>` (§6.3).

## 4. Idioma (PT-BR ↔ EN)

### 4.1 Arquivos e chaves
- Idiomas: `pt-BR` (padrão) e `en`. Sufixos de arquivo: `-idioma-pt-br.json` e `-idioma-en.json`.
- Um par por pasta: `compartilhado/compartilhado-idioma-*.json`, `paginas/<nome>/<nome>-idioma-*.json`, `ferramentas/<slug>/<slug>-idioma-*.json`.
- Objeto aninhado cuja **raiz é o nome da pasta**: `{"principal": {...}}`, `{"preco-de-venda": {...}}`, `{"compartilhado": {...}}`. Chave completa com pontos: `principal.busca.titulo`. Folhas em `snake_case`.
- `compartilhado-idioma-pt-br.json` já existe (escrito pelo orquestrador). Ninguém edita; precisou de chave compartilhada nova → PEDIDOS. Chaves da sua página vão no JSON da sua página.
- Códigos de erro da API são traduzidos em `compartilhado.erros.<codigo>`.
- Dono: o agente da página escreve o `-pt-br.json`. O agente de tradução (A11) escreve **todos** os `-en.json`. Até lá o `-en.json` pode não existir.

### 4.2 No servidor
- Idioma da requisição: cookie `idioma` (`pt-BR`|`en`); ausente/inválido → `pt-BR`. O HTML sai traduzido.
- `GET /api/idioma/:codigo/:pagina` → `{ "idioma": "en", "textos": { ...compartilhado + página/ferramenta mesclados... }, "variaveis": { ...globais... } }`. `:pagina` = nome de página ou slug. Chave ausente em `en` cai para `pt-BR`.
- E-mails e páginas de erro são traduzidos pelo servidor.

### 4.3 No navegador — `frontend/compartilhado/compartilhado-idioma.js`
```js
export function idiomaAtual()                 // 'pt-BR' | 'en' (lê <html lang>)
export function t(chave, variaveis = {})      // texto traduzido (string pura, sem marcação)
export function aplicarTextos(raiz = document) // aplica data-texto* em um trecho de DOM criado pelo JS
export async function trocarIdioma(codigo)    // grava cookie idioma (1 ano, SameSite=Lax, path=/) + localStorage af-idioma,
                                              // busca /api/idioma/<codigo>/<data-pagina>, reaplica textos, atualiza lang,
                                              // dispara evento 'af:idioma' em document; com sessão faz PATCH /api/conta {idioma}
export function aoTrocarIdioma(funcao)        // registra callback para re-renderizar textos dinâmicos
export function textoComNegrito(elemento, chave, variaveis) // aplica **negrito** criando <strong> via DOM
```
Os textos iniciais vêm do servidor junto com o HTML: o montador grava o dicionário da página em `<script type="application/json" id="af-textos">…</script>` (JSON, não executável, permitido pela CSP) e as variáveis globais em `<script type="application/json" id="af-variaveis">`. `t()` lê desses blocos.

### 4.4 Verificadores (scripts/)
- `scripts-verificar-idiomas.js`: paridade total de chaves entre cada par pt-br/en (inclui `nome`, `descricao`, `intencoes` dos manifestos); valores não vazios; toda chave usada em `data-texto*` e em `t('...')` (literal) existe no pt-BR. Falhou → código de saída 1.
- `scripts-verificar-nomes.js`: regras de nome de arquivo (§1) em `frontend/`, `servidor/`, `banco/`, `scripts/`, `testes/`.
- `scripts-verificar-textos-fixos.js`: HTML sem texto solto entre tags (exceto dentro de `<script type="application/json">`, `<code>` vazio, e símbolos puros como `/`, `·`, `—`); JS de `frontend/` sem literal de texto visível atribuído a `textContent`/`placeholder`/`title`/`aria-label`; nenhum `style=`, `onclick=`, `<script>` inline, `innerHTML`; nenhuma cor literal fora dos tokens.

## 5. Tema claro/escuro
- `<html data-tema="claro|escuro">`. Escolha salva em `localStorage['af-tema']` (`claro|escuro|sistema`) e cookie `tema`. Sem escolha → `prefers-color-scheme`.
- `compartilhado-tema-inicial.js`: script clássico síncrono, primeiro no `<head>`, aplica `data-tema` antes da pintura. Tratar exceção de `localStorage`.
- `compartilhado-tema.js`: `export function temaAtual()`, `export function definirTema('claro'|'escuro'|'sistema')`, `export function alternarTema()`; botão `[data-acao="alternar-tema"]` com `aria-pressed="true"` quando escuro e `aria-label` traduzido (`compartilhado.tema.usar_claro|usar_escuro`). Com sessão, PATCH `/api/conta {tema}`.

## 6. Sistema visual (A3 implementa, todos usam)

### 6.1 Variáveis CSS (nomes fixos)
Cores (definidas por tema): `--cor-fundo`, `--cor-superficie`, `--cor-recuo`, `--cor-linha`, `--cor-linha-forte`, `--cor-texto`, `--cor-texto-2`, `--cor-texto-3`, `--cor-destaque`, `--cor-destaque-forte`, `--cor-destaque-suave` (fundo de seleção/realce), `--cor-sobre-destaque` (texto sobre botão terracota), `--cor-salvia`, `--cor-salvia-suave`, `--cor-erro`, `--cor-erro-suave`, `--cor-tinta` (painel escuro de resultado), `--cor-sobre-tinta`, `--cor-sobre-tinta-2`, `--cor-foco`.
Claro (Marfim): fundo `#F7F4ED`, superfície `#FCFAF4`, recuo `#EFEAE0`, linha `#E0D8CB`, texto `#292724`, texto-2 `#635D54`, destaque `#A05134`, destaque-forte `#8A412A`, sálvia `#5E6B54`. Escuro (Carvão): extrair da seção 07 do arquivo 2 (fundo `#232120`, superfície `#2B2826`/`#2E2B29`, linha `#3A3634`/`#4C4744`, texto `#F5F1E8`, texto-2 `#ADA496`, destaque `#D08560`, sálvia `#A9BA9C`). Contraste AA obrigatório para texto.
Espaço: `--espaco-1: 4px` `--espaco-2: 8px` `--espaco-3: 12px` `--espaco-4: 16px` `--espaco-5: 24px` `--espaco-6: 32px` `--espaco-7: 48px` `--espaco-8: 64px` `--espaco-9: 96px`.
Raios (só três): `--raio-etiqueta: 6px`, `--raio-controle: 10px`, `--raio-superficie: 14px`.
Tipografia: `--fonte-interface: "Instrument Sans", system-ui, sans-serif`; `--fonte-display: "Newsreader", Georgia, serif`; corpo 15,5px/1.5. Display: `--texto-display-1: 56px` `--texto-display-2: 42px` `--texto-display-3: 34px` `--texto-display-4: 28px` (celular reduz). Alvo de toque mínimo `--alvo-toque: 44px`.
Sem `box-shadow`, sem gradiente, sem `backdrop-filter`. Profundidade = tom de papel + linha 1px. Respeitar `prefers-reduced-motion`.

### 6.2 Classes de componente (nomes fixos)
Layout e texto: `.conteudo` (contêiner com largura máxima e respiro lateral; 40px no desktop, 16px no celular), `.titulo-display` + `.titulo-display--1..4`, `.sobretitulo` (12px maiúsculas espaçadas), `.texto-2`, `.texto-pequeno`, `.visualmente-oculto`, `.pular-para-conteudo`.
Controles: `.botao` + `.botao--primario` (preenchido terracota; **um por tela**), `.botao--secundario` (contorno), `.botao--fantasma`, `.botao--perigo`, `.botao--pequeno`, `.botao--largo` (100%); `.botao-icone` (quadrado 44px, só ícone + `aria-label`).
Campo: `<label class="campo"><span class="campo__rotulo"></span><span class="campo__controle"><span class="campo__prefixo">R$</span><input class="campo__entrada"><span class="campo__sufixo">%</span></span><span class="campo__ajuda"></span><span class="campo__erro"></span></label>`. Erro: `.campo--erro` no label + `aria-invalid="true"` + `aria-describedby` apontando para `.campo__erro`. `.campo__entrada` vale para `input`, `select`, `textarea`.
Outros controles: `.deslizante` (input range), `.opcoes` + `.opcao` (grupo segmentado com radios), `.marcador` (checkbox com rótulo), `.interruptor` (switch com `role="switch"`), `.abas` + `.abas__aba` (`role="tab"`, `aria-selected`) + `.abas__painel`, `.pilula` (sugestão de busca, link), `.busca-intencao` + `__icone` `__entrada` `__atalho` (caixa grande de busca 60px), `.migalhas` (breadcrumb, `<nav aria-label>` com `<ol>`).
Superfícies: `.superficie` (papel, linha 1px, raio 14), `.superficie--recuo`, `.superficie--tinta` (painel escuro do resultado), `.divisor`.
Etiquetas: `.etiqueta` + `--gratis` `--plus` `--pronta` `--planejada` `--aviso` `--erro` (raio 6px).
Lista densa (catálogo; nunca cartões): `<ul class="lista-densa"><li class="lista-densa__item"><a class="lista-densa__ligacao"><svg class="icone lista-densa__icone"/><span class="lista-densa__nome"/><span class="lista-densa__descricao"/><span class="lista-densa__meta"/></a><button class="botao-icone lista-densa__favorito"/></li></ul>`; `.lista-densa__item--planejada` (sem ligação, texto-2).
Ferramenta (`compartilhado-ferramenta.css`): `.ferramenta` (grade da página), `.ferramenta__cabecalho`, `.ferramenta__corpo` (formulário + resultado lado a lado no desktop, empilhados no celular), `.ferramenta__formulario`, `.ferramenta__grupo` + `.ferramenta__grupo-titulo`, `.ferramenta__acoes`, `.ferramenta__resultado`, `.resultado` (usa superfície tinta) + `__rotulo` `__valor` (Newsreader grande) `__linhas` `__linha` `__linha-rotulo` `__linha-valor` `__linha--destaque`, `.ferramenta__exportar`, `.conta-formula` (bloco "A conta", `<code>`), `.ferramenta__ajuda` (como usar + perguntas), `.passos` + `.passos__item` + `.passos__numero`, `.perguntas` (details/summary), `.ferramenta__lateral` + `.relacionadas` + `.relacionadas__item`, `.nota-local` (linha "Cálculo no seu navegador").
Etapas (fluxo em 4 passos): `.etapas` (`<ol>`) + `.etapas__item` + `--atual` (`aria-current="step"`) + `--feita`; `.etapa-painel`.
Arquivos: `.soltar-arquivos` (área de soltar; `--ativa` ao arrastar) + `__titulo` `__texto`; `.lista-arquivos` + `.lista-arquivos__item`.
Tabela: `.tabela` (admin e prévias; cabeçalho fixo, linhas 44px), `.tabela__acoes`, `.paginacao`.
Estados (`compartilhado-estados.css`): `.estado` + `--vazio` `--erro` `--carregando` + `__icone` `__titulo` `__texto` `__acao`; `.progresso` (`<progress>` estilizado) + `.progresso__rotulo`; `.esqueleto` (bloco carregando, sem animação se reduced-motion); `.bloqueio-plano` + `__titulo` `__texto` `__preco` `__acao` (diz o que libera e quanto custa).
Retorno: `.avisos-flutuantes` (região `aria-live="polite"`) + `.aviso-flutuante` + `--sucesso` `--erro`; `.modal` (elemento `<dialog>`) + `__titulo` `__texto` `__acoes`; `.faixa-primeira-visita`; `.popup-aviso` (dialog não modal no canto).
Sessão: `.so-sessao`, `.so-anonimo`, `.so-admin`, `.so-plus`, `.so-gratis` (visibilidade por `html[data-sessao]`, `[data-papel]`, `[data-plano]`).
Ícone: `.icone` (24px, `stroke: currentColor`, `fill: none`), `.icone--20`, `.icone--16`, `.icone--32`.

### 6.3 Ícones — sprite `compartilhado-icones.svg`
`<symbol id="icone-<nome>" viewBox="0 0 24 24">`, traço 1.6, grade interna 20px, pontas redondas, sem preenchimento. Extrair os SVGs dos arquivos de design e desenhar os faltantes no mesmo estilo. Uso: `<svg class="icone" aria-hidden="true"><use href="/estatico/compartilhado/compartilhado-icones.svg#icone-busca"></use></svg>`.
Nomes obrigatórios: `busca seta-direita seta-esquerda seta-cima seta-baixo chevron-direita chevron-baixo fechar menu inicio ferramentas salvos conta trabalho planos estrela estrela-cheia copiar pdf planilha baixar enviar-arquivo arquivo cadeado aviso sucesso erro info sol lua idioma sair editar excluir mais menos arrastar filtro ordenar relogio calendario dinheiro vendas calculo texto documento imagem codigo chave pessoas caixa megafone lista livro ferramenta sino mensagem escudo usuario grafico marca-check olho olho-fechado lote desfazer externo`.

## 7. Banco de dados

- SQLite com `better-sqlite3` (instalado e testado no Windows). Arquivo: `BANCO_CAMINHO` (padrão `banco/dados/ander-flow.sqlite`). `PRAGMA journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`.
- Esquema: `banco/migracoes/banco-migracao-001-inicial.sql` (já escrito — **leia esse arquivo**). Tabelas: `usuarios`, `sessoes`, `recuperacoes_senha`, `favoritos`, `trabalhos`, `avisos`, `avisos_lidos`, `mensagens`, `ferramentas_ajustes`, `usos_ferramentas`, `usos_usuarios`, `limites_trafego`, `registros_admin`. Migrações novas: `banco-migracao-NNN-descricao.sql`, pedidas ao dono do banco (A2).
- Datas: texto ISO UTC (`new Date().toISOString()`).
- `banco/banco.js`:
```js
export function abrirBanco(caminho = configuracao.bancoCaminho) // Database do better-sqlite3 já com pragmas; ':memory:' permitido
export function obterBanco()      // instância única do processo (abre se preciso)
export function fecharBanco()
```
- `banco/banco-migrador.js`: `export function migrar(banco)` aplica em ordem os `.sql` ainda não registrados na tabela `migracoes_aplicadas (nome TEXT PRIMARY KEY, aplicada_em TEXT)`, cada um numa transação; retorna lista aplicada. Executado direto (`npm run banco:migrar`) migra o banco do `.env`.
- `banco/sementes/banco-sementes.js`: `npm run banco:semear` — idempotente; cria 2 avisos de exemplo (1 sistema, 1 popup inativo). **Não cria usuário nem senha.**
- `scripts/scripts-admin-criar.js`: pergunta e-mail, nome e senha no terminal (senha sem eco quando for TTY; aceita também `--email --nome` e senha por stdin para testes), cria ou promove a admin, usa `gerarHashSenha` de `servidor/seguranca/seguranca-senha.js`.

## 8. Servidor

### 8.1 Configuração — `servidor/servidor-configuracao.js`
`export function carregarConfiguracao(ambiente = process.env)` → objeto congelado:
`{ raiz, porta: 4870, portaFinal: 4889, portasProibidas: [3000,3001,4200,5000,5173,5500,8000,8080,8888], ambiente: 'desenvolvimento'|'producao', emProducao, trustProxy: false, bancoCaminho (absoluto), sessaoDias: 30, urlPublica, emailModo: 'arquivo', logNivel, pastaExecucao: <raiz>/.execucao, limiteCorpo: '100kb', planos: <conteúdo de servidor/servidor-planos.json> }`. Lê `.env` com `process.loadEnvFile` se existir. Valores inválidos → erro claro na partida.

### 8.2 Erros — `servidor/servidor-erros.js` (já escrito)
`criarErro(status, codigo, extras)` / `ehErroComCodigo(erro)`. Toda rota lança ou passa para `next()` um `ErroComCodigo`. O tratador (`servidor/servidor-tratador-erros.js`) responde:
- `/api/*` → JSON `{ "erro": "<codigo>", ...extras }` com o status. Erro desconhecido → 500 `{ "erro": "erro_interno" }`, detalhe só no log.
- página → `montador.renderizarErro(req, res, status, variaveis)`.
- 429 sempre com cabeçalho `Retry-After: <segundos>` e, na API, `tentar_de_novo_em_segundos`.
Formato de validação: `400 { "erro": "dados_invalidos", "campos": { "email": "email_invalido" } }`.

### 8.3 Aplicativo — `servidor/servidor.js`
`export async function criarAplicativo({ configuracao, banco, modulos?, controle? })` → `{ app, contexto }` (usado nos testes com banco `:memory:` migrado).
Ordem dos middlewares: `trust proxy` conforme config → `aplicarCabecalhos` → `compression` → leitor de cookies (`req.cookies`, próprio, simples) → `express.json({ limit: '100kb' })` (corpo maior → 413 `corpo_grande_demais`) → estáticos `/estatico` → limitador `paginas` (não-API) / `api` (`/api/*`) → `middlewareCsrf` → `sessao.middleware` → rotas descobertas (ordem alfabética) → páginas do montador → 404 → tratador de erros.
Execução direta (`node servidor/servidor.js`): carrega config, migra o banco, escolhe porta (§8.5), escuta com `server.headersTimeout = 15000`, `server.requestTimeout = 30000`, `maxHeaderSize` 16 KB, imprime `Ander Flow rodando em http://localhost:4871 (a 4870 estava ocupada)`, grava `.execucao/servidor.json` e trata SIGINT/SIGTERM com desligamento limpo (para de aceitar, fecha conexões em até 5 s, fecha o banco, apaga os arquivos de execução).

**Contexto** passado a cada módulo de rotas:
```js
contexto = {
  configuracao, banco,
  limitador,   // §9.2
  sessao,      // §9.4
  catalogo,    // §8.6
  idioma,      // §8.7
  montador,    // §8.8
  registrarLog(nivel, evento, dados)  // JSON em uma linha no stdout; nunca senha, token, corpo
}
```

### 8.4 Rotas (descoberta automática)
Cada `servidor/rotas/<nome>/<nome>-rotas.js` exporta `export default function registrarRotas(app, contexto)` e registra os próprios caminhos. Arquivos auxiliares da mesma pasta: `<nome>-controle.js`, `<nome>-validacao.js`. Nenhum arquivo central precisa ser editado.

### 8.5 Porta — `servidor/servidor-porta.js`
```js
export async function portaRespondendo(porta, host)     // true se conectar em até 300 ms
export async function conseguirEscutar(porta)           // tenta listen e fecha
export async function encontrarPortaLivre(inicial, final, proibidas) // pula proibidas, testa 127.0.0.1 e ::1 (::1 indisponível = não responde)
export async function escutarComTentativas(servidorHttp, { inicial, final, proibidas }) // trata EADDRINUSE indo para a próxima; retorna { porta, tentadas }
```
`scripts/scripts-iniciar.js [--desenvolver]`: roda o servidor em processo filho (`node --watch servidor/servidor.js` quando `--desenvolver`), repassa saída, grava `.execucao/servidor.pid` (PID deste supervisor) e `.execucao/servidor.json` `{ pid, pidFilho, porta, projeto: <caminho absoluto>, token, iniciado_em }`; Ctrl+C encerra o filho com limpeza. O servidor escreve `.execucao/servidor.porta`.
`scripts/scripts-parar.js`: lê `.execucao/servidor.json`; se não existir, avisa e sai 0. Primeiro pede desligamento limpo via `POST http://127.0.0.1:<porta>/__controle/desligar` com cabeçalho `X-Token-Controle: <token>` (rota aceita só de 127.0.0.1/::1 e só com o token). Se não cair em 5 s, confere que o PID é deste projeto (linha de comando contém o caminho do projeto — Windows via PowerShell `Get-CimInstance Win32_Process`, Unix via `ps -o args=`) e encerra só ele. **Nunca** mata por porta nem `killall`.

### 8.6 Catálogo — `servidor/servidor-catalogo.js`
Lê todo `frontend/ferramentas/*/*-manifesto.json` + `frontend/ferramentas/ferramentas-categorias.json` + tabela `ferramentas_ajustes`.
```js
export function criarCatalogo({ raiz, banco })
  → { listar({ idioma, incluirInativas = false }),   // ferramentas localizadas (§10.1), ordenadas por categoria.ordem, manifesto.ordem, nome
      obter(slug, { idioma }),                        // ou null
      categorias({ idioma }),                         // [{ id, ordem, icone, nome, resumo, total }]
      contagens(),                                    // { total, prontas, planejadas, plus } — só ativas
      planoEfetivo(slug),                             // ajuste.plano ?? manifesto.plano
      recarregar() }
```
Ferramenta localizada: `{ slug, estado, categoria, plano, icone, nome, descricao, intencoes: [...], etiquetas: [...], relacionadas: [...], destaque, ativa, url: '/ferramentas/<slug>' | null }`. Manifesto inválido → erro na partida com o nome do arquivo.

### 8.7 Idioma no servidor — `servidor/servidor-idioma.js`
```js
export function criarIdioma({ raiz })
  → { idiomas: ['pt-BR','en'], normalizarCodigo(codigo), idiomaDaRequisicao(req),
      dicionario(codigo, pagina),              // compartilhado + pasta da página/ferramenta; en cai para pt-BR por chave
      traduzir(codigo, chave, variaveis, pagina), recarregar() }
```
Em desenvolvimento relê os JSON a cada requisição; em produção guarda em memória.

### 8.8 Montador — `servidor/servidor-montador-paginas.js`
```js
export function criarMontador({ raiz, idioma, catalogo, configuracao })
  → { paginas(),                                     // [{ nome, rota, acesso }]
      registrar(app, contexto),                      // GET das rotas de §2, aplicando acesso
      renderizar(req, res, nome, variaveis = {}),    // página ou ferramenta
      renderizarErro(req, res, status, variaveis = {}) }
```

## 9. Segurança (`servidor/seguranca/`)

### 9.1 Cabeçalhos — `seguranca-cabecalhos.js`
`export function aplicarCabecalhos(app, configuracao)`: helmet com CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (sem `unsafe-inline`/`unsafe-eval`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva, HSTS só em produção, `x-powered-by` desligado.

### 9.2 Limite de tráfego — `seguranca-limite-trafego.js` + `seguranca-limite-trafego-regras.json`
Regras (janela deslizante simples por contador em memória; bloqueio persistido em `limites_trafego`):
| grupo | chave | limite |
|---|---|---|
| `paginas` | IP | 300 / 60 s |
| `api` | IP | 120 / 60 s |
| `entrar_falhas` | IP + e-mail (minúsculo) | 5 falhas / 15 min |
| `criar_conta` | IP | 3 / 60 min |
| `recuperar_senha` | IP + e-mail | 3 / 60 min |
| `admin` | id do usuário | 60 / 60 s |
Estourou → infração: `reincidencias + 1`; bloqueio de 1 min → 5 min → 15 min → 1 h → 6 h → 24 h (6ª em diante). Reincidência zera após 24 h sem infração. Bloqueio sobrevive a reinício (lido do banco na primeira consulta da chave).
```js
export function criarLimitador({ banco, regras, agora = () => Date.now(), registrarLog })
  → { middleware(grupo, { chave: (req) => string }),  // conta 1 requisição; bloqueado → next(criarErro(429,'muitas_tentativas',{ tentar_de_novo_em_segundos, minutos }))
      registrarFalha(grupo, chave),                    // para grupos de falha (entrar_falhas); retorna { bloqueado, segundosRestantes }
      limparFalhas(grupo, chave),                      // login certo zera o contador de falhas
      verificar(grupo, chave),                         // { bloqueado, segundosRestantes } sem contar
      listarBloqueios(),                               // [{ grupo, chave, reincidencias, bloqueado_ate }] só ativos
      desbloquear(grupo, chave) }
export function chaveIp(req)   // req.ip normalizado (IPv4 mapeado em IPv6 → IPv4)
```
**Chave composta** (entrar_falhas, recuperar_senha): `` `${chaveIp(req)}|${email.trim().toLowerCase()}` ``.
Log de bloqueio: `{ evento: 'bloqueio_trafego', grupo, chave_resumo (IP com último octeto mascarado / e-mail só com hash curto), segundos }`.

### 9.3 CSRF — `seguranca-csrf.js`
`export function middlewareCsrf(configuracao)`: em toda requisição sem cookie `af_csrf`, cria token aleatório (32 bytes base64url) em cookie `af_csrf` (não HttpOnly, SameSite=Lax, Secure em produção, path=/). Para `POST|PUT|PATCH|DELETE` em `/api/*`: exige cabeçalho `X-CSRF-Token` igual ao cookie (comparação em tempo constante) → senão 403 `csrf_invalido`. `/__controle/desligar` fica fora (tem token próprio).

### 9.4 Sessão — `seguranca-sessao.js`; senha — `seguranca-senha.js`
```js
// seguranca-senha.js
export async function gerarHashSenha(senha)          // crypto.scrypt N=16384 r=8 p=1, sal 16 bytes → 'scrypt$16384$8$1$<salB64>$<hashB64>'
export async function verificarSenha(senha, hash)    // tempo constante; false para formato inválido
// seguranca-sessao.js
export function criarGerenciadorSessao({ banco, configuracao })
  → { middleware,                         // lê cookie af_sessao, busca por sha256(token) não expirada e usuário ativo; req.usuario = usuário público (§10.2) ou null; renova ultimo_uso_em no máx. a cada 10 min
      criarSessao(req, res, usuarioId),   // token 32 bytes base64url; grava hash; cookie af_sessao HttpOnly, SameSite=Lax, Secure em produção, path=/, Max-Age = sessaoDias
      encerrarSessao(req, res),           // apaga a linha e o cookie
      encerrarTodas(usuarioId, { excetoAtual: req? }),
      exigirSessao,                       // middleware → 401 sessao_necessaria
      exigirAdmin,                        // → 401 sem sessão, 403 acesso_negado sem papel admin
      exigirPlano(plano) }                // → 403 plano_insuficiente { plano_necessario }
```
Usuário `suspenso` não autentica (sessão ignorada; login → 403 `conta_suspensa`).

## 10. Formatos JSON

### 10.1 Manifesto — `frontend/ferramentas/<slug>/<slug>-manifesto.json`
```json
{
  "slug": "preco-de-venda",
  "estado": "pronta",
  "categoria": "dinheiro",
  "plano": "gratis",
  "processamento": "navegador",
  "icone": "dinheiro",
  "ordem": 10,
  "nome": { "pt-BR": "Preço de venda", "en": "Selling price" },
  "descricao": { "pt-BR": "Preço mínimo, preço com margem e quanto sobra por venda.", "en": "..." },
  "intencoes": { "pt-BR": ["quanto cobrar", "calcular preço"], "en": ["how much to charge"] },
  "etiquetas": { "pt-BR": ["margem", "markup"], "en": ["margin", "markup"] },
  "relacionadas": ["margem-de-contribuicao", "ponto-de-equilibrio"],
  "recursos_plus": ["xlsx"]
}
```
`estado`: `pronta` | `planejada`. `plano`: `gratis` | `plus` (o plano do recurso principal). `categoria`: id de `ferramentas-categorias.json`. `recursos_plus`: nomes aceitos em `/plus/<slug>/<recurso>`. Planejada não tem pasta além do manifesto e não tem página.

### 10.2 Usuário público
`{ "id": 1, "nome": "Anderson", "email": "a@b.com", "plano": "gratis", "papel": "usuario", "idioma": "pt-BR", "tema": "sistema", "criado_em": "..." }` — nunca `senha_hash`.

### 10.3 Limites de plano
Vêm de `configuracao.planos` (`servidor/servidor-planos.json`). Grátis: 10 favoritos, 3 trabalhos, lote de 3 arquivos. Plus: 500, 500, 100. Estourou → `403 { "erro": "limite_do_plano", "limite": 10, "plano_necessario": "plus" }`. **Verificado no servidor.**

## 11. API

Todas as respostas JSON. Rotas que alteram dados exigem `X-CSRF-Token`. Validação de tipo, tamanho e formato em todas.

**Idioma e ferramentas** (A1b — `rotas/idioma`, `rotas/ferramentas`)
- `GET /api/idioma/:codigo/:pagina` → §4.2
- `GET /api/ferramentas` → `{ ferramentas: [...], categorias: [...], contagens: {...} }` (idioma da requisição; só ativas)
- `GET /api/ferramentas/:slug` → `{ ferramenta }` | 404 `ferramenta_inexistente`
- `POST /api/ferramentas/:slug/uso` `{ tipo: "uso"|"documento" }` → 204; soma em `usos_ferramentas` (dia UTC) e, com sessão, em `usos_usuarios` (mês `AAAA-MM`). Sem IP, sem conteúdo.
- `GET /plus/:slug/:recurso` → arquivo JS (`Content-Type: text/javascript`) se sessão + plano efetivo plus + recurso listado no manifesto; 401 `sessao_necessaria` / 403 `plano_insuficiente` / 404.

**Autenticação** (A6a — `rotas/autenticacao`)
- `POST /api/autenticacao/criar-conta` `{ nome (1–80), email (≤254), senha (10–200), aceitou_termos: true }` → 201 `{ usuario }` + sessão. Erros: `dados_invalidos`, `email_em_uso`, `senha_fraca`, `termos_nao_aceitos`. Limite `criar_conta`.
- `POST /api/autenticacao/entrar` `{ email, senha }` → 200 `{ usuario }`. Erro único `credenciais_invalidas` (não revela se o e-mail existe); falha → `registrarFalha('entrar_falhas', ip+email)`; acerto → `limparFalhas`. 6ª tentativa errada em 15 min → 429.
- `POST /api/autenticacao/sair` → 204.
- `GET /api/autenticacao/sessao` → `{ usuario | null }`.
- `POST /api/autenticacao/recuperar-senha` `{ email }` → 202 sempre; se existir, cria token (1 h) e grava e-mail traduzido no idioma do usuário em `.execucao/emails/<data>-<id>.txt` com link `<urlPublica>/recuperar-senha?token=...`. Limite `recuperar_senha`.
- `POST /api/autenticacao/redefinir-senha` `{ token, senha }` → 204 e encerra todas as sessões; erro `token_invalido`.

**Conta** (A6a — `rotas/conta`)
- `GET /api/conta` → `{ usuario, uso: { favoritos, trabalhos }, limites }`
- `PATCH /api/conta` `{ nome?, idioma?, tema? }` → `{ usuario }`
- `POST /api/conta/senha` `{ senha_atual, senha_nova }` → 204; encerra as outras sessões
- `GET /api/conta/exportar` → JSON com todos os dados do usuário (anexo `ander-flow-meus-dados.json`)
- `POST /api/conta/excluir` `{ senha }` → 204; apaga usuário e tudo em cascata; limpa cookie
- `GET /api/conta/uso-mensal` → `{ mes: "2026-09", documentos: 34, ferramentas_usadas: 11 }`

**Favoritos, trabalhos, avisos, mensagens, planos** (A6b)
- `GET /api/favoritos` → `{ favoritos: [{ slug, criado_em }], limite }` · `POST /api/favoritos` `{ slug }` → 201 (erros `ferramenta_inexistente`, `limite_do_plano`; repetido é idempotente) · `DELETE /api/favoritos/:slug` → 204 · `POST /api/favoritos/juntar` `{ slugs: [...] (≤ 50) }` → `{ favoritos, ignorados: [...] }` (nunca substitui, só acrescenta até o limite)
- `GET /api/trabalhos?situacao=em_aberto|salvo` → `{ trabalhos: [{ id, ferramenta_slug, titulo, situacao, dados, criado_em, atualizado_em }], limite }` · `POST /api/trabalhos` `{ ferramenta_slug, titulo (1–120), dados (objeto, JSON ≤ 20 kB), situacao? }` → 201 (limite conta todos os trabalhos) · `PATCH /api/trabalhos/:id` · `DELETE /api/trabalhos/:id` (só do dono; alheio → 404)
- `GET /api/avisos` → `{ avisos: [{ id, tipo, titulo, corpo, link_url, link_rotulo, inicio_em, lido }], nao_lidos }` — vigentes (`ativo=1`, `inicio_em ≤ agora`, `fim_em` nulo ou futuro), `tipo='sistema'`, público compatível (`anonimos` só sem sessão; `gratis`/`plus` pelo plano), textos no idioma da requisição · `POST /api/avisos/:id/lido` · `POST /api/avisos/marcar-todos` (sessão)
- `GET /api/avisos/popup` → `{ aviso | null }` (o mais recente vigente `tipo='popup'`; frequência de exibição controlada no navegador: no máximo 1×/semana por aviso)
- `GET /api/mensagens` → `{ mensagens: [{ id, autor, corpo, criado_em, lida }], nao_lidas }` · `POST /api/mensagens` `{ corpo (1–2000) }` → 201 · `POST /api/mensagens/lidas` → 204 (sessão em todas)
- `GET /api/planos` → `{ moeda, pagamento_integrado: false, planos: [...] }` (de `configuracao.planos`)

**Admin** (A10a — `rotas/admin`; todas com `exigirAdmin` + limite `admin`; toda alteração grava `registros_admin`)
- `GET /api/admin/resumo` → `{ ferramentas: contagens, usuarios: { total, plus }, bloqueios_ativos, mensagens_nao_lidas }`
- `GET /api/admin/ferramentas` → lista com `ativa`, `plano_efetivo`, `destaque`, `usos_30d` · `PATCH /api/admin/ferramentas/:slug` `{ ativa?, plano?: "gratis"|"plus"|null, destaque? }`
- `GET /api/admin/usuarios?busca=&pagina=1` (20 por página) → `{ usuarios, total, pagina }` · `PATCH /api/admin/usuarios/:id` `{ plano?, papel?, situacao? }` (admin não rebaixa nem suspende a si mesmo → 400 `acao_nao_permitida`) · `POST /api/admin/usuarios/:id/encerrar-sessoes` → 204
- `GET /api/admin/avisos` · `POST /api/admin/avisos` · `PATCH /api/admin/avisos/:id` · `DELETE /api/admin/avisos/:id` (campos da tabela `avisos`; URL de link só `https://` ou caminho relativo `/...`)
- `GET /api/admin/mensagens` → conversas `[{ usuario_id, nome, email, ultima_em, nao_lidas }]` · `GET /api/admin/mensagens/:usuario_id` · `POST /api/admin/mensagens/:usuario_id` `{ corpo }`
- `GET /api/admin/bloqueios` → `{ bloqueios: listarBloqueios() }` · `DELETE /api/admin/bloqueios` `{ grupo, chave }` → 204

## 12. JavaScript compartilhado do navegador (A4)

Todos em `frontend/compartilhado/`, módulos ES, importados por caminho absoluto `/estatico/compartilhado/...`.
- `compartilhado-api.js`: `export async function chamarApi(caminho, { metodo = 'GET', corpo } = {})` → objeto JSON (ou `null` em 204); envia `X-CSRF-Token` lido do cookie `af_csrf` nos métodos que alteram; erro HTTP → lança `ErroApi { status, codigo, extras }`; falha de rede → `ErroApi { status: 0, codigo: 'sem_conexao' }`. `export function mensagemDeErro(erro)` → `t('compartilhado.erros.' + codigo, extras)`.
- `compartilhado-formatar.js`: `formatarMoeda(valor)` (BRL; `pt-BR` → "R$ 74,41", `en` → "R$74.41"), `formatarNumero(valor, casas)`, `formatarPercentual(fracao, casas)` (0,3 → "30%"), `formatarData(iso)`, `formatarDataLonga(iso)` ("terça, 22 de setembro"), `formatarTempoRelativo(iso)`, `lerNumero(texto)` (aceita "1.234,56" e "1234.56" conforme idioma; inválido → `NaN`).
- `compartilhado-busca.js`: `export function normalizar(texto)` (minúsculas, sem acento), `export function buscarFerramentas(lista, consulta)` → lista ordenada por relevância (nome > intenções > etiquetas > descrição; todas as palavras precisam casar em algum campo).
- `compartilhado-aviso.js`: `mostrarAviso(mensagem, tipo = 'sucesso'|'erro')` na região `.avisos-flutuantes`; `confirmar({ titulo, texto, rotuloConfirmar, perigo })` → Promise<boolean> com `<dialog class="modal">`.
- `compartilhado-sessao.js`: `usuarioAtual()` (lê `data-sessao`/`data-plano`/`data-papel`; `obterUsuario()` busca `/api/autenticacao/sessao` uma vez), `salvosLocais()` / `definirSalvosLocais(slugs)` (`localStorage['af-salvos-locais']`, máx. 10), `recentesLocais()` / `registrarRecente(slug)` (`af-recentes`, máx. 8, para "Onde você parou").
- `compartilhado-cabecalho.js`: liga `[data-acao="alternar-tema"]`, `[data-acao="trocar-idioma"]` (botões com `data-idioma`), `[data-acao="sair"]`, `[data-acao="abrir-menu-conta"]`, marca `aria-current="page"` em `[data-nav]` conforme `data-pagina`, atalho `/` foca `.busca-intencao__entrada` quando existe.
- `compartilhado-primeira-visita.js`: mostra `.faixa-primeira-visita` (criada via DOM) se não houver `localStorage['af-primeira-visita']`.
- `compartilhado-pagina.js`: inicialização comum de toda página — importa idioma, tema, cabeçalho, primeira visita, cria `.avisos-flutuantes` e tenta `import('/estatico/compartilhado/compartilhado-popup.js')` (escrito por A8b; ausência é ignorada).
- `compartilhado-ferramenta.js` (página de ferramenta): `export function iniciarFerramenta({ slug })` → liga favoritar (`[data-acao="favoritar"]`: com sessão usa API, sem sessão usa salvos locais; `limite_do_plano` mostra `.bloqueio-plano`), registra recente e `POST /api/ferramentas/<slug>/uso` uma vez por visita ao primeiro cálculo (`registrarUso(tipo)`), `salvarTrabalho({ titulo, dados })`, `copiarTexto(texto)`, `baixarArquivo(blob, nomeArquivo)`, `async gerarPdfResumo({ titulo, linhas: [[rotulo, valor]], rodape })` (pdf-lib, Helvetica, troca "−" por "-"), `async carregarRecursoPlus(recurso)` → módulo ou lança `ErroApi` (401/403), `mostrarBloqueioPlano(elemento, { titulo, texto })` (preenche `.bloqueio-plano` com preço de `/api/planos`).
- `compartilhado-popup.js` (A8b): busca `/api/avisos/popup`, mostra `.popup-aviso` no máximo 1×/semana por aviso (`localStorage['af-popup-visto-<id>']`), nunca em página de ferramenta.

Chaves de `localStorage`: `af-tema`, `af-idioma`, `af-salvos-locais`, `af-recentes`, `af-primeira-visita`, `af-popup-visto-<id>`, `af-rascunho-<slug>`. Sempre em `try/catch`.

## 13. Ferramentas funcionais (fórmulas e aceite)

Cada ferramenta: `<slug>.html`, `<slug>.css`, `<slug>.js` (interface), `<slug>-calculo.js` (funções puras, sem DOM, testáveis no Node), `<slug>-manifesto.json`, `<slug>-idioma-pt-br.json`. Página segue o design "Página de ferramenta" (arquivo 1): migalhas, título, descrição, nota local, formulário à esquerda, resultado à direita (painel tinta), exportar, "A conta", Como usar, Perguntas, relacionadas. Erros de entrada: estado "Entrada recusada" do arquivo 2. Cálculo retorna `{ ok: true, ... }` ou `{ ok: false, erro: '<codigo>', campo, extras }`; o código é traduzido pela chave `<slug>.erros.<codigo>`.

1. **preco-de-venda** — entradas: custo do produto, despesa fixa por unidade, taxa do cartão %, imposto %, margem % (deslizante 0–95). `custoTotal = custo + despesa`; `preco = custoTotal / (1 − margem − taxa − imposto)`; `taxaEImposto = preco × (taxa + imposto)`; `sobra = preco × margem`; `precoMinimo = custoTotal / (1 − taxa − imposto)`. Denominador ≤ 0 → `margem_acima_do_limite` com `limite = 1 − taxa − imposto` (formatado "89,8%"). Negativos → `valor_negativo`; custo total 0 → `custo_zerado`. **Caso de teste:** custo 38,40; despesa 6,10; taxa 4,2%; imposto 6%; margem 30% → custo total 44,50; preço **74,41** (74,4147…); taxa e imposto 7,59; sobra 22,32; mínimo 49,55. Margem 96% com 4,2%+6% → erro, limite 89,8%. Plus: recurso `xlsx` → tabela de cenários (margem 10% a 50%, passo 5) com SheetJS.
2. **ponto-de-equilibrio** — custos fixos do mês `CF`, preço unitário `P`, custo variável unitário `CV`, % variável sobre a venda `t`, lucro desejado `L` (opcional, 0). `mcu = P − CV − P×t`; `mcu ≤ 0` → `margem_nao_positiva`. `quantidade = ceil((CF + L) / mcu)`; `receita = (CF + L) / (mcu / P)`. Teste: CF 5000, P 50, CV 20, t 10% → mcu 25; quantidade 200; receita 10.000,00.
3. **margem-de-contribuicao** — `P`, `CV`, `t`, quantidade `Q` (opcional), custos fixos `CF` (opcional). `mcu = P − CV − P×t`; `indice = mcu / P`; `total = mcu × Q`; `resultado = total − CF`. `P ≤ 0` → `preco_invalido`. Teste: P 80, CV 32, t 12%, Q 150, CF 4000 → mcu 38,40; índice 48%; total 5.760,00; resultado 1.760,00.
4. **contador-de-texto** — caracteres (graphemes, `Intl.Segmenter`), sem espaços, palavras (`Intl.Segmenter` granularity word, `isWordLike`), frases (granularity sentence, não vazias), parágrafos (blocos separados por linha em branco), linhas; leitura = palavras / 200 por minuto; fala = palavras / 130 por minuto (mostrar `m:ss`). Atualiza ao digitar. Teste: "Olá mundo. Tudo bem?\n\nSim." → 3 frases, 5 palavras, 2 parágrafos.
5. **juntar-pdf** (arquivo) — seleciona/solta PDFs, reordena (arrastar e botões subir/descer acessíveis por teclado), remove, gera `juntado.pdf` com pdf-lib no navegador, progresso "Página X de Y" com cancelar. Grátis até `limite_lote_gratis` (3) arquivos; acima mostra `.bloqueio-plano`. Recurso Plus `lote` (`juntar-pdf-plus-lote.js`, exporta `limiteDeArquivos = 100`) carregado via `carregarRecursoPlus('lote')`. Erros: `arquivo_nao_pdf`, `pdf_protegido`, `pdf_corrompido`, `arquivo_grande_demais` (> 100 MB cada). Teste: juntar 2 PDFs gerados no teste → PDF válido com soma das páginas.
6. **limpar-planilha** (arquivo, **em 4 etapas** — design "Fluxo em etapas", arquivo 3): 1 Enviar (CSV nativo com detecção de separador `,` `;` tab e aspas; XLSX/XLS via SheetJS carregado sob demanda; ≤ 20 MB), 2 Configurar (colunas que definem duplicada; qual linha fica: `primeira` | `mais_recente` (última ocorrência ou coluna de data escolhida) | `mais_completa` (mais células preenchidas; empate → primeira); padronizar e-mail em minúsculas; aparar espaços; remover linhas vazias), 3 Revisar (contagens + prévia mantém/remove), 4 Exportar (CSV UTF-8 com BOM e separador original; XLSX). Original nunca é alterado. Teste: 5 linhas com 2 duplicadas por e-mail (maiúsculas diferentes) → 3 linhas; regra `mais_completa` mantém a com mais campos.

## 14. Testes visuais
Playwright com o navegador já instalado: `chromium.launch({ channel: process.env.NAVEGADOR_TESTES ?? 'msedge' })`. Matriz: 1440×900 e 390×844 × claro e escuro × `pt-BR` e `en`, nas telas principais; capturas em `testes/testes-visuais/capturas/` (fora do git). Falha em erro de console ou violação de CSP.

## 15. Ferramentas em escala: motores e definição (Onda 7)

As 145 ferramentas planejadas não são escritas à mão como as 6 primeiras. Cada uma é uma **definição** mais a **lógica pura**; o HTML e o JS de página são **gerados**.

### 15.1 Arquivos por ferramenta
| Arquivo | Quem escreve | Conteúdo |
|---|---|---|
| `<slug>-manifesto.json` | já existe | `estado` passa de `planejada` para `pronta` quando a ferramenta funciona e tem testes |
| `<slug>-definicao.json` | agente | motor, grupos, campos, resultados, exportação, exemplo (15.3) |
| `<slug>-calculo.js` | agente | funções puras, sem DOM, testáveis no Node (15.4) |
| `<slug>-idioma-pt-br.json` / `-en.json` | agente | todos os textos, com paridade (15.5) |
| `testes/testes-unidade/<slug>-calculo.test.js` | agente | casos do catálogo (`docs/catalogo/`) |
| `<slug>.html`, `<slug>.js`, `<slug>.css` | **gerados** por `npm run ferramentas:gerar` | não editar à mão; começam com o comentário `gerado por scripts-gerar-ferramentas.js` |

Exceção justificada (motor `interativo`): quando o comportamento não cabe em nenhum motor, a ferramenta tem `<slug>.js` próprio e a definição diz `"motor": "interativo"`; o HTML continua gerado.

### 15.2 Motores (`frontend/compartilhado/compartilhado-motor-<nome>.js` + `.css`)
| Motor | Para quê | Entrada → saída |
|---|---|---|
| `calculadora` | fórmula com campos | campos → resultados + "A conta" |
| `transformador` | texto → texto | área de texto (+ opções) → saída ao digitar, copiar/baixar |
| `documento` | documento preenchido | campos → pré-visualização formatada → imprimir/PDF/copiar |
| `tabela` | listas e matrizes | linhas editáveis, colunas tipadas, colunas calculadas e totais → CSV/PDF |
| `folha` | material para imprimir | parâmetros → folha (SVG/HTML) → imprimir/PDF/SVG |
| `arquivo` | arquivo local | arquivo(s) do aparelho → processamento no navegador → download |
| `interativo` | o resto (cronômetro, sorteio, quadro) | JS próprio da ferramenta |

Todos os motores usam as peças da §6 (`.ferramenta__*`, `.campo`, `.resultado`, estados), `lerNumero`/`formatar*` (§12), `ligarFormularioDeFerramenta` quando couber, e as funções de `compartilhado-ferramenta.js` (uso, trabalho, copiar, baixar, PDF, Plus). Nada de texto fixo, `innerHTML` ou estilo em linha.

### 15.3 `<slug>-definicao.json`
```json
{
  "motor": "calculadora",
  "grupos": [
    { "id": "valores", "campos": [
      { "id": "valor", "tipo": "moeda", "obrigatorio": true, "min": 0 },
      { "id": "taxa", "tipo": "percentual", "obrigatorio": true, "min": 0, "max": 100 },
      { "id": "meses", "tipo": "inteiro", "obrigatorio": true, "min": 1, "max": 600 },
      { "id": "regime", "tipo": "opcao", "opcoes": ["simples", "composto"], "padrao": "composto" }
    ] }
  ],
  "resultados": [
    { "id": "montante", "formato": "moeda", "destaque": true },
    { "id": "juros", "formato": "moeda" }
  ],
  "exportar": ["copiar", "pdf"],
  "exemplo": { "valor": "1.000,00", "taxa": "1", "meses": "12", "regime": "composto" },
  "conta": true
}
```
Tipos de campo: `numero`, `inteiro`, `moeda`, `percentual`, `texto`, `area-texto`, `opcao`, `marcador`, `data`, `hora`. Formatos de resultado: `numero`, `inteiro`, `moeda`, `percentual`, `texto`, `data`, `duracao`, `lista`. Motores além da calculadora acrescentam chaves próprias, documentadas no cabeçalho do motor.

### 15.4 `<slug>-calculo.js`
`export function calcular(entradas)` recebe os valores **já lidos** pelo motor (números como `Number`, percentuais como fração 0–1, datas como `Date`) e devolve `{ ok: true, resultados: { <id>: valor }, conta: { <variavel>: valor } }` ou `{ ok: false, erro: '<codigo>', campo: '<id>', extras: {} }`. O código de erro é traduzido por `<slug>.erros.<codigo>`. Nenhum número inventado: fórmulas, tabelas e limites vêm de `docs/catalogo/`; tabela oficial (INSS, IRRF…) traz a fonte e a data no comentário.

### 15.5 Chaves de idioma
`<slug>.titulo_pagina`, `.descricao_pagina`, `.titulo`, `.resumo`, `.grupos.<id>`, `.campos.<id>`, `.campos.<id>_ajuda` (opcional), `.opcoes.<campo>.<valor>`, `.resultado.titulo`, `.resultado.<id>`, `.conta.formula`, `.conta.linha` (com `{variavel}`), `.acoes.calcular`, `.erros.<codigo>`, `.como_usar.<n>`, `.perguntas.<id>.pergunta/resposta` (só perguntas plausíveis, §29 do prompt V2).

### 15.6 Catálogo de especificação
`docs/catalogo/catalogo-<categoria>.md`: uma entrada por ferramenta — motor, problema resolvido, entradas (id, tipo, limites), processamento (fórmula exata), saídas, exportação, plano, comportamento no celular, viabilidade no navegador (biblioteca nova? limite honesto?) e **casos de teste com números**. É a fonte que os agentes de implementação seguem.
