# Documentos digitalizados — 16 de novembro de 2026

Este lote ativa quatro entradas existentes: F155, F157, F179 e F181. O catálogo passa a 356 entradas, sendo 262 prontas e 94 planejadas. As quatro ferramentas são gratuitas e processam arquivos no navegador, inclusive na publicação estática. As ferramentas profissionais pagas mantêm sua exigência de conta, plano e servidor.

| Ferramenta | Entrada e operações | Resultado |
| --- | --- | --- |
| Texto da imagem (OCR) | JPG/PNG/WebP, até 10 MB/20 MP; português, inglês ou espanhol | Texto revisável, copiar e TXT; raster de reconhecimento limitado a 8 MP |
| OCR de PDF | PDF sem senha, até 20 MB/20 páginas; seleção de páginas e idioma | PDF pesquisável, TXT revisável e prévia do PDF exportado |
| Digitalizar e transformar em PDF | Até 20 fotos; 10 MB/20 MP cada, 60 MB somados; ordem, corte retangular manual, giro, contraste, cinza e preto/branco | PDF com fotos tratadas de até 3.000 px no maior lado; A4 ou tamanho da imagem a 150 dpi |
| PDF para Markdown | PDF com texto selecionável, até 20 MB/100 páginas; seleção de páginas | MD e TXT, prévia de títulos/listas/parágrafos sugeridos por heurísticas |

Há amostras visuais animadas com preferência de movimento reduzido, botões para experimentar com arquivos de exemplo reais e execução visual de arquivo pelo componente comum. A animação não bloqueia o download quando os bytes estão prontos. O processamento tem progresso e cancelamento; uma mensagem legível orienta a recuperação em caso de arquivo inválido, tamanho excedido ou falha ao carregar o motor.

## Reconhecimento e fidelidade

O reconhecimento usa Tesseract.js 6.0.1 com core 6.1.2 e modelos LSTM `4.0.0_best_int` por/eng/spa dos pacotes 1.0.0. `ferramentas/montar-ocr.mjs` confere as versões e o SHA-256 dos arquivos e copia os recursos e avisos de licença. Os artefatos gerados não entram no Git; CI e Docker os preparam antes da geração. A política de publicação aceita somente os três caminhos `.traineddata.gz` previstos, mantendo outros arquivos compactados fora do artefato.

O motor é carregado da própria origem somente quando usado. Os documentos não são enviados a serviço externo, e não há chave de IA envolvida. O primeiro uso carrega o core e o idioma; o tempo de reconhecimento varia conforme o aparelho e o documento. Uma sessão de Worker é permitida por página; abortar, fechar a página ou atingir o prazo de 180 segundos por inicialização/página encerra o Worker. Os limites de pixels são aplicados antes do reconhecimento.

O PDF pesquisável rasteriza cada página e acrescenta o texto invisível produzido pelo Tesseract. Mantém as dimensões e orientação visíveis, com limite de resolução; não preserva links, formulários, anexos ou assinaturas digitais. O texto corrigido na tela é usado por copiar/TXT; a camada do PDF conserva o reconhecimento original. OCR pode errar letras, acentos e números; confiança estimada não garante precisão.

O scanner não detecta cantos nem corrige perspectiva. Markdown não reconstrói tabelas, colunas ou imagens; textos de PDFs são escapados para evitar ativar HTML e links e a prévia usa nós DOM seguros. As limitações ficam nas próprias ferramentas.

## Integração e verificação

Flower indica as novas ferramentas e seus limites, e sua contagem passa a vir do catálogo. A vitrine usa os números regenerados. Um post com visual e quatro atalhos integra a página de atualizações; as quatro ativações entram também no sininho.

Os testes exercitam reconhecimento real nos três idiomas, texto extraído do PDF pesquisável, revisão e clipboard/TXT, seleção de páginas e dimensões, ordem/cores/corte de fotos no PDF, orientação EXIF 3/6, cancelamento durante o primeiro carregamento, erros e recuperação. Verificam ainda os modelos no artefato público, exportações MD/TXT, escapes, prévia móvel e movimento reduzido. A cobertura móvel usa Chromium com viewport de 320/390 px; não equivale a teste em aparelho Android físico.
