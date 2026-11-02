// Página "Rendimento com perdas": unidades aproveitáveis depois de uma perda
// percentual, e custo por unidade aproveitável quando o custo total é informado.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularRendimentoComPerdas } from '../cálculos/calcular-rendimento-com-perdas.js';

const formulário = document.getElementById('formulário-rendimento');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function calcular() {
  limparErrosDeCampo(formulário);
  const unidades = validarQuantidade(campo('unidades-produzidas').value, { rótulo: 'Unidades produzidas', mínimo: 1, máximo: 1000000, inteiro: true });
  const perda = validarQuantidade(campo('percentual-de-perda').value, { rótulo: 'Perda', mínimo: 0, máximo: 99.99, casasMáximas: 2 });
  const custo = validarQuantidade(campo('custo-total-do-lote').value, { rótulo: 'Custo total do lote', mínimo: 0.01, máximo: 1e8, casasMáximas: 2, obrigatório: false });

  let válido = true;
  if (!unidades.válido) {
    mostrarErroDeCampo(campo('unidades-produzidas'), unidades.erro);
    válido = false;
  }
  if (!perda.válido) {
    mostrarErroDeCampo(campo('percentual-de-perda'), perda.erro);
    válido = false;
  }
  if (!custo.válido) {
    mostrarErroDeCampo(campo('custo-total-do-lote'), custo.erro);
    válido = false;
  }
  if (!válido) {
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularRendimentoComPerdas({ unidadesProduzidas: unidades.valor, percentualDePerda: perda.valor, custoTotal: custo.valor ?? undefined });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  resultado.querySelector('[data-unidades-aproveitáveis]').textContent = `${cálculo.unidadesAproveitáveis} unidade${cálculo.unidadesAproveitáveis === 1 ? '' : 's'}`;
  resultado.querySelector('[data-lista]').replaceChildren(
    ...[
      linha('Unidades perdidas', String(cálculo.perdaEmUnidades)),
      cálculo.custoPorUnidadeAproveitável !== undefined ? linha('Custo por unidade aproveitável', formatarMoeda(cálculo.custoPorUnidadeAproveitável)) : null,
    ].filter(Boolean),
  );

  const passos = [criarElemento('li', { texto: `Unidades aproveitáveis = ${unidades.valor} × (1 − ${formatarNúmero(perda.valor, { casas: 2 })}%) = ${cálculo.unidadesAproveitáveis}, arredondado para baixo.` })];
  if (cálculo.custoPorUnidadeAproveitável !== undefined) {
    passos.push(criarElemento('li', { texto: `Custo por unidade aproveitável = ${formatarMoeda(custo.valor)} ÷ ${cálculo.unidadesAproveitáveis} = ${formatarMoeda(cálculo.custoPorUnidadeAproveitável)}.` }));
  }
  resultado.querySelector('[data-memória]').replaceChildren(...passos);

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});
