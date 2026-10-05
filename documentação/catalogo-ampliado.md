# Catálogo ampliado: o conjunto do iLovePDF e as ferramentas avançadas

> Decisão técnica de cada ferramenta nova, para quem for implementá-la. Escrito em 05/10/2026.
> As ferramentas estão no catálogo (`portal/dados/catálogo/pdf.js` e `avançadas.js`, mais F061 a F065 em `conteúdo.js`) com status `planejada`. Nenhuma foi implementada.
> Siga o `documentação/guia-nova-ferramenta.md` para criar cada uma. Este documento diz **com o quê** fazer; o guia diz **como**.

## 1. O que foi feito

- **Categoria nova `pdf`** (nome "PDF", ícone `documento`), com ilustração animada própria em dois temas e recortes pequenos. A categoria `documentos` passou a se chamar "Documentos" e ficou com o que não é PDF. A categoria `imagens` passou a se chamar "Imagens, áudio e vídeo", porque as ferramentas de mídia entram nela (não existe categoria de mídia, e a tarefa pedia só a de PDF).
- **Todas as ferramentas do iLovePDF**, cada uma com a sua entrada (conferidas no site em 05/10/2026): 28 novas (F152 a F179) mais Juntar PDF (F060, já pronta) e as cinco reescritas F061 a F065.
- **29 ferramentas avançadas** fora do PDF (F180 a F208).
- Total do catálogo: **208 ferramentas**. Das 57 novas, 38 rodam no navegador e 19 exigem servidor.

### O que aconteceu com F061 a F065

| ID | Antes | Agora | Motivo |
|---|---|---|---|
| F061 | Dividir PDF e extrair páginas | **Dividir PDF** (`dividir-pdf`) | "Extrair páginas" ganhou entrada própria (F153): um verbo por ferramenta. |
| F062 | Girar e numerar páginas do PDF | **Girar PDF** (`girar-pdf`, slug trocado) | "Números de página" ganhou entrada própria (F169). |
| F063 | Marca d'água e senha no PDF (servidor, Plus) | **Proteger PDF com senha** (`proteger-pdf`, slug trocado, gratuito) | A parte de senha é a que exige servidor (qpdf). A marca d'água ganhou entrada própria e roda no navegador (F170). O custo do qpdf é desprezível, então saiu do Plus. |
| F064 | Comprimir PDF (Plus, marcado como local) | **Comprimir PDF** (`comprimir-pdf`, Plus, **servidor**) | Recomprimir imagens com qualidade só é viável com Ghostscript; no navegador só daria para recomprimir JPG soltos. A ficha antiga dizia "local", e isso não era honesto. |
| F065 | Extrair texto do PDF | **Extrair texto do PDF** (`extrair-texto-de-pdf`, mantida) | Não existe equivalente no iLovePDF, mas é a base de PDF para Markdown, Resumir e Traduzir. Só mudou de categoria e ganhou texto mais preciso. |

Nenhuma das 42 ferramentas prontas foi alterada, com **uma exceção de classificação**: Juntar PDF (F060) só trocou o campo `cat` de `documentos` para `pdf`.

## 2. Como ler as tabelas

- **Motor.** `navegador` = tudo roda no aparelho (`local: true`; nenhum dado sai). `servidor` = o arquivo ou o texto vai ao servidor do site (`local: false`; o portal mostra "exige servidor"). Vale a decisão 21: se o servidor cair, só as ferramentas de servidor mostram "Serviço indisponível no momento".
- **Licença.** A de cada biblioteca, conferida no repositório oficial em 05/10/2026 (API do GitHub). Onde diz "conferir", não consegui confirmar e a pessoa que implementar deve ler o arquivo de licença antes. Resumo do que cada família exige está na seção 3.
- **Download no navegador.** O que o visitante baixa na primeira vez que abre a ferramenta, em tamanho de arquivo (não comprimido por gzip). Medido nos pacotes publicados (jsDelivr e Hugging Face) quando há número exato; "estimativa" quando não consegui medir. Bibliotecas devem ser servidas de `recursos/`, nunca de CDN (CSP `script-src 'self'`).
- **Dif.** Dificuldade de 1 a 5. 1 = poucas linhas sobre uma biblioteca pronta; 3 = interface própria com prévia; 5 = problema de pesquisa (reconstruir layout, OCR, edição).
- **Plano.** `gratuito` ou `plus`. Plus só onde há custo real de servidor ou de IA. É proposta: **o dono decide** os planos e as cotas (decisão 25).
- **Onda.** Em que onda do plano a ferramenta cabe (seção 6).

## 3. Licenças: o que cada uma exige

| Licença | Exemplos aqui | O que exige | Uso neste portal |
|---|---|---|---|
| MIT, BSD, Apache-2.0 | pdf-lib, PDF.js, tesseract.js, SheetJS, ONNX Runtime, qpdf, Puppeteer, Mermaid | Manter o aviso de direitos autorais e a licença (Apache-2.0 também cita as mudanças que você fizer). Sem copyleft. | Livre. Listar em `documentação/licenças-de-terceiros.md` e no rodapé "Licenças". |
| MPL-2.0 | Mediabunny, LibreOffice, OCRmyPDF | Copyleft **por arquivo**: se você alterar um arquivo da biblioteca, esse arquivo continua MPL e o código dele precisa ser oferecido. Seu código ao lado não é afetado. | Usar sem alterar a biblioteca. Se alterar, publicar o arquivo alterado. |
| LGPL-2.1 / 3.0 | libheif, LanguageTool, FFmpeg sem GPL | Quem usa a biblioteca pode usar de qualquer jeito, mas **o usuário precisa poder trocá-la** por outra versão e receber a licença e o código da biblioteca. No navegador, isso pede arquivo separado (não misturado e minificado no seu pacote). No servidor, usada como programa separado, é tranquila. | libheif no navegador: arquivo separado, licença citada, código disponível. LanguageTool e FFmpeg: processo separado no servidor. |
| GPL-2.0 / 3.0 | FFmpeg com libx264, Piper, veraPDF (opção GPL) | Copyleft forte: quem **distribui** o programa (inclusive um `.wasm` entregue a cada visitante) deve oferecer o código-fonte e licenciar a obra derivada sob a GPL. **Rodar no servidor sem entregar o programa a ninguém não é distribuir**, e a GPL não tem cláusula de rede. | Só no servidor, como processo separado, sem entregar o binário. Nunca embutido no navegador. |
| AGPL-3.0 | Ghostscript, PyMuPDF, MuPDF, `@imgly/background-removal`, LibreTranslate | Como a GPL, **mais** a cláusula de rede (§13): quem oferece **uma versão modificada** pela rede deve oferecer o código dessa versão aos usuários. Usar sem modificar, como programa de linha de comando separado, não aciona o §13. Importar a biblioteca dentro do nosso código (caso do PyMuPDF em Python) cria obra combinada: aí o nosso serviço inteiro teria de ser AGPL ou comprar licença comercial da Artifex. | Ghostscript: processo separado, **sem modificar**, e a gente vira cliente da linha de comando. PyMuPDF/pdf2docx: só com decisão do dono (seção 7). `@imgly/background-removal`: **não usar**. |
| Não comercial | Modelos RMBG da Bria (CC BY-NC) | Proíbe uso comercial sem acordo pago. | **Não usar.** O site tem anúncios e plano Plus. |

> Isto é um mapa técnico, não parecer jurídico. Antes de lançar qualquer ferramenta com AGPL, GPL ou LGPL, o dono deve ler os termos ou consultar um advogado.

## 4. Decisões que valem para várias ferramentas

### 4.1 Serviço de arquivos (Onda 16)

As ferramentas de servidor que recebem arquivo (Proteger, Desbloquear, Reparar, Comprimir, PDF/A, Office para PDF, HTML para PDF, PDF para Word, Converter documento, vídeo e áudio) dependem de **um serviço de arquivos** que ainda não existe. Requisitos mínimos:

1. **Mesma origem**, por proxy: `/api/arquivos/*`, no Node da API (`127.0.0.1:4870`), como no plano (seção 2.2). A CSP `connect-src 'self'` continua valendo.
2. **Envio, trabalho e retirada** em três passos: `POST` do arquivo → identificador; consulta do andamento; `GET` do resultado. Fila com limite de trabalhos simultâneos, para um pico não derrubar o servidor.
3. **Nada fica guardado:** arquivos e resultados são apagados em até 1 hora (ou ao baixar). Sem registro do conteúdo nos logs. A tela diz isso com clareza (Onda 3).
4. **Cada trabalho num contêiner descartável:** sem rede, usuário sem privilégios, sistema de arquivos só de leitura, `tmpfs` para a pasta de trabalho, limites de memória, de CPU e de tempo. Isso é obrigatório para LibreOffice, Chromium, Ghostscript e FFmpeg, que abrem arquivo de desconhecidos.
5. **Limites por plano:** tamanho do arquivo, número de arquivos por dia e tempo de fila (valores a definir pelo dono).
6. **Conferência pelos bytes** (`%PDF-`, assinatura do ZIP, tipo do vídeo), nunca pela extensão. Opcional: ClamAV (GPL-2.0, processo separado) antes de processar.
7. **Resiliência (decisão 21):** serviço fora do ar mostra "Serviço indisponível no momento" só nas ferramentas de servidor; as demais continuam.

### 4.2 CSP e WebAssembly

A política atual (`portal/ferramentas/política-de-segurança.mjs`) é `default-src 'self'; script-src 'self'; …`, sem `unsafe-eval`. Consequências, **a validar com teste de fumaça antes de implementar cada ferramenta** (decisão 20d já pede isso para o PDF.js):

- **WebAssembly.** Os navegadores atuais só compilam WebAssembly sob CSP se `script-src` tiver `'wasm-unsafe-eval'`. Isso afeta tesseract.js, OpenCV.js, ONNX Runtime e libheif. Proposta: acrescentar `'wasm-unsafe-eval'` só nas páginas dessas ferramentas (a Onda 15 cria o mecanismo de política por página). É uma abertura bem menor que `unsafe-eval`, mas **é decisão do dono** (segurança).
- **Workers.** PDF.js e tesseract.js usam `Worker`. Com `script-src 'self'`, o worker precisa ser um arquivo servido de `recursos/` (nada de `blob:`). tesseract.js deve ser configurado para não criar o worker por `blob:`.
- **PDF.js:** `isEvalSupported: false` (já decidido) para evitar `new Function()`.
- **Mermaid** injeta `<style>` e atributos `style`; com `style-src 'self'` isso pode ser barrado. Testar antes; se não funcionar, a ferramenta fica planejada.
- **Cross-origin isolation** (cabeçalhos COOP/COEP, exigida por `SharedArrayBuffer` e pelo FFmpeg.wasm de várias threads) costuma quebrar anúncios e iframes de terceiros. Por isso **não usamos FFmpeg.wasm**. Isto é conhecimento geral do navegador, não foi medido neste portal; vale um teste se alguém quiser reabrir a questão.

### 4.3 Por que não FFmpeg.wasm

O pacote oficial `@ffmpeg/core` pesa 32,2 MB, e o Dockerfile do projeto compila o FFmpeg com `--enable-gpl`, libx264 e libx265 (conferido em 05/10/2026). Entregar isso a cada visitante é **distribuir um binário GPL**. Somado ao custo de 32 MB no celular, à velocidade (transcodificar no navegador é muito mais lento que no servidor) e ao problema do COOP/COEP (4.2), ficou decidido:

- **Cortar vídeo e áudio, extrair áudio e converter áudio** no navegador com **Mediabunny** (MPL-2.0, 290 KB) sobre as APIs nativas (WebCodecs): cópia de trilhas sem reencodar, que é o caso comum e é rápido. Formatos de saída dependem do que o navegador codifica.
- **Converter e comprimir vídeo** no **servidor**, com o binário do FFmpeg em fila (seção 4.1).

### 4.4 Patentes de áudio e vídeo

H.264, H.265 e AAC têm patentes licenciadas por consórcios. O FFmpeg diz, na própria página de licença, que quem o usa comercialmente pode receber cobrança desses consórcios. Para o servidor, a proposta é **oferecer por padrão formatos livres de royalties (VP9, AV1, Opus, WebM)** e deixar o MP4 com H.264 para uma decisão do dono, que é quem assume o risco.

## 5. Tabelas por grupo

### PDF (categoria `pdf`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F060 | `juntar-pdf` | Juntar PDF (pronta) | navegador | pdf-lib | MIT | 525 KB (já em `recursos/`) | 2 | gratuito | nenhuma (pronta) | — |
| F061 | `dividir-pdf` | Dividir PDF | navegador | pdf-lib + fflate (ZIP) | MIT + MIT | 525 KB + 89 KB | 2 | gratuito | nenhuma | 15 |
| F062 | `girar-pdf` | Girar PDF | navegador | pdf-lib | MIT | 525 KB | 1 | gratuito | nenhuma | 15 |
| F063 | `proteger-pdf` | Proteger PDF com senha | servidor | qpdf (`--encrypt`, AES-256), em processo separado | Apache-2.0 | 0 (nada no navegador além do envio) | 3 | gratuito | serviço de arquivos | 16 |
| F064 | `comprimir-pdf` | Comprimir PDF | servidor | Ghostscript (`-dPDFSETTINGS`) + qpdf, em processo separado | AGPL-3.0 (Ghostscript), Apache-2.0 (qpdf) | 0 | 3 | plus | serviço de arquivos; decisão sobre AGPL | 16 |
| F065 | `extrair-texto-de-pdf` | Extrair texto do PDF | navegador | PDF.js (`pdfjs-dist`, `isEvalSupported: false`, worker local) | Apache-2.0 | 394 KB + 1,0 MB (worker) | 2 | gratuito | teste de fumaça sob a CSP real (decisão 20d) | 15 |
| F152 | `remover-paginas-do-pdf` | Remover páginas do PDF | navegador | pdf-lib | MIT | 525 KB | 1 | gratuito | nenhuma | 15 |
| F153 | `extrair-paginas-do-pdf` | Extrair páginas do PDF | navegador | pdf-lib (+ PDF.js para as miniaturas) | MIT + Apache-2.0 | 525 KB + 1,4 MB | 2 | gratuito | nenhuma | 15 |
| F154 | `organizar-pdf` | Organizar PDF | navegador | PDF.js (miniaturas) + pdf-lib | Apache-2.0 + MIT | 1,9 MB | 3 | gratuito | nenhuma | 15 |
| F155 | `digitalizar-para-pdf` | Digitalizar e transformar em PDF | navegador | OpenCV.js (bordas e perspectiva) + pdf-lib; câmera por `getUserMedia` | Apache-2.0 + MIT | 10,4 MB (OpenCV.js, só nesta ferramenta) + 525 KB | 4 | gratuito | teste de WebAssembly sob a CSP | 15 |
| F156 | `reparar-pdf` | Reparar PDF | servidor | qpdf (`--qdf`/reescrita da tabela de objetos), em processo separado | Apache-2.0 | 0 | 3 | gratuito | serviço de arquivos | 16 |
| F157 | `ocr-pdf` | OCR de PDF | navegador | PDF.js + tesseract.js + pdf-lib (camada de texto invisível). Para PDF grande: OCRmyPDF no servidor | Apache-2.0 (os três); OCRmyPDF MPL-2.0 | ≈ 6,5 MB (PDF.js 1,4 + tesseract 3,7 + português 1,4) + pdf-lib 525 KB | 5 | gratuito | teste de WebAssembly sob a CSP; limite de 20 páginas | 15 |
| F158 | `jpg-para-pdf` | JPG para PDF | navegador | pdf-lib (`embedJpg`/`embedPng`) | MIT | 525 KB | 1 | gratuito | nenhuma | 15 |
| F159 | `word-para-pdf` | Word para PDF | servidor | LibreOffice headless (`soffice --convert-to pdf`) em contêiner sem rede | MPL-2.0 (com LGPL-3.0+ em parte) | 0 | 4 | plus | serviço de arquivos; sandbox de documentos | 16 |
| F160 | `powerpoint-para-pdf` | PowerPoint para PDF | servidor | LibreOffice headless (Impress), mesmo serviço do Word | MPL-2.0 (com LGPL-3.0+ em parte) | 0 | 4 | plus | serviço de arquivos; sandbox de documentos | 16 |
| F161 | `excel-para-pdf` | Excel para PDF | servidor | LibreOffice headless (Calc), mesmo serviço do Word | MPL-2.0 (com LGPL-3.0+ em parte) | 0 | 4 | plus | serviço de arquivos; sandbox de documentos | 16 |
| F162 | `html-para-pdf` | HTML para PDF | servidor | Chromium headless via Puppeteer ou Playwright, sem rede e sem JavaScript | Apache-2.0 (Puppeteer/Playwright); Chromium com licenças permissivas | 0 | 4 | plus | serviço de arquivos; bloqueio de rede (SSRF) | 16 |
| F163 | `pdf-para-jpg` | PDF para JPG | navegador | PDF.js (desenha na `canvas`) + fflate (ZIP) | Apache-2.0 + MIT | 1,4 MB + 89 KB | 2 | gratuito | nenhuma | 15 |
| F164 | `pdf-para-word` | PDF para Word | servidor | pdf2docx (sobre PyMuPDF) em contêiner; alternativa de qualidade menor: LibreOffice | pdf2docx MIT (segundo o repositório); PyMuPDF AGPL-3.0; LibreOffice MPL-2.0 | 0 | 5 | plus | serviço de arquivos; **decisão do dono sobre AGPL ou licença comercial** | 16 |
| F165 | `pdf-para-powerpoint` | PDF para PowerPoint | navegador | PDF.js (uma imagem por página) + pptxgenjs | Apache-2.0 + MIT | 1,4 MB + 284 KB | 3 | gratuito | nenhuma | 15 |
| F166 | `pdf-para-excel` | PDF para Excel | navegador | PDF.js (posição do texto) + SheetJS; detecção de linhas e colunas própria | Apache-2.0 + Apache-2.0 | 1,4 MB + 882 KB | 4 | gratuito | OCR (F157) para PDF escaneado | 15 |
| F167 | `pdf-para-pdfa` | PDF para PDF/A | servidor | Ghostscript (`-dPDFA`) + validação com veraPDF (Java), em processo separado | AGPL-3.0 (Ghostscript); veraPDF GPL-3.0+ ou MPL-2.0+ (dupla) | 0 | 5 | plus | serviço de arquivos; decisão sobre AGPL | 16 |
| F168 | `editar-pdf` | Editar PDF | navegador | PDF.js (mostra a página) + pdf-lib (grava texto, imagem e formas) | Apache-2.0 + MIT | 1,9 MB | 5 | gratuito | nenhuma | 15 |
| F169 | `numerar-paginas-do-pdf` | Números de página no PDF | navegador | pdf-lib (`drawText`) | MIT | 525 KB | 1 | gratuito | nenhuma | 15 |
| F170 | `marca-dagua-no-pdf` | Marca d'água no PDF | navegador | pdf-lib (`drawText`/`drawImage` com opacidade e rotação) | MIT | 525 KB | 2 | gratuito | nenhuma | 15 |
| F171 | `recortar-pdf` | Recortar PDF | navegador | PDF.js (prévia) + pdf-lib (`setCropBox`) | Apache-2.0 + MIT | 1,9 MB | 3 | gratuito | nenhuma | 15 |
| F172 | `preencher-formulario-pdf` | Preencher formulário em PDF | navegador | pdf-lib (API de formulários AcroForm) | MIT | 525 KB | 3 | gratuito | nenhuma; XFA fica de fora | 15 |
| F173 | `desbloquear-pdf` | Desbloquear PDF | servidor | qpdf (`--decrypt --password=`), em processo separado | Apache-2.0 | 0 | 2 | gratuito | serviço de arquivos | 16 |
| F174 | `assinar-pdf` | Assinar PDF | navegador | pdf-lib (`drawImage`) + `canvas` para desenhar a assinatura | MIT | 525 KB | 3 | gratuito | nenhuma; ICP-Brasil fora do escopo | 15 |
| F175 | `ocultar-informacoes-do-pdf` | Ocultar informações do PDF | navegador | PDF.js (desenha a página) + `canvas` (tarja) + pdf-lib (monta o PDF só de imagens) | Apache-2.0 + MIT | 1,9 MB | 4 | gratuito | nenhuma | 15 |
| F176 | `comparar-pdf` | Comparar PDF | navegador | PDF.js (texto e imagem) + jsdiff (diferença de texto) + comparação de pixels em `canvas` | Apache-2.0 + BSD-3-Clause | ≈ 1,6 MB | 4 | gratuito | nenhuma | 15 |
| F177 | `resumir-pdf` | Resumir PDF com IA | servidor | PDF.js extrai o texto no navegador; API de LLM resume no servidor | Apache-2.0; o serviço de IA tem termos próprios | 1,4 MB | 3 | plus | **dono: provedor de IA, chave de API e custo**; serviço de arquivos dispensável | 17 |
| F178 | `traduzir-pdf` | Traduzir PDF | servidor | PDF.js extrai o texto; API de LLM traduz. Alternativa sem LLM: LibreTranslate no servidor | Apache-2.0; LibreTranslate AGPL-3.0 | 1,4 MB | 3 | plus | **dono: provedor de IA, chave de API e custo** | 17 |
| F179 | `pdf-para-markdown` | PDF para Markdown | navegador | PDF.js (texto, posição e tamanho da fonte) + regras próprias de títulos, listas e tabelas | Apache-2.0 | 1,4 MB | 3 | gratuito | OCR (F157) para PDF escaneado | 15 |

### Imagens, áudio e vídeo (categoria `imagens`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F180 | `remover-fundo-de-imagem` | Remover fundo de imagem | navegador | ONNX Runtime Web + modelo MODNet (retratos) ou U²-Net-p (uso geral) | MIT + Apache-2.0 | 10,7 MB (WASM; 20,8 MB com WebGPU) + 6,6 MB (MODNet quantizado) ou 4,6 MB (U²-Net-p) | 4 | gratuito | WebAssembly sob a CSP; evitar `@imgly/background-removal` (AGPL-3.0) e RMBG da Bria (não comercial) | 17 |
| F181 | `ocr-de-imagem` | Texto da imagem (OCR) | navegador | tesseract.js (WebAssembly) | Apache-2.0 | ≈ 5,1 MB (worker 0,12 + núcleo 3,5 + dados do português 1,4) | 2 | gratuito | WebAssembly sob a CSP; dados de idioma servidos de `recursos/` | 17 |
| F182 | `heic-para-jpg` | HEIC para JPG | navegador | decodificador nativo quando existir (Safari); senão libheif-js (WebAssembly) | LGPL-3.0 (libheif); heic2any MIT empacota a libheif | ≈ 1,3 MB | 2 | gratuito | LGPL: carregar a biblioteca como arquivo separado e citar a licença | 17 |
| F183 | `ampliar-imagem` | Ampliar imagem | navegador | ONNX Runtime Web + Real-ESRGAN (modelo compacto) | MIT + BSD-3-Clause | 10,7–20,8 MB + modelo (≈ 5 a ≈ 67 MB, estimativa a confirmar) | 4 | gratuito | WebAssembly/WebGPU sob a CSP | 17 |
| F184 | `editor-de-fotos` | Editor de fotos | navegador | `canvas` 2D/WebGL, sem biblioteca | — (código próprio) | 0 | 3 | gratuito | nenhuma | 17 |
| F185 | `criar-gif` | Criar GIF | navegador | gifenc (codificador de GIF em JavaScript) | MIT | 9 KB | 2 | gratuito | nenhuma | 17 |
| F186 | `scanner-de-qr-code` | Ler QR Code | navegador | `BarcodeDetector` nativo, com jsQR de reserva; câmera por `getUserMedia` | Apache-2.0 (jsQR) | 0 a 257 KB | 2 | gratuito | nenhuma | 17 |
| F187 | `converter-video` | Converter vídeo | servidor | FFmpeg (binário) em fila, processo separado, contêiner sem rede | LGPL-2.1+ (build sem GPL) ou GPL-2+ (com libx264) | 0 | 4 | plus | serviço de arquivos; fila de trabalhos; **dono: custo de CPU e patentes de H.264** | 17 |
| F188 | `comprimir-video` | Comprimir vídeo | servidor | FFmpeg (binário), mesmo serviço do converter vídeo | LGPL-2.1+ ou GPL-2+ | 0 | 4 | plus | serviço de arquivos; fila de trabalhos; **dono: custo de CPU** | 17 |
| F189 | `cortar-video-e-audio` | Cortar vídeo e áudio | navegador | Mediabunny (cópia de trilhas sem reencodar) + WebCodecs | MPL-2.0 | 290 KB | 3 | gratuito | nenhuma | 17 |
| F190 | `extrair-audio-de-video` | Extrair áudio de vídeo | navegador | Mediabunny (separa a trilha de áudio) | MPL-2.0 | 290 KB | 3 | gratuito | nenhuma | 17 |
| F191 | `converter-audio` | Converter áudio | navegador | Mediabunny + codificador de áudio do navegador (WebCodecs); MP3 opcional com lamejs | MPL-2.0; lamejs LGPL com condições do LAME (conferir) | 290 KB (+ ≈ 150 KB do lamejs, se aprovado) | 3 | gratuito | MP3 de saída depende de conferir a licença do lamejs | 17 |
| F192 | `transcrever-audio` | Transcrever áudio em texto | servidor | whisper.cpp ou faster-whisper, modelo Whisper small/medium, em fila | MIT (whisper.cpp, faster-whisper); pesos do Whisper MIT | 0 | 4 | plus | serviço de arquivos; fila; **dono: custo de CPU/GPU** | 17 |
| F193 | `texto-para-fala` | Texto para fala | navegador | Web Speech API (`speechSynthesis`), só vozes locais por padrão | — (API do navegador) | 0 | 1 | gratuito | arquivo de áudio exigiria servidor (Piper) e decisão do dono | 17 |
| F194 | `gravador-de-tela-e-audio` | Gravador de tela e de áudio | navegador | `getDisplayMedia` + `getUserMedia` + `MediaRecorder` | — (APIs do navegador) | 0 | 2 | gratuito | nenhuma; sem captura de tela no celular | 17 |

### Texto e inteligência artificial (categoria `texto`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F195 | `traduzir-texto` | Traduzir texto | navegador | Translator API do navegador, quando existir; senão transformers.js + modelos Opus-MT | Apache-2.0 (transformers.js e Opus-MT) | ≈ 113 MB por sentido (quantizado) + 10,7 MB do ONNX Runtime | 4 | gratuito | aviso de download grande no celular; WebAssembly sob a CSP | 17 |
| F196 | `corrigir-texto` | Corrigir gramática e ortografia | servidor | LanguageTool (Java), servidor próprio, só português | LGPL-2.1 | 0 | 3 | gratuito | servidor com Java e memória reservada; **dono: limites de uso** | 17 |
| F197 | `resumir-texto` | Resumir texto com IA | servidor | API de LLM chamada pelo servidor do site | termos do provedor | 0 | 2 | plus | **dono: provedor de IA, chave de API, custo e política de privacidade** | 17 |

### Documentos, planilhas e arquivos (categorias `documentos`, `planilhas`, `produtividade`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F198 | `converter-documento` | Converter documento | servidor | LibreOffice headless, mesmo serviço do Word para PDF | MPL-2.0 (com LGPL-3.0+ em parte) | 0 | 3 | plus | serviço de arquivos; sandbox de documentos | 16 |
| F199 | `converter-planilha` | Converter planilha | navegador | SheetJS | Apache-2.0 | 882 KB | 2 | gratuito | instalar do repositório oficial do SheetJS, não do npm (versão antiga) | 17 |
| F200 | `criador-de-graficos` | Criador de gráficos | navegador | Chart.js (`canvas`) | MIT | 206 KB | 3 | gratuito | nenhuma | 17 |
| F201 | `zip` | ZIP: compactar e descompactar | navegador | fflate | MIT | 89 KB | 2 | gratuito | limites contra ZIP bomba | 17 |

### Marketing, dinheiro, logística e consultas (categorias `marketing`, `dinheiro`, `operações`, `segurança`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F202 | `encurtador-de-links` | Encurtador de links com estatística | servidor | API Node + SQLite do site; checagem de destino com lista de endereços perigosos | — (código próprio) | 0 | 4 | plus | contas (Onda 2); **dono: domínio curto, política de abuso e retenção de cliques (LGPD)** | 17 |
| F203 | `simulador-de-financiamento` | Simulador de financiamento | navegador | JavaScript puro, em centavos inteiros; CET pela taxa interna de retorno | — (código próprio) | 0 | 3 | gratuito | nenhuma | 17 |
| F204 | `calculadora-mei-das` | Calculadora do MEI e do DAS | navegador | JavaScript puro com tabela datada e com fonte | — (código próprio) | 0 | 2 | gratuito | atualização anual da tabela (salário mínimo) | 17 |
| F205 | `consulta-de-cep` | Consulta de CEP | servidor | rota da API do site com cache, consultando ViaCEP e, de reserva, BrasilAPI | serviços públicos gratuitos; termos próprios | 0 | 2 | gratuito | API do site; **dono: aceitar fonte gratuita ou contratar base dos Correios** | 17 |
| F206 | `consulta-de-cnpj` | Consulta de CNPJ | servidor | rota da API do site com cache, consultando a BrasilAPI (dados abertos da Receita) | dados públicos; termos do serviço | 0 | 3 | gratuito | API do site; **dono: fonte e LGPD sobre dados de sócios e MEI** | 17 |

### Desenvolvimento (categoria `desenvolvimento`)

| ID | Slug | Nome | Motor | Tecnologia | Licença | Download no navegador | Dif. | Plano | Dependências | Onda |
|---|---|---|---|---|---|---|---|---|---|---|
| F207 | `formatador-de-codigo` | Formatar SQL e código | navegador | sql-formatter + Prettier (versão standalone, por linguagem) | MIT + MIT | 236 KB (SQL) + 100 a 400 KB por linguagem (estimativa) | 2 | gratuito | nenhuma | 17 |
| F208 | `diagramas-mermaid` | Diagramas por texto (Mermaid) | navegador | Mermaid (com DOMPurify embutido) | MIT (Mermaid); Apache-2.0 ou MPL-2.0 (DOMPurify) | 2,6 MB | 4 | gratuito | a CSP `style-src 'self'` pode barrar estilos que o Mermaid injeta: testar antes | 17 |

Todas as ferramentas acima são `planejada`, exceto Juntar PDF (F060).

## 6. Ondas 15 a 17

| Onda | O que entra | Ferramentas |
|---|---|---|
| **15: PDF no navegador** | Todas as de PDF que rodam no aparelho com pdf-lib, PDF.js e, em duas delas, tesseract.js e OpenCV.js. Cria a política de CSP por página e o teste de fumaça de PDF.js e WebAssembly. | F061, F062, F065, F152, F153, F154, F155, F157, F158, F163, F165, F166, F168, F169, F170, F171, F172, F174, F175, F176, F179 |
| **16: serviço de arquivos e conversões** | O serviço de arquivos (4.1) e as conversões que precisam de LibreOffice, Chromium, qpdf, Ghostscript, veraPDF e pdf2docx. | F063, F064, F156, F159, F160, F161, F162, F164, F167, F173, F198 |
| **17: mídia, IA e demais** | Imagem com modelos (WebAssembly), áudio e vídeo, serviços de IA, consultas (CEP, CNPJ), encurtador, finanças e utilitários de desenvolvimento. | F177, F178, F180, F181, F182, F183, F184, F185, F186, F187, F188, F189, F190, F191, F192, F193, F194, F195, F196, F197, F199, F200, F201, F202, F203, F204, F205, F206, F207, F208 |

Ordem sugerida dentro de cada onda: primeiro as de dificuldade 1 e 2 (liberam valor e provam a infraestrutura), depois as de 3 e 4, por último as de 5.

## 7. O que depende de decisão do dono

1. **Provedor de IA e chave de API** (Resumir PDF, Traduzir PDF, Resumir texto). Escolher o provedor, definir o orçamento mensal, os limites por plano e a política de privacidade: o texto do usuário sai do servidor do site e vai a um terceiro, e o aviso na tela precisa dizer isso. Sem essa decisão, as três ficam planejadas.
2. **Custo e servidor de vídeo e transcrição** (Converter vídeo, Comprimir vídeo, Transcrever áudio). Exigem CPU (e GPU, para o Whisper de boa qualidade) e fila. O VPS único do plano (seção 2.1) pode não bastar. Decidir se entram no Plus ou ficam desligados até haver orçamento.
3. **AGPL: Ghostscript e PyMuPDF.** Para Comprimir PDF e PDF para PDF/A, a proposta é usar o Ghostscript **sem modificar, como programa separado**. Para PDF para Word com boa qualidade, a opção pdf2docx depende do PyMuPDF: ou o serviço isolado vira código aberto (AGPL), ou se compra licença comercial da Artifex, ou se aceita a conversão pior do LibreOffice. Decidir qual.
4. **Patentes de vídeo** (4.4): MP4 com H.264 e AAC no servidor ou só formatos livres.
5. **CSP: aceitar `'wasm-unsafe-eval'`** nas páginas das ferramentas que usam WebAssembly (4.2).
6. **Assinatura com certificado ICP-Brasil** (Assinar PDF). A ferramenta planejada faz só assinatura eletrônica **simples** (desenho ou imagem). Assinar com certificado digital exigiria enviar o certificado ou usar bibliotecas de assinatura e uma política de guarda; fica fora do escopo até o dono decidir.
7. **Encurtador de links:** domínio curto, política contra golpe e phishing, quem modera, quanto tempo se guardam os cliques e o que se anonimiza (LGPD).
8. **Consulta de CEP e de CNPJ:** aceitar fontes gratuitas e comunitárias (ViaCEP, BrasilAPI), que podem mudar ou bloquear uso intenso, ou contratar uma base. Para CNPJ, avaliar a LGPD sobre dados de sócios e de MEI.
9. **Planos e cotas** de todas as ferramentas de servidor (a coluna "Plano" é proposta).
10. **Tradução no navegador:** o modelo pesa cerca de 113 MB por sentido. Decidir se vale oferecer assim ou só por servidor.
11. **Texto para fala com arquivo de áudio:** exige servidor (Piper, GPL-3.0, com a voz pt-BR "faber", CC0). Fica para depois, se o dono quiser.
12. **Nome da categoria de mídia:** "Imagens, áudio e vídeo" é um nome provisório dentro da categoria `imagens`. Uma categoria própria de mídia seria melhor com tantas ferramentas; não criei por limite da tarefa.

## 8. O que ficou de fora, e por quê

| Ideia | Decisão | Motivo |
|---|---|---|
| Baixar vídeo de plataformas (YouTube, Instagram, TikTok etc.) | **Descartada** | Viola os termos das plataformas e os direitos de autor de terceiros. |
| Remover marca d'água de imagem ou vídeo de terceiros | **Descartada** | Mesma razão. A ferramenta de remover fundo é para imagens do próprio usuário. |
| Quebrar senha de PDF | **Descartada** | Desbloquear PDF (F173) só tira a senha de quem a conhece, ou a trava de cópia e impressão. |
| Parafrasear texto | Não incluída | Parece mais um modo do "Resumir texto" do que ferramenta própria, e pode ser usada para burlar detector de plágio. Pode virar opção de F197 se o dono quiser. |
| Cotação de moedas ao vivo | Não incluída | Já existe o Conversor de moedas (F013), que na especificação consulta a PTAX do Banco Central. Duplicaria. |
| Decodificador de JWT, editor de Markdown com prévia, gerador de assinatura de e-mail | Não incluídas | São ferramentas simples demais para o objetivo "bem usadas e complexas". Podem entrar depois como ferramentas rápidas de desenvolvimento e marketing. |
| Vídeo para GIF | Fundida em F187 (Converter vídeo) | A saída GIF é só mais um formato. |
| FFmpeg.wasm | Não usado | Seção 4.3. |
| Chave de IA embutida no navegador | **Descartada** | Qualquer chave no navegador vaza. Toda chamada de IA passa pelo servidor. |

Ideias pesquisadas e acrescentadas à lista: **Criador de gráficos** (F200) e **Diagramas por texto (Mermaid)** (F208), por serem muito usadas e completas, e **Ler QR Code** (F186) como par do gerador que já existe.

## 9. Observações sobre algumas ferramentas

- **Reparar PDF.** O qpdf reconstrói a tabela de objetos e recupera arquivos truncados ou com índice quebrado, mas não ressuscita conteúdo perdido. A tela precisa dizer "recuperado em parte" quando for o caso.
- **PDF para Word.** "O resultado depende de como o PDF foi criado" vale ao pé da letra: PDF digital simples converte bem; colunas, tabelas complexas e PDF escaneado, não. O aviso deve estar na tela, antes do envio.
- **PDF para PowerPoint.** No navegador cada slide é uma imagem. É honesto e funciona sempre; a versão com texto editável exigiria servidor e qualidade incerta.
- **Recortar PDF** só muda a área visível; o conteúdo cortado continua no arquivo. A tela avisa e aponta para Ocultar informações quando o motivo é privacidade.
- **Ocultar informações** converte as páginas em imagem para o texto de baixo da tarja deixar de existir. Tarja desenhada por cima não protege nada, e a ferramenta não pode oferecer isso.
- **Assinar PDF** vale como assinatura eletrônica simples (Lei 14.063/2020). Para ato que exija força jurídica maior, o texto da tela deve orientar o usuário a usar certificado ICP-Brasil em outra ferramenta.
- **HTML para PDF** recebe só o HTML colado ou enviado. Aceitar um endereço (URL) permitiria que o usuário pedisse ao servidor para abrir páginas internas da rede (SSRF); por isso não aceita.
- **Desbloquear PDF.** O aviso na tela diz que só deve ser usado em arquivo seu ou com autorização.
- **Texto para fala.** Algumas vozes do navegador (por exemplo as "de rede" do Chrome) enviam o texto ao fornecedor da voz. A ferramenta deve preferir vozes locais e avisar quando só houver voz de rede.
- **Gravador de tela** não existe em navegador de celular (`getDisplayMedia`); a página precisa dizer isso e oferecer só a gravação de áudio no celular.
- **MEI e DAS.** Os valores (percentual do salário mínimo, ICMS e ISS fixos, limite de faturamento) mudam; a tabela entra no código com fonte e data, como pede a decisão 18, e precisa ser conferida a cada janeiro. Nenhum número foi fixado neste documento.
- **Financiamento.** O CET segue a definição da Resolução CMN nº 3.517/2007 (taxa interna de retorno do fluxo com todos os custos). Conferir a norma na implementação.

## 10. Fontes consultadas (05/10/2026)

- Licenças: API de licenças do GitHub para pdf-lib, PDF.js, tesseract.js, qpdf, pdfcpu, ghostpdl (Ghostscript), mupdf.js, PyMuPDF, pdf2docx, onnxruntime, transformers.js, rembg, U-2-Net, Real-ESRGAN, whisper.cpp, faster-whisper, LanguageTool, LibreTranslate, OCRmyPDF, Puppeteer, libheif, jsQR, SheetJS, mammoth.js, sql-formatter, Prettier, Mermaid, DOMPurify, gifenc, Mediabunny, mp4box.js, lamejs, ffmpeg.wasm, JSZip, marked, Kokoro, veraPDF (README), piper1-gpl.
- FFmpeg: `ffmpeg.org/legal.html`; Dockerfile do ffmpeg.wasm (flags de compilação).
- LibreOffice: `libreoffice.org/about-us/licenses/`.
- Tamanhos: jsDelivr (`data.jsdelivr.com`) para pdf-lib 1.17.1, pdfjs-dist 5.4.149, @ffmpeg/core 0.12.10, tesseract.js 6.0.0 e tesseract.js-core 6.0.0, dados do português do tesseract, onnxruntime-web 1.22.0, heic2any, libheif-js, mermaid 11.4.1, OpenCV.js, xlsx 0.18.5, fflate 0.8.2, Chart.js 4.4.7, sql-formatter 15.4.9, pptxgenjs 3.12.0, jsQR 1.4.0, gifenc 1.0.3, Mediabunny. Hugging Face para os modelos Whisper-tiny, Kokoro, MODNet, U²-Netp, Opus-MT e as vozes do Piper (licença CC0 da voz "faber").
- ViaCEP (`viacep.com.br`): gratuito, sem limite declarado, com aviso de bloqueio para uso massivo.
