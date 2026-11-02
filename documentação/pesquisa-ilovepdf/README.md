# Pesquisa de comportamento das ferramentas do iLovePDF

**Data:** 5 de outubro de 2026. **Versão observada:** site em português (`https://www.ilovepdf.com/pt/...`),
plano gratuito, sem conta.
**Objetivo:** descrever **como cada uma das 30 ferramentas se comporta** (fluxo, opções, limites, mensagens,
técnica provável) para que outros agentes construam as equivalentes do portal **sem erro**.

## Método e limites do que foi possível testar

- **Observação de comportamento, sem copiar nada.** Não baixei, salvei nem colei JavaScript, CSS, HTML,
  textos de marketing ou imagens do iLovePDF. Os rótulos e mensagens citados são curtos e funcionais,
  anotados só para o nosso texto poder dizer a mesma coisa com palavras próprias.
- **Nada foi baixado.** Nenhum arquivo de resultado foi salvo. Sem conta, sem login, sem assinatura, sem
  aceitar termos. Parei nos bloqueios Premium (PDF/A, PDF para Markdown, Assinatura Digital, OCR no Word,
  Ocultação inteligente, Tamanho no Dividir, Dividir inteligente, IA avançada).
- **Arquivos de teste próprios, sem dado pessoal.** Gerados por código nosso (pasta `scripts/`). O "CPF" que
  aparece nos exemplos (`123.456.789-00`) é fictício e inválido por construção.
- **No máximo duas execuções por ferramenta**, uma tarefa por vez. (Em Juntar PDF passei de duas por causa do
  painel de senha, que precisei entender; sem laços automáticos.)
- **Rede:** inspecionei só endereços e tipos das chamadas feitas pela própria página (para inferir se o
  processamento é no servidor), sem registrar tokens, cookies nem cabeçalhos de autenticação.
- **Não tentei contornar** CAPTCHA, limites do plano gratuito ou bloqueios (não apareceu CAPTCHA).
- **Interrupções:** a sessão de uso acabou duas vezes durante o trabalho; o navegador embutido foi
  fechado e reaberto e passei a usar uma aba só minha.
- **Limites do que não deu para testar** (explicados por ferramenta): arquivos grandes (limite de tamanho
  e de arquivos), conteúdo dos arquivos de saída (não baixei), qualidade de conversão (Word/PowerPoint/Excel
  e OCR), a tela de sucesso do Reparar PDF (nenhum dos meus dois arquivos danificados foi reparado), o passo
  final de Assinar PDF (arrastar o campo à página não foi reproduzível por automação), Digitalizar (exige celular),
  e todas as telas atrás de Premium.
- **Limites oficiais (plano gratuito):** a página de preços diz arquivo de **15 a 400 MB conforme a ferramenta**
  (Premium: 4 GB), lote limitado, e lista como bloqueados: PDF→Word/Excel com OCR, PDF→PDF/A, Dividir
  inteligente, IA avançada (resumir/traduzir). Os números por ferramenta **não estão publicados**; a política
  de retenção diz **2 horas** e envio por HTTPS. A documentação pública da iLoveAPI (mesmo motor) lista os
  modos `split_mode` (ranges, fixed_range, remove_pages, filesize), `compression_level` (extreme,
  recommended, low), `pdfjpg_mode` (pages, extract), orientação/margem/tamanho de página do JPG→PDF,
  posições e fontes de números de página, `conformance` do PDF/A, e os códigos de erro (`DamagedFile`,
  `OutOfRange`, `NoImages`, `WrongPassword`, `NonConformant`, `TimeOut`, `UnknownError`...).

### Como reproduzir (resumo; detalhes em `scripts/`)

1. `node scripts/gerar-amostras.mjs <pasta> [caminho do pdf-lib.esm.min.js]` — cria PDFs numerados, misto,
   com imagem, escaneado, formulário, para comparar, corrompido, vazio, falso, **protegido** (RC4 40 bits, nossa
   escrita à mão), DOCX, XLSX, PPTX e HTML (precisa antes de `pwsh -File scripts/gerar-jpg.ps1 -Saida <pasta>`,
   que cria os JPGs com `System.Drawing`).
2. Navegador embutido: `fetch` para `127.0.0.1` é **bloqueado** (`ERR_BLOCKED_BY_CLIENT`), por isso os
   arquivos são gerados **dentro da página** com `scripts/ajuda-navegador.js` (+ `-2.js` e `-3.js`) e injetados no
   `<input type="file">` com `DataTransfer` + `change`. O campo demora ~2 s para existir; em Recortar,
   Formulários, Ocultar, Resumir, Traduzir e PDF→Markdown a injeção pelo campo falhou ou não existia e **soltar
   (`drop`) sobre `#dropArea`** funcionou. Executar = clicar em `#processTask`.
3. `scripts/servir-amostras.mjs` serve a pasta em `127.0.0.1` (útil fora do navegador embutido).

## Descobertas que mais mudam a nossa implementação

1. **Cinco ferramentas rodam no navegador no próprio iLovePDF** (nenhum upload do PDF): **Recortar, Formulários,
   Ocultar (modo básico), Comparar** e a **edição** de Editar PDF (o PDF vai e volta, mas a edição é local).
   As demais usam servidor. Para nós, "tudo no navegador" é viável para ~20 ferramentas e é um
   **diferencial de privacidade** (o iLovePDF envia até a senha do Proteger para o servidor).
2. **Editar PDF e Formulários usam um editor comercial (Apryse WebViewer, inferido do `iframe`
   `webviewer`)**, e PDF→Word/PowerPoint/Excel usam **Solid Documents** (anunciado na tela). Não há equivalente
   aberto de mesma qualidade: a nossa versão será "melhor esforço" e não deve prometer fidelidade; editar o
   texto original do PDF é recurso Premium lá e **fica fora da nossa v1**.
3. **Proteger e Desbloquear exigem criptografia/descriptografia que o `pdf-lib` não faz** (confirmado no
   pacote do portal: só `ignoreEncryption`). Precisamos de `qpdf` (Apache-2.0) em WebAssembly ou no servidor.
   E o Desbloquear do iLovePDF respondeu "desbloqueados" até para um PDF com senha de abrir que não informei
   (não baixei, então não sei se saiu legível): **nossa versão exige a senha de abrir**.
4. **Conversão de Office/HTML para PDF exige servidor** (LibreOffice, MPL-2.0; Chromium/Puppeteer, Apache-2.0)
   e traz riscos que o navegador não tem: arquivo hostil, SSRF no HTML-por-URL (o iLovePDF busca a URL no
   servidor), custo de CPU. As extensões aceitas (`.doc .docx .odt .rtf`, `.ppt .pptx .odp`, `.xls .xlsx .ods`)
   indicam LibreOffice. **O Reparar PDF deles falhou em dois casos simples** (truncado; só sem xref): é
   oportunidade de fazer melhor (reconstruir xref).
5. **Tarjar (Ocultar) é a ferramenta onde mais dá para errar**: tarja que só cobre o texto vaza dados. A nossa
   versão precisa de **remoção real** (rasterizar a página afetada na v1) e de **teste automático** que prove que
   o texto sumiu do arquivo; o mesmo vale para o aviso de que **Recortar não remove** o conteúdo cortado.

Outros achados úteis: o upload só acontece **ao clicar no botão de ação**; as miniaturas são feitas **no
navegador com pdf.js**; a retenção é de 2 h; existe um painel de senha por arquivo ("Alguns ficheiros
requerem senha" com "Ou Ignorar esses arquivos"); filtro de extensão no cliente ("Lamentamos, mas essa
extensão não é permitida"); páginas de erro com código (`DamagedFile`, `OutOfRange`, `NoImages`); o campo de
páginas do Dividir **trava em silêncio** com intervalo fora do total; Juntar exige 2 arquivos; Rodar gira o
arquivo inteiro (não por página); **OCR usa a lista de idiomas do Tesseract (máx. 3 por vez)**.

## Tabela resumo das 30 ferramentas

Legenda do motor: **S** = servidor (confirmado por `POST /v1/upload`/`process`); **N** = navegador
(confirmado: sem upload); **S?** = servidor inferido, não conferido; **—** = não foi possível medir.
"Gratuito" = o que o plano gratuito deixou fazer nos meus testes.

| # | Ferramenta | Fluxo em passos | Opções (principais) | Limites / plano gratuito | Motor | Não deu para testar (e por quê) |
|---|---|---|---|---|---|---|
| 1 | Juntar PDF | escolher ≥2 PDFs → arrastar/ordenar → "Juntar PDF" → baixar | só ordem (arrastar, ordenar A–Z) | mínimo 2 arquivos; painel de senha por arquivo | S | máx. de arquivos/tamanho (não testado) |
| 2 | Dividir PDF | 1 PDF → aba (Intervalo/Páginas/Tamanho) → "Dividir PDF" | intervalo personalizado/fixo/inteligente; extrair todas ou selecionar; tamanho máx. | Tamanho e Inteligente são Premium | S | Inteligente e Tamanho (Premium); saída ZIP (não baixei) |
| 3 | Remover páginas | 1 PDF → clicar páginas ou digitar `1,5-8` → "Remover páginas" | seleção, Shift para intervalo | remover todas → `OutOfRange` só no servidor | S | — |
| 4 | Extrair páginas | **é uma aba de Dividir** (Páginas > Selecionar) | `1,5-8`, "mesclar em um PDF" | — | S | ordem digitada x ordem do documento (não baixei) |
| 5 | Organizar PDF | PDF(s) → grade de miniaturas → arrastar/girar/eliminar/inserir em branco → "Organizar" | zoom, girar, eliminar, página em branco, ordenar, adicionar arquivos | — | S | limites de páginas |
| 6 | Digitalizar → PDF | abrir página → ler QR com celular → fotografar → guardar | pareamento por QR | exige celular | S? | exige celular e app; não testado |
| 7 | Comprimir PDF | PDF(s) → nível → "Comprimir PDF" → mostra "48% reduzido, 33,15 KB → 17,27 KB" | extrema / recomendada (padrão) / baixa | — | S | arquivo já otimizado; limites |
| 8 | Reparar PDF | PDF(s) → "Reparar PDF" | nenhuma | 2 testes de dano falharam (`DamagedFile`) | S | sucesso de reparo (nenhum caso reparou) |
| 9 | OCR PDF | PDF(s) → idiomas (máx. 3, padrão Português) → "Aplicar ROC" | idiomas (~120, lista do Tesseract) | OCR avançado é Premium | S | qualidade do texto (não baixei) |
| 10 | JPG para PDF | imagens → orientação/tamanho/margem → mesclar → "Converter" | retrato/paisagem; adaptar/A4/Carta; margem sem/pequena/grande; mesclar | aceita jpg, jpeg, png, tif, tiff | S | TIFF; mesclar desmarcado |
| 11 | Word para PDF | DOC(X)… → "Converter em PDF" | nenhuma | `.doc .docx .odt .ott .stw .sdw .sxw .rtf` | S | fidelidade; `.doc`; senha |
| 12 | PowerPoint para PDF | PPT(X)… → "Converter em PDF" | nenhuma | `.ppt .pptx .odp .pps .ppsx .sxi` | S | fidelidade; animações |
| 13 | Excel para PDF | XLS(X)… → "Converter em PDF" | nenhuma visível (descrição promete orientação) | `.xls .xlsx .ods .ots .sdc .sxc` | S | planilhas grandes; orientação |
| 14 | HTML para PDF | "Adicionar HTML" → colar **URL** → opções → "Converter em PDF" | largura do ecrã (5), tamanho (A3/A4/A5/Carta/uma página longa), orientação, margem, bloquear anúncios, remover pop-ups | só URL (não arquivo HTML) | S | URL com login; páginas pesadas |
| 15 | PDF para JPG | PDF(s) → modo (páginas/extrair imagens) → qualidade → "Converter em JPG" | páginas ou extrair; qualidade normal/alta | extrair sem imagens → `NoImages` | S | dpi das imagens; ZIP |
| 16 | PDF para Word | PDF(s) → SEM ROC / ROC → "Converter para WORD" | com/sem OCR (OCR Premium) | PDF escaneado abre pergunta "Continuar sem ROC / Aplicar ROC" | S (Solid Documents) | qualidade; ramo com OCR (Premium) |
| 17 | PDF para PowerPoint | PDF(s) → "Converter para PPTX" | nenhuma | — | S (Solid Documents) | qualidade |
| 18 | PDF para Excel | PDF(s) → SEM ROC/ROC → layout (uma folha / várias, padrão várias) | OCR (Premium); layout | — | S (Solid Documents) | detecção de colunas |
| 19 | PDF para PDF/A | PDF(s) → nível → "Converter para PDF/A" | PDF/A-1b, 1a, 2b (padrão), 2u, 2a, 3b, 3u, 3a; permitir reduzir nível | **Premium** (janela de cadastro) | S | tudo após o bloqueio |
| 20 | Editar PDF | PDF → editor (Anotar/Editar) → "Salvar alterações" | destacar, desenhar, texto, formas, carimbo, assinatura, anexo; editar texto (Premium) | editor comercial no navegador | N (edição) + S (render) | salvar com alteração real; texto existente |
| 21 | Rodar PDF | PDF(s) → girar (cartão ou botões) → "Rodar PDF" | direita/esquerda, por arquivo | gira o arquivo todo | S | — |
| 22 | Números de página | PDF → opções → "Inserir números de página" | modo página única/dupla, posição 3×3, margem, 1º número, intervalo, texto ({n}, {p}), fonte, tamanho 0–150, cor, opacidade | — | S | fontes; páginas duplas |
| 23 | Marca d'água | PDF → texto ou imagem → opções → "Inserir marca d'água" | texto/imagem, fonte, tamanho, cor, posição 3×3 ou mosaico, transparência 100/75/50/25, rotação 0/45/90/180/270, páginas, camada | imagem: jpg jpeg png gif | S | imagem; camada abaixo |
| 24 | Recortar PDF | PDF → arrastar retângulo → todas/página atual → "Recortar PDF" | retângulo com alças | **roda no navegador** | **N** | margens numéricas |
| 25 | Formulários PDF | PDF → preencher ou editar formulário → "Descarregar" | campos: texto, caixa, rádio, lista, combinação, assinatura | **roda no navegador** | **N** | detecção automática em PDF sem campos |
| 26 | Desbloquear PDF | PDF(s) → "Desbloquear PDF" | nenhuma | sem campo de senha | S | resultado legível? (não baixei) |
| 27 | Proteger PDF | PDF(s) → senha ×2 → "Proteger PDF" | senha; (oculto) senha de permissões + 7 restrições | botão desabilita se senhas diferem | S | modo avançado (oculto/Premium?) |
| 28 | Assinar PDF | PDF → tipo → só eu/várias pessoas → criar assinatura → arrastar campos → "Assinar" | simples/digital; 10 fontes cursivas, desenhar, imagem; cores; iniciais, nome, data, texto, carimbo | Digital e várias pessoas exigem Premium/conta | S (render) | arrastar campo e concluir |
| 29 | Ocultar (tarjar) | PDF → pesquisar texto ou Ocultação inteligente → "Ocultar" | termos, áreas/páginas; inteligente: 8 categorias + pedido livre | inteligente gasta créditos | **N** (básico) | inteligente; se o texto some do arquivo |
| 30 | Comparar PDF | 2 PDFs → modo (texto / sobreposição) → relatório | texto semântico; sobreposição; rolagem sincronizada | **roda no navegador** | **N** | relatório baixado |
| 31 | Resumir com IA | PDF → comprimento/IA → "Continuar" → resumo + perguntas | curto/médio/longo; IA padrão/avançada | grátis na IA padrão | S (IA) | IA avançada |
| 32 | Traduzir PDF | PDF → De/Para → modo → "Traduzir PDF" | 120 idiomas de origem, 28 de destino; manter layout/só texto; IA padrão/avançada | grátis na IA padrão | S (IA) | qualidade; layout |
| 33 | PDF para Markdown | PDF → "PDF para Markdown" | nenhuma | **Premium** (janela de cadastro) | S (IA) | tudo após o bloqueio |

> **Contagem:** o pedido fala em "30 ferramentas", mas os cinco grupos listados somam **33** itens
> (A 6 + B 8 + C 5 + D 6 + E 8). A tabela traz os 33. "Extrair páginas" não tem tela própria: é uma aba de
> "Dividir PDF" (linha 4).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `a-organizar.md` | mecanismo comum do iLovePDF + Juntar, Dividir, Remover, Extrair, Organizar, Digitalizar |
| `b-otimizar-e-para-pdf.md` | Comprimir, Reparar, OCR, JPG→PDF, Word/PowerPoint/Excel→PDF, HTML→PDF |
| `c-de-pdf.md` | PDF→JPG, →Word, →PowerPoint, →Excel, →PDF/A |
| `d-editar.md` | Editar, Rodar, Números de página, Marca d'água, Recortar, Formulários (+ tabela do que roda no navegador) |
| `e-seguranca-e-ia.md` | Desbloquear, Proteger, Assinar, Ocultar, Comparar, Resumir, Traduzir, PDF→Markdown |
| `scripts/` | geradores de arquivos de exemplo e ajudas de navegador (todos nossos) |

## Licenças das bibliotecas candidatas — o que foi **conferido na fonte** (arquivo `LICENSE` do repositório oficial, 05/10/2026)

| Biblioteca | Licença conferida | Observação |
|---|---|---|
| pdf-lib (Hopding) | MIT | também em `portal/recursos/LICENSE-pdf-lib.txt` (v1.17.1); **não cifra nem decifra** |
| pdf.js (Mozilla) | Apache-2.0 | renderização, texto, senha de leitura |
| tesseract.js e Tesseract (motor) | Apache-2.0 | arquivos de idioma (`tessdata`): **não conferi** |
| qpdf | Apache-2.0 (a partir da versão 7; antes Artistic 2.0) | README oficial; empacotamento WebAssembly de terceiros: **conferir** |
| pdfcpu | Apache-2.0 | |
| Ghostscript | **AGPL-3.0 ou posterior** | serviço em rede exige abrir o código ou licença comercial |
| MuPDF / PyMuPDF | **AGPL-3.0** | idem |
| LibreOffice | MPL-2.0 | página oficial de licenças |
| PDFium | BSD + Apache-2.0 | |
| mammoth.js | BSD-2-Clause | só DOCX→HTML/texto |
| SheetJS (CE) | Apache-2.0 | |
| ExcelJS, docx (dolanmiu), PptxGenJS | MIT | |
| JSZip | MIT **ou** GPL-3.0 (à escolha) | usar sob a MIT |
| Puppeteer | Apache-2.0 | |
| WeasyPrint | BSD-3-Clause | |
| pdf2docx (repositório ArtifexSoftware) | MIT (no arquivo `LICENSE` consultado) | depende de PyMuPDF (AGPL) |
| OCRmyPDF | **o arquivo consultado trouxe MPL-2.0, mas o texto não citava o projeto**: tratar como não confirmado |
| Fabric.js, Konva | MIT | |
| signature_pad | MIT | |
| node-signpdf | MIT | |
| node-forge | BSD-3-Clause **ou** GPL-2.0 | usar sob a BSD |
| jsdiff | BSD-3-Clause | |
| diff-match-patch | Apache-2.0 | |
| veraPDF | GPLv3 (arquivo `LICENSE.GPL` conferido); o projeto também oferece MPLv2: **não conferi** | validação de PDF/A |
| Pandoc | GPL-2.0 ou posterior | não usar como biblioteca embutida |

**Não conferi:** `@cantoo/pdf-lib` (fork que diz suportar criptografia: a página tentada devolveu 404),
Transformers.js, modelos de tradução/resumo, `tessdata`, fontes cursivas usadas em assinatura (Google Fonts, em
geral OFL, mas **cada uma precisa de verificação**), qpdf em WebAssembly de terceiros.

## Sugestão de ordem de implementação (por valor e risco)

1. **Já viáveis no navegador com `pdf-lib`/`pdf.js`:** Juntar, Dividir/Extrair, Remover páginas, Rodar, Organizar,
   Recortar, Números de página, Marca d'água, JPG→PDF, PDF→JPG, Formulários (básico), Comparar.
2. **Com mais esforço no navegador:** Comprimir, OCR (tesseract.js), Assinar (simples), Ocultar (modo seguro por
   rasterização), Editar (texto/imagens/formas), PDF→Excel/Word/Markdown (melhor esforço).
3. **Exigem `qpdf` (WebAssembly ou servidor):** Proteger, Desbloquear, Reparar.
4. **Exigem servidor:** Word/PowerPoint/Excel→PDF (LibreOffice), HTML→PDF por URL (Chromium), PDF/A (Ghostscript:
   AGPL!), Resumir/Traduzir com IA (modelo/serviço externo, custo e privacidade).
5. **Adiar:** Digitalizar por QR (pareamento exige servidor), edição de texto existente, assinatura digital
   com certificado.
