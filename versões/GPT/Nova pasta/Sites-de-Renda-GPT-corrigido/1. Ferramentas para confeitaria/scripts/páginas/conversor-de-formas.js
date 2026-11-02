// Página "Conversor de formas": fator de conversão de massa entre duas formas de
// assar de mesma altura, pela razão entre as áreas, com aviso de que a cocção não escala.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularConversorDeFormas } from '../cálculos/calcular-conversor-de-formas.js';

const formulário = document.getElementById('formulário-formas');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function configurarSeletorDeForma(prefixo) {
  const seleção = document.querySelector(`[data-seletor-de-forma="${prefixo}"]`);
  function atualizar() {
    for (const tipo of ['redonda', 'quadrada', 'retangular']) {
      const bloco = document.querySelector(`[data-campos-de-forma="${prefixo}-${tipo}"]`);
      if (bloco) bloco.hidden = seleção.value !== tipo;
    }
  }
  seleção.addEventListener('change', atualizar);
  atualizar();
}
configurarSeletorDeForma('origem');
configurarSeletorDeForma('destino');

function lerForma(prefixo) {
  const tipo = document.querySelector(`[data-seletor-de-forma="${prefixo}"]`).value;
  if (tipo === 'redonda') {
    const diâmetro = validarQuantidade(campo(`${prefixo}-diâmetro`).value, { rótulo: 'Diâmetro', mínimo: 1, máximo: 500, casasMáximas: 2 });
    if (!diâmetro.válido) {
      mostrarErroDeCampo(campo(`${prefixo}-diâmetro`), diâmetro.erro);
      return null;
    }
    return { tipo, diâmetro: diâmetro.valor };
  }
  if (tipo === 'quadrada') {
    const lado = validarQuantidade(campo(`${prefixo}-lado`).value, { rótulo: 'Lado', mínimo: 1, máximo: 500, casasMáximas: 2 });
    if (!lado.válido) {
      mostrarErroDeCampo(campo(`${prefixo}-lado`), lado.erro);
      return null;
    }
    return { tipo, lado: lado.valor };
  }
  const largura = validarQuantidade(campo(`${prefixo}-largura`).value, { rótulo: 'Largura', mínimo: 1, máximo: 500, casasMáximas: 2 });
  if (!largura.válido) {
    mostrarErroDeCampo(campo(`${prefixo}-largura`), largura.erro);
    return null;
  }
  const comprimento = validarQuantidade(campo(`${prefixo}-comprimento`).value, { rótulo: 'Comprimento', mínimo: 1, máximo: 500, casasMáximas: 2 });
  if (!comprimento.válido) {
    mostrarErroDeCampo(campo(`${prefixo}-comprimento`), comprimento.erro);
    return null;
  }
  return { tipo, largura: largura.valor, comprimento: comprimento.valor };
}

function rótuloDaForma(forma) {
  if (forma.tipo === 'redonda') return `redonda de ${formatarNúmero(forma.diâmetro, { casas: 1 })} cm de diâmetro`;
  if (forma.tipo === 'quadrada') return `quadrada de ${formatarNúmero(forma.lado, { casas: 1 })} cm de lado`;
  return `retangular de ${formatarNúmero(forma.largura, { casas: 1 })} × ${formatarNúmero(forma.comprimento, { casas: 1 })} cm`;
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function calcular() {
  limparErrosDeCampo(formulário);
  const origem = lerForma('origem');
  const destino = lerForma('destino');
  if (!origem || !destino) {
    focarPrimeiroErro(formulário);
    return;
  }
  const quantidadeVerificação = validarQuantidade(campo('quantidade-original').value, { rótulo: 'Quantidade de massa', mínimo: 0.01, máximo: 1e7, casasMáximas: 3, obrigatório: false });
  if (!quantidadeVerificação.válido) {
    mostrarErroDeCampo(campo('quantidade-original'), quantidadeVerificação.erro);
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularConversorDeFormas({ origem, destino, quantidadeOriginal: quantidadeVerificação.valor ?? undefined });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  resultado.querySelector('[data-fator]').textContent = `${formatarNúmero(cálculo.fatorDeConversão, { casas: 2 })}×`;
  resultado.querySelector('[data-lista]').replaceChildren(
    ...[
      linha('Área da forma de origem', `${formatarNúmero(cálculo.áreaDeOrigem, { casas: 1 })} cm²`),
      linha('Área da forma de destino', `${formatarNúmero(cálculo.áreaDeDestino, { casas: 1 })} cm²`),
      cálculo.quantidadeConvertida !== undefined ? linha('Quantidade convertida', formatarNúmero(cálculo.quantidadeConvertida, { casas: 2 })) : null,
    ].filter(Boolean),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Área de origem (${rótuloDaForma(origem)}) = ${formatarNúmero(cálculo.áreaDeOrigem, { casas: 2 })} cm².` }),
    criarElemento('li', { texto: `Área de destino (${rótuloDaForma(destino)}) = ${formatarNúmero(cálculo.áreaDeDestino, { casas: 2 })} cm².` }),
    criarElemento('li', { texto: `Fator = área de destino ÷ área de origem = ${formatarNúmero(cálculo.fatorDeConversão, { casas: 4 })}.` }),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});
