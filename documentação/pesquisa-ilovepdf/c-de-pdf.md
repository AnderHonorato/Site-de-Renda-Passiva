# Grupo C — Converter de PDF (iLovePDF, observado em 2026-10-05)

Mecanismo comum (upload só ao clicar, `api<N>.ilovepdf.com/v1/...`, página de erro, retenção de 2 h)
em `a-organizar.md`. Aqui só o que é específico. Nada foi baixado.

Particularidade do grupo: **PDF para Word, PowerPoint e Excel mostram "Powered by Solid Documents"**
(motor comercial de terceiros, não o mesmo das demais ferramentas) e fazem uma chamada extra
`GET https://api<N>.ilovepdf.com/status.json` antes do upload (verificação de saúde do servidor
de conversão). Isso diz que o motor é proprietário e **não temos como equivalê-lo** com código aberto
em qualidade; a nossa versão será "melhor esforço" e precisa dizer isso.

---

## C1. PDF para JPG — `/pt/pdf_para_jpg`

**Fluxo.** "PDF para JPG" ("Extraia todas as imagens contidas em um arquivo PDF ou converta cada
página em um arquivo JPG.") → 1 ou mais PDFs → painel "Opções de PDF para JPG" → "Converter em JPG"
→ "PDF foi convertido em imagens JPG" + "Baixar as imagens JPG" (um só botão; com várias imagens
é provavelmente ZIP — inferido) + "Continuar para...: Imagem para PDF".

| Opção | Tipo | Padrão | Observações |
|---|---|---|---|
| Modo **PÁGINA PARA JPG** | cartão | **selecionado** | "Todas as páginas desse PDF serão convertidas em um arquivo JPG. 3 O JPG será criado." (contador dinâmico: 3 páginas = 3 JPGs) |
| Modo **EXTRAIR IMAGENS** | cartão | — | "Todas as imagens incorporadas no PDF serão extraídas como imagens JPG." |
| Qualidade da imagem | segmentado, só no modo Página | **Normal (Recomendado)** | Normal / Alta (a resolução em dpi não aparece na tela; **não sei** os números) |

**Mensagem de erro observada (modo Extrair, PDF só de texto):** página `NoImages`, título "Sem
imagens no PDF", frase "iLovePDF não consegue extrair gráficos vetoriais de ficheiros PDF, apenas
imagens. Se suas imagens não forem detetadas verifique se seu PDF tem realmente imagens, e não vetores."
O servidor responde 400 só depois do upload.

**Resultado.** Modo Página, qualidade Alta, 3 páginas → sucesso em ~7 s.

**Motor inferido.** Servidor (tarefa `pdfjpg`; API: `pdfjpg_mode` = `pages` (padrão) ou `extract`).

### Especificação da nossa versão
- **Entradas.** 1 PDF (vários = um ZIP por arquivo; v2). Até 200 páginas por execução.
- **Opções.** Modo: *Páginas* ou *Extrair imagens*. Em *Páginas*: **Resolução** 72 / 150 (padrão) /
  300 dpi; **Qualidade JPEG** 60 / 80 (padrão) / 95; **Formato** JPG (padrão) / PNG (extra nosso);
  **Intervalo de páginas** (padrão: todas; extra nosso, o original só faz tudo).
- **Saída.** Uma imagem: baixar direto `nome-pagina-1.jpg`. Várias: ZIP (`nome-imagens.zip`) com
  nomes `nome-pagina-001.jpg` (zeros à esquerda para ordenar).
- **Casos de borda.** PDF com página muito grande (A0): limitar o lado maior a 8000 px e avisar;
  transparência (fundo branco no JPG); páginas de tamanhos diferentes (cada uma no seu tamanho);
  PDF sem imagens no modo *Extrair* (mensagem como a do original, mas nossa e com o número 0 de
  imagens); imagens duplicadas (extrair uma vez); imagens com máscara (JPG não tem alfa → PNG);
  protegido; 500 páginas (memória: renderizar e comprimir uma por vez, liberar canvas).
- **Casos de teste.** `numeradas-3.pdf` página→JPG 150 dpi → 3 JPGs de 1240×1754 (A4 a 150 dpi),
  legíveis; `com-imagem.pdf` extrair → 1 JPG 320×240 idêntico em dimensões ao original; `numeradas-3.pdf`
  extrair → erro "sem imagens" (igual ao iLovePDF); `misto.pdf` 72 dpi → tamanhos 595×842, 842×595,
  612×792 e 842×595 (rotacionada 90° vira paisagem).
- **Motor recomendado.** Navegador: `pdf.js` renderiza em `canvas` → `toBlob('image/jpeg')`;
  extração com `pdf-lib` (varrer `XObject` de subtipo `Image` com `DCTDecode` e copiar os bytes
  como JPG sem perda; outros filtros precisam decodificar e recodificar). ZIP próprio sem
  dependência (como em `scripts/gerar-amostras.mjs`).
- **Riscos.** Memória de `canvas` (limite de ~16 000 px de lado / 268 Mpx em Safari/iOS), fontes
  não incorporadas (pdf.js usa substitutas), PDFs com transparência complexa; `pdf.js` é **Apache-2.0**.

---

## C2. PDF para Word — `/pt/pdf_para_word`

**Fluxo.** "Converta PDF para WORD" ("... com uma exatidão incrível." **Powered by Solid Documents.")
→ 1 ou mais PDFs → painel "PDF para Word" → "Converter para WORD" → "Seu PDF foi convertido em um
WORD editável" + "Baixe o WORD".

| Opção | Estado | Texto |
|---|---|---|
| **SEM ROC** | padrão, grátis | "Converta PDFs com texto selecionável em arquivos Word editáveis." |
| **ROC** (selo Premium) | exige Premium | "Converta PDFs escaneados sem texto selecionável em arquivos Word editáveis." |

**Detecção de PDF escaneado (comportamento relevante).** Enviei um PDF que é só uma imagem de texto
(modo SEM ROC). O envio terminou (`upload` 200) e **em vez de processar** apareceu um painel: título
"Está a tentar converter um PDF digitalizado", texto "Para extrair conteúdo de documentos
escaneados, é necessário o ROC. Usuários Premium podem converter PDFs escaneados em Word. De outro
modo, o conteúdo do seu documento será convertido como imagem para um ficheiro Word editável." e a
pergunta "Você pretende aplicar o ROC?" com dois botões: **"Continuar sem ROC"** e **"Aplicar ROC"**.
Ou seja: o servidor detecta página sem texto; sem OCR o Word sai com a **imagem** da página.
(Não cliquei em nenhum dos dois: "Aplicar ROC" leva à tela de assinatura.)

**Teste de sucesso.** PDF de 3 páginas só com texto → pronto em ~9 s, sem pergunta de ROC.
Não baixei, então **não sei** a qualidade (fontes, tabelas, colunas).

**Motor inferido.** Servidor, **Solid Documents** (comercial). Tarefa interna parece a mesma de PDF
para PowerPoint/Excel (campo oculto `convert_to` = `xlsx` visto na tela de Excel).

### Especificação da nossa versão
- **Entradas.** 1 PDF (até 50 MB, 100 páginas).
- **Opções.** "Reconhecer texto de imagens (OCR)" (grátis na nossa versão, usando o motor de B3;
  desligado por padrão e **ligado automaticamente** com aviso quando a página não tem texto);
  "Manter layout (caixas de texto)" × "Fluir como documento" (padrão: fluir).
- **Saída.** `nome.docx` com: parágrafos, títulos (por tamanho de fonte relativo), negrito/itálico
  (por nome da fonte), listas simples, imagens inline, quebras de página. **Tabelas só se detectadas
  por alinhamento de células (v2).**
- **Casos de borda.** PDF escaneado (perguntar como o original, mas oferecendo OCR de graça);
  PDF de duas colunas (ordem de leitura); PDF com texto vetorizado (curvas); fontes sem Unicode
  mapeado (letras trocadas ao extrair — acontece muito); PDF protegido; PDF de formulário; PDF
  de apresentação (muito layout, pouco texto).
- **Casos de teste.** `numeradas-3.pdf` → DOCX com 3 seções, e o texto "Pagina 1 de 3" presente
  na primeira; `escaneado.pdf` → pergunta sobre OCR; com OCR → parágrafo contendo "Relatorio de teste
  numero 2026"; sem OCR → DOCX com 1 imagem.
- **Motor recomendado.** **Navegador** para a versão simples (`pdf.js` extrai texto com posição e
  fonte → agrupar em linhas/parágrafos → `docx` (MIT, confirmado) monta o DOCX). **Servidor** só
  se quisermos tabelas e colunas melhores: `pdf2docx` (MIT no arquivo `LICENSE` do repositório
  ArtifexSoftware/pdf2docx) depende do **PyMuPDF, que é AGPL-3.0** (arquivo `COPYING`) →
  obrigaria abrir o código do nosso serviço. LibreOffice importa PDF pelo Draw (MPL-2.0), mas a saída
  em Word é pobre (cada linha vira caixa de texto).
- **Riscos.** A "exatidão incrível" do original é difícil de igualar; **não prometer** fidelidade.
  Expectativa do usuário: texto editável, não layout idêntico — dizer isso.

---

## C3. PDF para PowerPoint — `/pt/pdf_para_powerpoint`

**Fluxo.** "Converta PDF para POWERPOINT" ("Converta seus ficheiros PDF para POWERPOINT." Powered by
Solid Documents) → PDFs → painel "PDF para PowerPoint" **sem opções** → "Converter para PPTX" →
"Seu PDF foi convertido em uma apresentação POWERPOINT editável" + "Baixe o POWERPOINT". Teste:
PDF de 3 páginas só texto, ~10 s, sucesso. Não testei PDF escaneado (provável o mesmo painel de ROC).

**Motor inferido.** Servidor, Solid Documents.

### Especificação da nossa versão
- **Entradas.** 1 PDF (até 50 MB, 100 páginas).
- **Opções.** "Cada página vira um slide como **imagem**" (fiel, não editável; padrão) × "Tentar
  texto editável" (caixas de texto posicionadas por `pdf.js`; experimental).
- **Saída.** `nome.pptx`; slide com o tamanho da página (ex.: A4 → 7560000×10692000 EMU) ou
  16:9 com a página centralizada (opção).
- **Casos de borda.** Páginas de tamanhos diferentes; texto muito pequeno; fontes ausentes (no modo
  texto); 100 páginas → arquivo grande (limitar resolução da imagem a 150 dpi).
- **Casos de teste.** `numeradas-3.pdf` modo imagem → PPTX com 3 slides, cada um com 1 imagem 1240×1754;
  `misto.pdf` → 4 slides de tamanhos diferentes (ou todos no maior, escolher e documentar).
- **Motor recomendado.** Navegador: `pdf.js` renderiza → `pptxgenjs` (MIT, confirmado) ou montagem
  própria de OOXML como em `scripts/gerar-amostras.mjs` (zip próprio, sem dependência).
- **Riscos.** Edição fiel é impossível; o modo imagem pode ficar enorme; PowerPoint reclama de
  OOXML inválido (testar abrindo em PowerPoint e LibreOffice).

---

## C4. PDF para Excel — `/pt/pdf_para_excel`

**Fluxo.** "Converta PDF para EXCEL" ("Converta dados em PDF para folhas de cálculo EXCEL." Powered
by Solid Documents) → PDFs → painel "PDF para Excel" → "Converta para EXCEL" → "Seu PDF foi
convertido em uma folha de cálculo EXCEL editável" + "Baixe o EXCEL".

| Opção | Tipo | Padrão | Valores |
|---|---|---|---|
| SEM ROC / ROC (Premium) | cartões | SEM ROC | igual ao Word |
| "Layout:" | segmentado | **Várias folhas** | Uma folha / Várias folhas |
| (campo oculto `convert_to`) | — | `xlsx` | — |

**Teste.** PDF de 1 página com 4 linhas de "tabela" em fonte monoespaçada alinhada por espaços →
sucesso em ~10 s. **Não sei** se as colunas foram separadas (não baixei).

**Motor inferido.** Servidor, Solid Documents.

### Especificação da nossa versão
- **Entradas.** 1 PDF (até 50 MB, 100 páginas).
- **Opções.** Layout: uma planilha com tudo / uma planilha por página (como o original);
  "Detectar tabelas" (padrão ligado); "Converter números" (reconhecer `1.234,56` e `12,5 %`
  segundo o idioma escolhido).
- **Saída.** `nome.xlsx` (células com texto ou número, sem formatação além de negrito).
- **Algoritmo.** Agrupar itens de texto do `pdf.js` por coordenada Y (linhas) e depois por
  lacunas em X maiores que ~1,5× a largura média do caractere (colunas); alinhar colunas entre linhas
  vizinhas. Funciona bem em tabelas "limpas"; falha em tabelas de células mescladas.
- **Casos de borda.** PDF sem tabela (tudo em 1 coluna); números com separadores diferentes; células
  que quebram em 2 linhas; PDF escaneado (OCR); várias tabelas na mesma página.
- **Casos de teste.** PDF `tabela.pdf` (4 linhas × 3 colunas: Produto/Qtd/Preco; Caneta 3 2.50;
  Caderno 2 12.00; Total 5 29.00; gerado por `H.tabela()` em `scripts/ajuda-navegador.js`) →
  XLSX com 4 linhas e 3 colunas, e as células B2:B4 numéricas.
- **Motor recomendado.** Navegador: `pdf.js` + escrita de XLSX com **SheetJS CE (Apache-2.0)** ou
  **ExcelJS (MIT, confirmado)**.
- **Riscos.** Qualidade irregular; é melhor mostrar uma **prévia da tabela detectada** antes de baixar.

---

## C5. PDF para PDF/A — `/pt/converter-pdf-para-pdfa` (**Premium**)

**Fluxo.** Página com selo "Premium" no título. "PDF para PDF/A" ("Converta documentos PDF para PDF/A
para arquivo e preservação a longo-prazo. Converta para um nível de conformidade específico PDF/A
ISO.") → 1 ou mais PDFs → painel → "Converter para PDF/A".

| Opção | Tipo | Padrão | Valores |
|---|---|---|---|
| Definir o nível de conformidade PDF/A | lista | **PDF/A-2b** | PDF/A-1b, 1a, 2b, 2u, 2a, 3b, 3u, 3a (cada nível mostra texto explicando: "Baseado em um PDF 1.7 (ISO 32000-1). Nível B (básico)…", JPEG 2000, transparência/camadas, fontes OpenType, assinaturas, arquivos incorporados) |
| Permitir redução do Nível de Conformidade PDF/A (`allow_pdfa_downgrade`) | caixa | **marcada** | "Para converter em PDF/A, quando determinados elementos são encontrados no PDF original, é possível que seja necessário reduzir o nível de conformidade…" |

**Bloqueio.** Ao clicar em "Converter para PDF/A" o arquivo é enviado (upload 200) e **abre uma janela
"Atualize para Premium": "A conversão de PDF para PDF/A é uma funcionalidade Premium — Usuários
Premium podem converter em PDF/A"**, com formulário de cadastro (Facebook, Google, SSO, nome,
e-mail, senha). Parei aí: sem conta, sem pagamento. **Não deu para ver a tela de sucesso nem os erros
de não-conformidade** (API pública: código `NonConformant` e a tarefa de validação `validatepdfa`).

**Motor inferido.** Servidor (tarefa `pdfa`; API: `conformance` padrão `pdfa-2b`, `allow_downgrade`
padrão `true`).

### Especificação da nossa versão
- **Entradas.** 1 PDF. **Opções.** Nível (PDF/A-1b, 2b — padrão —, 3b; os "a"/"u" só quando
  houver estrutura/Unicode); "Permitir reduzir o nível".
- **Saída.** PDF/A + **relatório** de conformidade ("Conformidade verificada: sim/não; problemas:
  fontes não incorporadas, transparência, criptografia…").
- **O que PDF/A exige (para o relatório):** fontes todas incorporadas; espaço de cores com perfil ICC
  (sRGB) e `OutputIntent`; metadados XMP com `pdfaid:part`/`conformance`; sem criptografia; sem
  JavaScript, áudio/vídeo ou conteúdo externo; PDF/A-1 sem transparência.
- **Casos de borda.** PDF com fonte padrão não incorporada (Helvetica, como nossos exemplos: precisa
  incorporar uma fonte equivalente); transparência (1b não aceita); criptografado; formulário com JS;
  PDF já PDF/A (devolver como está).
- **Casos de teste.** `numeradas-3.pdf` (usa Helvetica padrão, **não conforme**) → saída com fonte
  incorporada e `pdfaid:part=2`; validar com veraPDF (a ferramenta de validação aberta) → "PASS";
  `protegido-abrir.pdf` → erro "arquivo protegido".
- **Motor recomendado.** **Servidor.** Não há como fazer PDF/A confiável só com `pdf-lib`. Candidatos:
  **Ghostscript** (`-dPDFA=2`; **AGPL-3.0**, confirmado) ou **LibreOffice** na exportação (MPL-2.0),
  validando com **veraPDF** (o arquivo `LICENSE.GPL` do repositório é a GPLv3; o projeto também
  oferece MPLv2 — **só conferi a parte GPL**). Alternativa comercial: PDFTron/Apryse (não avaliado).
- **Riscos.** Licença AGPL do Ghostscript (ver B1); conformidade difícil de garantir; ferramenta
  Premium no concorrente, ou seja, existe valor de mercado — bom candidato a recurso pago ou
  limitado, mas só se tivermos servidor.
