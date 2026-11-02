# Catálogo — Desenvolvimento

Especificação das 6 ferramentas **planejadas** da categoria `desenvolvimento`. Todas processam no navegador; nenhum dado sai do aparelho.

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| json | transformador | sim | nenhuma | `JSON.parse`/`stringify` + tokenizador manual para linha/coluna |
| base64 | transformador | sim | nenhuma | `TextEncoder`, `btoa`/`atob` ou `Uint8Array`↔base64 nativo |
| uuid | calculadora | sim | nenhuma | `crypto.randomUUID()` nativo |
| regex | interativo (justificado) | sim | nenhuma | `RegExp` nativo, realce de correspondência é interação própria |
| timestamp | calculadora | sim | nenhuma | `Date`, `Intl.DateTimeFormat` |
| url-e-codificacao | transformador | sim | nenhuma | `encodeURI(Component)`/`decodeURI(Component)` + mapa de entidades HTML manual |

Nenhuma ferramenta precisa de biblioteca nova — todas usam só APIs nativas do navegador, compatíveis com a CSP sem `unsafe-eval`.

---

## json — JSON: validar e formatar

**Motor:** `transformador` — texto (o JSON colado) + opções (ação, indentação) → saída ao digitar, copiar/baixar.

**Problema resolvido:** um JSON colado (de uma API, de um log) está ilegível ou quebrado, e a pessoa quer ele formatado ou saber exatamente onde está o erro.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 5.000.000 caracteres (~5 MB) | `""` |
| `acao` | `opcao` (`validar`, `formatar`, `minificar`, `ordenar_chaves`) | sim | — | `formatar` |
| `indentacao` | `inteiro` | não (só usado em `formatar`/`ordenar_chaves`) | 1–8 | `2` |

**Processamento:**
1. Tenta `JSON.parse(texto)`.
2. Se **válido**: conforme `acao` — `formatar` → `JSON.stringify(objeto, null, indentacao)`; `minificar` → `JSON.stringify(objeto)`; `ordenar_chaves` → percorre o objeto recursivamente reordenando as chaves de cada nível em ordem alfabética (arrays mantêm a ordem dos itens, só objetos são reordenados) e então `JSON.stringify` com a `indentacao`; `validar` → mantém o texto original, só informa "JSON válido" e contagens (chaves de nível raiz, itens se for array).
3. Se **inválido**: `JSON.parse` lança, mas a mensagem nativa do motor varia entre navegadores/versões — por isso **não depende do texto do erro**. Em vez disso, roda um tokenizador manual próprio (percorre caractere a caractere contando linha e coluna, reconhecendo os 6 tokens de JSON: `{ } [ ] : ,`, string entre aspas, número, `true`/`false`/`null`) até achar o primeiro caractere que não é válido naquele ponto da gramática, e devolve a posição exata desse caractere.

**Erros:** JSON malformado → `json_invalido`, `campo: 'texto'`, `extras: { linha, coluna }`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `json_formatado` | texto | sim |
| `valido` | texto (`"válido"`/`"inválido"`) | não |
| `total_chaves_raiz` | inteiro | não |

**Exportação:** `copiar`, `baixar` (`.json`). Sem Plus.

**Celular (390px):** um único `textarea` grande (entrada e saída se alternam por abas "Editar"/"Resultado" em vez de lado a lado); botões de ação em grade 2×2.

**Viabilidade:** total — `JSON.parse`/`JSON.stringify` nativos; o tokenizador de linha/coluna é lógica pura em `json-calculo.js`, sem biblioteca externa (bibliotecas como `jsonlint` trariam dependência extra só para isso).

**Sobreposição:** nenhuma direta. `csv-e-json` (planilhas) converte CSV↔JSON mas não valida/formata JSON solto — ferramentas complementares, não duplicadas.

**Casos de teste**
1. Sucesso (`ordenar_chaves`) — entrada `{"nome":"Ana","idade":30,"cidade":"SP"}`, `indentacao=2` → `json_formatado` igual a `JSON.stringify({cidade:"SP",idade:30,nome:"Ana"}, null, 2)`, ou seja `{"cidade":"SP","idade":30,"nome":"Ana"}` reindentado. Verificado com `node -e`.
2. Sucesso (`formatar`) — entrada `{"nome":"Ana","idade":30,"cidade":"SP"}`, `indentacao=2` → saída:
   ```
   {
     "nome": "Ana",
     "idade": 30,
     "cidade": "SP"
   }
   ```
   Verificado com `node -e`.
3. Erro — entrada:
   ```
   {
     "nome": "Ana",
     "idade": ,
     "cidade": "SP"
   }
   ```
   → `{ ok: false, erro: 'json_invalido', campo: 'texto', extras: { linha: 3, coluna: 12 } }` (a vírgula na posição do valor esperado após `"idade":`). Posição confirmada por contagem de caracteres com `node -e` (índice 30 na string completa, linha 3, coluna 12).

---

## base64 — Base64: codificar e decodificar

**Motor:** `transformador`.

**Problema resolvido:** transformar um texto (ou um arquivo pequeno, como uma imagem para embutir em CSS/e-mail) em Base64, ou decodificar um Base64 recebido, sem instalar nada.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo_entrada` | `opcao` (`texto`, `arquivo`) | sim | — | `texto` |
| `texto` | `area-texto` | obrigatório se `modo_entrada=texto` | 5.000.000 caracteres | `""` |
| `arquivo` | `arquivo` | obrigatório se `modo_entrada=arquivo` | 10 MB | — |
| `acao` | `opcao` (`codificar`, `decodificar`) | sim (só aplicável a `modo_entrada=texto`; arquivo é sempre codificar) | — | `codificar` |
| `variante` | `opcao` (`padrao`, `url_safe`) | não | — | `padrao` |

**Processamento:**
- **Codificar texto:** `TextEncoder().encode(texto)` → bytes → Base64 via `btoa(String.fromCharCode(...bytes))` byte a byte (nunca `btoa(texto)` direto, que quebra com UTF-8 fora de Latin-1).
- **Decodificar texto:** Base64 → bytes via `atob` → `TextDecoder().decode(bytes)`. Base64 malformado (comprimento não múltiplo de 4 após remover espaços, ou caractere fora do alfabeto) → erro `base64_invalido`.
- **Arquivo:** `FileReader.readAsDataURL`, corta o prefixo `data:...;base64,` e mostra só a parte Base64 (ou o data URL completo, com opção "incluir prefixo `data:`").
- **`variante=url_safe`:** depois de gerar o Base64 padrão, aplica `.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')` (codificar) ou a transformação inversa antes de decodificar (`-`→`+`, `_`→`/`, completa `=` até múltiplo de 4).

**Erros:** `base64_invalido` (decodificação falha); `arquivo_grande_demais` (> 10 MB).

**Saídas:** `resultado` (texto, destaque).

**Exportação:** `copiar`, `baixar` (`.txt` para texto, ou o arquivo original decodificado quando a entrada for Base64 de arquivo). Sem Plus.

**Celular:** dois `textarea` empilhados; alternância `modo_entrada` texto/arquivo em `.abas`.

**Viabilidade:** total — `TextEncoder`/`TextDecoder`/`atob`/`btoa`/`FileReader` nativos. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `modo_entrada=texto`, `acao=codificar`, `variante=padrao`, entrada `"Café ☕"` → saída `"Q2Fmw6kg4piV"`. Verificado com `node -e` (`Buffer.from('Café ☕','utf8').toString('base64')`).
2. Sucesso — bytes `[0xFB, 0xFF, 0xFE]` (caso de arquivo binário pequeno), `variante=url_safe` → Base64 padrão `"+//+"` torna-se `"-__-"` (sem padding). Decodificar `"-__-"` de volta reproduz os mesmos 3 bytes. Verificado com `node -e`.
3. Erro — `acao=decodificar`, entrada `"%%%"` (fora do alfabeto Base64) → `{ ok: false, erro: 'base64_invalido', campo: 'texto' }`.

---

## uuid — Gerador de identificadores

**Motor:** `calculadora` — campos (quantidade, tipo) → resultado (lista de códigos).

**Problema resolvido:** gerar rápido um ou vários identificadores únicos para usar em teste, planilha ou banco de dados, sem abrir o terminal.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `quantidade` | `inteiro` | sim | 1–1000 | `5` |
| `tipo` | `opcao` (`uuid_v4`, `curto`, `legivel`) | sim | — | `uuid_v4` |
| `maiusculas` | `marcador` (só afeta `uuid_v4`) | não | — | `false` |

**Processamento:**
- `uuid_v4`: `crypto.randomUUID()` nativo do navegador (contexto seguro), chamado `quantidade` vezes; se `maiusculas`, `.toUpperCase()`.
- `curto`: 10 caracteres sorteados do alfabeto base62 (`0-9A-Za-z`, 62 símbolos) via `crypto.getRandomValues` com descarte de bytes fora do intervalo (rejection sampling, evita viés de módulo).
- `legivel`: código no formato `XXXX-9999` — 4 letras maiúsculas do alfabeto sem ambiguidade (`ABCDEFGHJKLMNPQRSTUVWXYZ`, sem `I`, `O`) + hífen + 4 dígitos, ambos sorteados via `crypto.getRandomValues`.
Garante que os `quantidade` códigos gerados não se repitam entre si (novo sorteio se colidir — probabilidade desprezível, mas a checagem existe).

**Erros:** `quantidade` fora de 1–1000 → `quantidade_invalida`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `codigos` | lista | sim |
| `quantidade_gerada` | inteiro | não |

**Exportação:** `copiar` (um código por linha), `baixar` (`.txt`/`.csv`). Sem Plus.

**Celular:** lista de códigos em `.lista-densa` rolável; campos de configuração colapsam acima dela.

**Viabilidade:** total — `crypto.randomUUID()` e `crypto.getRandomValues()` nativos, sem reimplementar geração de bytes aleatórios à mão. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `tipo=uuid_v4`, `quantidade=1` → código casa com `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` (formato UUID v4 padrão — versão `4` no terceiro grupo, variante `8/9/a/b` no quarto). Padrão confirmado com `node -e` usando uma implementação manual equivalente ao `crypto.randomUUID`.
2. Sucesso — `tipo=legivel`, `quantidade=3` → 3 códigos, cada um casando `/^[A-HJ-NP-Z]{4}-\d{4}$/` (sem `I`/`O`), todos diferentes entre si.
3. Erro — `quantidade=0` → `{ ok: false, erro: 'quantidade_invalida', campo: 'quantidade', extras: { min: 1, max: 1000 } }`.

---

## regex — Testador de expressão regular

**Motor:** `interativo` (excepcional, justificado) — precisa de destaque colorido das correspondências dentro do texto de teste, painel de grupos capturados e pré-visualização de substituição ao vivo; nada disso cabe no motor `transformador` genérico (que só produz um texto de saída simples). HTML segue gerado; só o script de interação é próprio.

**Problema resolvido:** testar se um padrão de expressão regular bate com o texto esperado antes de usá-lo em código, sem abrir o editor e rodar o programa.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `padrao` | `texto` | sim | 1–2000 caracteres | `""` |
| `flag_global` | `marcador` | não | — | `true` |
| `flag_ignorar_caixa` | `marcador` | não | — | `false` |
| `flag_multilinha` | `marcador` | não | — | `false` |
| `texto_teste` | `area-texto` | sim | 200.000 caracteres | `""` |
| `modo` | `opcao` (`testar`, `substituir`) | sim | — | `testar` |
| `substituicao` | `texto` | obrigatório se `modo=substituir` | ≤ 2000 caracteres | `""` |

**Processamento:**
1. Monta as flags: `g` (se `flag_global`) + `i` (se `flag_ignorar_caixa`) + `m` (se `flag_multilinha`).
2. `new RegExp(padrao, flags)` — construtor nativo lança `SyntaxError` para padrão malformado (ex.: parêntese sem fechar) → erro `regex_invalida` com a mensagem nativa nos `extras` (é só para diagnóstico, não afeta o cálculo).
3. `modo=testar`: `[...texto_teste.matchAll(regexComG)]` (força `g` internamente para listar todas as ocorrências mesmo se a pessoa não marcou, mostrando aviso "mostrando todas as ocorrências"); cada ocorrência guarda `texto`, `indice`, `grupos` (array de `match[1..n]`).
4. `modo=substituir`: `texto_teste.replace(regex, substituicao)` — `substituicao` aceita referências nativas `$1`, `$2`, `$&`, `$$`.

**Erros:** `padrao` vazio → `padrao_obrigatorio`; `SyntaxError` do `RegExp` → `regex_invalida`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `correspondencias` | lista | sim (quando `modo=testar`) |
| `total_correspondencias` | inteiro | não |
| `texto_substituido` | texto | sim (quando `modo=substituir`) |

**Exportação:** `copiar` (lista de correspondências ou texto substituído). Sem Plus.

**Celular:** o texto de teste com o destaque das correspondências ocupa a largura toda; o painel de grupos capturados vira uma lista abaixo em vez de coluna lateral.

**Viabilidade:** total — `RegExp` e `String.prototype.matchAll`/`replace` nativos do motor JavaScript do navegador. Sem biblioteca nova (não precisa de motor de regex alternativo).

**Sobreposição:** nenhuma outra ferramenta usa expressão regular como entrada direta da pessoa (`extrator-de-contatos-em-texto` usa regex fixo internamente, não editável).

**Casos de teste**
1. Sucesso (`testar`) — `padrao="(\\d{3})-(\\d{4})"`, `texto_teste="tel 3344-5566"` → uma correspondência: `texto="344-5566"`, `indice=5`, `grupos=["344","5566"]`. Verificado com `node -e`.
2. Sucesso (`substituir`) — `padrao="(\\d{2})(\\d{5})(\\d{4})"`, `texto_teste="Ligue para 11987654321"`, `substituicao="($1) $2-$3"` → `texto_substituido="Ligue para (11) 98765-4321"`. Verificado com `node -e`.
3. Erro — `padrao="("` (parêntese sem fechar) → `{ ok: false, erro: 'regex_invalida', campo: 'padrao', extras: { mensagem: 'Unterminated group' } }` (mensagem exata confirmada com `node -e`, pode variar por motor JS mas o código de erro não depende dela).

---

## timestamp — Conversor de timestamp

**Motor:** `calculadora` — campo (entrada) → resultados (unix, ms, ISO, data legível no fuso escolhido).

**Problema resolvido:** transformar um timestamp Unix (segundos ou milissegundos) ou uma data ISO 8601 numa data legível no fuso escolhido, ou o caminho inverso.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `entrada` | `texto` | sim | — | `""` |
| `fuso` | `opcao` (`UTC`, `America/Sao_Paulo`, `America/New_York`, `Europe/Lisbon`, `Europe/London`, `America/Los_Angeles`, `Asia/Tokyo`, `local`) | sim | — | `America/Sao_Paulo` |

**Processamento:**
1. Se `entrada` casa `/^-?\d+$/` (só dígitos, sinal opcional): comprimento da parte numérica (sem sinal) ≤ 10 → tratado como **segundos** Unix (`ms = numero * 1000`); 11 a 13 dígitos → tratado como **milissegundos** (`ms = numero`); mais de 13 dígitos → erro `numero_grande_demais`.
2. Senão, tenta `new Date(entrada)` (aceita ISO 8601 completo ou parcial); `Number.isNaN(data.getTime())` → erro `data_invalida`.
3. A partir do `Date` resultante, calcula `unix = Math.floor(ms / 1000)`, `iso = data.toISOString()`, `local_formatado = new Intl.DateTimeFormat(idioma, { timeZone: fuso === 'local' ? undefined : fuso, dateStyle: 'full', timeStyle: 'medium' }).format(data)`.

**Erros:** `entrada` vazia → `entrada_obrigatoria`; `numero_grande_demais`; `data_invalida`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `unix` | inteiro | não |
| `ms` | inteiro | não |
| `iso` | texto | não |
| `local_formatado` | texto | sim |

**Exportação:** `copiar` (cada valor individualmente). Sem Plus.

**Celular:** os 4 resultados empilham em `.resultado__linhas` de largura total em vez de grade.

**Viabilidade:** total — `Date`, `Intl.DateTimeFormat` com `timeZone` nativos (suporte garantido em todo navegador atual via ICU embutido). Sem biblioteca nova (evita `moment`/`date-fns-tz`).

**Sobreposição:** nenhuma; `calculadora-de-datas` (categoria datas, já pronta/planejada em outra onda) trata diferença entre datas, não conversão timestamp↔data.

**Casos de teste**
1. Sucesso — `entrada="1790251200"` (segundos), `fuso=UTC` → `unix=1790251200`, `ms=1790251200000`, `iso="2026-09-24T12:00:00.000Z"`. Verificado com `node -e` (`new Date('2026-09-24T12:00:00Z')`).
2. Sucesso — `entrada="2026-09-24T12:00:00Z"`, `fuso=America/Sao_Paulo` → mesmos `unix`/`ms`/`iso` do caso 1, e `local_formatado="quinta-feira, 24 de setembro de 2026 às 09:00:00"` (UTC−3). Verificado com `node -e` usando `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'medium' })`.
3. Erro — `entrada="não é uma data"` → `{ ok: false, erro: 'data_invalida', campo: 'entrada' }`.

---

## url-e-codificacao — Codificador de URL e HTML

**Motor:** `transformador`.

**Problema resolvido:** montar um parâmetro de URL com espaço/acento/símbolo sem quebrar o link, ou decodificar um link cheio de `%XX` para entender o que ele contém; ou escapar texto para colar dentro de HTML sem quebrar a tag.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `texto` | `area-texto` | sim | 50.000 caracteres | `""` |
| `modo` | `opcao` (`url`, `url_componente`, `html_entidades`) | sim | — | `url_componente` |
| `acao` | `opcao` (`codificar`, `decodificar`) | sim | — | `codificar` |

**Processamento:**
- `modo=url`, `codificar` → `encodeURI(texto)` (preserva `: / ? & = #`, para codificar uma URL inteira sem quebrar sua estrutura); `decodificar` → `decodeURI(texto)`.
- `modo=url_componente`, `codificar` → `encodeURIComponent(texto)` (codifica também `& = ? #`, para um valor que vai **dentro** de um parâmetro); `decodificar` → `decodeURIComponent(texto)`.
- `modo=html_entidades`, `codificar` → substitui, nesta ordem (o `&` primeiro, senão duplicaria as entidades já criadas), `& < > " '` pelos códigos `&amp; &lt; &gt; &quot; &#39;`; `decodificar` → substituição inversa das mesmas 5 entidades por um mapa fixo (nunca via `innerHTML`/`DOMParser`, para não abrir brecha de execução de HTML — é troca de string pura).
`decodeURI`/`decodeURIComponent` lançam `URIError` para sequência `%` malformada (ex.: `%` sozinho, ou `%ZZ`) → erro `sequencia_invalida`.

**Erros:** `sequencia_invalida` (decodificação de `%` malformado).

**Saídas:** `texto_codificado` (texto, destaque).

**Exportação:** `copiar`, `baixar` (`.txt`). Sem Plus.

**Celular:** textareas empilhados; `.opcoes` de modo e ação em duas linhas de 3/2 botões.

**Viabilidade:** total — `encodeURI(Component)`/`decodeURI(Component)` nativos; entidades HTML por mapa de substituição manual (não usa `innerHTML`, respeitando a regra de segurança do contrato). Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `modo=url_componente`, `acao=codificar`, entrada `"nome=João & Cia?"` → saída `"nome%3DJo%C3%A3o%20%26%20Cia%3F"`. Verificado com `node -e`.
2. Sucesso — `modo=html_entidades`, `acao=codificar`, entrada `"<b>\"Ana's\"</b>"` → saída `"&lt;b&gt;&quot;Ana&#39;s&quot;&lt;/b&gt;"`. Verificado com `node -e`.
3. Erro — `modo=url_componente`, `acao=decodificar`, entrada `"%"` → `{ ok: false, erro: 'sequencia_invalida', campo: 'texto' }`. `URIError` confirmado com `node -e`.
