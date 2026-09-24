# Catálogo — datas

Especificação das 5 ferramentas **planejadas** da categoria `datas`. Todas com plano **gratis** e `recursos_plus: []` — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| calculadora-de-datas | calculadora | sim | não | 4 modos (ver decisão pendente A em catalogo-calculo.md) |
| calculadora-de-horas | tabela | sim | não | — |
| calendario-do-mes | folha | sim | não | feriados fixos por lei; móveis calculados pela Páscoa |
| contagem-regressiva | interativo | sim | não | precisa de relógio ao vivo (exceção do §15.1) |
| fuso-horario | calculadora | sim | não | usa `Intl`/ICU do próprio navegador, sem tabela própria |

---

## calculadora-de-datas

**Motor:** `calculadora` (4 modos; ver decisão pendente A em `catalogo-calculo.md` — aqui, todos os campos ficam sempre visíveis e o `calcular()` usa só os do modo escolhido).

**Problema resolvido:** quantos dias faltam para uma data, quantos dias úteis um prazo tem, somar/subtrair dias de uma data, calcular idade exata ou saber o dia da semana de uma data.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo` | opcao (`diferenca`\|`somar_subtrair`\|`idade`\|`dia_da_semana`) | não | — | `diferenca` |
| `dataInicial` | data | obrigatório se `modo=diferenca` | ano 1900–2200 | — |
| `dataFinal` | data | obrigatório se `modo=diferenca` | ano 1900–2200 | — |
| `contarDiasUteis` | marcador | usado se `modo=diferenca` | — | falso |
| `dataBase` | data | obrigatório se `modo=somar_subtrair`\|`dia_da_semana` | ano 1900–2200 | — |
| `dias` | inteiro | obrigatório se `modo=somar_subtrair` | min 1, max 36500 | — |
| `operacao` | opcao (`somar`\|`subtrair`) | usado se `modo=somar_subtrair` | — | `somar` |
| `apenasDiasUteis` | marcador | usado se `modo=somar_subtrair` | — | falso |
| `dataNascimento` | data | obrigatório se `modo=idade` | ano 1900–2200, ≤ hoje | — |

**Processamento:**
- `diferenca`: `diasTotais = round((dataFinal − dataInicial) / 86400000)`. Se `contarDiasUteis`, também conta `diasUteis` percorrendo dia a dia e ignorando sábado/domingo (não desconta feriado — feriados variam por município; ver `calendario-do-mes` para a lista de feriados nacionais fixos, que pode ser cruzada manualmente). Também devolve a diferença em anos/meses/dias de calendário (ex.: "2 meses e 5 dias"), calculada campo a campo (não é `diasTotais/30`).
- `somar_subtrair`: se `apenasDiasUteis` for falso, `novaData = dataBase ± dias` corridos; se verdadeiro, soma/subtrai um dia por vez, pulando sábado e domingo, até completar `dias` dias úteis.
- `idade`: diferença de calendário entre `dataNascimento` e hoje (ou uma `dataReferencia` opcional), reportando anos completos.
- `dia_da_semana`: nome do dia (`Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })`, tudo em UTC para não variar por fuso do aparelho).
Arredondamento: dias sempre inteiro; anos/meses/dias de calendário sempre inteiros positivos.
Erros: `modo=diferenca` e `dataFinal < dataInicial` → `data_final_antes_da_inicial`; `modo=idade` e `dataNascimento` no futuro → `data_futura_invalida`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `resultadoPrincipal` (diasTotais, novaData, idadeAnos ou nomeDoDia, conforme o modo) | numero\|data\|texto | sim |
| `diasUteis` | inteiro (só no modo `diferenca` com `contarDiasUteis`) | não |
| `diferencaCalendario` | texto ("2 anos, 1 mês e 5 dias") | não |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** campos de data usam `<input type="date">` nativo (teclado de calendário do aparelho); sem mudança de layout.

**Viabilidade no navegador:** 100% local, `Date` nativo + `Intl`, sem biblioteca.

**Sobreposição:** nenhuma com `calendario-do-mes` (aquela gera uma folha para imprimir, não calcula diferença/soma) nem com `contagem-regressiva` (aquela é ao vivo/decorativa para uma única data-alvo).

**Casos de teste:**
1. `modo=diferenca`, `dataInicial=2026-01-10`, `dataFinal=2026-03-15`, `contarDiasUteis=true` → `diasTotais=64`, `diasUteis=45`, `diferencaCalendario="2 meses e 5 dias"`.
2. `modo=idade`, `dataNascimento=1990-05-20` (referência 2026-09-24) → `idadeAnos=36`.
3. Erro: `modo=diferenca`, `dataInicial=2026-05-01`, `dataFinal=2026-01-01` → `{ ok:false, erro:'data_final_antes_da_inicial', campo:'dataFinal' }`.

---

## calculadora-de-horas

**Motor:** `tabela` — os dias trabalhados são linhas; "carga horária, extras e saldo de banco de horas" são colunas calculadas e um resumo. Não cabe em `calculadora` porque o número de dias é variável.

**Problema resolvido:** fechar o ponto do mês somando as jornadas com intervalo, e saber se ficou com hora extra ou hora devida.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `jornadaDiariaEsperada` | hora | não | — | `08:00` |
| linha `data` | data | sim | — | — |
| linha `entrada` | hora | sim | — | — |
| linha `inicioIntervalo` | hora | não | — | "" |
| linha `fimIntervalo` | hora | não (obrigatório se `inicioIntervalo` informado) | — | "" |
| linha `saida` | hora | sim | — | — |

Máximo 31 linhas (um mês).

**Processamento:**
```
minutosDia[i] = (saida[i] - entrada[i]) em minutos
              - (fimIntervalo[i] - inicioIntervalo[i], se ambos informados)
extra[i]      = max(0, minutosDia[i] - jornadaEsperadaMinutos)
faltante[i]   = max(0, jornadaEsperadaMinutos - minutosDia[i])
totalMinutos  = Σ minutosDia
saldoBancoMin = totalMinutos - jornadaEsperadaMinutos × número_de_linhas
```
Formato de exibição de minutos: `H:MM` (ex.: 150 minutos → "2:30"), com sinal `-` quando negativo.
Arredondamento: tudo em minutos inteiros (os campos `hora` já vêm em `HH:MM`, sem segundos).
Erros: `saida[i] ≤ entrada[i]` → `horario_invalido` na linha; `inicioIntervalo[i]` ou `fimIntervalo[i]` fora do intervalo `[entrada[i], saida[i]]`, ou `fimIntervalo[i] ≤ inicioIntervalo[i]` → `intervalo_invalido` na linha.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `minutosDia` (coluna calculada, exibida como duracao) | duracao | não |
| `totalHoras` | duracao | sim |
| `saldoBanco` | duracao (com sinal) | não |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** 6 colunas não cabem lado a lado; no celular a tabela mostra `data`, `entrada`, `saida` e um botão "detalhes" que expande intervalo e total do dia (padrão de linha expansível, sem duplicar componente).

**Viabilidade no navegador:** 100% local, aritmética de minutos, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Dia 1: entrada 08:00, intervalo 12:00–13:00, saída 18:00 → 540 min = **9:00**. Dia 2: entrada 08:00, intervalo 12:00–13:00, saída 19:30 → 630 min = **10:30**, extra do dia 2 = 150 min = **2:30**. Com `jornadaDiariaEsperada=08:00` e 2 linhas: `saldoBanco = (540+630) - 480×2 = +210 min = +3:30`.
2. Dia único: entrada 09:00, sem intervalo, saída 17:00 → **8:00**, extra 0, saldo 0:00.
3. Erro: entrada 18:00, saída 17:00 (mesmo dia, sem virar o dia) → `{ ok:false, erro:'horario_invalido', campo:'saida' }`.

---

## calendario-do-mes

**Motor:** `folha` — gera uma página (SVG/HTML) para imprimir; não é `documento` porque não é um formulário preenchido e sim uma grade fixa de dias.

**Problema resolvido:** ter um calendário do mês ou do ano, com feriados marcados e espaço para anotar, pronto para imprimir.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo` | opcao (`mensal`\|`anual`) | não | — | `mensal` |
| `mes` | inteiro | obrigatório se `tipo=mensal` | 1–12 | mês atual |
| `ano` | inteiro | sim | 1900–2200 | ano atual |
| `mostrarFeriados` | marcador | não | — | verdadeiro |
| `incluirAnotacoes` | marcador | não | — | verdadeiro |

**Processamento:** monta a grade de dias do mês (ou dos 12 meses) usando `Date` nativo (ano bissexto tratado pelo próprio `Date`, sem tabela manual). Feriados nacionais fixos, por lei (Lei nº 6.802/1980 e Lei nº 10.607/2002): 1/1 (Confraternização Universal), 21/4 (Tiradentes), 1/5 (Dia do Trabalho), 7/9 (Independência), 12/10 (Nossa Senhora Aparecida), 2/11 (Finados), 15/11 (Proclamação da República), 25/12 (Natal). Feriados móveis (dependem da Páscoa): Carnaval (47 dias antes da Páscoa), Sexta-feira Santa (2 dias antes), Corpus Christi (60 dias depois) — a data da Páscoa é calculada pelo **algoritmo de Gauss/Meeus** (cálculo astronômico-eclesiástico determinístico, não é dado "inventado" nem precisa de fonte externa: o mesmo algoritmo usado por qualquer calendário civil).
Sem "conta" numérica — a saída é a folha em si.
Erros: `mes` fora de 1–12 → `mes_invalido`; `ano` fora de 1900–2200 → `ano_invalido`.

**Saídas:** a folha em si (grade de dias, feriados marcados, campo de anotação se `incluirAnotacoes`). Não há campo `resultados` numérico — a ferramenta usa as chaves próprias do motor `folha` (§15.2), documentadas no cabeçalho de `compartilhado-motor-folha.js`.

**Exportação:** imprimir, pdf, svg. Sem Plus.

**Celular 390px:** no modo `anual`, os 12 meses ficam em 1 coluna (rolagem vertical) em vez de grade 3×4, para as células do calendário não ficarem ilegíveis.

**Viabilidade no navegador:** 100% local; `Date` nativo cobre ano bissexto; algoritmo de Gauss/Meeus é puro cálculo, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste (sem "conta" monetária — confere datas e o algoritmo da Páscoa):**
1. `ano=2026`, `mes=2` → 2026 não é bissexto (2026/4 não é inteiro); fevereiro de 2026 tem 28 dias, começando numa quinta-feira (`new Date(Date.UTC(2026,1,1)).getUTCDay() = 4`).
2. Páscoa 2026 pelo algoritmo de Gauss/Meeus = **5 de abril de 2026**; Carnaval = 5/abr − 47 dias = **17 de fevereiro de 2026**; Corpus Christi = 5/abr + 60 dias = **4 de junho de 2026**.
3. Erro: `mes=13` → `{ ok:false, erro:'mes_invalido', campo:'mes' }`.

---

## contagem-regressiva

**Motor:** `interativo` (exceção justificada do §15.1) — o relógio precisa atualizar a cada segundo enquanto a página está aberta e a ferramenta gera um link com a data-alvo para compartilhar; isso não cabe no modelo estático "campos → resultados" da `calculadora`.

**Problema resolvido:** acompanhar visualmente quanto falta para uma data importante (casamento, lançamento, prova) e compartilhar essa contagem com outra pessoa por um link.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `dataAlvo` | data | sim | ano 1900–2999 | — |
| `horaAlvo` | hora | não | — | `00:00` |
| `titulo` | texto | não | 0–80 caracteres | "" |

**Processamento (função pura, chamada a cada tique do relógio pelo JS próprio da ferramenta):**
```
agora = new Date()
alvo  = new Date(dataAlvo + 'T' + horaAlvo)
diferencaMs = alvo - agora
jaPassou = diferencaMs <= 0
{ dias, horas, minutos, segundos } = decompor(Math.abs(diferencaMs))   // divisão inteira sucessiva por 86400000, 3600000, 60000, 1000
```
`jaPassou=true` não é erro — mostra "Já passou" em vez do contador.
O link para compartilhar é a própria URL da ferramenta com `?data=<dataAlvo>&hora=<horaAlvo>&titulo=<titulo>` (parâmetros de busca, lidos ao carregar a página; nenhum dado é salvo no servidor, então **não** depende de sessão).
Erros: `dataAlvo` com ano fora de 1900–2999 → `data_fora_do_intervalo`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `dias`, `horas`, `minutos`, `segundos` | inteiro | `dias` em destaque |
| `jaPassou` | (estado visual, não é campo `resultados` numérico) | — |

**Exportação:** copiar (link para compartilhar). Sem pdf/csv (não se aplica a um contador ao vivo). Sem Plus.

**Celular 390px:** os 4 números (dias/horas/minutos/segundos) empilham em 2×2 em vez de 1×4, para não ficarem pequenos demais.

**Viabilidade no navegador:** 100% local; atualização por `setInterval` de 1s, pausada se `prefers-reduced-motion` reduzir a frequência de repintura (não a lógica, só o quão suave a animação de troca de número é).

**Sobreposição:** nenhuma com `calculadora-de-datas` (aquela é um cálculo estático de diferença, não um relógio vivo nem gera link).

**Casos de teste:**
1. `agora = 2026-09-24T10:00:00Z`, `dataAlvo=2026-12-25`, `horaAlvo=00:00` → `diferencaMs = 92 dias e 14 horas` → `{ dias:92, horas:14, minutos:0, segundos:0, jaPassou:false }` (92 dias = 24/set a 25/dez contando dias completos restantes, mais 14h porque o alvo é meia-noite e agora são 10h).
2. `agora = 2026-09-24T10:00:00Z`, `dataAlvo=2026-01-01` → `jaPassou=true` (data já passou), sem erro.
3. Erro: `dataAlvo` com ano `3050` → `{ ok:false, erro:'data_fora_do_intervalo', campo:'dataAlvo' }`.

---

## fuso-horario

**Motor:** `calculadora`.

**Problema resolvido:** saber que horas são numa outra cidade agora (ou num horário escolhido) para marcar uma reunião sem errar o fuso.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `fusoOrigem` | opcao (lista curada de fusos IANA — grandes cidades do Brasil e do mundo, ex. `America/Sao_Paulo`, `America/New_York`, `Europe/Lisbon`, `Asia/Tokyo`...) | sim | — | `America/Sao_Paulo` |
| `data` | data | sim | — | hoje |
| `horario` | hora | sim | — | — |
| `fusoDestino` | opcao (mesma lista) | sim | — | — |

**Processamento:** monta um `Date` a partir de `data`+`horario` **interpretado no fuso de origem** (via `Intl.DateTimeFormat` com `timeZone` para achar o deslocamento em minutos daquele fuso naquele instante — cobre horário de verão automaticamente, porque usa o mesmo banco de fusos IANA/ICU embutido no motor JS) e formata esse instante no `fusoDestino`.
Erros: `fusoOrigem`/`fusoDestino` fora da lista curada → `fuso_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `horarioNoDestino` | texto (`HH:MM`, com indicação de "dia seguinte"/"dia anterior" se cruzar a virada) | sim |
| `diferencaHoras` | numero (destino − origem, em horas, pode ter `,5` por fusos de meia-hora) | não |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** os dois seletores de fuso empilham; sem mudança de comportamento.

**Viabilidade no navegador:** 100% local. Usa o objeto `Intl` do próprio motor JavaScript (V8/Node, e o mesmo suporte existe em todo navegador moderno), que já traz o banco de fusos horários IANA (`tzdata`) embutido e atualizado a cada versão do navegador/Node — **não é uma tabela "inventada" pela ferramenta**, é a base de dados oficial IANA que o próprio runtime mantém. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste (fixando a data em 15/01/2026 para não haver ambiguidade de horário de verão):**
1. `fusoOrigem=America/Sao_Paulo`, `data=2026-01-15`, `horario=10:00`, `fusoDestino=Europe/Lisbon` → **13:00** no destino (São Paulo é UTC−3 o ano todo desde a extinção do horário de verão brasileiro; Lisboa em janeiro está em WET, UTC+0 → diferença de 3h).
2. `fusoOrigem=America/Sao_Paulo`, `data=2026-01-15`, `horario=10:00`, `fusoDestino=Asia/Tokyo` → **22:00** no destino (Tóquio é UTC+9 o ano todo, sem horário de verão → diferença de 12h).
3. Erro: `fusoDestino="Marte/Base1"` → `{ ok:false, erro:'fuso_invalido', campo:'fusoDestino' }`.
