# Arquitetura e contratos

Versão do contrato: 1.0.0 — 14/09/2026. Responsável pela integração: orquestrador. Qualquer alteração em `compartilhado/` ou neste contrato passa pelo orquestrador; executores pedem mudanças no relatório de entrega.

## 1. Decisão geral

Os seis produtos são **sites estáticos multipágina**. Toda ferramenta roda no navegador. Não há backend de aplicação, banco, cadastro, chat ou feedback em servidor (ver `decisão-sobre-cadastro-e-servidor.md`). O HTML é **gerado previamente** por um script local a partir de fragmentos; o JavaScript usa **módulos ES nativos**, sem framework e sem dependências em tempo de execução, exceto o gerador de QR Code (MIT) incorporado ao pacote.

Uma etapa de empacotamento (bundler) não foi adotada: ela exigiria dependência adicional e o ganho medido não compensa para páginas pequenas servidas por HTTP/2. Cada página carrega apenas os módulos que importa. A decisão pode ser revista se as medições de desempenho indicarem necessidade.

## 2. Estrutura de cada produto

```text
N. Nome do produto/
├── index.html                    ← GERADO (não editar à mão)
├── páginas/*.html                ← GERADOS
├── robots.txt, sitemap.xml       ← GERADOS
├── package.json                  ← scripts locais do produto (sem dependências)
├── LEIA-ME.md                    ← instruções do produto
├── LICENÇA.txt                   ← autoria e licença
├── conteúdo/
│   ├── páginas/<nome>.html       ← fragmentos-fonte com cabeçalho JSON (seção 4)
│   └── blocos/<nome>.html        ← blocos incluídos em modelos comuns
├── configurações/
│   ├── configuração-pública.json ← dados públicos (seção 8)
│   ├── identidade-visual.json    ← cores-base do produto (usado pelo gerador de paletas)
│   └── ícones-do-produto.json    ← ícones extras do produto
├── estilos/
│   ├── comum/…                   ← SINCRONIZADO de compartilhado/estilos (não editar)
│   ├── produto/cores.css         ← GERADO pelo gerador de paletas (não editar)
│   ├── produto/*.css             ← estilos próprios do produto
│   └── site.css                  ← GERADO: concatenação na ordem definida
├── scripts/
│   ├── comum/…                   ← SINCRONIZADO de compartilhado/scripts (não editar)
│   ├── iniciar-aplicação.js      ← entrada comum de todas as páginas
│   ├── definições-do-produto.js  ← coleções locais do produto (seção 7)
│   ├── páginas/<página>.js       ← orquestrador de cada página de ferramenta
│   ├── cálculos/…                ← funções puras, uma por arquivo
│   ├── validação/…, interface/…, geração/… conforme o produto
├── recursos/
│   ├── fontes/                   ← SINCRONIZADO (woff2 + licença OFL)
│   ├── ícones/ícones.svg         ← GERADO (sprite Lucide, ISC)
│   └── bibliotecas/              ← SINCRONIZADO (qrcode-generator, MIT)
├── ferramentas/                  ← SINCRONIZADO: gerar, servir, construir, verificar
├── testes/*.test.js              ← node:test, funções puras do produto
├── documentação/                 ← guias do produto (AdSense etc.)
└── publicação/                   ← GERADO por `npm run construir` (fora do Git)
```

Nenhum arquivo publicado aponta para `../compartilhado/` ou para outro produto. O script `npm run sincronizar` (raiz) copia `compartilhado/` para dentro de cada produto; cada cópia começa com um comentário indicando a origem.

## 3. Comandos

Na raiz:

| Comando | Efeito |
|---|---|
| `npm install` | Instala dependências de desenvolvimento fixadas (fontes, ícones, QR, leitor de QR para testes). |
| `npm run preparar` | Copia fontes, gera sprites de ícones e paletas a partir de `node_modules` e das configurações. |
| `npm run sincronizar` | Copia `compartilhado/` para os seis produtos. |
| `npm run gerar` / `testar` / `verificar` / `construir` | Executa o comando em todos os produtos. |

Em cada produto (`cd "1. Ferramentas para confeitaria"`):

| Comando | Efeito |
|---|---|
| `npm run gerar` | Gera `index.html`, `páginas/`, `estilos/site.css`, `robots.txt`, `sitemap.xml`. |
| `npm run servir` | Servidor local em `127.0.0.1` na porta do produto (4311–4316). |
| `npm run testar` | `node --test` nos testes do produto. |
| `npm run verificar` | Confere links internos, importações, recursos e padrões proibidos. |
| `npm run construir` | Gera `publicação/` com o pacote publicável e o manifesto de integridade. |
| `npm run visualizar` | Serve exatamente a pasta `publicação/`. |

Portas: 1 confeitaria 4311, 2 educação 4312, 3 artesanato 4313, 4 festas 4314, 5 reforma 4315, 6 embalagens 4316.

## 4. Fragmentos de página

Cada arquivo em `conteúdo/páginas/` começa com um comentário JSON:

```html
<!--página
{
  "título": "Custo da receita",
  "descrição": "Calcule quanto custa cada lote e cada unidade da sua receita.",
  "destaque": "morango",
  "navegação": "ferramentas",
  "script": "páginas/custo-da-receita.js",
  "tipo": "ferramenta",
  "indexar": true,
  "faixaDeApoio": true
}
-->
<section class="ferramenta">…</section>
```

- O nome do arquivo define a saída: `início.html` → `index.html`; qualquer outro → `páginas/<nome>.html`.
- `navegação`: `início`, `ferramentas`, `salvos`, `apoiar` ou `mais` — marca o destino ativo com `aria-current="page"`.
- `destaque`: identificador da paleta da página (seção 6). Cada ferramenta usa um destaque diferente das vizinhas.
- `script`: caminho a partir de `scripts/`. Opcional.
- `tipo`: `ferramenta`, `catálogo` ou `institucional`. Páginas `ferramenta` recebem a faixa de ação inferior se tiverem `<div class="ação-contextual">`.
- Marcadores substituídos pelo gerador: `{{raiz}}` (prefixo relativo até a raiz: `./` ou `../`), `{{marca}}`, `{{ano}}`, `{{versão}}`.
- Links internos sempre com `{{raiz}}`: `<a href="{{raiz}}páginas/preço-de-venda.html">`.
- Modelos comuns (em `compartilhado/conteúdo-comum/`): `apoiar`, `salvos`, `política-de-privacidade`, `termos-de-uso`, `contato`, `página-não-encontrada`. Se o produto tiver um fragmento com o mesmo nome, o do produto prevalece. Modelos comuns incluem blocos do produto com `{{bloco:nome}}` → `conteúdo/blocos/nome.html`.
- Páginas obrigatórias de cada produto: `início`, `ferramentas`, `metodologia`, `sobre` + as ferramentas. As demais vêm dos modelos comuns.

## 5. Estrutura HTML gerada (layout)

```html
<html lang="pt-BR" data-raiz="../" data-prefixo="doce-ofício" data-destaque="morango" data-tipo="ferramenta">
<head> charset, viewport (viewport-fit=cover), title, description, author, theme-color, canonical (se endereço configurado), ícone, preload de fonte, estilos/site.css, scripts (type=module) </head>
<body>
  <a class="pular-para-conteúdo" href="#conteúdo">Pular para o conteúdo</a>
  <header class="cabeçalho">
    <a class="cabeçalho-marca logotipo" href="…index.html"><svg class="marca-símbolo" aria-hidden="true"><use href="…ícones.svg#marca"/></svg><span>Doce <em>Ofício</em></span></a>
    <nav class="cabeçalho-navegação" aria-label="Navegação principal">
      <a class="cabeçalho-link" href="…">Ferramentas</a> … Salvos, Metodologia, Sobre
      <a class="botão botão-primário" href="…apoiar.html">Apoiar por Pix</a>
    </nav>
  </header>
  <main id="conteúdo" class="conteúdo" tabindex="-1"> FRAGMENTO </main>
  <aside class="faixa-de-apoio" …> (quando faixaDeApoio ≠ false e a página não é apoiar) </aside>
  <footer class="rodapé-institucional"> Criado por Anderson · Portfólio · Contato (só se configurados) · links institucionais · botão Preferências de privacidade </footer>
  <nav class="navegação-inferior" aria-label="Navegação do aplicativo"> 4 links .navegação-inferior-item + botão Mais </nav>
  <dialog id="menu-mais" class="menu-mais"> … </dialog>
  <section id="consentimento" class="consentimento" hidden> … </section>
  <dialog id="preferências-de-privacidade" class="diálogo"> … </dialog>
  <div class="região-de-mensagens" role="status" aria-live="polite"></div>
</body>
```

O marcado exato está em `compartilhado/ferramentas/modelo-de-layout.mjs`. Ícones: `<svg class="ícone" aria-hidden="true"><use href="{{raiz}}recursos/ícones/ícones.svg#nome"/></svg>`.

## 6. Sistema visual (baseado em `modelo/Modelo de Site.dc.html`, sistema “Organic”)

Direção: fundo claro quente, títulos em Caprasimo, texto em Figtree, logotipo em Caveat 700 com a segunda palavra na cor de destaque (versão “B — manuscrita moderna” do modelo), símbolo espiral, cantos muito arredondados, botões e campos em pílula, ícones Lucide com traço 2,75. Composição editorial, faixas suaves e listas desenhadas; **não** usar grade de cartões quadrados como estrutura principal.

Variáveis CSS (todas em português):

| Grupo | Variáveis |
|---|---|
| Superfícies | `--cor-fundo`, `--cor-superfície`, `--cor-superfície-elevada`, `--cor-texto`, `--cor-texto-suave`, `--cor-divisória` |
| Rampas | `--cor-neutra-100…900`, `--cor-destaque-100…900`, `--cor-secundária-100…900` |
| Semânticas | `--cor-ação` (fundo de botão primário, contraste ≥ 4,5:1 com `--cor-sobre-ação`), `--cor-ação-hover`, `--cor-ação-pressionada`, `--cor-sobre-ação`, `--cor-texto-destaque` (texto na cor do destaque, ≥ 4,5:1), `--cor-foco`, `--cor-sucesso`, `--cor-erro`, `--cor-aviso` e respectivos fundos `-fundo` |
| Tipografia | `--fonte-título`, `--fonte-corpo`, `--fonte-marca` |
| Espaço | `--espaço-1` (4px) … `--espaço-8` (44px) |
| Raios | `--raio-p` 8px, `--raio-m` 16px, `--raio-g` 28px, `--raio-pílula` 999px |
| Sombras | `--sombra-p`, `--sombra-m`, `--sombra-g` |
| Camadas | `--camada-cabeçalho` 20, `--camada-navegação` 40, `--camada-ação` 45, `--camada-consentimento` 60, `--camada-mensagens` 70, `--camada-diálogo` 80 |
| Medidas | `--altura-navegação-inferior` 64px, `--altura-ação-contextual` 64px |
| Movimento | `--duração-controle` 160ms, `--duração-painel` 260ms, `--curva-suave` |

`estilos/produto/cores.css` é gerado com rampas OKLCH e define, além das variáveis acima, um bloco `[data-destaque="<id>"]` para cada destaque do produto (redefine `--cor-destaque-*`, `--cor-ação*`, `--cor-texto-destaque`).

Classes comuns (definidas em `estilos/comum/`): `.botão` + `.botão-primário | .botão-secundário | .botão-fantasma | .botão-ícone | .botão-bloco | .botão-perigo`; `.etiqueta` + `.etiqueta-destaque | .etiqueta-secundária | .etiqueta-contorno`; `.campo`, `.entrada`, `.seleção`, `.área-de-texto`, `.campo-ajuda`, `.campo-erro`, `.campo-com-unidade` + `.unidade`, `.grupo-de-campos`, `.opções` + `.opção` (rádio/caixa em pílula), `.segmentado`, `.interruptor`; `.ferramenta`, `.ferramenta-cabeçalho`, `.ferramenta-corpo`, `.ferramenta-formulário`, `.ferramenta-resultado`, `.ações-do-formulário`; `.resultado-destaque` (+ `.resultado-valor`, `.resultado-rótulo`), `.lista-de-resultado` (dl), `.memória-de-cálculo` (details), `.estado-vazio`; `.linhas-editáveis`, `.linha-editável`; `.tabela` + `.tabela-rolável`; `.aviso` + `.aviso-informação | .aviso-sucesso | .aviso-erro | .aviso-alerta`; `.faixa`, `.faixa-suave`, `.herói`, `.lista-de-ferramentas` + `.item-de-ferramenta`; `.premissas`; `.ação-contextual`; `.espaço-publicitário`; `.diálogo`, `.diálogo-título`, `.diálogo-corpo`, `.diálogo-ações`; `.visualmente-oculto`, `.não-imprimir`, `.somente-impressão`, `.área-de-impressão`, `.quebra-de-página`.

Regras de interface obrigatórias:

- Sem `alert()`, `confirm()` ou `prompt()`. Usar `confirmarAção`, `exibirMensagem` e `mostrarErroDeCampo`.
- Sem atributos `style="…"`, `<style>` ou `<script>` em linha, nem `on*=` no HTML: a CSP do perfil sem anúncios bloqueia. Estilo dinâmico só via `elemento.style.propriedade` ou classes.
- Sem `innerHTML`, `outerHTML`, `insertAdjacentHTML` ou `document.write` com dados. Construir DOM com `criarElemento` ou `textContent`.
- Campos com fonte ≥ 16px, alvos ≥ 44×44px, foco visível, rótulo associado, mensagens de erro junto ao campo (`aria-describedby`, `aria-invalid`).
- No celular, a ação principal da ferramenta fica em `<div class="ação-contextual"><button type="submit" form="id-do-formulário" class="botão botão-primário">Calcular</button></div>`; o botão equivalente dentro do formulário recebe a classe `.somente-computador`.
- Movimento só com `transform`/`opacity`, respeitando `prefers-reduced-motion`.

## 7. Contratos JavaScript comuns (`scripts/comum/`)

Cada função exportada tem arquivo próprio com o mesmo nome em kebab-case. Todos os caminhos abaixo são relativos a `scripts/comum/`.

| Arquivo | Assinatura | Observação |
|---|---|---|
| `iniciar-aplicação-comum.js` | `iniciarAplicaçãoComum({ coleçõesLocais })` | Liga navegação, menu Mais, teclado virtual, consentimento, faixa de apoio, anúncios, página de apoio e de salvos quando presentes. |
| `configuração/carregar-configuração.js` | `carregarConfiguração(): Promise<{ configuração, problemas, apoioDisponível, publicidadeDisponível }>` | Lê `configurações/configuração-pública.json` uma vez. |
| `configuração/validar-configuração.js` | `validarConfiguração(dados)` | Pura; mesma forma de retorno. |
| `validação/interpretar-número-brasileiro.js` | `interpretarNúmeroBrasileiro(texto, { permitirNegativo, casasMáximas })` → `{ válido, valor }` ou `{ válido: false, erro }` | Aceita `1.234,56`, `1234,56`, `2.5`; rejeita vazio, expoente, `Infinity`, texto. |
| `validação/validar-quantidade.js` | `validarQuantidade(texto, { rótulo, mínimo, máximo, inteiro, permitirZero, casasMáximas })` | Mensagens em português prontas para exibição. |
| `validação/escapar-xml.js` | `escaparXml(texto)` | Para SVG/XML exportado. |
| `validação/escapar-csv.js` | `escaparCsv(valor)` | Neutraliza `= + - @` iniciais. |
| `validação/validar-url-externa.js` | `validarUrlExterna(texto)` → URL normalizada ou `null` | Só `https:` e `mailto:`. |
| `formatação/formatar-moeda.js` | `formatarMoeda(valorEmReais)` → `R$ 1.234,56` | `Intl.NumberFormat('pt-BR')`. |
| `formatação/formatar-centavos.js` | `formatarCentavos(centavos)` | Inteiros. |
| `formatação/formatar-número.js` | `formatarNúmero(valor, { casas, casasMínimas })` | |
| `matemática/arredondar-para-centavos.js` | `arredondarParaCentavos(valor, modo = 'próximo' \| 'acima' \| 'abaixo')` → centavos inteiros | Tolerância contra erro de ponto flutuante. |
| `matemática/arredondar-para-cima.js` | `arredondarParaCima(valor)` → inteiro | `Math.ceil` com tolerância (ex.: 22/2,2 = 10). |
| `interface/criar-elemento.js` | `criarElemento(tag, { classe, texto, atributos, dados }, filhos)` | Construção segura de DOM. |
| `interface/abrir-diálogo.js` / `fechar-diálogo.js` | `abrirDiálogo(diálogo)` / `fecharDiálogo(diálogo, valor)` | `<dialog>.showModal()`, restaura foco. |
| `interface/confirmar-ação.js` | `confirmarAção({ título, mensagem, confirmar, cancelar, perigosa })` → `Promise<boolean>` | |
| `interface/exibir-mensagem.js` | `exibirMensagem(texto, { tipo, duração })` | Região `aria-live`. |
| `interface/mostrar-erro-de-campo.js` | `mostrarErroDeCampo(entrada, mensagem)` | Usa `#<id>-erro`. |
| `interface/limpar-erros-de-campo.js` | `limparErrosDeCampo(formulário)` | |
| `interface/focar-primeiro-erro.js` | `focarPrimeiroErro(formulário)` | |
| `interface/configurar-navegação.js`, `configurar-menu-mais.js`, `configurar-teclado-virtual.js` | sem parâmetros | |
| `interface/obter-raiz.js` | `obterRaiz()` → `data-raiz` do `<html>` | |
| `privacidade/ler-consentimento.js` | `lerConsentimento({ armazenamento, versão, agora })` → objeto ou `null` | `null` quando ausente, expirado, de outra versão ou armazenamento indisponível. |
| `privacidade/salvar-consentimento.js` | `salvarConsentimento({ publicidade, medição }, opções)` | Dispara `consentimento-alterado`. |
| `privacidade/revogar-consentimento.js` | `revogarConsentimento(opções)` | |
| `privacidade/configurar-consentimento.js` | `configurarConsentimento(configuração)` | Banner e diálogo. |
| `publicidade/pode-carregar-anúncios.js` | `podeCarregarAnúncios({ configuração, consentimento, página })` → `{ pode, motivo }` | Pura. |
| `publicidade/carregar-anúncios.js` | `carregarAnúncios(configuração)` | Script único, blocos iniciados uma vez. |
| `apoio/*` | `validarValorPix`, `calcularCrcPix`, `montarCampoEmv`, `normalizarTextoPix`, `validarChavePix`, `gerarPayloadPix`, `renderizarCódigoQr`, `copiarTexto`, `configurarPáginaDeApoio`, `configurarFaixaDeApoio` | Ver seção 9. |
| `armazenamento/criar-armazenamento.js` | `criarArmazenamento({ prefixo, armazenamento })` → `{ disponível, ler, gravar, remover, listarChaves }` | Envolve `localStorage` com `try/catch`. |
| `armazenamento/salvar-registro-local.js` etc. | `salvarRegistroLocal(coleção, registro, opções)`, `listarRegistrosLocais`, `lerRegistroLocal`, `excluirRegistroLocal`, `duplicarRegistroLocal` | Registro recebe `id`, `criadoEm`, `atualizadoEm`. |
| `armazenamento/analisar-json-seguro.js` | `analisarJsonSeguro(texto, { tamanhoMáximo, profundidadeMáxima })` | Remove `__proto__`, `constructor`, `prototype`. |
| `armazenamento/exportar-cópia-local.js` / `importar-cópia-local.js` | Cópia `{ esquema, versão, exportadoEm, coleções }` | Importação só aceita coleções conhecidas com validador. |
| `armazenamento/baixar-arquivo.js` | `baixarArquivo(nome, conteúdo, tipo)` | Blob + link temporário. |
| `armazenamento/configurar-página-de-salvos.js` | `configurarPáginaDeSalvos(coleçõesLocais)` | |
| `impressão/imprimir-página.js` | `imprimirPágina()` | |
| `pdf/criar-documento-pdf.js` | `criarDocumentoPdf({ título, autor })` → `{ novaPágina, texto, linha, retângulo, larguraDoTexto, gerarBytes }` | Unidades em mm, A4 retrato por padrão, fonte Helvetica WinAnsi. |

### Orçamento ao cliente (`scripts/comum/orçamento/`, requisito do proprietário de 15/09/2026)

| Arquivo | Assinatura | Observação |
|---|---|---|
| `montar-orçamento.js` | `montarOrçamento({ marca, emissor: { nome, contato }, cliente: { nome }, título, itens: [{ descrição, quantidade, unidade, preçoUnitárioEmCentavos }], descontoEmCentavos, observações, prazo, validadeEmDias })` → `{ válido, orçamento }` ou `{ válido: false, erro, campo }` | Nome ≤ 80, título ≤ 120, até 50 itens, descrição ≤ 120, unidade ≤ 12, observações ≤ 600, quantidade > 0, preço em centavos inteiros. |
| `calcular-totais-do-orçamento.js` | `calcularTotaisDoOrçamento(orçamento)` → `{ itens, subtotalEmCentavos, descontoEmCentavos, totalEmCentavos }` | Arredonda cada item uma vez; desconto limitado ao subtotal. |
| `renderizar-orçamento.js` | `renderizarOrçamento(orçamento, { marca })` → `.documento-de-orçamento` | Marca padrão: a da página. |
| `baixar-pdf-do-orçamento.js`, `baixar-planilha-do-orçamento.js` | `Promise` | PDF com cores da página; planilha .xlsx com números reais. |
| `compartilhar-orçamento.js` | `compartilharOrçamento(orçamento)` → `'compartilhado' \| 'copiado' \| 'manual' \| 'cancelado' \| 'falhou'` | `'manual'`: o componente já mostrou o link para cópia manual. |
| `criar-link-do-orçamento.js` | `criarLinkDoOrçamento(orçamento)` → URL de `páginas/orçamento-compartilhado.html#o=…` | Orçamento compactado no fragmento; validado de novo na abertura. |
| `ler-dados-do-emissor.js`, `salvar-dados-do-emissor.js` | `lerDadosDoEmissor()`, `salvarDadosDoEmissor({ nome, contato })` | Só neste aparelho (`<prefixo>:emissor`). |

Chaves de armazenamento: `<prefixo>:consentimento`, `<prefixo>:apoio-dispensado-até`, `<prefixo>:coleção:<chave>`. Prefixo único por produto (`data-prefixo`). Prefixo evita colisão, não isola segurança entre páginas da mesma origem.

### Definições do produto

`scripts/definições-do-produto.js`:

```js
export const coleçõesLocais = [
  {
    chave: 'receitas',
    rótulo: 'Receitas',
    rótuloSingular: 'receita',
    páginaDeEdição: 'páginas/custo-da-receita.html', // abre com ?registro=<id>
    descrever: (registro) => `${registro.nome} — rende ${registro.rendimento} unidades`,
    validar: (registro) => validarRegistroDeReceita(registro), // true/false, usado na importação
  },
];
```

## 8. Configuração pública

`configurações/configuração-pública.json` (tudo público; nenhum segredo):

```json
{
  "versãoDoEsquema": 1,
  "site": { "marca": "Doce Ofício", "marcaDestaque": "Ofício", "descrição": "…", "prefixoDeArmazenamento": "doce-ofício", "versão": "1.0.0" },
  "criador": { "nome": "Anderson", "portfólio": "", "contato": "" },
  "publicação": { "endereçoBase": "" },
  "privacidade": { "versãoDaPolítica": "2026-09-14", "validadeDoConsentimentoEmDias": 180, "contatoDePrivacidade": "", "modoDeConsentimento": "autoral" },
  "publicidade": { "ativa": false, "identificadorDoPublicador": "", "blocos": {}, "consentimentoConfigurado": false, "cmp": "nenhuma" },
  "apoio": { "ativo": false, "chavePix": "", "nomeDoRecebedor": "", "cidadeDoRecebedor": "", "valoresSugeridosEmCentavos": [100, 500, 1000, 2000, 3000, 5000, 10000] }
}
```

Regras: publicidade só ativa com `ca-pub-` + 16 dígitos, pelo menos um bloco numérico, `consentimentoConfigurado: true`; apoio só ativo com chave válida, nome (≤ 25) e cidade (≤ 15). URLs de portfólio/contato: `https:` ou `mailto:`. Campos ausentes deixam o recurso indisponível sem quebrar a página.

## 9. Pix

BR Code estático conforme o Manual de Padrões para Iniciação do Pix: `00` = `01`; `26` = { `00` `br.gov.bcb.pix`, `01` chave }; `52` `0000`; `53` `986`; `54` valor com duas casas; `58` `BR`; `59` nome (≤ 25, sem acentos); `60` cidade (≤ 15, sem acentos); `62` { `05` `***` }; `63` CRC16-CCITT (0x1021, inicial 0xFFFF) em hexadecimal maiúsculo. Valor em centavos inteiros, de R$ 0,01 a R$ 99.999,99. Chave e recebedor vêm só da configuração publicada.

## 10. Publicidade e consentimento

Consentimento autoral padrão: “Aceitar opcionais”, “Rejeitar opcionais”, “Personalizar”; publicidade desativada até aceite. `podeCarregarAnúncios` só retorna `pode: true` com configuração completa, consentimento para publicidade e página que permite anúncio (páginas de atividade infantil e impressão não permitem). Modo `cmp: "google"` preparado: aguarda sinal TCF documentado (`__tcfapi`) antes de carregar anúncios. Nada é carregado antes da escolha.

## 11. Testes

- Funções puras: `testes/*.test.js` com `node:test` e `node:assert/strict`, importando de `../scripts/…`.
- Módulos comuns: `compartilhado/testes/` (Pix com decodificação independente por jsQR, CRC, números, armazenamento, importação maliciosa, PDF).
- Interface: navegador real (painel Chromium do Claude Code) nas larguras 320, 360, 390, 768, 1024, 1440 e paisagem curta.

## 12. Propriedade de arquivos

| Área | Escritor |
|---|---|
| `compartilhado/`, `documentação/arquitetura-e-contratos.md`, `configurações/identidade-visual.json`, `estilos/produto/cores.css`, `ferramentas/`, `*/comum/` | Orquestrador (estilos comuns e scripts de interface: especialista em interface, sob contrato) |
| Produto N (`conteúdo/`, `scripts/` exceto `comum/`, `estilos/produto/` exceto `cores.css`, `testes/`, `documentação/` do produto, `configurações/ícones-do-produto.json`) | Executor do produto N |
| `documentação/` central (guias, inventário, licenças) | Assistente de documentação, revisado pelo orquestrador |
| Pareceres | Críticos (somente leitura do código) |
