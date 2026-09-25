# Catálogo — Documentos

Especificação das 13 ferramentas **planejadas** da categoria `documentos`. `juntar-pdf` já está pronta (§13 dos contratos) e não entra aqui. O arquivo/PDF nunca sai do aparelho. Biblioteca já disponível no projeto: **pdf-lib 1.17** (`frontend/compartilhado/bibliotecas/pdf-lib.esm.min.js`).

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| declaracao | documento | sim | nenhuma | aviso jurídico obrigatório |
| procuracao | documento | sim | nenhuma | aviso jurídico obrigatório |
| contrato-simples | documento | sim | nenhuma | aviso jurídico obrigatório |
| checklist | documento | sim | nenhuma | — |
| pop | documento | sim | nenhuma | — |
| curriculo | documento | sim | nenhuma | — |
| recibo | documento | sim | nenhuma | aviso leve (não é nota fiscal) |
| etiquetas | folha | sim | nenhuma | só geometria de grade |
| dividir-pdf | arquivo | sim | **JSZip** (só quando gera mais de 1 arquivo) | pdf-lib, testado com `node -e` |
| girar-e-numerar-pdf | arquivo | sim | nenhuma | pdf-lib, testado com `node -e` |
| protecao-de-pdf | arquivo | **marca d'água sim; senha, decisão pendente** | nenhuma para marca d'água; ver decisão pendente para senha | ver seção própria |
| comprimir-pdf | arquivo | sim, com ganho honestamente limitado | nenhuma | só recomprime JPEG interno |
| extrair-texto-de-pdf | arquivo | **decisão pendente** (risco de CSP) | `pdfjs-dist` | ver seção própria |

---

## declaracao — Gerador de declaração

**Motor:** `documento` — campos → pré-visualização formatada → imprimir/PDF/copiar.

**Problema resolvido:** montar rápido uma declaração simples (de residência, de próprio punho, ou para uma finalidade qualquer) sem abrir um editor de texto do zero.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo_declaracao` | `opcao` (`residencia`, `proprio_punho`, `geral`) | sim | — | `residencia` |
| `declarante_nome` | `texto` | sim | 1–120 caracteres | — |
| `declarante_documento` | `texto` | sim | CPF ou CNPJ | — |
| `declarante_endereco` | `texto` | obrigatório se `tipo_declaracao=residencia` | ≤ 200 caracteres | — |
| `conteudo` | `area-texto` | obrigatório se `tipo_declaracao=proprio_punho` | ≤ 1000 caracteres | — |
| `finalidade` | `texto` | obrigatório se `tipo_declaracao=geral` | ≤ 200 caracteres | — |
| `cidade` | `texto` | sim | ≤ 80 caracteres | — |
| `data` | `data` | sim | — | hoje |

**Processamento — monta o corpo conforme `tipo_declaracao`:**
- `residencia`: `"Eu, {declarante_nome}, portador(a) do documento {declarante_documento}, declaro para os devidos fins que resido no seguinte endereço: {declarante_endereco}."`
- `proprio_punho`: `"Eu, {declarante_nome}, portador(a) do documento {declarante_documento}, declaro, por minha livre e espontânea vontade, que {conteudo}."`
- `geral`: `"Eu, {declarante_nome}, portador(a) do documento {declarante_documento}, declaro, para {finalidade}."`

**Erros:** `declarante_nome` vazio → `nome_obrigatorio`; `tipo_declaracao=residencia` sem `declarante_endereco` → `endereco_obrigatorio`; `tipo_declaracao=proprio_punho` sem `conteudo` → `conteudo_obrigatorio`; `tipo_declaracao=geral` sem `finalidade` → `finalidade_obrigatorio`.

**Saídas / estrutura do documento gerado:**
1. Título centralizado: `"DECLARAÇÃO"`.
2. Corpo (parágrafo montado acima).
3. Local e data: `"{cidade}, {data formatada}."`.
4. Linha de assinatura: `"_______________________________"` seguida do nome do declarante.
5. **Aviso jurídico (rodapé, fonte pequena):** *"Modelo simples gerado automaticamente. Não substitui orientação jurídica; para uso formal ou em caso de dúvida, consulte um advogado."*

**Exportação:** `imprimir`, `pdf`, `copiar` (texto puro). Sem Plus.

**Celular (390px):** campos empilhados; pré-visualização do documento em largura total, rolável, com os botões de exportação fixos no rodapé da tela.

**Viabilidade:** total — template de string + pdf-lib (já disponível) para o PDF, com `Helvetica`/`Helvetica-Bold` embutidas. Sem biblioteca nova.

**Sobreposição:** o mesmo padrão de "campos → parágrafo formatado → PDF" se repete em `procuracao`, `contrato-simples`, `pop`, `checklist`, `curriculo`, `recibo` — todos usam o motor `documento`; não unificar em uma única ferramenta genérica de "gerador de documento", porque cada um tem sua própria intenção de busca e sua própria validação de campos (uma declaração não tem cláusula de valor, um currículo não tem assinatura).

**Casos de teste**
1. Sucesso — `tipo_declaracao=residencia`, `declarante_nome="João Silva"`, `declarante_documento="123.456.789-00"`, `declarante_endereco="Rua A, 100 - São Paulo/SP"`, `cidade="São Paulo"`, `data="2026-09-24"` → corpo: `"Eu, João Silva, portador(a) do documento 123.456.789-00, declaro para os devidos fins que resido no seguinte endereço: Rua A, 100 - São Paulo/SP."`.
2. Sucesso — `tipo_declaracao=geral`, `finalidade="comprovação de renda perante o banco"` → corpo termina em `"declaro, para comprovação de renda perante o banco."`.
3. Erro — `declarante_nome=""` → `{ ok: false, erro: 'nome_obrigatorio', campo: 'declarante_nome' }`.

---

## procuracao — Gerador de procuração

**Motor:** `documento`.

**Problema resolvido:** montar uma procuração particular simples (quem dá os poderes, para quem, e quais poderes) sem contratar um advogado só para isso quando o caso é simples.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `outorgante_nome` | `texto` | sim | 1–120 | — |
| `outorgante_documento` | `texto` | sim | CPF ou CNPJ | — |
| `outorgante_endereco` | `texto` | sim | ≤ 200 | — |
| `outorgado_nome` | `texto` | sim | 1–120 | — |
| `outorgado_documento` | `texto` | sim | CPF ou CNPJ | — |
| `poderes` | `area-texto` | sim (≥ 1 linha não vazia) | ≤ 20 linhas | — |
| `prazo_validade` | `data` | não | — | sem prazo (`"até revogação"`) |
| `cidade` | `texto` | sim | ≤ 80 | — |
| `data` | `data` | sim | — | hoje |

**Processamento:** `poderes.split('\n').filter(Boolean)` vira uma lista com marcador `"-"`, um poder por linha; `prazo_texto = prazo_validade ? "até " + formatarData(prazo_validade) : "até revogação"`.

**Erros:** `outorgante_nome`/`outorgado_nome` vazio → `outorgante_obrigatorio`/`outorgado_obrigatorio`; `poderes` sem nenhuma linha não vazia → `poderes_obrigatorio`.

**Saídas / estrutura do documento gerado:**
1. Título: `"PROCURAÇÃO"`.
2. `"Outorgante: {outorgante_nome}, portador(a) do documento {outorgante_documento}, residente em {outorgante_endereco}."`
3. `"Outorgado: {outorgado_nome}, portador(a) do documento {outorgado_documento}."`
4. `"Pelo presente instrumento particular, o outorgante nomeia e constitui seu bastante procurador o outorgado acima qualificado, para praticar os seguintes atos:"` seguido da lista de poderes.
5. `"Esta procuração é válida {prazo_texto}."`
6. Local/data e linha de assinatura do outorgante.
7. **Aviso jurídico (rodapé):** *"Modelo de procuração particular simples. Para poderes amplos ou atos que exigem forma pública (por exemplo, compra e venda de imóvel) ou apresentação em cartório, é necessária procuração pública lavrada em tabelionato — este modelo não substitui orientação de um advogado."*

**Exportação:** `imprimir`, `pdf`, `copiar`. Sem Plus.

**Celular:** campos empilhados; a lista de poderes usa `textarea` de altura automática.

**Viabilidade:** total — template de string + pdf-lib. Sem biblioteca nova.

**Sobreposição:** ver nota em `declaracao`.

**Casos de teste**
1. Sucesso — `poderes="Representar em repartições públicas\nAssinar documentos em meu nome"` (2 poderes), sem `prazo_validade` → corpo lista os 2 poderes com `"-"` e termina em `"válida até revogação."`.
2. Sucesso — `prazo_validade="2027-03-01"` → termina em `"válida até 01/03/2027."`.
3. Erro — `poderes=""` → `{ ok: false, erro: 'poderes_obrigatorio', campo: 'poderes' }`.

---

## contrato-simples — Contrato simples de prestação de serviço

**Motor:** `documento`.

**Problema resolvido:** formalizar rápido um contrato curto de prestação de serviço (objeto, valor, prazo) para um freelance ou serviço pontual, sem modelo genérico da internet que não bate com o caso.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `contratante_nome` | `texto` | sim | 1–120 | — |
| `contratante_documento` | `texto` | sim | CPF ou CNPJ | — |
| `contratado_nome` | `texto` | sim | 1–120 | — |
| `contratado_documento` | `texto` | sim | CPF ou CNPJ | — |
| `objeto` | `area-texto` | sim | ≤ 1000 | — |
| `valor` | `moeda` | sim | > 0 | — |
| `forma_pagamento` | `opcao` (`a_vista`, `parcelado`) | sim | — | `a_vista` |
| `numero_parcelas` | `inteiro` | obrigatório se `forma_pagamento=parcelado` | 2–24 | — |
| `prazo_execucao` | `texto` | sim | ex.: `"30 dias"`, ≤ 80 | — |
| `cidade` | `texto` | sim | ≤ 80 | — |
| `data` | `data` | sim | — | hoje |

**Processamento:** monta cláusulas numeradas: **1ª (Objeto)** = `objeto`; **2ª (Valor e forma de pagamento)** = `valor` formatado, mais, se `parcelado`, `` "em {numero_parcelas} parcelas de {valor/numero_parcelas formatado}" `` (divisão simples, sem arredondamento de centavo residual nesta versão — texto de ajuda avisa isso para valores que não dividem exatamente); **3ª (Prazo)** = `prazo_execucao`; **4ª (Foro)** = `` "Fica eleito o foro da comarca de {cidade} para dirimir quaisquer controvérsias." ``; assinatura dupla (contratante e contratado lado a lado).

**Erros:** `objeto` vazio → `objeto_obrigatorio`; `valor ≤ 0` → `valor_invalido`; `numero_parcelas` fora de 2–24 → `numero_parcelas_invalido`.

**Saídas / estrutura do documento:** título `"CONTRATO DE PRESTAÇÃO DE SERVIÇO"`, qualificação das partes, as 4 cláusulas, local/data, duas linhas de assinatura. **Aviso jurídico (rodapé):** *"Modelo simples de contrato particular. Não substitui a revisão de um advogado, especialmente para valores altos, prazos longos ou serviços que envolvam risco jurídico ou responsabilidade civil."*

**Exportação:** `imprimir`, `pdf`, `copiar`. Sem Plus.

**Celular:** campos empilhados; cláusulas numeradas em blocos com espaçamento maior para leitura em tela pequena.

**Viabilidade:** total — template de string + pdf-lib. Sem biblioteca nova.

**Sobreposição:** ver nota em `declaracao`.

**Casos de teste**
1. Sucesso — `forma_pagamento=a_vista`, `valor=1500.00` → cláusula 2ª: `"O valor total do serviço é de R$ 1.500,00, a ser pago à vista."`.
2. Sucesso — `forma_pagamento=parcelado`, `valor=900.00`, `numero_parcelas=3` → `900/3 = 300,00` exato → `"em 3 parcelas de R$ 300,00"`.
3. Erro — `valor=0` → `{ ok: false, erro: 'valor_invalido', campo: 'valor' }`.

---

## checklist — Checklist para imprimir

**Motor:** `documento`.

**Problema resolvido:** transformar uma lista qualquer (compras, tarefas de mudança, itens de viagem) numa folha com caixinhas de marcar, pronta para imprimir e riscar à mão.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `titulo` | `texto` | sim | 1–100 | — |
| `itens` | `area-texto` | sim (≥ 1 linha não vazia) | ≤ 200 linhas | — |
| `numerar` | `marcador` | não | — | `false` |

**Processamento:** `itens.split('\n').map(l => l.trim()).filter(Boolean)`; cada item é desenhado com uma caixinha vazia (`10×10`, borda simples) à esquerda do texto; se `numerar`, o texto do item é prefixado com `"{n}. "` além da caixinha (as duas marcações não são mutuamente exclusivas — numeração ajuda a contar, caixinha ajuda a marcar feito).

**Erros:** `itens` sem nenhuma linha não vazia → `itens_obrigatorio`.

**Saídas / estrutura do documento:** título (`titulo`), lista de itens com caixinha (e número opcional), contagem total no topo (`"{total} itens"`). Sem aviso jurídico — não é documento formal.

**Exportação:** `imprimir`, `pdf`, `copiar` (formato texto `"- [ ] item"`, compatível com Markdown de tarefas). Sem Plus.

**Celular:** lista em largura total, itens com alvo de toque de 44px (para marcar como feito diretamente na tela, mesmo sem imprimir).

**Viabilidade:** total — split de string + `pdf-lib` para desenhar caixinha (retângulo) e texto. Sem biblioteca nova.

**Sobreposição:** nenhuma; `lista-de-tarefas` (produtividade, outra onda) é uma lista **interativa** salva no aparelho, enquanto `checklist` é um **documento para imprimir** — propósitos diferentes.

**Casos de teste**
1. Sucesso — `titulo="Compras da semana"`, `itens="Arroz\nFeijão\nSabão"` → 3 itens com caixinha, `"3 itens"` no topo.
2. Sucesso — `numerar=true`, mesma entrada → itens exibidos como `"1. Arroz"`, `"2. Feijão"`, `"3. Sabão"`, cada um ainda com caixinha.
3. Erro — `itens="   \n\n"` (só espaços/linhas vazias) → `{ ok: false, erro: 'itens_obrigatorio', campo: 'itens' }`.

---

## pop — Procedimento operacional padrão (POP)

**Motor:** `documento`.

**Problema resolvido:** documentar um processo da empresa (como fazer X) de forma padronizada, para treinar gente nova sem depender de "perguntar pro colega".

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `titulo_processo` | `texto` | sim | 1–120 | — |
| `objetivo` | `area-texto` | sim | ≤ 500 | — |
| `materiais` | `area-texto` | não (um item por linha) | ≤ 50 linhas | `""` |
| `passos` | `area-texto` | sim (≥ 1 linha não vazia, um passo por linha) | ≤ 100 linhas | — |
| `responsavel` | `texto` | não | ≤ 80 | `""` |
| `versao` | `texto` | não | ≤ 20 | `"1.0"` |
| `data_vigencia` | `data` | não | — | hoje |

**Processamento:** `materiais`/`passos` viram listas por `split('\n').filter(Boolean)`; `passos` recebe numeração automática (`1.`, `2.`...); a seção "Materiais e recursos" só é desenhada se `materiais` não estiver vazio (seção omitida, não deixada em branco).

**Erros:** `objetivo` vazio → `objetivo_obrigatorio`; `passos` sem nenhuma linha não vazia → `passos_obrigatorio`.

**Saídas / estrutura do documento:** cabeçalho com `titulo_processo`, `versao`, `data_vigencia`; seção "Objetivo"; seção "Materiais e recursos" (se houver); seção "Passo a passo" (lista numerada); rodapé "Responsável: {responsavel}" (se informado). Sem aviso jurídico.

**Exportação:** `imprimir`, `pdf`, `copiar`. Sem Plus.

**Celular:** seções empilhadas com âncoras de navegação rápida (`.migalhas` internas) no topo para saltar até "Passo a passo".

**Viabilidade:** total — só template e listas. Sem biblioteca nova.

**Sobreposição:** nenhuma direta; `roteiro-de-entrevista`/`script-de-abordagem` (outras categorias/ondas) têm formato de lista de passos semelhante, mas conteúdo e intenção de busca diferentes.

**Casos de teste**
1. Sucesso — `passos="Ligar a máquina\nAjustar a temperatura\nIniciar o ciclo\nDesligar ao final"` (4 passos) → seção "Passo a passo" numerada de 1 a 4.
2. Sucesso — `materiais=""` (não informado) → documento gerado sem a seção "Materiais e recursos" (não aparece um cabeçalho vazio).
3. Erro — `passos=""` → `{ ok: false, erro: 'passos_obrigatorio', campo: 'passos' }`.

---

## curriculo — Gerador de currículo

**Motor:** `documento`.

**Problema resolvido:** montar um currículo organizado (experiência, formação, habilidades) sem lutar com as margens e fontes de um editor de texto.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nome_completo` | `texto` | sim | 1–120 | — |
| `email` | `texto` | não | ≤ 254 | `""` |
| `telefone` | `texto` | não | ≤ 20 | `""` |
| `cidade` | `texto` | não | ≤ 80 | `""` |
| `resumo` | `area-texto` | não | ≤ 500 | `""` |
| `experiencias` | `area-texto` | não | blocos separados por linha em branco; cada bloco: 1ª linha `"Cargo — Empresa (período)"`, linhas seguintes = descrição | `""` |
| `formacao` | `area-texto` | não | mesmo formato de blocos de `experiencias` | `""` |
| `habilidades` | `texto` | não | separadas por vírgula | `""` |

**Processamento:** `experiencias`/`formacao` são divididas em blocos por linha em branco (`texto.split(/\n\s*\n/)`); dentro de cada bloco, a primeira linha é o cabeçalho (cargo/empresa/período ou curso/instituição/período) e o resto é a descrição; `habilidades.split(',').map(s => s.trim()).filter(Boolean)` vira uma lista com marcadores. Cada seção (`resumo`, `experiencias`, `formacao`, `habilidades`) só é desenhada se tiver conteúdo — sem seções vazias no documento final.

**Erros:** `nome_completo` vazio → `nome_obrigatorio`.

**Saídas / estrutura do documento:** cabeçalho com nome em destaque e contato numa linha (`email · telefone · cidade`, omitindo os campos vazios); seções "Resumo", "Experiência", "Formação", "Habilidades", nesta ordem, cada uma condicional à presença de conteúdo. Sem aviso jurídico (não é documento legal) — só uma nota de uso: "Revise as datas e descrições antes de enviar."

**Exportação:** `imprimir`, `pdf`, `copiar`. Sem Plus.

**Celular:** uma coluna só (sem a divisão em duas colunas comum em currículo de desktop); seções colapsáveis (`<details>`) para navegação mais rápida na tela pequena.

**Viabilidade:** total — parsing de blocos por linha em branco é lógica de string pura; `pdf-lib` para o PDF. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `experiencias="Analista de Vendas — Loja X (2022–2024)\nResponsável por atendimento e fechamento de vendas.\n\nAtendente — Loja Y (2020–2022)\nAtendimento ao público."` → 2 blocos de experiência, cada um com cabeçalho e 1 linha de descrição.
2. Sucesso — `resumo=""` (não informado) → documento sem a seção "Resumo".
3. Erro — `nome_completo=""` → `{ ok: false, erro: 'nome_obrigatorio', campo: 'nome_completo' }`.

---

## recibo — Gerador de recibo

**Motor:** `documento`.

**Problema resolvido:** dar um comprovante formal de pagamento recebido (com o valor por extenso, como se espera de um recibo) sem precisar de talão de papel.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `recebedor_nome` | `texto` | sim | 1–120 | — |
| `recebedor_documento` | `texto` | sim | CPF ou CNPJ | — |
| `pagador_nome` | `texto` | sim | 1–120 | — |
| `pagador_documento` | `texto` | não | CPF ou CNPJ | `""` |
| `valor` | `moeda` | sim | > 0 | — |
| `referente_a` | `texto` | sim | ≤ 200 | — |
| `forma_pagamento` | `opcao` (`dinheiro`, `pix`, `transferencia`, `cartao`, `cheque`) | sim | — | `pix` |
| `cidade` | `texto` | sim | ≤ 80 | — |
| `data` | `data` | sim | — | hoje |

**Processamento:** `` "Recebi de {pagador_nome}{pagador_documento ? ', ' + pagador_documento : ''}, a importância de {valor formatado} ({valor por extenso}), referente a {referente_a}, pago via {forma_pagamento}." ``. **Valor por extenso:** reaproveita a função pura já exportada por `numero-por-extenso-calculo.js` (categoria `dinheiro`, outra onda) em vez de duplicar a lógica de extenso aqui — dependência declarada explicitamente (sugestão de PEDIDO ao dono daquela ferramenta: exportar `valorPorExtenso(valor)` como função nomeada reutilizável). Se essa dependência ainda não estiver pronta quando `recibo` for implementado, usa uma versão mínima local (só reais/centavos, sem os casos especiais de "um real"/"um centavo") documentada como provisória.

**Erros:** `recebedor_nome`/`pagador_nome` vazio → `recebedor_obrigatorio`/`pagador_obrigatorio`; `valor ≤ 0` → `valor_invalido`; `referente_a` vazio → `referente_obrigatorio`.

**Saídas / estrutura do documento:** título `"RECIBO"`; corpo (frase acima); local/data; linha de assinatura do recebedor com o nome e documento embaixo. **Aviso leve (rodapé, fonte pequena):** *"Este recibo comprova o pagamento entre as partes; não é nota fiscal nem substitui a emissão de documento fiscal quando exigida por lei."*

**Exportação:** `imprimir`, `pdf`, `copiar`. Sem Plus.

**Celular:** campos empilhados; valor em destaque grande acima do restante do formulário (mesma ênfase visual de uma calculadora de dinheiro).

**Viabilidade:** total — template de string + `pdf-lib`; extenso reaproveitado de outra ferramenta (sem duplicar). Sem biblioteca nova.

**Sobreposição:** compartilha o padrão "campos → texto formatado" com `declaracao`/`procuracao`/`contrato-simples`; usa por extenso o mesmo formato de `numero-por-extenso` — reaproveitar a função em vez de reescrevê-la é a recomendação explícita desta especificação.

**Casos de teste**
1. Sucesso — `valor=150.00`, `forma_pagamento=pix`, `referente_a="aluguel de setembro"` → corpo contém `"R$ 150,00 (cento e cinquenta reais)"` e `"pago via pix"`.
2. Sucesso — `pagador_documento=""` (não informado) → frase sem a vírgula extra do documento do pagador (`"Recebi de Maria Silva, a importância de..."`, sem `", , "` duplicado).
3. Erro — `valor=0` → `{ ok: false, erro: 'valor_invalido', campo: 'valor' }`.

---

## etiquetas — Etiquetas para imprimir

**Motor:** `folha` — parâmetros → folha (SVG) → imprimir/PDF/SVG. Mesmo padrão de `molde-de-caixa`/`qr-code`: parâmetros entram, um layout pronto para exportar sai.

**Problema resolvido:** saber quantas etiquetas de um tamanho cabem numa folha A4 e gerar o PDF já com o texto de cada uma, para simplesmente imprimir e cortar (ou usar direto numa folha adesiva pré-cortada).

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `margem_mm` | `inteiro` | sim | 0–30 | `10` |
| `etiqueta_largura_mm` | `inteiro` | sim | 10–200 | `50` |
| `etiqueta_altura_mm` | `inteiro` | sim | 10–200 | `30` |
| `espacamento_mm` | `inteiro` | sim | 0–20 | `2` |
| `textos` | `area-texto` | sim (≥ 1 linha não vazia) | ≤ 500 linhas, uma etiqueta por linha | — |

Página fixa nesta rodada: A4 (210×297mm) — outros tamanhos de papel ficam para uma versão futura.

**Processamento:**
1. `larguraUtil = 210 − 2×margem_mm`; `alturaUtil = 297 − 2×margem_mm`.
2. `colunas = floor((larguraUtil + espacamento_mm) / (etiqueta_largura_mm + espacamento_mm))`; `linhas = floor((alturaUtil + espacamento_mm) / (etiqueta_altura_mm + espacamento_mm))`; `total_por_pagina = colunas × linhas`.
3. `total_paginas = ceil(quantidadeDeTextos / total_por_pagina)`; distribui os `textos` (um por linha da `area-texto`) nas etiquetas em ordem, página após página, deixando em branco as etiquetas finais da última página se sobrar espaço.
4. Monta a folha como SVG (`viewBox` em milímetros), com um retângulo por etiqueta e o texto centralizado dentro (tamanho de fonte reduzido automaticamente se o texto for mais largo que a etiqueta, até um mínimo de 6pt).

**Erros:** `etiqueta_largura_mm`/`etiqueta_altura_mm` maior que a área útil da página (não cabe nem 1 etiqueta) → `etiqueta_grande_demais`; `textos` sem nenhuma linha não vazia → `textos_obrigatorio`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `colunas` | inteiro | não |
| `linhas` | inteiro | não |
| `total_por_pagina` | inteiro | sim |
| `total_paginas` | inteiro | não |
| `folha` | SVG/PDF para baixar | — |

**Exportação:** `baixar` (`.pdf`, `.svg`), `imprimir`. Sem Plus.

**Celular:** a pré-visualização da folha vira miniatura rolável (a página A4 inteira não cabe em 390px de largura em escala legível); resumo numérico (`colunas × linhas = total`) em destaque acima da miniatura.

**Viabilidade:** total — só geometria (divisão e `floor`) e desenho de SVG. Sem biblioteca nova.

**Sobreposição:** nenhuma; `molde-de-caixa`/`molde-de-envelope` (categoria ofício) usam o mesmo motor `folha` para outro tipo de layout de impressão — padrão reaproveitado, não duplicado (mesma lógica de motor compartilhado, conteúdo diferente).

**Casos de teste**
1. Sucesso — `margem_mm=10`, `etiqueta_largura_mm=50`, `etiqueta_altura_mm=30`, `espacamento_mm=2` → `colunas=3`, `linhas=8`, `total_por_pagina=24`. Verificado com `node -e` (fórmula de grade acima).
2. Sucesso — mesma grade (24 por página), `textos` com 30 linhas não vazias → `total_paginas=2` (24 etiquetas na primeira página, 6 na segunda, 18 em branco).
3. Erro — `etiqueta_largura_mm=250` (maior que os 190mm de largura útil com margem 10mm) → `{ ok: false, erro: 'etiqueta_grande_demais', campo: 'etiqueta_largura_mm' }`.

---

## dividir-pdf — Dividir PDF e extrair páginas

**Motor:** `arquivo`.

**Problema resolvido:** tirar só algumas páginas de um PDF grande, ou dividir um PDF em partes menores, sem instalar um programa de PDF.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo` | `arquivo` (`.pdf`) | sim | 100 MB (mesmo limite de `juntar-pdf`, §13) | — |
| `modo` | `opcao` (`extrair_paginas`, `dividir_em_partes`) | sim | — | `extrair_paginas` |
| `paginas` | `texto` (ex.: `"1,3,5-8"`) | obrigatório se `modo=extrair_paginas` | — | — |
| `paginas_por_parte` | `inteiro` | obrigatório se `modo=dividir_em_partes` | ≥ 1 | `1` |

**Processamento:**
- `extrair_paginas`: interpreta `paginas` (números e intervalos separados por vírgula, 1-based, na **ordem escrita** — permite reordenar ou repetir página) em uma lista de índices 0-based; `PDFDocument.load` no original, `PDFDocument.create()` para o novo documento, `novo.copyPages(original, indices)` seguido de `novo.addPage(pagina)` para cada uma, `novo.save()`. Testado de ponta a ponta com `pdf-lib` real via `node -e`: um PDF de 5 páginas, extraindo `[1,3,5]`, produz um PDF de 3 páginas.
- `dividir_em_partes`: divide as páginas do original em grupos consecutivos de `paginas_por_parte`; monta um novo `PDFDocument` por grupo (mesmo `copyPages`/`addPage`); se resultar em mais de 1 arquivo, empacota todos num único `.zip` (**biblioteca nova JSZip**, mesma ficha de `catalogo-imagens.md`); se resultar em 1 arquivo só (ex.: `paginas_por_parte` ≥ total de páginas), baixa o PDF direto, sem zip.

**Erros:** `arquivo_nao_pdf` (cabeçalho `%PDF-` ausente); `pdf_protegido` (`PDFDocument.load` lança por senha — a pessoa precisa remover a senha antes, esta ferramenta não decodifica); `pdf_corrompido`; `arquivo_grande_demais` (> 100 MB); `pagina_fora_do_intervalo` (`paginas` referencia um número maior que o total de páginas do PDF).

**Saídas:** `arquivos_gerados` (lista, 1 ou mais), pacote para baixar (PDF único ou `.zip`).

**Exportação:** `baixar`. Sem Plus.

**Celular:** lista de páginas com miniatura (opcional, se o custo de renderizar todas as miniaturas for baixo) ou só números; progresso "Processando página X de Y" durante a extração de PDFs grandes.

**Viabilidade:** total para a manipulação de PDF (`pdf-lib`, já disponível, testado com `node -e` real). **Biblioteca nova JSZip** só quando `dividir_em_partes` gera mais de 1 arquivo.

**Sobreposição:** nenhuma; `juntar-pdf` (já pronta) faz o caminho inverso (várias → uma). `girar-e-numerar-pdf` também processa um PDF só, mas não separa páginas — ferramentas complementares no mesmo fluxo de "organizar um PDF".

**Casos de teste**
1. Sucesso — PDF de 5 páginas, `modo=extrair_paginas`, `paginas="1,3,5"` → PDF resultante com exatamente 3 páginas (as originais 1, 3 e 5, nessa ordem). Verificado com `node -e` usando `pdf-lib` real (`PDFDocument.create`, `copyPages`, `save`, e reabrindo o resultado para confirmar `getPageCount() === 3`).
2. Sucesso — PDF de 6 páginas, `modo=dividir_em_partes`, `paginas_por_parte=2` → 3 arquivos de 2 páginas cada, entregues num `.zip`.
3. Erro — PDF de 5 páginas, `paginas="1,3,10"` → `{ ok: false, erro: 'pagina_fora_do_intervalo', campo: 'paginas', extras: { pagina: 10, total_paginas: 5 } }`.

---

## girar-e-numerar-pdf — Girar e numerar páginas do PDF

**Motor:** `arquivo`.

**Problema resolvido:** uma página do PDF ficou de lado (escaneada errado) e/ou o documento precisa de numeração de página no rodapé antes de ser enviado.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo` | `arquivo` (`.pdf`) | sim | 100 MB | — |
| `rotacao_graus` | `opcao` (`90`, `180`, `270`) | sim | — | `90` |
| `paginas_rotacao` | `texto` (`"todas"` ou lista/intervalo, ex.: `"1,3"`) | sim | — | `"todas"` |
| `numerar` | `marcador` | não | — | `true` |
| `formato_numero` | `opcao` (`"Página {n}"`, `"Página {n} de {total}"`, `"{n}"`) | não | — | `"Página {n} de {total}"` |
| `posicao_numero` | `opcao` (`rodape_centro`, `rodape_direita`) | não | — | `rodape_centro` |
| `numero_inicial` | `inteiro` | não | ≥ 1 | `1` |

**Processamento:**
- Rotação: para cada página indicada em `paginas_rotacao` (ou todas), `` pagina.setRotation(degrees((pagina.getRotation().angle + rotacao_graus) % 360)) `` — **soma** à rotação já existente da página (importante para PDFs escaneados que já têm alguma rotação salva, em vez de sobrescrever).
- Numeração: embute a fonte `Helvetica` (`doc.embedFont(StandardFonts.Helvetica)`); para cada página, monta o texto substituindo `{n}` (número desta página, começando em `numero_inicial`) e `{total}` no `formato_numero`; calcula a posição X com `fonte.widthOfTextAtSize(texto, 10)` para centralizar ou alinhar à direita, e desenha a 20pt do rodapé.

**Erros:** `arquivo_nao_pdf`; `pdf_protegido`; `pdf_corrompido`; `arquivo_grande_demais` (> 100 MB); `pagina_fora_do_intervalo` (`paginas_rotacao` referencia página inexistente).

**Saídas:** arquivo PDF processado (mesma quantidade de páginas do original).

**Exportação:** `baixar`. Sem Plus.

**Celular:** pré-visualização da primeira página rotacionada em destaque; campos de configuração colapsam acima.

**Viabilidade:** total — `pdf-lib` (`setRotation`, `degrees`, `embedFont`, `drawText`, `widthOfTextAtSize`), testado de ponta a ponta com `node -e` real: PDF de 2 páginas, rotação de 90° só na página 1, numeração `"Página {n} de {total}"` nas duas — confirma `getRotation().angle === 90` na página 1 (e `0` na página 2) e o PDF final reabre com `getPageCount() === 2`.

**Sobreposição:** ver nota em `dividir-pdf`.

**Casos de teste**
1. Sucesso — PDF de 2 páginas, `rotacao_graus=90`, `paginas_rotacao="1"` → página 1 com `getRotation().angle === 90`; página 2 com `angle === 0`. Verificado com `node -e` usando `pdf-lib` real.
2. Sucesso — mesmo PDF, `numerar=true`, `formato_numero="Página {n} de {total}"` → rodapé da página 1 mostra `"Página 1 de 2"`, da página 2 mostra `"Página 2 de 2"`. `drawText` executado sem erro, PDF final válido, confirmado com `node -e`.
3. Erro — PDF de 2 páginas, `paginas_rotacao="5"` → `{ ok: false, erro: 'pagina_fora_do_intervalo', campo: 'paginas_rotacao', extras: { pagina: 5, total_paginas: 2 } }`.

---

## protecao-de-pdf — Marca d'água e senha no PDF *(Plus)*

**Motor:** `arquivo`.

**Problema resolvido:** marcar um PDF como confidencial/rascunho antes de compartilhar (marca d'água), ou impedir que ele seja aberto sem senha.

### Marca d'água — viável, sem biblioteca nova

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo` | `arquivo` (`.pdf`) | sim | 100 MB | — |
| `aplicar_marca_dagua` | `marcador` | não | — | `true` |
| `texto_marca_dagua` | `texto` | obrigatório se `aplicar_marca_dagua` | 1–60 | `"CONFIDENCIAL"` |
| `opacidade` | `inteiro` | não | 5–100 | `30` |

**Processamento:** embute `Helvetica-Bold`; em cada página, `` pagina.drawText(texto_marca_dagua, { x: centro, y: centro, size: 40, font, color: rgb(0.8,0.1,0.1), opacity: opacidade/100, rotate: degrees(45) }) ``, com `x`/`y` calculados para centralizar o texto rotacionado na página. Testado de ponta a ponta com `node -e` real: página de 300×400pt, texto `"CONFIDENCIAL"` a 45°, opacidade 30% — gera um PDF válido de 929 bytes, 1 página, sem erro.

**Erros (marca d'água):** `arquivo_nao_pdf`; `pdf_protegido`; `pdf_corrompido`; `arquivo_grande_demais`; `aplicar_marca_dagua=true` com `texto_marca_dagua=""` → `texto_obrigatorio`.

### Senha de abertura — **decisão pendente**, não incluída nesta rodada

**Motivo:** `pdf-lib` **não implementa** o manipulador de segurança/criptografia do PDF (limitação documentada do próprio projeto `pdf-lib` — não é uma lacuna desta especificação, é da biblioteca). Duas rotas foram encontradas em pesquisa (npm/GitHub), nenhuma delas testada em produção neste projeto:
- **(a) `pdf-encrypt-lib`** (mirror `alestre/pdf-encrypt-lib`, MIT) — complementa o `pdf-lib` com o manipulador de segurança padrão do PDF (AES-256, ISO 32000-2 revisão 6), mas depende de `node-forge` (biblioteca de criptografia maior) e **não está publicada no npm** (precisaria ser referenciada por URL de repositório/tarball, como o projeto já faz com o `xlsx` da CDN oficial do SheetJS). O bundle do `node-forge` precisa ser auditado quanto a uso de `eval`/`new Function` antes de decidir se cabe na CSP estrita do projeto (`script-src 'self'`, sem `unsafe-eval`) — essa auditoria não foi feita nesta especificação.
- **(b)** implementar à mão só o RC4 de 40 bits (o nível mais simples de senha de PDF, mas considerado criptograficamente fraco/obsoleto pelos padrões atuais) — mais controle sobre a CSP (RC4 é só XOR com um fluxo de chave, não precisa de `eval`), porém oferece proteção fraca, quase simbólica.

**Recomendação desta especificação:** lançar `protecao-de-pdf` **só com a marca d'água** nesta rodada (100% viável, sem biblioteca nova) e deixar "senha de abertura" fora do manifesto de recursos até o orquestrador decidir entre (a)/(b) ou descartar a funcionalidade — evita a ferramenta prometer algo que ou não funciona, ou funciona fraco sem avisar (decisão registrada em `docs/decisoes.md`, item 17: nunca virar "botão de mentira"). Enquanto a decisão não sai, `aplicar_senha=true` deve devolver `{ ok: false, erro: 'recurso_nao_disponivel', campo: 'aplicar_senha' }` em vez de aplicar uma senha fraca silenciosamente ou fingir aplicar.

**Saídas:** arquivo PDF processado (com marca d'água).

**Exportação:** `baixar`. Plano Plus (conforme manifesto).

**Celular:** pré-visualização da primeira página com a marca d'água aplicada; controle deslizante de opacidade.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — PDF de 1 página, `aplicar_marca_dagua=true`, `texto_marca_dagua="CONFIDENCIAL"`, `opacidade=30` → PDF válido gerado, mesma contagem de páginas do original. Verificado com `node -e` usando `pdf-lib` real.
2. Comportamento atual (não erro de uso, decisão de produto) — `aplicar_senha=true` → `{ ok: false, erro: 'recurso_nao_disponivel', campo: 'aplicar_senha' }`, até a decisão pendente ser resolvida.
3. Erro — `aplicar_marca_dagua=true`, `texto_marca_dagua=""` → `{ ok: false, erro: 'texto_obrigatorio', campo: 'texto_marca_dagua' }`.

---

## comprimir-pdf — Comprimir PDF *(Plus)*

**Motor:** `arquivo`.

**Problema resolvido:** reduzir o peso de um PDF pesado (normalmente por causa de fotos grandes dentro dele) antes de enviar por e-mail ou anexar num formulário com limite de tamanho.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo` | `arquivo` (`.pdf`) | sim | 100 MB | — |
| `qualidade_imagens` | `inteiro` | sim | 1–100 | `60` |

**Processamento — limite honesto, documentado antes do algoritmo:** a compressão de PDF no navegador tem ganho **real, mas limitado ao tipo de conteúdo**. O algoritmo: percorre os recursos (`XObject`) de cada página procurando imagens com filtro `DCTDecode` (JPEG); para cada uma encontrada, extrai os bytes crus do stream, monta um `Blob` `image/jpeg`, decodifica com `createImageBitmap`, redesenha num `OffscreenCanvas` do mesmo tamanho, reexporta com `canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade_imagens/100 })`, e usa `pdfDoc.embedJpg(novosBytes)` para substituir a referência da imagem original no dicionário de recursos da página, mantendo a posição/tamanho de exibição (`Width`/`Height`/`Matrix`) inalterados.

**Limites honestos (documentados no texto de ajuda da ferramenta, não escondidos):**
- Só imagens **JPEG** (`DCTDecode`) são recomprimidas. Imagens **PNG** embutidas (`FlateDecode` cru, com paleta ou RGB) **não são tocadas** nesta versão — decodificá-las corretamente exigiria remontar a `ImageData` a partir dos parâmetros de `DecodeParms`/`ColorSpace`, com risco de corromper a imagem se algum parâmetro raro não for tratado.
- PDFs **de texto/vetor puro** (sem imagem, como a maioria dos PDFs gerados por Word/Google Docs sem foto) **não diminuem de tamanho** com esta ferramenta — o texto de ajuda avisa isso e, se nenhuma imagem `DCTDecode` for encontrada, a ferramenta devolve o PDF quase do mesmo tamanho (só a reescrita interna do `pdf-lib`, geralmente ±1–3%) com o aviso `"este PDF não tem imagem para recomprimir"`, em vez de prometer uma redução que não vai acontecer.
- Ganho esperado quando o PDF **é** dominado por fotos JPEG grandes: 20–60%, variável conforme o conteúdo e a `qualidade_imagens` escolhida.
- **Não testado com `node -e`:** decodificar/reexportar imagem via `Canvas`/`OffscreenCanvas` exige um navegador real; esta parte do algoritmo foi verificada só na leitura da API (`pdf-lib`/`OffscreenCanvas`/`convertToBlob`), não com execução real nesta especificação — o agente de implementação deve validar com um PDF real contendo JPEG antes de considerar pronto.

**Erros:** `arquivo_nao_pdf`; `pdf_protegido`; `pdf_corrompido`; `arquivo_grande_demais` (> 100 MB).

**Saídas:** arquivo PDF processado, `tamanho_original_kb`, `tamanho_novo_kb`.

**Exportação:** `baixar`. Plano Plus (conforme manifesto).

**Celular:** controle deslizante de `qualidade_imagens`; comparação "antes → depois" do tamanho em destaque.

**Viabilidade:** viável para o caso comum (PDF com fotos JPEG), com o limite honesto acima. Sem biblioteca nova.

**Sobreposição:** `comprimir-imagem` (categoria imagens) recomprime uma imagem solta; `comprimir-pdf` recomprime as imagens **dentro** de um PDF — reaproveitar a mesma lógica de busca de qualidade (se ela existir como módulo compartilhado, ver sugestão em `catalogo-imagens.md`) evita duplicar o código de decodificar/redesenhar/reexportar.

**Casos de teste**
1. Sucesso (qualitativo, não testado com `node -e` por depender de `Canvas` real) — PDF de 5 MB com 3 fotos JPEG grandes, `qualidade_imagens=60` → PDF final tipicamente entre 2 e 4 MB.
2. Sucesso — PDF de texto puro (sem nenhuma imagem `DCTDecode`) → `tamanho_novo_kb ≈ tamanho_original_kb` (variação de ±1–3%), sem erro, com aviso informativo "este PDF não tem imagem para recomprimir".
3. Erro — arquivo `.docx` renomeado para `.pdf` → `{ ok: false, erro: 'arquivo_nao_pdf', campo: 'arquivo' }`.

---

## extrair-texto-de-pdf — Extrair texto do PDF

**Motor:** `arquivo`.

**Problema resolvido:** copiar o texto de dentro de um PDF (contrato, apostila, relatório) sem digitar tudo de novo.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivo` | `arquivo` (`.pdf`) | sim | 100 MB | — |
| `paginas` | `opcao` (`todas`, `intervalo`) + `texto` livre quando `intervalo` (ex.: `"1-3,5"`) | sim | — | `todas` |

**Processamento:** usa a biblioteca nova `pdfjs-dist` — `getDocument({ data: arrayBuffer }).promise` retorna o documento; para cada página selecionada, `pagina.getTextContent()` devolve os fragmentos de texto com posição; concatena `items.map(i => i.str)`, inserindo quebra de linha quando a posição vertical (`item.transform[5]`) muda mais que a altura estimada da fonte (heurística simples de "nova linha", sem tentar reconstruir parágrafos com precisão tipográfica).

### Decisão pendente — risco de CSP com `pdfjs-dist`

**Biblioteca nova:** `pdfjs-dist` (build oficial do Mozilla PDF.js). Apache-2.0. Tamanho do pacote completo é grande (dezenas de MB, incluindo mapas de caracteres e código-fonte), mas o necessário para rodar no navegador é só `pdf.min.mjs` + `pdf.worker.min.mjs` (na faixa de 1–2 MB somados, sem mapas de caracteres exóticos que esta ferramenta não precisa). **Risco real e documentado (issues públicas do projeto `mozilla/pdf.js`):** o módulo `core/function.js` do PDF.js usa `new Function()` para avaliar funções PostScript tipo 4, usadas por alguns espaços de cor (`Separation`/`DeviceN`) — isso viola a CSP `script-src 'self'` deste projeto (que **não** tem `unsafe-eval`) **se e quando** esse código realmente executa, o que só acontece para determinados PDFs que usam esses recursos, não em toda extração de texto.

**O que fazer antes de aprovar esta ferramenta para implementação (decisão do orquestrador, fora do escopo desta especificação):**
1. Servir `pdfjs-dist` localmente (nunca de CDN, como já é regra do projeto) e rodar um teste de fumaça sob a CSP real do projeto com uma bateria de PDFs variados (gerados por Word, Google Docs, Canva, e ao menos um PDF escaneado) — confirmar que nenhum dispara violação de CSP na extração de texto pura (sem renderização visual, que é onde o uso de `new Function()` é mais provável).
2. Se algum PDF disparar a violação: (a) considerar uma exceção pontual de CSP só na página desta ferramenta (mudança em `seguranca-cabecalhos.js`, fora do escopo de `docs/catalogo/`) — arriscado, pois `unsafe-eval` abre superfície de ataque mesmo restrito a uma rota; ou (b) não oferecer esta ferramenta.
3. Enquanto a decisão não sai, este catálogo documenta a ferramenta como **especificada, mas não aprovada para implementação**.

**Erros:** `arquivo_nao_pdf` (confere o cabeçalho `%PDF-` antes de chamar `getDocument`, evitando gastar tempo decodificando um arquivo que nem é PDF); `pdf_protegido`; `pdf_corrompido`; `arquivo_grande_demais` (> 100 MB); `pdf_sem_texto` (aviso, não erro bloqueante — `getTextContent()` devolve vazio em todas as páginas, típico de PDF escaneado como imagem sem OCR; a ferramenta explica isso em vez de devolver texto vazio sem explicação).

**Saídas:** `texto_por_pagina` (lista, uma entrada de texto por página), `texto_completo` (texto).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus (conforme manifesto).

**Celular:** texto extraído em `textarea` de largura total; navegação por página em abas quando o PDF tem muitas páginas.

**Viabilidade:** **decisão pendente**, conforme acima.

**Sobreposição:** nenhuma outra ferramenta lê texto de dentro de PDF.

**Casos de teste** (qualitativos — não testados com `node -e`, pois `pdfjs-dist` não está instalado no projeto ainda; ficam como especificação de comportamento esperado para o agente de implementação confirmar)
1. Sucesso — PDF de 2 páginas com o texto `"Página um."` na primeira e `"Página dois."` na segunda → `texto_por_pagina=["Página um.", "Página dois."]`, `texto_completo="Página um.\n\nPágina dois."`.
2. Sucesso — PDF de 1 página inteiramente escaneada (imagem, sem camada de texto) → `pdf_sem_texto` como aviso informativo, `texto_por_pagina=[""]`, mensagem "este PDF parece ser uma imagem escaneada, sem texto para extrair".
3. Erro — arquivo `.txt` renomeado para `.pdf` (sem o cabeçalho `%PDF-`) → `{ ok: false, erro: 'arquivo_nao_pdf', campo: 'arquivo' }`, detectado antes de chamar `pdfjs-dist`.
