# Catálogo de especificação — produtividade

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| cronometro | interativo | sim | nenhuma | tempo real (start/pause/lap) não cabe em motor de formulário |
| sorteio | interativo | sim | nenhuma | precisa de animação e de estado incremental ("sortear de novo") |
| lista-de-tarefas | tabela | sim | nenhuma | — |
| quadro-kanban | interativo | sim | nenhuma | arrastar e soltar entre colunas |
| matriz-eisenhower | tabela | sim | nenhuma | classificação é coluna calculada a partir de 2 marcadores |
| matriz-5w2h | documento | sim | nenhuma | — |
| plano-de-acao | tabela | sim | nenhuma | — |
| ata-de-reuniao | documento | sim | nenhuma | — |
| pauta-de-reuniao | tabela | sim | nenhuma | — |
| cronograma-de-projeto | tabela | sim | nenhuma | dias corridos, sem dependência entre etapas |
| matriz-de-risco | tabela | sim | nenhuma | escala 1–3 documentada, sem inventar norma de mercado |
| matriz-raci | interativo | sim | nenhuma | colunas dinâmicas por pessoa não cabem no motor tabela padrão |

## 1. `cronometro` — Cronômetro e temporizador

- **Motor:** `interativo` (**exceção justificada**) — precisa de relógio em tempo real (`setInterval`/`requestAnimationFrame`), pausa/retomada e alarme sonoro no fim do temporizador; não é um formulário que vira resultado uma vez só.
- **Problema resolvido:** quem precisa cronometrar uma tarefa, fazer uma contagem regressiva ou seguir ciclos de foco (pomodoro) quer isso em uma tela só, sem instalar um app.
- **Entradas:** três sub-modos na mesma tela — **cronômetro** (sem entrada, só start/pausa/zerar/volta); **temporizador** (`duracao_segundos`, `inteiro`, obrigatório, min `1`, max `86400`); **ciclos de foco** (`duracao_foco_minutos`, `inteiro`, obrigatório, min `1`, padrão `25`; `duracao_pausa_minutos`, `inteiro`, obrigatório, min `1`, padrão `5`; `numero_ciclos`, `inteiro`, obrigatório, min `1`, max `12`, padrão `4`).
- **Processamento** (funções puras testáveis, por trás da interface ao vivo):
  - `formatarDuracao(ms)` → string `HH:MM:SS` (ou `MM:SS` se `< 1h`).
  - `calcularVoltas(marcacoesEmSegundos)` → lista de diferenças entre marcações consecutivas (a primeira volta é a própria primeira marcação).
  - `gerarCiclosPomodoro(focoMin, pausaMin, numCiclos)` → lista de blocos `{ tipo: 'foco'|'pausa', duracaoMinutos }`, alternando foco/pausa, **sem pausa depois do último ciclo de foco**.
  - Erros: `duracao_invalida` (`duracao_segundos ≤ 0`); `ciclos_invalido` (`numero_ciclos ≤ 0`).
- **Saídas:** tempo formatado em destaque; lista de voltas (cronômetro); lista de blocos com duração total do plano (ciclos de foco).
- **Exportação e Plus:** `copiar` (lista de voltas em texto) — grátis; sem Plus.
- **Celular (390px):** números grandes centralizados, botões de ação grandes o bastante para toque (mínimo 44×44px), tela pode ficar acesa enquanto o cronômetro corre (se o navegador permitir via Wake Lock — degrada normalmente se não permitir).
- **Viabilidade:** 100% local (JS + `setInterval`/`Date`), alarme sonoro via `<audio>`/Web Audio nativo; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com outra ferramenta desta onda.
- **Casos de teste:**
  1. **Sucesso:** `gerarCiclosPomodoro(25, 5, 4)` → `[F25, P5, F25, P5, F25, P5, F25]` (4 blocos de foco, 3 de pausa entre eles); duração total = `25×4 + 5×3 = 115` minutos.
  2. **Sucesso:** `calcularVoltas([12.3, 25.7, 40.1])` → `[12.3, 13.4, 14.4]` (diferenças sucessivas).
  3. **Erro:** `duracao_foco_minutos=0` → `{ ok: false, erro: 'duracao_invalida', campo: 'duracao_foco_minutos' }`.

## 2. `sorteio` — Sorteio

- **Motor:** `interativo` (**exceção justificada**) — precisa de animação de sorteio e de estado incremental ("sortear de novo sem repetir quem já saiu"), que o motor `tabela` não cobre nativamente.
- **Problema resolvido:** quem precisa sortear nomes, números ou dividir um grupo em times quer fazer isso ao vivo, na frente das pessoas, sem d ados nem papelzinho.
- **Entradas:** `lista` (`area-texto`, obrigatório, um nome/item por linha, para sorteio de nomes ou divisão em times) **ou** `valor_minimo`/`valor_maximo` (`inteiro`, para sorteio de número); `quantidade_a_sortear` (`inteiro`, opcional, min `1`, padrão `1`); `permitir_repeticao` (`marcador`, opcional, padrão `false`); `numero_de_times` (`inteiro`, opcional, min `2`, usado apenas no modo "dividir em times").
- **Processamento** (funções puras):
  - `embaralhar(lista)` — Fisher‑Yates.
  - `sortearNomes(lista, quantidade, permitirRepeticao)` — sem repetição, sorteia `quantidade` itens distintos de `lista` (erro se `quantidade > lista.length`); com repetição, sorteia livremente.
  - `dividirEmTimes(lista, numTimes)` — embaralha e distribui em `numTimes` grupos o mais equilibrado possível (diferença de tamanho entre o maior e o menor time ≤ 1).
  - `sortearNumero(min, max)` — inteiro uniforme entre os limites, inclusive.
  - Erros: `lista_vazia`; `quantidade_maior_que_lista` (sorteio sem repetição pedindo mais itens do que a lista tem); `numero_de_times_invalido` (`< 2` ou `> lista.length`).
- **Saídas:** item(ns) sorteado(s) em destaque, com animação; no modo times, a lista de grupos.
- **Exportação e Plus:** `copiar` — grátis.
- **Celular (390px):** botão de sortear grande e centralizado; resultado em destaque ocupando a largura toda.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `dividirEmTimes(['A','B','C','D','E'], 2)` → 2 times com tamanhos `3` e `2` (soma `5`, diferença `1`).
  2. **Sucesso:** `sortearNomes(['A','B','C','D'], 2, false)` → 2 nomes distintos, ambos presentes na lista original.
  3. **Erro:** `sortearNomes(['A','B'], 5, false)` → `{ ok: false, erro: 'quantidade_maior_que_lista', campo: 'quantidade_a_sortear' }`.

## 3. `lista-de-tarefas` — Lista de tarefas

- **Motor:** `tabela`.
- **Problema resolvido:** organizar as tarefas do dia por prioridade e prazo, com uma caixinha de concluído, sem abrir um app de gestão de projeto para uma lista simples.
- **Entradas:** linhas: `tarefa` (`texto`, obrigatório); `prioridade` (`opcao`, obrigatório, valores `alta | media | baixa`, padrão `media`); `prazo` (`data`, opcional); `concluida` (`marcador`, opcional, padrão `false`).
- **Processamento:** `totalTarefas = count(linhas)`; `totalConcluidas = count(concluida === true)`; `percentualConcluido = totalTarefas > 0 ? arred0(totalConcluidas / totalTarefas × 100) : 0`; `tarefasAtrasadas = count(prazo informado && prazo < hoje && concluida === false)`.
  - Erros: `tarefa_vazia`.
- **Saídas:** tabela com as linhas (ordenável por prioridade/prazo na interface); resumo com `percentualConcluido` (destaque) e `tarefasAtrasadas`.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista de cartões com a caixinha de concluído grande à esquerda (fácil de tocar), prioridade como uma cor lateral no cartão.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** `plano-de-acao` é conceitualmente parecida (linhas de tarefa com prazo), mas tem `responsavel` obrigatório e é pensada para ações combinadas em reunião, não para a lista pessoal do dia — mantidas separadas por público.
- **Casos de teste** (hoje = `2026-09-24`):
  1. **Sucesso:** 4 tarefas, 2 com `concluida=true`, nenhuma atrasada → `percentualConcluido=50`; `tarefasAtrasadas=0`.
  2. **Sucesso:** 3 tarefas, 0 concluídas, 1 com `prazo=2026-09-20` (atrasada) e `concluida=false` → `percentualConcluido=0`; `tarefasAtrasadas=1`.
  3. **Erro:** linha com `tarefa=""` → `{ ok: false, erro: 'tarefa_vazia', campo: 'tarefa' }`.

## 4. `quadro-kanban` — Quadro Kanban

- **Motor:** `interativo` (**exceção justificada**) — arrastar e soltar cartões entre colunas ("a fazer", "fazendo", "feito") não é uma lista de linhas com colunas calculadas; usa o mesmo padrão de reordenação acessível já definido em `docs/contratos.md` (arrastar com mouse **e** mover por botões/teclado, para acessibilidade).
- **Problema resolvido:** acompanhar visualmente o andamento das tarefas de uma equipe pequena sem abrir uma ferramenta de gestão externa.
- **Entradas:** cartões, cada um com `titulo` (`texto`, obrigatório), `coluna` (`opcao`, obrigatório, valores `a_fazer | fazendo | feito`, padrão `a_fazer`), `responsavel` (`texto`, opcional).
- **Processamento** (funções puras):
  - `contarPorColuna(cartoes)` → `{ a_fazer: n, fazendo: n, feito: n }`.
  - `moverCartao(cartoes, id, novaColuna)` → nova lista de cartões com o `id` informado movido para `novaColuna`; erro se o `id` não existir.
  - Erros: `titulo_vazio`; `cartao_nao_encontrado` (ao mover um `id` inexistente).
- **Saídas:** quadro com 3 colunas e os cartões dentro; contadores no cabeçalho de cada coluna.
- **Exportação e Plus:** `csv` (lista plana com a coluna de cada cartão), `pdf` — grátis.
- **Celular (390px):** colunas em abas horizontais deslizantes (uma coluna visível por vez) em vez de 3 colunas lado a lado, que não cabem em 390px; mover um cartão de coluna usa um menu de "mover para" além do arrastar, para funcionar bem no toque.
- **Viabilidade:** 100% local, com a API nativa de drag and drop do HTML5 e fallback por botão/menu; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** 5 cartões (2 `a_fazer`, 2 `fazendo`, 1 `feito`) → `contarPorColuna` retorna `{ a_fazer: 2, fazendo: 2, feito: 1 }`.
  2. **Sucesso:** a partir do caso 1, `moverCartao(cartoes, <id do 1º cartão de "fazendo">, 'feito')` → nova contagem `{ a_fazer: 2, fazendo: 1, feito: 2 }`.
  3. **Erro:** `moverCartao(cartoes, 'id-inexistente', 'feito')` → `{ ok: false, erro: 'cartao_nao_encontrado', campo: 'id' }`.

## 5. `matriz-eisenhower` — Matriz de Eisenhower

- **Motor:** `tabela` — cada tarefa tem 2 marcadores e o quadrante é uma coluna calculada; cabe integralmente no motor padrão.
- **Problema resolvido:** decidir o que fazer primeiro separando o que é urgente do que é importante, sem desenhar a matriz à mão.
- **Entradas:** linhas: `tarefa` (`texto`, obrigatório); `urgente` (`marcador`, opcional, padrão `false`); `importante` (`marcador`, opcional, padrão `false`).
- **Processamento:** coluna calculada `quadrante`: `urgente && importante → 'fazer_agora'`; `urgente && !importante → 'delegar'`; `!urgente && importante → 'planejar'`; `!urgente && !importante → 'eliminar'`. Resumo: contagem de tarefas por quadrante.
  - Erros: `tarefa_vazia`.
- **Saídas:** tabela com `tarefa`, `urgente`, `importante`, `quadrante`; opcionalmente agrupada visualmente nos 4 quadrantes (grade 2×2) em vez de lista simples.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** 4 blocos empilhados (um por quadrante) em vez da grade 2×2, cada um com suas tarefas.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `A(urgente=true,importante=true)` → `fazer_agora`; `B(urgente=false,importante=true)` → `planejar`; `C(urgente=true,importante=false)` → `delegar`; `D(urgente=false,importante=false)` → `eliminar`.
  2. **Sucesso:** 6 tarefas quaisquer → resumo com a contagem de cada um dos 4 quadrantes somando 6.
  3. **Erro:** linha com `tarefa=""` → `{ ok: false, erro: 'tarefa_vazia', campo: 'tarefa' }`.

## 6. `matriz-5w2h` — Plano de ação 5W2H

- **Motor:** `documento`.
- **Problema resolvido:** estruturar uma ação (o quê, por quê, quem, quando, onde, como, quanto custa) num formato padrão, pronto para compartilhar ou imprimir.
- **Entradas:** `o_que` (`texto`, obrigatório); `por_que` (`area-texto`, obrigatório); `quem` (`texto`, obrigatório); `quando` (`data`, opcional); `onde` (`texto`, opcional); `como` (`area-texto`, obrigatório); `quanto_custa` (`moeda`, opcional).
- **Processamento:** monta o documento com uma seção por pergunta, na ordem 5W2H; seções opcionais não preenchidas (`quando`, `onde`, `quanto_custa`) aparecem como "Não informado" ou são omitidas (decisão de exibição, não de cálculo).
  - Erros: `o_que_obrigatorio`; `por_que_obrigatorio`; `quem_obrigatorio`; `como_obrigatorio`.
- **Saídas:** documento com as 7 seções.
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** formulário em coluna única, pré‑visualização abaixo do formulário (ou numa aba, seguindo o padrão já definido para o motor documento).
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `plano-de-acao` (que é uma lista de várias ações com responsável e prazo, não a estrutura 5W2H de uma única ação).
- **Casos de teste:**
  1. **Sucesso:** todos os campos preenchidos, incluindo `quanto_custa=1500,00` → documento com as 7 seções completas.
  2. **Sucesso:** mesmo exemplo sem `quando`, `onde` e `quanto_custa` (todos opcionais) → documento com as 4 seções obrigatórias e as 3 opcionais marcadas como "Não informado".
  3. **Erro:** `o_que=""` → `{ ok: false, erro: 'o_que_obrigatorio', campo: 'o_que' }`.

## 7. `plano-de-acao` — Plano de ação com responsáveis

- **Motor:** `tabela`.
- **Problema resolvido:** depois de uma reunião, listar quem faz o quê até quando, e acompanhar o que está atrasado.
- **Entradas:** linhas: `acao` (`texto`, obrigatório); `responsavel` (`texto`, obrigatório); `prazo` (`data`, obrigatório); `status` (`opcao`, obrigatório, valores `nao_iniciado | em_andamento | concluido`, padrão `nao_iniciado`).
- **Processamento:** coluna calculada `diasRestantes = prazo − hoje` (em dias, pode ser negativo); `atrasada = status !== 'concluido' && diasRestantes < 0` (sinalizador visual, não sobrescreve o campo `status` que o usuário escolheu). Resumo: `totalConcluidas = count(status === 'concluido')`; `totalAtrasadas = count(atrasada === true)`.
  - Erros: `acao_vazia`; `responsavel_vazio`.
- **Saídas:** tabela com `acao`, `responsavel`, `prazo`, `status`, `diasRestantes`, sinalizador `atrasada`; resumo com `totalConcluidas` e `totalAtrasadas` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** cartão por ação, com o prazo e o sinalizador de atraso em destaque no topo do cartão.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** ver nota em `lista-de-tarefas`.
- **Casos de teste** (hoje = `2026-09-24`):
  1. **Sucesso:** 3 ações, 1 concluída, 1 com `prazo=2026-09-19` (5 dias atrás) e `status=em_andamento` → `totalConcluidas=1`; **`totalAtrasadas=1`**.
  2. **Sucesso:** 3 ações, todas com `prazo` futuro → `totalAtrasadas=0`.
  3. **Erro:** linha com `responsavel=""` → `{ ok: false, erro: 'responsavel_vazio', campo: 'responsavel' }`.

## 8. `ata-de-reuniao` — Ata de reunião

- **Motor:** `documento`.
- **Problema resolvido:** registrar pauta, presentes, decisões e ações de uma reunião num formato padrão, sem montar isso do zero toda vez.
- **Entradas:** `titulo_reuniao` (`texto`, obrigatório); `data_reuniao` (`data`, obrigatório); `presentes` (`area-texto`, obrigatório, um nome por linha); `pauta` (`area-texto`, opcional, um assunto por linha); `decisoes` (`area-texto`, obrigatório, uma por linha); `acoes` (`area-texto`, obrigatório, uma por linha, no formato `"ação - responsável - prazo"`, separado por `" - "`).
- **Processamento:** `presentes`, `pauta` e `decisoes` são divididos por linha (removendo vazias); `acoes` é dividido por linha e cada linha é separada em 3 partes por `" - "` (`acao`, `responsavel`, `prazo`); linha de ação que não tiver as 3 partes gera erro apontando a linha.
  - Erros: `titulo_obrigatorio`; `presentes_vazios`; `decisoes_vazias`; `acao_mal_formatada` (com o número da linha em `extras`).
- **Saídas:** documento com cabeçalho (título, data), lista de presentes, pauta (se houver), decisões numeradas, e tabela de ações (ação/responsável/prazo).
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** coluna única.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `pauta-de-reuniao` (usada **antes** da reunião, para organizar o tempo; esta é usada **depois**, para registrar o que foi decidido) — ferramentas complementares, não duplicadas.
- **Casos de teste:**
  1. **Sucesso:** `presentes="Ana\nBruno\nCarla"` (3), `decisoes="Aprovar orçamento\nContratar fornecedor"` (2), `acoes="Enviar proposta - Ana - 2026-10-01"` (1 ação, 3 partes) → documento com 3 presentes, 2 decisões, 1 ação parseada corretamente.
  2. **Sucesso:** mesmo exemplo sem `pauta` (campo opcional) → documento sem a seção de pauta.
  3. **Erro:** `acoes="Enviar proposta Ana 2026-10-01"` (sem os separadores `" - "`) → `{ ok: false, erro: 'acao_mal_formatada', campo: 'acoes', extras: { linha: 1 } }`.

## 9. `pauta-de-reuniao` — Pauta de reunião

- **Motor:** `tabela`.
- **Problema resolvido:** organizar os assuntos de uma reunião com o tempo estimado de cada um, para a reunião não estourar o horário.
- **Entradas:** parâmetro global opcional `horario_inicio` (`hora`, opcional). Linhas: `assunto` (`texto`, obrigatório); `responsavel` (`texto`, opcional); `tempo_estimado_minutos` (`inteiro`, obrigatório, min `1`).
- **Processamento:** `tempoTotalMinutos = soma(tempo_estimado_minutos)`. Se `horario_inicio` informado: percorrendo as linhas na ordem em que aparecem, `inicioItem = cursor` (começando em `horario_inicio`), `fimItem = inicioItem + tempo_estimado_minutos`, `cursor = fimItem` para o próximo item.
  - Erros: `assunto_vazio`; `tempo_invalido` (`tempo_estimado_minutos ≤ 0`).
- **Saídas:** tabela com `assunto`, `responsavel`, `tempo_estimado_minutos`, e (se `horario_inicio` informado) `inicioItem`/`fimItem`; resumo com `tempoTotalMinutos` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista vertical simples.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** ver nota em `ata-de-reuniao`.
- **Casos de teste:**
  1. **Sucesso:** `horario_inicio=09:00`; 4 assuntos com `10, 15, 20, 5` minutos → item1 `09:00–09:10`; item2 `09:10–09:25`; item3 `09:25–09:45`; item4 `09:45–09:50`; **`tempoTotalMinutos=50`**.
  2. **Sucesso:** mesmas 4 linhas, sem `horario_inicio` (opcional) → apenas **`tempoTotalMinutos=50`**, sem horários calculados por item.
  3. **Erro:** linha com `tempo_estimado_minutos=0` → `{ ok: false, erro: 'tempo_invalido', campo: 'tempo_estimado_minutos' }`.

## 10. `cronograma-de-projeto` — Cronograma de projeto

- **Motor:** `tabela`.
- **Problema resolvido:** organizar as etapas de um projeto numa linha do tempo com datas e responsáveis, sem abrir uma ferramenta de gestão de projetos completa.
- **Limitação documentada:** dias corridos a partir da data de início de cada etapa; não modela dependência entre etapas (a etapa 2 não empurra automaticamente se a etapa 1 atrasar) — isso exigiria um motor de projeto completo, fora do escopo desta ferramenta simples.
- **Entradas:** linhas: `etapa` (`texto`, obrigatório); `responsavel` (`texto`, opcional); `data_inicio` (`data`, obrigatório); `duracao_dias` (`inteiro`, obrigatório, min `1`).
- **Processamento:** `dataFim = data_inicio + (duracao_dias − 1) dias`. Resumo: `dataInicioProjeto = min(data_inicio de todas as linhas)`; `dataFimProjeto = max(dataFim de todas as linhas)`; `duracaoTotalProjetoDias = dataFimProjeto − dataInicioProjeto + 1`.
  - Erros: `etapa_vazia`; `duracao_invalida` (`duracao_dias ≤ 0`).
- **Saídas:** tabela com `etapa`, `responsavel`, `data_inicio`, `dataFim`; resumo com `dataInicioProjeto`, `dataFimProjeto`, `duracaoTotalProjetoDias` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista vertical tipo linha do tempo (cada etapa como um bloco com início/fim).
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `plano-de-onboarding` (categoria trabalho) — mesma ideia de "dia + duração → data calculada", mas contextos diferentes (onboarding de 1 pessoa vs. projeto com várias etapas paralelas); a lógica de soma de dias corridos poderia ser uma função compartilhada.
- **Casos de teste:**
  1. **Sucesso:** etapa 1 `data_inicio=2026-10-01`, `duracao_dias=10` → `dataFim=2026-10-10`; etapa 2 `data_inicio=2026-10-11`, `duracao_dias=5` → `dataFim=2026-10-15`. Resumo: `dataInicioProjeto=2026-10-01`; `dataFimProjeto=2026-10-15`; **`duracaoTotalProjetoDias=15`**.
  2. **Sucesso:** 1 etapa única, `data_inicio=2026-11-01`, `duracao_dias=30` → `dataFim=2026-11-30`; **`duracaoTotalProjetoDias=30`**.
  3. **Erro:** linha com `duracao_dias=0` → `{ ok: false, erro: 'duracao_invalida', campo: 'duracao_dias' }`.

## 11. `matriz-de-risco` — Matriz de risco

- **Motor:** `tabela`.
- **Problema resolvido:** classificar riscos de um projeto por probabilidade e impacto, numa grade de calor, sem depender de planilha.
- **Escala usada (documentada, não é norma de mercado a confirmar — é uma escolha de design de 3 níveis, simples e comum em introduções ao tema):** `probabilidade` e `impacto` de `1` (baixa) a `3` (alta); `severidade = probabilidade × impacto` (varia de `1` a `9`); classificação: `severidade ≤ 2 → 'baixo'`; `3 ≤ severidade ≤ 4 → 'medio'`; `severidade ≥ 6 → 'alto'` (os valores possíveis do produto de dois números em `{1,2,3}` são `1,2,3,4,6,9` — não existe `5`, então a faixa não deixa nenhum valor sem classificação).
- **Entradas:** linhas: `risco` (`texto`, obrigatório); `probabilidade` (`opcao`, obrigatório, valores `1 | 2 | 3`, com rótulo baixa/média/alta); `impacto` (`opcao`, obrigatório, valores `1 | 2 | 3`, mesmo rótulo).
- **Processamento:** `severidade = probabilidade × impacto`; `classificacao` conforme a tabela acima. Resumo: contagem de riscos por classificação.
  - Erros: `risco_vazio`; `probabilidade_invalida` (valor fora de `{1,2,3}`, cobre entrada corrompida já que o campo é `opcao`).
- **Saídas:** tabela com `risco`, `probabilidade`, `impacto`, `severidade`, `classificacao`; grade de calor 3×3 (visual) com a contagem de riscos em cada célula.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** grade de calor substituída por lista agrupada por classificação (alto/médio/baixo), já que uma grade 3×3 fica pequena demais para tocar em 390px.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** risco A `probabilidade=3, impacto=3` → `severidade=9` → **`alto`**; risco B `probabilidade=1, impacto=2` → `severidade=2` → **`baixo`**; risco C `probabilidade=2, impacto=2` → `severidade=4` → **`medio`**.
  2. **Sucesso:** 5 riscos com combinações variadas → resumo com a soma das 3 classificações totalizando 5.
  3. **Erro:** linha com `risco=""` → `{ ok: false, erro: 'risco_vazio', campo: 'risco' }`.

## 12. `matriz-raci` — Matriz RACI

- **Motor:** `interativo` (**exceção justificada**) — a matriz tem uma coluna por **pessoa**, e a lista de pessoas é definida pelo próprio usuário; o motor `tabela` padrão trabalha com colunas fixas e tipadas (§15.2/15.3 dos contratos), não com colunas geradas dinamicamente a partir de uma lista informada em outro campo. Por isso esta ferramenta usa lógica própria de tela, mantendo a validação em função pura testável.
- **Problema resolvido:** definir quem é responsável, aprovador, consultado e informado em cada atividade de um projeto, aplicando a regra clássica de que cada atividade deve ter exatamente **um** aprovador.
- **Entradas:** `pessoas` (`area-texto`, obrigatório, um nome por linha, mín. 2); linhas de atividade: `atividade` (`texto`, obrigatório); para cada pessoa da lista, um campo `papel_<pessoa>` (`opcao`, opcional, valores `R | A | C | I` ou vazio).
- **Processamento** (`validarRaci(matriz)`, onde `matriz = { pessoas: string[], atividades: [{ nome, papeis: { [pessoa]: 'R'|'A'|'C'|'I'|undefined } }] }`):
  - Para cada atividade, contar quantos papéis são `'A'`.
  - Erros: `atividade_sem_responsavel_principal` (0 papéis `'A'` numa atividade, com o nome da atividade em `extras`); `atividade_com_mais_de_um_responsavel_principal` (2 ou mais `'A'` na mesma atividade); `atividade_vazia`; `pessoas_insuficientes` (`pessoas.length < 2`).
- **Saídas:** grade com atividades nas linhas e pessoas nas colunas, célula com o papel; aviso (não bloqueante) se alguma pessoa não tiver nenhum papel em nenhuma atividade.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** a grade rola horizontalmente (colunas de pessoa podem ser muitas); a coluna "atividade" fica fixa à esquerda.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `pessoas=["Ana","Bruno","Carla"]`; atividade 1 com `papeis={Ana:'A', Bruno:'R', Carla:'C'}` → válido (exatamente 1 `'A'`).
  2. **Sucesso:** atividade 2 na mesma matriz com `papeis={Ana:'C', Bruno:'A', Carla:'I'}` → válido (1 `'A'`, em pessoa diferente da atividade 1 — isso é permitido).
  3. **Erro:** atividade 3 com `papeis={Ana:'R', Bruno:'R'}` (nenhum `'A'`) → `{ ok: false, erro: 'atividade_sem_responsavel_principal', campo: 'atividades', extras: { atividade: 'atividade 3' } }`.
