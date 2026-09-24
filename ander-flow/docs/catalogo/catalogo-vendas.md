# Catálogo — vendas

Especificação das 11 ferramentas **planejadas** da categoria `vendas`. Todas com plano **gratis** e `recursos_plus: []` — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| orcamento | documento | sim, com ressalva | não | "link para cliente" precisa de rota nova (ver decisão pendente D) |
| comissao | calculadora | sim | não | faixas escalonadas (ver decisão pendente B) |
| ficha-de-cliente | interativo | sim | não | CRUD local persistente, exceção do §15.1 |
| follow-up | documento | sim | não | template determinístico, sem cálculo numérico |
| funil-de-vendas | tabela | sim | não | — |
| meta-de-faturamento | calculadora | sim | não | — |
| pedido-de-venda | documento | sim | não | itens (ver decisão pendente B) |
| previsao-de-vendas | tabela | sim | não | taxa de crescimento é opcional (senão calculada do histórico) |
| script-de-abordagem | documento | sim | não | template determinístico, sem cálculo numérico |
| ticket-medio | calculadora | sim | não | — |
| calculadora-de-nps | calculadora | sim | não | entrada em `area-texto`, sem tabela |

## Decisão pendente B — campo tipo `lista` (linhas repetíveis dentro de `calculadora`/`documento`)

Os tipos de campo do §15.3 (`numero, inteiro, moeda, percentual, texto, area-texto, opcao, marcador, data, hora`) não incluem um "sub-formulário repetível" (uma lista de linhas com sub-campos tipados, dentro de uma ferramenta que por tudo o resto é `calculadora` ou `documento`, não uma tabela inteira). Isso aparece em:
- **comissao** — a lista de faixas (`ateValor`, `percentual`) quando `modo=escalonada`;
- **orcamento** e **pedido-de-venda** — a lista de itens (`descricao`, `quantidade`, `precoUnitario`) dentro de um documento que também tem cliente, desconto, validade;
- (na categoria operações) **calculadora-de-frete** — a lista de transportadoras a comparar.

Isso é diferente do motor `tabela` (§15.2): lá a ferramenta *inteira* é a tabela. Aqui a lista é só uma peça dentro de um formulário maior. **Proposta (não bloqueante):** as ferramentas abaixo foram especificadas assumindo um número máximo fixo de linhas expresso como campos numerados (ex.: até 5 faixas, até 20 itens) tratados no `<slug>.js` gerado como um bloco repetível simples (adicionar/remover linha, sem exigir um tipo de campo novo no `<slug>-definicao.json` — cada linha é só um grupo de 3 campos que se repete). Se o dono do motor quiser oficializar isso, a extensão sugerida é um tipo de campo `"tipo": "lista"` com `"campos"` aninhados e `"min"/"max"` linhas.

## Decisão pendente D — "link para o cliente" em `orcamento`

O manifesto descreve `orcamento` como exportando "PDF, planilha e **link para o cliente**". Com processamento 100% no navegador (sem servidor guardando o orçamento), um link só funciona se (a) o orçamento for salvo como Trabalho (exige sessão, §11 já tem `POST /api/trabalhos`) e (b) existir uma rota **pública** de leitura desse trabalho (`GET /trabalhos/:id` sem sessão, só para quem tem o link) — essa rota pública não existe hoje no contrato (§2/§11 só listam rotas de trabalho autenticadas). **Proposta honesta para esta especificação:** por ora, `orcamento` exporta PDF, CSV/XLSX e "copiar como texto" (para colar em WhatsApp/e-mail); o "link para o cliente" fica marcado como **pendente**, dependente de uma rota pública nova (fora do escopo de propriedade desta especificação — fica registrado para o orquestrador decidir se cria `GET /orcamentos/:token` como página pública somente-leitura).

---

## orcamento

**Motor:** `documento` — cliente, desconto e validade são campos de cabeçalho; os itens são a lista repetível (ver decisão pendente B); a saída é uma pré-visualização formatada para imprimir/exportar, não uma tabela solta.

**Problema resolvido:** montar um orçamento com vários itens, desconto e validade, sem template de Word, pronto para mandar ao cliente.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nomeCliente` | texto | não | 0–120 caracteres | "" |
| `itens[].descricao` | texto | sim (cada item) | 1–120 caracteres | — |
| `itens[].quantidade` | numero | sim (cada item) | min 0,01, max 999999 | 1 |
| `itens[].precoUnitario` | moeda | sim (cada item) | min 0 | — |
| `descontoPercentual` | percentual | não | min 0, max 100 | 0 |
| `validadeDias` | inteiro | não | min 1, max 365 | 15 |

Mínimo 1 item, máximo 40.

**Processamento:**
```
subtotal      = Σ (quantidade[i] × precoUnitario[i])
descontoValor = subtotal × descontoPercentual / 100
total         = subtotal - descontoValor
dataValidade  = hoje + validadeDias dias
```
Arredondamento: 2 casas em todo valor monetário.
Erros: nenhum item → `itens_insuficientes`; `quantidade` ≤ 0 ou `precoUnitario` < 0 em algum item → `item_invalido`; `descontoPercentual` > 100 → `desconto_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `subtotal` | moeda | não |
| `descontoValor` | moeda | não |
| `total` | moeda | sim |
| `dataValidade` | data | não |

**Exportação:** pdf, csv/xlsx (itens), copiar (texto formatado para WhatsApp/e-mail). "Link para o cliente": **pendente** (ver decisão D). Sem Plus.

**Celular 390px:** cada item vira um cartão empilhado (descrição, quantidade, preço, subtotal da linha) em vez de colunas lado a lado, para não cortar a descrição.

**Viabilidade no navegador:** cálculo 100% local, sem biblioteca; PDF via `pdf-lib` já usado no projeto (`gerarPdfResumo`, §12).

**Sobreposição:** relacionada com `pedido-de-venda` — o orçamento é a proposta (antes da venda, com validade e desconto negociável); o pedido é o registro depois que o cliente já confirmou (com prazo de entrega, sem desconto negociável). Diferentes o bastante para não fundir; ficam **relacionadas**.

**Casos de teste:**
1. Itens: "Bolo de 2kg" (qtd 1, preço 120,00), "Docinhos" (qtd 50, preço 2,00) → `subtotal = 120+100 = 220,00`; `descontoPercentual=10%` → `descontoValor=22,00`; `total=198,00`.
2. 1 item (qtd 3, preço 15,00), sem desconto → `subtotal=45,00`, `total=45,00`.
3. Erro: item com `quantidade=0` → `{ ok:false, erro:'item_invalido', campo:'itens' }`.

---

## comissao

**Motor:** `calculadora` (2 modos — ver decisão pendente A em `catalogo-calculo.md` — e faixas repetíveis quando `modo=escalonada` — ver decisão pendente B acima).

**Problema resolvido:** calcular a comissão do vendedor, seja um percentual fixo, seja escalonada por faixa de meta atingida.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo` | opcao (`simples`\|`escalonada`) | não | — | `simples` |
| `vendas` | moeda | sim | min 0 | — |
| `percentualSimples` | percentual | obrigatório se `modo=simples` | min 0, max 100 | — |
| `faixas[].ate` | moeda | obrigatório se `modo=escalonada` (até 5 faixas; a última pode ficar em branco = "sem limite") | min > faixa anterior | — |
| `faixas[].percentual` | percentual | obrigatório se `modo=escalonada` | min 0, max 100 | — |
| `descontoPercentual` | percentual | não (ex.: imposto sobre a comissão) | min 0, max 100 | 0 |

**Processamento:**
```
simples:     comissaoBruta = vendas × percentualSimples / 100
escalonada:  marginal por faixa — cada faixa de "ate" cobra seu percentual só sobre a
             parte de "vendas" que cai dentro dela (igual IR progressivo):
               restante = vendas; anterior = 0; comissaoBruta = 0
               para cada faixa em ordem crescente de "ate":
                 largura = faixa.ate - anterior
                 valorNaFaixa = min(restante, largura)
                 comissaoBruta += valorNaFaixa × faixa.percentual / 100
                 restante -= valorNaFaixa; anterior = faixa.ate
comissaoLiquida = comissaoBruta × (1 - descontoPercentual/100)
```
Arredondamento: 2 casas no resultado final; a soma marginal usa os valores não arredondados internamente.
Erros: `modo=simples` e `percentualSimples` < 0 → `percentual_invalido`; `modo=escalonada` e faixas fora de ordem crescente (`faixas[i].ate ≤ faixas[i-1].ate`) → `faixas_invalidas`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `comissaoBruta` | moeda | não |
| `comissaoLiquida` | moeda | sim |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** faixas empilham uma por uma; sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `modo=simples`, `vendas=50000,00`, `percentualSimples=5%` → `comissaoBruta=2500,00`.
2. `modo=escalonada`, `vendas=25000,00`, faixas `[{ate:10000,percentual:3},{ate:20000,percentual:5},{ate:null,percentual:8}]` → faixa 1: 10000×3%=300; faixa 2: 10000×5%=500; faixa 3: 5000×8%=400 → `comissaoBruta=1200,00`.
3. Erro: `modo=escalonada`, faixas `[{ate:20000,percentual:5},{ate:10000,percentual:8}]` (fora de ordem) → `{ ok:false, erro:'faixas_invalidas', campo:'faixas' }`.

---

## ficha-de-cliente

**Motor:** `interativo` (exceção justificada do §15.1) — precisa **persistir** os cadastros entre visitas (não só durante a sessão da página, como um rascunho comum), com busca e exclusão; isso não é o modelo "campos → resultado" nem "linhas → CSV/PDF" sem estado do motor `tabela` (aquele não define persistência entre recargas de página).

**Problema resolvido:** guardar os dados dos clientes (nome, telefone, e-mail) direto no aparelho, sem planilha solta, com busca rápida.

**Entradas (formulário de cadastro, um cliente por vez):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nome` | texto | sim | 1–80 caracteres | — |
| `telefone` | texto | não | 0–20 caracteres | "" |
| `email` | texto | não | 0–254 caracteres, formato de e-mail se preenchido | "" |
| `observacoes` | area-texto | não | 0–500 caracteres | "" |

**Processamento (funções puras, chamadas pelo `<slug>.js` interativo):**
- `validarCliente(dados)` → confere `nome` não vazio e, se `email` preenchido, formato básico (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
- `buscarClientes(lista, consulta)` → reaproveita o padrão de `compartilhado-busca.js` (normaliza acentos/caixa, casa em nome, telefone ou e-mail).
- `paraCsv(lista)` → gera as linhas do CSV de exportação.
- Persistência: `localStorage['af-clientes-<slug>']` (lista de objetos com `id` gerado por `crypto.randomUUID()`), lida/escrita pelo próprio JS interativo — **por isso** o motor é `interativo`, e não `tabela`.
Erros: `nome` vazio → `nome_obrigatorio`; `email` preenchido e mal formatado → `email_invalido`.

**Saídas:** a lista de clientes cadastrados, renderizada como lista densa com busca (não é um campo `resultados` de calculadora).

**Exportação:** csv, copiar (um cliente por vez). Sem pdf (não é o formato natural para uma lista de contatos). Sem Plus.

**Celular 390px:** o formulário de novo cliente vira um painel deslizante (`<dialog>`) para não competir por espaço com a lista, que ocupa a tela cheia.

**Viabilidade no navegador:** 100% local. **Limite honesto:** `localStorage` tem teto de ~5 MB por origem e é por aparelho/navegador — não sincroniza entre dispositivos nem sobrevive a "limpar dados do navegador". Isso precisa estar escrito na tela (nota tipo `.nota-local`, já usada em outras ferramentas de arquivo). Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `validarCliente({ nome:'Ana Souza', telefone:'11999998888', email:'ana@exemplo.com' })` → `{ ok:true }`.
2. `buscarClientes([{nome:'João Silva',...},{nome:'Maria Costa',...}], 'joao')` → retorna só "João Silva" (busca ignora acento e caixa).
3. Erro: `validarCliente({ nome:'', email:'' })` → `{ ok:false, erro:'nome_obrigatorio', campo:'nome' }`.

---

## follow-up

**Motor:** `documento` — o resultado é um texto único formatado a partir de um template fixo (não é uma área de texto livre a transformar, é `campos → texto`; por isso não é `transformador`).

**Problema resolvido:** ter, na hora, uma mensagem educada para retomar contato com um cliente que sumiu, sem começar a digitar do zero.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nomeCliente` | texto | sim | 1–80 caracteres | — |
| `contexto` | opcao (`sem_resposta`\|`orcamento_enviado`\|`pos_reuniao`\|`pedido_atrasado`) | não | — | `sem_resposta` |
| `diasSemContato` | inteiro | não | min 0, max 365 | 0 |
| `tom` | opcao (`formal`\|`casual`) | não | — | `formal` |

**Processamento — sem cálculo numérico; template determinístico.** `diasTexto = diasSemContato > 0 ? " (já faz " + diasSemContato + " dias)" : ""`. A mensagem final é montada por tabela fixa `template[contexto][tom]`, com `{nomeCliente}` e `{diasTexto}` substituídos literalmente (sem HTML, só texto):

| contexto | formal | casual |
|---|---|---|
| `sem_resposta` | "Olá, {nomeCliente}! Notei que ainda não tive retorno sobre nosso último contato{diasTexto}. Ficou alguma dúvida que eu possa esclarecer? Estou à disposição para seguirmos." | "Oi, {nomeCliente}! Vi que ainda não recebi resposta sua{diasTexto}. Ficou alguma dúvida? Me chama que a gente resolve rapidinho!" |
| `orcamento_enviado` | "Olá, {nomeCliente}! Passando para saber se você teve a oportunidade de analisar o orçamento que enviei{diasTexto}. Posso esclarecer algum ponto ou ajustar alguma condição?" | "Oi, {nomeCliente}! Conseguiu dar uma olhada no orçamento que te mandei{diasTexto}? Qualquer dúvida, só falar comigo!" |
| `pos_reuniao` | "Olá, {nomeCliente}! Foi um prazer conversar com você{diasTexto}. Ficou combinado que eu retornaria com os próximos passos — sigo à disposição para avançarmos." | "Oi, {nomeCliente}! Adorei nossa conversa{diasTexto}. Combinamos que eu voltaria com os próximos passos — aqui estou, vamos seguir!" |
| `pedido_atrasado` | "Olá, {nomeCliente}! Peço desculpas pelo atraso no seu pedido{diasTexto}. Já estou verificando a situação e retorno com uma nova previsão em breve." | "Oi, {nomeCliente}! Desculpa pela demora no seu pedido{diasTexto}. Já tô verificando e já te dou uma posição!" |

Erros: `nomeCliente` vazio → `nome_obrigatorio`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `mensagem` | texto | sim |

**Exportação:** copiar. Sem pdf/csv (é uma mensagem para colar em chat/e-mail). Sem Plus.

**Celular 390px:** o texto quebra em várias linhas no painel de resultado; botão "copiar" grande (alvo de toque ≥ 44px), já que o uso típico é copiar e colar direto no WhatsApp.

**Viabilidade no navegador:** 100% local, string template, sem biblioteca.

**Sobreposição:** relacionada com `script-de-abordagem` (também é template de texto de vendas), mas contextos diferentes (retomar contato x abordar um cliente novo); e com `modelo-de-mensagem` (categoria `texto`, já no catálogo antigo) — esse é genérico (aviso/cobrança/agradecimento), `follow-up` é específico do funil comercial. Sem duplicar; **relacionadas**.

**Casos de teste:**
1. `nomeCliente='Marina'`, `contexto=orcamento_enviado`, `diasSemContato=5`, `tom=formal` → `"Olá, Marina! Passando para saber se você teve a oportunidade de analisar o orçamento que enviei (já faz 5 dias). Posso esclarecer algum ponto ou ajustar alguma condição?"`.
2. `nomeCliente='João'`, `contexto=sem_resposta`, `diasSemContato=0`, `tom=casual` → `"Oi, João! Vi que ainda não recebi resposta sua. Ficou alguma dúvida? Me chama que a gente resolve rapidinho!"`.
3. Erro: `nomeCliente=''` → `{ ok:false, erro:'nome_obrigatorio', campo:'nomeCliente' }`.

---

## funil-de-vendas

**Motor:** `tabela` — as etapas do funil são linhas ordenadas; a conversão entre etapas é coluna calculada.

**Problema resolvido:** ver, etapa por etapa, quantos leads caem até virar venda, e onde o funil está "furando" mais.

**Entradas (linhas da tabela `etapas`, na ordem em que aparecem = ordem do funil):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nome` | texto | sim | 1–60 caracteres | — |
| `quantidade` | inteiro | sim | min 0 | — |

Mínimo 2 etapas, máximo 10.

**Processamento:**
```
conversaoEntreEtapas[i] = quantidade[i] / quantidade[i-1] × 100     (i ≥ 1)
conversaoGeral          = quantidade[última] / quantidade[primeira] × 100
```
Arredondamento: percentuais em 2 casas.
Erros: menos de 2 etapas → `etapas_insuficientes`; `quantidade[i] > quantidade[i-1]` (funil não pode crescer) → `etapa_maior_que_anterior` na linha; `quantidade[primeira] = 0` → `primeira_etapa_zerada`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `conversaoEntreEtapas` (coluna calculada) | percentual | não |
| `conversaoGeral` | percentual | sim |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** sem mudança; 3 colunas cabem.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Etapas: Leads 1000, Contatados 600, Propostas 150, Vendas 45 → conversões 60,00% / 25,00% / 30,00%; `conversaoGeral = 45/1000×100 = 4,50%`.
2. Etapas: Visitas 200, Vendas 20 → `conversaoGeral=10,00%`.
3. Erro: etapas Leads 500, Contatados 600 (cresceu) → `{ ok:false, erro:'etapa_maior_que_anterior', campo:'quantidade' }`.

---

## meta-de-faturamento

**Motor:** `calculadora`.

**Problema resolvido:** quebrar a meta do mês em quanto vender por dia, por semana e por vendedor, para acompanhar se está no ritmo.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `metaMensal` | moeda | sim | min 0,01 | — |
| `diasUteisNoMes` | inteiro | sim | min 1, max 31 | 22 |
| `diasUteisPorSemana` | inteiro | não | min 1, max 7 | 5 |
| `numeroVendedores` | inteiro | não | min 1, max 500 | 1 |

**Processamento:**
```
metaPorDia          = metaMensal / diasUteisNoMes
metaPorSemana        = metaPorDia × diasUteisPorSemana
metaPorVendedor      = metaMensal / numeroVendedores
metaPorVendedorPorDia = metaPorDia / numeroVendedores
```
Arredondamento: 2 casas.
Erros: `diasUteisNoMes` ≤ 0 → `dias_invalidos`; `numeroVendedores` < 1 → `vendedores_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `metaPorDia` | moeda | não |
| `metaPorSemana` | moeda | não |
| `metaPorVendedor` | moeda | sim |
| `metaPorVendedorPorDia` | moeda | não |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `metaMensal=60000,00`, `diasUteisNoMes=22`, `diasUteisPorSemana=5`, `numeroVendedores=4` → `metaPorDia=2727,27`; `metaPorSemana=13636,36`; `metaPorVendedor=15000,00`; `metaPorVendedorPorDia=681,82`.
2. `metaMensal=10000,00`, `diasUteisNoMes=20`, `numeroVendedores=1` → `metaPorDia=500,00`, `metaPorVendedor=10000,00`.
3. Erro: `diasUteisNoMes=0` → `{ ok:false, erro:'dias_invalidos', campo:'diasUteisNoMes' }`.

---

## pedido-de-venda

**Motor:** `documento` (itens repetíveis, ver decisão pendente B).

**Problema resolvido:** registrar o pedido do cliente já confirmado, com itens, condições de pagamento e prazo de entrega, pronto para imprimir.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nomeCliente` | texto | sim | 1–120 caracteres | — |
| `itens[].descricao` | texto | sim (cada item) | 1–120 caracteres | — |
| `itens[].quantidade` | numero | sim (cada item) | min 0,01 | 1 |
| `itens[].precoUnitario` | moeda | sim (cada item) | min 0 | — |
| `condicoesPagamento` | texto | não | 0–120 caracteres | "" |
| `prazoEntregaDias` | inteiro | não | min 0, max 365 | 0 |

Mínimo 1 item, máximo 40.

**Processamento:**
```
subtotal      = Σ (quantidade[i] × precoUnitario[i])
dataEntrega   = hoje + prazoEntregaDias dias   (se prazoEntregaDias > 0; senão "a combinar")
```
Arredondamento: 2 casas.
Erros: `nomeCliente` vazio → `cliente_obrigatorio`; nenhum item → `itens_insuficientes`; `quantidade` ≤ 0 em algum item → `item_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `subtotal` | moeda | sim |
| `dataEntrega` | data (ou texto "a combinar") | não |

**Exportação:** pdf, csv, copiar. Sem Plus.

**Celular 390px:** itens em cartão empilhado, igual `orcamento`.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** relacionada com `orcamento` (ver seção `orcamento` acima).

**Casos de teste:**
1. Cliente "Padaria Bela Vista", itens: "Pão francês 50kg" (qtd 1, preço 350,00), "Bolo confeitado" (qtd 2, preço 80,00) → `subtotal = 350+160 = 510,00`.
2. `prazoEntregaDias=3` a partir de 2026-09-24 → `dataEntrega=2026-09-27`.
3. Erro: `nomeCliente=''` → `{ ok:false, erro:'cliente_obrigatorio', campo:'nomeCliente' }`.

---

## previsao-de-vendas

**Motor:** `tabela` — o histórico mensal é a lista de linhas; a projeção é o resultado calculado a partir dela.

**Problema resolvido:** ter uma estimativa (não uma certeza) de quanto vender nos próximos meses, olhando o crescimento recente.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| linha `mes` | texto | sim | 1–20 caracteres (ex.: "2026-06") | — |
| linha `valor` | moeda | sim | min 0,01 | — |
| `taxaCrescimentoMensal` | percentual | não (se vazio, é calculada do histórico) | qualquer (pode ser negativa, indicando queda) | — |
| `mesesAPrever` | inteiro | sim | min 1, max 24 | 3 |

Mínimo 2 linhas de histórico se `taxaCrescimentoMensal` não for informada (precisa de pelo menos 1 variação para calcular a média).

**Processamento:**
```
se taxaCrescimentoMensal não informada:
  variacoes[i] = (valor[i] - valor[i-1]) / valor[i-1]     (para cada par consecutivo do histórico)
  taxa = média aritmética simples de variacoes
senão:
  taxa = taxaCrescimentoMensal (fração)

ultimoValor = valor da última linha do histórico
projecao[k] = ultimoValor × (1+taxa)^k     para k = 1..mesesAPrever
```
Arredondamento: `taxa` mostrada em 4 casas decimais (percentual pequeno pode zerar em 2 casas); valores da projeção em 2 casas.
Erros: menos de 2 linhas de histórico **e** `taxaCrescimentoMensal` não informada → `historico_insuficiente`; `valor` ≤ 0 em alguma linha → `valor_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `taxaUtilizada` | percentual | não |
| `projecao` | lista (mês futuro → valor) | sim |

**Exportação:** csv, pdf, copiar. Sem Plus.

**Celular 390px:** a lista de meses projetados empilha como a tabela de histórico, sem colunas extras.

**Viabilidade no navegador:** 100% local, sem biblioteca. Aviso obrigatório na tela: é uma projeção linear simples (média de crescimento), não uma previsão estatística robusta — não considera sazonalidade.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Histórico [10000, 10500, 11000, 11800], `mesesAPrever=3`, sem taxa informada → variações [5,00%; 4,76%; 7,27%], `taxaUtilizada ≈ 5,68%`; projeção ≈ [12470,03; 13178,10; 13926,38].
2. Histórico [5000, 5500], `taxaCrescimentoMensal=10%` (informada, ignora o histórico para o cálculo da taxa), `mesesAPrever=1` → `projecao = [5500×1,10] = [6050,00]`.
3. Erro: histórico com 1 linha só e sem `taxaCrescimentoMensal` → `{ ok:false, erro:'historico_insuficiente' }`.

---

## script-de-abordagem

**Motor:** `documento` — template determinístico por etapa, igual `follow-up`.

**Problema resolvido:** ter um roteiro de abordagem pronto (contato, apresentação, fechamento) para não travar na hora de falar com o cliente.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `produtoOuServico` | texto | sim | 1–80 caracteres | — |
| `publico` | texto | sim | 1–80 caracteres | — |
| `etapa` | opcao (`contato_inicial`\|`apresentacao`\|`fechamento`) | não | — | `contato_inicial` |
| `objecaoComum` | texto | não | 0–120 caracteres | "" |

**Processamento — sem cálculo numérico; template determinístico:**

| etapa | template |
|---|---|
| `contato_inicial` | "Olá! Meu nome é [seu nome] e trabalho com {produtoOuServico}. Notei que você faz parte de {publico} e imagino que isso possa ser útil para você. Você teria um minuto para eu entender melhor sua necessidade?" |
| `apresentacao` | "Com base no que você me contou, {produtoOuServico} pode ajudar {publico} principalmente em [benefício principal]. Deixa eu te mostrar como isso funciona na prática." |
| `fechamento` | "Pelo que conversamos, {produtoOuServico} resolve exatamente a necessidade de {publico}. Podemos fechar hoje mesmo — qual forma de pagamento funciona melhor para você?" |

Se `objecaoComum` estiver preenchido, acrescenta ao final: `" (Objeção comum a preparar: \"{objecaoComum}\".)"`.
Erros: `produtoOuServico` vazio → `produto_obrigatorio`; `publico` vazio → `publico_obrigatorio`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `roteiro` | texto | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, string template, sem biblioteca.

**Sobreposição:** relacionada com `follow-up` (ver seção acima).

**Casos de teste:**
1. `produtoOuServico='consultoria financeira'`, `publico='pequenos empresários'`, `etapa=contato_inicial`, `objecaoComum=''` → `"Olá! Meu nome é [seu nome] e trabalho com consultoria financeira. Notei que você faz parte de pequenos empresários e imagino que isso possa ser útil para você. Você teria um minuto para eu entender melhor sua necessidade?"`.
2. `produtoOuServico='plano de assinatura'`, `publico='clientes recorrentes'`, `etapa=fechamento`, `objecaoComum='preço alto'` → `"Pelo que conversamos, plano de assinatura resolve exatamente a necessidade de clientes recorrentes. Podemos fechar hoje mesmo — qual forma de pagamento funciona melhor para você? (Objeção comum a preparar: \"preço alto\".)"`.
3. Erro: `produtoOuServico=''` → `{ ok:false, erro:'produto_obrigatorio', campo:'produtoOuServico' }`.

---

## ticket-medio

**Motor:** `calculadora`.

**Problema resolvido:** ver o ticket médio e a taxa de conversão atuais, e o efeito de melhorar cada um deles.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `faturamento` | moeda | sim | min 0 | — |
| `numeroVendas` | inteiro | sim | min 1 | — |
| `numeroVisitantes` | inteiro | não | min = `numeroVendas` (se informado) | — |
| `incrementoTicketPercentual` | percentual | não | min 0, max 500 | 10 |
| `incrementoConversaoPontos` | numero | não (pontos percentuais) | min 0, max 100 | 1 |

**Processamento:**
```
ticketMedio    = faturamento / numeroVendas
taxaConversao  = numeroVisitantes ? numeroVendas / numeroVisitantes × 100 : null
efeitoTicket    = faturamento × (incrementoTicketPercentual/100)          // ganho se subir o ticket médio
efeitoConversao = numeroVisitantes
                  ? (incrementoConversaoPontos/100) × numeroVisitantes × ticketMedio
                  : null                                                  // ganho se subir a conversão
```
Arredondamento: 2 casas em moeda, 2 em percentual.
Erros: `numeroVendas` ≤ 0 → `vendas_invalidas`; `numeroVisitantes` informado e menor que `numeroVendas` → `visitantes_invalido` (não pode vender mais do que visitou).

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `ticketMedio` | moeda | sim |
| `taxaConversao` | percentual | não |
| `efeitoTicket` | moeda | não |
| `efeitoConversao` | moeda | não |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `faturamento=48000,00`, `numeroVendas=120`, `numeroVisitantes=3000` → `ticketMedio=400,00`; `taxaConversao=4,00%`.
2. `faturamento=48000,00`, `numeroVendas=120`, `numeroVisitantes=3000`, `incrementoTicketPercentual=10%` → `efeitoTicket = 48000×0,10 = 4800,00`.
3. Erro: `numeroVisitantes=100`, `numeroVendas=120` (mais vendas que visitas) → `{ ok:false, erro:'visitantes_invalido', campo:'numeroVisitantes' }`.

---

## calculadora-de-nps

**Motor:** `calculadora` — a lista de notas cabe num único campo `area-texto` (números separados por vírgula/linha), sem precisar do motor `tabela`.

**Problema resolvido:** calcular o NPS a partir das notas 0–10 dadas pelos clientes, sem montar planilha.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `notas` | area-texto | sim | cada valor entre 0 e 10, separados por vírgula, espaço ou linha; 1–1000 notas | — |

**Processamento:**
```
lista = notas.split(/[,\s]+/).filter(Boolean).map(Number)
total = lista.length
promotores = lista.filter(n => n >= 9).length
detratores = lista.filter(n => n <= 6).length
passivos   = total - promotores - detratores
nps = round((promotores - detratores) / total × 100)     // arredondado para inteiro, convenção usual do índice NPS
```
Arredondamento: `nps` sempre inteiro (arredondamento comum, `Math.round`); percentuais de cada grupo em 1 casa.
Erros: lista vazia após o parse → `lista_vazia`; algum valor fora de 0–10 ou não numérico → `nota_invalida` (extras: `{ valor, posicao }`).

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `nps` | inteiro | sim |
| `promotores` | inteiro | não |
| `passivos` | inteiro | não |
| `detratores` | inteiro | não |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** área de texto com altura mínima maior no celular (mais fácil colar uma lista longa colada do WhatsApp/formulário).

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. Notas `9,10,8,6,10,7,9,3,10,8` (10 respostas) → `promotores=5` (9,10,10,9,10), `detratores=2` (6,3), `passivos=3` (8,7,8); `nps = round((5-2)/10×100) = 30`.
2. Notas `10,10,10` → `nps=100`.
3. Erro: notas `9,10,15` (15 fora do intervalo) → `{ ok:false, erro:'nota_invalida', campo:'notas', extras:{ valor:15, posicao:3 } }`.
