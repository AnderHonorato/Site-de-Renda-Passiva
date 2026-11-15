# Editores e Flower — novembro de 2026

O catálogo tem 356 entradas: 258 ferramentas prontas e 98 planejadas. Este lote torna prontos PDF (F168), vídeo (F189) e áudio (F191), acrescenta DOCX/TXT (F354), PPTX (F355) e XLSX/CSV (F356), e amplia o editor de imagens existente (F184). Os sete editores são gratuitos e processam arquivos no navegador.

## Edição e exportação

| Editor | Operações | Saídas e limites |
| --- | --- | --- |
| PDF | Texto, imagem, retângulo e linha sobre as páginas; mover, redimensionar, remover, desfazer/refazer | PDF; entrada até 20 MB/100 páginas; imagem adicionada até 5 MB/8 MP, soma de imagens até 15 MB |
| Imagens | Corte, tamanho, rotação, espelho, cores; camadas de texto, formas, marca d’água e imagem; histórico | PNG, JPG, WebP; imagem até 30 MB/50 MP; prévia reduzida identificada quando necessário |
| Áudio | Trecho, velocidade, volume, normalização, fades, canais e amostragem; ouvir o resultado | WAV, MP3, OGG, FLAC; entrada até 30 MB; codecs de entrada dependem da decodificação disponível no aparelho |
| Vídeo | Trecho, corte, tamanho, giro, espelho, velocidade, volume, fades e texto; ver o resultado | MP4 (H.264/AAC), WebM (VP8/Vorbis), GIF ou WAV; até 60 MB/3 minutos de trecho |
| Documentos | Texto por parágrafo e formatação básica; TXT simples | DOCX ou TXT; até 20 MB/1.000 parágrafos |
| Apresentações | Texto e formatação básica; ordenar e remover slides | PPTX; até 20 MB/100 slides |
| Planilhas | Valores, fórmulas, formatação básica, abas e novas linhas/colunas ao final | XLSX ou CSV; até 20 MB/5.000 células editáveis |

O PDF preserva o conteúdo original e acrescenta elementos. Para ocultar dados, use a ferramenta específica de rasterização; desenhar um retângulo sobre texto não remove o texto original. Caracteres sem suporte na fonte do editor são recusados com uma mensagem.

A prévia Office é simplificada. O pacote OOXML preserva as partes não alteradas, mas não reproduz todo o layout do Microsoft Office. Fórmulas XLSX são recalculadas ao abrir em um aplicativo compatível. DOC/PPT/XLS antigos, macros, documentos cifrados e edição de gráficos não fazem parte deste lote. CSV guarda valores, sem estilos nem múltiplas abas.

As etapas visuais usam os componentes do portal. A animação acompanha a operação e pode continuar até o tempo mínimo da demonstração; o download fica disponível assim que os bytes reais estiverem prontos. Erros e cancelamentos encerram a execução e mostram uma mensagem legível.

## Motor de mídia

FFmpeg WebAssembly single-thread é carregado da própria origem somente ao exportar mídia. O core tem cerca de 31 MB; a primeira edição precisa carregar esse recurso. Não usa CDN nem envia os arquivos a um serviço de conversão. Cada trabalho tem seu próprio Worker, encerrado ao concluir, cancelar ou exceder o prazo de até 180 segundos. Limites adicionais: 96 MB somados de entrada e 100 MB de saída. Aparelhos com pouca memória podem precisar de trechos menores.

A compilação fixa `@ffmpeg/ffmpeg@0.12.15` e `@ffmpeg/core@0.12.10`, verifica SHA-256 do core e publica avisos e licenças junto aos artefatos. Veja `ferramentas/montar-midias.mjs` e `ferramentas/licencas/`. O core é GPL-2.0-or-later; o wrapper é MIT. Esses artefatos de compilação não entram no Git.

## Flower

O botão flutuante abre um chat com personagem roxo de dois olhos, balanço suave, reação ao responder e olhos animados e movimento que acompanha o ponteiro no painel. Respeita movimento reduzido, teclado, foco e o espaço da navegação inferior no celular.

Sem API, Flower identifica suas respostas como padrão. Ela usa uma base local de perguntas frequentes e informa quando precisa da IA online para responder. Não simula consulta a contas ou arquivos. No GitHub Pages, este é o modo disponível por padrão.

O administrador configura `/admin/flower/` em um servidor Node ativo: provedor, modelo, URL HTTPS quando personalizada, chave e habilitação. Há adaptadores OpenAI Responses, Anthropic, Gemini, Groq, DeepSeek, Mistral, xAI, OpenRouter, Cohere e endpoints compatíveis com OpenAI. O modelo é texto livre; isso não garante compatibilidade com toda API ou todo modelo existente. Trocar de provedor/destino requer uma nova chave.

As chaves ficam cifradas com AES-256-GCM no banco e nunca voltam ao navegador. Não são gravadas em localStorage nem exportadas com as configurações. Configure `PORTAL_IA_CHAVE_MESTRA` com pelo menos 32 caracteres ou preserve o arquivo privado de 32 bytes indicado por `PORTAL_IA_CHAVE_MESTRA_FILE` (padrão: `servidor/.execucao/flower-master.key`, criado com permissão 0600). Faça backup privado da chave mestra junto ao banco: perdê-la exige cadastrar novamente as chaves dos provedores. Não envie credenciais por chat nem as publique no repositório.

O proxy aplica mesma origem/CSRF, limite de 12 mensagens por minuto por visitante/conta, histórico limitado e prazo de 20 segundos. Destinos personalizados exigem HTTPS público, sem redirecionamentos, com verificação de DNS e conexão fixada ao IP validado. Mensagens ao provedor podem gerar custos conforme a conta configurada. Não há API de IA habilitada de fábrica.

## Verificação

Os testes de navegador abrem arquivos, alteram conteúdo e conferem os bytes exportados. Os testes de PDF comparam a renderização de páginas giradas e CropBox deslocado com os elementos da prévia. Os testes de mídia decodificam resultados reais. Os testes Office inspecionam XML, estilos e preservação de partes. Flower usa provedores simulados para verificar payload, permissões, armazenamento e erros; nenhuma chave real foi usada nem foi realizada chamada paga de IA.

Validação desta entrega: 1.838 testes de código, 10 cenários de API e 43 cenários de navegador, incluindo os sete editores, a Flower e regressões de documentos, notificações e ferramentas profissionais. DOCX, PPTX e XLSX exportados também foram reabertos com python-docx, python-pptx e openpyxl; CSV foi relido com separador, BOM e célula multilinha. Não houve teste em aparelho Android físico; a cobertura inclui viewport móvel e redução da janela visual pelo teclado.
