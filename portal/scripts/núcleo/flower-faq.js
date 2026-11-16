import { ferramentasProntas } from "../../dados/catálogo.js";
import { consultarFAQ } from "./flower-conhecimento.js";

function limpar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Compatibilidade com a interface antiga do chat: resposta curta ou null. */
export function respostaFAQ(texto) {
  if (typeof texto !== "string") return null;
  const q = limpar(texto);
  if (!q || q.length > 1500) return null;
  if (
    /\b(ler|analisar|ver|consultar|abrir|acessar)\b.{0,45}\b(meu|minha|meus|minhas)\b.{0,35}\b(arquivo|pdf|foto|imagem|conta|dados|perfil|documento)\b/u.test(
      q,
    )
  )
    return null;
  if (
    /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|como vai)(\b|\s)/u.test(
      q,
    )
  )
    return "Oi! Eu sou a Flower. Posso conversar e também ajudar a encontrar ferramentas e tirar dúvidas sobre o portal.";
  if (
    /\b(qual e o seu nome|qual e seu nome|como voce se chama|quem e voce|o que voce faz)\b/u.test(
      q,
    )
  )
    return "Eu sou a Flower, assistente do portal. Posso responder perguntas frequentes e apontar ferramentas; não abro arquivos nem acesso sua conta.";
  // Mantido por compatibilidade com o FAQ legado e seu contrato público existente.
  if (
    /\b(quantas?|numero de).{0,35}\b(ferramentas|ferramentas prontas|opcoes)\b|\b\d+ ferramentas\b/u.test(
      q,
    )
  )
    return `O catálogo tem ${ferramentasProntas.length} ferramentas prontas no momento. A página Ferramentas permite buscar por nome e navegar pelas categorias; os selos mostram o nível de acesso.`;
  if (
    /\b(gratis|gratuita|gratuitas|gratuito|preco|custo|pagar|plus|premium|plano)\b/u.test(
      q,
    )
  )
    return "O portal tem ferramentas públicas gratuitas e outras com selo Plus ou Premium. Confira o selo na ferramenta e a página Planos para ver os níveis e limites atuais; não há cobrança automática.";
  if (
    /\b(que|o que|sobre).{0,24}\b(portal|site)\b|\bportal\b/u.test(q) &&
    !/\b(pdf|imagem|foto|audio|video|docx|pptx|xlsx|planilha|ferramenta)\b/u.test(
      q,
    )
  )
    return "Este portal reúne ferramentas gratuitas e opções Plus/Premium de produtividade, documentos, imagens, áudio e cálculos. A página Ferramentas tem busca e categorias para encontrar a opção certa.";
  const resultado = consultarFAQ(texto);
  if (resultado) return resultado.texto;
  if (
    /\b(favorit|salv(ar|o|os)|marcar).{0,24}\b(ferrament|pagina)\b|\bfavoritos?\b/u.test(
      q,
    )
  )
    return "Os favoritos ficam primeiro neste aparelho. Ao entrar, o portal tenta sincronizá-los com a conta; o limite depende do plano, e os itens excedentes permanecem neste aparelho.";
  if (
    /\b(guardar|salvar|continuar).{0,24}\b(trabalho|projeto)\b|\btrabalhos salvos\b/u.test(
      q,
    )
  )
    return "Só ferramentas compatíveis oferecem salvar um trabalho. Quando a conta e o servidor estão disponíveis, os trabalhos salvos aparecem na área Trabalhos da conta.";
  if (/\b(conta|cadastro|registr|entrar|login|senha)\b/u.test(q))
    return "Acesse Conta para entrar ou criar um cadastro. Se não conseguir entrar, use a opção de recuperação de senha.";
  if (/\b(privacidade|dados|informacao pessoal)\b/u.test(q))
    return "Consulte as páginas Privacidade e Cookies para ver como o portal trata dados e preferências. Evite enviar senhas, chaves ou dados pessoais no chat.";
  if (
    /\b(ia|inteligencia artificial|online|conectad|resposta padrao|offline)\b/u.test(
      q,
    )
  )
    return "Quando a IA online não está configurada ou o servidor não responde, uso estas respostas padrão. Para outras perguntas, preciso que a IA seja habilitada pelo administrador.";
  return null;
}
