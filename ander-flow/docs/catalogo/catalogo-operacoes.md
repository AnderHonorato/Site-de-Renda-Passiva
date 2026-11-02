# Catálogo — operacoes

Especificação das 10 ferramentas **planejadas** da categoria `operacoes`. Todas com plano **gratis** e `recursos_plus: []` — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| calculadora-de-frete | calculadora | sim | não | lista de transportadoras (ver decisão pendente B em catalogo-vendas.md) |
| conferencia-de-pedido | interativo | sim | não | compara 2 listas por código, exceção do §15.1 |
| cubagem | tabela | sim | não | fator de cubagem é informado pelo usuário |
| curva-abc | tabela | sim | não | limites A/B configuráveis (padrão 80/95) |
| estoque-minimo | calculadora | sim | não | — |
| etiqueta-de-expedicao | documento | sim | não | sem cálculo, só formatação |
| giro-de-estoque | calculadora | sim | não | — |
| peso-volumetrico | calculadora | sim | não | fator divisor informado pelo usuário |
| ponto-de-reposicao | calculadora | sim | não | relacionada com estoque-minimo |
| romaneio | tabela | sim | não | — |

---

## estoque-minimo

**Motor:** `calculadora`.

**Problema resolvido:** saber o estoque de segurança (o mínimo que nunca deveria faltar) a partir do consumo e do prazo de reposição, incluindo a variação de ambos.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `consumoMedioDiario` | numero | sim | min 0,01 | — |
| `consumoMaximoDiario` | numero | sim | min = `consumoMedioDiario` | — |
| `tempoRepMedioDias` | numero | sim | min 0,01 | — |
| `tempoRepMaximoDias` | numero | sim | min = `tempoRepMedioDias` | — |

**Processamento (fórmula clássica de estoque de segurança):**
```
estoqueSeguranca = (consumoMaximoDiario × tempoRepMaximoDias) − (consumoMedioDiario × tempoRepMedioDias)
estoqueMinimo     = estoqueSeguranca      // mesmo valor: o nível abaixo do qual não se deve deixar cair
```
Arredondamento: 2 casas (ou 0 casas se as unidades de entrada forem sempre inteiras — a ferramenta aceita fração porque consumo diário raramente é inteiro).
Erros: `consumoMaximoDiario` < `consumoMedioDiario` → `consumo_maximo_menor_que_medio`; `tempoRepMaximoDias` < `tempoRepMedioDias` → `prazo_maximo_menor_que_medio`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `estoqueSeguranca` | numero | sim |

Conta: fórmula com os valores substituídos.

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** relacionada com `ponto-de-reposicao` (aquele usa o estoque de segurança calculado aqui como um dos seus insumos) — não duplica, uma calcula o "colchão", a outra usa o colchão para decidir "quando comprar".

**Casos de teste:**
1. `consumoMedioDiario=50`, `consumoMaximoDiario=80`, `tempoRepMedioDias=6`, `tempoRepMaximoDias=10` → `estoqueSeguranca = 80×10 − 50×6 = 800−300 = 500`.
2. `consumoMedioDiario=10`, `consumoMaximoDiario=10`, `tempoRepMedioDias=5`, `tempoRepMaximoDias=5` (sem variação) → `estoqueSeguranca=0`.
3. Erro: `consumoMaximoDiario=30`, `consumoMedioDiario=50` → `{ ok:false, erro:'consumo_maximo_menor_que_medio', campo:'consumoMaximoDiario' }`.

---

## ponto-de-reposicao

**Motor:** `calculadora`.

**Problema resolvido:** saber em qual quantidade de estoque disparar o próximo pedido, para não zerar antes de o pedido novo chegar.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `consumoMedioDiario` | numero | sim | min 0,01 | — |
| `tempoRepMedioDias` | numero | sim | min 0,01 | — |
| `estoqueSeguranca` | numero | não (pode vir de `estoque-minimo`, ou o usuário digita direto) | min 0 | 0 |

**Processamento:**
```
pontoDeReposicao = consumoMedioDiario × tempoRepMedioDias + estoqueSeguranca
```
Arredondamento: 2 casas.
Erros: `consumoMedioDiario` ≤ 0 → `consumo_invalido`; `tempoRepMedioDias` ≤ 0 → `prazo_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `pontoDeReposicao` | numero | sim |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** relacionada com `estoque-minimo` (ver seção acima); listar uma na outra como `relacionadas` no manifesto.

**Casos de teste:**
1. `consumoMedioDiario=50`, `tempoRepMedioDias=6`, `estoqueSeguranca=200` → `pontoDeReposicao = 50×6+200 = 500`.
2. `consumoMedioDiario=10`, `tempoRepMedioDias=3`, `estoqueSeguranca=0` → `pontoDeReposicao=30`.
3. Erro: `consumoMedioDiario=0` → `{ ok:false, erro:'consumo_invalido', campo:'consumoMedioDiario' }`.

---

## giro-de-estoque

**Motor:** `calculadora`.

**Problema resolvido:** saber quantas vezes o estoque girou no período e quanto tempo, em média, cada item fica parado antes de vender.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `custoMercadoriasVendidas` | moeda | sim | min 0,01 | — |
| `estoqueInicial` | moeda | sim | min 0 | — |
| `estoqueFinal` | moeda | sim | min 0 | — |
| `periodoDias` | inteiro | não | min 1, max 366 | 30 |

**Processamento:**
```
estoqueMedio = (estoqueInicial + estoqueFinal) / 2
giro         = custoMercadoriasVendidas / estoqueMedio
diasEstoque  = periodoDias / giro
```
Arredondamento: `giro` em 2 casas; `diasEstoque` em 1 casa (dias fracionados fazem sentido aqui).
Erros: `estoqueMedio` = 0 (ambos `estoqueInicial` e `estoqueFinal` zerados) → `estoque_medio_zerado`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `giro` | numero | sim |
| `diasEstoque` | numero | não |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma com `curva-abc` (aquela classifica produtos por participação no faturamento, não mede velocidade de giro).

**Casos de teste:**
1. `custoMercadoriasVendidas=180000,00`, `estoqueInicial=20000,00`, `estoqueFinal=30000,00`, `periodoDias=30` → `estoqueMedio=25000,00`; `giro=7,20`; `diasEstoque=4,17`.
2. `custoMercadoriasVendidas=60000,00`, `estoqueInicial=10000,00`, `estoqueFinal=10000,00`, `periodoDias=30` → `giro=6,00`; `diasEstoque=5,0`.
3. Erro: `estoqueInicial=0`, `estoqueFinal=0` → `{ ok:false, erro:'estoque_medio_zerado' }`.

---

## curva-abc

**Motor:** `tabela` — os produtos são linhas; a classificação A/B/C é coluna calculada dependente da posição depois de ordenar.

**Problema resolvido:** ver rapidamente quais produtos merecem mais atenção (classe A) e quais pesam pouco no total (classe C), sem montar a conta de percentual acumulado manualmente.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| linha `produto` | texto | sim | 1–80 caracteres | — |
| linha `valor` | moeda | sim | min 0,01 (faturamento ou quantidade vendida do produto, no período) | — |
| `limiteA` | percentual | não | min 1, max 99 | 80 |
| `limiteB` | percentual | não | min = `limiteA`+1, max 100 | 95 |

Mínimo 1 linha, máximo 500 (lista de produtos pode ser grande; CSV suporta).

**Processamento:**
```
total = Σ valor
ordenar linhas por valor decrescente
para cada linha, na ordem:
  acumulado += valor[i]
  percentualAcumulado[i] = acumulado / total × 100
  classe[i] = percentualAcumulado[i] <= limiteA ? 'A'
            : percentualAcumulado[i] <= limiteB ? 'B'
            : 'C'
```
Arredondamento: `percentualAcumulado` em 2 casas.
Erros: 0 linhas → `produtos_insuficientes`; `valor` ≤ 0 em alguma linha → `valor_invalido`; `limiteB` ≤ `limiteA` → `limites_invalidos`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `classe` (coluna calculada) | texto (A\|B\|C) | não |
| `percentualAcumulado` (coluna calculada) | percentual | não |
| `totalPorClasse` | lista (quantos produtos e % do total em cada classe) | sim |

**Exportação:** csv, pdf. Sem Plus.

**Celular 390px:** a tabela ordenada rola verticalmente; a classe aparece como etiqueta colorida (reaproveitando `.etiqueta`) em vez de mais uma coluna estreita.

**Viabilidade no navegador:** 100% local, ordenação O(n log n), sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Produtos A=50000, B=30000, C=12000, D=5000, E=3000 (total 100000) → acumulados 50%(classe A), 80%(classe A), 92%(classe B), 97%(classe C), 100%(classe C).
2. `limiteA=70`, `limiteB=90` com os mesmos dados → 50%(A), 80%(B), 92%(C), 97%(C), 100%(C).
3. Erro: `limiteB=70`, `limiteA=80` (B menor que A) → `{ ok:false, erro:'limites_invalidos', campo:'limiteB' }`.

---

## cubagem

**Motor:** `tabela` — os volumes/caixas da carga são linhas; o volume total é o resultado somado.

**Problema resolvido:** calcular o volume total (m³) de uma carga com várias caixas de tamanhos diferentes, e o peso cubado correspondente, para fechar um frete.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| linha `comprimentoCm` | numero | sim | min 1, max 3000 | — |
| linha `larguraCm` | numero | sim | min 1, max 3000 | — |
| linha `alturaCm` | numero | sim | min 1, max 3000 | — |
| linha `quantidade` | inteiro | não | min 1, max 9999 | 1 |
| `fatorCubagem` | numero | sim (informado pelo usuário — varia por transportadora/modal; ver viabilidade) | min 1 | 300 |

**Processamento:**
```
volumeItemM3[i] = (comprimentoCm[i] × larguraCm[i] × alturaCm[i]) / 1.000.000 × quantidade[i]
volumeTotalM3   = Σ volumeItemM3
pesoCubadoTotal = volumeTotalM3 × fatorCubagem
```
Arredondamento: `volumeTotalM3` em 4 casas; `pesoCubadoTotal` em 2 casas.
Erros: alguma dimensão ≤ 0 → `dimensao_invalida` na linha; `fatorCubagem` ≤ 0 → `fator_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `volumeTotalM3` | numero | sim |
| `pesoCubadoTotal` | numero | não |

**Exportação:** csv, pdf. Sem Plus.

**Celular 390px:** cada volume vira um cartão com as 4 medidas empilhadas.

**Viabilidade no navegador:** 100% local, sem biblioteca. **Honestidade do fator de cubagem:** não existe um único "fator oficial" — cada transportadora e modal (rodoviário, aéreo) usa o seu (valores comuns citados só como sugestão no texto de ajuda, nunca fixados como padrão de mercado: "consulte o fator do seu contrato de frete"); por isso é sempre um campo **informado pelo usuário**, nunca uma tabela embutida.

**Sobreposição:** ligada a `peso-volumetrico` (mesma matemática de volume × fator, mas escopos diferentes: aqui é a carga inteira de uma expedição, para dimensionar caminhão/container; lá é o peso cobrado de **um único** volume por uma transportadora expressa). Recomenda-se que os dois `<slug>-calculo.js` compartilhem a mesma função interna `pesoOuVolumeCubado(dimensoesCm, fator)`, sem duplicar a fórmula — sem duplicar a ferramenta para quem usa.

**Casos de teste:**
1. Itens: caixa 60×40×40 cm, qtd 10; caixa 30×30×30 cm, qtd 5; `fatorCubagem=300` → `volumeTotalM3 = (60×40×40/1e6×10) + (30×30×30/1e6×5) = 0,96+0,135 = 1,0950`; `pesoCubadoTotal = 1,0950×300 = 328,50`.
2. 1 item 100×100×100 cm, qtd 1, `fatorCubagem=167` (fator aéreo, informado pelo usuário) → `volumeTotalM3=1,0000`; `pesoCubadoTotal=167,00`.
3. Erro: item com `alturaCm=0` → `{ ok:false, erro:'dimensao_invalida', campo:'alturaCm' }`.

---

## peso-volumetrico

**Motor:** `calculadora`.

**Problema resolvido:** saber se uma transportadora vai cobrar pelo peso real ou pelo peso cubado (o que for maior) de um único volume.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `comprimentoCm` | numero | sim | min 1, max 3000 | — |
| `larguraCm` | numero | sim | min 1, max 3000 | — |
| `alturaCm` | numero | sim | min 1, max 3000 | — |
| `pesoRealKg` | numero | sim | min 0,01 | — |
| `fatorDivisor` | numero | não (comum 6000 rodoviário no Brasil, 5000 aéreo internacional — o usuário confirma com a transportadora) | min 1 | 6000 |
| `quantidade` | inteiro | não | min 1, max 9999 | 1 |

**Processamento:**
```
pesoVolumetricoUnitario = (comprimentoCm × larguraCm × alturaCm) / fatorDivisor
pesoVolumetricoTotal    = pesoVolumetricoUnitario × quantidade
pesoRealTotal           = pesoRealKg × quantidade
pesoConsiderado         = max(pesoRealTotal, pesoVolumetricoTotal)
```
Arredondamento: 3 casas nos pesos volumétricos (podem ser pequenos), 2 casas no peso real e no considerado.
Erros: alguma dimensão ≤ 0 ou `pesoRealKg` ≤ 0 → `valor_invalido`; `fatorDivisor` ≤ 0 → `fator_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `pesoVolumetricoTotal` | numero | não |
| `pesoConsiderado` | numero | sim |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca. `fatorDivisor` tem valor sugerido (não é "invenção de mercado" fixa — é rotulado como comum/sugestão, com aviso para confirmar no contrato da transportadora).

**Sobreposição:** ver nota em `cubagem` acima (relacionadas, sem duplicar).

**Casos de teste:**
1. Volume 40×30×25 cm, `pesoRealKg=4`, `fatorDivisor=6000`, `quantidade=1` → `pesoVolumetricoTotal = 40×30×25/6000 = 5,000`; `pesoConsiderado = max(4, 5) = 5,00`.
2. Volume 20×20×20 cm, `pesoRealKg=10`, `fatorDivisor=6000` → `pesoVolumetricoTotal = 8000/6000 = 1,333`; `pesoConsiderado = max(10, 1,333) = 10,00` (peso real vence).
3. Erro: `comprimentoCm=0` → `{ ok:false, erro:'valor_invalido', campo:'comprimentoCm' }`.

---

## calculadora-de-frete

**Motor:** `calculadora` (lista de transportadoras a comparar — ver decisão pendente B em `catalogo-vendas.md`).

**Problema resolvido:** comparar o custo estimado do frete entre transportadoras diferentes, cada uma com sua própria tabela de preço, e ver qual sai mais barata para aquele envio.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `pesoRealKg` | numero | sim | min 0,01 | — |
| `comprimentoCm`, `larguraCm`, `alturaCm` | numero | não (se informados, calcula peso cubado e usa o maior) | min 0 | 0 |
| `fatorDivisor` | numero | usado se dimensões informadas | min 1 | 6000 |
| `distanciaKm` | numero | sim | min 0 | — |
| `transportadoras[].nome` | texto | sim (cada uma; até 5) | 1–60 caracteres | — |
| `transportadoras[].valorPorKg` | moeda | sim | min 0 | — |
| `transportadoras[].valorPorKm` | moeda | sim | min 0 | — |
| `transportadoras[].taxaFixa` | moeda | não | min 0 | 0 |

Mínimo 1 transportadora, máximo 5.

**Processamento:**
```
pesoVolumetrico = dimensões informadas ? (comprimentoCm×larguraCm×alturaCm)/fatorDivisor : 0
pesoConsiderado = max(pesoRealKg, pesoVolumetrico)
para cada transportadora:
  total[t] = pesoConsiderado × valorPorKg[t] + distanciaKm × valorPorKm[t] + taxaFixa[t]
maisBarata = transportadora com o menor total
```
Arredondamento: 2 casas.
Erros: nenhuma transportadora informada → `transportadoras_insuficientes`; `pesoRealKg` ≤ 0 → `peso_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `total` (por transportadora) | moeda | linha da `maisBarata` |
| `maisBarata` | texto (nome) | sim |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** cada transportadora vira um cartão com nome + total, ordenados do mais barato ao mais caro.

**Viabilidade no navegador:** 100% local, sem biblioteca. **Honestidade da cotação:** tarifas reais de Correios/transportadoras exigem contrato e autenticação (API paga ou por CNPJ cadastrado), o que não é "consulta pública gratuita" — a alternativa honesta é o usuário informar a própria tabela de cada transportadora (o que ele já tem no contrato). Não há cotação automática ao vivo.

**Sobreposição:** nenhuma (as outras ferramentas de operações calculam peso/volume, não custo final por transportadora).

**Casos de teste:**
1. `pesoRealKg=8`, `distanciaKm=300`; T1 (2,50/kg; 0,05/km; taxa 20) → `20+15+20=55,00`; T2 (3,00/kg; 0,03/km; taxa 10) → `24+9+10=43,00`; `maisBarata="T2"`.
2. Com dimensões 50×40×30 cm e `fatorDivisor=6000` → `pesoVolumetrico=10,0`; se `pesoRealKg=6`, `pesoConsiderado=10,0` (volumétrico vence) e os totais usam 10 kg em vez de 6.
3. Erro: nenhuma transportadora na lista → `{ ok:false, erro:'transportadoras_insuficientes' }`.

---

## conferencia-de-pedido

**Motor:** `interativo` (exceção justificada do §15.1) — a ferramenta compara **duas** listas (o que foi pedido x o que foi separado) casando por código; isso é mais do que uma tabela com colunas calculadas (§15.2 descreve uma tabela só), então tem `<slug>.js` próprio, com a lógica pura isolada em `<slug>-calculo.js` para ficar testável.

**Problema resolvido:** antes de despachar, ver rápido o que falta, o que sobrou ou o que veio errado em relação ao pedido original.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| lista `pedido[].codigo` | texto | sim | 1–40 caracteres, único dentro da lista | — |
| lista `pedido[].quantidade` | numero | sim | min 0 | — |
| lista `separado[].codigo` | texto | sim | 1–40 caracteres, único dentro da lista | — |
| lista `separado[].quantidade` | numero | sim | min 0 | — |

**Processamento (função pura `compararListas(pedido, separado)`):**
```
para cada código presente em pedido OU separado:
  qtdPedida    = pedido[codigo]?.quantidade ?? 0
  qtdSeparada  = separado[codigo]?.quantidade ?? 0
  diferenca    = qtdSeparada - qtdPedida
  se diferenca < 0 → entra em "faltantes" (com o quanto falta, -diferenca)
  se diferenca > 0 → entra em "excedentes" (com o quanto sobrou)
  se diferenca = 0 → entra em "corretos"
```
Arredondamento: quantidades exibidas com o mesmo número de casas informado (a maioria é inteira, mas aceita fração para itens vendidos a granel).
Erros: código duplicado dentro da mesma lista (`pedido` ou `separado`) → `codigo_duplicado`; `quantidade` < 0 em algum item → `quantidade_invalida`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `faltantes` | lista | sim |
| `excedentes` | lista | não |
| `corretos` | lista (contagem) | não |

**Exportação:** csv (das 3 listas), pdf, copiar (resumo "3 faltando, 1 sobrando"). Sem Plus.

**Celular 390px:** as duas listas de entrada (pedido/separado) ficam em abas (`.abas`) em vez de lado a lado, para caber a largura; o resultado aparece abaixo das abas.

**Viabilidade no navegador:** 100% local, comparação por mapa (`Map`), O(n), sem biblioteca.

**Sobreposição:** relacionada com `comparar-planilhas` (categoria `planilhas`, já no catálogo antigo) — aquela compara duas planilhas genéricas linha a linha (o que entrou/saiu/mudou, célula a célula); esta é específica de pedido x separação, comparando só quantidade por código e com vocabulário de expedição (faltantes/excedentes). Suficientemente diferente para não fundir, mas os dois podem reaproveitar o mesmo algoritmo de "casar por chave" internamente.

**Casos de teste:**
1. Pedido: A=10, B=5, C=3. Separado: A=10, B=3, D=2 → faltantes: B (falta 2), C (falta 3); excedentes: D (sobrou 2); corretos: A.
2. Pedido e separado idênticos (A=5, B=5) → faltantes=[], excedentes=[], corretos=[A,B].
3. Erro: lista `pedido` com dois itens de código `"A"` → `{ ok:false, erro:'codigo_duplicado', campo:'pedido' }`.

---

## etiqueta-de-expedicao

**Motor:** `documento` — pré-visualização formatada de uma etiqueta, sem cálculo além de validar a numeração de volumes.

**Problema resolvido:** gerar rápido a etiqueta de um volume da expedição, com remetente, destinatário e a numeração "Volume X de Y".

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `remetente` | texto | sim | 1–120 caracteres | — |
| `destinatario` | texto | sim | 1–200 caracteres (nome + endereço) | — |
| `numeroPedido` | texto | não | 0–40 caracteres | "" |
| `volumeAtual` | inteiro | sim | min 1 | 1 |
| `volumeTotal` | inteiro | sim | min = `volumeAtual` | 1 |
| `pesoKg` | numero | não | min 0 | — |

**Processamento:** sem fórmula — monta o texto `"Volume {volumeAtual} de {volumeTotal}"` e formata a etiqueta com os campos preenchidos.
Erros: `volumeAtual` > `volumeTotal` → `volume_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `rotuloVolume` | texto ("Volume 2 de 5") | sim |

**Exportação:** pdf, imprimir. Sem Plus.

**Celular 390px:** a pré-visualização da etiqueta usa a proporção real (ex.: 10×15 cm) escalada para caber na tela, com botão "imprimir" abaixo.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma com `etiquetas` (categoria `documentos`, já no catálogo antigo) — aquela calcula quantas etiquetas de um tamanho cabem numa folha A4 (impressão em lote de etiquetas genéricas); esta gera **uma** etiqueta de expedição por volume, com dados de remetente/destinatário. Diferentes; sem sobreposição real.

**Casos de teste:**
1. `remetente="Loja Bela Vista"`, `destinatario="Maria Silva, Rua X, 123"`, `volumeAtual=2`, `volumeTotal=5` → `rotuloVolume="Volume 2 de 5"`.
2. `volumeAtual=1`, `volumeTotal=1` → `rotuloVolume="Volume 1 de 1"`.
3. Erro: `volumeAtual=6`, `volumeTotal=5` → `{ ok:false, erro:'volume_invalido', campo:'volumeAtual' }`.

---

## romaneio

**Motor:** `tabela` — os volumes da expedição são linhas; totais de peso e contagem são o resumo.

**Problema resolvido:** montar a lista de conferência da carga (romaneio) com os volumes, pesos e destinatários, pronta para acompanhar o motorista.

**Entradas (linhas da tabela `volumes`):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `descricao` | texto | sim | 1–120 caracteres | — |
| `pesoKg` | numero | sim | min 0,01 | — |
| `destinatario` | texto | não | 0–120 caracteres | "" |

Mínimo 1 linha, máximo 200.

**Processamento:**
```
totalVolumes = número de linhas
pesoTotal    = Σ pesoKg
```
Arredondamento: `pesoTotal` em 2 casas.
Erros: 0 linhas → `volumes_insuficientes`; `pesoKg` ≤ 0 em alguma linha → `peso_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `totalVolumes` | inteiro | não |
| `pesoTotal` | numero | sim |

**Exportação:** csv, pdf. Sem Plus.

**Celular 390px:** sem mudança; 3 colunas cabem.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Volumes: "Caixa 1" (12,5 kg), "Caixa 2" (8,3 kg), "Caixa 3" (20,0 kg) → `totalVolumes=3`; `pesoTotal=40,80`.
2. 1 volume de 5,0 kg → `totalVolumes=1`; `pesoTotal=5,00`.
3. Erro: volume com `pesoKg=0` → `{ ok:false, erro:'peso_invalido', campo:'pesoKg' }`.
