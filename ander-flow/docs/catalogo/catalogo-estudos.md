# Catálogo de especificação — estudos

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| quiz-de-multipla-escolha | tabela | sim | nenhuma | — |
| flashcards | tabela | sim | nenhuma | layout de corte é decisão de design, não coeficiente |
| plano-de-estudos | tabela | sim | nenhuma | detecta sobreposição de horário como erro |
| resumo-esquematico | documento | sim | nenhuma | parser de hierarquia reaproveitável em `mapa-mental` |
| simulado | tabela | sim | nenhuma | reaproveita estrutura de `quiz-de-multipla-escolha` |
| certificado | documento | sim | nenhuma | ferramenta toda Plus (plano do manifesto), sem novo recurso Plus |
| tabuada | folha | sim | nenhuma | — |
| caca-palavras | folha | sim | nenhuma | algoritmo de posicionamento com tentativa/erro, sem coeficiente |
| caligrafia | folha | sim | nenhuma | — |
| papel-quadriculado | folha | sim | nenhuma | inclui quadrado de calibração para conferir escala 1:1 |
| bingo-de-numeros | folha | sim | nenhuma | — |
| operacoes-matematicas | folha | sim | nenhuma | — |
| mapa-mental | interativo | sim | nenhuma | árvore visual não cabe nos motores tabulares |
| linha-do-tempo | tabela | sim | nenhuma | ordena por data, com intervalo calculado |
| rotina-de-revisao | calculadora | sim | nenhuma | intervalos de repetição são entrada com padrão sugerido e explicado |

## 1. `quiz-de-multipla-escolha` — Quiz de múltipla escolha

- **Motor:** `tabela` — cada questão é uma linha com colunas tipadas fixas (pergunta + 4 alternativas + a correta).
- **Problema resolvido:** montar uma prova de múltipla escolha com gabarito pronto para aplicar, sem formatar isso manualmente.
- **Entradas:** linhas: `pergunta` (`area-texto`, obrigatório); `alternativa_a`, `alternativa_b`, `alternativa_c`, `alternativa_d` (`texto`, todas obrigatórias); `correta` (`opcao`, obrigatório, valores `A | B | C | D`).
- **Processamento:** `totalQuestoes = count(linhas)`; `gabarito = lista ordenada de 'correta' de cada linha, na ordem em que aparecem`.
  - Erros: `pergunta_vazia`; `alternativa_vazia` (com a letra da alternativa vazia em `extras`).
- **Saídas:** dois documentos gerados a partir da mesma tabela — a **prova** (perguntas e alternativas, sem indicar a correta) e o **gabarito** (lista numerada com a letra correta de cada questão), em página separada.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** cada questão em um cartão, com as 4 alternativas empilhadas.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** estrutura de dados idêntica a `simulado` (que adiciona a correção automática); ver decisão no item 5.
- **Casos de teste:**
  1. **Sucesso:** 3 questões completas, com `correta` em `A, C, B` respectivamente → `totalQuestoes=3`; **`gabarito=['A','C','B']`**.
  2. **Sucesso:** 1 questão apenas → `totalQuestoes=1`; `gabarito` com 1 item.
  3. **Erro:** questão com `alternativa_a=""` → `{ ok: false, erro: 'alternativa_vazia', campo: 'alternativa_a' }`.

## 2. `flashcards` — Flashcards

- **Motor:** `tabela`.
- **Problema resolvido:** criar cartões de pergunta/resposta para memorização, prontos para imprimir, cortar e usar.
- **Decisão de design (layout, não coeficiente a confirmar):** o leiaute de impressão usa **6 cartões por página A4** (grade 2×3 de aproximadamente 9×5,5 cm cada, com linhas de corte), por ser um tamanho de cartão prático de manusear e cortar; documentado aqui como escolha de design, ajustável pelo agente que desenhar o `folha`/`tabela` se preferir outra grade.
- **Entradas:** linhas: `frente` (`texto`, obrigatório); `verso` (`texto`, obrigatório).
- **Processamento:** `totalCards = count(linhas)`; `cardsPorPagina = 6` (constante); `paginasNecessarias = ceil(totalCards / cardsPorPagina)`.
  - Erros: `frente_vazia`; `verso_vazio`.
- **Saídas:** folhas geradas com os cartões (frente e verso em páginas espelhadas, para impressão em frente e verso), `paginasNecessarias` como informação auxiliar.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** lista simples de edição (frente/verso por cartão); a pré‑visualização de impressão é melhor vista depois de exportar o PDF, já que o layout de grade não cabe legível em 390px.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** 15 cards → **`paginasNecessarias = ceil(15/6) = 3`**.
  2. **Sucesso:** 6 cards → **`paginasNecessarias = 1`**.
  3. **Erro:** card com `frente=""` → `{ ok: false, erro: 'frente_vazia', campo: 'frente' }`.

## 3. `plano-de-estudos` — Plano de estudos

- **Motor:** `tabela`.
- **Problema resolvido:** montar uma grade semanal de estudos por disciplina sem que os horários se sobreponham sem que a pessoa note.
- **Entradas:** linhas: `disciplina` (`texto`, obrigatório); `dia_semana` (`opcao`, obrigatório, valores `seg | ter | qua | qui | sex | sab | dom`); `horario_inicio` (`hora`, obrigatório); `duracao_minutos` (`inteiro`, obrigatório, min `5`).
- **Processamento:** `horarioFim = horario_inicio + duracao_minutos`. Verificação de conflito: para cada par de linhas com o **mesmo** `dia_semana`, se os intervalos `[horario_inicio, horarioFim)` se sobrepõem, é erro (não apenas aviso, porque duas sessões sobrepostas tornam o plano inexequível). `totalMinutosSemana = soma(duracao_minutos de todas as linhas)`.
  - Erros: `disciplina_vazia`; `duracao_invalida` (`≤ 0`); `sessoes_sobrepostas` (com os índices das duas linhas conflitantes em `extras`).
- **Saídas:** grade semanal (dias como colunas, horário como eixo vertical, ou tabela simples ordenada por dia/horário); `totalMinutosSemana` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista por dia da semana (abas ou seções colapsáveis), em vez de grade horizontal.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `seg 08:00 (60min)` → fim `09:00`; `seg 09:30 (30min)` → fim `10:00` (sem sobreposição, há um intervalo de 30 min entre elas) → `totalMinutosSemana=90`, sem erro.
  2. **Sucesso:** 3 sessões em dias diferentes (`seg`, `qua`, `sex`), sem conflito → soma correta de `totalMinutosSemana`.
  3. **Erro:** `seg 08:00 (60min)` (fim `09:00`) e `seg 08:30 (30min)` (fim `09:00`, mas início `08:30` cai dentro do primeiro intervalo) → `{ ok: false, erro: 'sessoes_sobrepostas', extras: { linhas: [0, 1] } }`.

## 4. `resumo-esquematico` — Modelo de resumo esquemático

- **Motor:** `documento`.
- **Problema resolvido:** organizar um resumo de estudo em tópicos hierárquicos, palavras‑chave e perguntas de revisão, num formato pronto para revisar depois.
- **Entradas:** `tema` (`texto`, obrigatório); `topicos` (`area-texto`, obrigatório — cada linha é um tópico; uma sub‑linha começando com 2 espaços ou 1 tabulação é um sub‑tópico do tópico anterior de nível mais alto); `palavras_chave` (`area-texto`, opcional, uma por linha); `perguntas_revisao` (`area-texto`, opcional, uma por linha).
- **Processamento:** `parseArvore(topicos)` — para cada linha não vazia de `topicos`, calcula o `nivel` pela quantidade de indentação (cada bloco de 2 espaços, ou cada tabulação, é +1 nível) e monta a árvore anexando cada linha como filha do último nó do nível imediatamente acima ainda aberto.
  - Erros: `tema_obrigatorio`; `topicos_vazios`.
- **Saídas:** documento com o `tema` como título, a árvore de tópicos como lista aninhada, e as seções de palavras‑chave e perguntas de revisão (se informadas).
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** árvore de tópicos com recuo visual reduzido (menos espaço por nível) para não estourar a largura da tela.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** `parseArvore` é a **mesma função** usada por `mapa-mental` (categoria estudos também) para interpretar texto indentado como hierarquia — ver decisão de reaproveitamento no item 13.
- **Casos de teste:**
  1. **Sucesso:** `topicos="Fotossíntese\n  Luz\n  Clorofila\nRespiração celular"` → árvore: `[{ texto: "Fotossíntese", filhos: ["Luz", "Clorofila"] }, { texto: "Respiração celular", filhos: [] }]`.
  2. **Sucesso:** `topicos="Item 1\nItem 2\nItem 3"` (sem indentação) → árvore plana com 3 nós, todos sem filhos.
  3. **Erro:** `topicos=""` → `{ ok: false, erro: 'topicos_vazios', campo: 'topicos' }`.

## 5. `simulado` — Montador de simulado

- **Motor:** `tabela`.
- **Problema resolvido:** montar um simulado a partir de um banco de questões e, se o aluno informar as respostas dele, corrigir automaticamente.
- **Entradas:** linhas do banco: mesma estrutura de `quiz-de-multipla-escolha` (`pergunta`, `alternativa_a..d`, `correta`); campo adicional opcional `respostas_aluno` (`area-texto`, opcional — uma letra por linha, na mesma ordem das questões do banco).
- **Processamento:** `totalQuestoes = count(linhas)`; `gabarito = lista de 'correta'`. Se `respostas_aluno` informado: `respostas = respostas_aluno.split('\n').map(trim).filter(l => l !== '')`; se `respostas.length !== totalQuestoes` → erro; senão, `acertos = count(respostas[i] === gabarito[i])`; `notaPercentual = arred0(acertos / totalQuestoes × 100)`.
  - Erros: (mesmos de `quiz-de-multipla-escolha`) `pergunta_vazia`, `alternativa_vazia`; mais `respostas_aluno_tamanho_invalido` (quando informado e a quantidade de linhas não bate com `totalQuestoes`).
- **Saídas:** o simulado (perguntas + alternativas) e, se `respostas_aluno` informado, `acertos` e `notaPercentual` (destaque).
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** mesmo padrão de `quiz-de-multipla-escolha`; a nota, quando calculada, aparece em destaque no topo.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição — decisão a registrar:** `simulado` é um superconjunto de `quiz-de-multipla-escolha` (mesma estrutura de banco de questões, mais a correção automática opcional). Mantidas como duas telas porque atendem intenções de busca diferentes ("montar prova para aplicar" vs. "montar simulado com correção"), mas o `<slug>-calculo.js` de `simulado` pode chamar a mesma função de montagem de gabarito usada por `quiz-de-multipla-escolha`, em vez de duplicá‑la.
- **Casos de teste:**
  1. **Sucesso:** 5 questões, `gabarito=['A','B','C','D','A']`, `respostas_aluno="A\nB\nC\nA\nA"` (4 acertos, erro na 4ª) → `acertos=4`; **`notaPercentual=80`**.
  2. **Sucesso:** mesmas 5 questões, sem `respostas_aluno` (campo opcional vazio) → simulado montado normalmente, sem `acertos`/`notaPercentual`.
  3. **Erro:** `respostas_aluno` com 4 linhas para 5 questões → `{ ok: false, erro: 'respostas_aluno_tamanho_invalido', campo: 'respostas_aluno' }`.

## 6. `certificado` — Gerador de certificado (Plus)

- **Motor:** `documento`.
- **Problema resolvido:** gerar um certificado de participação/conclusão com nome, curso e carga horária, com aparência de certificado (não uma folha de texto simples).
- **Plano:** a ferramenta inteira é **Plus** (`plano: "plus"` no manifesto, não um recurso adicional dentro de uma ferramenta grátis) — quem não é Plus vê a tela de bloqueio de plano ao tentar abrir, não um recurso travado dentro da ferramenta.
- **Entradas:** `nome_participante` (`texto`, obrigatório); `nome_curso` (`texto`, obrigatório); `carga_horaria_horas` (`numero`, obrigatório, min `1`); `data_conclusao` (`data`, obrigatório); `nome_instituicao` (`texto`, opcional); `nome_responsavel` (`texto`, opcional — nome exibido na linha de assinatura).
- **Processamento:** monta o documento com layout de certificado (moldura, título "Certificado", texto corrido citando `nome_participante`, `nome_curso`, `carga_horaria_horas` formatada como "X horas", e `data_conclusao` formatada por extenso). Sem cálculo numérico.
  - Erros: `nome_participante_obrigatorio`; `nome_curso_obrigatorio`; `carga_horaria_invalida` (`≤ 0`).
- **Saídas:** documento/imagem do certificado pronto.
- **Exportação e Plus:** `pdf`, `imprimir` — a ferramenta já é Plus por completo; nenhum recurso extra Plus dentro dela (`recursos_plus` vazio no manifesto).
- **Celular (390px):** pré‑visualização do certificado com zoom, já que o layout de certificado é naturalmente mais largo que 390px; exportar para PDF é o caminho recomendado no celular.
- **Viabilidade:** 100% local (SVG/HTML + impressão); nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `nome_participante="Maria Silva"`, `nome_curso="Excel Avançado"`, `carga_horaria_horas=40`, `data_conclusao=2026-08-15` → certificado gerado com "40 horas" e a data por extenso.
  2. **Sucesso:** mesmo exemplo sem `nome_instituicao` (opcional) → certificado sem essa linha.
  3. **Erro:** `carga_horaria_horas=0` → `{ ok: false, erro: 'carga_horaria_invalida', campo: 'carga_horaria_horas' }`.

## 7. `tabuada` — Tabuada para imprimir

- **Motor:** `folha`.
- **Problema resolvido:** gerar folhas de tabuada por fator, em ordem ou embaralhada, com gabarito separado, para o professor não montar isso à mão.
- **Entradas:** `fatores` (`texto`, obrigatório — números de 1 a 10 separados por vírgula, ex. `"3,7"`); `ordem` (`opcao`, opcional, valores `em_ordem | embaralhada`, padrão `em_ordem`); `incluir_gabarito` (`marcador`, opcional, padrão `true`).
- **Processamento:** para cada fator em `fatores`, gera as 10 operações `fator × 1` até `fator × 10`; se `ordem = embaralhada`, embaralha (Fisher‑Yates) a ordem das 10 linhas **daquele fator**, mantendo os pares corretos (o conjunto de operações não muda, só a ordem em que aparecem na folha). Se `incluir_gabarito`, gera uma segunda página com as mesmas operações e os resultados visíveis.
  - Erros: `fatores_vazio`; `fator_invalido` (valor não numérico ou fora de 1–10, com o valor problemático em `extras`).
- **Saídas:** folha(s) de exercício (uma tabela por fator) e, se pedido, o gabarito em página separada.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** cada tabela de fator em bloco próprio, rolando verticalmente.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `operacoes-matematicas` (aquela sorteia números aleatórios dentro de uma faixa; esta gera a tabuada completa e determinística de um fator específico — propósitos diferentes).
- **Casos de teste:**
  1. **Sucesso:** `fatores="3,7"`, `ordem=em_ordem` → gera 2 tabelas de 10 linhas cada (`3×1` a `3×10`, `7×1` a `7×10`); gabarito com os resultados `3,6,9,...,30` e `7,14,...,70`.
  2. **Sucesso:** `fatores="5"`, `ordem=embaralhada` → 10 linhas com `5×1` a `5×10`, em ordem aleatória; o teste confere que o **conjunto** de 10 operações gerado é exatamente `{5×1, 5×2, ..., 5×10}`, independente da ordem.
  3. **Erro:** `fatores="15"` → `{ ok: false, erro: 'fator_invalido', campo: 'fatores', extras: { valor: 15 } }`.

## 8. `caca-palavras` — Caça-palavras

- **Motor:** `folha`.
- **Problema resolvido:** montar um caça-palavras com as palavras escolhidas, com gabarito separado, sem desenhar a grade manualmente.
- **Entradas:** `palavras` (`area-texto`, obrigatório, uma por linha, mín. `1`, máx. `20`); `tamanho_grade` (`inteiro`, opcional, min igual ao comprimento da maior palavra, max `30`, padrão `max(15, comprimento da maior palavra + 2)`); `permitir_vertical` (`marcador`, opcional, padrão `true`); `permitir_diagonal` (`marcador`, opcional, padrão `true`); `permitir_reverso` (`marcador`, opcional, padrão `false` — palavra escrita de trás para frente).
- **Processamento:** algoritmo de tentativa e erro: para cada palavra (da mais longa para a mais curta, o que reduz falhas de posicionamento), sorteia posição e direção (entre as direções permitidas) até encontrar um lugar na grade onde a palavra caiba sem conflitar com uma letra diferente já colocada (letras iguais podem se sobrepor); depois de um número máximo de tentativas por palavra (definido no código, ex. 200), se não couber, todo o processo é reiniciado com uma grade do mesmo tamanho até um limite de reinícios; se mesmo assim não couber, retorna erro pedindo uma grade maior. Células vazias no final são preenchidas com letras aleatórias. O gabarito guarda a posição/direção de cada palavra para desenhar o destaque na página separada.
  - Erros: `palavras_vazio`; `palavra_maior_que_grade` (uma palavra tem mais letras do que `tamanho_grade`); `grade_pequena_demais` (não foi possível posicionar todas as palavras depois do limite de tentativas — pedir para aumentar `tamanho_grade` ou reduzir a lista).
- **Saídas:** grade de letras (folha para resolver) e gabarito com as palavras destacadas, em página separada.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** grade renderizada como SVG que se ajusta à largura da tela mantendo as células quadradas.
- **Viabilidade:** 100% local (algoritmo de tentativa e erro é rápido para grades de até 30×30); nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso (determinístico):** `palavras="SOL\nLUA"`, `tamanho_grade=6`, `permitir_vertical=false`, `permitir_diagonal=false` (só horizontal, para o teste ser previsível) → confere que **ambas** as palavras aparecem em alguma linha da grade lendo da esquerda para a direita (com ou sem reverso, conforme a opção).
  2. **Sucesso:** `palavras="GATO\nCACHORRO\nPATO"`, `tamanho_grade=10` → confere que as 3 palavras estão inseridas na grade (buscando nas 8 direções possíveis a partir de cada célula) e que a grade tem exatamente `10×10 = 100` células preenchidas (nenhuma vazia).
  3. **Erro:** `palavras="SOL"`, `tamanho_grade=2` → `{ ok: false, erro: 'palavra_maior_que_grade', campo: 'tamanho_grade', extras: { palavra: 'SOL' } }`.

## 9. `caligrafia` — Folha de caligrafia

- **Motor:** `folha`.
- **Problema resolvido:** gerar folhas de treino de caligrafia com o texto escolhido e linhas-guia, para quem ensina alfabetização ou treina a própria letra.
- **Entradas:** `texto` (`texto`, obrigatório — a palavra/frase a repetir); `altura_linha_mm` (`numero`, opcional, min `5`, max `30`, padrão `10`); `estilo` (`opcao`, opcional, valores `tracejado | solido`, padrão `tracejado`); `repeticoes_por_linha` (`inteiro`, opcional, min `1`, max `20`, padrão `3`); `num_linhas` (`inteiro`, opcional, min `1`, max `40`, padrão `10`).
- **Processamento:** gera `num_linhas` linhas-guia (cada uma com o conjunto de 3 traços do padrão caligráfico: linha superior, linha média pontilhada e linha base), cada uma preenchida com `texto` repetido `repeticoes_por_linha` vezes, separado por um espaço.
  - Erros: `texto_vazio`; `num_linhas_invalido` (`≤ 0`).
- **Saídas:** folha com as linhas‑guia preenchidas.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** pré‑visualização com zoom (a folha é pensada para impressão em tamanho real, não para leitura confortável em tela pequena).
- **Viabilidade:** 100% local, SVG; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `texto="casa"`, `num_linhas=5`, `repeticoes_por_linha=4` → 5 linhas‑guia, cada uma com `"casa casa casa casa"`.
  2. **Sucesso:** `texto="A"`, `num_linhas=1`, `repeticoes_por_linha=10` → 1 linha‑guia com `"A"` repetido 10 vezes.
  3. **Erro:** `texto=""` → `{ ok: false, erro: 'texto_vazio', campo: 'texto' }`.

## 10. `papel-quadriculado` — Papel quadriculado para imprimir

- **Motor:** `folha`.
- **Problema resolvido:** ter papel quadriculado em tamanho real para imprimir, sem depender de comprar um bloco.
- **Cuidado que a ferramenta precisa ter (honestidade de escala, não coeficiente):** impressoras/navegadores podem ajustar a página ao imprimir ("ajustar à página"), o que distorce a escala 1:1. Por isso a folha sempre inclui, por padrão, um **quadrado de calibração de exatamente 50×50 mm** com uma instrução: "meça este quadrado com uma régua depois de imprimir; se não estiver com 5 cm de lado, desligue a opção 'ajustar à página' na impressão."
- **Entradas:** `tamanho_quadrado_mm` (`numero`, obrigatório, min `1`, max `50`, padrão `5`); `espessura_linha_mm` (`numero`, opcional, min `0.1`, max `1`, padrão `0.2`); `cor_linha` (`opcao`, opcional, valores `cinza | azul | preto`, padrão `cinza`); `margem_mm` (`numero`, opcional, min `0`, max `30`, padrão `10`); `incluir_quadrado_calibracao` (`marcador`, opcional, padrão `true`).
- **Processamento:** página A4 (`210×297 mm`); `larguraUtil = 210 − 2×margem_mm`; `alturaUtil = 297 − 2×margem_mm`; `numColunas = floor(larguraUtil / tamanho_quadrado_mm)`; `numLinhas = floor(alturaUtil / tamanho_quadrado_mm)`.
  - Erros: `tamanho_invalido` (`tamanho_quadrado_mm ≤ 0`); `margem_invalida` (`margem_mm` negativa ou tão grande que não sobra área útil).
- **Saídas:** grade SVG em tamanho real (unidades `mm` no próprio SVG, para imprimir sem escalar) com `numColunas × numLinhas` quadrados, mais o quadrado de calibração no canto (se habilitado).
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** pré‑visualização reduzida (a folha é para imprimir, não para uso na tela); aviso de que a escala real só vale no papel impresso, não no zoom da tela.
- **Viabilidade:** 100% local, SVG em unidades físicas; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `margem_mm=10`, `tamanho_quadrado_mm=5` → `larguraUtil=190`; `alturaUtil=277`; **`numColunas=38`**; **`numLinhas=55`**.
  2. **Sucesso:** `margem_mm=15`, `tamanho_quadrado_mm=10` → `larguraUtil=180`; `alturaUtil=267`; **`numColunas=18`**; **`numLinhas=26`**.
  3. **Erro:** `tamanho_quadrado_mm=0` → `{ ok: false, erro: 'tamanho_invalido', campo: 'tamanho_quadrado_mm' }`.

## 11. `bingo-de-numeros` — Bingo de números

- **Motor:** `folha`.
- **Problema resolvido:** gerar cartelas de bingo sem repetição e a lista de sorteio para o condutor tocar o jogo, sem comprar cartelas prontas.
- **Entradas:** `num_cartelas` (`inteiro`, obrigatório, min `1`, max `200`); `valor_maximo` (`inteiro`, obrigatório, min `25`, padrão `75` — bingo tradicional vai de 1 a 75, mas o campo é livre para outros formatos, ex. 1 a 90); `numeros_por_cartela` (`inteiro`, obrigatório, min `1`, padrão `24` — o padrão de uma cartela 5×5 com o centro livre); a validação exige `numeros_por_cartela ≤ valor_maximo`.
- **Processamento:** para cada cartela, sorteia `numeros_por_cartela` números **distintos** entre `1` e `valor_maximo` (sem repetição **dentro** da mesma cartela; cartelas diferentes podem repetir números entre si, como no bingo real). Gera também `listaSorteio`: uma permutação aleatória de todos os números de `1` a `valor_maximo`, para o condutor sortear em ordem sem repetir nenhum durante o jogo.
  - Erros: `numeros_por_cartela_maior_que_valor_maximo`; `num_cartelas_invalido` (`≤ 0` ou `> 200`).
- **Saídas:** `num_cartelas` folhas de cartela e uma lista de sorteio (folha separada, para o condutor).
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** pré‑visualização de uma cartela por vez, com navegação entre elas; a lista de sorteio numa aba separada.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** reaproveita a mesma função de embaralhamento (`embaralhar`, Fisher‑Yates) já usada em `sorteio` (categoria produtividade) — mesma lógica, telas diferentes.
- **Casos de teste:**
  1. **Sucesso:** `num_cartelas=1`, `valor_maximo=75`, `numeros_por_cartela=24` → a cartela tem 24 números distintos, todos entre 1 e 75; `listaSorteio` tem exatamente 75 números, todos distintos, e o conjunto é igual a `{1, 2, ..., 75}`.
  2. **Sucesso:** `num_cartelas=10`, demais iguais ao caso 1 → 10 cartelas geradas, cada uma com 24 números distintos entre si (não se exige unicidade entre cartelas diferentes).
  3. **Erro:** `numeros_por_cartela=30`, `valor_maximo=25` → `{ ok: false, erro: 'numeros_por_cartela_maior_que_valor_maximo', campo: 'numeros_por_cartela' }`.

## 12. `operacoes-matematicas` — Folha de operações matemáticas

- **Motor:** `folha`.
- **Problema resolvido:** gerar folhas de treino de adição, subtração, multiplicação ou divisão dentro de uma faixa escolhida, com gabarito separado.
- **Entradas:** `operacao` (`opcao`, obrigatório, valores `soma | subtracao | multiplicacao | divisao`); `quantidade_questoes` (`inteiro`, obrigatório, min `1`, max `100`, padrão `20`); `faixa_min` (`inteiro`, obrigatório, padrão `1`); `faixa_max` (`inteiro`, obrigatório, padrão `100`); `permitir_negativos` (`marcador`, opcional, padrão `false` — só relevante para `subtracao`); `garantir_divisao_exata` (`marcador`, opcional, padrão `true` — só relevante para `divisao`).
- **Processamento:** para `soma`/`multiplicacao`, sorteia `a` e `b` dentro de `[faixa_min, faixa_max]`. Para `subtracao`: sorteia `a` e `b` na faixa; se `!permitir_negativos`, troca os dois para que `a ≥ b`. Para `divisao`: se `garantir_divisao_exata`, sorteia primeiro o `divisor` e o `quociente` dentro da faixa e calcula `dividendo = divisor × quociente` (garantindo resto zero); se não, sorteia `dividendo` e `divisor` livremente e mostra o resultado com casas decimais. Gera `quantidade_questoes` dessas operações e o gabarito com os resultados.
  - Erros: `faixa_min_maior_que_faixa_max`; `quantidade_questoes_invalida` (fora de 1–100).
- **Saídas:** folha de questões e gabarito em página separada.
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** questões em grade de 2 colunas (cabe melhor que 1 coluna larga para operações curtas).
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `tabuada` (que é determinística e cobre 1–10 de um fator fixo; esta é aleatória dentro de uma faixa qualquer).
- **Casos de teste:**
  1. **Sucesso:** `operacao=soma`, `quantidade_questoes=5`, `faixa_min=1`, `faixa_max=20` → confere 5 questões geradas, cada uma com `a` e `b` dentro de `[1,20]` e `resultado = a + b`.
  2. **Sucesso:** `operacao=divisao`, `quantidade_questoes=5`, `faixa_min=1`, `faixa_max=10`, `garantir_divisao_exata=true` → confere que, nas 5 questões, `dividendo % divisor === 0`.
  3. **Erro:** `faixa_min=50`, `faixa_max=10` → `{ ok: false, erro: 'faixa_min_maior_que_faixa_max', campo: 'faixa_min' }`.

## 13. `mapa-mental` — Montador de mapa mental

- **Motor:** `interativo` (**exceção justificada**) — o resultado é uma árvore visual radial (tema central no meio, ramos ao redor), que não é uma lista/matriz nem um documento de texto corrido; precisa de posicionamento próprio em SVG (ângulo e raio calculados a partir do nível de cada nó).
- **Problema resolvido:** organizar um tema central e seus ramos visualmente, para estudar ou apresentar, sem abrir uma ferramenta de mapa mental externa.
- **Entradas:** `tema_central` (`texto`, obrigatório); `ramos` (`area-texto`, obrigatório — mesma sintaxe de indentação por linha usada em `resumo-esquematico`: cada bloco de 2 espaços ou 1 tabulação é +1 nível).
- **Processamento:** reaproveita `parseArvore(ramos)` (mesma função de `resumo-esquematico`, ver decisão abaixo) para montar a hierarquia; depois calcula, para cada nó de nível 1, um ângulo igual (`360° / número de ramos de nível 1`) ao redor do `tema_central`, e posiciona os filhos de cada ramo a um raio maior, dentro do mesmo setor angular do pai.
  - Erros: `tema_central_obrigatorio`; `ramos_vazios`.
- **Saídas:** desenho SVG do mapa mental (nós e linhas conectando tema central → ramos → sub‑ramos).
- **Exportação e Plus:** `svg`, `pdf`, `imprimir` — grátis.
- **Celular (390px):** o mapa rola/zoom com gesto de pinça; os `ramos` em texto ficam numa aba de edição separada do desenho.
- **Viabilidade:** 100% local, SVG com posicionamento radial calculado à mão; nenhuma biblioteca nova.
- **Sobreposição — decisão a registrar:** o parser de texto indentado em hierarquia (`parseArvore`) é **idêntico** ao usado por `resumo-esquematico`. Recomendação para quem for implementar: colocar essa função em `frontend/compartilhado/` (por exemplo, como parte de `compartilhado-ferramenta.js` ou um módulo próprio de parsing de listas) e importar nas duas ferramentas, em vez de duplicar o código.
- **Casos de teste:**
  1. **Sucesso:** `tema_central="Fotossíntese"`, `ramos="Luz\n  Sol\n  Lâmpada\nÁgua\nCO2"` → árvore com 3 ramos de 1º nível (`Luz`, `Água`, `CO2`), sendo que `Luz` tem 2 sub‑ramos (`Sol`, `Lâmpada`).
  2. **Sucesso:** `ramos="Item 1\nItem 2\nItem 3"` (sem indentação) → árvore plana com 3 ramos diretos, sem sub‑ramos.
  3. **Erro:** `tema_central=""` → `{ ok: false, erro: 'tema_central_obrigatorio', campo: 'tema_central' }`.

## 14. `linha-do-tempo` — Linha do tempo

- **Motor:** `tabela`.
- **Problema resolvido:** organizar eventos em ordem cronológica numa linha do tempo visual, para um trabalho escolar ou uma apresentação.
- **Entradas:** linhas: `evento` (`texto`, obrigatório); `data` (`data`, obrigatório); `descricao` (`area-texto`, opcional).
- **Processamento:** as linhas são reordenadas por `data` crescente antes de exibir (independente da ordem em que foram digitadas). Coluna calculada `intervaloDias`: para a primeira linha (depois de ordenar), `0`; para as demais, `data atual − data da linha anterior`, em dias.
  - Erros: `evento_vazio`; `data_invalida` (campo vazio ou não reconhecido como data — já coberto pelo tipo `data`, mas confirmado de novo no cálculo).
- **Saídas:** lista ordenada com `evento`, `data`, `descricao`, `intervaloDias`; desenho de linha do tempo horizontal ou vertical com os eventos espaçados (opcionalmente proporcional ao intervalo, opcionalmente com espaçamento igual — decisão de exibição do `linha-do-tempo.js`, não do cálculo).
- **Exportação e Plus:** `imprimir`, `pdf` — grátis.
- **Celular (390px):** linha do tempo vertical (um evento por bloco, de cima para baixo), já que a horizontal não cabe com texto legível em 390px.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `cronograma-de-projeto` (aquela é sobre etapas futuras com duração e responsável; esta é sobre eventos históricos/pontuais numa data única).
- **Casos de teste:**
  1. **Sucesso:** eventos digitados fora de ordem — `2020-01-01`, `2019-05-10`, `2021-03-15` — reordenados para `2019-05-10` (`intervaloDias=0`), `2020-01-01` (`intervaloDias=236`), `2021-03-15` (`intervaloDias=439`).
  2. **Sucesso:** dois eventos na mesma data → `intervaloDias=0` entre eles.
  3. **Erro:** linha com `evento=""` → `{ ok: false, erro: 'evento_vazio', campo: 'evento' }`.

## 15. `rotina-de-revisao` — Rotina de revisão espaçada

- **Motor:** `calculadora`.
- **Problema resolvido:** saber exatamente em que datas revisar um conteúdo, usando repetição espaçada, sem ter que calcular isso manualmente a cada assunto novo.
- **Coeficiente honesto:** os intervalos sugeridos (`"1,7,16,35"` dias) são uma sequência de referência de repetição espaçada popularizada por sistemas como Anki/SuperMemo (versão simplificada), citada na ajuda do campo como ponto de partida — o campo é de texto livre, então o usuário pode usar qualquer sequência de intervalos que preferir.
- **Entradas:** `data_estudo` (`data`, obrigatório); `intervalos_dias` (`texto`, obrigatório, padrão `"1,7,16,35"` — lista de números inteiros positivos separados por vírgula, em ordem crescente).
- **Processamento:** `intervalos = intervalos_dias.split(',').map(Number)`; para cada `intervalo` da lista, `dataRevisao = data_estudo + intervalo dias`.
  - Erros: `intervalos_vazio`; `intervalo_invalido` (algum item não é um número inteiro positivo, com o valor problemático em `extras`); `intervalos_fora_de_ordem` (a lista não está em ordem crescente — evita datas de revisão "voltando no tempo").
- **Saídas:** lista de datas de revisão (uma por intervalo), em ordem crescente.
- **Exportação e Plus:** `copiar`, `pdf` — grátis; **Plus sugerido, não implementado nesta onda:** adicionar as datas de revisão à agenda do usuário (fora do escopo — o manifesto não lista nenhum `recurso_plus` para esta ferramenta).
- **Celular (390px):** lista vertical simples com as datas.
- **Viabilidade:** 100% local, soma de dias corridos; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `data_estudo=2026-09-24`, `intervalos_dias="1,7,16,35"` → datas de revisão: `2026-09-25`, `2026-10-01`, `2026-10-10`, `2026-10-29`.
  2. **Sucesso:** `data_estudo=2026-09-24`, `intervalos_dias="3,10"` → datas de revisão: `2026-09-27`, `2026-10-04`.
  3. **Erro:** `intervalos_dias=""` → `{ ok: false, erro: 'intervalos_vazio', campo: 'intervalos_dias' }`.
