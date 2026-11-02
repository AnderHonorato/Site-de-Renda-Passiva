// Página "Conversor de amostras de pontos": pontos necessários para uma largura desejada,
// com aviso quando o total não fecha o múltiplo do padrão de pontos.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularAmostraDePontos } from '../cálculos/calcular-amostra-de-pontos.js';

const formulário = document.getElementById('formulário-amostra');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const avisoDeMúltiplo = document.querySelector('[data-aviso-múltiplo]');
const campo = (id) => document.getElementById(id);

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const pontos = validarQuantidade(campo('pontos-da-amostra').value, { rótulo: 'Pontos da amostra', mínimo: 1, máximo: 1e4, casasMáximas: 2 });
  if (!pontos.válido) { mostrarErroDeCampo(campo('pontos-da-amostra'), pontos.erro); válido = false; }

  const larguraAmostra = validarQuantidade(campo('largura-da-amostra').value, { rótulo: 'Largura da amostra', mínimo: 0.1, máximo: 1000, casasMáximas: 2 });
  if (!larguraAmostra.válido) { mostrarErroDeCampo(campo('largura-da-amostra'), larguraAmostra.erro); válido = false; }

  const larguraDesejada = validarQuantidade(campo('largura-desejada').value, { rótulo: 'Largura desejada', mínimo: 0.1, máximo: 5000, casasMáximas: 2 });
  if (!larguraDesejada.válido) { mostrarErroDeCampo(campo('largura-desejada'), larguraDesejada.erro); válido = false; }

  const múltiplo = validarQuantidade(campo('múltiplo-do-padrão').value, { rótulo: 'Múltiplo do padrão', mínimo: 1, máximo: 200, inteiro: true, obrigatório: false });
  if (!múltiplo.válido) { mostrarErroDeCampo(campo('múltiplo-do-padrão'), múltiplo.erro); válido = false; }

  const borda = validarQuantidade(campo('pontos-de-borda').value, { rótulo: 'Pontos de borda', mínimo: 0, máximo: 200, inteiro: true, permitirZero: true });
  if (!borda.válido) { mostrarErroDeCampo(campo('pontos-de-borda'), borda.erro); válido = false; }

  if (!válido) return null;
  return { pontosDaAmostra: pontos.valor, larguraDaAmostraCm: larguraAmostra.valor, larguraDesejadaCm: larguraDesejada.valor, múltiploDoPadrão: múltiplo.valor, pontosDeBorda: borda.valor };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-pontos]');
  valorPrincipal.textContent = `${cálculo.pontosFinais} pontos`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  if (cálculo.precisaAjuste) {
    avisoDeMúltiplo.hidden = false;
    avisoDeMúltiplo.querySelector('[data-texto-múltiplo]').textContent = `${cálculo.pontosFinais} pontos não fecham o múltiplo de ${entradas.múltiploDoPadrão} informado (com ${entradas.pontosDeBorda} de borda). Os valores mais próximos que fecham são ${cálculo.ajustadoParaBaixo} ou ${cálculo.ajustadoParaCima} pontos.`;
  } else {
    avisoDeMúltiplo.hidden = true;
  }

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Pontos por cm', formatarNúmero(cálculo.pontosPorCm, { casas: 3 })),
    linha('Cálculo exato', `${formatarNúmero(cálculo.pontosCalculadosExatos, { casas: 2 })} pontos`),
  );

  const memória = [
    criarElemento('li', { texto: `Pontos por cm = pontos da amostra ÷ largura da amostra = ${entradas.pontosDaAmostra} ÷ ${formatarNúmero(entradas.larguraDaAmostraCm, { casas: 2 })} cm = ${formatarNúmero(cálculo.pontosPorCm, { casas: 3 })}.` }),
    criarElemento('li', { texto: `Pontos para a largura desejada = pontos por cm × largura desejada = ${formatarNúmero(cálculo.pontosPorCm, { casas: 3 })} × ${formatarNúmero(entradas.larguraDesejadaCm, { casas: 2 })} cm = ${formatarNúmero(cálculo.pontosCalculadosExatos, { casas: 2 })}, arredondado para ${cálculo.pontosFinais} pontos.` }),
  ];
  resultado.querySelector('[data-memória]').replaceChildren(...memória);

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularAmostraDePontos(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('largura-desejada'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  mostrarResultado(entradas, cálculo);
});
