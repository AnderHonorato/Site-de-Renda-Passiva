# Grupo B — Otimizar e converter para PDF (iLovePDF, observado em 2026-10-05)

Método e mecanismo comum (upload só ao clicar, `api<N>.ilovepdf.com/v1/upload|process|download`,
erros em `/pt/problem/<tarefa>/<token>/<Codigo>`, retenção de 2 h) estão em `a-organizar.md`.
Este arquivo só registra o que é específico de cada ferramenta. Nada foi baixado.

**Filtro de extensão (vale para todas as ferramentas, no navegador, antes de enviar).** Arquivo
com extensão não aceita gera um painel "Erro de carregamento" com a frase "Lamentamos, mas essa
extensão não é permitida" e o nome do arquivo (testado com `imagem.gif` em JPG para PDF). O
filtro é só por extensão: o conteúdo só é conferido no servidor (`DamagedFile`).

**Nome interno da tarefa na URL de erro** (útil para saber qual motor a ferramenta usa):
`merge`, `split`, `repair`, `officepdf` (Word, PowerPoint e Excel usam o mesmo), e na API pública
também `compress`, `pdfocr`, `imagepdf`, `htmlpdf`, `pdfjpg`, `pdfa`, `unlock`, `protect`,
`watermark`, `pagenumber`, `rotate`, `extract`, `editpdf`, `validatepdfa`, `summarize`,
`pdfmarkdown`, `smartsplit`.

---

## B1. Comprimir PDF — `/pt/comprimir_pdf`

**Fluxo.** "Comprimir arquivo PDF" ("Diminua o tamanho do seu arquivo PDF, mantendo a melhor
qualidade possível. Otimize seus arquivos PDF.") → 1 ou mais PDFs ("Adicionar mais ficheiros") →
painel "Nível de compressão" → "Comprimir PDF" → resultado.

| Opção | Rótulo (subtítulo) | Padrão |
|---|---|---|
| Nível | EXTREMA COMPRESSÃO (Menos qualidade, alta compressão) | — |
| Nível | COMPRESSÃO RECOMENDADA (Boa qualidade, boa compressão) | **sim** |
| Nível | BAIXA COMPRESSÃO (Alta qualidade, menos compressão) | — |

Na API pública os níveis se chamam `extreme`, `recommended` (padrão) e `low`.

**Resultado (teste).** PDF de 1 página que é uma imagem JPEG (33,15 KB) → "Os PDFs foram
comprimidos!", botão "Baixar o PDF otimizado", selo "48% REDUZIDO", frase "Seus PDF estão agora
48% mais leves!" e a linha "33.15 KB → 17.27 KB" (tamanho antes e depois, KB com 2 casas). "Continuar
para": Juntar, Dividir, Números de página, Marca d'água, Rodar, Proteger, Ver mais. (Nesse dia
apareceu um aviso de feira jurídica da própria empresa: publicidade interna.)

**Não testado:** arquivo que não encolhe (o que a tela diz quando o PDF já está otimizado),
vários arquivos de uma vez (provavelmente ZIP), limites de tamanho.

**Motor inferido.** Servidor (o nome da tarefa é `compress`; técnica típica: Ghostscript,
mas não dá para afirmar).

### Especificação da nossa versão
- **Entradas.** 1 a 10 PDFs, até 100 MB cada (no navegador). Mostrar o tamanho original já na lista.
- **Opções.** Mesmos 3 níveis, com texto claro do que cada um faz na nossa implementação:
  - *Baixa*: regravação sem perdas (`pdf-lib` com `useObjectStreams: true`, tirar metadados e
    objetos órfãos). Ganho modesto (0–15 %), nunca piora a imagem.
  - *Recomendada*: reencodar imagens JPEG embutidas a qualidade ~0,72 e reduzir as que passam
    de ~150 dpi efetivos; mantém texto como texto.
  - *Extrema*: renderizar cada página a ~110 dpi em JPEG q ~0,5 e remontar (o texto deixa de
    ser selecionável: avisar **antes** com um aviso visível e opção "manter camada de texto" desligada).
- **Saída.** `nome-comprimido.pdf` + resumo "antes → depois (−48 %)". Se o resultado ficar **maior**
  que o original: devolver o original e dizer "Esse PDF já está otimizado".
- **Casos de borda.** PDF só de texto (quase não reduz); PDF protegido; PDF com imagens CMYK/JBIG2/
  JPEG2000 (não decodificam no canvas → deixar a imagem como está); PDF assinado digitalmente
  (a compressão invalida a assinatura: avisar); PDF de 300 MB; arquivo corrompido.
- **Casos de teste.** `escaneado.pdf` (imagem 1240×400, ~33 KB) → nível Recomendada reduz entre
  20 % e 60 % (o iLovePDF reduziu 48 %); `numeradas-10.pdf` (só texto) → resultado ≥ 90 % do original
  e mensagem "já otimizado" ou ganho pequeno; Extrema em `numeradas-5.pdf` → PDF sem texto
  selecionável (testar com `pdf.js getTextContent` vazio) e aviso mostrado antes de processar.
- **Motor recomendado.** Navegador para Baixa e Recomendada; Extrema também no navegador
  (canvas). Servidor só se quisermos qualidade equivalente à do Ghostscript (ver riscos).
- **Riscos e licenças.** Ghostscript é **AGPL-3.0 ou posterior** (confirmado em
  `ArtifexSoftware/ghostpdl/LICENSE`): rodar no nosso servidor e oferecer o serviço pela rede exige
  publicar o código fonte da integração/modificações (ou comprar licença comercial). `qpdf` é
  Apache-2.0 (README do projeto) mas só otimiza sem perdas. `pdf-lib` MIT, `pdf.js` Apache-2.0.
  Reencodar JPEG no navegador depende de `createImageBitmap`/canvas (memória de imagens grandes).

---

## B2. Reparar PDF — `/pt/reparar-pdf`

**Fluxo.** "Reparar arquivo PDF" ("Carregue um PDF corrompido e nós tentaremos repará-lo.
Dependendo de quanto o PDF estiver danificado nós o conseguiremos recuperar total ou
parcialmente.") → PDFs → painel com a frase "Iremos tentar reparar seus PDFs. Você pode obter um
formato de arquivo diferente no download se detetarmos esse formato em seu arquivo." → "Reparar PDF".
Sem opções.

**Resultados (2 execuções, o máximo permitido).**
1. PDF de 5 páginas truncado em ~55 % → erro `DamagedFile` (mensagem padrão, botão "Voltar a Tentar
   Reparar PDF").
2. O mesmo PDF **só sem a tabela xref e o trailer** (as páginas e o conteúdo intactos, cortado em
   4647 de 4994 bytes) → também `DamagedFile`.
Ou seja: o reparador do iLovePDF **não reconstruiu** nem o caso mais simples que eu consegui gerar.
Não consegui provar um sucesso, então **não sei o que a tela de sucesso diz** nem se a saída
muda de formato. A frase "um formato de arquivo diferente" sugere que, se o arquivo for na
verdade outro tipo (ex.: imagem ou Office salvo como .pdf), o download vem no formato
detectado.

**Motor inferido.** Servidor (tarefa `repair`).

### Especificação da nossa versão
- **Entradas.** 1 PDF (até 100 MB).
- **Opções.** Nenhuma. Uma caixa de relato depois do reparo: "Recuperamos 4 de 5 páginas",
  lista de páginas que não deu para ler.
- **Saída.** `nome-reparado.pdf` com as páginas legíveis; se nenhuma, erro claro.
- **Estratégia.** (1) tentar abrir normalmente; (2) se falhar, reconstruir a tabela de objetos
  varrendo `N G obj ... endobj` (padrão `qpdf --check`/`mutool clean`) e procurar `/Type /Catalog`;
  (3) copiar as páginas legíveis para um documento novo.
- **Casos de borda.** Truncado no meio do fluxo de uma página; sem `%%EOF`; sem `startxref`;
  `xref` apontando para posição errada; arquivo com lixo antes do `%PDF-` (cabeçalho deslocado);
  protegido; um `.docx` renomeado para `.pdf` (dizer "isto não é um PDF" e qual tipo parece ser);
  0 bytes.
- **Casos de teste (feitos com `scripts/`).** `corrompido.pdf` (55 %): esperado "recuperadas 2 de
  5 páginas" (as que sobraram inteiras) ou "irrecuperável" com razão; `numeradas-5.pdf` sem xref:
  esperado **5 páginas recuperadas** (é o ponto onde somos melhores que o iLovePDF); `falso.pdf` →
  "não é um PDF"; arquivo com 1 KB de lixo no início → remover e abrir.
- **Motor recomendado.** Servidor com `qpdf` (reconstrói xref e é Apache-2.0, confirmado no README
  oficial) ou `mutool` (MuPDF é AGPL-3.0, arquivo `COPYING`). No navegador, o `pdf-lib` **não**
  reconstrói xref de forma confiável; só dá para fazer uma versão própria "varrer objetos" com
  esforço alto. Se quisermos tudo no navegador, avaliar `qpdf` compilado para WebAssembly (verificar
  licença e peso do pacote antes).
- **Riscos.** Promessa de "reparar" é fácil de quebrar; deixar claro que é "melhor esforço".

---

## B3. OCR PDF — `/pt/ocr-pdf`

**Fluxo.** "OCR PDF" ("Converta arquivos PDF não selecionáveis em PDFs selecionáveis e pesquisáveis,
com alta precisão.") → PDFs → painel "Opções do ROC para PDF" ("A precisão da deteção aumenta se
você selecionar corretamente os idiomas dos documentos.") → contador de idiomas "1/3" → lista
"Idiomas do documento" (padrão: **Português**, pelo idioma do navegador) → botão "Aplicar ROC".

| Opção | Tipo | Padrão | Limites |
|---|---|---|---|
| Idiomas do documento | lista com busca, múltipla | Português | **no máximo 3** (contador "1/3") |

A lista tem cerca de 120 entradas e **coincide com os pacotes de idioma do Tesseract** (inclui
"Alemão (Fraktur Latin)", "Chinês - Simplificado/Tradicional", "Coreano (vertical)", "Espanhol -
Antigo", "Matemática / Detecção de equações", "Sérvio - Latim", "Grego, Antigo", etc.): forte
indício de que o motor é o **Tesseract** (inferência minha).

**Resultado (teste).** PDF de 1 página só com imagem de 3 linhas de texto, idioma Português →
"Seu PDF está agora selecionável e pesquisável" e botão "Baixar PDF". Sem "Continuar para...".
O plano gratuito permitiu; o texto de preços diz que o OCR **avançado** é Premium. Não conferi a
qualidade do texto reconhecido porque não baixei.

**Motor inferido.** Servidor (tarefa `pdfocr`).

### Especificação da nossa versão
- **Entradas.** PDF escaneado ou imagem (JPG/PNG) até 20 páginas por execução (limite nosso, pela memória);
  mostrar contador de páginas.
- **Opções.** Idiomas (1 a 3; padrão pelo idioma da interface; começar com Português, Inglês,
  Espanhol, Francês, Alemão, Italiano; os demais sob demanda); "Pular páginas que já têm texto"
  (marcado por padrão: ver caso de borda); resolução de renderização (padrão 200 dpi; 300 dpi
  "mais preciso, mais lento").
- **Saída.** PDF com **a imagem original por baixo e texto invisível por cima** (camada de texto
  alinhada), mais botão extra "Baixar só o texto (.txt)".
- **Casos de borda.** PDF que já tem texto (pular a página, não duplicar); página rotacionada (detectar
  orientação: `psm` 0/OSD); imagem muito pequena (<100 dpi) ou muito grande (limitar a 4000 px de
  lado maior); idioma errado (aviso de baixa confiança); manuscrito (não suporta; dizer); PDF protegido;
  página em branco.
- **Casos de teste.** `escaneado.pdf` com texto "Relatorio de teste numero 2026" → após o OCR,
  `pdf.js getTextContent` da página 1 contém "Relatorio", "2026" e "ABC 12345" (aceitar ≥ 90 % das
  palavras); `numeradas-5.pdf` (já tem texto) com "pular páginas com texto" → saída idêntica em texto,
  sem camada duplicada; idioma Inglês em texto português → avisar confiança baixa.
- **Motor recomendado.** Navegador: `tesseract.js` em WebAssembly + `pdf.js` para renderizar +
  `pdf-lib` para montar o PDF final. Funciona offline depois de baixar os dados de idioma
  (dezenas de MB por idioma: hospedar nós mesmos e cachear).
- **Riscos e licenças.** `tesseract.js` **Apache-2.0** (arquivo `LICENSE.md` do repositório) e o
  motor Tesseract também Apache-2.0 (arquivo `LICENSE` do repositório tesseract-ocr/tesseract).
  Licença dos arquivos de idioma (`tessdata`): **não verifiquei na fonte**; conferir antes de hospedar.
  Lento (segundos por página, mais em celular), consome 200–500 MB de memória; precisa de
  `Worker`/WASM e de política de segurança de conteúdo que permita `wasm-unsafe-eval`.

---

## B4. JPG para PDF — `/pt/jpg_para_pdf`

**Fluxo.** "JPG para PDF" ("Converta suas imagens JPG para PDF. Ajuste a orientação e as
margens.") → "Selecionar imagens JPG" → lista de miniaturas → painel "Opções de imagem para PDF"
→ "Converter em PDF" → "As imagens foram convertidas para PDF".

**Extensões aceitas** (atributo do campo de arquivo): `.jpg, .jpeg, .png, .tif, .tiff` (apesar do nome
"JPG"). GIF dá "Lamentamos, mas essa extensão não é permitida".

| Opção | Tipo | Padrão | Valores |
|---|---|---|---|
| Orientação da página | segmentado | **Retrato** | Retrato / Paisagem |
| Tamanho da página | lista | **A4** (297 x 210 mm — o rótulo troca largura e altura) | "Adaptar (Página com a mesma dimensão da imagem)" (`fit`) / A4 / US Letter (215x279.4 mm) |
| Margem | segmentado | **Sem margem** | Sem margem / Pequena / Grande (valores em mm não mostrados) |
| Mesclar todas as imagens em um arquivo PDF | caixa | **marcada** | desmarcada = um PDF por imagem (provável ZIP) |

Também há miniaturas arrastáveis e "Adicionar mais ficheiros" (ordem do PDF = ordem da lista; ordem
não testada). Teste: 2 JPGs + Paisagem + Pequena + A4 + mesclar → sucesso ("As imagens foram
convertidas para PDF", "Baixar PDF", "Continuar para": Comprimir, Juntar, Dividir, Marca d'água, Rodar,
Proteger).

**Motor inferido.** Servidor (tarefa `imagepdf`).

### Especificação da nossa versão
- **Entradas.** JPG, JPEG, PNG, WebP e GIF (extras nossos; o navegador decodifica tudo) e TIFF
  (opcional, precisa de decodificador próprio). Até 100 imagens, 25 MB cada.
- **Opções.** As mesmas 4 acima, mais: "Ajustar à página / Preencher" (para A4/Carta, centralizar mantendo
  proporção); margem pequena = 10 mm, grande = 25 mm (valores nossos, documentar); "Girar automaticamente
  para combinar com a imagem" (paisagem se a imagem for mais larga que alta).
- **Saída.** 1 PDF com uma página por imagem, na ordem da lista; ou ZIP com um PDF por imagem.
  Respeitar rotação EXIF.
- **Casos de borda.** Imagem com EXIF de rotação; PNG com transparência (fundo branco); imagem de
  30 000 px (reduzir); CMYK JPEG (o canvas converte); GIF animado (primeiro quadro); 0 imagens;
  arquivo não imagem; HEIC.
- **Casos de teste.** `foto.jpg` (320×240) + `texto-escaneado.jpg` (1240×400): (a) Adaptar/mesclar →
  2 páginas de 320×240 pt e 1240×400 pt; (b) A4 retrato, margem pequena → 2 páginas de 595,28 × 841,89
  com a imagem centrada e largura útil = 595,28 − 2×28,35 (10 mm); (c) mesclar desmarcado → 2 PDFs.
- **Motor recomendado.** Navegador (`pdf-lib` `embedJpg`/`embedPng`; WebP/GIF via canvas →
  PNG/JPEG).
- **Riscos.** Memória com muitas fotos de 12 MP (decodificar e redimensionar uma por vez); JPEG
  progressivo e CMYK exigem cuidado; TIFF só com biblioteca extra (licença a conferir).

---

## B5. Word para PDF — `/pt/word_para_pdf`

**Fluxo.** "Converter WORD para PDF" ("Converta seus documentos WORD para PDF com a máxima
qualidade e exatamente igual que o arquivo DOC ou DOCX original.") → "Selecionar documentos WORD" →
lista de arquivos (sem miniatura) → painel "Word para PDF" **sem opções** → "Converter em PDF" →
"O arquivo WORD foi convertido para PDF".

**Extensões aceitas:** `.doc, .docx, .odt, .ott, .stw, .sdw, .sxw, .rtf` (lista típica do
LibreOffice/StarOffice — indício de motor LibreOffice).

**Teste.** DOCX de 1 página (título, 2 parágrafos, tabela 2×2): sucesso, ~8 s. DOCX "falso"
(texto simples com extensão .docx): upload ok, `process` 400, erro `DamagedFile` com a mesma
mensagem; o texto do botão fica "Voltar a Tentar Word para PDF". A URL do erro usa a tarefa
`officepdf`. Não testei `.doc` binário, senha (Word protegido), macros, fontes ausentes,
documento grande.

**Motor inferido.** Servidor, provavelmente LibreOffice (pela lista de extensões).

### Especificação da nossa versão
- **Entradas.** `.docx`, `.doc`, `.odt`, `.rtf` (e `.txt` se quisermos), até 50 MB.
- **Opções.** Nenhuma obrigatória (igual ao original). Possíveis extras depois: tamanho do papel
  (usar o do documento por padrão).
- **Saída.** `nome.pdf`. Fidelidade: fontes, tabelas, imagens, cabeçalho/rodapé, numeração de página.
- **Casos de borda.** Fonte não instalada (usar equivalentes métricas Carlito/Caladea/Liberation:
  licença OFL, **conferir**); documento com macros (nunca executar); DOCX protegido por senha (pedir
  senha; sem suporte inicial → mensagem); documento muito grande (centenas de páginas: tempo
  limite e fila); DOCX corrompido (erro claro como o do iLovePDF); `.docx` com imagem vinculada à
  internet (não buscar: **risco de SSRF**).
- **Casos de teste.** `exemplo.docx` (de `scripts/`) → PDF com 1 página A4, contendo o texto
  "Titulo do documento de teste" e a tabela com "Item", "Valor", "A", "10"; `falso.docx` → erro
  `DamagedFile`; arquivo de 0 bytes → erro de arquivo vazio; extensão `.exe` renomeada → bloqueio
  pelo filtro.
- **Motor recomendado.** Servidor com LibreOffice em modo sem tela (`soffice --headless
  --convert-to pdf`), um processo isolado por conversão, tempo limite (60 s), sem rede, usuário sem
  privilégio, diretório temporário apagado. Não existe alternativa de navegador com fidelidade
  comparável (mammoth.js converte DOCX só para HTML/texto e perde layout).
- **Riscos e licenças.** LibreOffice: **MPL-2.0** (página oficial de licenças); uso por
  conversão em servidor é permitido. Superfície de ataque grande (arquivos Office hostis): isolar
  em contêiner/`firejail`, limites de CPU/memória, antivírus. Custo de servidor (cada conversão usa
  ~200–500 MB). mammoth.js: BSD-2-Clause (arquivo `LICENSE`).

---

## B6. PowerPoint para PDF — `/pt/powerpoint_para_pdf`

**Fluxo.** Idêntico ao Word: "Converter POWERPOINT para PDF" ("... exatamente igual que o arquivo
PPT ou PPTX original.") → "Selecionar POWERPOINTs" → lista → **sem opções** → "Converter em PDF" →
"O POWERPOINT foi convertido a PDF".

**Extensões aceitas:** `.ppt, .pptx, .odp, .pps, .ppsx, .sxi`.

**Teste.** PPTX de 2 slides (texto em caixas) criado por nós: sucesso em ~9 s. Resultado "Continuar
para": Comprimir, Juntar, Dividir, Proteger, Organizar páginas, Editar PDF. Não testei notas do
apresentador, animações, vídeos, fontes incorporadas.

**Motor inferido.** Servidor (`officepdf`), provavelmente LibreOffice Impress.

### Especificação da nossa versão
- Entradas, saída, motor, riscos: como B5. **Opções extras** que o LibreOffice permite: "incluir
  notas" e "slides por página" (folheto) — deixar para depois.
- **Casos de borda.** Slides com animação (sai o estado final do slide); fontes ausentes; slides
  ocultos (por padrão **não** sair, como o PowerPoint ao exportar); proporção 4:3 e 16:9 (manter);
  vídeo/áudio embutidos (ignorar); PPTX muito grande com imagens de 20 MP.
- **Casos de teste.** `exemplo.pptx` (de `scripts/`, 2 slides) → PDF de 2 páginas com proporção 16:9
  (9144000×5143500 EMU = 720×405 pt) e texto "Slide um de teste" na página 1; arquivo falso →
  `DamagedFile`.

---

## B7. Excel para PDF — `/pt/excel_para_pdf`

**Fluxo.** "Converter EXCEL para PDF" ("Converta suas tabelas EXCEL para PDF com as colunas
ajustadas à largura da página. Vertical ou horizontal, você escolhe a orientação.") → "Selecionar
arquivos EXCEL" → lista → **sem opções visíveis** (apesar da promessa de orientação na descrição) →
"Converter em PDF" → "O EXCEL foi convertido a PDF".

**Extensões aceitas:** `.xls, .xlsx, .ods, .ots, .sdc, .sxc`.

**Teste.** XLSX de 1 planilha 4×3 com uma fórmula `SUM`: sucesso em ~9 s.
Não testei várias planilhas, áreas de impressão, planilha enorme (milhares de linhas →
quantas páginas), colunas largas (quebra em várias páginas?), `.csv` (não está na lista).

**Motor inferido.** Servidor (`officepdf`).

### Especificação da nossa versão
- **Entradas.** `.xlsx`, `.xls`, `.ods`, `.csv` (extra nosso), até 25 MB.
- **Opções.** Orientação (Automática, Retrato, Paisagem) — implementar de verdade, já que o
  original anuncia e não mostra; "Ajustar todas as colunas à largura da página" (marcada); "Uma página
  por planilha"; "Imprimir linhas de grade".
- **Saída.** 1 PDF; páginas na ordem das planilhas; planilhas ocultas **não** saem.
- **Casos de borda.** Planilha de 1 milhão de linhas (limitar páginas, p. ex. 500, e avisar);
  fórmulas voláteis; células mescladas; células com `#####` por coluna estreita; fonte ausente;
  macros `.xlsm` (recusar ou ignorar macros); arquivo protegido.
- **Casos de teste.** `exemplo.xlsx` → PDF com 1 página contendo "Produto", "Caneta", "Caderno",
  "Total" e o valor 5; mesma planilha com 200 colunas → verificar quebra por colunas ou ajuste.
- **Motor recomendado.** Servidor com LibreOffice Calc (mesmos riscos de B5). Alternativa leve
  no navegador para CSV/XLSX simples: ler com SheetJS e desenhar a tabela com `pdf-lib` (sem
  fidelidade de formatação). SheetJS Community Edition: **Apache-2.0** (arquivo `LICENSE` do
  repositório), mas **o pacote publicado no npm está desatualizado**; baixar do CDN oficial.

---

## B8. HTML para PDF — `/pt/html-para-pdf`

**Fluxo.** "HTML para PDF" ("Converta páginas web em documentos PDF com grande precisão") →
botão "Adicionar HTML" → painel "Adicionar HTML para converter" com **uma única aba "Url"** (campo
"Insira o URL do website", dica "Exemplo: https://ilovepdf.com") e botão "Adicionar" → tela de
opções com visualização → "Converter em PDF" → "O website foi convertido em PDF".

(Não há envio de arquivo `.html` nem colar código HTML no plano gratuito observado: só URL.)

| Opção | Tipo | Padrão | Valores |
|---|---|---|---|
| URL do website | texto + botão atualizar (recarrega a prévia) | URL informada | — |
| Tamanho do ecrã | lista | **Seu ecrã (1280px)** | Seu ecrã (largura da janela) / Desktop HD (1920px) / Desktop (1440px) / Tablet (768px) / Móvel (320px) |
| Tamanho da página | lista | **A4 (297 x 210 mm)** | A3 (297x420 mm) / A4 / A5 (148x210 mm) / US Letter (216x279 mm) / **Uma página longa** |
| Orientação | segmentado | **Retrato** | Retrato / Paisagem |
| Margem da página | segmentado | **Sem margem** | Sem margem / Pequena / Grande |
| Definições HTML — "Experimente bloquear anúncios" (`block_ads`) | caixa | desmarcada | — |
| Definições HTML — "Retirar popus de sobreposição" (`remove_popups`) | caixa | desmarcada | — |
| (campo `single_page`) | caixa | marcada | corresponde a "Uma página longa" |

Rede: ao adicionar a URL a página faz `POST /v1/upload` e `POST /v1/preview` (o servidor abre o
site e devolve uma imagem de prévia), depois `POST /v1/process`. Testado só com `https://example.com`
(página pública de exemplo da IANA): sucesso em ~9 s.

**Motor inferido.** Servidor com navegador sem tela (renderiza JS, obedece largura de janela;
o nome da tarefa na API é `htmlpdf`). **O servidor busca a URL**: o mesmo desenho nos expõe a SSRF.

### Especificação da nossa versão
- **Entradas.** (a) **Arquivo .html** (+ opcional .css e imagens, ou um `.zip`), (b) **Colar código
  HTML**, (c) **URL pública** (só se tivermos servidor; recomendado como segunda fase).
- **Opções.** Tamanho do ecrã (as 5 larguras), tamanho da página (A3/A4/A5/Carta/"uma página
  longa"), orientação, margem, bloquear anúncios, remover pop-ups de sobreposição (para URL),
  "Imprimir fundos" (CSS `print-color-adjust`).
- **Saída.** 1 PDF com texto selecionável (não imagem).
- **Casos de borda.** URL para endereço privado (`localhost`, `192.168.x.x`, `169.254.169.254`, IPv6
  local, DNS que aponta para IP privado, redirecionamento para IP privado): **bloquear**; página que
  exige login (devolver erro claro "a página pede login"); página que nunca termina de carregar (tempo
  limite 30 s); página gigante (limite de páginas); HTML com `<script>` (rodar sem acesso à rede local,
  sem cookies); HTML com imagens relativas (só funcionam com .zip).
- **Casos de teste.** `simples.html` (de `scripts/`) como arquivo → PDF de 1 página A4 com o título
  "Pagina HTML de teste" selecionável e a tabela; `http://127.0.0.1:8766/` como URL → recusado antes de
  buscar; `https://example.com` (se houver servidor) → PDF com o texto "Example Domain".
- **Motor recomendado.** Fase 1 no navegador: renderizar o HTML num `iframe` isolado e imprimir via
  `window.print()` ("Salvar como PDF") — não gera arquivo automaticamente, então a fase 1 é limitada;
  alternativa: biblioteca de renderização HTML→canvas (perde texto selecionável). Fase 2 no
  servidor com **Chromium headless via Puppeteer** (Puppeteer: **Apache-2.0**, arquivo `LICENSE`)
  ou **WeasyPrint** (**BSD-3-Clause**, arquivo `LICENSE`; sem JavaScript).
- **Riscos.** SSRF (acima); abuso como proxy; sites que bloqueiam robôs; consumo de memória do
  Chromium; direitos autorais do conteúdo convertido (termos de uso).
