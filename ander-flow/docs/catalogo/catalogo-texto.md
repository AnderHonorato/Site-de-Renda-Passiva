# Catálogo — Texto

Especificação das ferramentas **planejadas** da categoria `texto` (8). `contador-de-texto` já está pronta (§13 dos contratos) e não entra aqui. Todas processam no navegador; nenhum texto sai do aparelho.

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| limpador-de-texto | transformador | sim | nenhuma | só string nativa |
| transformador-de-caixa | transformador | sim | nenhuma | `Intl.Segmenter`/`toLocaleUpperCase` |
| removedor-de-acentos | transformador | sim | nenhuma | `String.normalize('NFD')` |
| remover-linhas-duplicadas-de-texto | transformador | sim | nenhuma | `Set` |
| ordenador-de-linhas | transformador | sim | nenhuma | `Array.sort` + `localeCompare` |
| comparador-de-textos | interativo (justificado) | sim | nenhuma | diff LCS por linha, feito à mão |
| extrator-de-contatos-em-texto | transformador | sim, com ressalva | nenhuma | regex heurística, não valida operadora/DDD real |
| modelo-de-mensagem | documento | sim | nenhuma | template de string |

Nenhuma ferramenta desta categoria precisa de biblioteca nova. Todas cabem na CSP (`script-src 'self'`, sem `unsafe-eval`) porque usam só APIs nativas do navegador.

---

## limpador-de-texto

**Motor:** `transformador` — é exatamente "área de texto (+ opções) → saída ao digitar, copiar/baixar", o caso de uso central do motor.

**Problema resolvido:** a pessoa colou um texto (de PDF, WhatsApp, planilha) bagunçado — espaço duplo, linhas vazias em excesso, frase quebrada no meio — e quer o texto limpo para colar em outro lugar.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 200.000 caracteres | `""` |
| `aparar_bordas` | `marcador` | não | — | `true` |
| `remover_espacos_duplos` | `marcador` | não | — | `true` |
| `remover_linhas_vazias` | `marcador` | não | — | `true` |
| `remover_quebras_soltas` | `marcador` | não | — | `false` |

**Processamento** — pipeline sobre `texto.split('\n')`, nesta ordem, cada etapa condicionada ao marcador correspondente:
1. `aparar_bordas`: `linha.trim()` em cada linha.
2. `remover_espacos_duplos`: `linha.replace(/[ \t]{2,}/g, ' ')`.
3. `remover_quebras_soltas`: percorre as linhas; se a linha acumulada anterior não é vazia, a linha atual não é vazia, e a linha anterior **não termina** em `. ! ? : ; -`, junta as duas com um espaço (trata quebra de linha "solta" no meio de uma frase, comum em texto colado de PDF). Caso contrário começa uma nova linha.
4. `remover_linhas_vazias`: colapsa duas ou mais linhas vazias consecutivas em **uma só** (preserva a separação de parágrafo; não remove todas).
Atualiza a cada tecla (debounce 150 ms). Não há erro bloqueante — texto vazio produz saída vazia e `caracteres_removidos = 0`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `texto_limpo` | texto | sim |
| `caracteres_removidos` | numero | não |

**Exportação:** `copiar`, `baixar` (`.txt`). Sem recurso Plus — ferramenta 100% grátis.

**Celular (390px):** os dois `textarea` (entrada e saída) empilham em vez de ficar lado a lado; `.opcoes` dos marcadores passa de uma linha para grade 2 colunas; botão copiar fica fixo no rodapé do resultado.

**Viabilidade:** total — só operações de string nativas (`split`, `trim`, `replace`, `join`). Sem biblioteca nova.

**Sobreposição:** foca em espaço em branco e quebras, nunca ordena nem deduplica linhas — fica deliberadamente separado de `ordenador-de-linhas` e `remover-linhas-duplicadas-de-texto` (intenções de busca diferentes: "limpar", "ordenar", "duplicada"). Sugestão de PEDIDO: preencher `relacionadas` nos três manifestos (hoje `[]`) apontando um para o outro, em vez de unificar num só formulário — um formulário só com "modo" (limpar/ordenar/deduplicar) perderia foco de SEO por intenção específica.

**Casos de teste**
1. Sucesso — entrada `"Olá   mundo\n\n\nTudo bem?"`, opções padrão → saída `"Olá mundo\n\nTudo bem?"` (espaço duplo colapsado; três linhas vazias tornam-se uma). Verificado com `node -e`.
2. Sucesso — `remover_quebras_soltas=true`, entrada `"Isto é uma frase\nque continua na linha de baixo.\n\nNovo parágrafo."` → saída `"Isto é uma frase que continua na linha de baixo.\n\nNovo parágrafo."`. Verificado com `node -e`.
3. Erro (caso limite, não bloqueante) — entrada `""` → saída `""`, `caracteres_removidos = 0`; nenhum código de erro disparado.

---

## transformador-de-caixa

**Motor:** `transformador` — texto solto + opção de modo → saída ao digitar.

**Problema resolvido:** o texto veio em CAIXA ALTA (ou minúsculo demais) e a pessoa quer maiúsculas, minúsculas, Cada Palavra Maiúscula ou frase normal, sem reescrever à mão.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 50.000 caracteres | `""` |
| `modo` | `opcao` (`maiuscula`, `minuscula`, `cada_palavra`, `frase`) | sim | — | `maiuscula` |

**Processamento:**
- `maiuscula`: `texto.toLocaleUpperCase('pt-BR')`.
- `minuscula`: `texto.toLocaleLowerCase('pt-BR')`.
- `cada_palavra` (Title Case): `texto.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\S)/g, (m, esp, letra) => esp + letra.toLocaleUpperCase('pt-BR'))` — capitaliza a primeira letra de cada "palavra" (sequência separada por espaço).
- `frase` (Sentence case): como `cada_palavra`, mas só capitaliza a letra após início de string ou após `. ! ?` seguido de espaço; resto em minúsculas.
Sem erro possível — qualquer texto (inclusive vazio) tem saída definida.

**Saídas:** `texto_transformado` (texto, destaque).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus.

**Celular:** `.opcoes` do modo vira lista de botões segmentados em 2×2; textarea de entrada e saída empilhados.

**Viabilidade:** total, `toLocaleUpperCase`/`toLocaleLowerCase` com locale `pt-BR` tratam corretamente acentos (ex.: `à` → `À`). Sem biblioteca nova.

**Sobreposição:** nenhuma — é a única ferramenta de caixa de texto no catálogo.

**Casos de teste**
1. Sucesso — `modo=cada_palavra`, entrada `"MARIA DA silva SOUZA"` → saída `"Maria Da Silva Souza"`. Verificado com `node -e`.
2. Sucesso — `modo=minuscula`, entrada `"SÃO PAULO"` → saída `"são paulo"`.
3. Erro — não se aplica (nenhuma entrada é rejeitada); entrada vazia → saída vazia.

---

## removedor-de-acentos

**Motor:** `transformador`.

**Problema resolvido:** um sistema antigo (ou uma URL, um código) não aceita acento, e a pessoa precisa do texto sem acentuação mas mantendo a pontuação.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 50.000 caracteres | `""` |
| `manter_pontuacao` | `marcador` | não | — | `true` |

**Processamento:** `texto.normalize('NFD').replace(/[̀-ͯ]/g, '')` remove os diacríticos (acento, til, cedilha decomposta) mantendo a letra base e toda a pontuação, porque a normalização Unicode NFD separa a letra do sinal combinante sem tocar em `. , ! ? & —` etc. Quando `manter_pontuacao=false`, aplica adicionalmente `.replace(/[^\w\s]/g, '')` (remove tudo que não é letra/número/espaço). Sem erro possível.

**Saídas:** `texto_sem_acento` (texto, destaque).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus.

**Celular:** textareas empilhados; marcador único em linha própria.

**Viabilidade:** total — `String.prototype.normalize` é padrão desde ES2015, presente em todo navegador atual. Sem biblioteca nova.

**Sobreposição:** nenhuma direta; é um caso particular que `limpador-de-texto` não cobre (limpador não toca em acentuação).

**Casos de teste**
1. Sucesso — entrada `"São Paulo — Ação & Café"` → saída `"Sao Paulo — Acao & Cafe"`. Verificado com `node -e`.
2. Sucesso — `manter_pontuacao=false`, entrada `"Preço: R$ 10,00!"` → saída `"Preco R 1000"` (pontuação e cifrão removidos, dígitos e espaço mantidos — a vírgula desaparece, então "10,00" se torna "1000"; a ferramenta deve avisar isso no texto de ajuda, já que remover pontuação também afeta números decimais).
3. Erro — não se aplica; entrada vazia → saída vazia.

---

## remover-linhas-duplicadas-de-texto

**Motor:** `transformador`.

**Problema resolvido:** uma lista colada (e-mails, nomes, códigos) tem linhas repetidas e a pessoa quer só uma ocorrência de cada, mantendo a primeira.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 100.000 caracteres / até 20.000 linhas | `""` |
| `ignorar_maiusculas` | `marcador` | não | — | `true` |
| `ignorar_espacos_nas_bordas` | `marcador` | não | — | `true` |
| `ignorar_linhas_vazias` | `marcador` | não | — | `false` |

**Processamento:** percorre `texto.split('\n')` mantendo um `Set` de chaves já vistas. Para cada linha, a **chave de comparação** é a linha após `ignorar_espacos_nas_bordas` (`.trim()`) e `ignorar_maiusculas` (`.toLocaleLowerCase('pt-BR')`) serem aplicados condicionalmente; a **linha mantida na saída é sempre a original** (sem alterar caixa/espaços), só a primeira ocorrência de cada chave. Se `ignorar_linhas_vazias=true`, chaves vazias não entram no `Set` (todas as linhas vazias são mantidas, não tratadas como duplicata umas das outras). Acima de 20.000 linhas → erro `texto_grande_demais`.

**Saídas:** `texto_sem_duplicadas` (texto, destaque), `linhas_removidas` (inteiro).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus.

**Celular:** textareas empilhados; contador de linhas removidas em `.resultado__linha--destaque`.

**Viabilidade:** total — `Set` nativo, O(n). Sem biblioteca nova.

**Sobreposição:** distinta de `ordenador-de-linhas` (uma deduplica, outra ordena; podem ser usadas em sequência, por isso `relacionadas` deveria listar uma a outra — PEDIDO). Não unificar: cada uma responde a uma intenção de busca isolada ("linha repetida" vs. "ordem alfabética").

**Casos de teste**
1. Sucesso — entrada `"banana\nMaçã\nbanana\nUva\nmaçã"`, padrão (`ignorar_maiusculas=true`, `ignorar_espacos_nas_bordas=true`) → saída `"banana\nMaçã\nUva"`, `linhas_removidas = 2`. Verificado com `node -e`.
2. Sucesso — `ignorar_maiusculas=false`, mesma entrada → saída `"banana\nMaçã\nbanana\nUva\nmaçã"` sem remoção nenhuma exceto a linha `banana` repetida exatamente igual (índice 2) → `"banana\nMaçã\nUva\nmaçã"`, `linhas_removidas = 1`.
3. Erro — entrada com 20.001 linhas → `{ ok: false, erro: 'texto_grande_demais', campo: 'texto', extras: { limite: 20000 } }`.

---

## ordenador-de-linhas

**Motor:** `transformador`.

**Problema resolvido:** colocar uma lista colada em ordem alfabética, numérica, inversa, ou embaralhada, sem copiar para o Excel só para isso.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 100.000 caracteres / 20.000 linhas | `""` |
| `modo` | `opcao` (`alfabetica`, `numerica`, `reversa`, `aleatoria`) | sim | — | `alfabetica` |
| `remover_linhas_vazias` | `marcador` | não | — | `true` |
| `ignorar_maiusculas` | `marcador` (só afeta `alfabetica`) | não | — | `true` |

**Processamento:**
- Filtra linhas vazias primeiro se `remover_linhas_vazias`.
- `alfabetica`: `[...linhas].sort((a, b) => (ignorar_maiusculas ? a.toLocaleLowerCase('pt-BR') : a).localeCompare(ignorar_maiusculas ? b.toLocaleLowerCase('pt-BR') : b, 'pt-BR'))`.
- `numerica`: extrai o primeiro número de cada linha com `parseFloat`; linha sem número numérico vai para o fim, na ordem original entre si; ordena crescente por esse número.
- `reversa`: inverte a ordem atual das linhas (`.reverse()`), sem reordenar por valor.
- `aleatoria`: embaralhamento Fisher–Yates usando `crypto.getRandomValues` (não `Math.random`, para não ser previsível em sorteios que usem esta tela).
Acima de 20.000 linhas → erro `texto_grande_demais`.

**Saídas:** `texto_ordenado` (texto, destaque).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus.

**Celular:** `.opcoes` de modo em grade 2×2; textareas empilhados.

**Viabilidade:** total — `Array.sort`, `localeCompare`, `crypto.getRandomValues` nativos. Sem biblioteca nova.

**Sobreposição:** ver nota em `remover-linhas-duplicadas-de-texto`; workflow comum é deduplicar e depois ordenar — ficam como duas ferramentas encadeáveis via `relacionadas`, não uma só.

**Casos de teste**
1. Sucesso — `modo=alfabetica`, entrada `"banana\nabacaxi\nUva\nmaçã"` → saída `["abacaxi","banana","maçã","Uva"]` juntas por `\n` (comparação com `localeCompare('pt-BR')` ordena por letra ignorando caixa: "Uva" fica depois de "maçã" porque `m < u`). Verificado com `node -e`.
2. Sucesso — `modo=numerica`, entrada `"10\n2\n33\n4"` → saída `"2\n4\n10\n33"`. Verificado com `node -e`.
3. Erro — texto com mais de 20.000 linhas → `{ ok: false, erro: 'texto_grande_demais', campo: 'texto' }`.

---

## comparador-de-textos

**Motor:** `interativo` (excepcional, justificado) — o motor `transformador` só descreve **uma** área de texto com opções; esta ferramenta precisa de **duas** áreas de texto sincronizadas mais uma renderização linha a linha com marcação de "igual/removida/adicionada" (cores e sinais `+`/`−`), que nenhum motor genérico cobre. HTML ainda é gerado; só o script de interação (`comparador-de-textos.js`) é próprio.

**Problema resolvido:** saber exatamente o que mudou entre duas versões de um texto (contrato, descrição, script) sem reler tudo palavra por palavra.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto_a` | `area-texto` | sim | 100.000 caracteres | `""` |
| `texto_b` | `area-texto` | sim | 100.000 caracteres | `""` |
| `ignorar_espacos` | `marcador` | não | — | `false` |
| `ignorar_maiusculas` | `marcador` | não | — | `false` |

**Processamento — diff de linhas por LCS (subsequência comum mais longa):**
1. `A = texto_a.split('\n')`, `B = texto_b.split('\n')`; se `ignorar_espacos`/`ignorar_maiusculas`, compara com `.trim()`/`.toLocaleLowerCase('pt-BR')` mas exibe a linha original.
2. Monta a tabela `dp[i][j]` de tamanho `(m+1)×(n+1)` com programação dinâmica clássica: `dp[i][j] = A[i]===B[j] ? dp[i+1][j+1]+1 : max(dp[i+1][j], dp[i][j+1])`, preenchida de trás para a frente.
3. Percorre `i=0,j=0` para a frente: linha igual em `A[i]` e `B[j]` → marca `igual`, avança os dois; senão, escolhe remover `A[i]` (`removida`) ou inserir `B[j]` (`adicionada`) seguindo o maior valor em `dp[i+1][j]` vs `dp[i][j+1]`; ao fim, sobras de `A` são `removida` e sobras de `B` são `adicionada`.
4. Acima de 5.000 linhas em qualquer lado → erro `texto_grande_demais` (a tabela `dp` é O(m·n); 5.000×5.000 já é 25 milhões de células, limite pensado para não travar o navegador).

**Saídas:** `linhas` (lista de `{ tipo: 'igual'|'removida'|'adicionada', texto }`, sem destaque numérico único), `total_adicionadas` (inteiro), `total_removidas` (inteiro).

**Exportação:** `copiar` (copia o diff em texto com prefixo `+`/`-`/` `), `baixar` (`.txt` no formato unificado simples). Sem Plus.

**Celular (390px):** as duas entradas empilham (A em cima, B embaixo, cada uma com rótulo "Antes"/"Depois"); o resultado do diff usa `+`/`-` no início da linha em vez de duas colunas coloridas lado a lado (que não cabem em 390px).

**Viabilidade:** total — algoritmo de LCS implementado à mão em `comparador-de-textos-calculo.js`, sem biblioteca de diff externa (evita dependência de `diff`/`jsdiff` justamente porque o algoritmo é simples e a especificação pede lógica pura testável). Custo O(m·n) aceitável dentro do limite de 5.000 linhas.

**Sobreposição:** nenhuma — é a única ferramenta de diff textual do catálogo (`comparar-planilhas`, na categoria planilhas, faz diff de **linhas tabulares por chave**, não de texto livre linha a linha; lógicas diferentes, não unificar).

**Casos de teste**
1. Sucesso — `texto_a="linha1\nlinha2\nlinha3"`, `texto_b="linha1\nlinha2 mudou\nlinha3"` → `linhas = [{igual,"linha1"},{removida,"linha2"},{adicionada,"linha2 mudou"},{igual,"linha3"}]`, `total_adicionadas=1`, `total_removidas=1`. Verificado com `node -e`.
2. Sucesso — textos idênticos → todas as linhas `igual`, `total_adicionadas=0`, `total_removidas=0`.
3. Erro — `texto_a` com 5.001 linhas → `{ ok: false, erro: 'texto_grande_demais', campo: 'texto_a' }`.

---

## extrator-de-contatos-em-texto

**Motor:** `transformador`.

**Problema resolvido:** copiar de um e-mail ou anúncio um bloco de texto e tirar dali só os e-mails, telefones e links, sem catar um por um.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 100.000 caracteres | `""` |
| `tipos` | `opcao` múltipla (`email`, `telefone`, `link`) — na prática 3 marcadores | não | — | todos marcados |

**Processamento — três expressões regulares independentes, aplicadas com `matchAll`:**
- E-mail: `/[\w.+-]+@[\w-]+\.[\w.-]+/g`.
- Telefone (Brasil, heurística): `/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}/g` — casa DDD opcional entre parênteses, nono dígito opcional, com ou sem hífen. **Limite honesto:** é heurística de formato, não confere se o DDD existe nem se o número está ativo (nunca consulta operadora).
- Link: `/https?:\/\/[^\s)]+/g` mais `/\bwww\.[^\s)]+/g`.
Cada lista de resultado passa por deduplicação (`Set`) mantendo a primeira ocorrência. Texto sem nenhum contato encontrado não é erro — retorna listas vazias com uma mensagem de estado vazio na tela (não um código de erro).

**Saídas:** `emails` (lista), `telefones` (lista), `links` (lista), `total_encontrados` (inteiro, destaque).

**Exportação:** `copiar` (cada lista, um contato por linha), `baixar` (`.csv` com colunas `tipo,valor`). Sem Plus.

**Celular:** as três listas (e-mails, telefones, links) empilham em abas (`.abas`) em vez de três colunas, para não espremer texto longo de link.

**Viabilidade:** total — regex nativo. Sem biblioteca nova.

**Sobreposição:** nenhuma ferramenta do catálogo faz extração de contato; não compete com `validador-cpf-cnpj` (documento fiscal, não contato).

**Casos de teste**
1. Sucesso — entrada `"Fale com joao@email.com ou (11) 98765-4321, tel fixo 3344-5566."` → `emails=["joao@email.com"]`, `telefones=["(11) 98765-4321","3344-5566"]`, `links=[]`, `total_encontrados=3`. Verificado com `node -e`.
2. Sucesso — entrada sem nenhum contato (`"Bom dia a todos."`) → `emails=[]`, `telefones=[]`, `links=[]`, `total_encontrados=0` (estado vazio, não erro).
3. Erro — texto acima de 100.000 caracteres → `{ ok: false, erro: 'texto_grande_demais', campo: 'texto' }`.

---

## modelo-de-mensagem

**Motor:** `documento` — campos → pré-visualização formatada (a mensagem pronta) → copiar. É o mesmo padrão de "campos preenchem um texto formatado" usado em `declaracao`/`recibo` (documentos), só que o resultado é uma mensagem solta, não um PDF.

**Problema resolvido:** escrever rápido uma mensagem educada de cobrança, aviso ou agradecimento, sem começar do zero e sem escrever algo constrangedor.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo_modelo` | `opcao` (`aviso`, `cobranca`, `agradecimento`) | sim | — | `aviso` |
| `destinatario` | `texto` | sim | 1–80 caracteres | — |
| `nome_remetente` | `texto` | não | ≤ 80 caracteres | `""` |
| `assunto_extra` | `texto` | não (obrigatório se `tipo_modelo=aviso`) | ≤ 200 caracteres | `""` |
| `valor` | `moeda` | obrigatório se `tipo_modelo=cobranca` | min 0,01 | — |
| `vencimento` | `data` | obrigatório se `tipo_modelo=cobranca` | — | — |
| `dias_atraso` | `inteiro` | não | min 0 | calculado |

**Processamento:**
- Se `dias_atraso` não informado e `tipo_modelo=cobranca`: `dias_atraso = max(0, floor((hoje − vencimento) / 86.400.000))`.
- Monta o texto por template conforme `tipo_modelo` (todos terminam com `\n\n{nome_remetente}`, omitindo a linha se `nome_remetente` vazio):
  - `aviso`: `"Olá, {destinatario}. {assunto_extra} Qualquer dúvida, estou à disposição."`
  - `cobranca`: `"Olá, {destinatario}. Passando para lembrar do pagamento de {valor}, com vencimento em {vencimento}{atraso}. Qualquer dúvida, estou à disposição para ajudar."`, onde `{atraso} = dias_atraso > 0 ? " (" + dias_atraso + " dia(s) em atraso)" : ""`.
  - `agradecimento`: `"Olá, {destinatario}. Muito obrigado! Foi um prazer atender você."`
- `{valor}` formatado com `formatarMoeda`, `{vencimento}` com `formatarData` (`DD/MM/AAAA`).
**Erros:** `destinatario` vazio → `destinatario_obrigatorio`; `tipo_modelo=cobranca` com `valor ≤ 0` → `valor_invalido`; `tipo_modelo=aviso` com `assunto_extra` vazio → `assunto_obrigatorio`.

**Saídas:** `mensagem_pronta` (texto, destaque).

**Exportação:** `copiar`. Sem PDF (é mensagem de chat/e-mail, não documento formal) — `exportar: ["copiar"]`. Sem Plus.

**Celular:** campos empilhados; resultado em painel `.resultado` de largura total com botão "Copiar mensagem" fixo (`.botao--largo`) no fim.

**Viabilidade:** total — só template de string com `formatarMoeda`/`formatarData` já existentes em `compartilhado-formatar.js`. Sem biblioteca nova.

**Sobreposição:** conceito de template compartilhado com `declaracao`/`recibo` (documentos), mas saída é texto solto, não PDF — não unificar (públicos e exportação diferentes). Relação natural com `gerador-de-link-whatsapp` (marketing): depois de gerar a mensagem, a pessoa pode querer o link `wa.me` já preenchido. Sugestão de PEDIDO: `relacionadas: ["gerador-de-link-whatsapp"]`.

**Casos de teste**
1. Sucesso — `tipo_modelo=cobranca`, `destinatario="Maria"`, `valor=150.00`, `vencimento="2026-09-10"`, `dias_atraso` não informado, "hoje" simulado `2026-09-24` → `dias_atraso=14` e mensagem contém `"R$ 150,00"`, `"10/09/2026"` e `"(14 dia(s) em atraso)"`. Cálculo de dias verificado com `node -e`.
2. Sucesso — `tipo_modelo=aviso`, `destinatario="Equipe"`, `assunto_extra="Amanhã não teremos expediente."`, `nome_remetente=""` → `mensagem_pronta = "Olá, Equipe. Amanhã não teremos expediente. Qualquer dúvida, estou à disposição."` (sem linha de assinatura, pois remetente vazio).
3. Erro — `destinatario=""` → `{ ok: false, erro: 'destinatario_obrigatorio', campo: 'destinatario' }`.
