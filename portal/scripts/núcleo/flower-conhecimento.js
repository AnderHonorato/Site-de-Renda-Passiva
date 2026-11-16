import { ferramentas, ferramentasProntas } from "../../dados/catálogo.js";
/** Base de conhecimento offline da Flower. Responde apenas sobre recursos conferidos do portal. */
const temas = [
  ["pdf", "PDF", "Como trabalhar com PDFs?"],
  ["imagens", "Imagens", "Como editar imagens?"],
  ["audio-video", "Áudio e vídeo", "Como editar áudio ou vídeo?"],
  ["office", "Office", "Como editar documentos e planilhas?"],
  ["calculos", "Cálculos", "Quais cálculos posso fazer?"],
  ["texto-dados", "Texto e dados", "Como limpar ou converter texto e dados?"],
  ["arquivos", "Arquivos", "Como baixar ou enviar arquivos?"],
  ["conta", "Conta e planos", "Como funcionam conta e planos?"],
  ["privacidade", "Privacidade", "O que acontece com meus arquivos e dados?"],
  ["erros", "Erros e suporte", "O que fazer quando uma ferramenta falha?"],
  ["navegacao", "Navegação", "Como encontrar uma ferramenta?"],
  [
    "disponibilidade",
    "Recursos indisponíveis",
    "Quais recursos ainda não estão disponíveis?",
  ],
];
export const topicosFAQ = temas.map(([id, rotulo, pergunta]) => ({
  id,
  rotulo,
  pergunta,
}));

// Cada registro responde a uma intenção concreta. Links são caminhos relativos à raiz do portal.
const itens = [];
function add(topico, id, pergunta, chaves, texto, hrefs = []) {
  itens.push({ topico, id, pergunta, chaves: chaves.map(norm), texto, hrefs });
}
function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\btranscreve\b/gu, "transcrever")
    .replace(/\btranscricao\b/gu, "transcrever")
    .replace(/\b(edita|edite|editando)\b/gu, "editar")
    .replace(/\b(junta|junte|juntando)\b/gu, "juntar")
    .replace(/\b(baixa|baixo|baixe|baixando)\b/gu, "baixar")
    .replace(/\b(pfd|pdfs)\b/gu, "pdf")
    .replace(/\b(edtiar|edtiar)\b/gu, "editar")
    .replace(/\b(imgaem|imajem)\b/gu, "imagem")
    .replace(/\b(planilia|planilhaa)\b/gu, "planilha")
    .split(" ")
    .map((p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p))
    .join(" ");
}
const buscar = "ferramentas.html?busca=";

// PDF
add(
  "pdf",
  "pdf-editar",
  "Como editar um PDF?",
  ["editar pdf", "escrever no pdf", "anotar pdf", "adicionar texto pdf"],
  "Abra Ferramentas e busque “Editar PDF”. Carregue o arquivo, escolha texto, imagem, forma ou desenho, posicione sobre a página e baixe a cópia. A ferramenta acrescenta conteúdo por cima; não altera o texto que já existe no PDF.",
  [buscar + "editar%20pdf"],
);
add(
  "pdf",
  "pdf-juntar",
  "Como juntar PDFs?",
  ["juntar pdf", "unir pdf", "combinar pdf", "mesclar pdf"],
  "Abra “Juntar PDF”, selecione os arquivos, organize a ordem e gere o documento. Confira o resultado antes de compartilhar. Se a ferramenta pedir acesso, veja o selo e o nível da sua conta.",
  ["f/juntar-pdf/"],
);
add(
  "pdf",
  "pdf-dividir",
  "Como dividir um PDF?",
  ["dividir pdf", "separar paginas pdf", "extrair paginas pdf"],
  "Use “Dividir PDF” para criar arquivos menores por intervalo de páginas. Para guardar apenas algumas páginas em um arquivo, use “Extrair páginas do PDF”; informe os números ou intervalos e revise a cópia.",
  ["f/dividir-pdf/", "f/extrair-paginas-do-pdf/"],
);
add(
  "pdf",
  "pdf-remover-paginas",
  "Como remover páginas de um PDF?",
  ["remover paginas pdf", "apagar paginas pdf", "excluir paginas pdf"],
  "Abra “Remover páginas do PDF”, informe os números ou intervalos que devem sair e gere a cópia. Pelo menos uma página precisa permanecer. Confira o resultado; marcadores e campos de formulário podem não ser mantidos.",
  ["f/remover-paginas-do-pdf/"],
);
add(
  "pdf",
  "pdf-rotacionar",
  "Como girar páginas de PDF?",
  ["girar pdf", "rotacionar pdf", "virar pagina pdf"],
  "Na ferramenta “Girar PDF”, carregue o arquivo, escolha as páginas e o sentido de rotação, então baixe a cópia para conferir a orientação.",
  ["f/girar-pdf/"],
);
add(
  "pdf",
  "pdf-assinar",
  "Como assinar PDF?",
  ["assinar pdf", "assinatura pdf"],
  "A ferramenta “Assinar PDF” permite inserir uma assinatura no documento. Abra a ferramenta, carregue o PDF, crie ou posicione a assinatura e baixe o resultado. Revise todas as páginas antes de enviar; a Flower não assina por você.",
  ["f/assinar-pdf/"],
);
add(
  "pdf",
  "pdf-senha",
  "Posso abrir um PDF protegido por senha?",
  ["pdf com senha", "pdf protegido", "senha pdf"],
  "As ferramentas de edição não abrem PDF protegido sem a senha. Abra o documento em um leitor autorizado, informe a senha e gere uma cópia permitida para edição. Não compartilhe a senha aqui.",
  ["ferramentas.html?categoria=pdf"],
);
add(
  "pdf",
  "pdf-texto",
  "Como extrair texto de PDF?",
  ["extrair texto pdf", "copiar texto pdf", "texto de pdf"],
  "Use “Extrair texto de PDF” e carregue um PDF que contenha texto selecionável. Documentos que são apenas fotos ou páginas digitalizadas podem ser reconhecidos em OCR de PDF, com português, inglês ou espanhol.",
  ["f/extrair-texto-de-pdf/"],
);
add(
  "pdf",
  "pdf-ocr",
  "A Flower consegue ler PDF escaneado ou fazer OCR?",
  ["ocr pdf", "pdf escaneado", "ler pdf imagem", "reconhecer texto pdf"],
  "A ferramenta OCR de PDF reconhece páginas escaneadas em português, inglês ou espanhol e gera PDF pesquisável e TXT. Carregue o arquivo na ferramenta; ele será processado no navegador. Revise as letras reconhecidas, sobretudo em fotos escuras, tortas ou manuscritas. Eu posso orientar os passos, mas não leio seus arquivos no chat.",
  ["f/ocr-pdf/", "f/ocr-de-imagem/"],
);
add(
  "pdf",
  "pdf-comparar",
  "Como comparar dois PDFs?",
  ["comparar pdf", "diferenças pdf", "diff pdf"],
  "Abra “Comparar PDF” e selecione os dois documentos. A comparação considera o texto que pode ser extraído; diferenças de imagem, layout ou páginas escaneadas podem não aparecer. Revise o resultado visualmente.",
  ["f/comparar-pdf/"],
);
add(
  "pdf",
  "pdf-ocultar",
  "Como ocultar dados sensíveis em PDF?",
  ["ocultar informacoes pdf", "tarjar pdf", "redigir pdf", "remover dado pdf"],
  "Use “Ocultar informações do PDF” para cobrir a região sensível e gere uma nova cópia. Depois reabra e confira se o conteúdo realmente deixou de estar acessível, antes de compartilhar. Evite enviar dados privados no chat.",
  ["f/ocultar-informacoes-do-pdf/"],
);
add(
  "pdf",
  "pdf-imagem",
  "Como converter PDF em imagem ou imagem em PDF?",
  [
    "pdf para jpg",
    "pdf para imagem",
    "jpg para pdf",
    "imagem para pdf",
    "converter pdf imagem",
  ],
  "Para exportar páginas como JPG, use “PDF para JPG”. Para montar um PDF a partir de imagens, use “JPG para PDF”. Selecione os arquivos, ajuste as opções disponíveis e baixe e revise a saída.",
  ["f/pdf-para-jpg/", "f/jpg-para-pdf/"],
);
add(
  "pdf",
  "pdf-paginas",
  "Como numerar páginas ou colocar marca d’água?",
  [
    "numerar paginas pdf",
    "numero de pagina pdf",
    "marca dagua pdf",
    "marca d agua pdf",
  ],
  "O catálogo oferece “Números de página no PDF” e “Marca d’água no PDF”. Abra a ferramenta adequada, carregue o documento, configure a posição e aparência e baixe uma cópia para revisão.",
  ["f/numerar-paginas-do-pdf/", "f/marca-dagua-no-pdf/"],
);
add(
  "pdf",
  "pdf-formulario",
  "Como preencher um formulário PDF?",
  ["preencher formulario pdf", "formulario pdf", "campo pdf"],
  "Abra “Preencher formulário PDF”, carregue o documento e preencha os campos interativos disponíveis. Baixe e confira a cópia; PDFs sem campos preenchíveis podem exigir a ferramenta de edição para acrescentar texto por cima.",
  ["f/preencher-formulario-pdf/", "ferramentas.html?busca=editar%20pdf"],
);
add(
  "pdf",
  "pdf-baixar",
  "Como baixar um PDF editado?",
  ["baixar pdf", "baixar resultado pdf", "salvar pdf pronto", "exportar pdf"],
  "Quando a ferramenta terminar, use seu botão de baixar ou exportar para salvar uma cópia no aparelho. Abra o arquivo baixado e confira as páginas antes de compartilhar. A Flower não baixa arquivos por você.",
  ["ferramentas.html?categoria=pdf"],
);

// Imagens
add(
  "imagens",
  "imagem-editar",
  "Como editar uma imagem?",
  ["editar imagem", "editar foto", "ajustar imagem", "melhorar foto"],
  "No “Editor de fotos”, abra a imagem e use os controles para girar, espelhar, cortar, redimensionar ou ajustar brilho, contraste e cores. A edição ocorre no navegador e o original fica intacto. Exporte a cópia quando terminar.",
  ["f/editor-de-fotos/"],
);
add(
  "imagens",
  "imagem-cortar",
  "Como cortar ou redimensionar uma foto?",
  [
    "cortar imagem",
    "recortar foto",
    "redimensionar imagem",
    "mudar tamanho foto",
  ],
  "Abra o Editor de fotos, carregue a imagem, escolha corte ou dimensões e aplique. Confira proporção e qualidade antes de baixar.",
  ["f/editor-de-fotos/"],
);
add(
  "imagens",
  "imagem-formato",
  "Como converter imagem para PDF ou criar GIF?",
  ["imagem para pdf", "jpg para pdf", "criar gif", "fazer gif", "gif animado"],
  "Para reunir imagens num documento, use JPG para PDF. Para criar um GIF com movimento, use Criar GIF e forneça as imagens na sequência desejada. Baixe o resultado e teste em um visualizador compatível.",
  ["f/jpg-para-pdf/", "f/criar-gif/"],
);
add(
  "imagens",
  "imagem-ocr",
  "Tem OCR para copiar texto de uma foto?",
  ["ocr imagem", "texto da imagem", "copiar texto foto", "ler imagem"],
  "Sim. Abra Texto da imagem (OCR), escolha uma foto JPG, PNG ou WebP e selecione português, inglês ou espanhol. O reconhecimento acontece no navegador. Você pode revisar, copiar e baixar o texto em TXT. Use uma foto nítida e com as linhas retas; a ferramenta não garante leitura de manuscritos.",
  ["f/ocr-de-imagem/", "f/ocr-pdf/"],
);
add(
  "imagens",
  "imagem-original",
  "O editor altera o arquivo original?",
  ["original imagem", "arquivo original foto", "perco a imagem"],
  "A edição no Editor de fotos ocorre no navegador e o original permanece intacto. Baixe a versão exportada quando terminar; ela será um arquivo separado.",
  ["f/editor-de-fotos/"],
);
add(
  "imagens",
  "imagem-formatos",
  "Quais formatos de imagem posso usar?",
  ["formatos imagem", "png jpg imagem", "arquivo imagem compativel"],
  "Os formatos aceitos podem variar conforme a ferramenta e o navegador. Consulte as instruções na própria página e teste com uma cópia comum, como JPG ou PNG. Não consigo verificar o formato do seu arquivo sem que você o examine na ferramenta.",
  ["f/editor-de-fotos/"],
);

// Áudio e vídeo
add(
  "audio-video",
  "audio-editar",
  "Como editar áudio?",
  ["editar audio", "cortar audio", "ajustar audio", "mudar audio"],
  "No Editor de áudio, carregue a faixa e ajuste trechos, volume, fades, velocidade ou canais. Escolha a exportação disponível (WAV, MP3, OGG ou FLAC) e escute o arquivo gerado. O processamento é feito no aparelho; o primeiro uso pode baixar o motor de áudio.",
  [buscar + "editor%20de%20%C3%A1udio"],
);
add(
  "audio-video",
  "audio-converter",
  "Como converter áudio para MP3 ou WAV?",
  [
    "converter audio",
    "audio para mp3",
    "audio para wav",
    "mudar formato audio",
  ],
  "Use o Editor de áudio, carregue a faixa e selecione o formato de exportação disponível, como WAV, MP3, OGG ou FLAC. Confira duração e som no arquivo baixado.",
  [buscar + "editor%20de%20%C3%A1udio"],
);
add(
  "audio-video",
  "audio-upload",
  "Por que o editor de áudio demora na primeira vez?",
  ["audio demora", "motor de audio", "carregando audio"],
  "No primeiro uso, a página pode carregar o motor de áudio necessário para processar localmente. Mantenha a página aberta e uma conexão disponível durante esse carregamento. Se continuar falhando, atualize e tente novamente.",
  [buscar + "editor%20de%20%C3%A1udio"],
);
add(
  "audio-video",
  "video-editar",
  "Como editar um vídeo?",
  ["editar video", "cortar video", "converter video", "ajustar video"],
  "O Editor de vídeo permite recortar trechos, ajustar velocidade, tamanho e som, adicionar texto e exportar MP4, WebM, GIF ou WAV. Abra a ferramenta, carregue o vídeo, aplique os ajustes e reproduza o resultado no editor antes de baixar.",
  [buscar + "editor%20de%20v%C3%ADdeo"],
);
add(
  "audio-video",
  "video-extrair-audio",
  "Como extrair o áudio de um vídeo?",
  ["extrair audio video", "video para wav", "tirar som video"],
  "No Editor de vídeo, carregue o clipe e escolha a exportação de áudio WAV, se disponível para a tarefa. Reproduza ou abra o arquivo exportado para confirmar o resultado.",
  [buscar + "editor%20de%20v%C3%ADdeo"],
);
add(
  "audio-video",
  "video-formato",
  "Quais formatos o editor de vídeo exporta?",
  ["formatos video", "mp4 webm gif wav", "exportar video"],
  "O Editor de vídeo oferece exportação em MP4, WebM, GIF ou WAV. A opção depende do conteúdo e dos recursos disponíveis no navegador. Confira a lista apresentada antes de exportar.",
  [buscar + "editor%20de%20v%C3%ADdeo"],
);
add(
  "audio-video",
  "video-transcricao",
  "O portal transcreve áudio ou vídeo?",
  [
    "transcrever audio",
    "transcrever video",
    "legenda automatica",
    "fala para texto",
  ],
  "Não encontrei uma ferramenta pronta de transcrição automática no catálogo confirmado. O texto para fala existe, mas faz a tarefa inversa. Não consigo ouvir seu arquivo nem produzir uma transcrição aqui.",
  ["f/texto-para-fala/"],
);

// Office
add(
  "office",
  "office-docx",
  "Como editar um DOCX?",
  ["editar docx", "editar word", "documento word", "arquivo docx"],
  "O Editor de documentos abre DOCX ou TXT e permite revisar parágrafos. Carregue o arquivo, edite o texto e baixe uma cópia. A prévia simplifica a paginação; DOC antigo, arquivos com senha e macros não são suportados.",
  [buscar + "editor%20de%20documentos"],
);
add(
  "office",
  "office-docx-formato",
  "O editor mantém a formatação do Word?",
  ["formatacao word", "layout docx", "pagina docx", "docx formatacao"],
  "A prévia do Editor de documentos simplifica a paginação, portanto o layout pode não ficar idêntico ao Word. Revise o arquivo exportado no aplicativo de destino antes de enviar ou imprimir.",
  [buscar + "editor%20de%20documentos"],
);
add(
  "office",
  "office-pptx",
  "Como revisar um PowerPoint?",
  ["editar pptx", "editar powerpoint", "revisar apresentacao", "slides pptx"],
  "O Editor de apresentações revisa textos em PPTX e mantém as outras partes do arquivo. A prévia não reproduz animações nem o layout exato do PowerPoint; arquivos PPT antigos não são suportados. Revise o resultado no PowerPoint ou compatível.",
  [buscar + "editor%20de%20apresenta%C3%A7%C3%B5es"],
);
add(
  "office",
  "office-xlsx",
  "Como editar uma planilha XLSX ou CSV?",
  ["editar xlsx", "editar csv", "editar excel", "alterar planilha"],
  "O Editor de planilhas permite editar células em XLSX ou CSV no navegador. Faça as alterações, confira os dados e exporte uma cópia. Macros não são suportadas.",
  [buscar + "editor%20de%20planilhas"],
);
add(
  "office",
  "office-formulas",
  "As fórmulas da planilha são recalculadas?",
  ["formula planilha", "recalcular excel", "formula xlsx"],
  "As fórmulas são gravadas no arquivo, mas não são recalculadas pelo editor. Abra a cópia em um programa de planilhas para recalcular e conferir os valores.",
  [buscar + "editor%20de%20planilhas"],
);
add(
  "office",
  "office-compat",
  "Posso editar DOC, PPT ou arquivos com macros?",
  [
    "doc antigo",
    "ppt antigo",
    "arquivo com macros",
    "macro excel",
    "arquivo protegido office",
  ],
  "Os editores confirmados não suportam DOC ou PPT antigos, arquivos Office protegidos por senha nem macros. Converta uma cópia para DOCX, PPTX, XLSX ou CSV em um programa compatível e revise antes de usar.",
  [buscar + "editor"],
);

// Cálculos e ferramentas do catálogo
add(
  "calculos",
  "calculo-encontrar",
  "Que calculadora devo usar?",
  ["qual calculadora", "calculadora para", "fazer calculo"],
  "O portal tem calculadoras de porcentagem, juros, parcelamento, datas e horas, IMC, tinta, churrasco, preço por unidade e outras tarefas. Diga o que quer calcular ou pesquise uma palavra na página Ferramentas.",
  ["ferramentas.html?categoria=c%C3%A1lculo"],
);
add(
  "calculos",
  "calculo-porcentagem",
  "Como calcular porcentagem?",
  ["calcular porcentagem", "porcentagem de um valor", "desconto percentual"],
  "Abra a Calculadora de porcentagem, informe os valores solicitados e confira a operação selecionada (porcentagem de um total, variação ou outra opção da página). O resultado depende dos dados inseridos.",
  ["f/porcentagem/"],
);
add(
  "calculos",
  "calculo-juros",
  "Como calcular juros ou parcelas?",
  ["calcular juros", "juros compostos", "calcular parcela", "parcelamento"],
  "Para simular juros, use Juros; para estimar pagamentos parcelados, use Parcelamento. Informe taxa, prazo e valores conforme os campos, confira se a taxa e o período usam a mesma unidade e trate o resultado como estimativa.",
  ["f/juros/", "f/parcelamento/"],
);
add(
  "calculos",
  "calculo-datas",
  "Como calcular diferença entre datas ou horas?",
  ["diferenca datas", "somar dias data", "calcular horas", "diferenca horas"],
  "Use Calculadora de datas para contar ou somar dias e Calculadora de horas para duração e horários. Confira formato de data, virada de dia e se o intervalo inclui o começo ou o fim conforme a sua necessidade.",
  ["f/calculadora-de-datas/", "f/calculadora-de-horas/"],
);
add(
  "calculos",
  "calculo-unidades",
  "Como converter unidades?",
  ["converter unidades", "conversor de medidas", "transformar unidade"],
  "Abra Conversor de unidades, escolha as unidades de origem e destino, informe o valor e confira a unidade mostrada no resultado. Para uma medida específica, diga qual conversão procura.",
  ["f/conversor-de-unidades/"],
);
add(
  "calculos",
  "calculo-reforma",
  "Como estimar tinta, parede ou rejunte?",
  ["calcular tinta", "area parede", "quantidade rejunte", "calcular reforma"],
  "Há ferramentas para calcular tinta, área de paredes e quantidade de rejunte. Meça as superfícies e informe as dimensões e o rendimento indicados na embalagem; portas, janelas e perdas podem exigir ajuste manual.",
  ["f/calculadora-de-tinta/", "f/area-de-paredes/", "f/area-de-rejunte/"],
);
add(
  "calculos",
  "calculo-festa",
  "Como calcular comida para churrasco ou dividir uma conta?",
  [
    "quantidade churrasco",
    "calcular churrasco",
    "dividir conta",
    "ratear conta",
  ],
  "Use Calculadora de churrasco para estimar quantidades a partir dos convidados e Divisão de contas para repartir valores. Confira as premissas e ajuste por duração, perfil do grupo e itens já disponíveis.",
  ["f/calculadora-de-churrasco/", "f/divisao-de-contas/"],
);
add(
  "calculos",
  "calculo-negocio",
  "Há calculadoras de preço e negócio?",
  [
    "preco de venda",
    "margem lucro",
    "ponto equilibrio",
    "comissao calcular",
    "custo receita",
    "valor hora",
  ],
  "O catálogo inclui Preço de venda, Margem de contribuição, Ponto de equilíbrio, Custo de receita, Comissão e Valor da hora. Cada ferramenta pede entradas próprias; valide impostos e custos usados com seus registros.",
  [
    "f/preco-de-venda/",
    "f/margem-de-contribuicao/",
    "f/ponto-de-equilibrio/",
    "f/custo-de-receita/",
    "f/comissao/",
    "f/valor-da-hora/",
  ],
);
add(
  "calculos",
  "calculo-financiamento",
  "Como simular financiamento?",
  ["simular financiamento", "financiamento parcela", "emprestimo simulacao"],
  "Use o Simulador de financiamento e informe valor, taxa e prazo nos campos. A simulação não é proposta de crédito: confirme taxas, tarifas e condições diretamente com a instituição.",
  ["f/simulador-de-financiamento/"],
);

// Texto e dados
add(
  "texto-dados",
  "texto-contar",
  "Como contar caracteres ou palavras?",
  [
    "contar caracteres",
    "contar palavras",
    "contador de texto",
    "quantas palavras",
  ],
  "Cole ou digite o texto no Contador de texto para ver as contagens disponíveis. Evite colar conteúdo confidencial no chat; use diretamente a ferramenta.",
  ["f/contador-de-texto/"],
);
add(
  "texto-dados",
  "texto-limpar",
  "Como limpar espaços ou formatar texto?",
  ["limpar texto", "remover espacos texto", "formatar texto", "limpador texto"],
  "Use Limpador de texto para normalizar problemas comuns de espaço e formatação. Revise o texto transformado antes de substituir o original.",
  ["f/limpador-de-texto/"],
);
add(
  "texto-dados",
  "texto-duplicadas",
  "Como remover linhas duplicadas?",
  ["linhas duplicadas", "remover duplicadas texto", "deduplicar linhas"],
  "Abra Remover linhas duplicadas de texto, cole o conteúdo e escolha se maiúsculas e minúsculas devem contar como diferentes. Confira quantas linhas saíram e revise a ordem do resultado.",
  ["f/remover-linhas-duplicadas-de-texto/"],
);
add(
  "texto-dados",
  "texto-acentos",
  "Como remover acentos de um texto?",
  ["remover acentos", "tirar acentos", "sem acento texto"],
  "Use Removedor de acentos, cole o texto e copie ou baixe a versão convertida. Confira nomes próprios e termos em que os acentos são importantes.",
  ["f/removedor-de-acentos/"],
);
add(
  "texto-dados",
  "dados-csv-json",
  "Como converter CSV e JSON?",
  ["converter csv json", "csv para json", "json para csv", "csv json"],
  "Abra CSV e JSON, forneça os dados e selecione a conversão desejada. CSV pode depender do separador e dos cabeçalhos; confira caracteres especiais e valores antes de reutilizar o arquivo.",
  ["f/csv-e-json/"],
);
add(
  "texto-dados",
  "dados-json",
  "Como validar ou formatar JSON?",
  ["validar json", "formatar json", "json invalido"],
  "Use a ferramenta JSON para formatar ou validar a estrutura. Se aparecer erro, verifique aspas duplas, vírgulas, colchetes e chaves. Não inclua chaves de API ou dados privados em mensagens para a Flower.",
  ["f/json/"],
);
add(
  "texto-dados",
  "texto-voz",
  "O portal transforma texto em fala?",
  ["texto para fala", "ler texto em voz", "gerar fala"],
  "Sim, existe a ferramenta Texto para fala. Digite o texto, escolha as opções oferecidas e use a reprodução de voz disponível no aparelho. Não afirmo que ela exporte áudio. Não é a mesma coisa que transcrever áudio.",
  ["f/texto-para-fala/"],
);
add(
  "texto-dados",
  "dados-planilha",
  "Como limpar uma planilha?",
  ["limpar planilha", "remover linhas vazias planilha", "duplicatas planilha"],
  "Abra Limpar planilha, carregue o arquivo aceito e marque as ações apresentadas. Baixe a cópia e confira contagens, cabeçalhos e fórmulas antes de substituir qualquer original.",
  ["f/limpar-planilha/"],
);

// Arquivos, navegação, conta, privacidade e falhas
add(
  "arquivos",
  "arquivo-download",
  "Como baixar o resultado?",
  ["baixar resultado", "download arquivo", "salvar resultado"],
  "Depois de concluir o processamento, use o botão de download ou exportação exibido na ferramenta. Escolha uma pasta local e abra o arquivo baixado para conferir se está completo. A Flower não consegue baixar arquivos por você.",
  ["ferramentas.html"],
);
add(
  "arquivos",
  "arquivo-upload",
  "Como enviar ou carregar um arquivo?",
  [
    "carregar arquivo",
    "enviar arquivo",
    "upload arquivo",
    "selecionar arquivo",
  ],
  "Abra a ferramenta desejada e use o controle para selecionar o arquivo no aparelho; algumas páginas também aceitam arrastar e soltar. Confira limites e formatos listados na própria página. Não envie o arquivo para o chat.",
  ["ferramentas.html"],
);
add(
  "arquivos",
  "arquivo-perdido",
  "O arquivo original será apagado?",
  ["apaga original", "perder arquivo", "arquivo original apagado"],
  "Em várias ferramentas, o resultado é uma cópia baixada e o original permanece no aparelho; o comportamento específico aparece nas instruções da ferramenta. Guarde o original até revisar a saída. Eu não consigo inspecionar nem recuperar arquivos.",
  ["ferramentas.html"],
);
add(
  "arquivos",
  "arquivo-tamanho",
  "Qual é o limite de tamanho do arquivo?",
  ["limite tamanho arquivo", "arquivo muito grande", "limite mb"],
  "Os limites variam conforme a ferramenta e são informados na página da ferramenta. Reduzir ou dividir uma cópia pode ajudar; não assumo um limite único para todo o portal.",
  ["ferramentas.html"],
);
add(
  "conta",
  "conta-criar",
  "Como criar uma conta ou entrar?",
  ["criar conta", "fazer login", "entrar conta", "cadastro portal"],
  "Use Conta para entrar ou criar cadastro. Se já tem conta, informe os dados na tela de entrada; se esqueceu a senha, escolha a opção de recuperação. Não compartilhe a senha no chat.",
  ["entrar.html", "criar-conta.html"],
);
add(
  "conta",
  "conta-senha",
  "Esqueci minha senha. Como recuperar?",
  ["esqueci senha", "recuperar senha", "redefinir senha"],
  "Na página de entrada, escolha “Esqueci a senha” ou abra Recuperar senha e siga as instruções enviadas ao contato da conta. A Flower não vê nem altera sua senha.",
  ["recuperar-senha.html"],
);
add(
  "conta",
  "conta-favoritos",
  "Como salvar favoritos?",
  ["salvar favoritos", "marcar ferramenta favorita", "favoritos"],
  "Os favoritos ficam primeiro neste aparelho. Ao entrar, o portal tenta sincronizá-los com a conta; o limite depende do plano, e itens excedentes permanecem neste aparelho. Use o controle de favorito na ferramenta.",
  ["salvos.html"],
);
add(
  "conta",
  "conta-trabalhos",
  "Como salvar ou encontrar um trabalho?",
  ["salvar trabalho", "trabalhos salvos", "continuar trabalho"],
  "Só ferramentas compatíveis oferecem salvar um trabalho. Quando a conta e o servidor estão disponíveis, os trabalhos salvos aparecem na área Trabalhos da conta. Verifique se a ferramenta mostra a opção antes de contar com o salvamento.",
  ["conta/trabalhos.html"],
);
add(
  "conta",
  "conta-planos",
  "Quais são os planos e preços?",
  [
    "preco plano",
    "quanto custa",
    "planos portal",
    "plus premium",
    "gratuito pago",
  ],
  "Há ferramentas públicas gratuitas e outras com selo Plus ou Premium. Consulte Planos e o selo da própria ferramenta para ver preços, acesso e limites atuais; esses dados podem mudar. Não há cobrança automática só por usar uma ferramenta pública.",
  ["planos.html", "niveis.html"],
);
add(
  "conta",
  "conta-acesso",
  "Por que uma ferramenta pede Plus ou Premium?",
  [
    "pede plus",
    "pede premium",
    "ferramenta bloqueada plano",
    "nivel de acesso",
  ],
  "O selo da ferramenta indica o nível de acesso. Consulte Planos para ver as condições atuais e entre na conta correspondente. O catálogo pode incluir ideias ainda indisponíveis; confira se existe botão de abrir/usar e indicação de pronta.",
  ["planos.html", "ferramentas.html"],
);
add(
  "privacidade",
  "privacidade-arquivo",
  "Meus arquivos são enviados ao servidor?",
  [
    "arquivo enviado servidor",
    "privacidade arquivo",
    "arquivo fica online",
    "dados do arquivo",
  ],
  "Isso depende da ferramenta. Por exemplo, Remover páginas do PDF monta a cópia no navegador; outras funções podem usar servidor. Leia a seção de privacidade e limites da própria ferramenta. Não consigo inspecionar seu arquivo nem garantir o comportamento de uma ferramenta sem essa informação.",
  ["privacidade.html", "ferramentas.html"],
);
add(
  "privacidade",
  "privacidade-conta",
  "A Flower pode ver meus dados ou arquivos?",
  [
    "ler meu arquivo",
    "ver meus dados",
    "consultar minha conta",
    "acessar meu perfil",
    "analise meu pdf",
  ],
  "Não. A Flower não acessa sua conta, não abre arquivos e não consulta dados privados. Posso explicar recursos gerais. Evite colar senhas, documentos ou dados pessoais no chat.",
  ["privacidade.html"],
);
add(
  "privacidade",
  "privacidade-cookies",
  "Como o portal trata privacidade e cookies?",
  ["privacidade portal", "cookies portal", "dados pessoais portal"],
  "Consulte as páginas Privacidade e Cookies para conhecer o tratamento de dados e as preferências disponíveis. Não envie senhas, chaves ou dados pessoais no chat.",
  ["privacidade.html", "cookies.html"],
);
add(
  "erros",
  "erro-carregamento",
  "A ferramenta não carrega. O que faço?",
  ["ferramenta nao carrega", "pagina travou", "erro carregamento"],
  "Confira sua conexão e tente atualizar a página. Se persistir, tente outro navegador atualizado, desative extensões que bloqueiem scripts para esse site e veja se a página informa manutenção ou limite. Anote o nome da ferramenta e a mensagem de erro para pedir suporte.",
  ["ajuda.html"],
);
add(
  "erros",
  "erro-processamento",
  "O processamento falhou ou deu resultado estranho.",
  [
    "processamento falhou",
    "resultado errado ferramenta",
    "erro ao processar",
    "arquivo nao funciona",
  ],
  "Leia os limites e formatos aceitos na ferramenta, confirme que o arquivo abre normalmente e tente com uma cópia menor. Preserve o original. Se falhar de novo, registre ferramenta, navegador e mensagem de erro e use Ajuda; não cole conteúdo sensível no chat.",
  ["ajuda.html"],
);
add(
  "erros",
  "erro-download",
  "O botão de download não funciona.",
  ["download nao funciona", "nao baixa arquivo", "botao baixar falhou"],
  "Confirme se o processamento terminou, se o navegador não bloqueou o download e se há espaço no aparelho. Tente novamente e verifique a pasta de downloads. A Flower não consegue localizar o arquivo no seu aparelho.",
  ["ajuda.html"],
);
add(
  "erros",
  "erro-suporte",
  "Como pedir ajuda sobre uma ferramenta?",
  [
    "falar suporte",
    "contatar suporte",
    "reportar problema",
    "ajuda ferramenta",
  ],
  "Abra Ajuda e descreva o nome da ferramenta, o que tentou fazer, o navegador e a mensagem de erro. Remova senhas, dados pessoais e conteúdo confidencial dos detalhes enviados.",
  ["ajuda.html"],
);
add(
  "navegacao",
  "nav-busca",
  "Como encontrar uma ferramenta?",
  [
    "encontrar ferramenta",
    "buscar ferramenta",
    "onde fica ferramenta",
    "como encontro",
  ],
  "Abra Ferramentas e pesquise pelo nome ou pela tarefa (por exemplo “juntar PDF”). Você também pode filtrar pelas categorias. Os selos e a ficha explicam acesso, instruções e limites.",
  ["ferramentas.html"],
);
add(
  "navegacao",
  "nav-categorias",
  "Como navegar pelas categorias?",
  ["categorias ferramentas", "filtrar ferramentas", "categoria pdf"],
  "Na página Ferramentas, use os filtros de categoria — como PDF, Texto, Imagens, Planilhas e cálculo — ou o campo de busca. A URL pode guardar o filtro aplicado para facilitar voltar à lista.",
  ["ferramentas.html"],
);
add(
  "navegacao",
  "nav-pronta",
  "Como saber se uma ferramenta está pronta?",
  ["ferramenta pronta", "planejada catalogo", "ferramenta existe"],
  "O catálogo pode mostrar ferramentas planejadas além das prontas. Abra a ficha e confira se há ação para usar e quais são os limites; a página informa o estado e o nível de acesso. Se estiver marcada como planejada, ainda não pode ser usada.",
  ["ferramentas.html"],
);
add(
  "navegacao",
  "nav-idioma",
  "O portal está disponível em inglês?",
  ["idioma ingles", "english portal", "mudar idioma"],
  "O portal mantém páginas em português e uma área em inglês para parte do conteúdo. Procure o seletor de idioma no cabeçalho; nem todas as ferramentas ou textos podem estar traduzidos.",
  ["en/index.html"],
);
add(
  "disponibilidade",
  "indisponivel-ia",
  "A IA da Flower está online?",
  [
    "ia online",
    "inteligencia artificial responde",
    "flower offline",
    "resposta padrao",
  ],
  "Quando a IA online não está configurada ou o servidor não responde, uso respostas padrão curadas para dúvidas frequentes. Não consulto serviços externos por conta própria e, fora da base, posso não saber responder.",
  ["ajuda.html"],
);
add(
  "disponibilidade",
  "indisponivel-ferramenta",
  "Tem OCR, transcrição ou geração de IA?",
  ["ocr ferramenta", "transcricao automatica", "gerar imagem ia", "ia local"],
  "O portal tem OCR de imagem e OCR de PDF em português, inglês e espanhol, com processamento no navegador. Abra a ferramenta correspondente para carregar seu arquivo e revisar o texto. Transcrição automática de áudio e geração de imagens por IA ainda não estão prontas.",
  ["f/ocr-de-imagem/", "f/ocr-pdf/"],
);
add(
  "disponibilidade",
  "indisponivel-numeros",
  "Quantas ferramentas estão prontas?",
  [
    "quantas ferramentas prontas",
    "quantas ferramentas existem",
    "numero ferramentas prontas",
    "quantidade catalogo",
  ],
  `O catálogo reúne ${ferramentas.length} ferramentas no total e ${ferramentasProntas.length} ferramentas prontas. Use a página Ferramentas para conferir disponibilidade, selos e limites.`,
  ["ferramentas.html"],
);

add(
  "navegacao",
  "conversa-oi",
  "Oi, Flower!",
  ["oi", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem"],
  "Oi! Sou a Flower. Posso ajudar a escolher ferramentas, explicar como usar e resolver dúvidas comuns. Conte o que você quer fazer ou escolha uma das perguntas abaixo.",
  ["ferramentas.html"],
);
add(
  "navegacao",
  "conversa-ajuda",
  "Preciso de ajuda para começar.",
  [
    "ajuda",
    "help",
    "me ajuda",
    "preciso de ajuda",
    "por onde comecar",
    "o que voce faz",
    "como voce pode ajudar",
  ],
  "Vamos por partes: você quer editar um arquivo, fazer um cálculo ou organizar texto e dados? Use Explorar assuntos para escolher um tema. Depois eu mostro passos, limites e links para as ferramentas.",
  ["ferramentas.html"],
);
add(
  "navegacao",
  "conversa-obrigado",
  "Obrigado, Flower!",
  ["obrigado", "obrigada", "valeu", "agradeco"],
  "De nada! Se precisar de mais alguma coisa, diga o que quer fazer ou explore outro assunto. Posso continuar orientando você por aqui.",
  [],
);
add(
  "navegacao",
  "conversa-entender",
  "Não entendi a explicação.",
  ["nao entendi", "explica melhor", "mais simples", "nao sei usar"],
  "Vamos simplificar. Primeiro, escolha o que quer fazer. Depois, abra a ferramenta indicada, informe os dados ou selecione o arquivo e confira as opções. Qual é a etapa em que você ficou com dúvida?",
  ["ajuda.html"],
);

const porId = new Map(itens.map((i) => [i.id, i]));
export const idsFAQ = Object.freeze(itens.map((i) => i.id));
const porTema = new Map(topicosFAQ.map((t) => [t.id, t]));
const continuacoes = {
  pdf: [
    "pdf-editar",
    "pdf-juntar",
    "pdf-dividir",
    "pdf-remover-paginas",
    "pdf-assinar",
    "pdf-baixar",
    "pdf-texto",
  ],
  imagens: ["imagem-editar", "imagem-cortar", "imagem-formato", "imagem-ocr"],
  "audio-video": [
    "audio-editar",
    "audio-converter",
    "video-editar",
    "video-formato",
    "video-transcricao",
  ],
  office: [
    "office-docx",
    "office-pptx",
    "office-xlsx",
    "office-formulas",
    "office-compat",
  ],
  calculos: [
    "calculo-porcentagem",
    "calculo-juros",
    "calculo-datas",
    "calculo-unidades",
    "calculo-reforma",
  ],
  "texto-dados": [
    "texto-contar",
    "texto-limpar",
    "texto-duplicadas",
    "dados-csv-json",
    "dados-json",
  ],
  arquivos: ["arquivo-download", "arquivo-upload", "arquivo-tamanho"],
  conta: ["conta-favoritos", "conta-trabalhos", "conta-planos", "conta-acesso"],
  privacidade: [
    "privacidade-arquivo",
    "privacidade-conta",
    "privacidade-cookies",
  ],
  erros: [
    "erro-carregamento",
    "erro-processamento",
    "erro-download",
    "erro-suporte",
  ],
  navegacao: ["nav-busca", "nav-categorias", "nav-pronta"],
  disponibilidade: ["indisponivel-ia", "indisponivel-ferramenta"],
};
function sugestoes(ids) {
  return ids
    .map((id) => porId.get(id))
    .filter(Boolean)
    .map(({ id, pergunta }) => ({ id, rotulo: pergunta, pergunta }));
}
function linkOK(href) {
  return (
    typeof href === "string" &&
    !href.startsWith("/") &&
    !href.includes("://") &&
    !href.includes("..")
  );
}
function resultado(item) {
  const ids = continuacoes[item.topico] || [];
  return {
    id: item.id,
    topico: item.topico,
    texto: item.texto,
    sugestoes: sugestoes(ids.filter((id) => id !== item.id).slice(0, 4)),
    links: item.hrefs.filter(linkOK).map((href) => {
      let ferramenta = ferramentasProntas.find((f) => href === `f/${f.slug}/`);
      if (!ferramenta && href.startsWith("ferramentas.html?busca=")) {
        const consulta = new URL(
          href,
          "https://portal.invalid/",
        ).searchParams.get("busca");
        ferramenta = ferramentasProntas.find(
          (f) => norm(f.nome) === norm(consulta),
        );
      }
      return ferramenta
        ? { rotulo: `Abrir ${ferramenta.nome}`, href: `f/${ferramenta.slug}/` }
        : { rotulo: "Ver no portal", href };
    }),
  };
}
const introducoes = {
  pdf: "Posso orientar sobre edição, organização, assinatura, conversão e extração de texto em PDF. Escolha uma tarefa para ver passos e limites.",
  imagens:
    "Posso orientar edição, conversão e reconhecimento de texto em imagens. Escolha uma dúvida abaixo ou abra Texto da imagem (OCR) para reconhecer uma foto.",
  "audio-video":
    "Há editores para áudio e vídeo, com formatos e limites descritos em cada página. Escolha uma tarefa para continuar.",
  office:
    "Os editores de documentos, apresentações e planilhas têm suporte a formatos específicos e algumas limitações de prévia.",
  calculos:
    "Há calculadoras para tarefas do dia a dia, negócio, obra e planejamento. Escolha o tipo de cálculo.",
  "texto-dados":
    "Posso indicar ferramentas para limpar texto, contar, converter CSV/JSON e preparar planilhas.",
  arquivos:
    "Posso explicar como selecionar, processar e baixar arquivos. Limites e formatos variam por ferramenta.",
  conta:
    "Posso orientar sobre acesso, senha, favoritos, trabalhos e planos. Não vejo nem altero sua conta.",
  privacidade:
    "As práticas variam conforme a ferramenta. Posso orientar sobre arquivos, dados e páginas de privacidade; não acesso seus dados.",
  erros:
    "Posso sugerir passos de diagnóstico e como descrever um problema ao suporte sem incluir dados confidenciais.",
  navegacao:
    "Use a busca e os filtros da página Ferramentas. Posso mostrar como localizar um recurso ou identificar se está pronto.",
  disponibilidade:
    "Posso esclarecer o estado de recursos e limites da Flower. Não afirmo que ferramentas planejadas já funcionam.",
};
function resultadoTema(tema) {
  const ids = continuacoes[tema] || [];
  return {
    id: tema,
    topico: tema,
    texto:
      introducoes[tema] ||
      "Escolha uma pergunta para ver orientações do portal.",
    sugestoes: sugestoes(ids.slice(0, 6)),
    links: [{ rotulo: "Abrir Ferramentas", href: "ferramentas.html" }],
  };
}
function matching(texto) {
  const q = norm(texto);
  if (!q || q.length > 1500) return null;
  // A recusa a pedidos sobre conteúdo privado tem precedência sobre qualquer intenção de ferramenta.
  if (
    /\b(ler|analisar|ver|consultar|abrir|acessar)\b.{0,45}\b(meu|minha|meus|minhas)\b.{0,35}\b(arquivo|pdf|foto|imagem|conta|dados|perfil|documento)\b/u.test(
      q,
    )
  )
    return null;
  let winner = null,
    score = 0;
  for (const item of itens)
    for (const key of item.chaves) {
      const palavras = key.split(" ");
      if (
        q === key ||
        ` ${q} `.includes(` ${key} `) ||
        palavras.every((p) => q.split(" ").includes(p))
      ) {
        const s = key.length + 20;
        if (s > score) {
          winner = item;
          score = s;
        }
      } else if (
        key.length >= 9 &&
        (q.includes(key) || key.includes(q)) &&
        q.length >= 5
      ) {
        const s = Math.min(q.length, key.length) + 3;
        if (s > score) {
          winner = item;
          score = s;
        }
      }
    }
  return winner;
}
export function consultarFAQ(texto, { topico, id } = {}) {
  if (typeof texto !== "string" || norm(texto).length > 1500) return null;
  const q = norm(texto);
  if (id) {
    const escolhido = porId.get(id);
    if (escolhido) return resultado(escolhido);
    return porTema.has(id) ? resultadoTema(id) : null;
  }
  if (!q && porTema.has(topico)) return resultadoTema(topico);
  const temaDireto = topicosFAQ.find(
    (t) => q === norm(t.rotulo) || q === norm(t.id),
  );
  if (temaDireto) return resultadoTema(temaDireto.id);
  const achado = matching(texto);
  if (achado) return resultado(achado);
  const tema = porTema.has(topico) ? topico : null;
  if (!tema || !q || q.length > 70) return null;
  const segue =
    /^(e |e como |e para |e o |e a |e os |e as |como |qual |quais |tambem |mas |agora |depois |baixar|juntar|dividir|converter|assinar|remover|girar|cortar)/u.test(
      q,
    );
  if (!segue) return null;
  if (
    /^(e como )?(faco isso|faço isso|faço isso|continuo|prossigo|uso essa ferramenta|faço agora)$/u.test(
      q,
    )
  )
    return resultadoTema(tema);
  const palavras = {
    baixar: "download",
    exportar: "download",
    download: "download",
    juntar: "juntar",
    unir: "juntar",
    dividir: "dividir",
    converter: "imagem",
    assinar: "assinar",
    remover: "remover",
    girar: "girar",
    cortar: "cortar",
    editar: "editar",
    preencher: "pdf-formulario",
    senha: "senha",
    formato: "formato",
    preco: "plano",
    plano: "plano",
    privacidade: "privacidade",
  };
  if (/\b(motor|carro|aviao|nave|medico|remedio|politica|futebol)\b/u.test(q))
    return null;
  const termo = Object.entries(palavras).find(([k]) => q.includes(k))?.[1];
  if (!termo) return null;
  if (termo === 'download' && tema !== 'pdf') return { ...resultado(porId.get('arquivo-download')), topico: tema };
  const ids = continuacoes[tema] || [];
  const destinos = {
    pdf: {
      download: "pdf-baixar",
      juntar: "pdf-juntar",
      dividir: "pdf-dividir",
      imagem: "pdf-imagem",
      assinar: "pdf-assinar",
      remover: "pdf-remover-paginas",
      girar: "pdf-rotacionar",
      cortar: "pdf-dividir",
      editar: "pdf-editar",
      "pdf-formulario": "pdf-formulario",
    },
    "audio-video": {
      imagem: "audio-converter",
      download: "audio-editar",
      converter: "audio-converter",
      cortar: "audio-editar",
      editar: "audio-editar",
    },
    arquivos: { download: "arquivo-download" },
    conta: { plano: "conta-planos" },
    privacidade: { privacidade: "privacidade-arquivo" },
  };
  const escolhido =
    (termo && porId.get(destinos[tema]?.[termo])) ||
    ids
      .map((k) => porId.get(k))
      .find(
        (i) =>
          i &&
          (!termo || i.id.includes(termo) || norm(i.pergunta).includes(termo)),
      );
  return escolhido ? resultado(escolhido, tema) : null;
}
