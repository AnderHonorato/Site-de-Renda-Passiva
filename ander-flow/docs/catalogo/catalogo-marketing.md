# Catálogo — marketing

Especificação das 7 ferramentas **planejadas** da categoria `marketing`. Todas com plano **gratis** e `recursos_plus: []` — nenhuma tem recurso Plus; não é proposto nenhum novo aqui.

## Tabela-resumo

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| calendario-editorial | tabela | sim | não | — |
| gerador-de-titulos | calculadora | sim | não | lista fixa de 10 templates, sem IA |
| gerador-de-descricao-de-produto | documento | sim | não | template determinístico |
| gerador-de-link-whatsapp | calculadora | sim | **sim — `qrcode-generator`** | ver detalhe abaixo |
| briefing-criativo | documento | sim | não | sem cálculo |
| roi-e-metricas | calculadora | sim | não | 4 métricas com os mesmos campos, sem `mostrar_se` |
| utm | calculadora | sim | não | 2 modos (ver decisão pendente A em catalogo-calculo.md) |

---

## calendario-editorial

**Motor:** `tabela` — os posts do mês são linhas; o resumo por status é o resultado.

**Problema resolvido:** ver, num só lugar, o que está planejado, em produção, agendado e publicado no mês, sem depender de planilha externa.

**Entradas (linhas da tabela `posts`):**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `data` | data | sim | — | — |
| `redeSocial` | opcao (`instagram`\|`facebook`\|`tiktok`\|`linkedin`\|`youtube`\|`outro`) | não | — | `instagram` |
| `titulo` | texto | sim | 1–120 caracteres | — |
| `status` | opcao (`ideia`\|`em_producao`\|`agendado`\|`publicado`) | não | — | `ideia` |

Máximo 200 linhas.

**Processamento:** sem fórmula — só contagem por status:
```
contarPorStatus = { ideia: n, em_producao: n, agendado: n, publicado: n, total: N }
```
Erros: `titulo` vazio → `titulo_obrigatorio` na linha; `data` ausente → `data_obrigatoria` na linha.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `contarPorStatus` | lista | sim |

**Exportação:** csv, pdf. Sem Plus.

**Celular 390px:** a tabela mostra `data`, `titulo` e uma etiqueta de status colorida; `redeSocial` some para segunda linha do cartão (padrão de linha expansível, igual outras tabelas desta onda).

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** relacionada com `previsao-de-vendas`/`funil-de-vendas` só no sentido de serem tabelas de acompanhamento — conteúdo totalmente diferente, sem duplicar.

**Casos de teste:**
1. 3 linhas: (2026-10-01, Instagram, "Promoção de outubro", agendado), (2026-10-02, Facebook, "Bastidores", publicado), (2026-10-03, Instagram, "Ideia nova", ideia) → `contarPorStatus = { ideia:1, em_producao:0, agendado:1, publicado:1, total:3 }`.
2. 0 linhas com status `em_producao` entre 5 linhas variadas → `em_producao:0` no resumo (não é erro, é uma contagem zero válida).
3. Erro: linha com `titulo=''` → `{ ok:false, erro:'titulo_obrigatorio', campo:'titulo' }`.

---

## gerador-de-titulos

**Motor:** `calculadora` — um campo de assunto e um resultado em `formato: "lista"`; a lista de variações vem de 10 templates fixos (sem geração livre por IA — ficaria fora do "tudo local, sem servidor" do §15).

**Problema resolvido:** sair de "não sei que título dar a este post" com algumas variações prontas para adaptar.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `assunto` | texto | sim | 1–120 caracteres | — |
| `quantidade` | inteiro | não | min 1, max 10 | 5 |

**Processamento — sem cálculo numérico; os `quantidade` primeiros itens desta lista fixa, com `{assunto}` substituído literalmente:**
1. "Como {assunto} pode transformar seu negócio"
2. "Guia completo: tudo o que você precisa saber sobre {assunto}"
3. "Por que {assunto} é essencial em 2026"
4. "{assunto}: o erro que quase todo mundo comete"
5. "O jeito simples de resolver {assunto} de uma vez por todas"
6. "{assunto} explicado em poucos minutos"
7. "5 motivos para prestar atenção em {assunto} agora"
8. "O que ninguém te conta sobre {assunto}"
9. "{assunto} na prática: passo a passo"
10. "A verdade sobre {assunto} que você precisa ouvir"

Erros: `assunto` vazio → `assunto_obrigatorio`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `titulos` | lista | sim |

**Exportação:** copiar (a lista inteira, uma por linha). Sem Plus.

**Celular 390px:** cada título em uma linha com botão "copiar" próprio (ícone `copiar`), sem mudar o layout geral.

**Viabilidade no navegador:** 100% local, string template, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `assunto='marketing digital para pequenos negócios'`, `quantidade=3` → `["Como marketing digital para pequenos negócios pode transformar seu negócio", "Guia completo: tudo o que você precisa saber sobre marketing digital para pequenos negócios", "Por que marketing digital para pequenos negócios é essencial em 2026"]`.
2. `assunto='café especial'`, `quantidade=10` → lista com os 10 templates preenchidos, na mesma ordem acima.
3. Erro: `assunto=''` → `{ ok:false, erro:'assunto_obrigatorio', campo:'assunto' }`.

---

## gerador-de-descricao-de-produto

**Motor:** `documento` — campos → texto corrido formatado; não é `transformador` porque a entrada são campos estruturados (nome, características, benefícios), não um texto livre a reescrever.

**Problema resolvido:** transformar uma lista solta de características e benefícios num parágrafo de anúncio pronto para colar na loja.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `nomeProduto` | texto | sim | 1–100 caracteres | — |
| `caracteristicas` | area-texto | sim | 1–15 linhas, 1–80 caracteres cada | — |
| `beneficios` | area-texto | não | 0–10 linhas, 1–80 caracteres cada | "" |
| `tom` | opcao (`vendedor`\|`informativo`\|`divertido`) | não | — | `vendedor` |
| `tamanho` | opcao (`curta`\|`media`\|`longa`) | não | — | `media` |

**Processamento — sem cálculo numérico; junta as linhas de `caracteristicas`/`beneficios` com `joinComE` (últimos dois itens ligados por " e ", os demais por ", ") e monta por template fixo:**

Frase-base por `tom`:
- `vendedor`: `"{nomeProduto} é a escolha certa para quem busca qualidade. Confira os destaques: {listaCaracteristicas}."`
- `informativo`: `"{nomeProduto} apresenta as seguintes características: {listaCaracteristicas}."`
- `divertido`: `"Prepare-se para se apaixonar por {nomeProduto}! Ele traz {listaCaracteristicas} — sim, tudo isso!"`

Se `tamanho=curta`, o resultado é só a frase-base.
Se `tamanho=media` (padrão) e `beneficios` não vazio, acrescenta a frase de benefícios:
- `vendedor`/`informativo`: `" Além disso, você aproveita: {listaBeneficios}."`
- `divertido`: `" E o melhor: {listaBeneficios}!"`
Se `tamanho=longa`, acrescenta também a frase de benefícios (se houver) e, ao final, a chamada:
- `vendedor`: `" Não perca tempo, garanta o seu agora!"`
- `informativo`: `" Saiba mais antes de decidir."`
- `divertido`: `" Corre que essa é por tempo limitado!"`

Erros: `nomeProduto` vazio → `nome_obrigatorio`; `caracteristicas` vazio (nenhuma linha) → `caracteristicas_obrigatorias`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `descricao` | texto | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** as duas áreas de texto (características/benefícios) ficam com altura mínima maior para caber mais linhas visíveis sem rolar.

**Viabilidade no navegador:** 100% local, string template, sem biblioteca.

**Sobreposição:** nenhuma com `briefing-criativo` (aquele organiza o pedido *antes* de criar a peça; este já gera o texto final da descrição).

**Casos de teste:**
1. `nomeProduto='Caneca Térmica 500ml'`, `caracteristicas='Aço inoxidável\nMantém a temperatura por 12 horas\nTampa antivazamento'`, `beneficios=''`, `tom=vendedor`, `tamanho=curta` → `"Caneca Térmica 500ml é a escolha certa para quem busca qualidade. Confira os destaques: Aço inoxidável, Mantém a temperatura por 12 horas e Tampa antivazamento."`.
2. `nomeProduto='Kit de Pincéis Profissionais'`, `caracteristicas='12 pincéis\nCerdas sintéticas'`, `beneficios='Maquiagem mais uniforme\nFácil de limpar'`, `tom=divertido`, `tamanho=longa` → `"Prepare-se para se apaixonar por Kit de Pincéis Profissionais! Ele traz 12 pincéis e Cerdas sintéticas — sim, tudo isso! E o melhor: Maquiagem mais uniforme e Fácil de limpar! Corre que essa é por tempo limitado!"`.
3. Erro: `caracteristicas=''` → `{ ok:false, erro:'caracteristicas_obrigatorias', campo:'caracteristicas' }`.

---

## gerador-de-link-whatsapp

**Motor:** `calculadora` — dois campos, dois resultados (link + QR).

**Problema resolvido:** montar o link `wa.me` já com a mensagem pronta (e o QR Code correspondente), sem digitar a URL na mão.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `numeroTelefone` | texto | sim | dígitos + símbolos de formatação (`()`,`-`,espaço); depois de limpar, 10–13 dígitos | — |
| `mensagem` | area-texto | não | 0–1000 caracteres | "" |

**Processamento:**
```
d = numeroTelefone.replace(/\D/g, '')
se d.length ∈ {10, 11}: d = '55' + d      // assume Brasil quando não vem com código do país
se d.length ∉ {12, 13}: erro telefone_invalido
link = 'https://wa.me/' + d + (mensagem ? '?text=' + encodeURIComponent(mensagem) : '')
```
Erros: depois de normalizar, `d.length` fora de `{12,13}` → `telefone_invalido`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `link` | texto | sim |
| `qrCodeSvg` | (imagem SVG gerada localmente, não é um campo `resultados` textual) | — |

**Exportação:** copiar (o link), baixar (o QR Code como SVG/PNG). Sem Plus.

**Celular 390px:** o QR Code fica abaixo do link (não ao lado), tamanho fixo 200×200px, grande o bastante para ler com a câmera do próprio celular.

**Viabilidade no navegador:** o link é 100% local. **O QR Code precisa de biblioteca nova**, porque gerar a matriz de um QR Code (correção de erro Reed-Solomon, máscara, etc.) não é algo razoável de implementar do zero para esta ferramenta. Proposta: **`qrcode-generator`** (pacote `qrcode-generator`, autor Kazuhiko Arase), **licença MIT**, **≈ 10 KB minificado**, zero dependências, gera a matriz em JS puro e o próprio código desenha o SVG (sem `<canvas>`, sem `eval`/`new Function` — compatível com a CSP estrita do projeto, igual foi conferido para `pdf-lib`/SheetJS na Onda 0). Copiado para `frontend/compartilhado/bibliotecas/` pelo mesmo `postinstall` que já copia as outras (contrato §3.4). Esta é a **primeira** ferramenta do catálogo planejado que precisa de QR Code — se `qr-code` (categoria `imagens`, fora desta especificação) também for implementada, deve reaproveitar a mesma biblioteca em vez de adicionar uma segunda.

**Sobreposição:** nenhuma com `utm` (esta gera link de WhatsApp; aquela gera/lê parâmetros de campanha em qualquer URL). Poderiam ser combinadas manualmente pelo usuário (link do WhatsApp com UTM), mas isso já funciona colando a saída de uma na entrada da outra — não precisa fundir as ferramentas.

**Casos de teste:**
1. `numeroTelefone='(11) 98888-7777'`, `mensagem='Olá! Quero fazer um pedido.'` → `d='11988887777'` (11 dígitos) → prefixado `'5511988887777'` (13 dígitos) → `link='https://wa.me/5511988887777?text=Ol%C3%A1!%20Quero%20fazer%20um%20pedido.'`.
2. `numeroTelefone='+55 21 97777-1234'`, `mensagem=''` → `d='5521977771234'` (já vem com 55, 13 dígitos, não prefixa de novo) → `link='https://wa.me/5521977771234'`.
3. Erro: `numeroTelefone='1234'` (só 4 dígitos) → `{ ok:false, erro:'telefone_invalido', campo:'numeroTelefone' }`.

---

## briefing-criativo

**Motor:** `documento` — formulário de seções organizadas → pré-visualização formatada para imprimir/PDF/copiar; sem cálculo.

**Problema resolvido:** organizar objetivo, público, tom e referências antes de pedir uma peça de conteúdo, para não esquecer nenhuma informação importante.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `objetivo` | texto | sim | 1–200 caracteres | — |
| `publicoAlvo` | texto | sim | 1–120 caracteres | — |
| `formato` | opcao (`post`\|`video`\|`banner`\|`email`) | não | — | `post` |
| `tom` | texto | não | 0–60 caracteres | "" |
| `referencias` | area-texto | não | 0–500 caracteres | "" |
| `prazo` | data | não | — | — |

**Processamento — sem cálculo numérico; monta as seções na ordem, com rótulo fixo:**
```
formatoRotulo = { post: 'Post para redes sociais', video: 'Vídeo', banner: 'Banner', email: 'E-mail marketing' }[formato]
briefing =
  "OBJETIVO\n" + objetivo + "\n\n" +
  "PÚBLICO-ALVO\n" + publicoAlvo + "\n\n" +
  "FORMATO\n" + formatoRotulo + "\n\n" +
  "TOM DE VOZ\n" + (tom || "não especificado") + "\n\n" +
  "REFERÊNCIAS\n" + (referencias || "nenhuma informada") + "\n\n" +
  "PRAZO\n" + (prazo ? formatarDataLonga(prazo) : "a combinar")
```
Erros: `objetivo` vazio → `objetivo_obrigatorio`; `publicoAlvo` vazio → `publico_obrigatorio`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `briefing` | texto | sim |

**Exportação:** pdf, copiar, imprimir. Sem Plus.

**Celular 390px:** cada seção do briefing vira um bloco com título em `.sobretitulo`, empilhado; sem tabela nem coluna.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma (ver nota em `gerador-de-descricao-de-produto`).

**Casos de teste:**
1. `objetivo='Lançar a nova linha de bolos veganos'`, `publicoAlvo='Mulheres de 25 a 45 anos que buscam opções sem lactose'`, `formato=post`, `tom='descontraído'`, `referencias=''`, `prazo=''` → `"OBJETIVO\nLançar a nova linha de bolos veganos\n\nPÚBLICO-ALVO\nMulheres de 25 a 45 anos que buscam opções sem lactose\n\nFORMATO\nPost para redes sociais\n\nTOM DE VOZ\ndescontraído\n\nREFERÊNCIAS\nnenhuma informada\n\nPRAZO\na combinar"`.
2. Só os obrigatórios preenchidos (`objetivo`, `publicoAlvo`), resto vazio, `formato=video` (padrão trocado) → `"...FORMATO\nVídeo\n\nTOM DE VOZ\nnão especificado\n..."`.
3. Erro: `publicoAlvo=''` → `{ ok:false, erro:'publico_obrigatorio', campo:'publicoAlvo' }`.

---

## roi-e-metricas

**Motor:** `calculadora` — as 4 métricas (ROI, ROAS, CAC, LTV) usam campos sempre visíveis, sem precisar de campo condicional (todas ficam à vista, cada uma some se o campo que ela precisa não fizer sentido para o caso do usuário — mas o campo continua lá, só o resultado correspondente não aparece se algum divisor for zero e o erro focar só naquele campo).

**Problema resolvido:** depois de uma campanha, ver de uma vez o retorno sobre o investimento, o retorno sobre o gasto de anúncio, o custo de aquisição e o valor do cliente ao longo do tempo.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `investimento` | moeda | sim | min 0,01 | — |
| `receitaGerada` | moeda | sim | min 0 | — |
| `numeroClientesAdquiridos` | inteiro | sim | min 1 | — |
| `ticketMedio` | moeda | sim | min 0 | — |
| `frequenciaCompraAnual` | numero | sim | min 0 | — |
| `tempoRelacionamentoAnos` | numero | sim | min 0 | — |

**Processamento:**
```
roi  = (receitaGerada - investimento) / investimento × 100
roas = receitaGerada / investimento
cac  = investimento / numeroClientesAdquiridos
ltv  = ticketMedio × frequenciaCompraAnual × tempoRelacionamentoAnos
```
Arredondamento: `roi`/`roas` em 2 casas; `cac`/`ltv` em 2 casas (moeda).
Erros: `investimento` ≤ 0 → `divisao_por_zero` (campo `investimento`); `numeroClientesAdquiridos` ≤ 0 → `clientes_zerados` (campo `numeroClientesAdquiridos`).

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `roi` | percentual | sim |
| `roas` | numero | não |
| `cac` | moeda | não |
| `ltv` | moeda | não |

**Exportação:** copiar, pdf. Sem Plus.

**Celular 390px:** os 4 resultados aparecem em 2×2 no painel de resultado, em vez de 1×4.

**Viabilidade no navegador:** 100% local, sem biblioteca.

**Sobreposição:** nenhuma.

**Casos de teste:**
1. `investimento=5000,00`, `receitaGerada=15000,00`, `numeroClientesAdquiridos=25`, `ticketMedio=180,00`, `frequenciaCompraAnual=4`, `tempoRelacionamentoAnos=3` → `roi=200,00%`; `roas=3,00`; `cac=200,00`; `ltv=2160,00`.
2. `investimento=1000,00`, `receitaGerada=800,00` (campanha deu prejuízo), `numeroClientesAdquiridos=10`, `ticketMedio=50,00`, `frequenciaCompraAnual=2`, `tempoRelacionamentoAnos=1` → `roi=-20,00%`; `roas=0,80`; `cac=100,00`; `ltv=100,00`.
3. Erro: `investimento=0` → `{ ok:false, erro:'divisao_por_zero', campo:'investimento' }`.

---

## utm

**Motor:** `calculadora` (2 modos — ver decisão pendente A em `catalogo-calculo.md`).

**Problema resolvido:** montar uma URL de campanha com os parâmetros UTM certos, ou ler os parâmetros de uma URL que já tem UTM.

**Entradas:**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `modo` | opcao (`montar`\|`ler`) | não | — | `montar` |
| `urlBase` | texto | obrigatório se `modo=montar` | deve começar com `http://` ou `https://` | — |
| `utmSource` | texto | obrigatório se `modo=montar` | 1–60 caracteres | — |
| `utmMedium` | texto | obrigatório se `modo=montar` | 1–60 caracteres | — |
| `utmCampaign` | texto | obrigatório se `modo=montar` | 1–60 caracteres | — |
| `utmTerm` | texto | não | 0–60 caracteres | "" |
| `utmContent` | texto | não | 0–60 caracteres | "" |
| `urlComUtm` | texto | obrigatório se `modo=ler` | deve ser uma URL válida | — |

**Processamento:**
```
montar: monta a URL com new URL(urlBase) e searchParams.set('utm_source', ...) etc.
        (só define os parâmetros preenchidos; não sobrescreve outros parâmetros já
        existentes em urlBase que não sejam utm_*)
ler:    lê urlComUtm com new URL(...) e devolve os valores de utm_source, utm_medium,
        utm_campaign, utm_term, utm_content que estiverem presentes
```
Erros: `modo=montar` e `urlBase` não é uma URL `http(s)://` válida → `url_invalida`; `modo=ler` e `urlComUtm` não tem nenhum parâmetro `utm_*` → `nenhum_parametro_utm`.

**Saídas:**
| id | formato | destaque |
|---|---|---|
| `urlResultado` (modo `montar`) | texto | sim |
| `parametrosLidos` (modo `ler`) | lista | sim |

**Exportação:** copiar. Sem Plus.

**Celular 390px:** sem mudança.

**Viabilidade no navegador:** 100% local, `URL`/`URLSearchParams` nativos, sem biblioteca.

**Sobreposição:** nenhuma (ver nota em `gerador-de-link-whatsapp`).

**Casos de teste:**
1. `modo=montar`, `urlBase='https://minhaloja.com.br/promocao'`, `utmSource='instagram'`, `utmMedium='social'`, `utmCampaign='black_friday'` → `urlResultado='https://minhaloja.com.br/promocao?utm_source=instagram&utm_medium=social&utm_campaign=black_friday'`.
2. `modo=ler`, `urlComUtm='https://minhaloja.com.br/promocao?utm_source=instagram&utm_medium=social&utm_campaign=black_friday'` → `parametrosLidos = { utm_source:'instagram', utm_medium:'social', utm_campaign:'black_friday' }`.
3. Erro: `modo=ler`, `urlComUtm='https://minhaloja.com.br/promocao'` (sem nenhum utm) → `{ ok:false, erro:'nenhum_parametro_utm', campo:'urlComUtm' }`.
