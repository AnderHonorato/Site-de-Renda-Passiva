/** Orientações derivadas das fichas reais, sem executar ferramentas ou inferir dados. */
import { ferramentasProntas } from "../../dados/catálogo.js";
import { achatar, termos } from "./texto.js";

const porSlug = new Map(ferramentasProntas.map((f) => [f.slug, f]));
const ignorar = new Set([
  "calculadora",
  "calculador",
  "editor",
  "gerador",
  "conversor",
  "contador",
  "ferramenta",
  "profissional",
]);
function resultado(f, detalhe = "") {
  const plano =
    f.plano === "gratuito"
      ? "Gratuita."
      : `Requer o nível ${f.plano === "plus" ? "Plus" : "Premium"} e um servidor disponível.`;
  const texto =
    detalhe === "entrada"
      ? `Para usar ${f.nome}: ${f.entra}`
      : detalhe === "saida"
        ? `Em ${f.nome}, o resultado disponível é: ${f.sai}\n\nUse as opções de exportação mostradas na ferramenta após o processamento.`
        : `${f.nome}: ${f.resumo}\n\nO que informar: ${f.entra}\n\n${plano} Abra a ferramenta para consultar os limites e realizar a operação.`;
  return {
    id: `catalogo:${f.slug}:${detalhe}`,
    topico: `catalogo:${f.slug}`,
    texto,
    sugestoes: [
      {
        id: `catalogo:${f.slug}:entrada`,
        rotulo: "O que preciso informar?",
        pergunta: `O que informar em ${f.nome}?`,
      },
      {
        id: `catalogo:${f.slug}:saida`,
        rotulo: "Qual resultado posso baixar?",
        pergunta: `Qual o resultado de ${f.nome}?`,
      },
      {
        id: "arquivos",
        rotulo: "Ajuda para carregar e baixar",
        pergunta: "Como carregar e baixar arquivos?",
      },
    ].filter((item) => item.id !== `catalogo:${f.slug}:${detalhe}`),
    links: [{ rotulo: `Abrir ${f.nome}`, href: `f/${f.slug}/` }],
  };
}
export function consultarCatalogo(texto, { id, topico } = {}) {
  if (typeof texto !== "string" || texto.length > 1500) return null;
  const privado =
    /\b(ler|analisar|consultar|abrir|acessar)\b.{0,40}\b(meu|minha|meus|minhas)\b/u.test(
      achatar(texto),
    );
  if (privado) return null;
  if (id?.startsWith("catalogo:")) {
    const [, slug, detalhe] = id.split(":");
    return porSlug.has(slug) ? resultado(porSlug.get(slug), detalhe) : null;
  }
  const palavras = new Set(termos(texto));
  const candidatas = ferramentasProntas
    .filter((f) => {
      const nome = termos(f.nome).filter((p) => !ignorar.has(p));
      return (
        nome.length &&
        nome.every((p) => palavras.has(p)) &&
        nome.join("").length >= 4 &&
        (nome.length > 1 || ['regex','uuid','base64','json','csv','xml','markdown'].includes(nome[0]) || achatar(texto).includes(achatar(f.nome)))
      );
    })
    .sort((a, b) => b.nome.length - a.nome.length);
  if (candidatas.length) return resultado(candidatas[0]);
  if (
    topico?.startsWith("catalogo:") &&
    /^(e )?(como )?(baixar|exportar|o que informar|qual resultado|quais arquivos)\??$/iu.test(
      texto.trim(),
    )
  ) {
    const f = porSlug.get(topico.split(":")[1]);
    return f
      ? resultado(f, /informar|arquivos/iu.test(texto) ? "entrada" : "saida")
      : null;
  }
  return null;
}
