# Catálogo — calculo

Especificação das 6 ferramentas **planejadas** da categoria `calculo`. Todas com plano **gratis** e `recursos_plus: []` no manifesto — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| regra-de-tres | calculadora | sim | não | — |
| conversor-de-unidades | calculadora | sim | não | opções de unidade dependem da categoria (ver decisão pendente A) |
| imc | calculadora | sim | não | faixas de referência são da OMS, fonte citada |
| numeros-romanos | calculadora | sim | não | modo bidirecional (ver decisão pendente A) |
| escala-e-proporcao | calculadora | sim | não | 2 modos (ver decisão pendente A) |
| porcentagem | calculadora | sim | não | 5 operações (ver decisão pendente A) |

## Decisão pendente A — campo condicional / opções dependentes (afeta várias ferramentas)

O formato `<slug>-definicao.json` (contrato §15.3) não tem hoje uma forma de dizer "este campo só aparece se outro campo tiver tal valor" nem "as opções deste campo dependem do valor de outro campo". Isso aparece em:
- **porcentagem** — os 5 campos numéricos usados mudam conforme a `operacao` escolhida;
- **numeros-romanos** — o campo de entrada é texto (romano) ou número (decimal) conforme o `modo`;
- **escala-e-proporcao** — os campos mudam entre `redimensionar` e `escala_de_planta`;
- **conversor-de-unidades** — a lista de `unidadeOrigem`/`unidadeDestino` depende da `categoria` escolhida (não é bem "mostrar/ocultar campo", é "trocar as opções de um campo `opcao`");
- (nas outras categorias) `calculadora-de-datas` (datas), `utm` (marketing), `rateio-de-custos` e `comissao` (dinheiro/vendas, ver nota nos respectivos arquivos).

**Proposta (não bloqueante):** todas as ferramentas abaixo foram especificadas para funcionar **sem** a extensão — todos os campos ficam sempre visíveis, e o texto de ajuda (`campos.<id>_ajuda`) explica quando cada um é usado; campos não usados no modo escolhido são ignorados pelo `calcular()`. Se o dono do motor `calculadora` (§15.2) quiser a tela mais limpa, a extensão sugerida é uma chave opcional por campo em `<slug>-definicao.json`:
```json
{ "id": "percentualSimples", "tipo": "percentual", "mostrar_se": { "campo": "modo", "valor": "simples" } }
```
e, para opções dependentes, uma chave `"opcoes_de": "categoria"` que troca a lista de `opcoes` de um campo por um mapa `{ categoria: [opções] }` definido no próprio `<slug>-definicao.json`. Fica registrado aqui uma vez; os arquivos das outras categorias só remetem a esta seção.

---

## regra-de-tres

**Motor:** `calculadora`.

**Problema resolvido:** resolver "se 3 custam x, quanto custam 7" (ou o inverso — mais gente/mais rápido) sem lembrar a fórmula, vendo a conta montada.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `a1` | numero | sim | ≠ 0 | — |
| `b1` | numero | sim | — | — |
| `a2` | numero | sim | ≠ 0 (obrigatório > 0 se `tipo=inversa`) | — |
| `tipo` | opcao (`direta`\|`inversa`) | não | — | `direta` |

**Processamento:**
```
direta:  b2 = b1 × a2 / a1
inversa: b2 = b1 × a1 / a2
```
Arredondamento: 4 casas decimais (regra de três lida com quantidades não-monetárias; 4 casas evita "0" para proporções pequenas), exibido sem zeros à direita.
Erros: `a1 = 0` → `divisao_por_zero` (campo `a1`); `tipo=inversa` e `a2 = 0` → `divisao_por_zero` (campo `a2`).

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `b2` | numero | sim |

Conta (`conta: true`): mostra a proporção montada, ex. `"3 está para 12 assim como 7 está para b2"`.

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** 4 campos empilhados, sem mudança de comportamento.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Direta: `a1=3, b1=12, a2=7` → `b2 = 12×7/3 = 28`.
2. Inversa: `a1=4, b1=10, a2=5` (4 pessoas fazem em 10 dias; 5 pessoas fazem em quantos dias) → `b2 = 10×4/5 = 8`.
3. Erro: `a1=0` → `{ ok:false, erro:'divisao_por_zero', campo:'a1' }`.

---

## conversor-de-unidades

**Motor:** `calculadora` (ver decisão pendente A sobre a lista de unidades depender da categoria).

**Problema resolvido:** converter uma medida para outra unidade (peso, comprimento, temperatura etc.) sem procurar o fator de conversão.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `categoria` | opcao (`massa`\|`comprimento`\|`area`\|`volume`\|`temperatura`\|`velocidade`\|`tempo`\|`dados_digitais`) | sim | — | `massa` |
| `unidadeOrigem` | opcao (lista depende de `categoria`, ver tabela) | sim | — | — |
| `unidadeDestino` | opcao (mesma lista) | sim | — | — |
| `valor` | numero | sim | qualquer (negativo só faz sentido em `temperatura`) | — |

**Tabela de fatores (todas exatas por definição, não são "cotação" que muda — cito a fonte, definições do SI/NIST):**
- **massa** (base = grama): mg=0,001; g=1; kg=1000; tonelada=1000000; onça=28,349523125; libra=453,59237; arroba=14688 (arroba = 32 libras, unidade comercial brasileira comum para carne/café).
- **comprimento** (base = metro): mm=0,001; cm=0,01; m=1; km=1000; polegada=0,0254; pé=0,3048; jarda=0,9144; milha=1609,344.
- **área** (base = m²): m²=1; km²=1000000; hectare=10000; alqueire_paulista=24200 (padrão paulista, o mais usado; citar que outros estados têm alqueire diferente e por isso o valor é aproximado/regional).
- **volume** (base = litro): ml=0,001; l=1; m³=1000; xicara=0,240 (xícara culinária padrão, 240 ml); colher_sopa=0,015; galao_americano=3,785411784.
- **temperatura** (afim, não linear): `celsiusParaFahrenheit(c) = c×9/5+32`; `celsiusParaKelvin(c) = c+273.15`; conversão entre duas unidades quaisquer passa sempre por Celsius como pivô.
- **velocidade** (base = m/s): kmh=0,277778; ms=1; mph=0,44704; no=0,514444 (nó/nautical mile per hour).
- **tempo** (base = segundo): s=1; min=60; h=3600; dia=86400; semana=604800.
- **dados_digitais** (base = byte, convenção binária 1024, mais usada no dia a dia para arquivos): kb=1024; mb=1048576; gb=1073741824; tb=1099511627776.

**Processamento:**
```
não-temperatura: valorBase = valor × fator[unidadeOrigem]; resultado = valorBase / fator[unidadeDestino]
temperatura: converte para Celsius primeiro, depois de Celsius para a unidade destino
```
Arredondamento: 6 casas decimais, cortando zeros à direita na exibição (algumas conversões, como onça↔grama, geram muitas casas).
Erros: `unidadeOrigem`/`unidadeDestino` fora da lista da `categoria` escolhida → `unidade_invalida`; `categoria != temperatura` e `valor < 0` → `valor_negativo`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultado` | numero | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** os dois seletores de unidade ficam um sobre o outro (não lado a lado) para não cortar o nome da unidade.

**Viabilidade no navegador:** 100% local, sem biblioteca; os fatores são constantes exatas (definições internacionais de unidade), não "número de mercado" que precise ser informado pelo usuário ou consultado de fonte externa.

**Sobreposição:** nenhuma — é a única ferramenta de conversão de unidades físicas do catálogo (`conversor-de-moedas`, em dinheiro, é câmbio, categoria diferente).

**Casos de teste:**
1. `categoria=temperatura`, `100 celsius → fahrenheit` = `100×9/5+32 = 212`.
2. `categoria=massa`, `10 kg → libra` = `10×1000/453,59237 = 22,046226`.
3. Erro: `categoria=massa`, `valor=-5` → `{ ok:false, erro:'valor_negativo', campo:'valor' }`.

---

## imc

**Motor:** `calculadora`.

**Problema resolvido:** saber o IMC, a faixa em que ele se encaixa e o intervalo de peso que corresponderia à faixa "normal", para a altura da pessoa.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `pesoKg` | numero | sim | min 1, max 500 | — |
| `alturaCm` | numero | sim | min 30, max 250 | — |

**Processamento:**
```
alturaM = alturaCm / 100
imc = pesoKg / alturaM²
faixa: imc<18.5 → "abaixo do peso"; 18.5–24.9 → "peso normal"; 25–29.9 → "sobrepeso";
       30–34.9 → "obesidade grau I"; 35–39.9 → "obesidade grau II"; ≥40 → "obesidade grau III"
pesoMinimoNormal = 18.5 × alturaM²
pesoMaximoNormal = 24.9 × alturaM²
```
Fonte das faixas: classificação da OMS (Organização Mundial da Saúde) para adultos, os mesmos cortes (18,5 / 25 / 30 / 35 / 40) usados pelo Ministério da Saúde; **não se aplica** a menores de 18 anos, gestantes ou atletas de alta massa muscular — aviso obrigatório na tela (`.ferramenta__ajuda`), não é erro bloqueante.
Arredondamento: `imc` em 1 casa decimal (convenção usual); `pesoMinimoNormal`/`pesoMaximoNormal` em 1 casa.
Erros: `pesoKg` ≤ 0 → `peso_invalido`; `alturaCm` ≤ 0 → `altura_invalida`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `imc` | numero | sim |
| `faixa` | texto | não |
| `pesoMinimoNormal` | numero | não |
| `pesoMaximoNormal` | numero | não |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca; cortes fixos da OMS (constante conhecida, não "número de mercado").

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `pesoKg=70`, `alturaCm=175` → `imc = 70/1,75² = 22,9` (peso normal); faixa normal para 1,75 m: 56,7 a 76,3 kg.
2. `pesoKg=120`, `alturaCm=170` → `imc = 120/1,70² = 41,5` (obesidade grau III).
3. Erro: `alturaCm=0` → `{ ok:false, erro:'altura_invalida', campo:'alturaCm' }`.

---

## numeros-romanos

**Motor:** `calculadora` (ver decisão pendente A — campo de entrada muda de tipo conforme `modo`; aqui resolvido tendo dois campos, um texto e um número, ambos sempre visíveis, e o `calcular()` usa só o do modo escolhido).

**Problema resolvido:** converter um número decimal para romano (ou o contrário) e confirmar se uma grafia romana está certa.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo` | opcao (`para_romano`\|`para_decimal`) | não | — | `para_romano` |
| `valorDecimal` | inteiro | obrigatório se `modo=para_romano` | min 1, max 3999 | — |
| `valorRomano` | texto | obrigatório se `modo=para_decimal` | 1–15 caracteres, só `[IVXLCDM]` | — |

Limite 1–3999: além disso a notação subtrativa clássica (sem barra/traço de multiplicação por mil) não representa o número; a ferramenta não inventa uma extensão não-padrão.

**Processamento — para romano:** algoritmo guloso pela tabela `[[1000,M],[900,CM],[500,D],[400,CD],[100,C],[90,XC],[50,L],[40,XL],[10,X],[9,IX],[5,V],[4,IV],[1,I]]`, subtraindo o maior valor possível repetidamente.
**Processamento — para decimal:** percorre a string da direita para a esquerda somando o valor de cada letra, e subtraindo em vez de somar quando o valor é menor que o "maior valor visto até agora" (regra subtrativa). Depois de calcular, **valida a grafia**: reconverte o decimal para romano pelo algoritmo guloso e compara com a entrada (maiúscula); se não bater (ex.: `"IIII"`, `"VX"`, `"IXI"`), a grafia não é canônica.
Erros: `valorDecimal` fora de 1–3999 → `fora_do_intervalo`; `valorRomano` com caractere fora de `IVXLCDM` ou grafia não-canônica → `grafia_invalida`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultado` | texto | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `modo=para_romano`, `valorDecimal=1994` → `"MCMXCIV"`.
2. `modo=para_decimal`, `valorRomano="LVIII"` → `58`.
3. Erro: `modo=para_decimal`, `valorRomano="IIII"` → `{ ok:false, erro:'grafia_invalida', campo:'valorRomano' }` (a forma canônica de 4 é `"IV"`).

---

## escala-e-proporcao

**Motor:** `calculadora` (ver decisão pendente A — 2 modos).

**Problema resolvido:** redimensionar uma medida mantendo a proporção (ex.: "se 10 cm virou 15 cm, quanto vira 4 cm") ou converter entre a medida no desenho e a medida real numa escala de planta (1:50, 1:100...).

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo` | opcao (`redimensionar`\|`escala_de_planta`) | não | — | `redimensionar` |
| `medidaOriginal` | numero | obrigatório se `modo=redimensionar` | > 0 | — |
| `medidaNova` | numero | obrigatório se `modo=redimensionar` | > 0 | — |
| `valorParaConverter` | numero | sim | > 0 | — |
| `escala` | numero | obrigatório se `modo=escala_de_planta` (representa "1 : escala") | > 0 | 50 |
| `direcao` | opcao (`desenho_para_real`\|`real_para_desenho`) | obrigatório se `modo=escala_de_planta` | — | `desenho_para_real` |

**Processamento:**
```
redimensionar:      resultado = valorParaConverter × medidaNova / medidaOriginal
escala_de_planta:
  desenho_para_real: resultado = valorParaConverter × escala
  real_para_desenho: resultado = valorParaConverter / escala
```
Arredondamento: 4 casas decimais.
Erros: `modo=redimensionar` e `medidaOriginal = 0` → `divisao_por_zero`; `modo=escala_de_planta` e `escala ≤ 0` → `escala_invalida`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultado` | numero | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `modo=redimensionar`, `medidaOriginal=10`, `medidaNova=15`, `valorParaConverter=4` → `resultado = 4×15/10 = 6`.
2. `modo=escala_de_planta`, `escala=50`, `direcao=desenho_para_real`, `valorParaConverter=3` (cm no desenho) → `resultado = 150` cm reais (1,5 m).
3. Erro: `modo=redimensionar`, `medidaOriginal=0` → `{ ok:false, erro:'divisao_por_zero', campo:'medidaOriginal' }`.

---

## porcentagem

**Motor:** `calculadora` (ver decisão pendente A — 5 operações, todos os campos ficam sempre visíveis).

**Problema resolvido:** as 5 contas de porcentagem do dia a dia (quanto é X% de um valor, aumento, desconto, diferença entre dois valores, quanto A representa de B) numa ferramenta só.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `operacao` | opcao (`percentual_de`\|`aumento`\|`desconto`\|`diferenca_percentual`\|`quanto_e_de`) | não | — | `percentual_de` |
| `valor` | numero | usado em `percentual_de`\|`aumento`\|`desconto` | — | — |
| `percentual` | percentual | usado em `percentual_de`\|`aumento`\|`desconto` | min 0 | — |
| `valorA` | numero | usado em `diferenca_percentual`\|`quanto_e_de` | — | — |
| `valorB` | numero | usado em `diferenca_percentual`\|`quanto_e_de` | — | — |

**Processamento:**
```
percentual_de:          resultado = valor × percentual / 100
aumento:                resultado = valor × (1 + percentual/100)
desconto:                resultado = valor × (1 - percentual/100)
diferenca_percentual:   resultado = (valorB - valorA) / |valorA| × 100     (erro se valorA=0)
quanto_e_de:            resultado = valorA / valorB × 100                  (erro se valorB=0)
```
Arredondamento: 2 casas decimais.
Erros: `operacao=diferenca_percentual` e `valorA = 0` → `divisao_por_zero`; `operacao=quanto_e_de` e `valorB = 0` → `divisao_por_zero`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultado` | numero (ou percentual, conforme a operação) | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma com `preco-de-venda` (já pronta) — lá margem/markup têm fórmula própria de precificação; aqui são as operações genéricas de porcentagem.

**Casos de teste:**
1. `operacao=desconto`, `valor=250,00`, `percentual=20%` → `resultado=200,00`.
2. `operacao=diferenca_percentual`, `valorA=80`, `valorB=100` → `resultado = (100-80)/80×100 = 25,00%`.
3. Erro: `operacao=quanto_e_de`, `valorB=0` → `{ ok:false, erro:'divisao_por_zero', campo:'valorB' }`.
