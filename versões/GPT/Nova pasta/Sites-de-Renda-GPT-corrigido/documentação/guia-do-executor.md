# Guia do executor de produto

Leitura obrigatória para os agentes executores (Sonnet 5). Complementa `arquitetura-e-contratos.md`; em caso de dúvida, o contrato prevalece. O orquestrador é o único integrador.

## 1. Seu espaço

Você escreve **somente** dentro da pasta do seu produto, nestes caminhos:

- `conteúdo/páginas/*.html` e `conteúdo/blocos/*.html`
- `scripts/iniciar-aplicação.js`, `scripts/definições-do-produto.js`, `scripts/páginas/`, `scripts/cálculos/`, `scripts/validação/`, `scripts/geração/`, `scripts/interface/` (do produto), `scripts/trabalhadores/` se precisar de Web Worker
- `estilos/produto/*.css` (exceto `cores.css`)
- `testes/*.test.js`
- `configurações/ícones-do-produto.json` (nomes de ícones do Lucide, ver `node_modules/lucide-static/icons/`)
- `documentação/` do produto

**Nunca edite:** `scripts/comum/`, `estilos/comum/`, `ferramentas/`, `conteúdo/comum/`, `recursos/fontes/`, `recursos/bibliotecas/`, `estilos/produto/cores.css`, `configurações/configuração-pública.json`, `configurações/identidade-visual.json`, arquivos gerados (`index.html`, `páginas/`, `estilos/site.css`, `robots.txt`, `sitemap.xml`), outros produtos, `compartilhado/`, arquivos da raiz. Se precisar de mudança no código comum, descreva-a no relatório. Não crie subagentes, não faça commits, não abra navegador (o painel é usado pelo orquestrador e pelos críticos) e não inicie servidores.

## 2. Comandos (dentro da pasta do produto; caminhos têm espaços e acentos, use aspas)

```bash
npm run gerar       # gera index.html, páginas/, estilos/site.css
npm run testar      # node --test "testes/**/*.test.js"
npm run verificar   # links, importações, ícones, padrões proibidos, títulos únicos, um <h1> por página
```

Ícones novos: edite `configurações/ícones-do-produto.json` e rode, na raiz do projeto, `node compartilhado/ferramentas-da-raiz/preparar-recursos.mjs --produto N`. No HTML, o ícone é referenciado pelo nome do Lucide: `…ícones.svg#cake`.

A entrega só está pronta quando `gerar`, `testar` e `verificar` terminam sem erro.

## 3. Modelo de referência

A fatia já implementada da confeitaria é o padrão a seguir:

- página: `1. Ferramentas para confeitaria/conteúdo/páginas/preço-de-venda.html`
- orquestrador da página: `scripts/páginas/preço-de-venda.js`
- cálculo puro: `scripts/cálculos/calcular-preço-de-venda.js`
- validador de registro salvo: `scripts/validação/validar-precificação-salva.js`
- coleções locais: `scripts/definições-do-produto.js`
- teste: `testes/calcular-preço-de-venda.test.js`
- início, catálogo, metodologia, sobre e bloco `armazenamento-local`.

Leia também `compartilhado/demonstração/vitrine-de-componentes.html` para ver todas as classes visuais disponíveis, e os CSS em `estilos/comum/componentes/`.

## 4. Regras obrigatórias

1. **Português brasileiro com acentos** em arquivos, funções, variáveis, propriedades, classes CSS, textos e comentários (`calcularÁreaDaParede`, `validar-lista-de-palavras.js`). Exceções: palavras reservadas e APIs.
2. **Uma função autoral nomeada por arquivo**, com teste correspondente quando houver lógica. Página = orquestrador que importa e compõe; não acumula implementações. Cálculos são funções puras sem DOM, testadas com `node:test`.
3. **Sem** `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`, **sem** `alert`/`confirm`/`prompt`, **sem** `style="…"`, `<style>`, `<script>` em linha ou `on*=` no HTML. Use `criarElemento`, `textContent`, `confirmarAção`, `exibirMensagem`, `mostrarErroDeCampo`, classes CSS. A CSP bloqueia estilos em linha.
4. **Dinheiro e números**: entrada via `validarQuantidade`/`interpretarNúmeroBrasileiro` (aceita vírgula); saída via `formatarMoeda`, `formatarCentavos`, `formatarNúmero`; arredondamentos via `arredondarParaCentavos` e `arredondarParaCima` (evitam erro de ponto flutuante). Nada de `NaN`, `Infinity`, divisão por zero ou laço sem limite.
5. **Estados**: vazio, erro junto ao campo (`#<id>-erro`, `aria-describedby`), sucesso, carregando/indisponível e sem resultado. Resultado em `.ferramenta-resultado` com `aria-live="polite"`.
6. **Celular**: toda ferramenta tem `<div class="ação-contextual"><button type="submit" form="…" class="botão botão-primário">Ação</button></div>` e o botão equivalente do formulário fica dentro de `.ações-do-formulário.somente-computador`. Campos com `inputmode` adequado, rótulos visíveis, ajuda curta.
7. **Cada página de ferramenta usa um `destaque` diferente das vizinhas** (ids em `configurações/identidade-visual.json` → `destaques`).
8. **Catálogo** (`ferramentas.html`) e início usam `.lista-de-ferramentas` / `.item-de-ferramenta` (lista editorial), nunca grade de cartões quadrados como estrutura principal. Pode haver busca e filtro por categoria no catálogo (ideia do exemplo em `manus modelos/`), com script próprio, funcionando também sem JavaScript (lista completa visível).
9. **Publicidade**: no máximo um `<div class="espaço-publicitário" data-bloco="após-resultado"></div>` por ferramenta, depois do resultado e antes das premissas; nunca junto de botões de copiar, baixar, gerar, imprimir ou da ação contextual; nunca dentro de material impresso.
10. **Salvar localmente**: coleções em `scripts/definições-do-produto.js` com `chave`, `rótulo`, `rótuloSingular`, `páginaDeEdição`, `descrever`, `validar` (validador rigoroso, usado na importação). Página reabre registro com `?registro=<id>`. Use `salvarRegistroLocal`, `lerRegistroLocal`, `listarRegistrosLocais`. Descreva o que é salvo em `conteúdo/blocos/armazenamento-local.html` (usado pela política de privacidade).
11. **Impressão**: conteúdo imprimível dentro de `.área-de-impressão`; use `imprimirPágina()`; o CSS de impressão comum já esconde navegação, apoio, anúncios e consentimento. Quebras com `.quebra-de-página`, blocos que não podem quebrar com `.evitar-quebra`.
12. **PDF/SVG**: `criarDocumentoPdf` (mm, Helvetica, acentos), `baixarArquivo`, `escaparXml`. Carregue geradores pesados sob demanda com `import()` dinâmico.
13. **Texto autoral e honesto**: nada de depoimentos, números de usuários, avaliações ou garantias inventadas; metodologia com fórmulas e exemplos conferidos por teste; premissas perto do resultado; nada de preço de mercado por API.
14. **Páginas obrigatórias do produto**: `início` (herói + lista de ferramentas + texto útil), `ferramentas`, `metodologia`, `sobre`, uma página por ferramenta e o bloco `armazenamento-local`. `apoiar`, `salvos`, `contato`, `política-de-privacidade`, `termos-de-uso` e `página-não-encontrada` vêm prontas de `conteúdo/comum/`.
15. **Descrições** com até 170 caracteres; títulos únicos; exatamente um `<h1>` por página.

## 5. Relatório de entrega (sua resposta final)

Identificação da tarefa, modelo efetivo, lista de arquivos criados/alterados, ferramentas implementadas (obrigatórias e extras), comportamento, testes executados com a saída real resumida (`gerar`, `testar`, `verificar`), limitações honestas e pedidos ao orquestrador.
