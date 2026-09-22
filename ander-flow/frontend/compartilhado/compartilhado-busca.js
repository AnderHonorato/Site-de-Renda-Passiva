// compartilhado-busca.js — normalização de texto e busca de ferramentas por intenção.
// Tudo função pura, sem DOM.

const PESOS = { nome: 4, intencoes: 3, etiquetas: 2, descricao: 1 };

/** Minúsculas, sem acento. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function camposNormalizados(ferramenta) {
  return {
    nome: normalizar(ferramenta.nome),
    intencoes: (ferramenta.intencoes ?? []).map(normalizar),
    etiquetas: (ferramenta.etiquetas ?? []).map(normalizar),
    descricao: normalizar(ferramenta.descricao),
  };
}

function pontuarPalavraNosCampos(palavra, campos) {
  if (campos.nome.includes(palavra)) return PESOS.nome;
  if (campos.intencoes.some((item) => item.includes(palavra))) return PESOS.intencoes;
  if (campos.etiquetas.some((item) => item.includes(palavra))) return PESOS.etiquetas;
  if (campos.descricao.includes(palavra)) return PESOS.descricao;
  return 0;
}

/**
 * Filtra `lista` pelas ferramentas em que toda palavra de `consulta` casa em algum campo
 * (nome, intenções, etiquetas ou descrição) e ordena por relevância
 * (nome > intenções > etiquetas > descrição), preservando a ordem original em caso de empate.
 */
export function buscarFerramentas(lista, consulta) {
  const palavras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];

  const encontrados = [];
  lista.forEach((ferramenta, indice) => {
    const campos = camposNormalizados(ferramenta);
    let pontuacao = 0;
    let todasCasaram = true;
    for (const palavra of palavras) {
      const pontuacaoPalavra = pontuarPalavraNosCampos(palavra, campos);
      if (pontuacaoPalavra === 0) {
        todasCasaram = false;
        break;
      }
      pontuacao += pontuacaoPalavra;
    }
    if (todasCasaram) encontrados.push({ ferramenta, pontuacao, indice });
  });

  encontrados.sort((a, b) => b.pontuacao - a.pontuacao || a.indice - b.indice);
  return encontrados.map((item) => item.ferramenta);
}
