// Quantidade de barras de rodapé: soma os lados do cômodo, desconta os trechos sem
// instalação (vãos de porta), acrescenta a perda percentual e arredonda para cima pelo
// comprimento da barra comprada.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

export function calcularRodapé({ lados = [], trechosSemInstalação = [], perdaPercentual = 0, comprimentoDaBarra }) {
  if (!Array.isArray(lados) || lados.length === 0) return { válido: false, erro: 'Adicione ao menos um lado do cômodo.' };
  if (lados.length > 200) return { válido: false, erro: 'Use no máximo 200 lados.' };
  for (const [índice, lado] of lados.entries()) {
    if (!Number.isFinite(lado) || lado <= 0) return { válido: false, erro: `Lado ${índice + 1}: informe um comprimento maior que zero.` };
  }
  if (!Array.isArray(trechosSemInstalação)) return { válido: false, erro: 'Lista de trechos sem instalação inválida.' };
  for (const [índice, trecho] of trechosSemInstalação.entries()) {
    if (!Number.isFinite(trecho) || trecho < 0) return { válido: false, erro: `Trecho sem instalação ${índice + 1}: informe um comprimento maior ou igual a zero.` };
  }
  if (!Number.isFinite(perdaPercentual) || perdaPercentual < 0) return { válido: false, erro: 'A perda não pode ser negativa.' };
  if (!Number.isFinite(comprimentoDaBarra) || comprimentoDaBarra <= 0) return { válido: false, erro: 'Informe o comprimento da barra, maior que zero.' };

  const perímetroTotal = lados.reduce((total, lado) => total + lado, 0);
  const totalDeTrechosSemInstalação = trechosSemInstalação.reduce((total, trecho) => total + trecho, 0);
  if (totalDeTrechosSemInstalação > perímetroTotal + 1e-9) {
    return { válido: false, erro: 'Os trechos sem instalação somam mais do que o perímetro dos lados informados.' };
  }
  const perímetroÚtil = Math.max(perímetroTotal - totalDeTrechosSemInstalação, 0);
  const comprimentoComPerda = perímetroÚtil * (1 + perdaPercentual / 100);
  const barras = arredondarParaCima(comprimentoComPerda / comprimentoDaBarra);
  const comprimentoComprado = barras * comprimentoDaBarra;

  return { válido: true, perímetroTotal, perímetroÚtil, comprimentoComPerda, barras, comprimentoComprado, sobraEmComprimento: comprimentoComprado - comprimentoComPerda };
}
