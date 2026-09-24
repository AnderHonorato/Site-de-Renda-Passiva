# Catálogo de especificação — trabalho

Consulta feita em **24/09/2026**. Todo valor de INSS, IRRF, aviso prévio, FGTS, 13º e férias abaixo é regra oficial vigente citada com fonte; onde não foi possível confirmar um detalhe específico, isso está marcado como **NÃO CONFIRMADO** no corpo do item, e a ferramenta não deve usar um número de memória para substituí‑lo. As três ferramentas de cálculo trabalhista (`ferias`, `rescisao-estimada`, `salario-liquido-estimado`) são **estimativas**: a tela de resultado de cada uma precisa dizer isso explicitamente (ex.: "Estimativa — não substitui o cálculo da folha de pagamento da empresa ou de um contador").

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| ferias | calculadora | sim | nenhuma | estimativa; regra CLT (1/3 e abono) estável, sem tabela anual |
| rescisao-estimada | calculadora | sim | nenhuma | estimativa; várias verbas e regras por tipo de desligamento — ver limitações |
| salario-liquido-estimado | calculadora | sim | nenhuma | estimativa; tabelas INSS/IRRF 2026 oficiais + redutor da Lei 15.270/2025 |
| escala-de-trabalho | tabela | sim | nenhuma | modelo simplificado de ciclo (sem turno diurno/noturno separado) |
| avaliacao-de-desempenho | documento | sim | nenhuma | monta formulário em branco; não calcula média |
| descricao-de-vaga | documento | sim | nenhuma | — |
| roteiro-de-entrevista | documento | sim | nenhuma | organiza estrutura; não inventa banco de perguntas |
| plano-de-onboarding | tabela | sim | nenhuma | dias corridos, sem lógica de dia útil |
| organograma | interativo (exceção) | sim | nenhuma | árvore hierárquica não cabe nos motores tabulares |

## Fontes oficiais usadas nesta categoria

- **INSS 2026** — Portaria Interministerial MPS/MF nº 13, de 9 de janeiro de 2026 (DOU de 12/01/2026, Edição 7, Seção 1, p. 58), Anexo II — "Tabela de contribuição dos segurados empregado, empregado doméstico e trabalhador avulso". Consulta: `https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf`, em 24/09/2026.
- **IRRF 2026 (tabela progressiva mensal)** — Lei nº 15.191, de 11 de agosto de 2025, vigente desde janeiro/2026. Consulta: `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026`, em 24/09/2026.
- **Redução adicional do IRRF (isenção até R$ 5.000 e faixa de transição até R$ 7.350)** — art. 3º‑A da Lei nº 9.250/1995, incluído pela Lei nº 15.270, de 26 de novembro de 2025. Consulta: `https://www2.camara.leg.br/legin/fed/lei/1995/lei-9250-26-dezembro-1995-362566-normaatualizada-pl.html`, em 24/09/2026.
- **Aviso prévio proporcional** — Lei nº 12.506, de 13 de outubro de 2011 (30 dias + 3 dias por ano completo de serviço, limitado a 90 dias).
- **Multa de 40% do FGTS, aviso prévio, 13º e férias proporcionais** — CLT (arts. 477, 487, 146 e §único, 143) e Lei nº 8.036/1990, art. 18, §1º.

---

## 1. `ferias` — Cálculo de férias

- **Motor:** `calculadora` — é uma fórmula fechada a partir de poucos campos, sem geração de documento nem lista de linhas; cabe integralmente no motor padrão, com "A conta" mostrando a fórmula.
- **Problema resolvido:** quem vai tirar férias quer saber, antes de sair, quanto vai cair na conta.
- **Entradas** (grupo `valores`):
  - `salario_bruto` — `moeda`, obrigatório, min `0.01`.
  - `dias_ferias` — `inteiro`, obrigatório, min `5`, max `30`, padrão `30`.
  - `dias_abono` — `inteiro`, opcional, min `0`, max `10`, padrão `0` (abono pecuniário, CLT art. 143: até 1/3 dos 30 dias, ou seja, até 10 dias, pode ser vendido).
- **Processamento:**
  - `remuneracaoDia = salario_bruto / 30`
  - `valorDiasFerias = arred2(remuneracaoDia × dias_ferias)`
  - `tercoFerias = arred2(valorDiasFerias / 3)`
  - `totalFeriasGozadas = arred2(valorDiasFerias + tercoFerias)`
  - `valorAbono = arred2(remuneracaoDia × dias_abono)`
  - `tercoAbono = arred2(valorAbono / 3)`
  - `totalAbono = arred2(valorAbono + tercoAbono)`
  - `totalAReceber = arred2(totalFeriasGozadas + totalAbono)`
  - Arredondamento: 2 casas decimais em toda etapa monetária (arredondamento comercial, `Math.round(n*100)/100`).
  - Erros: `dias_invalidos` quando `dias_ferias + dias_abono > 30`; `abono_acima_do_limite` quando `dias_abono > 10`.
- **Saídas:** `totalAReceber` (`moeda`, destaque), `totalFeriasGozadas`, `tercoFerias`, `totalAbono` (todos `moeda`). "A conta" mostra `remuneracaoDia`, `valorDiasFerias`, `tercoFerias`, `valorAbono`, `tercoAbono`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis; sem recurso Plus (`recursos_plus` vazio no manifesto).
- **Celular (390px):** campos empilhados (`salario_bruto`, `dias_ferias`, `dias_abono`), resultado abaixo com o valor total em destaque grande e o detalhamento em lista, igual ao padrão de outras calculadoras já entregues.
- **Viabilidade:** 100% local, cálculo trivial, nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com outra ferramenta planejada desta onda; `rescisao-estimada` reaproveita a mesma fórmula de férias proporcionais e vencidas internamente (não é duplicação de tela, é lógica compartilhada — considerar extrair para uma função comum em `frontend/compartilhado/` se o agente de implementação achar prático).
- **Casos de teste:**
  1. **Sucesso:** `salario_bruto=3000,00`, `dias_ferias=30`, `dias_abono=0` → `remuneracaoDia=100,00`; `valorDiasFerias=3000,00`; `tercoFerias=1000,00`; `totalFeriasGozadas=4000,00`; `totalAbono=0,00`; **`totalAReceber=4000,00`**.
  2. **Sucesso:** `salario_bruto=3000,00`, `dias_ferias=20`, `dias_abono=10` → `valorDiasFerias=2000,00`; `tercoFerias=666,67`; `totalFeriasGozadas=2666,67`; `valorAbono=1000,00`; `tercoAbono=333,33`; `totalAbono=1333,33`; **`totalAReceber=4000,00`** (confere: com 30 dias no total, o resultado é sempre `salario_bruto × 4/3`, qualquer que seja a divisão entre férias e abono).
  3. **Erro:** `dias_ferias=25`, `dias_abono=10` (soma 35 > 30) → `{ ok: false, erro: 'dias_invalidos', campo: 'dias_abono' }`.

## 2. `rescisao-estimada` — Estimativa de rescisão

- **Motor:** `calculadora` — mesmo padrão de campos → resultados + "A conta", mesmo com várias parcelas.
- **Problema resolvido:** quem foi (ou vai ser) desligado quer uma ideia do total antes de ir até o RH ou o sindicato.
- **Limitações explícitas (documentar na tela, não é bug):** não calcula seguro‑desemprego (regras da Caixa/Ministério do Trabalho, fora do escopo), não trata períodos de férias já parcialmente gozados, assume que o aviso prévio é sempre **indenizado** quando devido (não modela o aviso trabalhado com data de saída diferente), e vale para regime CLT comum (não doméstico/rural, que têm particularidades).
- **Entradas** (grupo `dados`):
  - `salario_bruto` — `moeda`, obrigatório, min `0.01`.
  - `data_admissao` — `data`, obrigatório.
  - `data_desligamento` — `data`, obrigatório, deve ser `≥ data_admissao`.
  - `tipo_desligamento` — `opcao`, obrigatório, valores `sem_justa_causa | pedido_demissao | justa_causa | acordo_mutuo`, sem padrão (o usuário precisa escolher).
  - `saldo_fgts_depositado` — `moeda`, opcional, min `0`, padrão `0` (para calcular a multa; se `0`, a multa sai `0,00` e a tela avisa que o valor real do FGTS deve ser consultado no app FGTS).
  - `dias_ferias_vencidas` — `inteiro`, opcional, min `0`, max `30`, padrão `0` (dias de um período de férias anterior já adquirido e ainda não gozado nem pago).
- **Processamento** (todas as datas tratadas como `Date` local, sem fuso):
  1. `anosCompletos` = número de aniversários de admissão completos até `data_desligamento`.
  2. `diasAviso`:
     - `sem_justa_causa` ou `acordo_mutuo`: `min(90, 30 + 3 × anosCompletos)` (Lei 12.506/2011).
     - `pedido_demissao` ou `justa_causa`: `0`.
  3. `valorAviso`:
     - `sem_justa_causa`: `arred2((salario_bruto / 30) × diasAviso)`.
     - `acordo_mutuo`: `arred2((salario_bruto / 30) × diasAviso × 0,5)` (art. 484‑A, §1º, CLT — aviso pago pela metade no acordo mútuo).
     - demais tipos: `0`.
  4. `dataProjetada = data_desligamento + diasAviso dias` quando `diasAviso > 0` (projeção do aviso prévio indenizado — Súmula 371 do TST); senão `dataProjetada = data_desligamento`.
  5. `mesesComAvos(inicio, fim)`: conta meses completos entre duas datas; o mês final incompleto conta como um avo inteiro se tiver **≥ 15 dias** (regra geral de avos do 13º e das férias proporcionais).
  6. `decimoTerceiroProporcional`:
     - se `justa_causa`: `0` (perde o direito).
     - senão: `meses13 = min(12, mesesComAvos(1º de janeiro do ano de dataProjetada [ou data_admissao, se for depois], dataProjetada))`; `decimoTerceiroProporcional = arred2((salario_bruto / 12) × meses13)`.
  7. `feriasProporcionais`:
     - se `justa_causa`: `0` (perde o direito às proporcionais, mas não às vencidas).
     - senão: identificar o início do período aquisitivo em curso (a `data_admissao` somada ao maior múltiplo de 12 meses que não passe de `dataProjetada`); `mesesFerias = min(12, mesesComAvos(inícioPeríodo, dataProjetada))`; `feriasProporcionais = arred2((salario_bruto / 12) × mesesFerias × 4/3)` (já incluindo o terço).
  8. `feriasVencidas = arred2((salario_bruto / 30) × dias_ferias_vencidas × 4/3)` — sempre devida quando houver dias informados, mesmo em justa causa (é direito já adquirido).
  9. `saldoSalario = arred2((salario_bruto / 30) × dia-do-mês de data_desligamento)` (dias efetivamente trabalhados no mês da saída; usa a data real de desligamento, não a projetada, pois o período de aviso indenizado não é trabalhado).
  10. `multaFgts`:
      - `sem_justa_causa`: `arred2(saldo_fgts_depositado × 0,40)`.
      - `acordo_mutuo`: `arred2(saldo_fgts_depositado × 0,20)` (art. 484‑A, II, CLT).
      - demais: `0`.
  11. `totalEstimado = arred2(saldoSalario + valorAviso + decimoTerceiroProporcional + feriasProporcionais + feriasVencidas + multaFgts)`.
  - Erros: `data_desligamento_anterior_admissao` (quando `data_desligamento < data_admissao`); `salario_invalido` (`salario_bruto ≤ 0`).
- **Saídas:** `totalEstimado` (`moeda`, destaque), `saldoSalario`, `valorAviso`, `decimoTerceiroProporcional`, `feriasProporcionais`, `feriasVencidas`, `multaFgts` (todos `moeda`). "A conta" lista `anosCompletos`, `diasAviso`, `dataProjetada`, `meses13`, `mesesFerias`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** formulário em grupos colapsáveis (`dados básicos`, `tipo de desligamento`, `FGTS e férias`), resultado com o total em destaque e as 5 parcelas listadas abaixo, cada uma podendo ser expandida para ver a conta.
- **Viabilidade:** 100% local; a única complexidade é a aritmética de datas, que é determinística e testável em Node sem biblioteca — nenhuma biblioteca nova.
- **Sobreposição:** reaproveita a mesma lógica de "1/3 constitucional" de `ferias` e a mesma tabela conceitual de aviso prévio que poderia (mas não precisa) ser usada por `escala-de-trabalho`; não há duplicação de tela.
- **Casos de teste** (datas tratadas como `new Date(ano, mes-1, dia)`, sem fuso):
  1. **Sucesso — sem justa causa:** `salario_bruto=3000,00`; `data_admissao=2023-03-10`; `data_desligamento=2026-09-24`; `tipo_desligamento=sem_justa_causa`; `saldo_fgts_depositado=12000,00`; `dias_ferias_vencidas=0`.
     - `anosCompletos=3` → `diasAviso = min(90, 30+9) = 39` → `valorAviso = 100,00 × 39 = 3900,00`.
     - `dataProjetada = 24/09/2026 + 39 dias = 02/11/2026`.
     - `meses13`: de 01/01/2026 até 02/11/2026 = **10** avos → `decimoTerceiroProporcional = (3000/12) × 10 = 2500,00`.
     - início do período aquisitivo de férias em curso = 10/03/2026; até 02/11/2026 = **8** avos → `feriasProporcionais = (3000/12) × 8 × 4/3 = 2666,67`.
     - `feriasVencidas = 0,00`.
     - `saldoSalario = (3000/30) × 24 = 2400,00`.
     - `multaFgts = 12000,00 × 0,40 = 4800,00`.
     - **`totalEstimado = 2400,00 + 3900,00 + 2500,00 + 2666,67 + 0,00 + 4800,00 = 16266,67`**.
  2. **Sucesso — justa causa (mesmas datas e salário, sem FGTS informado):** `tipo_desligamento=justa_causa`, `saldo_fgts_depositado=0`, `dias_ferias_vencidas=0` → `diasAviso=0`, `valorAviso=0`, `decimoTerceiroProporcional=0`, `feriasProporcionais=0`, `feriasVencidas=0`, `multaFgts=0`, `saldoSalario=2400,00` → **`totalEstimado=2400,00`**.
  3. **Erro:** `data_admissao=2026-09-24`, `data_desligamento=2023-03-10` → `{ ok: false, erro: 'data_desligamento_anterior_admissao', campo: 'data_desligamento' }`.

## 3. `salario-liquido-estimado` — Salário líquido estimado

- **Motor:** `calculadora`.
- **Problema resolvido:** quem recebe uma proposta de salário bruto, ou quer confirmar o holerite, quer saber quanto sobra líquido.
- **Entradas** (grupo `dados`):
  - `salario_bruto` — `moeda`, obrigatório, min `0.01`.
  - `dependentes` — `inteiro`, opcional, min `0`, max `20`, padrão `0` (dependentes legais para fins de IRRF).
  - `outros_descontos` — `moeda`, opcional, min `0`, padrão `0` (descontos que não passam pela base do IRRF nem do INSS — vale‑transporte, adiantamentos, mensalidade de convênio já líquida etc.; a ajuda do campo deve dizer isso, para não sugerir que reduz o imposto).
  - `usar_desconto_simplificado` — `marcador`, opcional, padrão `false` (troca a dedução de INSS + dependentes, só para o cálculo do IRRF, por um valor único de R$ 607,20 — vale quando é mais vantajoso ao trabalhador; a ferramenta não decide automaticamente qual é melhor, o campo é uma escolha explícita, igual à escolha que existe na folha de pagamento real).
- **Processamento:**
  1. **INSS** (Portaria Interministerial MPS/MF nº 13/2026, Anexo II): `S = min(salario_bruto, 8475.55)`.
     | Faixa de `S` | Alíquota | Parcela a deduzir |
     |---|---|---|
     | até 1.621,00 | 7,5% | 0,00 |
     | 1.621,01 até 2.902,84 | 9% | 24,32 |
     | 2.902,85 até 4.354,27 | 12% | 111,40 |
     | 4.354,28 até 8.475,55 | 14% | 198,49 |
     (As parcelas a deduzir de 24,32 / 111,40 / 198,49 são calculadas por continuidade a partir das faixas oficiais da Portaria — o Anexo II só publica alíquota por faixa, não a parcela; o valor foi conferido batendo com o desconto mínimo oficial de R$ 121,58 no salário mínimo e o teto oficial de R$ 988,09 no limite de R$ 8.475,55.)
     `inss = arred2(S × aliquota − deducao)`.
  2. **Base do IRRF:**
     - `baseCompleta = salario_bruto − inss − (dependentes × 189,59)`.
     - `baseSimplificada = salario_bruto − 607,20`.
     - `base = usar_desconto_simplificado ? baseSimplificada : baseCompleta` (mínimo `0`).
  3. **IRRF antes da redução** (Lei 15.191/2025, tabela vigente a partir de jan/2026):
     | Faixa de `base` | Alíquota | Parcela a deduzir |
     |---|---|---|
     | até 2.428,80 | isento | — |
     | 2.428,81 até 2.826,65 | 7,5% | 182,16 |
     | 2.826,66 até 3.751,05 | 15% | 394,16 |
     | 3.751,06 até 4.664,68 | 22,5% | 675,49 |
     | acima de 4.664,68 | 27,5% | 908,73 |
     `irrfBruto = base ≤ 2428,80 ? 0 : arred2(base × aliquota − deducao)`.
  4. **Redução do art. 3º‑A da Lei 9.250/1995** (incluído pela Lei 15.270/2025, vigente desde jan/2026 — aplicada mensalmente na retenção na fonte, inclusive no 13º):
     - `base ≤ 5000,00`: `reducao = min(irrfBruto, 312,89)`.
     - `5000,00 < base ≤ 7350,00`: `reducao = max(0, min(irrfBruto, 978,62 − 0,133145 × base))`.
     - `base > 7350,00`: `reducao = 0`.
     - **Nota de interpretação:** a lei fala em "rendimentos tributáveis sujeitos à incidência mensal"; o §1º do art. 3º‑A limita a redução ao "imposto determinado conforme a tabela progressiva mensal e o art. 4º" (o mesmo artigo que autoriza as deduções de INSS, dependentes e pensão alimentícia) — por isso esta especificação usa a mesma `base` já deduzida, e não o salário bruto. Se o agente de implementação encontrar uma Instrução Normativa da Receita Federal que contradiga essa leitura, a fórmula deve ser ajustada e a mudança registrada aqui.
     `irrf = arred2(max(0, irrfBruto − reducao))`.
  5. `salarioLiquido = arred2(salario_bruto − inss − irrf − outros_descontos)`.
  - Erros: `salario_invalido` (`salario_bruto ≤ 0`); `dependentes_invalido` (`dependentes < 0`).
- **Saídas:** `salarioLiquido` (`moeda`, destaque), `inss`, `irrf`, `base` (todos `moeda`, exceto talvez exibir `base` como auxiliar). "A conta" mostra `S`, faixa de INSS aplicada, `base`, faixa de IRRF aplicada, `irrfBruto`, `reducao`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** campos empilhados; resultado com `salarioLiquido` em destaque e `inss`/`irrf` como dois valores secundários lado a lado (ou em lista, se não couber).
- **Viabilidade:** 100% local, tabelas fixas no código-fonte (comentário com a fonte e a data de consulta, conforme §15.4 dos contratos); nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com outra ferramenta desta onda.
- **Casos de teste:**
  1. **Sucesso:** `salario_bruto=3500,00`, `dependentes=1`, `outros_descontos=0`, `usar_desconto_simplificado=false` → `inss=308,60`; `base = 3500 − 308,60 − 189,59 = 3001,81` (arredondado a partir de `3001,81`); `irrfBruto = 3001,81×0,15−394,16=56,11`; como `base ≤ 5000`, `reducao = min(56,11; 312,89) = 56,11`; `irrf=0,00`; **`salarioLiquido=3191,40`**.
  2. **Sucesso:** `salario_bruto=6000,00`, `dependentes=0`, `outros_descontos=0`, `usar_desconto_simplificado=false` → `inss=641,51`; `base=5358,49`; `irrfBruto=5358,49×0,225−675,49=564,85`; como `5000 < base ≤ 7350`, `reducao = 978,62 − 0,133145×5358,49 = 265,16`; `irrf=299,69`; **`salarioLiquido=5058,80`**.
  3. **Erro:** `salario_bruto=0` → `{ ok: false, erro: 'salario_invalido', campo: 'salario_bruto' }`.

## 4. `escala-de-trabalho` — Escala de trabalho

- **Motor:** `tabela` — linhas por funcionário, colunas calculadas por dia.
- **Problema resolvido:** quem monta a escala da semana/mês quer ver rápido quem trabalha e quem folga em cada dia, sem montar isso numa planilha do zero.
- **Limitação documentada:** modelo simplificado por **dia** (trabalha/folga); não separa turno diurno/noturno dentro do mesmo dia, não considera feriados nem trocas manuais de escala — cobre o caso comum de "qual é o padrão desse funcionário nessa semana".
- **Entradas:**
  - Parâmetros globais: `data_inicio` (`data`, obrigatório); `dias_visualizados` (`inteiro`, opcional, min `7`, max `60`, padrão `30`).
  - Linhas (uma por funcionário): `nome` (`texto`, obrigatório); `padrao` (`opcao`, obrigatório, valores `12x36 | 6x1 | 5x2`); `inicio_ciclo` (`data`, obrigatório — um dia em que o funcionário efetivamente trabalha, usado como referência do ciclo).
- **Processamento:** para cada linha e cada dia `d` no intervalo `[data_inicio, data_inicio + dias_visualizados − 1]`:
  - `diff = diferença em dias entre d e inicio_ciclo` (pode ser negativo se `d < inicio_ciclo`; usar `((diff % ciclo) + ciclo) % ciclo` para normalizar).
  - `12x36`: ciclo de 2 dias; trabalha quando `diff mod 2 == 0`.
  - `6x1`: ciclo de 7 dias; trabalha quando `diff mod 7 < 6`, folga quando `= 6`.
  - `5x2`: ciclo de 7 dias; trabalha quando `diff mod 7 < 5`, folga quando `≥ 5`.
  - Cada célula recebe `"trabalha"` ou `"folga"`.
  - Erros: `nome_vazio`; `dias_invalidos` (`dias_visualizados` fora de 7–60).
- **Saídas:** tabela com uma linha por funcionário e uma coluna por dia (cabeçalho com a data), célula = "Trabalha"/"Folga"; coluna de resumo com o total de dias trabalhados no período.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** a tabela rola horizontalmente dentro de um contêiner com sombra nas bordas (padrão de tabela responsiva já usado no site), mantendo a coluna "nome" fixa à esquerda.
- **Viabilidade:** 100% local, aritmética de módulo simples; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso — 6x1:** `data_inicio=2026-09-01`, `dias_visualizados=7`; funcionário `Ana`, `padrao=6x1`, `inicio_ciclo=2026-09-01` → dias 01 a 06/09 = "Trabalha" (`diff` de 0 a 5), dia 07/09 = "Folga" (`diff=6`). Total trabalhado na semana: 6 dias.
  2. **Sucesso — 12x36:** mesmo intervalo; funcionário `Bruno`, `padrao=12x36`, `inicio_ciclo=2026-09-01` → 01/09 Trabalha (`diff=0`), 02/09 Folga (`diff=1`), 03/09 Trabalha (`diff=2`), alternando até 07/09 Trabalha (`diff=6`). Total: 4 dias trabalhados em 7.
  3. **Erro:** linha com `nome=""` → `{ ok: false, erro: 'nome_vazio', campo: 'nome' }`.

## 5. `avaliacao-de-desempenho` — Avaliação de desempenho

- **Motor:** `documento` — monta um formulário para imprimir/preencher, não calcula nota (o manifesto fala em "nota e comentário" como campos do formulário impresso, não em média calculada pela ferramenta).
- **Problema resolvido:** gestor sem RH formal quer um formulário pronto de avaliação por competência, em vez de criar um do zero.
- **Entradas:**
  - `nome_funcionario` — `texto`, obrigatório.
  - `cargo` — `texto`, opcional.
  - `periodo` — `texto`, opcional (ex.: "2026 — 3º trimestre").
  - `avaliador` — `texto`, opcional.
  - `competencias` — `area-texto`, obrigatório, uma competência por linha, mín. 1, máx. 30 linhas úteis.
  - `escala` — `opcao`, opcional, valores `1-5 | 1-10`, padrão `1-5`.
- **Processamento:** `linhas = competencias.split('\n').map(trim).filter(linha => linha !== '')`. Cada linha vira uma seção do formulário com espaço para nota (de 1 até o topo da `escala`) e comentário.
  - Erros: `nome_funcionario_obrigatorio`; `competencias_vazias` (nenhuma linha não vazia); `competencias_excesso` (mais de 30 linhas não vazias).
- **Saídas:** documento com cabeçalho (nome, cargo, período, avaliador) e uma seção por competência (nome + campo de nota + campo de comentário, em branco para preenchimento manual ou impressão).
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** pré‑visualização em coluna única, largura total, com botão de exportar fixo no rodapé (padrão de página de documento já definido no site).
- **Viabilidade:** 100% local, é montagem de texto/HTML, sem cálculo numérico; nenhuma biblioteca nova.
- **Sobreposição:** estrutura de "uma linha de texto por item, virando uma seção" é a mesma usada em `roteiro-de-entrevista` — considerar uma função compartilhada de parsing de lista (`compartilhado-ferramenta.js`) para as duas.
- **Casos de teste:**
  1. **Sucesso:** `competencias="Comunicação\nTrabalho em equipe\nPontualidade"` → 3 seções geradas, na ordem informada.
  2. **Sucesso:** `competencias="  Proatividade  \n\nQualidade técnica"` (linha vazia no meio, espaços nas pontas) → 2 seções (`"Proatividade"`, `"Qualidade técnica"`), linha vazia ignorada e espaços removidos.
  3. **Erro:** `competencias=""` → `{ ok: false, erro: 'competencias_vazias', campo: 'competencias' }`.

## 6. `descricao-de-vaga` — Descrição de vaga

- **Motor:** `documento`.
- **Problema resolvido:** quem precisa anunciar uma vaga quer um anúncio organizado (responsabilidades, requisitos, benefícios) sem começar do zero.
- **Entradas:**
  - `cargo` — `texto`, obrigatório.
  - `empresa` — `texto`, opcional.
  - `tipo_contratacao` — `opcao`, opcional, valores `clt | pj | estagio | temporario`, padrão `clt`.
  - `modelo_trabalho` — `opcao`, opcional, valores `presencial | remoto | hibrido`, padrão `presencial`.
  - `responsabilidades` — `area-texto`, obrigatório, uma por linha.
  - `requisitos` — `area-texto`, obrigatório, uma por linha.
  - `diferenciais` — `area-texto`, opcional, uma por linha.
  - `beneficios` — `area-texto`, opcional, uma por linha.
  - `faixa_salarial` — `texto`, opcional (texto livre, ex.: "A combinar" ou "R$ 3.000 a R$ 3.500").
- **Processamento:** cada campo de lista é dividido em linhas não vazias e vira uma lista com marcadores na seção correspondente; `tipo_contratacao` e `modelo_trabalho` aparecem como etiquetas no topo do anúncio.
  - Erros: `cargo_obrigatorio`; `responsabilidades_vazias`; `requisitos_vazios`.
- **Saídas:** documento com título (cargo + empresa), etiquetas de tipo/modelo, e seções de responsabilidades, requisitos, diferenciais, benefícios e faixa salarial (estas duas últimas omitidas se vazias).
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** mesma estrutura de coluna única das demais ferramentas de documento.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma direta; é uma "prima" temática de `roteiro-de-entrevista` (mesmo processo de contratação), mas conteúdo e uso são diferentes — não unificar.
- **Casos de teste:**
  1. **Sucesso:** `cargo="Analista de Marketing"`, `responsabilidades="Gerenciar redes sociais\nCriar campanhas"` (2 itens), `requisitos="Ensino superior\nExperiência com Instagram Ads"` (2 itens), demais opcionais vazios → documento com 2 seções obrigatórias preenchidas e sem as opcionais.
  2. **Sucesso:** mesmo exemplo, agora com `beneficios="Vale-refeição\nPlano de saúde"` e `faixa_salarial="R$ 3.000 a R$ 4.000"` → documento inclui também a seção de benefícios e a faixa salarial.
  3. **Erro:** `cargo=""` → `{ ok: false, erro: 'cargo_obrigatorio', campo: 'cargo' }`.

## 7. `roteiro-de-entrevista` — Roteiro de entrevista

- **Motor:** `documento`.
- **Problema resolvido:** quem vai entrevistar quer um roteiro organizado por competência, com espaço para anotar a resposta — sem a ferramenta inventar as perguntas em si (perguntas de entrevista variam muito por vaga e por empresa; sugerir um banco fixo seria "inventar verdade" sobre algo que não é factual).
- **Decisão de design:** a ferramenta **organiza a estrutura** (uma seção por competência, com espaço para as perguntas e para anotar a resposta), mas não gera o texto das perguntas — evita o risco de sugerir perguntas ruins ou juridicamente sensíveis como se fossem um padrão validado.
- **Entradas:**
  - `cargo` — `texto`, obrigatório.
  - `competencias` — `area-texto`, obrigatório, uma por linha.
  - `perguntas_por_competencia` — `inteiro`, opcional, min `1`, max `5`, padrão `3` (quantos espaços em branco para pergunta + resposta esperada gerar por competência).
- **Processamento:** `linhas = competencias.split('\n').map(trim).filter(l => l !== '')`; para cada linha, gera `perguntas_por_competencia` blocos vazios (campo "Pergunta" + campo "Resposta esperada / observação").
  - Erros: `cargo_obrigatorio`; `competencias_vazias`.
- **Saídas:** documento com o cargo no título e uma seção por competência, cada uma com N blocos de pergunta/observação em branco.
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** coluna única; cada seção de competência pode ser colapsada para facilitar rolagem quando há muitas competências.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** mesmo parser de lista de `avaliacao-de-desempenho` (ver nota naquele item).
- **Casos de teste:**
  1. **Sucesso:** `cargo="Vendedor"`, `competencias="Negociação\nResiliência"`, `perguntas_por_competencia=2` → 2 seções, 2 blocos em branco cada.
  2. **Sucesso:** mesmo `cargo`, `competencias="Comunicação"`, `perguntas_por_competencia` omitido (usa padrão 3) → 1 seção com 3 blocos.
  3. **Erro:** `competencias=""` → `{ ok: false, erro: 'competencias_vazias', campo: 'competencias' }`.

## 8. `plano-de-onboarding` — Plano de onboarding

- **Motor:** `tabela`.
- **Problema resolvido:** quem recebe um novo funcionário quer um cronograma dos primeiros dias sem montar isso manualmente a cada contratação.
- **Limitação documentada:** soma dias corridos a partir da data de início (não pula fim de semana nem feriado — regra de dia útil não foi definida em nenhum lugar do catálogo e seria inventada se a ferramenta decidisse isso por conta própria).
- **Entradas:**
  - Parâmetro global: `data_inicio` (`data`, obrigatório — primeiro dia de trabalho do novo funcionário).
  - Linhas: `dia` (`inteiro`, obrigatório, min `1`, max `90` — em que dia do onboarding a etapa acontece, contando o dia 1 como o próprio `data_inicio`); `etapa` (`texto`, obrigatório); `responsavel` (`texto`, opcional); `observacao` (`texto`, opcional).
- **Processamento:** coluna calculada `data_calculada = data_inicio + (dia − 1) dias`. As linhas são exibidas ordenadas por `dia` crescente, independentemente da ordem de digitação.
  - Erros: `dia_invalido` (fora de 1–90); `etapa_vazia`.
- **Saídas:** tabela com colunas `dia`, `data_calculada`, `etapa`, `responsavel`, `observacao`.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** tabela em lista de cartões (um por etapa), com o `dia` e a `data_calculada` em destaque no topo do cartão — padrão de tabela responsiva por cartão já usado quando há poucas colunas.
- **Viabilidade:** 100% local, soma de dias corridos; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste** (data base `2026-09-24`, quinta‑feira):
  1. **Sucesso:** linha `dia=1`, `etapa="Assinatura de contrato"`, `responsavel="RH"` → `data_calculada = 2026-09-24`.
  2. **Sucesso:** linha `dia=5`, `etapa="Treinamento no setor"`, `responsavel="Gestor direto"` → `data_calculada = 2026-09-28` (24/09 + 4 dias).
  3. **Erro:** linha com `dia=0` → `{ ok: false, erro: 'dia_invalido', campo: 'dia' }`.

## 9. `organograma` — Gerador de organograma

- **Motor:** `interativo` (**exceção justificada**, §15.1) — o resultado é uma árvore hierárquica desenhada (nós e linhas), que não é uma lista/matriz (`tabela`), nem um documento de texto formatado (`documento`); precisa de lógica própria de posicionamento em SVG.
- **Problema resolvido:** quem monta o organograma da equipe quer desenhar a hierarquia a partir de uma lista de cargos, sem usar uma ferramenta de diagramação pesada.
- **Entradas:** lista de pessoas, cada uma com `nome` (`texto`, obrigatório, único na lista), `cargo` (`texto`, opcional), `superior` (`texto`, opcional — deve ser igual ao `nome` de outra pessoa da lista, ou vazio para quem está no topo).
- **Processamento** (função pura testável, mesmo sendo motor interativo):
  1. Validar que não há dois registros com o mesmo `nome`.
  2. Validar que todo `superior` não vazio corresponde a um `nome` existente na lista.
  3. Construir a árvore (pode haver mais de uma raiz, ou seja, mais de uma pessoa sem `superior`).
  4. Detectar ciclo (A é superior — direto ou indireto — de quem é superior de A) percorrendo a árvore; se algum nó nunca é alcançado a partir das raízes, há ciclo.
  5. Calcular a profundidade (nível) de cada nó, usada pelo `organograma.js` para desenhar as linhas e caixas em SVG.
  - Erros: `nome_duplicado` (com o nome duplicado em `extras`); `superior_inexistente` (com o nome buscado em `extras`); `ciclo_hierarquico`.
- **Saídas:** estrutura de árvore (lista de nós com `nome`, `cargo`, `nivel`, `filhos`) usada para desenhar o organograma; não há "resultado numérico" de destaque.
- **Exportação e Plus:** `svg`, `pdf`, `imprimir` — grátis.
- **Celular (390px):** o desenho rola horizontal e vertical dentro de um contêiner com zoom por pinça (ou botões +/−); a lista de pessoas (entrada) fica numa aba separada da visualização da árvore, já que as duas não cabem lado a lado em 390px.
- **Viabilidade:** 100% local, SVG gerado em JavaScript puro; nenhuma biblioteca nova (sem necessidade de uma lib de grafos — a árvore aqui é simples e a posição pode ser calculada com um algoritmo de layout em camadas escrito à mão).
- **Sobreposição:** nenhuma com as demais ferramentas desta onda.
- **Casos de teste:**
  1. **Sucesso:** `[{nome:"Ana",cargo:"Diretora",superior:""}, {nome:"Bruno",cargo:"Gerente",superior:"Ana"}, {nome:"Carla",cargo:"Analista",superior:"Bruno"}]` → árvore de 3 níveis, uma raiz (`Ana`), sem erro.
  2. **Sucesso:** `[{nome:"Ana",superior:""}, {nome:"Bruno",superior:"Ana"}, {nome:"Carla",superior:"Ana"}]` → árvore de 2 níveis, `Ana` com dois filhos (`Bruno`, `Carla`).
  3. **Erro:** `[{nome:"Ana",superior:""}, {nome:"Bruno",superior:"Zeca"}]` (`Zeca` não existe na lista) → `{ ok: false, erro: 'superior_inexistente', campo: 'superior', extras: { procurado: 'Zeca' } }`.
