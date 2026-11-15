const respostas = [
  [
    /\b(editar|cortar|converter|ajustar).{0,45}\b(video|mp4|webm|gif)\b|\b(video|mp4|webm).{0,45}\b(editar|cortar|converter|ajustar)\b/u,
    "O Editor de vídeo permite recortar trechos, ajustar velocidade, tamanho e som, adicionar texto e exportar MP4, WebM, GIF ou WAV. O resultado pode ser reproduzido no próprio editor.",
  ],
  [
    /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|como vai)(\b|\s)/u,
    "Oi! Eu sou a Flower. Posso conversar e também ajudar a encontrar ferramentas e tirar dúvidas sobre o portal.",
  ],
  [
    /\b(qual e o seu nome|qual e seu nome|como voce se chama|quem e voce|o que voce faz)\b/u,
    "Eu sou a Flower, assistente do portal. Posso responder perguntas frequentes e apontar ferramentas; não abro arquivos nem acesso sua conta.",
  ],
  [
    /\b(quantas?|numero de).{0,35}\b(ferramentas|ferramentas prontas|opcoes)\b|\b258 ferramentas\b/u,
    "O catálogo tem 258 ferramentas prontas no momento. A página Ferramentas permite buscar por nome e navegar pelas categorias; os selos mostram o nível de acesso.",
  ],
  [
    /\b(editar|escrever|anotar|adicionar texto|inserir imagem|assinar).{0,45}\b(pdf|arquivo pdf)\b|\b(pdf|arquivo pdf).{0,45}\b(editar|escrever|anotar|adicionar texto|inserir imagem|assinar)\b/u,
    "A ferramenta Editar PDF permite acrescentar texto, imagens, formas e desenhos sobre as páginas. Ela não altera o texto que já existe no PDF. Procure “Editar PDF” na página Ferramentas.",
  ],
  [
    /\b(editar|ajustar|cortar|girar|redimensionar|melhorar).{0,45}\b(foto|imagem)\b|\b(foto|imagem).{0,45}\b(editar|ajustar|cortar|girar|redimensionar)\b/u,
    "O Editor de fotos gira, espelha, corta e redimensiona imagens, além de ajustar brilho, contraste e cores. A imagem é editada no navegador e o original fica intacto.",
  ],
  [
    /\b(editar|cortar|converter|ajustar|mudar).{0,45}\b(audio|wav|mp3|ogg|flac)\b|\b(audio|wav|mp3|ogg|flac).{0,45}\b(editar|cortar|converter|ajustar|mudar)\b/u,
    "O Editor de áudio permite ajustar trechos, volume, fades, velocidade e canais, e exportar WAV, MP3, OGG ou FLAC. O processamento é feito no aparelho; o primeiro uso pode carregar o motor de áudio.",
  ],
  [
    /\b(docx|arquivo word|documento word).{0,45}\b(editar|revisar|corrigir)\b|\b(editar|revisar|corrigir).{0,45}\b(docx|arquivo word|documento word)\b/u,
    "O Editor de documentos abre DOCX ou TXT e permite revisar parágrafos. A prévia simplifica a paginação; arquivos DOC antigo, com senha ou macros não são suportados.",
  ],
  [
    /\b(pptx|powerpoint|apresentacao|slides).{0,45}\b(editar|revisar|corrigir)\b|\b(editar|revisar|corrigir).{0,45}\b(pptx|powerpoint|apresentacao|slides)\b/u,
    "O Editor de apresentações revisa textos em PPTX e mantém as outras partes do arquivo. A prévia não reproduz animações nem o layout exato do PowerPoint; arquivos PPT antigos não são suportados.",
  ],
  [
    /\b(xlsx|csv|excel|planilha).{0,45}\b(editar|alterar|corrigir)\b|\b(editar|alterar|corrigir).{0,45}\b(xlsx|csv|excel|planilha)\b/u,
    "O Editor de planilhas permite editar células em XLSX ou CSV no navegador. As fórmulas são gravadas, mas só são recalculadas quando você abre o arquivo em um programa de planilhas; macros não são suportadas.",
  ],
  [
    /\b(que|o que|sobre).{0,24}\b(portal|site)\b|\bportal\b/u,
    "Este portal reúne ferramentas gratuitas e opções Plus/Premium de produtividade, documentos, imagens, áudio e cálculos. A página Ferramentas tem busca e categorias para encontrar a opção certa.",
  ],
  [
    /\b(favorit|salv(ar|o|os)|marcar).{0,24}\b(ferrament|pagina)\b|\bfavoritos?\b/u,
    "Os favoritos ficam primeiro neste aparelho. Ao entrar, o portal tenta sincronizá-los com a conta; o limite depende do plano, e os itens excedentes permanecem neste aparelho.",
  ],
  [
    /\b(guardar|salvar|continuar).{0,24}\b(trabalho|projeto)\b|\btrabalhos salvos\b/u,
    "Só ferramentas compatíveis oferecem salvar um trabalho. Quando a conta e o servidor estão disponíveis, os trabalhos salvos aparecem na área Trabalhos da conta.",
  ],
  [
    /\b(conta|cadastro|registr|entrar|login|senha)\b/u,
    "Acesse Conta para entrar ou criar um cadastro. Se não conseguir entrar, use a opção de recuperação de senha.",
  ],
  [
    /\b(privacidade|dados|informacao pessoal)\b/u,
    "Consulte as páginas Privacidade e Cookies para ver como o portal trata dados e preferências. Evite enviar senhas, chaves ou dados pessoais no chat.",
  ],
  [
    /\b(ia|inteligencia artificial|online|conectad|resposta padrao|offline)\b/u,
    "Quando a IA online não está configurada ou o servidor não responde, uso estas respostas padrão. Para outras perguntas, preciso que a IA seja habilitada pelo administrador.",
  ],
  [
    /\b(gratis|gratuita|gratuitas|gratuito|preco|custo|pagar|plus|premium|plano)\b/u,
    "O portal tem ferramentas públicas gratuitas e outras com selo Plus ou Premium. Confira o selo na ferramenta e a página Planos para ver os níveis e limites atuais; não há cobrança automática.",
  ],
];

export function respostaFAQ(texto) {
  if (typeof texto !== "string") return null;
  const limpo = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!limpo || limpo.length > 1500) return null;
  if (
    /\b(consultar|acessar|ver|ler|analise|analisar).{0,35}\b(minha|minhas|meu|meus)\b.{0,15}\b(conta|dados|arquivo|perfil)\b/u.test(
      limpo,
    )
  )
    return null;
  return respostas.find(([regra]) => regra.test(limpo))?.[1] || null;
}
