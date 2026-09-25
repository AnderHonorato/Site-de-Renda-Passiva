# Catálogo — Imagens

Especificação das 9 ferramentas **planejadas** da categoria `imagens`. Todo processamento é no navegador via `Canvas`/`OffscreenCanvas`; a imagem nunca sai do aparelho — mesmo a compressão e a conversão de formato são feitas localmente, sem enviar o arquivo a nenhum serviço.

| slug | motor | viável? | biblioteca nova | observação |
|---|---|---|---|---|
| cortar-imagem | interativo (justificado) | sim | nenhuma | seleção de recorte por arrasto não cabe no motor `arquivo` genérico |
| converter-formato-de-imagem | arquivo | sim | nenhuma | `canvas.convertToBlob` |
| comprimir-imagem | arquivo | sim, com ressalva | nenhuma | ganho real depende do formato (ver texto) |
| redimensionar-imagens-em-lote | arquivo | sim | **JSZip** | só para empacotar várias saídas num único download |
| gerador-de-favicon | arquivo | sim | **JSZip** | idem; ICO com PNG embutido escrito à mão, sem biblioteca de imagem |
| remover-metadados-de-imagem | arquivo | sim | nenhuma | redesenhar em canvas já descarta EXIF como efeito colateral |
| extrator-de-paleta-de-cores | arquivo | sim | nenhuma | contagem de frequência de cor quantizada, feita à mão |
| verificador-de-contraste | calculadora | sim | nenhuma | fórmula WCAG, só aritmética |
| qr-code | folha | sim | **`qrcode`** (npm) | ver ficha de biblioteca abaixo |

**Bibliotecas novas propostas:**
- **JSZip** — empacota múltiplos arquivos de saída em um único `.zip` para download (`redimensionar-imagens-em-lote`, `gerador-de-favicon`). MIT (dual MIT/GPLv3, escolhemos MIT), ~95 KB minificado (~30 KB gzip), sem dependências, sem `eval` (é compressão DEFLATE pura em JS/`pako`), roda 100% no navegador e é servida localmente (copiada de `node_modules/jszip/dist/jszip.min.js` pelo mesmo `scripts-copiar-bibliotecas.js` que já copia `pdf-lib`/`xlsx`).
- **`qrcode`** (pacote npm `qrcode`, de `soldair/node-qrcode`) — gera a matriz do QR Code e renderiza em Canvas (PNG) ou monta o `<svg>` como string. MIT, zero dependências, build para navegador ~30–40 KB minificado, sem `eval`, servida localmente do mesmo jeito. Alternativa avaliada e descartada: `easyqrcodejs` (mais pesada, inclui geração de tabela HTML que não é necessária aqui).

---

## cortar-imagem

**Motor:** `interativo` (excepcional, justificado) — recorte por arrasto precisa de um retângulo de seleção com alças redimensionáveis, grade de terços, e proporção travável, uma interação visual que o motor `arquivo` genérico (soltar → processar → baixar) não cobre. O HTML da página ainda é gerado; só `cortar-imagem.js` é próprio.

**Problema resolvido:** cortar uma foto livremente ou numa proporção pronta (quadrado para post, 4:5 para feed, 9:16 para story) sem abrir um editor de imagem.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.png`, `.webp`) | sim | 20 MB | — |
| `proporcao` | `opcao` (`livre`, `1:1`, `4:5`, `16:9`, `9:16`) | sim | — | `livre` |

**Processamento:**
1. `createImageBitmap(arquivo, { imageOrientation: 'from-image' })` decodifica já corrigindo a rotação salva no EXIF.
2. Ao escolher uma `proporcao` fixa, calcula o maior retângulo com aquela proporção que cabe dentro da imagem, centralizado: `escala = min(largura/proporcaoLargura, altura/proporcaoAltura)`; `larguraRecorte = proporcaoLargura × escala`; `alturaRecorte = proporcaoAltura × escala`; `x = (largura − larguraRecorte) / 2`; `y = (altura − alturaRecorte) / 2`. A pessoa pode depois arrastar/redimensionar esse retângulo inicial (com a proporção travada quando não é `livre`).
3. Ao confirmar, desenha só a região do retângulo num canvas do tamanho do recorte (`ctx.drawImage(bitmap, x, y, larguraRecorte, alturaRecorte, 0, 0, larguraRecorte, alturaRecorte)`) e exporta com `canvas.convertToBlob({ type: mesmoTipoDoArquivoOriginal })`.

**Erros:** `arquivo_nao_imagem` (tipo MIME fora de `image/jpeg|png|webp`); `arquivo_grande_demais` (> 20 MB); `decodificacao_falhou` (`createImageBitmap` rejeita — arquivo corrompido).

**Saídas:** `imagem_cortada` (arquivo para baixar), `largura_final`/`altura_final` (inteiro).

**Exportação:** `baixar`. Sem Plus.

**Celular (390px):** a área de recorte ocupa a largura toda da tela; os botões de proporção ficam abaixo dela em vez de lado a lado; alças de recorte com alvo de toque de 44px (maiores que num mouse).

**Viabilidade:** total — `createImageBitmap`, `Canvas 2D`, `convertToBlob` nativos. Sem biblioteca nova.

**Sobreposição:** nenhuma outra ferramenta recorta imagem. `redimensionar-imagens-em-lote` muda o **tamanho** sem recortar; são operações diferentes.

**Casos de teste** (a aritmética da proporção é pura e testável sem decodificar uma imagem real)
1. Sucesso — imagem 1200×800, `proporcao=1:1` → `escala = min(1200/1, 800/1) = 800`; recorte 800×800 centralizado em `x=200, y=0`. Verificado com `node -e` (fórmula de centralização).
2. Sucesso — imagem 1080×1920, `proporcao=16:9` → `escala = min(1080/16, 1920/9) = min(67.5, 213.3) = 67.5`; recorte 1080×607,5 → arredondado para 1080×608, `x=0`, `y=656`.
3. Erro — arquivo `.gif` enviado → `{ ok: false, erro: 'arquivo_nao_imagem', campo: 'imagem' }`.

---

## converter-formato-de-imagem

**Motor:** `arquivo`.

**Problema resolvido:** ter um PNG e precisar de JPG (ou o contrário), ou converter para WebP para o site carregar mais rápido.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`) | sim | 20 MB | — |
| `formato_saida` | `opcao` (`jpg`, `png`, `webp`) | sim | — | `jpg` |
| `qualidade` | `inteiro` | não (só `jpg`/`webp`) | 1–100 | `85` |
| `cor_fundo` | `texto` (hex) | não (só quando o destino é `jpg`, que não tem transparência) | — | `#FFFFFF` |

**Processamento:** `createImageBitmap` decodifica a origem (qualquer formato que o navegador saiba abrir — inclui GIF/BMP como imagem estática, primeiro quadro); desenha num canvas do tamanho original; se `formato_saida=jpg` e a imagem de origem tem canal alfa, pinta `cor_fundo` como fundo antes de desenhar (JPG não suporta transparência — teria virado preto por padrão sem esse passo); exporta com `canvas.convertToBlob({ type: 'image/jpeg'|'image/png'|'image/webp', quality: qualidade/100 })` (`quality` é ignorado pelo navegador para PNG, que é sempre sem perdas).

**Erros:** `arquivo_nao_imagem`; `arquivo_grande_demais` (> 20 MB); `formato_nao_suportado` (o navegador não sabe decodificar o arquivo de origem — `createImageBitmap` rejeita).

**Saídas:** `imagem_convertida` (arquivo para baixar), `tamanho_original_kb`/`tamanho_novo_kb` (numero).

**Exportação:** `baixar`. Sem Plus.

**Celular:** pré-visualização da imagem convertida em largura total; seletor de formato em `.opcoes` de 3 colunas.

**Viabilidade:** total — `createImageBitmap`/`Canvas`/`convertToBlob` nativos cobrem JPG/PNG/WebP em todo navegador atual (Chrome, Firefox, Safari 14+, Edge). **Limite honesto:** AVIF não é oferecido como formato de saída — a codificação de AVIF via `canvas.convertToBlob` não tem suporte confiável em todos os navegadores-alvo; se o proprietário quiser AVIF, precisa de decisão futura (biblioteca WASM dedicada). Sem biblioteca nova para JPG/PNG/WebP.

**Sobreposição:** nenhuma; é a única ferramenta que troca o formato do arquivo (`comprimir-imagem` mantém o formato).

**Casos de teste**
1. Sucesso — PNG 500×500 com transparência, `formato_saida=jpg`, `cor_fundo=#FFFFFF` → JPG 500×500 com fundo branco onde havia transparência.
2. Sucesso — JPG 1200×800, `formato_saida=webp`, `qualidade=80` → WebP 1200×800, tipicamente 25–35% menor que o JPG original na mesma qualidade perceptual (ganho real depende do conteúdo da imagem, não é garantido).
3. Erro — arquivo `.svg` (vetorial, `createImageBitmap` pode rejeitar dependendo do navegador) ou `.tiff` (sem decodificador nativo) → `{ ok: false, erro: 'formato_nao_suportado', campo: 'imagem' }`.

---

## comprimir-imagem

**Motor:** `arquivo`.

**Problema resolvido:** a imagem está pesada demais para anexar num formulário ou carregar rápido no site, e a pessoa quer reduzir sem trocar o formato.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.jpeg`, `.png`, `.webp`) | sim | 20 MB | — |
| `modo` | `opcao` (`qualidade`, `peso_alvo`) | sim | — | `qualidade` |
| `qualidade` | `inteiro` | obrigatório se `modo=qualidade` | 1–100 | `75` |
| `peso_alvo_kb` | `inteiro` | obrigatório se `modo=peso_alvo` | ≥ 10 | — |

**Processamento:**
- `modo=qualidade`: decodifica e reexporta no **mesmo formato**, com `canvas.convertToBlob({ type, quality: qualidade/100 })`.
- `modo=peso_alvo`: busca binária de `quality` entre 0,05 e 1,0 (até 8 iterações), reexportando e comparando `blob.size` com `peso_alvo_kb × 1024`, até achar a maior qualidade que fica dentro do alvo (ou a menor qualidade testada, se nem ela couber — nesse caso avisa que não foi possível atingir o peso pedido, mas devolve o menor resultado alcançado).
- **Limite honesto sobre PNG:** PNG é sempre sem perdas — `quality` é ignorado pelo navegador. Para PNG, a ferramenta só reexecuta a compressão DEFLATE do navegador (ganho tipicamente pequeno, 0–10%, quando o PNG original já foi bem otimizado) e recomenda, no texto de ajuda, converter para WebP (`converter-formato-de-imagem`) quando o objetivo real é reduzir peso.

**Erros:** `arquivo_nao_imagem`; `arquivo_grande_demais` (> 20 MB); `peso_alvo_kb` maior que o tamanho já atual do arquivo → aviso (não erro) "a imagem já está mais leve que o alvo".

**Saídas:** `imagem_comprimida` (arquivo para baixar), `tamanho_original_kb`, `tamanho_novo_kb`, `qualidade_usada` (inteiro).

**Exportação:** `baixar`. Sem Plus.

**Celular:** controle deslizante (`.deslizante`) de qualidade ocupa a largura toda; pré-visualização antes/depois empilhada.

**Viabilidade:** total para JPG/WebP (ganho real e controlável); **ganho limitado e honesto para PNG** (documentado acima). Sem biblioteca nova.

**Sobreposição:** `redimensionar-imagens-em-lote` também reduz peso, mas via redução de **dimensão** e em **lote** — ferramentas complementares (uma imagem menor pesa menos, mas o foco de cada uma é diferente); não unificar, intenções de busca distintas ("comprimir" vs. "redimensionar em lote").

**Casos de teste**
1. Sucesso — JPG de 3 MB, `modo=qualidade`, `qualidade=60` → JPG reexportado, tipicamente 40–70% do peso original (variável por conteúdo).
2. Sucesso — JPG de 2 MB, `modo=peso_alvo`, `peso_alvo_kb=200` → busca binária encontra a maior `quality` cujo resultado fica ≤ 200 KB; `qualidade_usada` reportada (ex.: `32`).
3. Erro — arquivo `.gif` → `{ ok: false, erro: 'arquivo_nao_imagem', campo: 'imagem' }` (GIF animado não é suportado nesta ferramenta; a pessoa é direcionada a converter para outro formato primeiro).

---

## redimensionar-imagens-em-lote *(Plus)*

**Motor:** `arquivo`.

**Problema resolvido:** redimensionar um lote de fotos (de um produto, de um imóvel) todas para o mesmo tamanho ou peso, de uma vez, em vez de uma por uma.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `arquivos` | `arquivo` múltiplo (`.jpg`, `.jpeg`, `.png`, `.webp`) | sim | 20 MB cada; **até `limite_lote_plus` (100) arquivos**, já que a ferramenta inteira é Plus (bloqueio de plano aparece de cara para conta grátis, antes de qualquer envio) | — |
| `modo` | `opcao` (`por_dimensao`, `por_peso`) | sim | — | `por_dimensao` |
| `largura_maxima`/`altura_maxima` | `inteiro` | obrigatório se `por_dimensao` | ≥ 1 | `1920`/`1080` |
| `peso_maximo_kb` | `inteiro` | obrigatório se `por_peso` | ≥ 10 | — |
| `formato_saida` | `opcao` (`manter`, `jpg`, `png`, `webp`) | não | — | `manter` |

**Processamento:** para cada arquivo, na sequência (mostrando "Imagem X de Y"): decodifica com `createImageBitmap`; se `por_dimensao`, calcula `escala = min(larguraMaxima/larguraOriginal, alturaMaxima/alturaOriginal, 1)` (nunca aumenta a imagem) e redesenha em canvas com `largura = round(larguraOriginal × escala)`, `altura = round(alturaOriginal × escala)`; se `por_peso`, mantém a dimensão original e faz a mesma busca binária de qualidade de `comprimir-imagem`. Reexporta no `formato_saida` escolhido (ou o formato original, se `manter`). Empacota todos os resultados num único `.zip` (JSZip) para um único download.

**Erros:** `arquivo_nao_imagem` (por arquivo — os outros continuam processando); `quantidade_acima_do_limite` (> 100 arquivos); `arquivo_grande_demais` (> 20 MB, por arquivo).

**Saídas:** `arquivos_processados` (lista: nome, tamanho_original_kb, tamanho_novo_kb, largura_final, altura_final), pacote `.zip` para baixar.

**Exportação:** `baixar` (`.zip`). Ferramenta 100% Plus (não há versão grátis parcial — usuário grátis vê `.bloqueio-plano` antes de enviar qualquer arquivo).

**Celular:** lista de arquivos com barra de progresso por item (`.progresso`); resultado final com um único botão "Baixar tudo (.zip)".

**Viabilidade:** total com `Canvas`/`OffscreenCanvas` nativos para o processamento; **biblioteca nova `JSZip`** só para empacotar a saída (ficha no topo do arquivo).

**Sobreposição:** ver nota em `comprimir-imagem`. A lógica de redimensionar/reexportar uma imagem deveria ficar num módulo compartilhado (`compartilhado-processamento-imagem.js`, sugestão de PEDIDO ao dono de `frontend/compartilhado/`) usado tanto aqui quanto em `comprimir-imagem`/`converter-formato-de-imagem`, para não triplicar a mesma lógica de canvas.

**Casos de teste**
1. Sucesso — 3 imagens (4000×3000, 800×600, 2000×1500), `modo=por_dimensao`, `largura_maxima=1920`, `altura_maxima=1080` → dimensões finais respectivamente 1440×1080 (escala 0,36), 800×600 (sem alteração, já menor — escala 1, nunca amplia), 1440×1080 (escala 0,72). Aritmética de escala verificada com `node -e` (mesma fórmula de `cortar-imagem`/`comprimir-imagem`).
2. Sucesso — 2 imagens, `modo=por_peso`, `peso_maximo_kb=150` → cada uma reexportada na maior qualidade que cabe em 150 KB; `.zip` final contém as 2 imagens processadas.
3. Erro — 101 arquivos selecionados → `{ ok: false, erro: 'quantidade_acima_do_limite', extras: { limite: 100 } }`.

---

## gerador-de-favicon

**Motor:** `arquivo`.

**Problema resolvido:** gerar de uma vez o favicon do site em todos os tamanhos que os navegadores e dispositivos pedem, a partir de uma imagem só.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.png`, `.webp`; recomendado quadrado) | sim | 10 MB | — |
| `tamanhos` | `opcao` múltipla (`16`, `32`, `48`, `180`, `192`, `512`) | não | — | todos marcados |
| `cor_fundo` | `texto` (hex) | não (usada quando a imagem de origem tem transparência e o tamanho não a suporta bem em fundo escuro) | — | `#FFFFFF` |

**Processamento:**
1. `createImageBitmap` decodifica a origem; se a imagem não é quadrada, corta ao quadrado central (mesma fórmula de centralização de `cortar-imagem`, proporção `1:1`) antes de redimensionar — evita distorcer o ícone.
2. Para cada tamanho marcado, redesenha em canvas `tamanho × tamanho` e exporta PNG.
3. Monta um `favicon.ico` com os tamanhos `16`, `32` e `48` (os três clássicos), no formato **ICO com PNG embutido** (suportado por todos os navegadores atuais): cabeçalho de 6 bytes (`0x00 0x00`, tipo `1`, contagem de imagens) + uma entrada de 16 bytes por imagem (largura, altura, paleta, bits por pixel, tamanho em bytes do PNG, deslocamento no arquivo) + os bytes crus de cada PNG gerado no passo 2, um atrás do outro — formato simples, implementado à mão em `gerador-de-favicon-calculo.js`, sem biblioteca de imagem.
4. Monta o trecho HTML de exemplo para colar no `<head>` do site da pessoa (uma linha `<link rel="icon">` por tamanho gerado, mais `<link rel="apple-touch-icon">` para o `180`).
5. Empacota todos os PNGs + o `favicon.ico` + um `leiame.txt` com o trecho HTML num `.zip` (JSZip).

**Erros:** `arquivo_nao_imagem`; `arquivo_grande_demais` (> 10 MB); `nenhum_tamanho_selecionado`.

**Saídas:** `arquivos_gerados` (lista de nomes), `trecho_html` (texto), pacote `.zip`.

**Exportação:** `baixar` (`.zip`), `copiar` (trecho HTML). Sem Plus.

**Celular:** grade de pré-visualização dos tamanhos gerados em 2 colunas; trecho HTML em `<code>` com botão copiar.

**Viabilidade:** total — `Canvas` nativo para os PNGs; o encoder ICO é ~40 linhas de manipulação de `Uint8Array`/`DataView`, sem biblioteca (o formato ICO com payload PNG é documentado publicamente e é só concatenação de bytes com um cabeçalho fixo). **Biblioteca nova `JSZip`** só para o pacote final (mesma ficha de `redimensionar-imagens-em-lote`).

**Sobreposição:** nenhuma outra ferramenta gera favicon.

**Casos de teste**
1. Sucesso — imagem quadrada 1024×1024, todos os tamanhos marcados → `arquivos_gerados` contém `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-180.png`, `favicon-192.png`, `favicon-512.png`, `favicon.ico`, `leiame.txt` (8 arquivos no `.zip`).
2. Sucesso — imagem retangular 1200×800 (não quadrada) → corte central quadrado 800×800 (mesma fórmula de `cortar-imagem` com `proporcao=1:1`: `x=(1200−800)/2=200, y=0`) antes de gerar os tamanhos.
3. Erro — nenhum tamanho marcado → `{ ok: false, erro: 'nenhum_tamanho_selecionado' }`.

---

## remover-metadados-de-imagem

**Motor:** `arquivo`.

**Problema resolvido:** uma foto tirada com celular carrega localização, modelo do aparelho e data escondidos no arquivo (EXIF), e a pessoa quer apagar isso antes de postar ou enviar.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.jpeg`, `.png`, `.webp`) | sim | 20 MB | — |

**Processamento:** `createImageBitmap(arquivo, { imageOrientation: 'from-image' })` decodifica a imagem já aplicando a rotação salva no EXIF (para a foto não "virar de lado" depois de limpa); desenha o resultado num canvas do mesmo tamanho final; `canvas.convertToBlob({ type: arquivo.type })` gera um arquivo novo. **O EXIF nunca é copiado para esse novo arquivo — é um efeito colateral inerente ao pipeline do `Canvas`**, que só lê pixels, nunca metadados; por isso não precisa de nenhuma biblioteca para "remover" nada, o metadado simplesmente não existe na saída. Antes de processar, a ferramenta faz uma **leitura informativa** (não removida por essa leitura) do segmento EXIF do JPEG original — procura o marcador `0xFFE1` (APP1), confere a assinatura `Exif\0\0`, e localiza pelas tags TIFF conhecidas (`0x8825` GPS IFD, `0x0110` Model, `0x9003` DateTimeOriginal) só para **mostrar à pessoa o que será removido** (ex.: "esta foto tem localização GPS"); essa leitura é opcional para o resultado funcionar e implementada à mão (não precisa decodificar o EXIF inteiro, só localizar essas poucas tags).

**Erros:** `arquivo_nao_imagem`; `arquivo_grande_demais` (> 20 MB); `formato_nao_suportado` (`.heic`/`.heif` do iPhone não decodificam nativamente na maioria dos navegadores — a pessoa é orientada a exportar como JPG antes, pelo próprio celular).

**Saídas:** `imagem_limpa` (arquivo para baixar), `metadados_detectados` (lista informativa: `["Localização GPS", "Modelo: iPhone 13", "Data: 2026-03-10"]` ou vazia).

**Exportação:** `baixar`. Sem Plus.

**Celular:** aviso "Esta foto tem localização GPS" em destaque (`.etiqueta--aviso`) antes do botão de processar.

**Viabilidade:** total — a remoção não depende de nenhuma biblioteca (é inerente ao redesenho em canvas); a leitura informativa das tags é um parser manual mínimo (~60 linhas), não uma biblioteca de EXIF completa (que seria overkill para só exibir 3 tags). Sem biblioteca nova.

**Sobreposição:** nenhuma; `converter-formato-de-imagem`/`comprimir-imagem` também "removem" EXIF como efeito colateral do mesmo redesenho em canvas, mas esse não é o objetivo declarado deles — vale citar essa remoção incidental no texto de ajuda das outras duas.

**Casos de teste**
1. Sucesso — JPG com tag GPS presente (simulada) → `metadados_detectados=["Localização GPS"]`; `imagem_limpa` gerada sem esse segmento (nenhum APP1 no arquivo de saída, porque o canvas nunca o escreve).
2. Sucesso — PNG sem EXIF (formato não carrega esse tipo de metadado da mesma forma) → `metadados_detectados=[]`; segue processando normalmente.
3. Erro — arquivo `.heic` → `{ ok: false, erro: 'formato_nao_suportado', campo: 'imagem' }`.

---

## extrator-de-paleta-de-cores

**Motor:** `arquivo`.

**Problema resolvido:** tirar as cores predominantes de uma imagem (foto do produto, referência visual) para usar num design, sem abrir um editor gráfico.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `imagem` | `arquivo` (`.jpg`, `.jpeg`, `.png`, `.webp`) | sim | 20 MB | — |
| `quantidade_cores` | `inteiro` | não | 3–10 | `5` |

**Processamento — contagem de frequência por quantização (sem k-means, mais simples e determinístico):**
1. Decodifica com `createImageBitmap`; para não processar milhões de pixels, redesenha numa amostra pequena (`100×100`, ou menor mantendo a proporção) num `OffscreenCanvas` e lê `getImageData` dessa amostra.
2. Para cada pixel com alfa ≥ 128 (ignora pixels quase transparentes), **quantiza** cada canal para o múltiplo de 32 mais próximo (`Math.round(c / 32) × 32`, 8 faixas por canal → até 512 "baldes" de cor possíveis) e usa a combinação `r,g,b` quantizada como chave de um `Map` de contagem.
3. Ordena os baldes por contagem decrescente; pega os `quantidade_cores` primeiros; devolve o hex de cada balde e o percentual (`contagem / totalDePixelsAmostrados × 100`).

**Erros:** `arquivo_nao_imagem`; `arquivo_grande_demais` (> 20 MB); `imagem_transparente_demais` (todos os pixels da amostra com alfa < 128 — nada para medir).

**Saídas:** `paleta` (lista de `{ hex, percentual }`, destaque), `total_amostrado` (inteiro).

**Exportação:** `copiar` (lista de hex), `baixar` (`.json`/`.txt`). Sem Plus.

**Celular:** paleta em grade de blocos de cor 2 colunas, cada bloco com o hex embaixo e botão copiar individual.

**Viabilidade:** total — `OffscreenCanvas`, `getImageData` nativos; contagem por `Map` é lógica pura. Sem biblioteca nova (evita bibliotecas de quantização de cor como `quantize`/`color-thief`, que trazem k-means e não são necessárias para uma paleta "aproximada e honesta").

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — amostra de 8 pixels: 4× `(200,90,60)`, 3× `(245,244,243)`, 1× `(30,30,28)` → `paleta=[{hex:"#c06040",percentual:50},{hex:"#ffffff",percentual:37.5},{hex:"#202020",percentual:12.5}]`. Verificado com `node -e` (quantização por múltiplo de 32 aplicada a cada valor).
2. Sucesso — imagem de uma só cor sólida `(160,80,50)` → `paleta` com 1 item só, `percentual=100`, mesmo pedindo `quantidade_cores=5` (não inventa cores que não existem).
3. Erro — PNG totalmente transparente → `{ ok: false, erro: 'imagem_transparente_demais', campo: 'imagem' }`.

---

## verificador-de-contraste

**Motor:** `calculadora` — campos (cor do texto, cor do fundo, tamanho da fonte) → resultados (razão de contraste + selos de aprovação WCAG). Os campos de cor usam `tipo: "texto"` validado como hexadecimal (`/^#?[0-9a-fA-F]{6}$/`) — o catálogo de tipos do §15.3 não tem um tipo `cor` dedicado; usar `texto` com essa validação é a solução mais simples dentro do esquema atual (sugestão de PEDIDO: considerar um tipo `cor` nativo do motor `calculadora` para renderizar `<input type="color">`, útil também em ferramentas futuras).

**Problema resolvido:** conferir se a combinação de cor do texto com o fundo (de um site, de uma peça) atende ao mínimo de contraste exigido por acessibilidade, antes de publicar.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `cor_texto` | `texto` (hex) | sim | `#RRGGBB` | `#292724` |
| `cor_fundo` | `texto` (hex) | sim | `#RRGGBB` | `#F7F4ED` |
| `texto_grande` | `marcador` (marcado = fonte ≥ 18,66px em negrito ou ≥ 24px normal, conforme WCAG) | não | — | `false` |

**Processamento — fórmula de luminância relativa e contraste do WCAG 2.x:**
1. Para cada cor, normaliza cada canal `c` para `[0,1]` e aplica `c ≤ 0,03928 ? c/12,92 : ((c+0,055)/1,055)^2,4`.
2. `luminancia = 0,2126×R + 0,7152×G + 0,0722×B`.
3. `razao = (max(L1,L2) + 0,05) / (min(L1,L2) + 0,05)`.
4. Compara com os 4 limiares do WCAG: AA texto normal ≥ 4,5; AA texto grande ≥ 3,0; AAA texto normal ≥ 7,0; AAA texto grande ≥ 4,5 — reporta os 4 selos (o campo `texto_grande` só decide **qual par** (normal/grande) é destacado como "o que importa aqui", os 4 resultados aparecem sempre).

**Erros:** `cor_texto`/`cor_fundo` fora do padrão hex → `cor_invalida`, `campo: 'cor_texto'|'cor_fundo'`.

**Saídas**
| id | formato | destaque |
|---|---|---|
| `razao_contraste` | numero (2 decimais) | sim |
| `passa_aa_normal` | texto (`"sim"`/`"não"`) | não |
| `passa_aa_grande` | texto | não |
| `passa_aaa_normal` | texto | não |
| `passa_aaa_grande` | texto | não |

**Exportação:** `copiar`. Sem Plus.

**Celular:** as duas cores em campos empilhados com uma amostra visual (retângulo com o texto de exemplo nas cores escolhidas) acima do resultado.

**Viabilidade:** total — só aritmética sobre os três canais RGB. Sem biblioteca nova.

**Sobreposição:** nenhuma.

**Casos de teste**
1. Sucesso — `cor_texto=#292724`, `cor_fundo=#F7F4ED` (as cores de texto/fundo do tema claro do próprio Ander Flow, §6.1) → `razao_contraste=13.56`, passa nos 4 selos. Verificado com `node -e`.
2. Sucesso — `cor_texto=#A05134` (destaque terracota), `cor_fundo=#FFFFFF` → `razao_contraste=5.64` — passa AA normal (≥4,5), AA grande (≥3,0) e AAA grande (≥4,5), **não passa** AAA normal (precisa ≥7,0). Verificado com `node -e`.
3. Erro — `cor_texto="laranja"` (não é hex) → `{ ok: false, erro: 'cor_invalida', campo: 'cor_texto' }`.

---

## qr-code — Gerador de QR Code

**Motor:** `folha` — parâmetros → gráfico gerado (o QR Code) → baixar PNG/SVG/imprimir. É o mesmo formato de `etiquetas`/`molde-de-caixa`: parâmetros entram, um desenho pronto para exportar sai.

**Problema resolvido:** gerar um QR Code de um link, texto, rede Wi-Fi ou contato para colocar num cartão, cardápio ou embalagem, sem depender de um gerador online que rastreia o acesso.

**Entradas**
| id | tipo | obrigatório | limites | padrão |
|---|---|---|---|---|
| `tipo_conteudo` | `opcao` (`link`, `texto`, `wifi`, `contato`) | sim | — | `link` |
| `conteudo` | `texto` | obrigatório se `tipo_conteudo` é `link`/`texto` | ≤ 2.000 caracteres | — |
| `wifi_ssid` | `texto` | obrigatório se `tipo_conteudo=wifi` | ≤ 32 caracteres | — |
| `wifi_senha` | `texto` | não | ≤ 63 caracteres | `""` |
| `wifi_seguranca` | `opcao` (`WPA`, `WEP`, `nenhuma`) | não | — | `WPA` |
| `contato_nome` | `texto` | obrigatório se `tipo_conteudo=contato` | ≤ 80 caracteres | — |
| `contato_telefone` | `texto` | não | — | `""` |
| `contato_email` | `texto` | não | — | `""` |
| `nivel_correcao` | `opcao` (`L`, `M`, `Q`, `H`) | não | — | `M` |
| `tamanho_px` | `inteiro` | não | 128–2000 | `512` |
| `cor_frente`/`cor_fundo` | `texto` (hex) | não | — | `#000000`/`#FFFFFF` |

**Processamento:**
1. Monta a string a codificar conforme `tipo_conteudo`: `link`/`texto` → o próprio `conteudo`; `wifi` → `` WIFI:T:<wifi_seguranca>;S:<wifi_ssid>;P:<wifi_senha>;; `` (formato padrão reconhecido pela câmera dos celulares); `contato` → vCard mínimo: `` BEGIN:VCARD\nVERSION:3.0\nFN:<contato_nome>\nTEL:<contato_telefone>\nEMAIL:<contato_email>\nEND:VCARD ``.
2. Chama a biblioteca `qrcode` para montar a matriz (`QRCode.create(string, { errorCorrectionLevel: nivel_correcao })`) e renderizar em `Canvas` (`toCanvas`, para PNG) ou como string `<svg>` (`toString({ type: 'svg' })`, para SVG), aplicando `cor_frente`/`cor_fundo` e `tamanho_px`.

**Erros:** `conteudo_obrigatorio` (campo relevante vazio conforme `tipo_conteudo`); `conteudo_grande_demais` (a string a codificar não cabe em nenhuma versão do QR mesmo com `nivel_correcao=L` — a biblioteca lança esse erro, repassado com o mesmo código).

**Saídas:** `imagem_png` (arquivo/preview), `codigo_svg` (texto).

**Exportação:** `baixar` (`.png`, `.svg`). Sem Plus.

**Celular:** QR Code centralizado ocupando até 300px de largura; campos do tipo escolhido empilhados acima.

**Viabilidade:** precisa da biblioteca nova `qrcode` (ficha no topo do arquivo) — geração de matriz QR não é algo razoável de reimplementar à mão (a correção de erro Reed-Solomon é não trivial); a biblioteca escolhida é pequena, sem `eval`, e roda 100% offline depois de servida localmente.

**Sobreposição:** nenhuma outra ferramenta gera QR Code. `gerador-de-link-whatsapp` (marketing) poderia oferecer "gerar QR deste link" reaproveitando este motor — sugestão de PEDIDO para o dono daquela ferramenta, sem duplicar a lógica de geração aqui.

**Casos de teste**
1. Sucesso — `tipo_conteudo=wifi`, `wifi_ssid="Cafe Central"`, `wifi_senha="senha123"`, `wifi_seguranca=WPA` → string codificada `"WIFI:T:WPA;S:Cafe Central;P:senha123;;"`.
2. Sucesso — `tipo_conteudo=contato`, `contato_nome="Ana Souza"`, `contato_telefone="11987654321"`, `contato_email="ana@email.com"` → string codificada `"BEGIN:VCARD\nVERSION:3.0\nFN:Ana Souza\nTEL:11987654321\nEMAIL:ana@email.com\nEND:VCARD"`.
3. Erro — `tipo_conteudo=link`, `conteudo=""` → `{ ok: false, erro: 'conteudo_obrigatorio', campo: 'conteudo' }`.
