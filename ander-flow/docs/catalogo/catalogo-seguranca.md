# Catálogo — Segurança

Especificação das 3 ferramentas **planejadas** da categoria `seguranca`. Todas processam no navegador; nenhum dado (senha, arquivo, documento) sai do aparelho.

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| gerador-de-senhas | calculadora | sim | nenhuma | `crypto.getRandomValues` |
| hash | arquivo | sim | nenhuma | `crypto.subtle.digest` (Web Crypto); **MD5 não existe** no Web Crypto — não oferecido |
| validador-cpf-cnpj | calculadora | sim | nenhuma | dígito verificador só matemático, nunca consulta a Receita |

Nenhuma biblioteca nova. Todas cabem na CSP sem `unsafe-eval`.

---

## gerador-de-senhas

**Motor:** `calculadora` — campos (tipo, comprimento, categorias de caractere) → resultado (lista de senhas geradas + força). O botão "Gerar" ocupa o lugar de "Calcular"; é aceitável porque o resultado depende de sorteio, não de uma fórmula fixa, mas a forma campos→resultado é a mesma do motor.

**Problema resolvido:** criar uma senha forte (ou PIN, senha de Wi-Fi, frase-senha) sem reutilizar a mesma de sempre, com uma medida real de quão forte ela é.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo` | `opcao` (`senha`, `pin`, `wifi`, `frase`) | sim | — | `senha` |
| `comprimento` | `inteiro` | sim (ignorado em `frase`) | 4–128 | `16` |
| `incluir_maiusculas` | `marcador` | não (só `senha`/`wifi`) | — | `true` |
| `incluir_minusculas` | `marcador` | não (só `senha`/`wifi`) | — | `true` |
| `incluir_numeros` | `marcador` | não (só `senha`/`wifi`; sempre `true` e travado em `pin`) | — | `true` |
| `incluir_simbolos` | `marcador` | não (só `senha`/`wifi`) | — | `true` |
| `quantidade_palavras` | `inteiro` | não (só `frase`) | 3–10 | `4` |
| `quantidade_gerar` | `inteiro` | não | 1–50 | `1` |

**Processamento:**
- `pin`: sorteia `comprimento` dígitos (`0-9`) via `crypto.getRandomValues` com descarte de bytes fora do intervalo 0–9 (rejection sampling, sem viés de módulo).
- `senha`/`wifi`: monta o alfabeto concatenando as categorias marcadas (`ABCDEFGHIJKLMNOPQRSTUVWXYZ` / `abcdefghijklmnopqrstuvwxyz` / `0123456789` / `!@#$%^&*()-_=+`); sorteia `comprimento` caracteres do alfabeto via `crypto.getRandomValues` (rejection sampling); se o resultado não contiver ao menos 1 caractere de cada categoria marcada, sorteia de novo (garante representatividade quando `comprimento` ≥ número de categorias marcadas).
- `frase`: sorteia `quantidade_palavras` palavras (sem repetir) de uma lista fixa de palavras comuns em português (mínimo 500 palavras, embutida em `gerador-de-senhas-calculo.js`), capitaliza a primeira letra de uma palavra escolhida ao acaso, anexa 2 dígitos aleatórios ao final; junta tudo com hífen.
- Repete o sorteio `quantidade_gerar` vezes, cada resultado distinto dos anteriores.
- Calcula a **entropia em bits**: `senha`/`wifi`/`pin` → `log2(tamanhoDoAlfabeto) × comprimento`; `frase` → `log2(tamanhoDaLista) × quantidade_palavras` (dígitos finais somam um pouco mais, mas o cálculo conservador usa só as palavras). Classifica: `< 28` → `fraca`; `28–35` → `razoavel`; `36–59` → `boa`; `≥ 60` → `forte`.

**Erros:** `comprimento` fora de 4–128 → `comprimento_invalido`; `senha`/`wifi` com todas as 4 categorias desmarcadas → `nenhuma_categoria_selecionada`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `senhas_geradas` | lista | sim |
| `entropia_bits` | numero | não |
| `classificacao_forca` | texto | não |

**Exportação:** `copiar` (cada senha ou a lista toda). Sem Plus.

**Celular:** lista de senhas geradas em `.lista-densa`; medidor de força como barra horizontal (`.progresso`) com rótulo da classificação.

**Viabilidade:** total — `crypto.getRandomValues()` nativo garante aleatoriedade criptográfica (nunca `Math.random()`, que não serve para senha). Sem biblioteca nova.

**Sobreposição:** nenhuma; é a única geradora de credenciais do catálogo.

**Casos de teste**
1. Sucesso — `tipo=senha`, `comprimento=12`, todas as 4 categorias marcadas (alfabeto de 26+26+10+8=70 símbolos) → `entropia_bits = 73.6`, `classificacao_forca="forte"`. Cálculo `log2(70) × 12 = 73.6` verificado com `node -e`.
2. Sucesso — `tipo=pin`, `comprimento=4` → `entropia_bits = log2(10) × 4 = 13.3`, `classificacao_forca="fraca"` (esperado: PIN de 4 dígitos serve para desbloqueio rápido, não para senha de sistema — texto de ajuda deve avisar isso).
3. Erro — `tipo=senha`, todas as 4 categorias desmarcadas → `{ ok: false, erro: 'nenhuma_categoria_selecionada', campo: 'incluir_maiusculas' }`.

---

## hash — Gerador de hash

**Motor:** `arquivo` — mesmo que a entrada mais comum seja texto colado, o motor `arquivo` cobre os dois casos (texto tratado como um "arquivo" em memória via `Blob`, e arquivo real do aparelho) com a mesma área de soltar/entrada, o que evita duplicar UI para os dois modos.

**Problema resolvido:** conferir a integridade de um arquivo baixado (o hash bate com o publicado?) ou gerar rapidamente o hash de um texto/senha para comparação.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo_entrada` | `opcao` (`texto`, `arquivo`) | sim | — | `texto` |
| `texto` | `area-texto` | obrigatório se `modo_entrada=texto` | 5.000.000 caracteres | `""` |
| `arquivo` | `arquivo` | obrigatório se `modo_entrada=arquivo` | 100 MB (mesmo limite de `juntar-pdf`, §13) | — |
| `algoritmo` | `opcao` (`SHA-1`, `SHA-256`, `SHA-384`, `SHA-512`) | sim | — | `SHA-256` |

**Processamento:** `buffer = modo_entrada === 'texto' ? new TextEncoder().encode(texto) : await arquivo.arrayBuffer()`; `digest = await crypto.subtle.digest(algoritmo, buffer)`; converte o `ArrayBuffer` resultante para hexadecimal minúsculo (`Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('')`). **`crypto.subtle.digest` exige que o arquivo inteiro esteja em memória** (não há hashing em streaming na Web Crypto API) — por isso o limite de 100 MB, para não travar o navegador com arquivos maiores. **MD5 não está disponível**: o Web Crypto padrão do navegador não implementa MD5 (só SHA-1/256/384/512); a ferramenta não oferece MD5 — o texto de ajuda explica que MD5 está obsoleto para verificação de integridade e que, se algum arquivo publicado só trouxer hash MD5, esta ferramenta não serve para conferi-lo.

**Erros:** nem `texto` nem `arquivo` informado → `entrada_obrigatoria`; `arquivo` vazio (0 bytes) → `arquivo_vazio`; `arquivo` acima de 100 MB → `arquivo_grande_demais`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `hash_hexadecimal` | texto | sim |
| `algoritmo_usado` | texto | não |

**Exportação:** `copiar`. Sem Plus.

**Celular:** área de soltar/`textarea` de largura total; seletor de algoritmo em `.opcoes` de 2×2.

**Viabilidade:** total — `crypto.subtle.digest` é API nativa padrão (Web Crypto), disponível em contexto seguro (HTTPS/localhost). Sem biblioteca nova (não precisa de `js-sha256`/`crypto-js`).

**Sobreposição:** nenhuma; `gerador-de-senhas` também usa `crypto`, mas para aleatoriedade, não digest.

**Casos de teste**
1. Sucesso — `modo_entrada=texto`, `algoritmo=SHA-256`, `texto="ander flow"` → `hash_hexadecimal="7722fc9417abc81c988bf98912abb8596beeda93a66b8fd5f64def08ce3e66c7"` (64 caracteres hex). Verificado com `node -e` (`crypto.createHash('sha256')`, equivalente ao SHA-256 do Web Crypto).
2. Sucesso — mesma entrada, `algoritmo=SHA-1` → `hash_hexadecimal="9f7041087412c56fc45562e49f25ef2f8a357074"` (40 caracteres hex). Verificado com `node -e`.
3. Erro — `modo_entrada=arquivo`, arquivo de 0 bytes → `{ ok: false, erro: 'arquivo_vazio', campo: 'arquivo' }`.

---

## validador-cpf-cnpj

**Motor:** `calculadora` — campo (documento) → resultado (tipo, formatado, válido/inválido).

**Problema resolvido:** conferir rapidamente se um CPF ou CNPJ digitado tem os dígitos verificadores corretos, antes de cadastrar num sistema.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `documento` | `texto` | sim | aceita com ou sem pontuação/máscara | `""` |

**Processamento:**
1. Remove tudo que não é dígito (`documento.replace(/\D/g, '')`).
2. Comprimento diferente de 11 e de 14 → erro `tamanho_invalido`.
3. Todos os dígitos iguais (`/^(\d)\1*$/`, ex.: `000.000.000-00` ou `11.111.111/1111-11`) → erro `documento_invalido` diretamente (essas sequências têm dígito verificador matematicamente "correto" nos dois algoritmos abaixo, mas nunca são documentos reais — têm de ser rejeitadas explicitamente).
4. **CPF (11 dígitos)** — dois dígitos verificadores calculados por peso decrescente: para os 9 primeiros dígitos, `soma = Σ dígito[i] × (10 − i)` (i de 0 a 8); `dv1 = (soma × 10) % 11`, tratando resultado `10` como `0`; para o `dv2`, repete com os 10 primeiros dígitos (incluindo `dv1`) e pesos de `11` a `2`. Válido se `dv1` e `dv2` batem com as posições 10 e 11 do documento.
5. **CNPJ (14 dígitos)** — pesos fixos `[5,4,3,2,9,8,7,6,5,4,3,2]` para o primeiro dígito verificador e `[6,5,4,3,2,9,8,7,6,5,4,3,2]` para o segundo (incluindo o primeiro DV já calculado); `soma = Σ dígito[i] × peso[i]`; `resto = soma % 11`; `dv = resto < 2 ? 0 : 11 − resto`.
6. Formata: CPF → `000.000.000-00`; CNPJ → `00.000.000/0000-00`.

**Erros:** `tamanho_invalido` (nem 11 nem 14 dígitos); `documento_invalido` (dígito verificador não confere, ou sequência de dígitos repetidos).

**Saídas**
| id | formato | destaque |
|---|---|---|
| `tipo_detectado` | texto (`"CPF"`/`"CNPJ"`) | não |
| `documento_formatado` | texto | sim |
| `valido` | texto (`"válido"`/`"inválido"`) | não |

**Aviso na tela de ajuda:** "Confere só os dígitos verificadores matemáticos — nunca consulta a Receita Federal, não confirma se o documento existe ou está ativo."

**Exportação:** `copiar` (o documento formatado). Sem Plus.

**Celular:** campo único de largura total; resultado com selo `.etiqueta--sucesso`/`.etiqueta--erro` grande.

**Viabilidade:** total — só aritmética de módulo em `Array`/`Number`. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `documento="111.444.777-35"` → `tipo_detectado="CPF"`, `documento_formatado="111.444.777-35"`, `valido="válido"`. Verificado com `node -e`.
2. Sucesso — `documento="11.222.333/0001-81"` → `tipo_detectado="CNPJ"`, `documento_formatado="11.222.333/0001-81"`, `valido="válido"`. Verificado com `node -e`.
3. Erro — `documento="111.444.777-36"` (último dígito trocado) → `{ ok: false, erro: 'documento_invalido', campo: 'documento' }`. Confirmado com `node -e` (o mesmo algoritmo calcula `dv2 = 5`, não `6`).
