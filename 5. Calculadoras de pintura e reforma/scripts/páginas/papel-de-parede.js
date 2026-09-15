// Página "Papel de parede": calcula faixas e rolos a partir da largura da parede, da altura
// do ambiente e das medidas do rolo, ajustando a altura de cada faixa pela repetição da
// estampa quando informada.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPapelDeParede } from '../cálculos/calcular-papel-de-parede.js';

const formulário = document.getElementById('formulário-papel-de-parede');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(cálculo) {
  const valorPrincipal = resultado.querySelector('[data-rolos]');
  valorPrincipal.textContent = `${cálculo.rolos} rolo${cálculo.rolos === 1 ? '' : 's'}`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Faixas necessárias', `${cálculo.faixas}`),
    linha('Altura de cada faixa (com folga e repetição)', `${formatarNúmero(cálculo.alturaDaFaixaAjustada, { casas: 2 })} m`),
    linha('Faixas por rolo', `${cálculo.faixasPorRolo}`),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulário);
  let válido = true;

  const larguraDaParede = validarQuantidade(campo('largura-da-parede').value, { rótulo: 'Largura da parede', mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
  if (!larguraDaParede.válido) { mostrarErroDeCampo(campo('largura-da-parede'), larguraDaParede.erro); válido = false; }

  const alturaDoAmbiente = validarQuantidade(campo('altura-do-ambiente').value, { rótulo: 'Altura do ambiente', mínimo: 0.01, máximo: 100, casasMáximas: 3 });
  if (!alturaDoAmbiente.válido) { mostrarErroDeCampo(campo('altura-do-ambiente'), alturaDoAmbiente.erro); válido = false; }

  const larguraDoRolo = validarQuantidade(campo('largura-do-rolo').value, { rótulo: 'Largura do rolo', mínimo: 0.01, máximo: 10, casasMáximas: 3 });
  if (!larguraDoRolo.válido) { mostrarErroDeCampo(campo('largura-do-rolo'), larguraDoRolo.erro); válido = false; }

  const comprimentoDoRolo = validarQuantidade(campo('comprimento-do-rolo').value, { rótulo: 'Comprimento do rolo', mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
  if (!comprimentoDoRolo.válido) { mostrarErroDeCampo(campo('comprimento-do-rolo'), comprimentoDoRolo.erro); válido = false; }

  const repetição = validarQuantidade(campo('repetição').value, { rótulo: 'Repetição da estampa', mínimo: 0, máximo: 100, permitirZero: true, casasMáximas: 3 });
  if (!repetição.válido) { mostrarErroDeCampo(campo('repetição'), repetição.erro); válido = false; }

  const folga = validarQuantidade(campo('folga').value, { rótulo: 'Folga de corte', mínimo: 0, máximo: 10, permitirZero: true, casasMáximas: 3 });
  if (!folga.válido) { mostrarErroDeCampo(campo('folga'), folga.erro); válido = false; }

  if (!válido) {
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularPapelDeParede({
    larguraDaParede: larguraDaParede.valor,
    alturaDoAmbiente: alturaDoAmbiente.valor,
    larguraDoRolo: larguraDoRolo.valor,
    comprimentoDoRolo: comprimentoDoRolo.valor,
    repetiçãoDoPadrão: repetição.valor,
    folgaPorFaixa: folga.valor,
  });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  mostrarResultado(cálculo);
});
