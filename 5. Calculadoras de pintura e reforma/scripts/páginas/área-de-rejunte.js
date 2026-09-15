// Página "Área de rejunte estimada": calcula comprimento de junta, volume e massa de
// rejunte a partir das medidas da peça e dos dados do fabricante do produto.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularÁreaDeRejunte } from '../cálculos/calcular-área-de-rejunte.js';

const formulário = document.getElementById('formulário-rejunte');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(cálculo) {
  const valorPrincipal = resultado.querySelector('[data-massa]');
  valorPrincipal.textContent = `${formatarNúmero(cálculo.massaEmKg, { casas: 3 })} kg`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Comprimento de junta por m²', `${formatarNúmero(cálculo.comprimentoDeJuntaPorM2, { casas: 3 })} m/m²`),
    linha('Comprimento total de junta', `${formatarNúmero(cálculo.comprimentoTotalDeJuntaEmM, { casas: 2 })} m`),
    linha('Volume estimado', `${formatarNúmero(cálculo.volumeEmLitros, { casas: 3 })} L`),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulário);
  let válido = true;

  const área = validarQuantidade(campo('área-rejunte').value, { rótulo: 'Área revestida', mínimo: 0.01, máximo: 1e6, casasMáximas: 3 });
  if (!área.válido) { mostrarErroDeCampo(campo('área-rejunte'), área.erro); válido = false; }

  const comprimentoDaPeça = validarQuantidade(campo('comprimento-da-peça').value, { rótulo: 'Comprimento da peça', mínimo: 1, máximo: 5000, casasMáximas: 1 });
  if (!comprimentoDaPeça.válido) { mostrarErroDeCampo(campo('comprimento-da-peça'), comprimentoDaPeça.erro); válido = false; }

  const larguraDaPeça = validarQuantidade(campo('largura-da-peça').value, { rótulo: 'Largura da peça', mínimo: 1, máximo: 5000, casasMáximas: 1 });
  if (!larguraDaPeça.válido) { mostrarErroDeCampo(campo('largura-da-peça'), larguraDaPeça.erro); válido = false; }

  const larguraDaJunta = validarQuantidade(campo('largura-da-junta').value, { rótulo: 'Largura da junta', mínimo: 0.1, máximo: 100, casasMáximas: 2 });
  if (!larguraDaJunta.válido) { mostrarErroDeCampo(campo('largura-da-junta'), larguraDaJunta.erro); válido = false; }

  const profundidadeDaJunta = validarQuantidade(campo('profundidade-da-junta').value, { rótulo: 'Profundidade da junta', mínimo: 0.1, máximo: 100, casasMáximas: 2 });
  if (!profundidadeDaJunta.válido) { mostrarErroDeCampo(campo('profundidade-da-junta'), profundidadeDaJunta.erro); válido = false; }

  const densidade = validarQuantidade(campo('densidade').value, { rótulo: 'Densidade do rejunte', mínimo: 0.1, máximo: 20, casasMáximas: 3 });
  if (!densidade.válido) { mostrarErroDeCampo(campo('densidade'), densidade.erro); válido = false; }

  if (!válido) {
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularÁreaDeRejunte({
    área: área.valor,
    comprimentoDaPeçaEmMm: comprimentoDaPeça.valor,
    larguraDaPeçaEmMm: larguraDaPeça.valor,
    larguraDaJuntaEmMm: larguraDaJunta.valor,
    profundidadeDaJuntaEmMm: profundidadeDaJunta.valor,
    densidadeEmKgPorLitro: densidade.valor,
  });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  mostrarResultado(cálculo);
});
