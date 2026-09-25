# Catálogo — Planilhas

Especificação das 5 ferramentas **planejadas** da categoria `planilhas`. `limpar-planilha` já está pronta (§13 dos contratos) e não entra aqui. Todas processam no navegador; o arquivo nunca sai do aparelho. Usam a biblioteca já disponível no projeto: **SheetJS 0.20.3** (`frontend/compartilhado/bibliotecas/xlsx.mjs`) para ler/escrever XLSX; CSV é sempre tratado com parser próprio (mesma detecção de separador de `limpar-planilha`).

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| csv-e-json | transformador | sim | nenhuma | parser CSV próprio + `JSON.parse`/`stringify` |
| comparar-planilhas | arquivo (em etapas) | sim | nenhuma | SheetJS já disponível |
| estatistica-descritiva | calculadora | sim | nenhuma | só aritmética |
| gerador-de-formulas | calculadora | sim | nenhuma | monta string de fórmula, não executa nada |
| dados-de-teste | tabela | sim | nenhuma | PRNG determinístico (`mulberry32`) embutido, sem `Math.random()` |

Nenhuma biblioteca nova nesta categoria.

---

## csv-e-json — CSV e JSON

**Motor:** `transformador` — texto (ou arquivo lido para dentro do texto) + opções → saída ao digitar/converter, copiar/baixar.

**Problema resolvido:** converter rápido uma lista CSV (do Excel, de um sistema) em JSON para colar num código, ou o caminho inverso.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo_entrada` | `opcao` (`texto`, `arquivo`) | sim | — | `texto` |
| `texto` | `area-texto` | obrigatório se `modo_entrada=texto` | 5.000.000 caracteres | `""` |
| `arquivo` | `arquivo` (`.csv`) | obrigatório se `modo_entrada=arquivo` | 20 MB | — |
| `direcao` | `opcao` (`csv_para_json`, `json_para_csv`) | sim | — | `csv_para_json` |
| `separador` | `opcao` (`,`, `;`, tab) | não | — | detectado automaticamente (mesma heurística de `limpar-planilha`: conta ocorrências de `,`/`;`/tab na primeira linha e usa a mais frequente) |
| `tem_cabecalho` | `marcador` | não | — | `true` |
| `converter_tipos` | `marcador` | não | — | `true` |

**Processamento:**
- **`csv_para_json`:** separa em linhas; se `tem_cabecalho`, a primeira linha vira as chaves dos objetos (senão, chaves são `coluna_1`, `coluna_2`...); cada linha seguinte separada por `separador` vira um objeto `{ chave: valor }`. Se `converter_tipos`, todo valor cujo texto (aparado) casa `/^-?\d+(\.\d+)?$/` é convertido para `Number`; o resto permanece string. Saída: `JSON.stringify(linhas, null, 2)`.
- **`json_para_csv`:** `JSON.parse(texto)` precisa ser um array de objetos simples (não aninhados); as colunas são a **união das chaves**, na ordem da primeira aparição entre os objetos; monta as linhas no `separador` escolhido, envolvendo em aspas (e dobrando aspas internas) qualquer valor que contenha o separador, aspas ou quebra de linha (regra RFC 4180, igual à exportação de `limpar-planilha`).

**Erros:** `direcao=json_para_csv` com `JSON.parse` falhando → `json_invalido`; JSON válido mas que não é array de objetos simples (é objeto único, array de arrays, ou tem valores aninhados) → `formato_incompativel`; `arquivo` acima de 20 MB → `arquivo_grande_demais`.

**Saídas:** `resultado` (texto, destaque), `total_linhas` (inteiro).

**Exportação:** `copiar`, `baixar` (`.json` ou `.csv`, conforme `direcao`). Sem Plus.

**Celular:** textareas empilhados; opções em duas linhas.

**Viabilidade:** total — parser CSV e conversor de tipos são lógica pura; `JSON.parse`/`stringify` nativos. Sem biblioteca nova (não usa SheetJS aqui porque CSV puro não precisa de parser de planilha binária).

**Sobreposição:** `json` (desenvolvimento) valida/formata JSON solto, não converte de/para CSV — ferramentas complementares.

**Casos de teste**
1. Sucesso (`csv_para_json`) — entrada `"nome,idade\nAna,30\nBruno,25"`, `converter_tipos=true` → `[{"nome":"Ana","idade":30},{"nome":"Bruno","idade":25}]` (idade convertida para número). Verificado com `node -e`.
2. Sucesso (`json_para_csv`) — entrada `[{"nome":"Ana","idade":30},{"nome":"Bruno, Jr.","idade":25}]` → saída:
   ```
   nome,idade
   Ana,30
   "Bruno, Jr.",25
   ```
   (o valor com vírgula interna vai entre aspas). Verificado com `node -e`.
3. Erro — `direcao=json_para_csv`, entrada `{"nome":"Ana"}` (objeto único, não array) → `{ ok: false, erro: 'formato_incompativel', campo: 'texto' }`.

---

## comparar-planilhas — Comparar duas planilhas

**Motor:** `arquivo`, em 4 etapas (mesmo padrão de `limpar-planilha`, §13.6): 1 Enviar (dois arquivos, A e B, CSV nativo ou XLSX/XLS via SheetJS sob demanda, ≤ 20 MB cada), 2 Configurar (coluna-chave para casar as linhas entre os dois arquivos; colunas a ignorar na comparação, por exemplo uma coluna de "última atualização" que sempre muda e não deve contar como diferença), 3 Revisar (três grupos: adicionadas, removidas, alteradas — cada linha alterada mostra coluna, valor antigo, valor novo), 4 Exportar.

**Problema resolvido:** duas versões de uma mesma lista (estoque, preços, cadastro) e a pessoa quer saber exatamente o que entrou, o que saiu e o que mudou, sem comparar célula por célula.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo_a` | `arquivo` | sim | 20 MB, `.csv`/`.xlsx`/`.xls` | — |
| `arquivo_b` | `arquivo` | sim | 20 MB, `.csv`/`.xlsx`/`.xls` | — |
| `coluna_chave` | `opcao` (populada com os cabeçalhos comuns aos dois arquivos, após a etapa 1) | sim | — | — |
| `colunas_ignoradas` | `opcao` múltipla (cabeçalhos comuns) | não | — | nenhuma |

**Processamento:**
1. Lê os dois arquivos (mesma detecção de separador/formato de `limpar-planilha`).
2. Monta `Map` de A e de B usando o valor de `coluna_chave` de cada linha como chave. Chave repetida dentro do **mesmo** arquivo → erro `chave_duplicada` (comparação fica ambígua, precisa de uma chave única).
3. `adicionadas` = chaves que existem em B mas não em A. `removidas` = chaves que existem em A mas não em B. `alteradas` = chaves que existem nos dois com pelo menos uma coluna (fora `coluna_chave` e `colunas_ignoradas`) com valor diferente — comparação campo a campo, não `JSON.stringify` da linha inteira (para não marcar como igual uma linha cuja única diferença esteja numa coluna ignorada).
4. Linhas iguais (nenhuma coluna diferente) não aparecem no resultado.

**Erros:** `coluna_chave` não existe em algum dos arquivos → `coluna_chave_invalida`; chave duplicada dentro do mesmo arquivo → `chave_duplicada`, `extras: { arquivo: 'a'|'b', chave }`; arquivo acima de 20 MB → `arquivo_grande_demais`; arquivo sem linhas → `arquivo_vazio`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `adicionadas` | lista | sim |
| `removidas` | lista | sim |
| `alteradas` | lista (cada item com as colunas que mudaram) | sim |
| `total_diferencas` | inteiro | não |

**Exportação:** `copiar` (resumo), `baixar` (`.csv`/`.xlsx` com uma coluna extra `status` = `adicionada`/`removida`/`alterada`). Plus: recurso `xlsx` de exportação com formatação condicional (célula colorida por tipo de diferença) — mesmo padrão de "Plus = recurso avançado do resultado", igual a `preco-de-venda`.

**Celular:** os três grupos de resultado (adicionadas/removidas/alteradas) ficam em `.abas` em vez de três colunas lado a lado.

**Viabilidade:** total — `Map`, comparação campo a campo; SheetJS já disponível no projeto para XLSX. Sem biblioteca nova.

**Sobreposição:** `comparador-de-textos` (texto) faz diff de **texto livre linha a linha**; este faz diff de **linhas tabulares casadas por chave** — algoritmos e propósitos diferentes, não unificar.

**Casos de teste**
1. Sucesso — arquivo A com linhas `id=1,preco=10`; `id=2,preco=20`; `id=3,preco=30`; arquivo B com `id=1,preco=15`; `id=2,preco=20`; `id=4,preco=40`; `coluna_chave=id` → `adicionadas=["4"]`, `removidas=["3"]`, `alteradas=["1"]` (só `preco` mudou na chave 1; chave 2 é idêntica, não aparece). Verificado com `node -e`.
2. Sucesso — os dois arquivos idênticos → `adicionadas=[]`, `removidas=[]`, `alteradas=[]`, `total_diferencas=0`.
3. Erro — arquivo A com duas linhas `id=1` → `{ ok: false, erro: 'chave_duplicada', extras: { arquivo: 'a', chave: '1' } }`.

---

## estatistica-descritiva — Estatística de uma coluna

**Motor:** `calculadora` — campo `area-texto` com os valores (um caso de uso legítimo do tipo `area-texto` dentro do motor calculadora, e não do motor `transformador`, porque a saída são vários números calculados e não um texto transformado) → resultados.

**Problema resolvido:** colar uma coluna de números (de uma planilha, de um relatório) e saber rápido a média, mediana, desvio padrão e se tem algum valor fora da curva, sem abrir o Excel.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `valores` | `area-texto` | sim | 50.000 números (um por linha, ou separados por vírgula/espaço/`;`) | `""` |

**Processamento:**
1. Extrai números com `valores.split(/[\s,;\n]+/).filter(Boolean)`, convertendo cada item com `Number(item)`; itens que não formam um número válido (`Number.isNaN`) são contados em `ignorados` e descartados do cálculo (não travam o resultado).
2. Menos de 2 números válidos → erro `dados_insuficientes`.
3. Ordena os valores; `media = soma/n`; `mediana` = valor do meio (ou média dos dois centrais se `n` par); `desvio_padrao` = desvio padrão **amostral** (`Σ(x−média)² / (n−1)`, raiz quadrada — denominador `n−1`, não `n`, por ser amostra e não população completa); `quartil_1`/`quartil_3` por interpolação linear (método usado pelo Excel/`PERCENTILE.INC`: `idx = (n−1)×p`, interpola entre `v[⌊idx⌋]` e `v[⌈idx⌉]`); `iqr = quartil_3 − quartil_1`; `valores_fora_da_curva` = valores fora de `[quartil_1 − 1.5×iqr, quartil_3 + 1.5×iqr]` (regra de Tukey); `moda` = valor(es) de maior frequência, ou `"nenhuma"` se todos os valores aparecem uma única vez.

**Erros:** `dados_insuficientes` (menos de 2 números válidos).

**Saídas**
| id | formato | destaque |
|---|---|---|
| `media` | numero | sim |
| `mediana` | numero | não |
| `moda` | texto | não |
| `desvio_padrao` | numero | não |
| `quartil_1` | numero | não |
| `quartil_3` | numero | não |
| `valores_fora_da_curva` | lista | não |
| `ignorados` | inteiro | não |

**Exportação:** `copiar`, `pdf` (resumo dos números). Sem Plus.

**Celular:** os 6 números do resultado empilham em `.resultado__linhas` de largura total; lista de valores fora da curva embaixo.

**Viabilidade:** total — só aritmética (`sort`, `reduce`, `Math.sqrt`). Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `valores="2\n4\n4\n4\n5\n5\n7\n9"` → `media=5`, `mediana=4.5`, `moda="4"`, `desvio_padrao≈2.1381`, `quartil_1=4`, `quartil_3=5.5`, `valores_fora_da_curva=[9]` (9 está acima de `quartil_3 + 1.5×iqr = 5.5 + 1.5×1.5 = 7.75`). Verificado com `node -e`.
2. Sucesso — `valores="10, 20, trinta, 30, 40"` → ignora `"trinta"` (`ignorados=1`), calcula sobre `[10,20,30,40]`: `media=25`, `mediana=25`, `moda="nenhuma"`, `desvio_padrao≈12.9099`, `quartil_1=17.5`, `quartil_3=32.5`, `valores_fora_da_curva=[]`. Verificado com `node -e`.
3. Erro — `valores="42"` (só um número válido) → `{ ok: false, erro: 'dados_insuficientes', campo: 'valores', extras: { minimo: 2 } }`.

---

## gerador-de-formulas — Montador de fórmulas de planilha

**Motor:** `calculadora` — campos (tipo de fórmula + seus parâmetros) → resultado (a fórmula pronta, formato texto) + "A conta" explicando cada parte.

**Problema resolvido:** montar `PROCV`/`PROCX`/`SOMASES`/`CONT.SES`/`SE` aninhado a partir de perguntas simples (qual coluna, qual critério), sem lembrar a ordem exata dos argumentos — e sem confundir `,` com `;` (Excel/Sheets em pt-BR usam `;`).

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo_formula` | `opcao` (`procv`, `procx`, `somases`, `contases`, `se_aninhado`) | sim | — | `procv` |
| `valor_procurado` | `texto` | obrigatório em `procv`/`procx` | ≤ 100 caracteres | — |
| `intervalo_tabela` | `texto` | obrigatório em `procv` | ex.: `Produtos!A:D` | — |
| `coluna_retorno` | `inteiro` | obrigatório em `procv` | min 1 | — |
| `intervalo_procura` | `texto` | obrigatório em `procx` | — | — |
| `intervalo_retorno` | `texto` | obrigatório em `procx` | — | — |
| `correspondencia_exata` | `marcador` | não (`procv`/`procx`) | — | `true` |
| `intervalo_soma` | `texto` | obrigatório em `somases` | — | — |
| `criterios` | lista de pares `{ intervalo, criterio }` (até 5 pares, cada um `texto`) | obrigatório ao menos 1 par, em `somases`/`contases` | — | — |
| `condicoes` | lista de pares `{ condicao, resultado }` (até 5 pares) | obrigatório ao menos 1 par, em `se_aninhado` | — | — |
| `resultado_padrao` | `texto` | obrigatório em `se_aninhado` | — | — |

**Processamento — monta a string por template, com `;` como separador de argumento (padrão pt-BR do Excel/Google Sheets):**
- `procv`: `` =PROCV(<valor_procurado>;<intervalo_tabela>;<coluna_retorno>;<correspondencia_exata ? "FALSO" : "VERDADEIRO">) ``
- `procx`: `` =PROCX(<valor_procurado>;<intervalo_procura>;<intervalo_retorno>;"Não encontrado";<correspondencia_exata ? 0 : 1>) ``
- `somases`: `` =SOMASES(<intervalo_soma>;<intervalo1>;<criterio1>;<intervalo2>;<criterio2>;...) ``
- `contases`: `` =CONT.SES(<intervalo1>;<criterio1>;<intervalo2>;<criterio2>;...) ``
- `se_aninhado`: aninha da direita para a esquerda: `` =SE(<condicao1>;<resultado1>;SE(<condicao2>;<resultado2>;...;<resultado_padrao>)) ``

**Erros:** campo obrigatório do `tipo_formula` escolhido vazio → `campo_obrigatorio`, `campo: '<id>'`.

**Saídas:** `formula_pronta` (texto, destaque), `explicacao` (texto, "A conta": uma frase por argumento dizendo o que ele faz).

**Exportação:** `copiar`. Sem Plus.

**Celular:** campos do tipo escolhido empilham; fórmula pronta em `<code>` com botão copiar grande.

**Viabilidade:** total — concatenação de string determinística; a fórmula gerada **nunca é executada** pela ferramenta (é texto para colar no Excel/Sheets), então não há risco de `eval`. Sem biblioteca nova.

**Sobreposição:** nenhuma; é a única ferramenta que produz fórmula de planilha como texto.

**Casos de teste**
1. Sucesso (`procv`) — `valor_procurado="A2"`, `intervalo_tabela="Produtos!A:D"`, `coluna_retorno=3`, `correspondencia_exata=true` → `formula_pronta="=PROCV(A2;Produtos!A:D;3;FALSO)"`. Verificado com `node -e`.
2. Sucesso (`somases`) — `intervalo_soma="C2:C100"`, `criterios=[{intervalo:"A2:A100",criterio:"\"Ativo\""},{intervalo:"B2:B100",criterio:">100"}]` → `formula_pronta="=SOMASES(C2:C100;A2:A100;\"Ativo\";B2:B100;>100)"`. Verificado com `node -e`.
3. Erro — `tipo_formula=procv`, `valor_procurado=""` → `{ ok: false, erro: 'campo_obrigatorio', campo: 'valor_procurado' }`.

---

## dados-de-teste — Gerador de dados de teste

**Motor:** `tabela` — parâmetros geram linhas editáveis com colunas tipadas → exportação CSV/XLSX. É o único caso do catálogo em que a "tabela" não vem de um arquivo, e sim é gerada — ainda assim o resultado (linhas + colunas + exportação) é exatamente o que o motor `tabela` já entrega.

**Problema resolvido:** testar uma planilha, formulário ou sistema com dados fictícios realistas (nomes, cidades, produtos, pedidos) sem digitar cada linha à mão.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo_entidade` | `opcao` (`pessoa`, `produto`, `pedido`) | sim | — | `pessoa` |
| `quantidade` | `inteiro` | sim | 1–1000 | `20` |
| `semente` | `inteiro` | não | — | aleatória (`Date.now() % 2**31`) quando não informada |

**Processamento — PRNG determinístico (`mulberry32`), nunca `Math.random()`, para o resultado ser reproduzível quando a `semente` é informada (útil para o mesmo conjunto de teste em dias diferentes):**
1. `rnd = mulberry32(semente)`; `pick(lista) = lista[Math.floor(rnd() * lista.length)]`.
2. `pessoa`: `nome = pick(nomes) + ' ' + pick(sobrenomes)`, `cidade = pick(cidades)`, `idade = 18 + Math.floor(rnd() * 50)`.
3. `produto`: `produto = pick(produtos)`, `categoria = pick(categorias)`, `preco = round((10 + rnd() * 190) * 100) / 100`.
4. `pedido`: `numero = 1000 + i`, `cliente = pick(nomes) + ' ' + pick(sobrenomes)`, `valor = round((20 + rnd() * 480) * 100) / 100`, `data` = uma data aleatória dentro dos últimos 90 dias a partir de hoje.
As listas base (`nomes`, `sobrenomes`, `cidades`, `produtos`, `categorias`) ficam embutidas em `dados-de-teste-calculo.js`, com pelo menos 40 itens cada na versão real; para o teste de unidade, `calcular(entradas, { listas })` aceita as listas por parâmetro (assim o teste usa uma lista pequena e fixa, sem depender do tamanho da lista de produção).

**Erros:** `quantidade` fora de 1–1000 → `quantidade_invalida`.

**Saídas:** `linhas` (lista de objetos, colunas variam por `tipo_entidade`), `quantidade_gerada` (inteiro).

**Exportação:** `copiar` (CSV), `baixar` (`.csv`/`.xlsx` via SheetJS). Sem Plus.

**Celular:** tabela gerada em `.tabela` com scroll horizontal; controles de geração colapsam acima.

**Viabilidade:** total — `mulberry32` é uma função pura de ~6 linhas (sem biblioteca de PRNG externa); SheetJS já disponível para XLSX. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste** (usando as listas de teste `nomes=['Ana','Bruno','Carla','Diego']`, `sobrenomes=['Silva','Souza','Oliveira','Costa']`, `cidades=['São Paulo','Curitiba','Recife','Belém']`)
1. Sucesso (`pessoa`) — `quantidade=3`, `semente=42` → `linhas=[{"nome":"Carla Souza","cidade":"Belém","idade":51},{"nome":"Ana Oliveira","cidade":"Curitiba","idade":49},{"nome":"Diego Souza","cidade":"São Paulo","idade":62}]`. Verificado com `node -e` usando a implementação exata de `mulberry32` acima.
2. Sucesso (`produto`, listas de teste `produtos=['Caderno','Caneta','Mochila','Garrafa']`, `categorias=['Papelaria','Escritório','Viagem','Casa']`) — `quantidade=2`, `semente=42` → `linhas=[{"produto":"Caneta","categoria":"Casa","preco":124.21},{"produto":"Caderno","categoria":"Viagem","preco":137.25}]`. Verificado com `node -e`.
3. Erro — `quantidade=1500` → `{ ok: false, erro: 'quantidade_invalida', campo: 'quantidade', extras: { min: 1, max: 1000 } }`.
