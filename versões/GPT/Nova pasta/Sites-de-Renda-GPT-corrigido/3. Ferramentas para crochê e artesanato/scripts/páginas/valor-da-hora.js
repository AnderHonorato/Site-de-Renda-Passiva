// Página "Valor da hora": lê o formulário, valida, calcula e mostra o resultado com
// memória de cálculo. Não salva ficha: o valor calculado é usado diretamente em Preço da peça.
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularValorDaHora } from '../cálculos/calcular-valor-da-hora.js';

const formulário = document.getElementById('formulário-valor-da-hora');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const meta = validarQuantidade(campo('meta-mensal').value, { rótulo: 'Meta mensal', mínimo: 0, máximo: 1e9, permitirZero: true, casasMáximas: 2 });
  if (!meta.válido) { mostrarErroDeCampo(campo('meta-mensal'), meta.erro); válido = false; }

  const custos = validarQuantidade(campo('custos-fixos').value, { rótulo: 'Custos fixos', mínimo: 0, máximo: 1e9, permitirZero: true, casasMáximas: 2 });
  if (!custos.válido) { mostrarErroDeCampo(campo('custos-fixos'), custos.erro); válido = false; }

  const horasProdutivas = validarQuantidade(campo('horas-produtivas').value, { rótulo: 'Horas produtivas', mínimo: 0.01, máximo: 1000, permitirZero: false, casasMáximas: 2 });
  if (!horasProdutivas.válido) { mostrarErroDeCampo(campo('horas-produtivas'), horasProdutivas.erro); válido = false; }

  const horasTotais = validarQuantidade(campo('horas-totais').value, { rótulo: 'Horas totais', mínimo: 0.01, máximo: 1000, casasMáximas: 2, obrigatório: false });
  if (!horasTotais.válido) { mostrarErroDeCampo(campo('horas-totais'), horasTotais.erro); válido = false; }

  if (!válido) return null;
  return { metaMensal: meta.valor, custosFixosMensais: custos.valor, horasProdutivasPorMês: horasProdutivas.valor, horasTotaisPorMês: horasTotais.valor };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-valor-hora]');
  valorPrincipal.textContent = `${formatarMoeda(cálculo.valorPorHora)} / h`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  const linhas = [
    linha('Meta mensal + custos fixos', formatarMoeda(cálculo.totalMensalNecessário)),
    linha('Horas produtivas por mês', `${formatarNúmero(entradas.horasProdutivasPorMês, { casas: 2 })} h`),
  ];
  if (entradas.horasTotaisPorMês) {
    const percentual = (entradas.horasProdutivasPorMês / entradas.horasTotaisPorMês) * 100;
    linhas.push(linha('Fração produtiva do tempo disponível', `${formatarNúmero(percentual, { casas: 1 })}% de ${formatarNúmero(entradas.horasTotaisPorMês, { casas: 2 })} h`));
  }
  resultado.querySelector('[data-lista]').replaceChildren(...linhas);

  const memória = [
    criarElemento('li', { texto: `Total necessário = meta mensal + custos fixos = ${formatarMoeda(entradas.metaMensal)} + ${formatarMoeda(entradas.custosFixosMensais)} = ${formatarMoeda(cálculo.totalMensalNecessário)}.` }),
    criarElemento('li', { texto: `Valor por hora = total necessário ÷ horas produtivas = ${formatarMoeda(cálculo.totalMensalNecessário)} ÷ ${formatarNúmero(entradas.horasProdutivasPorMês, { casas: 2 })} h = ${formatarMoeda(cálculo.valorPorHora)} por hora.` }),
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
  const cálculo = calcularValorDaHora(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('meta-mensal'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  mostrarResultado(entradas, cálculo);
});
