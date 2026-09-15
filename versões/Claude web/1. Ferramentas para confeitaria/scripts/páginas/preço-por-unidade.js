// Página "Preço por unidade": permite adicionar de duas a quatro embalagens,
// valida cada linha, calcula com a mesma função testada em
// testes/calcular-preço-por-unidade.test.js e permite salvar/reabrir a
// comparação neste aparelho.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPreçoPorUnidade } from '../cálculos/calcular-preço-por-unidade.js';

const COLEÇÃO = 'comparações-de-preço';
const MÍNIMO_DE_EMBALAGENS = 2;
const MÁXIMO_DE_EMBALAGENS = 4;
const RÓTULO_DA_REFERÊNCIA = { kg: '/kg', L: '/L', unidade: '/unidade' };

const raiz = obterRaiz();
const formulário = document.getElementById('formulário-comparação');
const formulárioDeSalvar = document.getElementById('formulário-salvar-comparação');
const contêiner = document.querySelector('[data-linhas-de-embalagem]');
const botãoAdicionar = document.querySelector('[data-adicionar-embalagem]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
let registroAtual = null;
let últimasEntradas = null;

function ícone(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `${raiz}recursos/ícones/ícones.svg#${nome}`);
  svg.append(uso);
  return svg;
}

function criarLinha(índice) {
  const idBase = `embalagem-${índice}-${Date.now().toString(36)}`;
  const campoNome = criarElemento('input', { classe: 'entrada', atributos: { id: `${idBase}-nome`, type: 'text', maxlength: 60, autocomplete: 'off', placeholder: `Embalagem ${índice + 1}` } });
  const campoQuantidade = criarElemento('input', { classe: 'entrada', atributos: { id: `${idBase}-quantidade`, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 500' } });
  const campoUnidade = criarElemento('select', { classe: 'entrada seleção', atributos: { id: `${idBase}-unidade` } }, [
    criarElemento('option', { texto: 'Gramas (g)', atributos: { value: 'g' } }),
    criarElemento('option', { texto: 'Quilos (kg)', atributos: { value: 'kg' } }),
    criarElemento('option', { texto: 'Mililitros (ml)', atributos: { value: 'ml' } }),
    criarElemento('option', { texto: 'Litros (L)', atributos: { value: 'L' } }),
    criarElemento('option', { texto: 'Unidades', atributos: { value: 'unidade' } }),
  ]);
  const campoPreço = criarElemento('input', { classe: 'entrada', atributos: { id: `${idBase}-preço`, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 12,00' } });

  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': `Remover embalagem ${índice + 1}` }, dados: { removerLinha: '' } }, [ícone('remover')]);

  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Nome (opcional)', atributos: { for: `${idBase}-nome` } }), campoNome]),
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Quantidade', atributos: { for: `${idBase}-quantidade` } }), campoQuantidade]),
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Unidade', atributos: { for: `${idBase}-unidade` } }), campoUnidade]),
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Preço (R$)', atributos: { for: `${idBase}-preço` } }), campoPreço]),
    botãoRemover,
  ]);
}

function atualizarBotãoAdicionar() {
  const total = contêiner.querySelectorAll(':scope > [data-linha]').length;
  botãoAdicionar.disabled = total >= MÁXIMO_DE_EMBALAGENS;
  for (const botão of contêiner.querySelectorAll('[data-remover-linha]')) {
    botão.disabled = total <= MÍNIMO_DE_EMBALAGENS;
  }
}

const { adicionarLinha } = configurarLinhasEditáveis({
  contêiner,
  botãoAdicionar,
  criarLinha,
  mínimo: MÍNIMO_DE_EMBALAGENS,
  aoMudar: atualizarBotãoAdicionar,
});

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function lerEmbalagens() {
  limparErrosDeCampo(formulário);
  const linhas = [...contêiner.querySelectorAll(':scope > [data-linha]')];
  const embalagens = [];
  let válido = true;
  linhas.forEach((linhaAtual, índice) => {
    const entradaQuantidade = linhaAtual.querySelectorAll('.entrada')[1];
    const entradaPreço = linhaAtual.querySelectorAll('.entrada')[3];
    const entradaNome = linhaAtual.querySelectorAll('.entrada')[0];
    const entradaUnidade = linhaAtual.querySelectorAll('.entrada')[2];
    const rótuloDaLinha = `Embalagem ${índice + 1}`;

    const quantidade = validarQuantidade(entradaQuantidade.value, { rótulo: `${rótuloDaLinha}: quantidade`, mínimo: 0.0001, máximo: 1e6, permitirZero: false });
    if (!quantidade.válido) {
      mostrarErroDeCampo(entradaQuantidade, quantidade.erro);
      válido = false;
    }
    const preço = validarQuantidade(entradaPreço.value, { rótulo: `${rótuloDaLinha}: preço`, mínimo: 0.01, máximo: 1e9, permitirZero: false, casasMáximas: 2 });
    if (!preço.válido) {
      mostrarErroDeCampo(entradaPreço, preço.erro);
      válido = false;
    }
    if (entradaNome.value.length > 60) {
      mostrarErroDeCampo(entradaNome, `${rótuloDaLinha}: use no máximo 60 caracteres no nome.`);
      válido = false;
    }
    if (quantidade.válido && preço.válido) {
      embalagens.push({ nome: entradaNome.value.trim() || rótuloDaLinha, quantidade: quantidade.valor, unidade: entradaUnidade.value, preço: preço.valor });
    }
  });
  if (!válido) return null;
  return embalagens;
}

function mostrarResultado(cálculo) {
  const sufixo = RÓTULO_DA_REFERÊNCIA[cálculo.unidadeDeReferência] ?? '';
  resultado.querySelector('[data-embalagem-mais-econômica]').textContent = cálculo.maisEconômicaNome;

  resultado.querySelector('[data-lista]').replaceChildren(
    ...cálculo.embalagens.map((embalagem) => linha(embalagem.nome, `${formatarMoeda(embalagem.preçoPorUnidadeDeReferência)}${sufixo}`)),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Todas as embalagens foram convertidas para a mesma unidade de referência: ${cálculo.unidadeDeReferência}.` }),
    ...cálculo.embalagens.map((embalagem) => criarElemento('li', { texto: `${embalagem.nome}: ${formatarMoeda(embalagem.preço)} ÷ quantidade convertida = ${formatarMoeda(embalagem.preçoPorUnidadeDeReferência)}${sufixo}.` })),
    criarElemento('li', { texto: `A mais econômica é “${cálculo.maisEconômicaNome}”, por ter o menor preço por unidade de referência.` }),
  );
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function comparar() {
  const embalagens = lerEmbalagens();
  if (!embalagens) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularPreçoPorUnidade({ embalagens });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = embalagens;
  mostrarResultado(cálculo);
}

function preencher(registro) {
  contêiner.replaceChildren();
  const decimal = (valor) => String(valor).replace('.', ',');
  registro.embalagens.forEach((embalagem, índice) => {
    const linhaCriada = adicionarLinha();
    const entradas = linhaCriada.querySelectorAll('.entrada');
    entradas[0].value = embalagem.nome === `Embalagem ${índice + 1}` ? '' : embalagem.nome;
    entradas[1].value = decimal(embalagem.quantidade);
    entradas[2].value = embalagem.unidade;
    entradas[3].value = decimal(embalagem.preço);
  });
  atualizarBotãoAdicionar();
  document.getElementById('nome-da-comparação').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  comparar();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const campoNome = document.getElementById('nome-da-comparação');
  const nome = campoNome.value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campoNome, 'Dê um nome de 1 a 120 caracteres, por exemplo “Farinha de trigo”.');
    campoNome.focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), nome, embalagens: últimasEntradas });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Comparação salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    comparar();
  } else {
    exibirMensagem('A comparação salva não foi encontrada neste aparelho.', { tipo: 'erro' });
    adicionarLinha();
    adicionarLinha();
    atualizarBotãoAdicionar();
  }
} else {
  adicionarLinha();
  adicionarLinha();
  atualizarBotãoAdicionar();
}
