# Grupo A — Organizar (iLovePDF, observado em 2026-10-05)

Tudo aqui vem de uso real da versão em português (`/pt/...`) com arquivos de teste gerados por nós
(ver `scripts/`). Nada foi baixado; nenhum código, texto de marketing ou imagem foi copiado.
Mensagens entre aspas são trechos curtos e funcionais, citados só para o nosso texto de erro poder
dizer a mesma coisa com as nossas palavras.

## Mecanismo comum a todas as ferramentas (vale para os 5 grupos)

| Item | Observado |
|---|---|
| Entrada | Botão "Selecionar arquivo(s) PDF", arrastar e soltar, e seletores Google Drive e Dropbox (ids `gdrive_file_selector`, `dropbox_file_selector`). Sem banner de cookies visível nesta sessão. |
| Miniaturas | Geradas **no navegador** com pdf.js (a página carrega `/js/pdfjs/pdf.min.js` e o worker). O arquivo ainda não saiu do computador nesse ponto. |
| Upload | **Só ao clicar no botão de ação.** Uma chamada `POST https://api<N>.ilovepdf.com/v1/upload` (FormData) por arquivo, depois `POST .../v1/process` (FormData). `N` é o número do servidor sorteado (vimos 17, 63, 78, 93, 94, 95). |
| Processamento | **Sempre no servidor** (API própria `/v1/upload`, `/v1/process`, `/v1/download`). |
| Sucesso | Redireciona para `/pt/download/<token>/<N>`. A tela traz a frase de sucesso, **um** botão de baixar (link direto `https://api<N>.ilovepdf.com/v1/download/<token>`), "Continuar para..." (links `/pt/<ferramenta>?t=<token>&w=<N>` que encadeiam o resultado em outra ferramenta), compartilhar e um texto de privacidade. |
| Retenção | Texto na tela de resultado: arquivos "automaticamente excluídos após 2 horas". FAQ: removidos do servidor depois de no máximo 2 horas; upload por https/SSL. |
| Erro | Redireciona para `/pt/problem/<ferramenta>/<token>/<Codigo>` (ex.: `DamagedFile`, `OutOfRange`). Título "Ocorreu um erro", frase "Oh não! Não conseguimos processar seus ficheiros.", um subtítulo por código, e botão "Voltar a Tentar <ferramenta>". |
| PDF protegido | Upload ok; `process` devolve 400; abre um painel "Alguns ficheiros requerem senha" com um campo por arquivo (rótulo = nome do arquivo), botão "Enviar", link "Esqueceu-se da senha? Desbloquear PDF" e link "Ou Ignorar esses arquivos". Senha errada: nova chamada `process` (400) e o painel permanece. Senha certa (RC4 40 bits, R2, nosso arquivo `protegido-abrir.pdf`): processa normalmente. O campo só reage a eventos reais de entrada. |
| Códigos de erro (API pública) | `FileSuccess`, `FileWaiting`, `WrongPassword`, `TimeOut`, `ServerFileNotFound`, `DamagedFile`, `NoImages`, `OutOfRange`, `NonConformant`, `UnknownError`. |
| Plano gratuito | Pelo texto de preços: arquivo de 15 a 400 MB conforme a ferramenta (Premium 4 GB); lote limitado; bloqueados no gratuito: PDF→Word/Excel com OCR, PDF→PDF/A, Dividir inteligente, IA avançada. Os números exatos por ferramenta não estão publicados; **não testei arquivos grandes** (regra de ser gentil com o serviço). |
| Telemetria | `evt.ilovepdf.com`, Google Analytics, Sentry, anúncios Google (leaderboard). Não relevante para nós; só confirma que a tela de ferramenta é carregada de anúncios. |

Consequência para nós: o iLovePDF é 100 % servidor. Para a nossa versão a regra do portal
("tudo no navegador, arquivo não sai do aparelho") é um **diferencial de privacidade** e funciona
sem custo de servidor para as ferramentas deste grupo.

Técnica de teste usada (para outros agentes): o navegador embutido bloqueia `fetch` para
`127.0.0.1` (`ERR_BLOCKED_BY_CLIENT`), então os arquivos são gerados **dentro da página**
(`scripts/ajuda-navegador.js`), montados num `File` e atribuídos ao `input[type=file]` com um
`DataTransfer` + evento `change`. O `input` demora ~1 s para existir e ignora injeção antes
disso (esperar ~2 s). Rodar a ferramenta = clicar em `#processTask`.

---

## A1. Juntar PDF — `/pt/juntar_pdf`

**Fluxo.** 1) tela inicial "Juntar arquivos PDF"; 2) escolher vários PDFs; 3) lista de miniaturas
com nome; 4) (opcional) reordenar; 5) botão "Juntar PDF"; 6) resultado "Os PDFs foram combinados!".

| Rótulo / controle | Tipo | Padrão | Limites |
|---|---|---|---|
| Arrastar miniaturas | reordenar | ordem de seleção | dica: "Para alterar a ordem dos seus PDFs, arraste e solte os arquivos como entender." |
| Ícone "ordenar" (A–Z) | alternador | desligado | ordena pelo nome do arquivo (testado: `numeradas-3` e `numeradas-2` viraram 2, 3) |
| "+" com contador | adicionar arquivos | — | contador mostra quantos arquivos estão na lista |
| Botão "Juntar PDF" | ação | — | — |

Não há outras opções (sem marcadores, sem intervalo de páginas por arquivo).

**Limites.** Mínimo de 2 arquivos: com 1 só aparece "Por favor, selecione mais arquivos PDF
clicando novamente em 'Selecionar Arquivos PDF'." e "Selecione vários arquivos, mantendo apertado
'Ctrl'", mais o botão "Adicionar mais ficheiros". Máximo de arquivos e tamanho: não testado.

**Mensagens.** Arquivo falso (texto salvo como `.pdf`): entra normalmente na lista (o navegador
não valida) e só falha no servidor com `DamagedFile` — "Esse ficheiro não foi processado porque
estava danificado ou não o conseguimos ler." PDF protegido: ver painel de senha acima; com a
senha certa o resultado sai normal.

**Resultado.** Um PDF único (nome não observado, pois não baixei). "Continuar para...": Comprimir,
Dividir, Inserir números de página, Inserir marca d'água, Rodar, Proteger, Ver mais.

**Motor inferido.** Servidor.

### Especificação da nossa versão
- **Entradas.** 2 a 50 PDFs (limite nosso, ajustável), cada um até 100 MB, soma até 300 MB para
  o navegador não estourar memória. Aceitar também arrastar e soltar. Aceitar só `.pdf` (por tipo
  MIME e por assinatura `%PDF-` nos primeiros bytes — melhor que o iLovePDF, que só descobre no servidor).
- **Opções.** Reordenar por arrastar; botões "subir/descer" para teclado; "Ordenar por nome";
  remover um arquivo da lista. Opcional (nosso extra): "Manter marcadores", marcado por padrão.
- **Saída.** `juntado.pdf` (nome derivado do primeiro arquivo + "-juntado"). Preservar tamanho de
  cada página e rotação. Metadados do primeiro arquivo.
- **Casos de borda.** 1 arquivo (botão desabilitado + aviso); arquivo repetido duas vezes
  (permitir); PDF protegido por senha (pedir senha por arquivo e **não** guardar a senha; se o
  motor do navegador não abrir criptografia, dizer isso e sugerir "Desbloquear PDF"); PDF corrompido
  (apontar **qual** arquivo falhou — o iLovePDF não diz); PDF com 0 páginas; arquivo de 0 bytes;
  arquivo que não é PDF; páginas de tamanhos diferentes (manter cada uma).
- **Casos de teste (com os arquivos de `scripts/`).**
  1. `numeradas-5.pdf` + `numeradas-10.pdf` → 15 páginas, texto "Pagina 1 de 5" na página 1,
     "Pagina 1 de 10" na página 6.
  2. Ordem invertida (10 antes de 5) → página 1 diz "Pagina 1 de 10".
  3. `misto.pdf` + `numeradas-5.pdf` → 4 + 5 = 9 páginas; página 2 é paisagem A4 (841,89 × 595,28).
  4. `falso.pdf` + `numeradas-5.pdf` → erro apontando `falso.pdf`, nada baixado.
  5. `vazio-0-bytes.pdf` → erro "arquivo vazio".
  6. `protegido-abrir.pdf` sem senha → pedido de senha; com `teste123` → 1 página somada.
  7. Um só arquivo → botão desabilitado.
- **Motor recomendado.** Navegador: `pdf-lib` (`copyPages` + `addPage`). Leve, sem servidor.
  Para PDFs criptografados, o pdf-lib original **não abre** (precisa de `ignoreEncryption` e não
  decifra); usar o fork `@cantoo/pdf-lib` (não consegui confirmar a licença na fonte: o arquivo
  `LICENSE.md` do fork respondeu 404; verificar manualmente antes de adotar) ou `qpdf` no servidor.
- **Riscos.** Memória com arquivos grandes (tudo em RAM); formulários e anotações podem se perder
  na cópia entre documentos com `pdf-lib`; marcadores/outline não são copiados por `copyPages`.

---

## A2. Dividir PDF — `/pt/dividir_pdf`

**Fluxo.** Tela inicial "Dividir arquivo PDF" → escolher **um** PDF → painel lateral "Dividir" com 3
abas → botão "Dividir PDF" → "O PDF foi dividido!". A URL ganha âncora conforme a aba
(`#split,range`, `#split,extract`, `#split,filesize`). Com mais de um arquivo de saída o link é
único (provavelmente ZIP; **inferido**, não baixei).

| Aba | Controle | Tipo | Padrão | Limites / observações |
|---|---|---|---|---|
| **Intervalo** | "Modo de intervalo:" Personalizado / Fixo / Inteligente | segmentado | Personalizado | — |
| Personalizado | "Intervalo 1": "a partir da página" (`page_init[]`) e "para" (`page_end[]`) | número | 1 e **total de páginas** | botão "Adicionar Intervalo" cria "Intervalo 2"… ; checkbox "Mesclar todos os intervalos em um arquivo PDF." |
| Fixo | "Divida em intervalos de páginas de:" (`fixed_range`) | número | 1 | texto vivo: "Esse PDF será dividido em arquivos de 1 páginas." e "10 O PDF será criado." (frase com erro de português do original) |
| Inteligente (IA, Premium) | "Categoria do documento:" e "Predefinição de divisão:" | duas listas | vazias | 12 categorias + "Prompt personalizado" (faturas, contratos, extratos bancários, acadêmicos, médicos, RH, seguros, transporte/logística/alfândega, formulários governamentais, lotes digitalizados, marketing, livros). Botão passa a mostrar "100 Dividir PDF" (custo em créditos de IA; **inferência**). |
| **Páginas** | "Modo de extração:" Extrair todas as páginas / Selecionar páginas | segmentado | Extrair todas | texto: "As páginas selecionadas serão convertidas em arquivos PDF separados. 10 O PDF será criado." |
| Selecionar páginas | "Páginas para extrair:" (`extract_pages`) | texto | vazio, dica "exemplo: 1,5-8" | clicar nas miniaturas marca as páginas (check verde); contador "N O PDF será criado." ; checkbox "Mescle as páginas extraídas em um arquivo PDF." |
| **Tamanho** (rótulo PREMIUM) | "Tamanho máximo por arquivo:" (`basesize`) + KB/MB | número + unidade | 3 (KB, para um PDF de 9,51 KB) | mostra "Tamanho do arquivo original: 9.51 KB" e "Total de páginas: 10"; frase "Este PDF será dividido em arquivos menores que 3 KB cada."; checkbox "Permitir compressão" |

**Esta ferramenta contém "Extrair páginas"** (aba Páginas > Selecionar páginas, com "Mescle as
páginas extraídas em um arquivo PDF"). Não existe URL separada no menu (a API pública, porém,
lista a ferramenta `extract` e os modos `ranges`, `fixed_range`, `remove_pages`, `filesize`).

**Observações de comportamento (testadas).**
- Intervalo **invertido** (de 8 para 3): aceito e processado com sucesso ("O PDF foi dividido!") —
  o iLovePDF não reclama; não sei se normalizou para 3–8 (não baixei).
- Campo de páginas só aceita dígitos, vírgula e hífen: digitei `1,15-20,abc` e ficou `1,15-20,`;
  o contador mostrou "1 O PDF será criado" (contou só a página 1 válida). Ao clicar em "Dividir PDF"
  o arquivo foi enviado (upload ok) mas **o processamento não começou e nenhuma mensagem apareceu**
  em 10 s (falha silenciosa para intervalo fora do total / vírgula pendente). Evitar na nossa versão.
- Sem upload até clicar em "Dividir PDF".
- Mensagem de progresso lida no DOM: "Recebendo arquivos de Drive", "Recebendo arquivos de Dropbox",
  "Carregando ficheiro 0 de 0" (barra de upload).

**Resultado.** "O PDF foi dividido!" + "Baixar o PDF dividido".

**Motor inferido.** Servidor.

### Especificação da nossa versão
- **Entradas.** 1 PDF. Total de páginas lido no navegador (pdf-lib `getPageCount`).
- **Opções.** Modo **Por intervalos** (lista de intervalos "de–até", mínimo 1, sem limite de
  quantidade, validando 1 ≤ de ≤ até ≤ total e **mostrando o erro na hora**); Modo **Fixo**
  (N páginas por arquivo, N ≥ 1; último arquivo pode ter menos); Modo **Extrair páginas**
  (texto `1,5-8` ou clicando nas miniaturas; opção "juntar tudo em um PDF" desligada por padrão);
  Modo **Por tamanho** (opcional: limite em KB/MB; divide em lotes de páginas até estourar o
  limite; deixar para depois).
- **Saída.** Um PDF quando só há 1 arquivo; ZIP quando há vários (nomes `arquivo-1-3.pdf`,
  `arquivo-4-5.pdf`). Usar a mesma gravação de ZIP do portal (se já houver) ou escrever um ZIP
  "store" próprio (sem dependência).
- **Casos de borda.** de > até (decisão nossa: corrigir trocando e avisar "intervalo invertido,
  usei 3–8"); página 0; página > total; intervalos que se sobrepõem (permitir; avisar); campo
  vazio; `1,,3`; espaços `1, 5 - 8`; PDF com 1 página; PDF protegido; PDF de 1000 páginas
  (progresso e não travar a interface).
- **Casos de teste.** (`numeradas-10.pdf`)
  1. Intervalos 1–3 e 4–10 → 2 arquivos de 3 e 7 páginas.
  2. Fixo = 4 → arquivos de 4, 4 e 2 páginas.
  3. Extrair `2,4-6` sem juntar → 4 arquivos de 1 página; juntando → 1 arquivo de 4 páginas
     (páginas 2, 4, 5, 6 nessa ordem).
  4. `0-3` e `5-11` → erro de validação antes de processar.
  5. Fixo = 10 → 1 arquivo (igual ao original), com aviso.
  6. `numeradas-5.pdf` com intervalo 8–3 → corrigido para 3–8 fora do total → erro (total é 5).
- **Motor recomendado.** Navegador (pdf-lib). Tamanho-alvo por arquivo exige estimar o tamanho:
  salvar e medir lote a lote (O(n) gravações); ok até algumas centenas de páginas.
- **Riscos.** Recursos compartilhados (fontes e imagens) são copiados inteiros em cada parte,
  então a soma das partes pode ser maior que o original; o limite por tamanho deve avisar.

---

## A3. Remover páginas — `/pt/excluir-paginas-do-pdf`

**Fluxo.** "Remover páginas PDF" ("Selecione e remova as páginas PDF, que você não precisa. Obtenha
um novo arquivo sem suas páginas excluídas.") → 1 PDF → grade de miniaturas "Page 1 … Page N"
(rótulo em inglês, sem tradução) → clicar nas páginas para marcar → botão "Remover páginas" →
"As páginas PDF foram removidas." + "Baixar PDF".

| Controle | Tipo | Padrão | Observações |
|---|---|---|---|
| Miniaturas | clique para marcar | nenhuma | dica: "Clique nas páginas para remover do documento. Você pode usar a tecla "shift" para definir intervalos." |
| "Total de páginas: 10" | informativo | — | — |
| "Páginas para remover:" (`remove_pages`) | texto | vazio, dica `example: 1,5-8` (em inglês) | sincronizado com as miniaturas |

**Erros observados.** Remover **todas** as páginas (`1-10` em PDF de 10): upload ok, `process` 400 e
página de erro `OutOfRange` ("Fora de alcance"): "Esse ficheiro não foi processado porque alguns
dos limites não estão de acordo com o número de páginas." A validação é só no servidor.
Remover `2,4-6`: sucesso, nenhum aviso.

**Resultado.** 1 PDF. "Continuar para": Comprimir, Juntar, Números de página, Marca d'água, Rodar,
Proteger, Organizar páginas, PDF para Word/Excel/PowerPoint.

**Motor inferido.** Servidor (internamente é a tarefa `split` com `remove_pages`).

### Especificação da nossa versão
- **Entradas.** 1 PDF.
- **Opções.** Seleção por clique, por Shift+clique (intervalo), por texto `1,5-8`; botão
  "Selecionar todas as pares/ímpares" (extra nosso, simples); desfazer.
- **Saída.** `arquivo-sem-paginas.pdf`.
- **Casos de borda.** Remover todas (bloquear **antes**: "Deixe pelo menos uma página");
  nenhuma marcada (botão desabilitado); página fora do total; PDF de 1 página; páginas com
  anotações/links para páginas removidas (links ficam quebrados: avisar).
- **Casos de teste.** `numeradas-10.pdf`: remover `2,4-6` → 6 páginas, na ordem 1, 3, 7, 8, 9, 10
  (texto da primeira página "Pagina 1 de 10", da segunda "Pagina 3 de 10"); remover `1-10` →
  bloqueado; remover `11` → erro de validação; remover página 10 → 9 páginas.
- **Motor recomendado.** Navegador (pdf-lib `removePage` de trás para frente). Trivial.
- **Riscos.** `removePage` não apaga objetos órfãos: o arquivo pode continuar grande. Para
  reduzir, copiar as páginas restantes para um documento novo (`copyPages`) em vez de remover.

---

## A4. Extrair páginas

Não é uma ferramenta separada no site: é o modo **Páginas > Selecionar páginas** de Dividir PDF
(ver A2). Resumo do que a "nossa versão" deve ter:
- **Entradas.** 1 PDF. **Opções.** `1,5-8` ou cliques; "juntar em um único arquivo" (desmarcado
  por padrão: cada página vira um PDF; marcado: um PDF com as páginas na **ordem digitada**? —
  não testei se o iLovePDF respeita a ordem digitada ou a ordem do documento; a API só documenta
  o formato `1,5,10-14`). **Decisão nossa:** respeitar a ordem digitada.
- **Saída.** 1 PDF ou ZIP. **Borda.** igual a A2.
- **Teste.** `numeradas-10.pdf`, `8,2-3` com "juntar" → 3 páginas: 8, 2, 3.
- **Motor.** Navegador (pdf-lib). Pode ser uma "aba" da mesma tela de Dividir, ou uma entrada de
  menu própria que reaproveita o mesmo módulo (melhor para busca e SEO).

---

## A5. Organizar PDF — `/pt/organizar-pdf`

**Fluxo.** "Organizar PDF" ("Ordene, adicione e exclua páginas PDF." / "Arraste e solte as
miniaturas de página e organize-as em nosso organizador PDF.") → um ou mais PDFs → grade de
miniaturas com número → painel "Organizar pdf" com "Redefinir tudo" e lista "Arquivos: A:
nome.pdf" (cada arquivo recebe uma letra) → botão "Organizar" → "Essa tarefa foi processada com
sucesso." + "Baixar o arquivo".

| Controle | Onde | Efeito |
|---|---|---|
| Arrastar miniatura | grade | reordena páginas |
| "Zoom" | ao passar o mouse na página | ver página maior |
| "Girar" | ao passar o mouse | gira 90° (uma vez por clique) |
| "Eliminar" | ao passar o mouse | tira a página |
| "Adicionar uma página em branco" | "+" nas bordas esquerda e direita de cada página | insere página `blank` ali (a miniatura mostra "blank") |
| "Ordenar páginas por número" | ícone global | reordena |
| "Adicionar mais ficheiros" | "+" global + "Carregue a partir do seu computador", "Selecionar PDF desde Google Drive", "Selecionar PDF desde Dropbox" | acrescenta páginas de outros PDFs (a letra A, B, C… identifica a origem) |
| "Redefinir tudo" | painel | desfaz tudo |

Teste feito: PDF de 5 páginas; eliminei a 2, girei a nova 2, inseri uma página em branco depois
da 1 → 5 miniaturas (1, 1.., blank, 3, 4, 5…) → sucesso. Mensagem de apoio: "Por favor adicione um
ficheiro para ativar as opções" (aparece antes do upload).

**Limites.** Não testados (número de páginas, de arquivos). Sem aviso de nada nos testes.

**Motor inferido.** Servidor (a tela monta uma lista de instruções por página; o servidor aplica).

### Especificação da nossa versão
- **Entradas.** 1 ou mais PDFs (até 10, 100 páginas cada para a grade ficar leve; páginas
  renderizadas sob demanda com pdf.js em miniaturas de ~160 px).
- **Opções.** Arrastar; selecionar várias (Ctrl/Shift) e mover/girar/eliminar em lote;
  girar 90° nos dois sentidos; inserir em branco (tamanho = página vizinha); duplicar página
  (extra); desfazer/refazer; "Redefinir tudo".
- **Saída.** 1 PDF com a ordem da tela. Rotação gravada como atributo `Rotate` (somando à
  rotação existente, módulo 360).
- **Casos de borda.** Eliminar todas (bloquear); PDF com rotação prévia (miniatura já girada);
  PDFs de tamanhos diferentes; reordenar com teclado (acessibilidade: setas + Alt); 500 páginas
  (renderização preguiçosa); arquivo protegido.
- **Casos de teste.** `numeradas-5.pdf`: eliminar p2, girar p3 em 90°, em branco após p1 → saída com
  5 páginas na ordem [1, branco, 3(girada), 4, 5]; `misto.pdf` + `numeradas-5.pdf` → grade com 4+5
  páginas, letras A e B; mover a última para a primeira → saída começa por "Pagina 5 de 5".
- **Motor recomendado.** Navegador (pdf-lib + pdf.js para miniaturas). A interface é a parte cara.
- **Riscos.** Esforço de interface (arrastar e soltar acessível, desempenho de miniaturas);
  `pdf.js` Apache-2.0 (confirmado em `raw.githubusercontent.com/mozilla/pdf.js/master/LICENSE`);
  `pdf-lib` MIT (arquivo `LICENSE-pdf-lib.txt` do portal e repositório Hopding/pdf-lib).

---

## A6. Digitalizar e transformar em PDF — `/pt/digitalize-pdf`

**Fluxo observado (só a primeira tela; não testei, pois exige celular).** Título "Digitalize e
transforme em PDF"; "Digitalize documentos a partir do smartphone e passe-os para o navegador".
**Passo 1:** "Utilize a câmara do seu smartphone para ler este código QR" (o código é desenhado em
`canvas`). **Passo 2:** estado "Desconectado" (com emoji de telefone desligado) e texto: "Para
digitalizar os seus documentos, por favor siga as instruções visíveis no ecrã do seu dispositivo
móvel e clique em Guardar quando terminar" e "Não feche esta página." Ou seja: pareamento
computador–celular por QR; o celular usa o aplicativo/página do iLovePDF para fotografar e envia ao
navegador aberto no computador. Não vi chamada de rede nova só de abrir (nenhum WebSocket
registrado; o canal de pareamento provavelmente abre depois do QR ser lido).

**Não deu para testar:** exige um celular real lendo o QR, e a regra de não criar conta/instalar.

### Especificação da nossa versão
- **Entradas.** Câmera do próprio aparelho (`getUserMedia`, ou `<input type="file" accept="image/*"
  capture="environment">`, que no celular abre a câmera nativa) **ou** imagens da galeria.
  Sem pareamento por QR na primeira versão: ele exige servidor de retransmissão (WebSocket/WebRTC),
  conta e custo; o aparelho que tem a câmera já pode gerar o PDF sozinho.
- **Opções.** Várias fotos em sequência; reordenar; cortar bordas (retângulo manual na
  primeira versão; detecção automática de bordas só com OpenCV.js — pesado, adiar); girar;
  filtros "Documento" (cinza + contraste), "Colorido", "Preto e branco"; tamanho de página
  (Ajustar à imagem, A4, Carta); margem (nenhuma, pequena, grande).
- **Saída.** 1 PDF com uma imagem por página (reaproveitar o módulo de "JPG para PDF").
- **Casos de borda.** Permissão de câmera negada (mensagem e alternativa de galeria); foto muito
  grande (reduzir lado maior a 2400 px antes de embutir); HEIC no iPhone (o navegador converte
  para JPEG ao usar o seletor nativo; se vier HEIC, avisar); rotação EXIF; falta de memória com
  30 fotos.
- **Casos de teste.** `foto.jpg` + `texto-escaneado.jpg` → PDF de 2 páginas A4 ajustadas;
  imagem de 4000×3000 → página sem distorção (razão 4:3 mantida); cancelar a câmera → volta
  à lista sem perder as anteriores.
- **Motor recomendado.** Navegador (canvas + pdf-lib `embedJpg`). Se um dia quisermos o QR, é
  uma ferramenta nova com servidor.
- **Riscos.** Compatibilidade de `getUserMedia` em páginas sem HTTPS (só `localhost` ou HTTPS);
  privacidade de fotos de documentos (não enviar a lugar nenhum — dizer isso na tela).
