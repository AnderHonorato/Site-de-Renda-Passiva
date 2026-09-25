# Catálogo de especificação — ofício

Nesta categoria, nenhum coeficiente de consumo (litros de tinta por m², % de perda de piso, gramas de carne por pessoa etc.) é tratado como verdade fixa: cada um é **entrada do usuário com um valor sugerido como padrão**, explicado no texto de ajuda do campo (de onde vem o número e por que é só uma referência), exceto quando existe uma fórmula técnica objetiva (ex.: consumo de rejunte), que nesse caso é citada com a fonte. Nenhuma ferramenta desta categoria trava o resultado num número que o usuário não possa mudar.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| custo-de-receita | tabela | sim | nenhuma | sem coeficiente inventado — consumo é o que o usuário digitar |
| ajuste-de-receita | tabela | sim | nenhuma | escala pura; perda é entrada explicada |
| ficha-tecnica | documento | sim | nenhuma | agrega dados já calculados em `custo-de-receita` |
| custo-de-material-artesanal | tabela | sim | nenhuma | estrutura idêntica a `custo-de-receita` — ver sobreposição |
| valor-da-hora | calculadora | sim | nenhuma | — |
| calculadora-de-tinta | calculadora | sim | nenhuma | rendimento por litro é entrada com padrão sugerido (10 m²/L) |
| piso-por-caixa | calculadora | sim | nenhuma | % de perda é entrada com padrão sugerido (10%) |
| quantidade-de-rodape | calculadora | sim | nenhuma | idem |
| papel-de-parede | calculadora | sim | nenhuma | tamanho do rolo é entrada com padrão do rolo comercial BR |
| area-de-rejunte | calculadora | sim | nenhuma | fórmula técnica ANFACER, com fonte |
| area-de-paredes | tabela | sim | nenhuma | geometria pura |
| molde-de-caixa | folha | sim | nenhuma | geometria de planificação, sem coeficiente |
| molde-de-envelope | folha | sim | nenhuma | idem |
| divisorias-de-caixa | folha | sim | nenhuma | idem |
| calculadora-de-churrasco | calculadora | sim | nenhuma | gramas/litros por pessoa são entrada com padrão sugerido |
| festa-infantil | calculadora | sim | nenhuma | idem |
| lista-de-convidados | tabela | sim | nenhuma | dados salvos no aparelho (local, não no servidor) |
| cronograma-de-evento | tabela | sim | nenhuma | aritmética de horário, sem coeficiente |

## 1. `custo-de-receita` — Custo de receita

- **Motor:** `tabela` — linhas de ingredientes com colunas calculadas e total.
- **Problema resolvido:** quem vende comida feita em casa quer saber quanto custou a receita antes de definir o preço (alimenta `preco-de-venda`, já pronta).
- **Entradas:**
  - Parâmetro global: `rendimento` — `inteiro`, obrigatório, min `1` (quantas unidades a receita rende: bolos, docinhos, porções).
  - Linhas: `ingrediente` (`texto`, obrigatório); `quantidade_comprada` (`numero`, obrigatório, min `0.0001` — quanto vem no pacote/embalagem comprada); `preco_pago` (`moeda`, obrigatório, min `0` — preço pago por essa embalagem); `quantidade_usada` (`numero`, obrigatório, min `0` — quanto da embalagem entrou na receita, na mesma unidade de `quantidade_comprada`).
- **Processamento:** para cada linha, `custoUnitario = preco_pago / quantidade_comprada`; `custoNoItem = arred2(custoUnitario × quantidade_usada)`. `custoTotal = arred2(soma(custoNoItem))`. `custoPorUnidade = arred2(custoTotal / rendimento)`.
  - Erros: `quantidade_comprada_zero` (linha com `quantidade_comprada = 0`, divisão por zero); `rendimento_invalido` (`rendimento ≤ 0`); `quantidade_usada_negativa`.
- **Saídas:** tabela com `ingrediente`, `custoUnitario`, `custoNoItem`; totais `custoTotal` (`moeda`, destaque) e `custoPorUnidade` (`moeda`, destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** linhas em cartão (ingrediente + os 4 campos empilhados), totais fixos no rodapé da tela.
- **Viabilidade:** 100% local, sem coeficiente algum — todo número vem do que o usuário digitou; nenhuma biblioteca nova.
- **Sobreposição:** estrutura de cálculo (preço pago ÷ quantidade comprada × quantidade usada) é **idêntica** à de `custo-de-material-artesanal`; ver decisão no item 4.
- **Casos de teste:**
  1. **Sucesso:** `rendimento=20`; linhas: Farinha (`quantidade_comprada=1000`(g), `preco_pago=6,00`, `quantidade_usada=500`) → `custoUnitario=0,006`, `custoNoItem=3,00`; Açúcar (`1000g`, `4,50`, `300g`) → `custoUnitario=0,0045`, `custoNoItem=1,35`; Ovos (`12`(unid), `9,00`, `3`(unid)) → `custoUnitario=0,75`, `custoNoItem=2,25`. `custoTotal=3,00+1,35+2,25=6,60`; **`custoPorUnidade=6,60/20=0,33`**.
  2. **Sucesso:** `rendimento=10`; linha única Chocolate (`quantidade_comprada=500`(g), `preco_pago=15,00`, `quantidade_usada=200`(g)) → `custoUnitario=0,03`, `custoNoItem=6,00`; `custoTotal=6,00`; **`custoPorUnidade=0,60`**.
  3. **Erro:** `rendimento=0` → `{ ok: false, erro: 'rendimento_invalido', campo: 'rendimento' }`.

## 2. `ajuste-de-receita` — Ajuste de quantidade e rendimento da receita

- **Motor:** `tabela`.
- **Problema resolvido:** quem precisa fazer o dobro (ou triplo, ou 1,5×) de uma receita, e ainda quer saber quanto sobra depois de descontar a perda de produção (queima, sobra na tigela etc.).
- **Entradas:**
  - Parâmetros globais: `rendimento_original` (`numero`, obrigatório, min `0.01` — quanto a receita original rende); `rendimento_desejado` (`numero`, obrigatório, min `0.01` — quanto se quer produzir); `perda_producao_percentual` (`percentual`, opcional, min `0`, max `100`, padrão `0`, com ajuda explicando "percentual do que se perde depois de pronto — queima, sobra na tigela, quebra; ajuste conforme a sua experiência com essa receita").
  - Linhas: `ingrediente` (`texto`, obrigatório); `quantidade_original` (`numero`, obrigatório, min `0`).
- **Processamento:** `fatorEscala = rendimento_desejado / rendimento_original`. Para cada linha, `quantidadeAjustada = arred2(quantidade_original × fatorEscala)`. `rendimentoLiquido = arred2(rendimento_desejado × (1 − perda_producao_percentual))`.
  - Erros: `rendimento_original_zero`; `perda_acima_de_100` (`perda_producao_percentual > 100`, embora o tipo `percentual` já limite a 100 pelo campo — o erro cobre entrada corrompida).
- **Saídas:** tabela com `ingrediente`, `quantidade_original`, `quantidadeAjustada`; resultado `rendimentoLiquido` (destaque) e `fatorEscala` como auxiliar.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** parâmetros globais no topo, tabela de ingredientes rolável abaixo.
- **Viabilidade:** 100% local, regra de três pura; nenhuma biblioteca nova.
- **Sobreposição:** usa a mesma ideia de "regra de três" da ferramenta já pronta `regra-de-tres` (categoria cálculo), mas aplicada a uma lista de ingredientes em vez de um valor único — não é duplicação, é um caso de uso específico.
- **Casos de teste:**
  1. **Sucesso:** `rendimento_original=24`, `rendimento_desejado=60`, `perda_producao_percentual=5%` → `fatorEscala=2,5`; ingrediente "Leite condensado" `quantidade_original=395`(g) → `quantidadeAjustada=987,50`(g); **`rendimentoLiquido = 60 × 0,95 = 57`**.
  2. **Sucesso:** `rendimento_original=10`, `rendimento_desejado=10`, `perda_producao_percentual=0%` → `fatorEscala=1` (nenhuma mudança nas quantidades); `rendimentoLiquido=10`.
  3. **Erro:** `rendimento_original=0` → `{ ok: false, erro: 'rendimento_original_zero', campo: 'rendimento_original' }`.

## 3. `ficha-tecnica` — Ficha técnica de produto

- **Motor:** `documento`.
- **Problema resolvido:** quem produz de forma artesanal quer um documento único e padronizado com ingredientes, modo de preparo, custo e rendimento — para repetir a receita sempre igual e treinar outra pessoa a fazer.
- **Entradas:**
  - `nome_produto` — `texto`, obrigatório.
  - `categoria` — `texto`, opcional.
  - `ingredientes` — `area-texto`, obrigatório, um por linha (ex.: `"Leite condensado - 1 lata"`).
  - `modo_preparo` — `area-texto`, obrigatório, um passo por linha.
  - `rendimento` — `inteiro`, obrigatório, min `1`.
  - `custo_total` — `moeda`, opcional, min `0` (se o usuário já calculou em `custo-de-receita`, pode colar o total aqui).
  - `tempo_preparo_minutos` — `inteiro`, opcional, min `1`.
  - `validade_dias` — `inteiro`, opcional, min `1`.
- **Processamento:** `listaIngredientes` e `listaPassos` = divisão por linha, removendo vazias. Se `custo_total` informado: `custoPorUnidade = arred2(custo_total / rendimento)`.
  - Erros: `nome_produto_obrigatorio`; `ingredientes_vazios`; `modo_preparo_vazio`; `rendimento_invalido` (`≤ 0`).
- **Saídas:** documento com cabeçalho (nome, categoria), lista numerada de ingredientes, passos numerados do modo de preparo, e um bloco de ficha técnica com rendimento, tempo de preparo, validade e (se informado) custo total e por unidade.
- **Exportação e Plus:** `imprimir`, `pdf`, `copiar` — grátis.
- **Celular (390px):** coluna única, com o bloco de ficha técnica (rendimento/custo/validade) fixado no topo antes da lista de ingredientes.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** complementa `custo-de-receita` (que calcula o `custo_total` que pode ser colado aqui) — ferramentas diferentes por propósito (uma calcula, a outra documenta), sem necessidade de unificar.
- **Casos de teste:**
  1. **Sucesso:** `nome_produto="Brigadeiro gourmet"`, `ingredientes="Leite condensado - 1 lata\nChocolate em pó - 3 colheres\nManteiga - 1 colher"` (3 itens), `modo_preparo="Misturar tudo\nLevar ao fogo até soltar do fundo\nEnrolar após esfriar"` (3 passos), `rendimento=20`, `custo_total=12,00` → **`custoPorUnidade=0,60`**; documento com 3 ingredientes e 3 passos.
  2. **Sucesso:** mesmo exemplo sem `custo_total` (campo opcional deixado vazio) → documento gerado normalmente, sem a linha de custo por unidade.
  3. **Erro:** `ingredientes=""` → `{ ok: false, erro: 'ingredientes_vazios', campo: 'ingredientes' }`.

## 4. `custo-de-material-artesanal` — Custo de material artesanal

- **Motor:** `tabela`.
- **Problema resolvido:** quem faz artesanato (EVA, tecido, resina etc.) quer saber quanto custaram os materiais de uma peça a partir do que efetivamente usou.
- **Entradas:**
  - Parâmetro global: `quantidade_pecas` — `inteiro`, opcional, min `1`, padrão `1` (se o custo calculado for de um lote, e não de uma peça só).
  - Linhas: `material` (`texto`, obrigatório); `quantidade_comprada` (`numero`, obrigatório, min `0.0001`); `preco_pago` (`moeda`, obrigatório, min `0`); `quantidade_usada` (`numero`, obrigatório, min `0`).
- **Processamento:** idêntico, item a item, ao de `custo-de-receita`: `custoUnitario = preco_pago / quantidade_comprada`; `custoNoItem = arred2(custoUnitario × quantidade_usada)`; `custoTotal = arred2(soma(custoNoItem))`; `custoPorPeca = arred2(custoTotal / quantidade_pecas)`.
  - Erros: `quantidade_comprada_zero`; `quantidade_pecas_invalida` (`≤ 0`); `quantidade_usada_negativa`.
- **Saídas:** tabela com `material`, `custoUnitario`, `custoNoItem`; totais `custoTotal` (destaque) e `custoPorPeca` (destaque, só quando `quantidade_pecas > 1`).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** mesmo padrão de `custo-de-receita`.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição — decisão a registrar:** esta ferramenta e `custo-de-receita` usam **a mesma fórmula** (preço pago ÷ quantidade comprada × quantidade usada, somado, dividido pelo rendimento/peças). A diferença é só o vocabulário (`ingrediente`/`rendimento` vs. `material`/`quantidade_pecas`) e o público (cozinha vs. artesanato), o que justifica manter as duas telas separadas no catálogo (intenções de busca diferentes: "custo da receita" vs. "custo do material da peça"). **Sugestão para quem for implementar:** extrair a lógica comum para uma função só (ex.: `calcularCustoPorConsumo(linhas, divisor)` em `frontend/compartilhado/`), reaproveitada pelos dois `<slug>-calculo.js`, em vez de duplicar o código.
- **Casos de teste:**
  1. **Sucesso:** `quantidade_pecas=1`; linhas: EVA (`quantidade_comprada=1`(placa), `preco_pago=8,00`, `quantidade_usada=0,25`) → `custoUnitario=8,00`, `custoNoItem=2,00`; Fita (`quantidade_comprada=10`(m), `preco_pago=3,00`, `quantidade_usada=0,5`(m)) → `custoUnitario=0,30`, `custoNoItem=0,15`. `custoTotal=2,15`; **`custoPorPeca=2,15`**.
  2. **Sucesso:** mesmas linhas multiplicadas por 5 (fizeram um lote de 5 peças iguais): `quantidade_usada` de cada material ×5, `quantidade_pecas=5` → `custoTotal=10,75`; **`custoPorPeca=2,15`** (igual ao caso 1, confere a consistência da divisão).
  3. **Erro:** linha com `quantidade_comprada=0` → `{ ok: false, erro: 'quantidade_comprada_zero', campo: 'quantidade_comprada' }`.

## 5. `valor-da-hora` — Valor da hora de trabalho

- **Motor:** `calculadora`.
- **Problema resolvido:** prestador de serviço autônomo quer saber quanto cobrar por hora para bater a renda que precisa, considerando que nem toda hora disponível é faturável.
- **Entradas:**
  - `renda_desejada_mensal` — `moeda`, obrigatório, min `0.01`.
  - `despesas_fixas_mensais` — `moeda`, opcional, min `0`, padrão `0` (custos do negócio, não pessoais — aluguel do ateliê/espaço, ferramentas etc.).
  - `horas_disponiveis_por_semana` — `numero`, obrigatório, min `1`, max `168`.
  - `semanas_por_mes` — `numero`, opcional, min `1`, max `5`, padrão `4.33` (média de semanas por mês).
  - `percentual_ocioso` — `percentual`, opcional, min `0`, max `90`, padrão `20`, com ajuda explicando "tempo que não vira trabalho faturado: administração, deslocamento, prospecção; ajuste conforme sua rotina".
- **Processamento:** `horasTotais = horas_disponiveis_por_semana × semanas_por_mes`; `horasFaturaveis = horasTotais × (1 − percentual_ocioso)`; `valorHora = arred2((renda_desejada_mensal + despesas_fixas_mensais) / horasFaturaveis)`.
  - Erros: `horas_faturaveis_zero` (quando `horasFaturaveis ≤ 0`, ex.: `percentual_ocioso = 100%` — só possível com entrada corrompida, já que o tipo `percentual` do campo limita a 90%, mas o cálculo confere de novo).
- **Saídas:** `valorHora` (`moeda`, destaque). "A conta" mostra `horasTotais` e `horasFaturaveis`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** formulário empilhado, resultado com `valorHora` em destaque grande.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `renda_desejada_mensal=3000,00`, `despesas_fixas_mensais=500,00`, `horas_disponiveis_por_semana=30`, `semanas_por_mes=4,33`, `percentual_ocioso=20%` → `horasTotais=129,9`; `horasFaturaveis=103,92`; **`valorHora=33,68`** (`3500 / 103,92 = 33,6798…`).
  2. **Sucesso:** `renda_desejada_mensal=5000,00`, `despesas_fixas_mensais=0`, `horas_disponiveis_por_semana=40`, `semanas_por_mes=4`, `percentual_ocioso=0%` → `horasTotais=160`; `horasFaturaveis=160`; **`valorHora=31,25`**.
  3. **Erro:** entrada corrompida com `percentual_ocioso=100%` (equivalente a 1,0) → `horasFaturaveis=0` → `{ ok: false, erro: 'horas_faturaveis_zero', campo: 'percentual_ocioso' }`.

## 6. `calculadora-de-tinta` — Calculadora de tinta

- **Motor:** `calculadora`.
- **Problema resolvido:** quem vai pintar quer saber quantos litros comprar e qual lata compensa mais, sem arriscar comprar pouco ou sobrar muito.
- **Coeficiente honesto:** o rendimento de uma tinta (m² por litro) varia por produto e superfície — não é uma constante do universo. O campo `rendimento_por_litro_m2` vem com um valor sugerido de **10 m²/L por demão**, dentro da faixa de 7–14 m²/L citada por fabricantes como Suvinil e Coral para tinta látex/acrílica em parede lisa; a ajuda do campo pede para o usuário confirmar o valor no rótulo da lata escolhida.
- **Entradas:**
  - `area_m2` — `numero`, obrigatório, min `0.01`.
  - `numero_demaos` — `inteiro`, obrigatório, min `1`, max `5`, padrão `2`.
  - `rendimento_por_litro_m2` — `numero`, obrigatório, min `1`, max `20`, padrão `10`.
  - `perda_percentual` — `percentual`, opcional, min `0`, max `50`, padrão `10`.
  - Grupo opcional "comparar embalagens": `tamanho_embalagem_a_litros`, `preco_embalagem_a`, `tamanho_embalagem_b_litros`, `preco_embalagem_b` (todos `numero`/`moeda`, opcionais).
- **Processamento:** `litrosBase = (area_m2 × numero_demaos) / rendimento_por_litro_m2`; `litrosNecessarios = arred2(litrosBase × (1 + perda_percentual))`. Se as embalagens A e/ou B forem informadas: `embalagensNecessarias = ceil(litrosNecessarios / tamanho_embalagem_litros)`; `custoTotal = embalagensNecessarias × preco_embalagem`; `custoPorLitro = arred2(preco_embalagem / tamanho_embalagem_litros)`; a embalagem com menor `custoTotal` para cobrir `litrosNecessarios` é destacada como "mais barata para essa área".
  - Erros: `rendimento_invalido` (`rendimento_por_litro_m2 ≤ 0`); `embalagem_invalida` (tamanho informado `≤ 0` quando o preço da mesma embalagem também foi informado).
- **Saídas:** `litrosNecessarios` (destaque); se houver embalagens, tabela comparativa com `embalagensNecessarias`, `custoTotal`, `custoPorLitro` de cada opção.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** campos principais no topo, comparação de embalagens em um bloco colapsável abaixo do resultado.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma com `area-de-paredes` (que só soma área, sem tinta).
- **Casos de teste:**
  1. **Sucesso:** `area_m2=40`, `numero_demaos=2`, `rendimento_por_litro_m2=10`, `perda_percentual=10%` → `litrosBase=8`; **`litrosNecessarios=8,80`**.
  2. **Sucesso:** `area_m2=25`, `numero_demaos=1`, `rendimento_por_litro_m2=12`, `perda_percentual=0%` → **`litrosNecessarios=2,08`** (`25/12=2,0833…`).
  3. **Erro:** `rendimento_por_litro_m2=0` → `{ ok: false, erro: 'rendimento_invalido', campo: 'rendimento_por_litro_m2' }`.

## 7. `piso-por-caixa` — Piso por caixa

- **Motor:** `calculadora`.
- **Problema resolvido:** quem vai comprar piso/revestimento quer saber quantas caixas comprar sem sobrar nem faltar.
- **Coeficiente honesto:** `area_por_caixa_m2` é informação do próprio produto (vem escrita na caixa, não é estimada pela ferramenta). `percentual_perda` é um hábito de mercado (perda por corte/quebra), sugerido em **10%** para ambientes retangulares simples, com ajuda explicando que ambientes com muitos recortes (banheiros pequenos, escadas) costumam usar até 15%; o campo é livre para o usuário ajustar.
- **Entradas:** `area_m2` (`numero`, obrigatório, min `0.01`); `area_por_caixa_m2` (`numero`, obrigatório, min `0.01`); `percentual_perda` (`percentual`, opcional, min `0`, max `30`, padrão `10`).
- **Processamento:** `areaComPerda = area_m2 × (1 + percentual_perda)`; `caixasNecessarias = ceil(areaComPerda / area_por_caixa_m2)`; `areaTotalComprada = arred2(caixasNecessarias × area_por_caixa_m2)`; `sobraM2 = arred2(areaTotalComprada − area_m2)`.
  - Erros: `area_por_caixa_invalida` (`≤ 0`).
- **Saídas:** `caixasNecessarias` (`inteiro`, destaque), `areaTotalComprada`, `sobraM2`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** 3 campos empilhados, resultado com o número de caixas em destaque grande.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `area_m2=30`, `area_por_caixa_m2=2,2`, `percentual_perda=10%` → `areaComPerda=33`; **`caixasNecessarias=ceil(33/2,2)=15`**; `areaTotalComprada=33,00`; `sobraM2=3,00`.
  2. **Sucesso:** `area_m2=18,5`, `area_por_caixa_m2=1,92`, `percentual_perda=10%` → `areaComPerda=20,35`; **`caixasNecessarias=ceil(20,35/1,92)=11`**; `areaTotalComprada=21,12`; `sobraM2=2,62`.
  3. **Erro:** `area_por_caixa_m2=0` → `{ ok: false, erro: 'area_por_caixa_invalida', campo: 'area_por_caixa_m2' }`.

## 8. `quantidade-de-rodape` — Quantidade de rodapé

- **Motor:** `calculadora`.
- **Problema resolvido:** quem vai colocar rodapé quer saber quantas barras comprar a partir do perímetro do cômodo, descontando os vãos de porta.
- **Coeficiente honesto:** `comprimento_barra_m` tem padrão sugerido de **2,4 m** (tamanho comercial comum no Brasil) e `largura_porta_padrao_m` padrão de **0,8 m** (vão de porta comum) — ambos ajustáveis, com ajuda dizendo que são valores de referência, não medidas do cômodo do usuário. `percentual_perda` segue o mesmo padrão de 10% de `piso-por-caixa`.
- **Entradas:** `perimetro_m` (`numero`, obrigatório, min `0.01`); `comprimento_barra_m` (`numero`, obrigatório, min `0.1`, padrão `2.4`); `num_portas` (`inteiro`, opcional, min `0`, padrão `0`); `largura_porta_padrao_m` (`numero`, opcional, min `0`, padrão `0.8`); `percentual_perda` (`percentual`, opcional, min `0`, max `30`, padrão `10`).
- **Processamento:** `perimetroUtil = perimetro_m − (num_portas × largura_porta_padrao_m)` (mínimo `0`); `comprimentoComPerda = perimetroUtil × (1 + percentual_perda)`; `barrasNecessarias = ceil(comprimentoComPerda / comprimento_barra_m)`.
  - Erros: `comprimento_barra_invalido` (`≤ 0`); `perimetro_invalido` (`perimetro_m ≤ 0` ou descontos maiores que o perímetro, resultando em `perimetroUtil` negativo antes do corte para `0`... nesse caso não é erro, apenas resulta em `0` barras, mas exibe aviso).
- **Saídas:** `barrasNecessarias` (`inteiro`, destaque).
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** campos empilhados.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `perimetro_m=20`, `num_portas=1`, `largura_porta_padrao_m=0,8`, `percentual_perda=10%` → `perimetroUtil=19,2`; `comprimentoComPerda=21,12`; **`barrasNecessarias=ceil(21,12/2,4)=9`**.
  2. **Sucesso:** `perimetro_m=12`, `num_portas=0`, `percentual_perda=0%` → `perimetroUtil=12`; **`barrasNecessarias=ceil(12/2,4)=5`** (exato).
  3. **Erro:** `comprimento_barra_m=0` → `{ ok: false, erro: 'comprimento_barra_invalido', campo: 'comprimento_barra_m' }`.

## 9. `papel-de-parede` — Papel de parede

- **Motor:** `calculadora`.
- **Problema resolvido:** quem vai colocar papel de parede quer saber quantos rolos comprar considerando a altura da parede e a repetição do desenho.
- **Coeficiente honesto:** `largura_rolo_m` (padrão `0.53`) e `altura_rolo_m` (padrão `10`) são o tamanho do rolo comercial padrão vendido no Brasil — informação do produto, ajustável se o rolo escolhido for diferente. `repeticao_padrao_m` é a altura do "rapport" (repetição do desenho) impressa na embalagem do papel escolhido, `0` quando o padrão é liso/sem repetição.
- **Entradas:** `largura_parede_m` (`numero`, obrigatório, min `0.1`); `altura_parede_m` (`numero`, obrigatório, min `0.1`); `largura_rolo_m` (`numero`, obrigatório, min `0.1`, padrão `0.53`); `altura_rolo_m` (`numero`, obrigatório, min `1`, padrão `10`); `repeticao_padrao_m` (`numero`, opcional, min `0`, padrão `0`); `percentual_perda` (`percentual`, opcional, min `0`, max `30`, padrão `10`).
- **Processamento:** `faixasPorParede = ceil(largura_parede_m / largura_rolo_m)`; `alturaEfetivaPorFaixa = repeticao_padrao_m > 0 ? ceil(altura_parede_m / repeticao_padrao_m) × repeticao_padrao_m : altura_parede_m`; `comprimentoTotalNecessario = faixasPorParede × alturaEfetivaPorFaixa × (1 + percentual_perda)`; `rolosNecessarios = ceil(comprimentoTotalNecessario / altura_rolo_m)`.
  - Erros: `largura_rolo_invalida` (`≤ 0`); `altura_rolo_invalida` (`≤ 0`).
- **Saídas:** `rolosNecessarios` (`inteiro`, destaque), `faixasPorParede` como auxiliar.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** campos empilhados; o campo `repeticao_padrao_m` vem com um "?" explicando onde achar essa medida na embalagem.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso (sem repetição de padrão):** `largura_parede_m=4`, `altura_parede_m=2,6`, `largura_rolo_m=0,53`, `altura_rolo_m=10`, `repeticao_padrao_m=0`, `percentual_perda=10%` → `faixasPorParede=ceil(4/0,53)=8`; `alturaEfetivaPorFaixa=2,6`; `comprimentoTotalNecessario=8×2,6×1,10=22,88`; **`rolosNecessarios=ceil(22,88/10)=3`**.
  2. **Sucesso (parede maior, sem perda):** `largura_parede_m=6`, `altura_parede_m=2,5`, demais padrão, `percentual_perda=0%` → `faixasPorParede=ceil(6/0,53)=12`; `comprimentoTotalNecessario=12×2,5=30`; **`rolosNecessarios=ceil(30/10)=3`**.
  3. **Erro:** `largura_rolo_m=0` → `{ ok: false, erro: 'largura_rolo_invalida', campo: 'largura_rolo_m' }`.

## 10. `area-de-rejunte` — Área e quantidade de rejunte

- **Motor:** `calculadora`.
- **Problema resolvido:** quem vai assentar revestimento quer saber quantos kg de rejunte comprar, sem chutar.
- **Fórmula técnica (com fonte, não é um "achismo"):** consumo por m² segundo a fórmula da ANFACER (Associação Nacional dos Fabricantes de Cerâmica para Revestimentos), usada por fabricantes de rejunte e sites técnicos do setor: `consumo(kg/m²) = ((A + B) / (A × B)) × E × J × CR`, onde `A` e `B` são o comprimento e a largura da peça em mm, `E` a espessura da peça em mm, `J` a largura da junta em mm, e `CR` o coeficiente do tipo de rejunte (**1,6** para cimentício, **1,7** para epóxi).
- **Entradas:** `area_revestida_m2` (`numero`, obrigatório, min `0.01`); `comprimento_peca_mm` (`numero`, obrigatório, min `10`); `largura_peca_mm` (`numero`, obrigatório, min `10`); `espessura_peca_mm` (`numero`, obrigatório, min `1`, padrão `8`); `largura_junta_mm` (`numero`, obrigatório, min `0.5`, padrão `3`); `tipo_rejunte` (`opcao`, obrigatório, valores `cimenticio | epoxi`, padrão `cimenticio`).
- **Processamento:** `CR = tipo_rejunte === 'epoxi' ? 1.7 : 1.6`; `consumoPorM2 = ((comprimento_peca_mm + largura_peca_mm) / (comprimento_peca_mm × largura_peca_mm)) × espessura_peca_mm × largura_junta_mm × CR`; `massaTotalKg = arred2(consumoPorM2 × area_revestida_m2)`.
  - Erros: `dimensao_invalida` (qualquer uma de `comprimento_peca_mm`, `largura_peca_mm`, `espessura_peca_mm`, `largura_junta_mm` `≤ 0`).
- **Saídas:** `massaTotalKg` (`moeda`? não — `numero` com 2 casas e unidade "kg", destaque), `consumoPorM2` como auxiliar.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** campos empilhados; `tipo_rejunte` como seletor de dois botões (cimentício/epóxi).
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `area_revestida_m2=20`, peça `450×450 mm`, `espessura_peca_mm=9`, `largura_junta_mm=2`, `tipo_rejunte=cimenticio` (`CR=1,6`) → `consumoPorM2 = ((450+450)/(450×450)) × 9 × 2 × 1,6 = 0,128 kg/m²`; **`massaTotalKg = 0,128 × 20 = 2,56`**.
  2. **Sucesso:** `area_revestida_m2=15`, peça `300×300 mm`, `espessura_peca_mm=8`, `largura_junta_mm=3`, `tipo_rejunte=epoxi` (`CR=1,7`) → `consumoPorM2 = ((300+300)/(300×300)) × 8 × 3 × 1,7 = 0,272 kg/m²`; **`massaTotalKg = 0,272 × 15 = 4,08`**.
  3. **Erro:** `comprimento_peca_mm=0` → `{ ok: false, erro: 'dimensao_invalida', campo: 'comprimento_peca_mm' }`.

## 11. `area-de-paredes` — Área de paredes e tetos

- **Motor:** `tabela`.
- **Problema resolvido:** quem vai reformar quer somar a área de várias paredes/tetos de uma vez, descontando porta e janela, sem fazer conta separada de cada parede no papel.
- **Entradas:** linhas: `ambiente` (`texto`, obrigatório — nome livre, ex. "Parede da sala"); `tipo` (`opcao`, obrigatório, `parede | teto`); `largura_m` (`numero`, obrigatório, min `0.01`); `altura_m` (`numero`, obrigatório, min `0.01` — no caso de teto, é o comprimento do outro lado); `qtd_portas` (`inteiro`, opcional, min `0`, padrão `0`); `area_porta_m2` (`numero`, opcional, min `0`, padrão `1.68`, com ajuda "porta padrão 0,8 × 2,10 m; ajuste se for diferente"); `qtd_janelas` (`inteiro`, opcional, min `0`, padrão `0`); `area_janela_m2` (`numero`, opcional, min `0`, padrão `1.2`, com ajuda "janela padrão 1,2 × 1,0 m; ajuste se for diferente").
- **Processamento:** por linha, `areaBruta = largura_m × altura_m`; `areaDescontos = (qtd_portas × area_porta_m2) + (qtd_janelas × area_janela_m2)`; `areaUtil = max(0, arred2(areaBruta − areaDescontos))`. Total: `areaTotal = arred2(soma(areaUtil))`.
  - Erros: `dimensao_invalida` (`largura_m ≤ 0` ou `altura_m ≤ 0`).
- **Saídas:** tabela com `ambiente`, `tipo`, `areaUtil`; total `areaTotal` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** cartão por linha.
- **Viabilidade:** 100% local, geometria pura; nenhuma biblioteca nova.
- **Sobreposição:** os campos de porta/janela poderiam alimentar diretamente `calculadora-de-tinta` e `papel-de-parede` (a área útil calculada aqui é a mesma `area_m2` que essas duas ferramentas pedem) — não é sobreposição de tela, é uma oportunidade de o usuário calcular aqui primeiro e levar o número para lá; nenhuma ação de unificação necessária.
- **Casos de teste:**
  1. **Sucesso:** linha 1 `ambiente="Parede da sala"`, `tipo=parede`, `largura_m=5`, `altura_m=2,8`, `qtd_portas=1`, `qtd_janelas=1` (padrões de área) → `areaBruta=14`; `areaDescontos=1,68+1,2=2,88`; `areaUtil=11,12`. Linha 2 `ambiente="Teto da sala"`, `tipo=teto`, `largura_m=5`, `altura_m=4`, sem descontos → `areaUtil=20`. **`areaTotal=31,12`**.
  2. **Sucesso:** linha única `largura_m=3`, `altura_m=2,6`, sem portas/janelas → **`areaTotal=7,80`**.
  3. **Erro:** `largura_m=0` → `{ ok: false, erro: 'dimensao_invalida', campo: 'largura_m' }`.

## 12. `molde-de-caixa` — Molde de caixa

- **Motor:** `folha` — o resultado é um desenho (SVG) para imprimir e cortar.
- **Problema resolvido:** quem embala produtos artesanais quer o molde de uma caixa nas medidas exatas do que vai guardar, em vez de tentar adaptar um molde pronto de tamanho errado.
- **Modelo geométrico (planificação tipo caixa com tampa solta — decisão de design, não é uma "verdade de mercado" a confirmar, é geometria verificável):** a chapa mínima necessária, com a caixa e a tampa desenhadas lado a lado com margem de colagem, tem `larguraChapa = 2 × (comprimento_interno_mm + altura_interna_mm) + margem_colagem_mm` e `alturaChapa = 2 × (largura_interna_mm + altura_interna_mm) + margem_colagem_mm`.
- **Entradas:** `comprimento_interno_mm` (`numero`, obrigatório, min `10`); `largura_interna_mm` (`numero`, obrigatório, min `10`); `altura_interna_mm` (`numero`, obrigatório, min `10`); `com_tampa` (`marcador`, opcional, padrão `false`); `margem_colagem_mm` (`numero`, opcional, min `0`, padrão `15`).
- **Processamento:** `larguraChapa = 2 × (comprimento_interno_mm + altura_interna_mm) + margem_colagem_mm`; `alturaChapa = 2 × (largura_interna_mm + altura_interna_mm) + margem_colagem_mm`. O SVG desenha os painéis com linha cheia nos cortes e tracejada nas dobras; se `com_tampa`, desenha um segundo conjunto de painéis para a tampa (dimensões internas iguais, altura reduzida).
  - Erros: `dimensao_invalida` (qualquer uma das três dimensões internas `≤ 0`).
- **Saídas:** desenho SVG do molde; `larguraChapa` e `alturaChapa` (a folha/chapa mínima necessária) como resultado numérico auxiliar.
- **Exportação e Plus:** `svg`, `pdf`, `imprimir` — grátis.
- **Celular (390px):** pré‑visualização do molde com zoom por pinça; os campos de medida ficam numa aba separada do desenho.
- **Viabilidade:** 100% local, geometria + SVG; nenhuma biblioteca nova.
- **Sobreposição:** compartilha a ideia de "planificação com margem de colagem" com `molde-de-envelope` e `divisorias-de-caixa` — mesma lógica de desenho de linha de corte/dobra pode virar uma função comum de baixo nível (ex.: "desenhar retângulo com aba", "linha tracejada de dobra") em `frontend/compartilhado/`.
- **Casos de teste:**
  1. **Sucesso:** `comprimento_interno_mm=100`, `largura_interna_mm=80`, `altura_interna_mm=50`, `margem_colagem_mm=15` → `larguraChapa = 2×(100+50)+15 = 315`; `alturaChapa = 2×(80+50)+15 = 275`.
  2. **Sucesso (caixa quadrada):** `comprimento_interno_mm=200`, `largura_interna_mm=200`, `altura_interna_mm=100`, `margem_colagem_mm=20` → `larguraChapa = 2×(200+100)+20 = 620`; `alturaChapa = 2×(200+100)+20 = 620`.
  3. **Erro:** `altura_interna_mm=0` → `{ ok: false, erro: 'dimensao_invalida', campo: 'altura_interna_mm' }`.

## 13. `molde-de-envelope` — Molde de envelope

- **Motor:** `folha`.
- **Problema resolvido:** quem vai guardar um cartão ou papel específico quer um envelope do tamanho exato, sem sobra nem aperto.
- **Modelo geométrico (envelope reto com aba triangular de fechamento — decisão de design):** `larguraInterna = largura_conteudo_mm + 2 × folga_mm`; `comprimentoInterno = comprimento_conteudo_mm + 2 × folga_mm`; `larguraChapa = larguraInterna + 2 × margem_lateral_colagem_mm`; `alturaChapa = comprimentoInterno + aba_fechamento_mm + margem_base_colagem_mm`.
- **Entradas:** `comprimento_conteudo_mm` (`numero`, obrigatório, min `10`); `largura_conteudo_mm` (`numero`, obrigatório, min `10`); `folga_mm` (`numero`, opcional, min `0`, padrão `3`); `aba_fechamento_mm` (`numero`, opcional, min `5`, padrão `40`); `margem_lateral_colagem_mm` (`numero`, opcional, min `0`, padrão `10`); `margem_base_colagem_mm` (`numero`, opcional, min `0`, padrão `10`).
- **Processamento:** conforme fórmulas acima.
  - Erros: `dimensao_invalida` (`comprimento_conteudo_mm ≤ 0` ou `largura_conteudo_mm ≤ 0`).
- **Saídas:** desenho SVG do molde; `larguraChapa`, `alturaChapa` como resultado numérico.
- **Exportação e Plus:** `svg`, `pdf`, `imprimir` — grátis.
- **Celular (390px):** igual a `molde-de-caixa`.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** ver nota em `molde-de-caixa`.
- **Casos de teste:**
  1. **Sucesso (cartão A6, 148×105 mm):** `comprimento_conteudo_mm=148`, `largura_conteudo_mm=105`, `folga_mm=3`, `aba_fechamento_mm=40`, margens padrão `10` → `larguraInterna=105+6=111`; `comprimentoInterno=148+6=154`; `larguraChapa=111+20=131`; **`alturaChapa=154+40+10=204`**.
  2. **Sucesso (cartão de visita, 90×50 mm):** `comprimento_conteudo_mm=90`, `largura_conteudo_mm=50`, `folga_mm=2`, `aba_fechamento_mm=25`, margens padrão `10` → `larguraInterna=54`; `comprimentoInterno=94`; `larguraChapa=74`; **`alturaChapa=94+25+10=129`**.
  3. **Erro:** `comprimento_conteudo_mm=0` → `{ ok: false, erro: 'dimensao_invalida', campo: 'comprimento_conteudo_mm' }`.

## 14. `divisorias-de-caixa` — Divisórias de caixa

- **Motor:** `folha`.
- **Problema resolvido:** quem embala peças frágeis (doces, sabonetes, velas) quer dividir a caixa em compartimentos iguais, sem medir cada divisória manualmente.
- **Modelo geométrico (grade tipo "caixa de ovos", com ranhuras de encaixe):** `numDivisoriasLongitudinais = num_compartimentos_largura − 1` (peças que cortam ao longo do comprimento, uma para cada divisão na largura); `numDivisoriasTransversais = num_compartimentos_comprimento − 1`; cada divisória transversal tem comprimento igual a `largura_interna_caixa_mm`; cada divisória longitudinal tem comprimento igual a `comprimento_interno_caixa_mm`; a altura de todas é `altura_divisoria_mm`.
- **Entradas:** `comprimento_interno_caixa_mm` (`numero`, obrigatório, min `10`); `largura_interna_caixa_mm` (`numero`, obrigatório, min `10`); `altura_divisoria_mm` (`numero`, obrigatório, min `5`); `num_compartimentos_comprimento` (`inteiro`, obrigatório, min `1`); `num_compartimentos_largura` (`inteiro`, obrigatório, min `1`).
- **Processamento:** conforme fórmulas acima; `totalPecas = numDivisoriasLongitudinais + numDivisoriasTransversais`.
  - Erros: `compartimentos_invalido` (`num_compartimentos_comprimento ≤ 0` ou `num_compartimentos_largura ≤ 0`).
- **Saídas:** desenho SVG de cada peça de divisória com as ranhuras de encaixe posicionadas; `totalPecas` como resultado numérico.
- **Exportação e Plus:** `svg`, `pdf`, `imprimir` — grátis.
- **Celular (390px):** igual a `molde-de-caixa`.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** ver nota em `molde-de-caixa`; além disso, poderia futuramente ler as medidas internas geradas por `molde-de-caixa` em vez de o usuário digitar de novo — não é obrigatório para esta onda, só uma observação para o backlog.
- **Casos de teste:**
  1. **Sucesso:** caixa `300×200 mm`, `altura_divisoria_mm=80`, `num_compartimentos_comprimento=3`, `num_compartimentos_largura=2` → `numDivisoriasTransversais = 3−1 = 2` peças de `200 mm`; `numDivisoriasLongitudinais = 2−1 = 1` peça de `300 mm`; **`totalPecas=3`**.
  2. **Sucesso:** `num_compartimentos_comprimento=2`, `num_compartimentos_largura=2` → `numDivisoriasTransversais=1` (`200 mm`); `numDivisoriasLongitudinais=1` (`300 mm`); **`totalPecas=2`**.
  3. **Erro:** `num_compartimentos_comprimento=0` → `{ ok: false, erro: 'compartimentos_invalido', campo: 'num_compartimentos_comprimento' }`.

## 15. `calculadora-de-churrasco` — Calculadora de churrasco e almoço em grupo

- **Motor:** `calculadora`.
- **Problema resolvido:** quem organiza um churrasco quer saber quanta carne, bebida e acompanhamento comprar para não faltar nem sobrar demais.
- **Coeficiente honesto:** os valores por pessoa vêm com padrão sugerido, ajustável, com a ajuda citando a referência: **400 g de carne por adulto** e **150 g por criança** é a recomendação usual de casas de carne e sites especializados (ex.: Seara, iFood) para um churrasco de 4–5 horas com acompanhamentos; ajuste para 300 g se o cardápio tiver muitos acompanhamentos substanciais, ou 500 g se a carne for o destaque.
- **Entradas:** `num_adultos` (`inteiro`, obrigatório, min `1`); `num_criancas` (`inteiro`, opcional, min `0`, padrão `0`); `gramas_carne_por_adulto` (`numero`, obrigatório, min `1`, padrão `400`); `gramas_carne_por_crianca` (`numero`, obrigatório, min `1`, padrão `150`); `litros_bebida_por_pessoa` (`numero`, obrigatório, min `0.1`, padrão `1.5`); `gramas_acompanhamento_por_pessoa` (`numero`, obrigatório, min `1`, padrão `200`).
- **Processamento:** `totalPessoas = num_adultos + num_criancas`; `carneTotalKg = arred2((num_adultos × gramas_carne_por_adulto + num_criancas × gramas_carne_por_crianca) / 1000)`; `bebidaTotalLitros = arred2(totalPessoas × litros_bebida_por_pessoa)`; `acompanhamentoTotalKg = arred2(totalPessoas × gramas_acompanhamento_por_pessoa / 1000)`.
  - Erros: `adultos_invalido` (`num_adultos ≤ 0`).
- **Saídas:** `carneTotalKg` (destaque), `bebidaTotalLitros`, `acompanhamentoTotalKg`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** os 4 valores padrão vêm pré‑preenchidos, para quem só quer o número rápido sem editar nada.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** mesma estrutura de "quantidade por pessoa × pessoas" de `festa-infantil` — telas mantidas separadas por serem eventos com perfis de consumo muito diferentes (churrasco de adultos vs. festa infantil).
- **Casos de teste:**
  1. **Sucesso:** `num_adultos=20`, `num_criancas=5`, valores padrão → `carneTotalKg = (20×400 + 5×150)/1000 = 8,75`; `bebidaTotalLitros = 25×1,5 = 37,50`; `acompanhamentoTotalKg = 25×0,2 = 5,00`.
  2. **Sucesso:** `num_adultos=10`, `num_criancas=0`, valores padrão → `carneTotalKg=4,00`; `bebidaTotalLitros=15,00`; `acompanhamentoTotalKg=2,00`.
  3. **Erro:** `num_adultos=0` → `{ ok: false, erro: 'adultos_invalido', campo: 'num_adultos' }`.

## 16. `festa-infantil` — Planejador de festa infantil

- **Motor:** `calculadora`.
- **Problema resolvido:** quem organiza uma festa infantil quer saber quanto salgado, doce, bolo e bebida comprar por número de convidados.
- **Coeficiente honesto:** valores por pessoa vêm com padrão sugerido e ajustável — referência usual de buffets infantis para uma festa de 2–3 horas: **6 salgados por criança**, **8 por adulto**, **3 doces por pessoa**, **100 g de bolo por pessoa**, **0,4 L de bebida por pessoa**. O texto de ajuda explica que são pontos de partida, não uma regra fixa.
- **Entradas:** `num_criancas` (`inteiro`, obrigatório, min `1`); `num_adultos` (`inteiro`, opcional, min `0`, padrão `0`); `salgados_por_crianca` (`numero`, obrigatório, min `1`, padrão `6`); `salgados_por_adulto` (`numero`, obrigatório, min `1`, padrão `8`); `doces_por_pessoa` (`numero`, obrigatório, min `1`, padrão `3`); `gramas_bolo_por_pessoa` (`numero`, obrigatório, min `10`, padrão `100`); `litros_bebida_por_pessoa` (`numero`, obrigatório, min `0.1`, padrão `0.4`).
- **Processamento:** `totalPessoas = num_criancas + num_adultos`; `salgadosTotal = arred0(num_criancas × salgados_por_crianca + num_adultos × salgados_por_adulto)`; `docesTotal = arred0(totalPessoas × doces_por_pessoa)`; `boloTotalKg = arred2(totalPessoas × gramas_bolo_por_pessoa / 1000)`; `bebidaTotalLitros = arred2(totalPessoas × litros_bebida_por_pessoa)`.
  - Erros: `criancas_invalido` (`num_criancas ≤ 0`).
- **Saídas:** `salgadosTotal` (destaque, `inteiro`), `docesTotal`, `boloTotalKg`, `bebidaTotalLitros`.
- **Exportação e Plus:** `copiar`, `pdf` — grátis.
- **Celular (390px):** mesmo padrão de `calculadora-de-churrasco`.
- **Viabilidade:** 100% local; nenhuma biblioteca nova.
- **Sobreposição:** ver nota em `calculadora-de-churrasco`.
- **Casos de teste:**
  1. **Sucesso:** `num_criancas=20`, `num_adultos=15`, valores padrão → `salgadosTotal = 20×6 + 15×8 = 240`; `docesTotal = 35×3 = 105`; `boloTotalKg = 35×0,1 = 3,50`; `bebidaTotalLitros = 35×0,4 = 14,00`.
  2. **Sucesso:** `num_criancas=10`, `num_adultos=0`, valores padrão → `salgadosTotal=60`; `docesTotal=30`; `boloTotalKg=1,00`; `bebidaTotalLitros=4,00`.
  3. **Erro:** `num_criancas=0` → `{ ok: false, erro: 'criancas_invalido', campo: 'num_criancas' }`.

## 17. `lista-de-convidados` — Lista de convidados

- **Motor:** `tabela`.
- **Problema resolvido:** quem organiza um evento quer controlar quem confirmou presença sem montar uma planilha.
- **Onde os dados ficam:** conforme o manifesto ("com os nomes salvos no aparelho"), esta ferramenta guarda as linhas **no navegador do usuário** (mesmo mecanismo local já usado por outras ferramentas com estado, não no banco de dados do servidor descrito em `docs/contratos.md` §7) — os dados não saem do aparelho, exceto quando o usuário exporta.
- **Entradas:** linhas: `nome` (`texto`, obrigatório); `status` (`opcao`, obrigatório, valores `confirmado | pendente | recusado`, padrão `pendente`); `acompanhantes` (`inteiro`, opcional, min `0`, padrão `0`); `observacao` (`texto`, opcional).
- **Processamento:** `totalConvidados = count(linhas)`; `totalConfirmados = count(status === 'confirmado')`; `totalPendentes = count(status === 'pendente')`; `totalRecusados = count(status === 'recusado')`; `pessoasEstimadas = soma((1 + acompanhantes) para linhas com status === 'confirmado')` (estimativa conservadora: só conta quem já confirmou).
  - Erros: `nome_vazio`.
- **Saídas:** tabela de convidados; resumo com `totalConvidados`, `totalConfirmados`, `totalPendentes`, `totalRecusados`, `pessoasEstimadas` (destaque).
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista com filtro por status (abas "Todos/Confirmados/Pendentes/Recusados") em vez de tabela larga.
- **Viabilidade:** 100% local (armazenamento no navegador); nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `[{nome:"Ana",status:"confirmado",acompanhantes:1}, {nome:"Bruno",status:"pendente",acompanhantes:0}, {nome:"Carla",status:"confirmado",acompanhantes:2}]` → `totalConvidados=3`; `totalConfirmados=2`; `totalPendentes=1`; `totalRecusados=0`; **`pessoasEstimadas = (1+1)+(1+2) = 5`**.
  2. **Sucesso:** `[{nome:"Duda",status:"recusado",acompanhantes:0}]` → `totalConvidados=1`; `totalConfirmados=0`; `totalRecusados=1`; **`pessoasEstimadas=0`**.
  3. **Erro:** linha com `nome=""` → `{ ok: false, erro: 'nome_vazio', campo: 'nome' }`.

## 18. `cronograma-de-evento` — Cronograma do evento

- **Motor:** `tabela`.
- **Problema resolvido:** quem organiza um evento quer saber a que horas começar cada etapa de preparação para tudo estar pronto na hora certa.
- **Entradas:** parâmetro global `horario_evento` (`hora`, obrigatório — horário em que o evento começa). Linhas, em **ordem cronológica de preparo** (a primeira linha é a etapa mais antecipada): `etapa` (`texto`, obrigatório); `duracao_minutos` (`inteiro`, obrigatório, min `1`).
- **Processamento:** cálculo **retroativo**, percorrendo as linhas da última para a primeira: `cursor = horario_evento`; para cada linha, na ordem inversa: `fimEtapa = cursor`; `inicioEtapa = fimEtapa − duracao_minutos`; `cursor = inicioEtapa`. O resultado é remontado na ordem cronológica original, cada linha com `inicioEtapa` e `fimEtapa` calculados. Se o horário resultante cruzar a meia‑noite do dia anterior, a ferramenta mostra o horário normalmente (ex.: `23:40`) sem tentar adivinhar a data.
  - Erros: `duracao_invalida` (`duracao_minutos ≤ 0`); `etapa_vazia`.
- **Saídas:** tabela com `etapa`, `inicioEtapa`, `fimEtapa`.
- **Exportação e Plus:** `csv`, `pdf` — grátis.
- **Celular (390px):** lista vertical em ordem cronológica, com uma linha do tempo visual simples (traço vertical ligando os horários).
- **Viabilidade:** 100% local, aritmética de horário; nenhuma biblioteca nova.
- **Sobreposição:** nenhuma.
- **Casos de teste:**
  1. **Sucesso:** `horario_evento=18:00`; linhas (em ordem): `"Fazer massa"` (60 min), `"Assar bolo"` (45 min), `"Decorar"` (30 min), `"Montar mesa"` (20 min). Calculando de trás para frente: Montar mesa `17:40–18:00`; Decorar `17:10–17:40`; Assar bolo `16:25–17:10`; **Fazer massa `15:25–16:25`**.
  2. **Sucesso:** `horario_evento=14:00`; 1 linha `"Preparar tudo"` (180 min) → **`inicioEtapa=11:00`, `fimEtapa=14:00`**.
  3. **Erro:** linha com `duracao_minutos=0` → `{ ok: false, erro: 'duracao_invalida', campo: 'duracao_minutos' }`.
