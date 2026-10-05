/**
 * Contexto de cada idioma na geração das páginas: o tradutor, as categorias e o catálogo já no
 * idioma certo. As páginas em português e em inglês saem do mesmo código, com contextos
 * diferentes, e por isso não podem divergir em estrutura.
 *
 * Os textos são sempre pedidos pelo tradutor (t), que recusa chave inexistente e {parâmetro}
 * faltando. O nome do site e o autor entram sozinhos como {nome} e {autor}.
 */
import pt from '../dados/traduções/pt.js';
import en from '../dados/traduções/en.js';
import catálogoEn from '../dados/traduções/en/catálogo.js';
import categoriasEn from '../dados/traduções/en/categorias.js';
import { catálogoDoIdioma } from '../dados/catálogo.js';
import { categoriasDoIdioma } from '../dados/categorias.js';
import { idiomas } from '../dados/idiomas.js';
import { site } from '../dados/site.js';
import { criarTradutor, lista } from '../scripts/núcleo/traduzir.js';

function criar(código, dicionário, traduçõesDoCatálogo, traduçõesDasCategorias) {
  const tradutor = criarTradutor(dicionário);
  const { categorias, categoriaPorId, tarefas } = categoriasDoIdioma(traduçõesDasCategorias);
  const catálogo = catálogoDoIdioma(traduçõesDoCatálogo, traduçõesDasCategorias);
  return Object.freeze({
    código,
    idioma: idiomas[código],
    dicionário,
    /** Traduz uma chave. {nome} e {autor} são sempre preenchidos com os dados do site. */
    t: (chave, parâmetros) => tradutor(chave, { nome: site.nome, autor: site.autor, ...parâmetros }),
    /** Lista de textos (por exemplo as perguntas frequentes). */
    lista: (chave) => lista(dicionário, chave),
    categorias,
    categoriaPorId,
    tarefas,
    ...catálogo,
  });
}

export const contextos = Object.freeze({
  'pt-BR': criar('pt-BR', pt, null, null),
  en: criar('en', en, catálogoEn, categoriasEn),
});

export const contextoPt = contextos['pt-BR'];
export const contextoEn = contextos.en;
