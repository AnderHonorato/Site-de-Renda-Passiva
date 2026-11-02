# Catálogo — dinheiro

Especificação das ferramentas **planejadas** da categoria `dinheiro` (as já `pronta` — `preco-de-venda`, `ponto-de-equilibrio`, `margem-de-contribuicao` — estão descritas no contrato §13 e não entram aqui). Fonte dos dados de cada ferramenta: `frontend/ferramentas/<slug>/<slug>-manifesto.json`. Nível de detalhe e formato seguem o contrato §13/§15.

Plano de todas as 8: **gratis**, `recursos_plus: []` no manifesto — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| conversor-de-moedas | calculadora | sim | não | taxa é sempre informada pelo usuário (sem cotação ao vivo) |
| divisao-de-contas | tabela | sim | não | usa `resultados` junto da tabela (ver §15.2 nota) |
| fluxo-de-caixa | tabela | sim | não | saldo acumulado é coluna calculada |
| juros | calculadora | sim | não | — |
| numero-por-extenso | calculadora | sim | não | resultado em `formato: "texto"`, não é transformador |
| parcelamento | calculadora | sim | não | Tabela Price padrão |
| preco-por-unidade | tabela | sim | não | — |
| rateio-de-custos | tabela | sim | não | 3 critérios de rateio no mesmo `criterio` (opção) |

---

## conversor-de-moedas

**Motor:** `calculadora` — é uma fórmula simples (multiplicação por uma taxa) com dois números de entrada; não há arquivo, texto nem lista para justificar outro motor.

**Problema resolvido:** quem recebeu um valor em outra moeda (ou vai cobrar em outra moeda) descobre quanto isso equivale em reais, usando a cotação que ela mesma tem em mãos.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `valor` | moeda | sim | min 0, max 999999999999 | — |
| `taxa` | numero | sim | min 0,000001, max 999999 | — |
| `moedaOrigem` | texto | não | 1–10 caracteres (ex.: "USD") | "" |
| `moedaDestino` | texto | não | 1–10 caracteres (ex.: "BRL") | "" |

`moedaOrigem`/`moedaDestino` são só rótulo do resultado (`{moedaOrigem} → {moedaDestino}`); não alimentam a conta.

**Processamento:** `resultado = valor × taxa`, arredondado para 2 casas decimais (`Math.round(valor*taxa*100)/100`).
Erros: `taxa` ≤ 0 → `taxa_invalida`; `valor` < 0 → `valor_negativo`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultado` | moeda | sim |

Conta (`conta: true`): `resultado = valor × taxa`.

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** os dois campos numéricos e os dois de rótulo empilham; nada muda de comportamento.

**Viabilidade no navegador:** 100% local, sem biblioteca nova. **Honestidade da cotação:** não há fonte gratuita e não autenticada de câmbio em tempo real que possa ser consultada do servidor sem custo/chave de API; a alternativa honesta adotada é a taxa **informada pelo usuário**, com nota na tela ("a cotação é a que você digitar — confira o valor do dia antes de usar"). Se o dono do produto quiser cotação oficial no futuro, a fonte pública sem chave é o **PTAX do Banco Central** (`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia...`), consultada pelo **servidor** (nunca pelo navegador, por CORS/CSP) e cacheada — isso é trabalho novo de rota (`/api/cotacao/...`) fora do escopo desta ferramenta e fica como pendência, não como Plus inventado.

**Sobreposição:** nenhuma; é a única ferramenta de câmbio no catálogo.

**Casos de teste:**
1. `valor = 100,00`, `taxa = 5,35` → `resultado = 535,00`.
2. `valor = 50,00`, `taxa = 0,18` → `resultado = 9,00`.
3. Erro: `taxa = 0` → `{ ok: false, erro: 'taxa_invalida', campo: 'taxa' }`.

---

## divisao-de-contas

**Motor:** `tabela` — a entrada é uma lista de pessoas (linhas), e o resultado central (quem paga quem) é derivado de colunas calculadas; não cabe em `calculadora` (não tem um número fixo de campos) nem em `documento`.

**Problema resolvido:** depois de uma viagem ou compra em grupo, saber quanto cada pessoa deve (ou tem a receber) e o menor número de transferências para acertar as contas, sem fazer a conta na mão.

**Entradas (linhas da tabela `participantes`):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nome` | texto | sim | 1–60 caracteres | — |
| `pago` | moeda | sim | min 0 | 0 |
| `cotas` | numero | não | min 0,01, max 100 (quantas partes da despesa esta pessoa consome; 1 = igual aos demais) | 1 |

Mínimo 2 linhas, máximo 30 (limite de lote grátis; ver §10.3 — não é um limite novo de plano, só um teto de tabela razoável para a tela).

**Processamento:**
```
totalGeral   = Σ pago[i]
totalCotas   = Σ cotas[i]
custoPorCota = totalGeral / totalCotas
saldo[i]     = round2(pago[i] - custoPorCota × cotas[i])
```
Depois, algoritmo de liquidação (guloso, sem biblioteca): separa credores (`saldo > 0,005`) e devedores (`saldo < -0,005`), ordena os dois grupos do maior valor absoluto para o menor e, a cada passo, o maior devedor paga ao maior credor o mínimo entre os dois saldos restantes; repete até os dois grupos esvaziarem. Isso minimiza o número de transferências (é o algoritmo clássico de "debt settling"/"splitwise").
Arredondamento: todo valor monetário em 2 casas; a soma dos saldos é sempre 0 por construção, então não há resíduo de centavo a distribuir.
Erros: menos de 2 linhas → `participantes_insuficientes`; `totalCotas` ≤ 0 → `cotas_invalidas`; alguma `cotas` ≤ 0 → `cotas_invalidas` no campo da linha.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `custoPorCota` | moeda | não |
| `saldos` | lista (nome + saldo, positivo = "tem a receber", negativo = "deve") | não |
| `transferencias` | lista (de → para: valor) | sim |

**Exportação:** copiar (texto das transferências), pdf, csv (linhas de participantes + saldo). Sem Plus.

**Celular 390px:** tabela com 3 colunas cabe em 390px sem rolagem horizontal (nome trunca com `text-overflow: ellipsis`); a lista de transferências vem abaixo, empilhada, cada linha "Fulano paga R$ X para Beltrano".

**Viabilidade no navegador:** 100% local, algoritmo O(n log n), sem biblioteca nova.

**Sobreposição:** nenhuma; `rateio-de-custos` também divide um valor entre pessoas, mas lá o total é um custo único e fixo a ratear (sem "quem já pagou quanto"), aqui o ponto é acertar quem pagou mais do que devia. Ferramentas diferentes; **relacionadas** no manifesto de ambas.

**Casos de teste:**
1. A pagou 90, B pagou 30, C pagou 0, todos com 1 cota → `totalGeral=120`, `custoPorCota=40`; saldos A=+50, B=-10, C=-40; transferências: **C paga 40,00 para A**, **B paga 10,00 para A**.
2. A pagou 200 (2 cotas), B pagou 100 (1 cota) → `totalCotas=3`, `custoPorCota=100`; saldo A = 200-200=0, saldo B = 100-100=0; `transferencias = []` (lista vazia, sem erro).
3. Erro: só 1 linha (A pagou 50) → `{ ok: false, erro: 'participantes_insuficientes' }`.

---

## fluxo-de-caixa

**Motor:** `tabela` — lançamentos em linhas, saldo acumulado é coluna calculada; o resultado (saldo final, pior saldo) é o resumo da tabela.

**Problema resolvido:** ver, lançamento por lançamento, quando o saldo do caixa fica negativo, sem montar planilha.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `saldoInicial` | moeda | não | min -999999999, max 999999999 | 0 |
| linha `data` | data | sim | — | — |
| linha `descricao` | texto | não | 0–80 caracteres | "" |
| linha `tipo` | opcao (`entrada`\|`saida`) | sim | — | `entrada` |
| linha `valor` | moeda | sim | min 0,01, max 999999999 | — |

Máximo 200 linhas (teto de tela/CSV razoável). As linhas são ordenadas por `data` antes de calcular (ordem de digitação não importa).

**Processamento:**
```
saldo[0] = saldoInicial + (tipo==='entrada' ? valor[0] : -valor[0])
saldo[i] = saldo[i-1] + (tipo==='entrada' ? valor[i] : -valor[i])
saldoFinal     = saldo[última linha]
totalEntradas  = Σ valor onde tipo='entrada'
totalSaidas    = Σ valor onde tipo='saida'
menorSaldo     = min(saldo[0..n])
primeiraDataNegativa = data da primeira linha em que saldo[i] < 0 (ou null se nunca fica negativo)
```
Arredondamento: 2 casas em todo valor monetário.
Erros: nenhuma linha → `lancamentos_insuficientes`; `valor` ≤ 0 → `valor_invalido` na linha; `data` ausente/inválida → `data_invalida` na linha.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `saldoFinal` | moeda | sim |
| `totalEntradas` | moeda | não |
| `totalSaidas` | moeda | não |
| `menorSaldo` | moeda | não |
| `primeiraDataNegativa` | data (ou "—") | não |

**Exportação:** csv (linhas + coluna saldo acumulado), pdf, copiar (resumo). Sem Plus.

**Celular 390px:** tabela com 4 colunas (data, descrição, tipo, valor) — descrição trunca; a coluna "saldo" calculada aparece só no resumo abaixo da tabela no celular (não como 5ª coluna), para não estourar a largura.

**Viabilidade no navegador:** 100% local; ordenação e soma são O(n log n), sem biblioteca.

**Sobreposição:** nenhuma. `orcamento` e `pedido-de-venda` (vendas) lidam com um documento único, não com série temporal de lançamentos.

**Casos de teste:**
1. `saldoInicial=1000`; lançamentos (já ordenados): entrada 500, saída 800, entrada 200, saída 1200 → saldos 1500, 700, 900, **-300**; `saldoFinal=-300`, `totalEntradas=700`, `totalSaidas=2000`, `menorSaldo=-300`, `primeiraDataNegativa` = data da 4ª linha.
2. `saldoInicial=0`; entrada 1000 → `saldoFinal=1000`, `menorSaldo=0` (saldo nunca negativo), `primeiraDataNegativa=null`.
3. Erro: lançamento com `valor=0` → `{ ok:false, erro:'valor_invalido', campo:'valor' }`.

---

## juros

**Motor:** `calculadora`.

**Problema resolvido:** simular quanto um valor investido (com ou sem aporte mensal) vai valer no futuro, em juros simples ou compostos.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `principal` | moeda | sim | min 0, max 999999999 | — |
| `taxaMensal` | percentual | sim | min 0, max 100 | — |
| `periodos` | inteiro | sim | min 1, max 600 (meses) | — |
| `aporteMensal` | moeda | não | min 0, max 999999999 | 0 |
| `regime` | opcao (`simples`\|`composto`) | não | — | `composto` |

**Processamento:**
- Simples: `montante = principal × (1 + taxaMensal × periodos) + aporteMensal × periodos` (aporte não rende em juros simples, só se soma).
- Composto, `i = taxaMensal` (fração), `n = periodos`:
  - se `i = 0`: `montante = principal + aporteMensal × n`
  - se `i > 0`: `montante = principal × (1+i)^n + aporteMensal × ((1+i)^n − 1) / i` (aporte postecipado, ao final de cada mês)
- `jurosTotais = montante − principal − aporteMensal × periodos`.
Arredondamento: `montante` e `jurosTotais` em 2 casas; a exponenciação usa `Math.pow` em ponto flutuante e só arredonda no resultado final (evita acúmulo de erro).
Erros: `taxaMensal` < 0 → `taxa_invalida`; `periodos` < 1 → `periodos_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `montante` | moeda | sim |
| `jurosTotais` | moeda | não |

Conta (`conta: true`): fórmula do regime escolhido, com os valores substituídos.

**Exportação:** copiar, pdf. (Tabela período a período mencionada na descrição do manifesto é útil mas não está marcada como Plus no manifesto — nenhum `recursos_plus`; ela sai como uma segunda saída "tabela" opcional em `formato: "lista"`, gratuita, sem exportação própria além do csv/pdf já previstos.) Sem Plus.

**Celular 390px:** campos empilhados; se a tabela período a período for incluída, ela rola horizontalmente dentro de um contêiner com `overflow-x: auto` (não estoura a página).

**Viabilidade no navegador:** 100% local, sem biblioteca (é `Math.pow`, nativo).

**Sobreposição:** nenhuma com `parcelamento` — lá o objetivo é achar a parcela de um financiamento (incógnita é o pagamento), aqui o objetivo é achar o montante final de uma aplicação (incógnita é o saldo futuro). São o mesmo tipo de matemática financeira mas perguntas opostas; ficam **relacionadas**, não duplicadas.

**Casos de teste:**
1. `principal=1000,00`, `taxaMensal=1%`, `periodos=12`, `aporteMensal=0`, `regime=composto` → `montante=1126,83`, `jurosTotais=126,83`.
2. `principal=1000,00`, `taxaMensal=1%`, `periodos=12`, `aporteMensal=100,00`, `regime=composto` → `montante=2395,08`, `jurosTotais=2395,08-1000-1200=195,08`.
3. Erro: `periodos=0` → `{ ok:false, erro:'periodos_invalido', campo:'periodos' }`.

---

## numero-por-extenso

**Motor:** `calculadora` — um único campo numérico de entrada e um resultado em `formato: "texto"`; não é `transformador` porque a entrada não é uma área de texto livre a ser reescrita, é um número.

**Problema resolvido:** escrever, sem erro de digitação, o valor por extenso que vai num recibo, cheque ou contrato.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `valor` | moeda | sim | min 0, max 999999999999,99 (999 bilhões) | — |
| `formato` | opcao (`numero`\|`moeda`) | não | — | `moeda` |

**Processamento — algoritmo (sem biblioteca):**
1. Separa parte inteira e centavos (só relevante se `formato=moeda`).
2. Quebra a parte inteira em grupos de 3 dígitos (unidades simples, milhar, milhão, bilhão).
3. Cada grupo de 3 dígitos vira texto pela tabela de unidades (0–19), dezenas (20,30…90) e centenas (100,200…900; caso especial `100` = "cem"); dentro do grupo, centena e o restante (dezena+unidade) se juntam com `" e "` quando ambos existem.
4. Grupos de milhar/milhão/bilhão recebem o sufixo (`mil`, `milhão`/`milhões`, `bilhão`/`bilhões`); grupo de exatamente 1 antes de "mil" **não** escreve "um" (ex.: "mil", não "um mil"); antes de "milhão"/"bilhão" escreve "um" normalmente.
5. Grupos não-nulos são unidos: todos exceto o último com vírgula, e o último ligado ao(s) anterior(es) com `" e "` (convenção usada em cheques/recibos brasileiros: ex. 1.234.567 → "um milhão, duzentos e trinta e quatro mil e quinhentos e sessenta e sete"). Se só existe 1 grupo não-nulo, sem conectivo.
6. Se `valor = 0` → `"zero"`.
7. Se `formato = moeda`: acrescenta `" real"` (valor inteiro = 1) ou `" reais"` (senão); se há centavos, acrescenta `" e "` + extenso dos centavos (0–99, mesma tabela) + `" centavo"`/`" centavos"`. Se a parte inteira for 0 e só há centavos, começa direto pelos centavos (ex.: "cinquenta centavos", sem "zero reais e").
Arredondamento: `valor` já vem com no máximo 2 casas (campo `moeda`); nenhuma perda por ponto flutuante porque o algoritmo opera em inteiros de centavos (`Math.round(valor*100)`).
Erros: `valor` < 0 → `valor_negativo`; `valor` > 999999999999,99 → `valor_grande_demais`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `extenso` | texto | sim |

**Exportação:** copiar. Sem pdf (é uma frase, não um documento) — csv também não se aplica. Sem Plus.

**Celular 390px:** o texto de saída quebra em várias linhas no painel de resultado; sem mudança de comportamento.

**Viabilidade no navegador:** 100% local, puramente string/aritmética inteira, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `valor = 1994,00`, `formato = numero` → `"mil e novecentos e noventa e quatro"`.
2. `valor = 1250000,00`, `formato = numero` → `"um milhão e duzentos e cinquenta mil"`.
3. `valor = 1500,50`, `formato = moeda` → `"mil e quinhentos reais e cinquenta centavos"`.
4. Erro: `valor = -10` → `{ ok:false, erro:'valor_negativo', campo:'valor' }`.

(Casos 1–3 conferidos com `node -e` reimplementando o algoritmo — ver mensagem de verificação; caso 4 é o de erro exigido.)

---

## parcelamento

**Motor:** `calculadora`.

**Problema resolvido:** saber o valor exato da parcela pela Tabela Price, o custo total do crédito e se compensa mais pagar à vista.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `valorTotal` | moeda | sim | min 0,01, max 999999999 | — |
| `valorEntrada` | moeda | não | min 0 | 0 |
| `taxaMensal` | percentual | sim | min 0, max 100 | — |
| `numeroParcelas` | inteiro | sim | min 1, max 480 | — |
| `precoAVista` | moeda | não (se vazio, usa `valorTotal`) | min 0 | — |

**Processamento:**
```
financiado = valorTotal - valorEntrada     // erro se < 0
i = taxaMensal (fração), n = numeroParcelas
parcela = i === 0
        ? financiado / n
        : financiado * i / (1 - (1+i)^(-n))     // Tabela Price
totalPago         = parcela × n + valorEntrada
custoTotalCredito = totalPago - valorTotal
comparacaoAVista  = totalPago - (precoAVista ?? valorTotal)
```
Arredondamento: `parcela`, `totalPago`, `custoTotalCredito`, `comparacaoAVista` em 2 casas, calculados a partir do valor não arredondado da parcela (arredonda só na saída).
Erros: `valorEntrada` > `valorTotal` → `entrada_maior_que_total`; `taxaMensal` < 0 → `taxa_invalida`; `numeroParcelas` < 1 → `parcelas_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `parcela` | moeda | sim |
| `totalPago` | moeda | não |
| `custoTotalCredito` | moeda | não |
| `comparacaoAVista` | moeda (positivo = "parcelado custa mais X que à vista") | não |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança; 5 campos empilhados.

**Viabilidade no navegador:** 100% local, `Math.pow`, sem biblioteca.

**Sobreposição:** relacionada com `juros` (mesma matemática de juros compostos, pergunta inversa — ver seção de `juros`). Não duplica.

**Casos de teste:**
1. `valorTotal=2000,00`, `valorEntrada=200,00`, `taxaMensal=3%`, `numeroParcelas=10` → financiado=1800; `parcela=211,01`; `totalPago=2310,15`; `custoTotalCredito=310,15`; `comparacaoAVista=310,15` (sem `precoAVista` informado).
2. `valorTotal=1000,00`, `valorEntrada=0`, `taxaMensal=0%`, `numeroParcelas=5` → `parcela=200,00`; `totalPago=1000,00`; `custoTotalCredito=0,00`.
3. Erro: `valorEntrada=2500,00` com `valorTotal=2000,00` → `{ ok:false, erro:'entrada_maior_que_total', campo:'valorEntrada' }`.

---

## preco-por-unidade

**Motor:** `tabela` — lista de pacotes/embalagens (2 a 10 linhas), com coluna calculada "preço por unidade" e destaque na linha mais barata; não cabe em `calculadora` porque o número de itens comparados é variável.

**Problema resolvido:** decidir, entre embalagens de tamanhos diferentes, qual é realmente mais barata por quilo/litro/unidade.

**Entradas (linhas da tabela `pacotes`):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nome` | texto | não | 0–60 caracteres | "" |
| `preco` | moeda | sim | min 0,01 | — |
| `quantidade` | numero | sim | min 0,001 | — |
| `unidade` | texto | não | 0–10 caracteres (ex.: "g", "ml", "un") — só rótulo, igual para todas as linhas por convenção | "un" |

Mínimo 2 linhas, máximo 10.

**Processamento:**
```
precoPorUnidade[i] = preco[i] / quantidade[i]
melhorIndice       = índice do menor precoPorUnidade
diferencaPercentual = (precoPorUnidade[pior] - precoPorUnidade[melhorIndice]) / precoPorUnidade[melhorIndice] × 100
```
Arredondamento: `precoPorUnidade` mostrado com 4 casas decimais quando < 1 (evita mostrar "0,01" para tudo) e 2 casas quando ≥ 1; `diferencaPercentual` em 2 casas.
Erros: menos de 2 linhas → `pacotes_insuficientes`; `quantidade` ≤ 0 → `quantidade_invalida` na linha.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `precoPorUnidade` (coluna calculada) | moeda | linha `melhorIndice` |
| `melhorOpcao` | texto (nome do pacote vencedor) | sim |
| `diferencaPercentual` | percentual | não |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** 4 colunas cabem; a linha vencedora fica com fundo `--cor-destaque-suave` mesmo empilhada.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Pacote A: preço 12,90, quantidade 900 (g) → 0,014333/g (14,3333/kg). Pacote B: preço 6,50, quantidade 400 (g) → 0,016250/g (16,2500/kg). `melhorOpcao` = A; `diferencaPercentual = (16,25-14,3333)/14,3333×100 = 13,37%`.
2. Pacote A: preço 5,00, quantidade 1 (litro); Pacote B: preço 9,50, quantidade 2 (litros) → preço/litro A=5,00, B=4,75; `melhorOpcao`=B.
3. Erro: pacote com `quantidade=0` → `{ ok:false, erro:'quantidade_invalida', campo:'quantidade' }`.

---

## rateio-de-custos

**Motor:** `tabela` — lista de participantes (linhas), critério de rateio como campo do cabeçalho da tabela; a saída principal é a coluna "parte" calculada por linha.

**Problema resolvido:** dividir um custo comum (aluguel de galpão, frete de uma compra em grupo, custo indireto entre produtos) por um critério justo, sem fazer a conta manualmente para cada um.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `custoTotal` | moeda | sim | min 0,01 | — |
| `criterio` | opcao (`igual`\|`proporcional`\|`percentual`) | não | — | `igual` |
| linha `nome` | texto | sim | 1–60 caracteres | — |
| linha `peso` | numero | não (obrigatório se `criterio=proporcional`) | min 0,01 | 1 |
| linha `percentual` | percentual | não (obrigatório se `criterio=percentual`) | min 0, max 100 | 0 |

Mínimo 1 linha, máximo 50.

**Processamento:**
```
igual:         parte[i] = custoTotal / N
proporcional:  parte[i] = custoTotal × peso[i] / Σ peso
percentual:    parte[i] = custoTotal × percentual[i] / 100   (exige Σ percentual == 100, tolerância 0,01)
```
Arredondamento: 2 casas; no critério `igual`, se `custoTotal / N` não for exato, o centavo de sobra (`custoTotal − Σ parte_arredondada`) é somado à parte da **última** linha, para o total exportado sempre bater com `custoTotal`.
Erros: 0 linhas → `participantes_insuficiente`; `criterio=proporcional` com algum `peso` ≤ 0 → `peso_invalido`; `criterio=percentual` com `Σ percentual` fora de `100 ± 0,01` → `soma_percentual_invalida` (extras: `{ soma: <valor> }`).

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `parte` (coluna calculada) | moeda | não |
| `custoTotal` (repetido no resumo) | moeda | sim |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** campo `criterio` fica acima da tabela (não é coluna); colunas da tabela mudam conforme o critério — no critério `igual` a coluna `peso`/`percentual` fica oculta (o motor tabela decide isso pelo valor de `criterio`, ver nota abaixo).

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Nota de geração (mesma observação vale para `comissao` e `porcentagem` nas outras categorias):** mostrar/ocultar a coluna `peso` ou `percentual` conforme o `criterio` escolhido é comportamento condicional que o formato de `<slug>-definicao.json` (§15.3) ainda não descreve — não existe hoje uma chave para "esta coluna/campo só aparece se outro campo tiver tal valor". Não é bloqueante: com os três critérios sempre visíveis (linhas com `peso=1` e `percentual=0` por padrão, ignorados quando `criterio` não os usa) a ferramenta funciona igual, só com dois campos extras sempre à vista na tabela. Se quiser a tela mais limpa, fica como **decisão pendente** para quem for o dono do motor `tabela`: acrescentar uma chave tipo `"mostrar_se": { "campo": "criterio", "valor": "proporcional" }` nas colunas do `<slug>-definicao.json`.

**Sobreposição:** relacionada com `divisao-de-contas` (ver seção acima) — critérios diferentes, mantém as duas.

**Casos de teste:**
1. `custoTotal=1000,00`, `criterio=proporcional`, pesos [2,3,5] → partes [200,00; 300,00; 500,00].
2. `custoTotal=100,00`, `criterio=igual`, 3 linhas → 33,33 + 33,33 + **33,34** (centavo de sobra na última linha), soma = 100,00.
3. Erro: `criterio=percentual`, percentuais [50,30] (soma 80) → `{ ok:false, erro:'soma_percentual_invalida', extras:{ soma:80 } }`.
