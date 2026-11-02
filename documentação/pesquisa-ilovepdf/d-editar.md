# Grupo D — Editar (iLovePDF, observado em 2026-10-05)

Mecanismo comum (upload só ao clicar, `api<N>.ilovepdf.com/v1/...`, página de erro, retenção de 2 h)
em `a-organizar.md`. Aqui só o específico. Nada foi baixado.

## Descoberta importante do grupo: **nem tudo vai para o servidor**

Medi o tráfego da própria página (lista de recursos do navegador, sem registrar tokens):

| Ferramenta | Upload do arquivo para `api<N>` | Como se sabe |
|---|---|---|
| Rodar PDF | **sim** (`/v1/upload` + `/v1/process`) | chamadas vistas |
| Números de página | **sim** | idem |
| Marca d'água | **sim** | idem |
| **Recortar PDF** | **não** | nenhuma chamada `/v1/*`; só um pedido ao modelo de tela de resultado (`templates/download?tool=pdfcrop&taskId=-1`, o `-1` = sem tarefa no servidor) e um evento de estatística; resultado "Seu PDF foi recortado com sucesso." aparece na mesma página, sem trocar de endereço |
| **Editar PDF** | **sim, no carregamento** (envia o PDF e o servidor devolve as páginas como **imagens**: `GET /v1/pdfrender/<tarefa>/<arquivo>/<página>/<dpi>`, 50 dpi nas miniaturas e 150 dpi na tela de edição) e **de novo ao salvar** (segundo `/v1/upload` com o PDF editado: a edição em si acontece no navegador) | recursos listados |
| **Formulários PDF** | **não** | só o modelo da tela de resultado (`templates/download?tool=formfiller`) |

O editor de **Editar PDF** e o de **Formulários PDF** rodam dentro de um `iframe` com título
`webviewer` (`/trueedit_libpdf/...` e `/formfiller_libpdf/...`, interface em português): é o
**Apryse WebViewer** (antigo PDFTron), motor **proprietário e comercial** (inferência a partir do nome
do `iframe`, do módulo `contentEdit` e da estrutura de elementos; não vi o nome do fabricante na tela).
Ou seja: a "edição de verdade" que o iLovePDF oferece não tem equivalente de código aberto de mesma qualidade.

---

## D1. Editar PDF — `/pt/editar-pdf`

**Fluxo.** "Editar PDF" ("Edite PDF adicionando texto, formas, comentários e destaques.") → 1 PDF →
editor em página inteira com miniaturas à esquerda, visualização no centro, zoom, páginas "1 / 3",
modos **Anotar** e **Editar** (este com estrela Premium e dica "Característica Premium — Novo recurso!
Você pode editar o texto existente diretamente no documento") → botão **"Salvar alterações"**
(desabilitado no modo simples, com a dica "Precisa de adicionar pelo menos um campo", até haver uma
alteração) → "Essa tarefa foi processada com sucesso." + "Baixar PDF" + "Continuar para...: Comprimir,
Juntar, Dividir, PDF para JPG, Marca d'água, Proteger, Ver mais".

**Visualização.** Página anterior / próxima, menos/mais zoom, "Adaptar página", "Visualização de
página": Página Única / Página Dupla / Página de Capa.

**Ferramentas do editor (rótulos em português lidos da interface).**

| Aba | Ferramentas |
|---|---|
| **Anotar** | Destacar, Sublinhar, Riscar, Linha ondulada, Desenho livre, Destaque de mão livre, Texto livre, Inserir texto (marca de edição), Substituir texto (marca de edição), Comentário (nota adesiva), Texto explicativo (balão), Apagador, Estilo, Desfazer, Refazer |
| **Formas** | Retângulo, Elipse, Arco, Polígono, Nuvem, Linha, Polilinha, Seta (+ Estilo, Desfazer, Refazer, Apagador) |
| **Inserir** | Carimbo de borracha, "Criar novo carimbo", Assinatura, Anexo (arquivo), Carimbo |
| **Editar texto** (Premium) | "Adicionar parágrafo", "Nova imagem", "Editar conteúdo"; painel "Estilos de texto": fonte, tamanho, negrito, itálico, sublinhado, tachado, alinhamento (esquerda/centro/direita), "Cor atual", "Cores personalizadas", desfazer/refazer |
| **Formulários** | (mesmo editor de formulários de D6, no modo de edição) |
| Painel esquerdo | miniaturas, lista, marcadores; botão "Comentários" |

**Teste.** Abri um PDF de 3 páginas, alternei para o modo de edição de texto (a página foi
retornada em blocos de texto editáveis, sem pedir plano) e cliquei em "Salvar alterações" **sem
mudar nada**: o editor aceitou e entregou a tela de sucesso (ou seja, o plano gratuito deixa **abrir**
o modo de edição de texto; não testei se o salvamento com texto alterado é bloqueado). Não baixei.

**Motor inferido.** Editor no navegador (Apryse WebViewer, comercial) + servidor para renderizar
as páginas no modo simples e para guardar o resultado.

### Especificação da nossa versão
- **Entradas.** 1 PDF (até 50 MB, 50 páginas para edição interativa).
- **Escopo recomendado v1 (alcançável sem motor comercial):** adicionar **texto** (fonte, tamanho,
  cor, negrito/itálico, alinhamento), **imagem** (JPG/PNG), **formas** (retângulo, elipse, linha,
  seta), **desenho livre**, **destaque/sublinhado/riscado** sobre texto (usando as caixas de texto do
  `pdf.js`), **caixa branca** (cobrir), **carimbo de data/assinatura** (reaproveitar a ferramenta E3),
  **apagar** objeto adicionado, **desfazer/refazer**, mover/redimensionar/girar objeto, mudar a ordem
  (frente/trás). **Fora da v1:** editar o texto original do PDF (reflow de fontes; é a função
  Premium do concorrente e exige motor próprio de conteúdo).
- **Saída.** `nome-editado.pdf`; os objetos viram conteúdo da página (achatado) ou anotações
  (opção "Manter como anotações editáveis").
- **Casos de borda.** Fonte do usuário com acentos (embutir fonte Unicode — as 14 fontes padrão do
  PDF só têm WinAnsi); imagem enorme; PDF rotacionado (`/Rotate` muda o sistema de coordenadas);
  PDF com `CropBox` ≠ `MediaBox`; PDF protegido; formulário preenchido (não apagar); 100 objetos
  (desempenho); salvar sem alterações (o iLovePDF deixa; nós também, com aviso "nenhuma alteração").
- **Casos de teste.** `numeradas-3.pdf`: texto "Olá, coração" em Arial 24 vermelho na posição
  (100, 700) da página 2 → `pdf.js getTextContent` da página 2 contém "Olá, coração"; imagem
  `foto.jpg` de 150×100 pt em (50, 50) da página 1 → o PDF ganha 1 `XObject` de imagem; retângulo
  preenchido sobre "PALAVRA-SECRETA-123": o texto continua presente no PDF (isto é **cobrir, não
  remover**; ver E4); desfazer 3 vezes → arquivo igual ao original em conteúdo.
- **Motor recomendado.** Navegador: `pdf.js` para a visualização + camada de edição própria
  (`Fabric.js`, **MIT**, confirmado em `fabricjs/fabric.js/LICENSE`) + `pdf-lib` para gravar. O custo
  é a interface (grande). Não adotar WebViewer/Apryse (licença comercial).
- **Riscos.** Esforço alto (é o item mais caro do portal); fontes e Unicode; edição de texto
  existente fora do escopo; acessibilidade do editor (teclado) e toque em celular.

---

## D2. Rodar PDF — `/pt/rodar_pdf`

**Fluxo.** "Rodar PDF" ("Gire o PDF que quiser. Gire vários arquivos PDF de uma só vez!") → 1 ou mais
PDFs (cada um aparece como um cartão com a primeira página) → dica "Passe o mouse sobre o arquivo PDF
abaixo e um ícone irá aparecer, clique no ícone para girar seus PDFs." → painel "Rodar PDF" com
"Redefinir tudo" e "Rotação": botões **DIREITA** e **ESQUERDA** (giram **todos** os arquivos 90°) +
ícone de girar em cada cartão (gira só aquele arquivo) → botão "Rodar PDF" → "Os arquivos PDF foram
girados!" + "Baixar PDFs girados".

**Atenção:** gira o **arquivo inteiro**; não existe girar página específica (isso fica no Organizar PDF,
ferramenta A5). A prévia gira com `transform: rotate(90deg)`. Passos de 90° (acumulam).

**Teste.** PDF de 5 páginas, DIREITA, sucesso em ~6 s. Não testei vários arquivos, "Redefinir tudo",
nem PDF já rotacionado.

**Motor inferido.** Servidor (`rotate` na API).

### Especificação da nossa versão
- **Entradas.** 1 a 20 PDFs.
- **Opções.** Por arquivo: 90° direita, 90° esquerda, 180°. **Melhoria sobre o original:** escolher
  **páginas** (todas / ímpares / pares / intervalo `2-4` / selecionar nas miniaturas); "Redefinir".
- **Saída.** PDF com `/Rotate` somado ao existente (módulo 360), **sem recomprimir nada**
  (rotação é sem perdas). Vários arquivos: ZIP.
- **Casos de borda.** Página já com `/Rotate` 90 (somar → 180); rotação herdada da árvore de
  páginas (`/Rotate` no nó pai: o `pdf-lib` `getRotation()` lê o da página; checar herdado);
  `/Rotate` não múltiplo de 90 (inválido; normalizar); PDF protegido; arquivo corrompido.
- **Casos de teste.** `misto.pdf` (4 páginas: retrato A4, paisagem A4, Carta, A4 com `/Rotate` 90):
  girar tudo 90° à direita → rotações finais 90, 90, 90 e 180; girar só páginas 2-3 por 270° → 0 e 270 nas
  demais; girar `numeradas-5.pdf` 4× à direita → rotação 0 (volta ao original).
- **Motor recomendado.** Navegador (`pdf-lib` `page.setRotation(degrees(...))`).
- **Riscos.** Mínimos. Cuidado com a ordem das operações (somar, não substituir).

---

## D3. Números de página — `/pt/pdf_inserir_numeros_de_paginas`

**Fluxo.** "Inserir números de páginas a um PDF" ("Adicione números de página em documentos PDF
facilmente. Escolha posição, dimensões, formato e tipografia!") → 1 ou mais PDFs (lista "Arquivo"
para escolher qual visualizar) → painel "Opções de números de página" → "Inserir números de
página" → "O PDF agora tem números de página!" + "Baixar o PDF numerado".

| Opção | Tipo | Padrão | Valores / limites |
|---|---|---|---|
| Modo de página | rádio `facing_pages` | **Página única** | Página única / Páginas dupla (livro: alterna lado esquerdo e direito); a caixa `first_cover` (tratar a primeira página como capa) só vale em "dupla" |
| Posição | grade 3 × 3 | (o destaque inicial varia: embaixo/direita na minha leitura) | topo/meio/baixo × esquerda/centro/direita (`data-vertical`, `data-horizontal`) |
| Margem | lista | **Recomendado** (valor `medium`) | Pequena / Recomendado / Grande |
| Primeiro número (`starting_number`) | número | **1** | inteiro |
| Que páginas você quer numerar? `page_init` / `page_end` | números | **1** e **total** | mais duas listas de atalho: início = "Todas as páginas desde o início / Começar na página 1 / Excluir a primeira página / Excluir as primeiras 2…5 páginas"; fim = "Todas as páginas até o fim / Termina na 1 antes da última / Excluir a última página / Excluir as últimas 2…5 páginas" |
| Texto | lista | **"Inserir apenas o número da página (recomendado)"** (`{n}`) | `{n}` / "Página {n}" / "Página {n} de {p}" / Personalizado (campo `textCustom`, padrão "Página {n} de {p}") — variáveis `{n}` (número) e `{p}` (total) |
| Formato do texto (fonte) | seletor | **Arial** | (a API pública lista Arial Unicode MS — padrão —, Arial, Verdana, Courier; **não capturei** a lista da interface) |
| Tamanho (`font_size`) | controle deslizante + número | **14** | **0 a 150** |
| Cor do texto (`font_color`) | cor | **#000000** | seletor de cor |
| Cor de fundo (`background`) | cor | **transparent** | seletor de cor |
| Cor da sombra (`font_color_shadow`) | cor | **#000000** | seletor de cor |
| Opacidade (`opacity`) | deslizante + número | **100** | **0 a 100** |

**Teste.** PDF de 5 páginas, posição topo/centro, texto "Página {n} de {p}", primeiro número 3, a
partir da página 2: sucesso em ~6 s. Não testei: fonte diferente, páginas duplas, `{p}` com
intervalo parcial (o total mostrado deveria ser 5 ou 4?), números romanos (não existe no original).

**Motor inferido.** Servidor (`pagenumber`; API: `vertical_position` bottom/top/middle,
`horizontal_position` center/left/right, `font_family`, `font_size` 14, etc.).

### Especificação da nossa versão
- **Entradas.** 1 PDF (vários = lote, v2).
- **Opções.** As acima, mais **formato do número**: 1, 2, 3 / i, ii, iii / I, II, III / a, b, c (extra nosso);
  **margens em mm** (pequena 8, recomendada 12, grande 20; documentar) em vez de só três palavras;
  **página dupla** (par à esquerda, ímpar à direita); **cor, fundo, sombra, opacidade** como o original (sombra e
  fundo podem ficar para a v2).
- **Saída.** `nome-numerado.pdf`. Texto como texto selecionável.
- **Casos de borda.** Páginas com tamanhos e rotações diferentes (calcular posição por página
  **e** pela rotação); `CropBox` menor que `MediaBox` (posicionar dentro da área visível);
  fonte sem os caracteres do texto personalizado (acentos exigem fonte Unicode embutida);
  `{p}` com intervalo (decisão nossa: **total do documento**); primeiro número 0 ou negativo;
  início > fim; texto personalizado vazio; PDF de 1000 páginas (rápido).
- **Casos de teste.** `numeradas-5.pdf`, texto "Página {n} de {p}", embaixo/centro, tamanho 12:
  página 3 contém "Página 3 de 5" a 12 pt acima de 12 mm da borda inferior, centralizado
  (±1 pt); mesma, com primeiro número 10, a partir da página 2 até a 4 → páginas 2, 3 e 4 trazem
  "Página 10 de 5", "Página 11 de 5", "Página 12 de 5" (**o `{p}` não muda; avisar o usuário que
  o total é o do documento**); `misto.pdf` → número dentro da página rotacionada, legível para quem lê.
- **Motor recomendado.** Navegador (`pdf-lib` `drawText`, fonte padrão Helvetica para só números e fonte
  Unicode embutida via `@pdf-lib/fontkit` para o resto). **Atenção:** o `fontkit` e fontes têm licença
  própria (ver o que o portal já usa em `documentação/licenças-de-terceiros.md`).
- **Riscos.** Posição em PDFs com `/Rotate`; fontes; sobrepor texto existente (oferecer margem
  maior e prévia).

---

## D4. Marca d'água — `/pt/pdf_inserir_marca_daigua`

**Fluxo.** "Inserir marca d'água em um PDF" ("Escolha uma imagem ou texto para inserir sobre o seu
PDF. Selecione a posição, transparência e tipografia.") → 1 ou mais PDFs → painel "Opções de marca
d'água" com duas abas (`#watermark-options,text` e `#watermark-options,image`) → "Inserir marca
d'água" → "Foi inserido a marca d'água corretamente!" + "Baixar PDF com marca d'água".

| Opção | Tipo | Padrão | Valores / limites |
|---|---|---|---|
| Aba | "Colocar texto" / "Colocar imagem" | texto | — |
| Texto (`text`) | texto | **iLovePDF** (sim, o campo vem preenchido com o nome do produto) | — |
| Imagem ("ADICIONAR IMAGEM") | arquivo | — | `.jpg, .jpeg, .png, .gif` |
| Formato do texto (fonte) | seletor | **Arial** | (mesma lista de D3) |
| Tamanho (`font_size`) | deslizante + número | **14** | 0 a 150 |
| Cor do texto / fundo / sombra | cores | #000000 / transparent / #000000 | — |
| Opacidade (`opacity`) | deslizante + número | **100** | 0 a 100 |
| Posição | grade 3 × 3 + caixa **Mosaico** (`mosaic`) | grade (canto) | mosaico repete a marca na página toda; quando marcado, a grade some |
| Transparência (`transparency`) | lista | **Sem transparência (100)** | Sem transparência / 75 % / 50 % / 25 % |
| Rotação (`rotation`) | lista | **Não girar (0)** | Não girar / 45 graus / 90 graus / 180 graus / 270 graus |
| Páginas | `page_init` e `page_end` | **1** e **total** | "a partir da página … para …" |
| Camada | rádio | **Acima do conteúdo do PDF** | Acima / Abaixo do conteúdo do PDF |

**Teste.** PDF de 5 páginas, texto "CONFIDENCIAL", transparência 50 %, rotação 45°, camada acima,
mosaico desligado, posição padrão: sucesso em ~6 s. Não testei imagem, abaixo do conteúdo, intervalo
de páginas, opacidade ≠ 100.

**Motor inferido.** Servidor (`watermark`; API: `mode` text/image, `vertical_position` middle,
`transparency` 100 (1 a 100)).

### Especificação da nossa versão
- **Entradas.** 1 PDF (+ imagem PNG/JPG/GIF para a aba de imagem).
- **Opções.** Todas as acima; **transparência como número 1–100** (o original só tem 4 passos);
  **rotação livre -180..180** (o original só tem 5 valores); tamanho em pt; "Repetir (mosaico)" com
  espaçamento; "Aplicar em" (todas/ímpares/pares/intervalo).
- **Saída.** `nome-marca.pdf`; a marca é conteúdo da página (não anotação) para dificultar a remoção
  (dizer que **não é à prova de remoção**).
- **Casos de borda.** Texto com acento; texto muito longo (quebrar ou reduzir); imagem com transparência
  PNG (preservar alfa); GIF animado (primeiro quadro); rotação em página já rotacionada; camada
  abaixo em página com fundo opaco (a marca some atrás da imagem); PDF protegido.
- **Casos de teste.** `numeradas-5.pdf` + "CONFIDENCIAL" 50 % 45° centralizada → em cada página o conteúdo
  da página (via `pdf.js getTextContent`) contém "CONFIDENCIAL" e o estado gráfico tem `ca`=0,5; páginas
  2–3 apenas → só elas contêm; camada abaixo em `escaneado.pdf` → texto **não** visível (coberto
  pela imagem) — avisar.
- **Motor recomendado.** Navegador (`pdf-lib`: `drawText`/`drawImage` com `opacity`, `rotate`).
- **Riscos.** Rotação e centralização exigem trigonometria (texto girado em torno do centro);
  fonte; imagens grandes.

---

## D5. Recortar PDF — `/pt/recortar-pdf`

**Fluxo.** "Recortar PDF" ("Apare as margens de PDFs em segundos. Redimensione facilmente as páginas
de PDF com o recortador de PDF.") → 1 PDF → visualizador de páginas (zoom 67 %, "1 / 5", ajustar
largura) → dica "Clique e arraste para selecionar a área que deseja manter. Redimensione, se
necessário." → retângulo com 8 alças e o resto escurecido → "Páginas:" **Todas as páginas** (padrão) /
**Página atual** → botão "Recortar PDF" (desabilitado enquanto não há retângulo) + "Redefinir tudo"
→ "Seu PDF foi recortado com sucesso." + "Baixar PDF" + "Continuar para...: Comprimir, Dividir, Números
de página, Marca d'água…".

**Característica única: roda no navegador** (nenhum `/v1/upload`; ver tabela do início).
Neste ensaio o campo de arquivo só aceitou **arrastar e soltar** (não havia `<input type=file>` visível);
para automatizar, disparar `dragenter/dragover/drop` com `DataTransfer` sobre `#dropArea`.

**Não testei:** retângulos por página diferentes; entrada numérica de margens (não vi); página
rotacionada.

**Motor inferido.** Navegador.

### Especificação da nossa versão
- **Entradas.** 1 PDF.
- **Opções.** Retângulo arrastável com alças; **campos numéricos** das 4 margens (cm/mm/pt, a
  escolha do usuário); "Aplicar em": todas / página atual / intervalo; "Proporção" (livre, A4,
  Carta, 1:1 — extra); **"Recortar de verdade"**: por padrão ajustar `CropBox` (reversível,
  mantém o conteúdo escondido) — **avisar** que o conteúdo fora do corte **continua dentro do
  arquivo**; opção "Remover o conteúdo fora do corte" (rasteriza ou recorta objetos; v2).
- **Saída.** `nome-recortado.pdf`.
- **Casos de borda.** Retângulo fora da página (limitar); retângulo de largura 0; páginas de tamanhos
  diferentes (recorte em % ou por página); `/Rotate` (converter coordenadas); `CropBox` já existente
  (intersectar); PDF sem `MediaBox` explícito (herdar); preview em celular com gestos.
- **Casos de teste.** `numeradas-5.pdf`: cortar 50 pt de cada lado em todas as páginas → `CropBox` =
  [50, 50, 545,28, 791,89] e `MediaBox` inalterada; mesmo com "página atual" na 2 → só a 2 muda;
  `misto.pdf` (A4 paisagem na página 2): margens iguais em pontos → caixas de tamanhos diferentes;
  página rotacionada 90°: corte pelo lado visível (esquerda visual = base real).
- **Motor recomendado.** Navegador (`pdf-lib` `setCropBox`; visualização com `pdf.js`). O próprio
  iLovePDF faz no navegador: boa referência de que é viável.
- **Riscos.** Privacidade: a pessoa acha que "removeu" o que cortou (a parte continua no arquivo);
  dar o aviso e a opção de remover.

---

## D6. Formulários PDF — `/pt/formularios-pdf` (Novo!)

**Fluxo.** "Formulários PDF" ("Crie PDFs preenchíveis automaticamente ou preencha formulários em PDF
com campos de texto editáveis e interativos, caixas de seleção, botões de opção e listas.") → 1 PDF →
editor (WebViewer, módulo `formfiller`) com dois modos no topo: **Preencher formulário** e
**Editar formulário** → botão **"Descarregar"** → "Essa tarefa foi processada com sucesso." + "Baixar o
arquivo" + "Continuar para...: Assinar PDF".

- **Preencher formulário:** o editor lê os campos do PDF (meu arquivo com texto, lista suspensa e
  caixa de seleção apareceu preenchível; as opções da lista "Sao Paulo / Recife / Curitiba" foram lidas).
- **Editar formulário:** "Lista de campos do formulário (3)" (painel de índice, por página, com "Mais opções"
  de cada campo e "Editar" em lote) e a barra de ferramentas: **Campo de Assinatura, Campo de texto,
  Texto livre, Campo de caixa de seleção, Campo do botão de rádio, Campo de lista de seleção, Campo de
  caixa de combinação**, "Editar campos de formulário", "Estilo".
- A promessa "detectar campos automaticamente" **não apareceu** como botão no plano gratuito (testei com
  PDF que já tinha campos; **não testei** um PDF sem campos).

**Motor.** **No navegador** (nenhum envio do arquivo; apenas o modelo da tela final é pedido ao site).

### Especificação da nossa versão
- **Entradas.** 1 PDF (com ou sem campos).
- **Opções.** Modo *Preencher* (campos do PDF viram campos HTML sobre a página; salvar grava os
  valores; opção "Achatar" — transformar em conteúdo fixo) e modo *Criar/Editar* (adicionar campo de texto
  [multilinha, tamanho de fonte, obrigatório, valor padrão], caixa de seleção, botão de rádio [grupo],
  lista suspensa/de seleção [opções], assinatura; mover, redimensionar, renomear, excluir; ordem de
  tabulação).
- **Saída.** PDF com `AcroForm` (preenchível) ou achatado.
- **Casos de borda.** Campos com mesmo nome (compartilham valor); JavaScript/cálculo em campos
  (ignorar e avisar); campos XFA (não suportado → mensagem); campo com fonte automática; PDF com
  assinatura digital (editar invalida); `NeedAppearances`; campo de rádio com valores `Off`;
  fonte sem acentos no valor ("coração").
- **Casos de teste.** `formulario.pdf` (nome, cidade, aceite — gerado por `scripts/gerar-amostras.mjs`
  e por `H.formulario()`): preencher nome = "Ana Teste", cidade = "Recife", aceite marcado e **achatar** → o
  PDF não tem mais campos e o texto "Ana Teste" aparece no conteúdo; sem achatar →
  `form.getTextField('nome').getText()` = "Ana Teste", `getCheckBox('aceite').isChecked()` = true;
  criar campo de texto `email` obrigatório em `numeradas-3.pdf` → o PDF gerado tem 1 campo `email`
  (Tx) com o sinalizador de obrigatório.
- **Motor recomendado.** Navegador: **`pdf-lib` já tem `getForm()` e `createTextField`** (verificado
  no pacote do portal: `getForm`, `createTextField`, `embedJpg`, `embedPng`, `setCropBox`, `setRotation`
  existem) e é MIT; `pdf.js` renderiza a página (e o seu `AnnotationLayer` já desenha campos). Detecção
  automática de campos (criar campo onde há uma linha ou um quadrado) é pesquisa à parte (visão computacional);
  adiar.
- **Riscos.** Aparência dos campos (o `pdf-lib` precisa regenerar a aparência: `form.updateFieldAppearances`);
  compatibilidade com leitores; XFA; acessibilidade.
