# Parecer — Crítico 2 (UX/UI e Produto)

**Escopo:** `portal/` apenas. Pastas numeradas da raiz e `versões/` ignoradas.
**Data:** 2026-09-20 · **Build auditado:** 30 ferramentas `pronta` de 150 no catálogo, 30 pastas em `portal/f/`.

## Como medi (e o que isso não prova)

As ferramentas de navegador do painel (`mcp__Claude_Browser__*`) **não estavam disponíveis nesta sessão** — `ToolSearch` respondeu
`ToolSearch is disabled for this session, in subagents as well as here` nas duas tentativas. Não foi possível criar aba com `tabs_create`.

Para não entregar um parecer sem número, medi com **Chrome 1:1 real** (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
dirigido pelo DevTools Protocol, contra o servidor já em pé em `http://127.0.0.1:4400/`. Todas as medidas vêm de
`getBoundingClientRect`, `getComputedStyle`, `performance.getEntriesByType` e `elementFromPoint` executados na página.
Nenhum arquivo de produção foi alterado.

**Isto é emulação, não aparelho físico.** Consequências honestas disso:
- `Emulation.setDeviceMetricsOverride` reproduz o *layout*, não o comportamento do teclado virtual do iOS/Android nem a
  `env(safe-area-inset-*)` real de um iPhone com notch. Os valores de safe area voltam **0** no emulador.
- O item sobre teclado virtual abaixo é uma **simulação por redução de viewport**, não uma verificação em aparelho.
- O item sobre `position: fixed` + teclado no iOS Safari **não foi verificado** e está marcado como pendente.
- O servidor de desenvolvimento (`ferramentas/servir.mjs`) **não comprime** nada e **não serve `404.html`**
  (devolve 24 bytes de texto puro). Os números de peso abaixo são **sem compressão** e o 404 real não pôde ser exercitado.

---

```text
STATUS: REPROVADO

PROBLEMAS VISUAIS:
- portal/estilos/componentes.css:116 — `.ferramenta-linha[data-status="planejada"] { opacity: .62 }` derruba o contraste
  abaixo do mínimo WCAG AA em 120 das 150 linhas do catálogo (80%). Medido em 390×844, tema claro, /ferramentas.html:
  nome da ferramenta 6,17:1 antes da opacidade e **3,11:1** depois; resumo 5,32:1 antes e **2,80:1** depois.
  Esperado: ≥ 4,5:1 para texto de 14–16 px. (Uma varredura de contraste ingênua não pega isto porque `getComputedStyle().color`
  não muda — é a opacidade do ancestral que compõe a cor. Sem a opacidade, o portal passa: 0 falhas em 722 nós de texto
  medidos em /, /ferramentas.html, /f/preco-de-venda/ e /f/orcamento/, nos dois temas.)
- portal/estilos/layout.css (bloco `.ferramenta-linha`) e portal/ferramentas.html — em 320×568 a página não cabe:
  `scrollWidth` 334 contra `clientWidth` 320 em `/`, `/ferramentas.html` e `/salvos.html` (14 px de estouro).
  190 elementos ultrapassam a borda direita em /ferramentas.html a 320 px. O Chrome mobile compensa reduzindo a escala
  para 0,958 (a viewport reportada vira 334×593 em vez de 320×568), então todo o texto do site encolhe ~4% nesse aparelho.
  Esperado: `scrollWidth <= clientWidth` em 320. Em 360, 390, 768, 1024, 1366, 1440 e 1920 está correto (`scrollWidth == clientWidth`).
- portal/ferramentas.html — o botão de filtro "Vendas e propostas" chega a `right = 371` numa viewport de 320, e
  "Cálculo e conversão" a `right = 525` numa de 390. A faixa de 17 chips é um rolador horizontal com `white-space: nowrap`
  e `overflow-x` no pai, o que é legítimo, mas **não há nenhuma pista visual de que ela rola** (sem sombra de borda,
  sem chip cortado pela metade no limite): as 13 categorias seguintes ficam invisíveis. Medido em 320/360/390.
- portal/estilos/componentes.css:104 — `.ferramenta-linha__nome` mede 224×23 px em 390×844, dentro de uma linha de 63 px.
  A linha inteira tem estado de `:hover` (borda, sombra, seta que muda de cor) e uma seta ">" à direita, ou seja, aparenta
  ser clicável inteira, mas não é (detalhe em PROBLEMAS MOBILE).
- portal/scripts/núcleo/lista.js:9 — o comentário do próprio código diz "Linha compacta de ~54 px". O medido é
  **63 px** em todas as larguras, e **86 px** em 320 e 360 quando o nome quebra em duas linhas. A intenção declarada
  não bate com o resultado, embora 63 px já seja uma melhora real sobre os cards que o proprietário reclamou.
- portal/estilos/componentes.css:312 — a regra `.ferramenta-linha--destacada` existe, mas a classe **nunca é aplicada**
  por nenhum script. É estilo morto para um recurso que ficou pela metade (ver o item da ferramenta planejada).

PROBLEMAS DE UX:
- portal/scripts/núcleo/lista.js:14-31 — **clicar numa ferramenta "Planejada" é um beco sem saída.** Passo: abrir
  /ferramentas.html em qualquer largura, tocar em "Calculadora de comissão". O `href` é `ferramentas.html#comissao`,
  ou seja, a própria página. Medido depois da navegação: **não existe elemento com `id="comissao"`** (`getElementById`
  devolve null), `scrollY` fica em **0**, a linha correspondente está em `top = 2407 px` (fora da tela), a linha
  **não recebe destaque** (`className` continua `ferramenta-linha`, sem `--destacada`) e nenhuma ficha ou diálogo abre.
  Resultado prático: a página recarrega no topo, o filtro e a busca que a pessoa tinha aplicado são perdidos, e nada
  explica o que aconteceu. Isso vale para **120 das 150 entradas do catálogo**. Pior: portal/index.html publica a promessa
  "Preferimos mostrar a ficha do que elas vão fazer a abrir uma tela vazia" — e não existe ficha nenhuma.
  Além disso `aria-disabled="true"` num `<a href>` que continua focável e continua navegando é antipadrão: o leitor de tela
  anuncia "desabilitado" e o link funciona mesmo assim.
- portal/scripts/páginas/catálogo.js:34 — **o botão Voltar do navegador expulsa a pessoa do catálogo.** Passo medido em
  1366×768: abrir /ferramentas.html, clicar no filtro "Datas e horas" (URL vira `?categoria=datas`, 5 resultados),
  digitar "prazo" (URL vira `?busca=prazo&categoria=datas`, 5 resultados), apertar Voltar.
  Resultado: vai para `http://127.0.0.1:4400/` (a home), com 0 filtros e busca vazia.
  Causa: `history.replaceState` em vez de `pushState` — nenhum estado de filtro entra no histórico.
  Esperado: Voltar desfaz o último filtro/busca e só sai do catálogo depois de desfazer todos. No celular, onde Voltar
  é o gesto principal, isto significa perder todo o trabalho de filtragem num toque.
- portal/scripts/núcleo/busca.js:78-100 — **a busca devolve muito ruído e não tolera erro de digitação.** Medido em
  /ferramentas.html (número de resultados e os 5 primeiros):
    "quanto cobrar" → **41 de 150**; "rachar conta" → **22**, com "Gerador de QR Code" em 2º, "Contador de texto" em 3º
    e "Dividir PDF" em 4º; "tirar duplicado da planilha" → **22**, com "Orçamento e proposta" em 3º e
    "Simulador de parcelamento" em 4º; "senha forte" → **10**, com "Validador de CPF e CNPJ" em 3º;
    "transformar pdf em excel" → **32**; "quantos dias faltam" → **7**, com "Calculadora de tinta" e "Papel de parede"
    entre os 5 primeiros.
  Causa medida: `campos.nome.includes(palavra)` compara **substring, não palavra** — "conta" casa com "Contador",
  com "contato" (resumo do QR Code) e com "Conta caracteres"; e um único acerto fraco de 6 pontos em `categoria`
  já é suficiente para entrar na lista (`if (encontradas === 0) return 0` é o único piso). Não existe corte por
  relevância mínima. Esperado: um piso de pontuação e casamento por palavra; "rachar conta" deveria devolver 1 a 3
  ferramentas, não 22.
  Erro de digitação: **"porcentagen" → 0 resultados**, com "Calculadora de porcentagem" existindo e pronta. Na home,
  a mesma frase só oferece "Ver o catálogo completo". Já "divdir conta" acerta "Divisão de contas" em 1º — mas por sorte,
  porque a segunda palavra casou; não há tolerância a erro nenhuma. Sem acento funciona bem ("orcamento" → 1 resultado exato).
- portal/dados/catálogo/ — **"bolo" devolve 1 resultado, e é uma ferramenta que não existe.** Passo: buscar "bolo" em
  /ferramentas.html. Resultado: "Planejador de festa infantil [Planejada]". "Preço de venda" não aparece, embora seja a
  resposta certa e embora a própria documentação dela ("Como usar" → Exemplo) e o exemplo padrão do orçamento
  ("Bolo de chocolate; 2; 85,00") usem bolo. Dado que confeitaria é um dos seis produtos de origem, esta é a consulta
  mais provável do público e ela falha.
- portal/scripts/núcleo/montador.js:203-208 + portal/scripts/cálculos/dinheiro.js:83 — **mensagem de erro útil escrita e
  nunca mostrada.** Passo em /f/preco-de-venda/: custo 80, margem 80, taxas 20, imposto 10, unidades 1, clicar em
  "Calcular preço". O que a pessoa vê: o aviso genérico **"Algo deu errado no cálculo. Confira os valores e tente de novo."**,
  nenhum erro em campo nenhum (`.campo__erro` visíveis: 0), foco parado no botão, e nenhum resultado.
  O que estava escrito no código: "Margem, taxas e imposto somam 100% ou mais: não sobra preço possível. Reduza algum deles."
  — vai só para `console.error`. Causa: `dinheiro.js` lança `Error` puro; `montador.js` só encaminha `ErroDeEntrada` para o campo.
  Há **96 `throw new Error(...)` em `scripts/cálculos/` e `scripts/comum/`** com mensagens boas no mesmo estado, entre elas
  "A entrada não pode cobrir o valor todo" (parcelamento), "Escolha pelo menos um tipo de caractere" (senhas) e
  "Você pediu N resultados, mas só existem M itens" (sorteio).
- portal/f/orcamento/index.html + portal/scripts/ferramentas/auxiliares/orcamento-compartilhado.js — **o cliente que abre
  o link recebe a página de produto da ferramenta, não o orçamento.** Passo: montar o orçamento, "Copiar link para o
  cliente", abrir o link numa aba limpa em 390×844. O decodificador funciona (total R$ 315,00 correto, link adulterado
  tratado com "Este link está incompleto ou foi alterado no caminho."), mas em volta dele ficou tudo o que é do autor:
    · `document.title` = "Orçamento e proposta — Ferramentas do Ander" (não o nome do emissor nem do cliente);
    · `<h1>` = "Orçamento e proposta" (o nome do emissor é só `<h2>`) — para um documento, a hierarquia está invertida;
    · caminho "Início › Vendas e propostas › Orçamento e proposta" visível;
    · a `dl.ficha` inteira ("Para que serve / Você informa / Você recebe / Onde processa / Você pode levar"), escrita
      para quem vai *usar a ferramenta*, não para quem vai *ler o orçamento*;
    · a seção "Como usar" abaixo, com instruções do autor: "Preencha seus dados uma vez: eles ficam salvos neste navegador
      para o próximo orçamento";
    · a lateral "Como funciona a conta" e "Ferramentas relacionadas".
  Medido: o orçamento só começa em **y = 619** em 390×844 e o total (R$ 315,00) em **y = 855**, ou seja, **abaixo da
  primeira dobra de 844 px**. O cliente vê propaganda de ferramenta e precisa rolar para achar o preço.
  Em 1366×768 o orçamento começa em y = 289 e o total em y = 506 — aceitável no computador, ruim no celular.
- portal/estilos/páginas.css:141-146 — **imprimir o orçamento do cliente sai errado.** Passo: abrir o link `#o=`,
  clicar em "Imprimir". Medido com `media: print`: `.topo`, `.barra-inferior`, `.rodapé`, `.caminho` e `.ferramenta-lado`
  ficam `display: none` (correto — **não há navegação nem anúncio na impressão**), mas `.ficha` continua `grid`,
  `#como-usar` continua `block` e os botões `.ações` continuam `flex`. O texto impresso começa com:
  "PARA QUE SERVE Enviar um orçamento apresentável sem abrir editor de texto nem planilha. VOCÊ INFORMA … VOCÊ RECEBE …
  ONDE PROCESSA No seu navegador. Nada é enviado. VOCÊ PODE LEVAR PDF, planilha Excel…" — e só **depois** disso vem
  "ORÇAMENTO RECEBIDO Ateliê da Ana". O cliente imprime a ficha de produto do portal antes do próprio orçamento, e ainda
  leva os botões "Imprimir" e "Montar o meu" impressos no papel, mais o FAQ inteiro de "Como usar".
- portal/scripts/ferramentas/qr-code.js — em "Tipo de conteúdo = Link" o segundo campo fica **visível** (`display: grid`),
  desabilitado, com o rótulo literal **"Não usado neste tipo"** e a dica "Senha da rede ou telefone do contato, conforme o tipo."
  logo abaixo. Um campo cujo nome é "não usado" é ruído; o certo é escondê-lo. (Quando se escolhe "Rede Wi-Fi" os rótulos
  mudam corretamente para "Nome da rede (SSID)" e "Senha da rede" — essa parte está boa.)
- portal/scripts/ferramentas/qr-code.js — o Wi-Fi assume sempre WPA. Verificado pelo tamanho do payload: SSID "LojaDaAna"
  + senha "senha12345" gerou "37 caracteres codificados", que é exatamente `WIFI:T:WPA;S:LojaDaAna;P:senha12345;;`.
  Não há opção para rede aberta (`nopass`) nem WEP, e a documentação não avisa. Quem tem Wi-Fi sem senha vai gerar um
  código que não conecta.

PROBLEMAS MOBILE:
- portal/scripts/núcleo/lista.js:19-30 — **a linha de ferramenta não é clicável; só o título é.** Passo em 390×844,
  /ferramentas.html: tocar na descrição, no ícone colorido, na seta ">" da direita ou em qualquer espaço vazio da linha.
  Medido com `elementFromPoint` na base e na borda esquerda da linha: devolve `DIV.ferramenta-linha` (não o `<a>`),
  e `getComputedStyle(a, '::after').position` é `static` — não existe link esticado. O único handler delegado em
  `ligarFavoritos` (lista.js:57) trata apenas `[data-favorito]`.
  Números: linha de **63 × 366 px** (23.058 px²), área realmente tocável de **224 × 23 px** (5.152 px²) →
  **22% da linha funciona**. A altura de 23 px fica abaixo do mínimo de 24×24 px da WCAG 2.2 AA (2.5.8) e muito abaixo
  dos 44 px de prática de toque. Isto vale para os dois caminhos principais de entrada em qualquer ferramenta:
  a lista "Prontas para usar" da home e as 150 linhas do catálogo.
- portal/f/*/index.html (modelo em portal/ferramentas/modelo-de-página.mjs) — **o preâmbulo da página de ferramenta
  empurra o formulário para fora da tela.** Medido em /f/preco-de-venda/ (composição: cabeçalho 57 px + caminho 30 px
  + `.ferramenta-topo` 190 px no celular + `.ficha` 294–372 px):
    · 320×568 — área útil acima da barra inferior: 507 px. Primeiro campo em **y = 694** (precisa rolar 229 px só para
      escrever o primeiro valor); botão "Calcular preço" em **y = 1201** (738 px de rolagem, ~1,5 tela extra).
      A `.ficha` sozinha ocupa **372 px = 73% da tela**.
    · 360×640 — útil 579 px. Primeiro campo em y = 636 (99 px de rolagem); botão em y = 1143 (608 px).
      `.ficha` = 313 px = 54% da tela.
    · 390×844 — útil 783 px. Primeiro campo em y = 616 (aparece raspando); botão em y = 1105 (366 px de rolagem).
    · 740×360 paisagem — útil 299 px. Primeiro campo em y = 384 (127 px); botão em y = 578 (323 px).
    · 768×1024, 1024×768, 1366×768, 1440×900 — campo e botão cabem na primeira dobra. Aqui está correto.
  Esperado pelo próprio enunciado do projeto ("primeira dobra útil sem rolagem"): numa página cujo único propósito é
  usar a ferramenta, o primeiro campo deveria estar visível em 320 e 360 também. A queixa do proprietário
  ("precisa ficar rolando tela sem necessidade") foi resolvida na home e no catálogo e reapareceu aqui.
- portal/ferramentas.html — 150 linhas no DOM de uma vez, sem paginação, sem virtualização, sem `content-visibility`
  (medido: `contentVisibility: "visible"`, `contain-intrinsic-size: "none"`, 2.835 nós). Altura do documento em 390×844:
  **13.489 px = 17,2 telas** de rolagem. Não há cabeçalho de categoria dentro da lista para quebrar essas 17 telas.
  Em 1366×768 são 4.953 px = 6,4 telas.
- portal/estilos/layout.css:135-142 — em paisagem curta (740×360) a barra inferior de 61 px continua fixa e soma-se ao
  cabeçalho de 57 px: **118 px de 360 = 33% da tela é cromo**, sobrando 242 px de conteúdo. Medido igual em /,
  /ferramentas.html e /f/preco-de-venda/. Esperado: recolher a barra inferior (ou o cabeçalho) abaixo de ~420 px de altura.
- **Safe area — não verificável aqui, e é o item que mais precisa de aparelho físico.** O CSS faz o certo no papel
  (`env(safe-area-inset-bottom)` em `núcleo.css:136` no `body` e em `layout.css:126` na `.barra-inferior`, mais
  `viewport-fit=cover` no `<meta>` de todas as páginas), mas no emulador `env(safe-area-inset-*)` resolve para 0,
  então **não posso afirmar que a barra inferior não colide com a barra de gestos do iPhone**. Fica pendente para
  teste em aparelho. Note que `.rodapé` reserva o espaço da barra via
  `padding-bottom: calc(var(--altura-barra-inferior) + 12px)` — se alguma página futura não terminar em rodapé,
  o conteúdo final vai ficar sob a barra.

PROBLEMAS DE CONTEÚDO:
- portal/scripts/núcleo/montador.js:36 e :56 — `Informe ${rótulo.toLowerCase()}.` produz português sem artigo em
  **todos os campos obrigatórios das 30 ferramentas**. Colhido rodando as ferramentas e submetendo vazio:
  "Informe custo do lote." (/f/preco-de-venda/), "Informe valor inicial." (/f/juros/), "Informe dados." (/f/limpar-planilha/),
  "Informe endereço." (/f/qr-code/), "Informe renda desejada." (/f/valor-da-hora/), "Informe quem recebeu." (/f/recibo/)
  e o pior: **"Informe valor a."** em /f/regra-de-tres/ — ambíguo além de agramatical.
  Esperado: "Informe o custo do lote.", "Informe os dados.", "Informe o valor A."
- portal/README.md — está inteiro desatualizado e descreve **outro produto**: fala em "49 ferramentas reais agrupadas em
  seis áreas" (são 150 no catálogo, 30 prontas), porta 4480 (o `package.json` usa 4400), `npm run dev` (o script é
  `npm run servir`), além de banners rotativos a cada 30 segundos, modal de boas-vindas, faixa de avisos rolante, schema
  Prisma, login Google/Apple/X, `/api/health` e `DATABASE_URL` — nada disso existe no portal auditado, que é estático.
  Também instrui `npm run prisma:generate` e `npm run kill`, scripts que **não existem** no `package.json`.
- portal/f/csv-e-json/index.html:88 — "Para que serve: Levar dados de uma planilha para uma **API** e vice-versa."
  Fala com desenvolvedor num campo que deveria falar com qualquer pessoa. (É a única ocorrência do tipo que encontrei;
  a ferramenta está na categoria Desenvolvimento, o que atenua, mas o rótulo do campo é "Para que serve".)
- portal/scripts/ferramentas/orcamento.js:74 — a documentação promete "Baixe o PDF…, a planilha…, ou copie o link para o
  cliente abrir no celular", e o link de fato abre — mas abre no estado descrito acima (ficha da ferramenta antes do
  orçamento). A promessa "mostra o orçamento com o seu nome e o valor" (FAQ da própria ferramenta) só se cumpre
  depois de 619 px de rolagem no celular.
- portal/scripts/ferramentas/preco-de-venda.js:21 — "Se a soma passar de 100%, não existe preço possível e a ferramenta
  **avisa** em vez de devolver um número absurdo." Ela não avisa: dá o erro genérico (detalhado acima). Esta é a
  divergência documentação-versus-realidade mais grave que encontrei.

CORREÇÕES OBRIGATÓRIAS:
1. Tornar a linha inteira clicável (lista.js) e o alvo ≥ 44 px.
2. Dar destino real à ferramenta "Planejada" — ou ficha, ou parar de fingir que é um link.
3. Trocar `replaceState` por `pushState` no catálogo para o botão Voltar funcionar.
4. Encaminhar as mensagens de erro reais dos cálculos até o usuário.
5. Corrigir o contraste das linhas "Planejada" (opacidade .62).
6. Encurtar o preâmbulo da página de ferramenta até o formulário caber em 360×640.
7. Separar a vista do cliente (`#o=`) da página da ferramenta, inclusive na impressão.
8. Pôr piso de relevância e tolerância a erro de digitação na busca.
9. Corrigir o estouro horizontal em 320 px.
10. Corrigir a concordância de "Informe …" no montador.
11. Reescrever o `README.md`, que descreve outro produto.

MELHORIAS OPCIONAIS:
- Carregamento sob demanda do catálogo: uma página de ferramenta baixa **117 KB de metadados** do catálogo
  (`catálogo.js` + os 5 arquivos de categoria: ofício-e-estudos 25,8 KB, conteúdo 24,2 KB, trabalho-e-operações 23,6 KB,
  dados-e-técnica 21 KB, finanças 15,8 KB) para usar **uma** entrada. O código da própria ferramenta pesa **5 KB**.
  São 96% de carga inútil. Um índice enxuto (slug + nome + ícone + categoria) para o cabeçalho e a busca resolveria.
- Juntar as 5 folhas de estilo (`núcleo`, `fontes`, `layout`, `componentes`, `páginas` = 35–38 KB) num arquivo só:
  hoje são 5 requisições que bloqueiam a pintura em toda página.
- Reduzir a cascata de módulos: 25 requisições `.js` numa página de ferramenta, 17 na home e no catálogo
  (total de 36 / 29 / 28 requisições e 293 / 291 / 260 KB transferidos, **sem compressão**).
  Localmente o desempenho é ótimo (FCP 116–164 ms, DCL 128–192 ms, load 128–204 ms), mas isso é 127.0.0.1:
  em rede móvel cada salto da cascata custa um RTT.
- Ligar compressão no `ferramentas/servir.mjs` (0 de 36 respostas comprimidas) e fazê-lo servir o `404.html`
  (hoje devolve 24 bytes de texto puro, então a página de erro caprichada nunca é exercitada em desenvolvimento).
- Indicar que a faixa de filtros do catálogo rola na horizontal (sombra na borda ou chip cortado).
- Dar cabeçalhos de categoria à lista do catálogo: hoje `/ferramentas.html` vai direto de `<h1>` para os `<h4>` do
  rodapé, sem nenhum `<h2>` em 150 itens — é uma lista plana para quem usa leitor de tela.
- Aumentar a fonte da barra inferior: medida em **10,88 px**. Os alvos estão ótimos (98 × 60 px), só o rótulo é miúdo.
- O anel de foco da busca é `color-mix(…, 18%, transparent)`, bem discreto; a mudança de cor da borda é que salva.
- `.ferramenta-linha` tem `:hover` com borda, sombra e seta colorida, mas nenhum estado `:active` — no toque a pessoa
  não recebe retorno do toque.

```

---

## O que está bom (e não precisa mexer)

Registro por justiça, já que o pedido foi não inventar problema:

- **Densidade da lista resolvida.** As linhas medem **63 px** (contra cards quadrados grandes da versão anterior) e os
  cartões de categoria **64 px** no computador / **84 px** no celular. A queixa do proprietário foi atendida na home
  e no catálogo.
- **Primeira dobra da home e do catálogo passa em todas as larguras.** A busca fica em `top = 210` (390×844),
  `213` (1366×768 e 1920×1080), `145–201` no catálogo — sempre visível sem rolar, junto com os atalhos de intenção
  ("quanto devo cobrar", "rachar a conta"…). Em 1366×768 cabem 6 itens inteiros na primeira dobra da home e 21 no catálogo.
- **Contraste do corpo do site: 0 falhas** em 722 nós de texto medidos nos dois temas, em 4 páginas. Só a opacidade
  das linhas "Planejada" quebra isso.
- **Nenhum emoji** em HTML, CSS ou JS — a varredura por faixas Unicode de emoji voltou vazia. Os ícones são SVG próprios,
  com `stroke-width` 1,75 e `viewBox` 24×24 consistentes.
- **Teclado no computador funciona.** Ordem de tabulação lógica (pular → marca → Categorias → Ferramentas → Salvos →
  Ajuda → buscar → tema → campo de busca → chips), todos os alvos dentro da tela e com `outline: 2px solid`.
  O campo de busca usa borda + anel em vez de outline, mas o foco continua visível.
- **Menu de categorias do computador está correto:** abre, fecha com clique fora, fecha com `Esc` e **devolve o foco ao
  botão** (verificado: `document.activeElement === #abrir-categorias`), com `aria-expanded` acompanhando.
- **Atalho `/` funciona** e não deixa a barra no campo (valor fica `""`). **Tema alterna e persiste** em `portal.tema`,
  e o `aria-label` do botão muda para "Usar tema claro".
- **Barra inferior com destino ativo correto** em todas as páginas testadas (`aria-current="page"` em Início,
  Ferramentas, Salvos, Ajuda; numa página de ferramenta o ativo é "Ferramentas", que é o esperado). Alvos de 98 × 60 px.
- **`prefers-reduced-motion` respeitado** em `núcleo.css:191` com `!important` sobre animação, transição e `scroll-behavior`.
- **Estados de erro e vazio são bons e em português claro:** "Escreva pelo menos duas pessoas, uma por linha.",
  "Nenhuma ferramenta combina com esses filtros.", "Nenhum favorito ainda. Use o marcador ao lado do nome de qualquer
  ferramenta." O erro aparece no campo culpado e o foco vai para ele. Só a concordância do "Informe …" falha.
- **Resultado aparece na tela depois de calcular.** Testei com clique real (rolando até o botão como uma pessoa faria):
  em 390×844 ficam 246–325 px do bloco de resultado visíveis acima da barra inferior, com o valor grande no topo.
  O `focus({preventScroll: true})` assusta na leitura do código, mas na prática não causa problema.
- **Teclado virtual não cobre os campos** (simulado reduzindo a área útil para 508 px em 390×844): dos 8 campos do
  orçamento, 7 ficam entre y=401 e y=470; só a `textarea` de itens, que tem 210 px de altura, passa 19 px do limite.
  *Ressalva: isto é simulação, não aparelho.*
- **Impressão não leva navegação nem anúncio** — `.topo`, `.barra-inferior`, `.rodapé`, `.caminho` e `.ferramenta-lado`
  saem em `@media print`. O problema é só o excesso que fica (ficha e "Como usar").
- **Os números da documentação conferem.** Rodei cada exemplo citado em "Como usar":
    · Preço de venda — doc: "lote R$ 80,00, 30% de margem, 4% de taxa, 50 unidades → lote R$ 121,22, unidade R$ 2,43".
      Medido: **R$ 121,22 o lote, R$ 2,43 a unidade**. Confere. A composição fecha (80,00 + 4,85 + 36,37 = 121,22;
      66% + 4% + 30% = 100%) e a diferença entre 50 × 2,43 e 121,22 está explicada na observação sobre arredondar para cima.
    · Divisão de contas — doc: "Ana = 300, Bruno = 90, Carla → R$ 130,00 cada; Carla paga 130 para a Ana e Bruno paga 40
      para a Ana". Medido: **idêntico**, com saldos 170 / −40 / −130.
    · Orçamento — doc: "Bolo de chocolate; 2; 85,00 / Docinhos; 100; 1,80 → R$ 350,00; com 10% de desconto, R$ 315,00".
      Medido: **subtotal R$ 350,00, desconto R$ 35,00, total R$ 315,00**.
    · QR de Wi-Fi — o payload gerado tem os 37 caracteres de `WIFI:T:WPA;S:LojaDaAna;P:senha12345;;`, formato padrão.
    · Limpeza de planilha — 5 linhas com 2 duplicadas e 1 vazia viraram "De 5 para 2 · separador detectado:
      ponto e vírgula", com contagem discriminada. Confere.
- **Link de orçamento adulterado é tratado:** `#o=LIXOxxxx` mostra "Este link está incompleto ou foi alterado no caminho."
  com botão "Montar um orçamento novo". A validação de formato em `orcamento-compartilhado.js` é caprichada.
- **Nenhuma ferramenta marcada `pronta` está sem página:** as 30 entradas `status: 'pronta'` do catálogo batem
  exatamente com as 30 pastas de `portal/f/`. Nenhum link quebrado.
- **Sem "em breve", sem lorem, sem TODO, sem marketing vazio** em nenhum HTML.

---

## Percursos ponta a ponta — veredito de usabilidade

| # | Percurso | Entende sem manual? | Onde hesita |
|---|---|---|---|
| a | Quanto cobrar por um bolo (`/f/preco-de-venda/`) | Sim, depois de achar | Buscar "bolo" **não leva a esta ferramenta**. Chegando nela, rola 616–694 px antes do primeiro campo no celular. "Margem desejada (%)" sobre a venda e não sobre o custo é a dúvida clássica — bem resolvida pelo FAQ e pelo "Markup equivalente". |
| b | Rachar conta de 3 pessoas (`/f/divisao-de-contas/`) | **Sim, o melhor do portal** | O campo já vem preenchido com "Ana = 300 / Bruno = 90 / Carla", o que ensina o formato sem manual. A pessoa só precisa apagar o exemplo. Resultado diz quem paga para quem. |
| c | Montar orçamento e baixar PDF (`/f/orcamento/`) | Sim | O formato "descrição; quantidade; valor" só aparece na dica abaixo do campo, mas o valor padrão demonstra. Botão a 1.105–1.621 px no celular. O tropeço real é o **link para o cliente**. |
| d | Limpar planilha colada (`/f/limpar-planilha/`) | Sim | 5 caixas de seleção já marcadas com padrão sensato; o resumo "De 5 para 2 · separador detectado" dá confiança. Nada a objetar. |
| e | QR Code de Wi-Fi (`/f/qr-code/`) | Sim, com um tropeço | Ao abrir, o segundo campo diz **"Não usado neste tipo"** — parece defeito. Só depois de trocar o tipo para "Rede Wi-Fi" os rótulos ficam certos. Falta a opção de rede sem senha. |
| f | Cliente abre o link do orçamento (`#o=`) | **Não** | Vê "Orçamento e proposta", a ficha "Para que serve / Você informa / Você recebe" e o caminho do portal. O valor está 855 px abaixo. Não entende que aquilo é *o orçamento dele*. |
