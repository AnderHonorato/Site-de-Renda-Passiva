// Página "Comparador de embalagens de tinta": calcula custo por litro e por m² de cada
// embalagem informada e aponta a mais barata em cada critério.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularComparadorDeTinta } from '../cálculos/calcular-comparador-de-tinta.js';

const formulário = document.getElementById('formulário-comparador');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeEmbalagens = document.querySelector('[data-linhas-de-embalagens]');
let contadorDeEmbalagens = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';
function íconeRemover(rótulo) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(SVG_NS, 'use');
  uso.setAttribute('href', `${document.documentElement.getAttribute('data-raiz') || './'}recursos/ícones/ícones.svg#remover`);
  svg.append(uso);
  return criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': rótulo }, dados: { remover: '' } }, [svg]);
}

function novaLinhaDeEmbalagem() {
  contadorDeEmbalagens += 1;
  const índice = contadorDeEmbalagens;
  const idNome = `comparador-nome-${índice}`;
  const idLitros = `comparador-litros-${índice}`;
  const idPreço = `comparador-preço-${índice}`;
  const idCobertura = `comparador-cobertura-${índice}`;
  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Nome', atributos: { for: idNome } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idNome, type: 'text', maxlength: 40, autocomplete: 'off', placeholder: 'Ex.: Lata 3,6 L' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Litros', atributos: { for: idLitros } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idLitros, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 3,6' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Preço (R$)', atributos: { for: idPreço } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idPreço, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 90,00' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Cobertura (m²)', atributos: { for: idCobertura } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idCobertura, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 36' } }),
    ]),
    íconeRemover('Remover embalagem'),
  ]);
  linhasDeEmbalagens.append(linha);
}

linhasDeEmbalagens.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  if (linhasDeEmbalagens.children.length <= 2) return;
  botão.closest('.linha-editável').remove();
});
document.querySelector('[data-adicionar-embalagem]').addEventListener('click', () => novaLinhaDeEmbalagem());

function lerEmbalagens() {
  const embalagens = [];
  let válido = true;
  for (const [índice, linhaEl] of [...linhasDeEmbalagens.querySelectorAll('.linha-editável')].entries()) {
    const [entradaNome, entradaLitros, entradaPreço, entradaCobertura] = linhaEl.querySelectorAll('input');
    const nome = entradaNome.value.trim() || `Embalagem ${índice + 1}`;
    const litros = validarQuantidade(entradaLitros.value, { rótulo: `${nome}: litros`, mínimo: 0.01, máximo: 10000, casasMáximas: 3 });
    if (!litros.válido) { mostrarErroDeCampo(entradaLitros, litros.erro); válido = false; continue; }
    const preço = validarQuantidade(entradaPreço.value, { rótulo: `${nome}: preço`, mínimo: 0.01, máximo: 1e8, casasMáximas: 2 });
    if (!preço.válido) { mostrarErroDeCampo(entradaPreço, preço.erro); válido = false; continue; }
    const cobertura = validarQuantidade(entradaCobertura.value, { rótulo: `${nome}: cobertura`, mínimo: 0.01, máximo: 1e6, casasMáximas: 2 });
    if (!cobertura.válido) { mostrarErroDeCampo(entradaCobertura, cobertura.erro); válido = false; continue; }
    embalagens.push({ id: `embalagem-${índice + 1}`, nome, litros: litros.valor, preço: preço.valor, coberturaDeclaradaEmM2: cobertura.valor });
  }
  return válido ? embalagens : null;
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(cálculo) {
  resultado.querySelector('[data-corpo-comparação]').replaceChildren(
    ...cálculo.itens.map((item) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: item.nome }),
        criarElemento('td', { texto: `${formatarMoeda(item.custoPorLitro)}${item.id === cálculo.melhorPorLitroId ? ' ★' : ''}`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarMoeda(item.custoPorM2)}${item.id === cálculo.melhorPorM2Id ? ' ★' : ''}`, atributos: { 'data-numérico': '' } }),
      ]),
    ),
  );

  const melhorPorLitro = cálculo.itens.find((item) => item.id === cálculo.melhorPorLitroId);
  const melhorPorM2 = cálculo.itens.find((item) => item.id === cálculo.melhorPorM2Id);
  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Menor custo por litro', `${melhorPorLitro.nome} (${formatarMoeda(melhorPorLitro.custoPorLitro)}/L)`),
    linha('Menor custo por m²', `${melhorPorM2.nome} (${formatarMoeda(melhorPorM2.custoPorM2)}/m²)`),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulário);

  const embalagens = lerEmbalagens();
  if (embalagens === null) {
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularComparadorDeTinta({ embalagens });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  mostrarResultado(cálculo);
});

novaLinhaDeEmbalagem();
novaLinhaDeEmbalagem();
