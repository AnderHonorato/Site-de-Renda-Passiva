// Formata como uma palavra colocada aparece na lista "Encontre" do caça-palavras.
// No modo "remover" a lista precisa mostrar a forma exatamente como está na grade
// (sem acentos, ex.: CORACAO), para que grade, lista e gabarito sempre correspondam
// letra a letra — sem normalização silenciosa. Quando essa forma difere do que a
// pessoa digitou, a forma original aparece entre parênteses (ex.: "CORACAO (coração)");
// quando digitar já sem acentos torna as duas formas iguais, não há repetição.
// No modo "manter" a lista continua mostrando a palavra exatamente como foi digitada.
import { normalizarPalavraParaGrade } from './normalizar-palavra-para-grade.js';

export function formatarPalavraDaLista({ palavra, palavraNaGrade }, modoDeAcentos = 'manter') {
  if (modoDeAcentos !== 'remover') return palavra;
  const formaComAcentosMantidos = normalizarPalavraParaGrade(palavra, 'manter');
  if (formaComAcentosMantidos === palavraNaGrade) return palavraNaGrade;
  return `${palavraNaGrade} (${palavra})`;
}
