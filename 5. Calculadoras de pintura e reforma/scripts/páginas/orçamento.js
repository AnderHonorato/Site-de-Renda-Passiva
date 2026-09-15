// Página "Orçamento de acabamento": monta o orçamento a partir do formulário (materiais e
// mão de obra como itens), mostra a prévia com o visual do site e oferece baixar em
// PDF/planilha, imprimir, copiar texto e compartilhar um link. Usa o componente comum de
// orçamento (scripts/comum/orçamento/).
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { baixarPdfDoOrçamento } from '../comum/orçamento/baixar-pdf-do-orçamento.js';
import { baixarPlanilhaDoOrçamento } from '../comum/orçamento/baixar-planilha-do-orçamento.js';
import { calcularTotaisDoOrçamento } from '../comum/orçamento/calcular-totais-do-orçamento.js';
import { compartilharOrçamento } from '../comum/orçamento/compartilhar-orçamento.js';
import { lerDadosDoEmissor } from '../comum/orçamento/ler-dados-do-emissor.js';
import { montarOrçamento } from '../comum/orçamento/montar-orçamento.js';
import { renderizarOrçamento } from '../comum/orçamento/renderizar-orçamento.js';
import { salvarDadosDoEmissor } from '../comum/orçamento/salvar-dados-do-emissor.js';

const formulário = document.getElementById('formulário-orçamento');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeItens = document.querySelector('[data-linhas-de-itens]');
const áreaDeImpressão = document.querySelector('[data-área-de-impressão]');
const campo = (id) => document.getElementById(id);
let contadorDeLinhas = 0;
let orçamentoAtual = null;

function novaLinhaDeItem(descrição = '', quantidade = '1', unidade = 'un.', preço = '') {
  contadorDeLinhas += 1;
  const índice = contadorDeLinhas;
  const idDescrição = `item-descrição-${índice}`;
  const idQuantidade = `item-quantidade-${índice}`;
  const idUnidade = `item-unidade-${índice}`;
  const idPreço = `item-preço-${índice}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `${document.documentElement.getAttribute('data-raiz') || './'}recursos/ícones/ícones.svg#remover`);
  svg.append(uso);
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover item' }, dados: { removerItem: '' } }, [svg]);

  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Descrição', atributos: { for: idDescrição } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idDescrição, type: 'text', maxlength: 120, autocomplete: 'off', placeholder: 'Ex.: Tinta acrílica ou Mão de obra' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Qtde.', atributos: { for: idQuantidade } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idQuantidade, type: 'text', inputmode: 'decimal', autocomplete: 'off' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Unidade', atributos: { for: idUnidade } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idUnidade, type: 'text', maxlength: 12, autocomplete: 'off' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Preço unit. (R$)', atributos: { for: idPreço } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idPreço, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 500,00' } }),
    ]),
    botãoRemover,
  ]);
  linha.querySelector(`#${idDescrição}`).value = descrição;
  linha.querySelector(`#${idQuantidade}`).value = quantidade;
  linha.querySelector(`#${idUnidade}`).value = unidade;
  linha.querySelector(`#${idPreço}`).value = preço;
  linhasDeItens.append(linha);
}

linhasDeItens.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover-item]');
  if (!botão) return;
  if (linhasDeItens.children.length <= 1) return;
  botão.closest('.linha-editável').remove();
});

document.querySelector('[data-adicionar-item]').addEventListener('click', () => novaLinhaDeItem());

function lerItens() {
  const itens = [];
  let válido = true;
  for (const linhaEl of linhasDeItens.querySelectorAll('.linha-editável')) {
    const [entradaDescrição, entradaQuantidade, entradaUnidade, entradaPreço] = linhaEl.querySelectorAll('input');
    const descrição = entradaDescrição.value.trim();
    const quantidadeTexto = entradaQuantidade.value.trim();
    const preçoTexto = entradaPreço.value.trim();
    if (!descrição && !quantidadeTexto && !preçoTexto) continue; // linha em branco: ignorada
    if (!descrição) { mostrarErroDeCampo(entradaDescrição, 'Informe a descrição do item.'); válido = false; continue; }
    const quantidade = validarQuantidade(quantidadeTexto, { rótulo: `${descrição}: quantidade`, mínimo: 0.001, máximo: 1e6, casasMáximas: 3 });
    if (!quantidade.válido) { mostrarErroDeCampo(entradaQuantidade, quantidade.erro); válido = false; continue; }
    const preço = validarQuantidade(preçoTexto, { rótulo: `${descrição}: preço unitário`, mínimo: 0, máximo: 1e8, permitirZero: true, casasMáximas: 2 });
    if (!preço.válido) { mostrarErroDeCampo(entradaPreço, preço.erro); válido = false; continue; }
    itens.push({ descrição, quantidade: quantidade.valor, unidade: entradaUnidade.value.trim() || 'un.', preçoUnitárioEmCentavos: Math.round(preço.valor * 100) });
  }
  return válido ? itens : null;
}

const CAMPOS_POR_CHAVE = {
  'emissor.nome': 'emissor-nome',
  'emissor.contato': 'emissor-contato',
  'cliente.nome': 'cliente-nome',
  'título': 'título',
  'prazo': 'prazo',
  'observações': 'observações',
};

function mostrarErroDeMontagem(erro, chaveDeCampo) {
  const idDoCampo = CAMPOS_POR_CHAVE[chaveDeCampo];
  if (idDoCampo && campo(idDoCampo)) {
    mostrarErroDeCampo(campo(idDoCampo), erro);
    focarPrimeiroErro(formulário);
  } else {
    exibirMensagem(erro, { tipo: 'erro' });
  }
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(orçamento) {
  const totais = calcularTotaisDoOrçamento(orçamento);
  const valorPrincipal = resultado.querySelector('[data-total]');
  valorPrincipal.textContent = formatarCentavos(totais.totalEmCentavos);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  áreaDeImpressão.replaceChildren(renderizarOrçamento(orçamento));

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function textoDoOrçamento(orçamento) {
  const totais = calcularTotaisDoOrçamento(orçamento);
  const linhas = [
    orçamento.título,
    `Emitido por: ${orçamento.emissor.nome}${orçamento.emissor.contato ? ` (${orçamento.emissor.contato})` : ''}`,
    orçamento.cliente.nome ? `Para: ${orçamento.cliente.nome}` : null,
    '',
    ...totais.itens.map((item) => `${item.descrição} — ${formatarNúmero(item.quantidade, { casas: 3 })} ${item.unidade} × ${formatarCentavos(item.preçoUnitárioEmCentavos)} = ${formatarCentavos(item.subtotalEmCentavos)}`),
    '',
    totais.descontoEmCentavos ? `Subtotal: ${formatarCentavos(totais.subtotalEmCentavos)}` : null,
    totais.descontoEmCentavos ? `Desconto: − ${formatarCentavos(totais.descontoEmCentavos)}` : null,
    `Total estimado: ${formatarCentavos(totais.totalEmCentavos)}`,
    orçamento.prazo ? `Prazo: ${orçamento.prazo}` : null,
    orçamento.observações ? `Observações: ${orçamento.observações}` : null,
  ];
  return linhas.filter((texto) => texto !== null).join('\n');
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulário);

  const itens = lerItens();
  if (itens === null) {
    focarPrimeiroErro(formulário);
    return;
  }
  if (itens.length === 0) {
    exibirMensagem('Adicione ao menos um item (um material ou a mão de obra) ao orçamento.', { tipo: 'erro' });
    return;
  }
  const validade = campo('validade').value.trim();
  if (validade && !/^\d{1,3}$/.test(validade)) {
    mostrarErroDeCampo(campo('validade'), 'Use um número inteiro de dias, entre 1 e 365.');
    return;
  }
  const desconto = validarQuantidade(campo('desconto').value, { rótulo: 'Desconto', mínimo: 0, máximo: 1e8, permitirZero: true, casasMáximas: 2 });
  if (!desconto.válido) {
    mostrarErroDeCampo(campo('desconto'), desconto.erro);
    return;
  }

  const montado = montarOrçamento({
    emissor: { nome: campo('emissor-nome').value, contato: campo('emissor-contato').value },
    cliente: { nome: campo('cliente-nome').value },
    título: campo('título').value,
    itens,
    descontoEmCentavos: Math.round(desconto.valor * 100),
    observações: campo('observações').value,
    prazo: campo('prazo').value,
    validadeEmDias: validade ? Number(validade) : null,
  });
  if (!montado.válido) {
    mostrarErroDeMontagem(montado.erro, montado.campo);
    return;
  }

  orçamentoAtual = montado.orçamento;
  salvarDadosDoEmissor({ nome: campo('emissor-nome').value, contato: campo('emissor-contato').value });
  mostrarResultado(orçamentoAtual);
});

document.querySelector('[data-baixar-pdf]').addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  try {
    await baixarPdfDoOrçamento(orçamentoAtual);
  } catch {
    exibirMensagem('Não foi possível gerar o PDF agora.', { tipo: 'erro' });
  }
});

document.querySelector('[data-baixar-planilha]').addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  try {
    await baixarPlanilhaDoOrçamento(orçamentoAtual);
  } catch {
    exibirMensagem('Não foi possível gerar a planilha agora.', { tipo: 'erro' });
  }
});

document.querySelector('[data-imprimir]').addEventListener('click', () => {
  if (!orçamentoAtual) return;
  imprimirPágina();
});

document.querySelector('[data-copiar-texto]').addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  const copiou = await copiarTexto(textoDoOrçamento(orçamentoAtual));
  exibirMensagem(copiou ? 'Texto do orçamento copiado.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-compartilhar]').addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  const estadoDoCompartilhamento = await compartilharOrçamento(orçamentoAtual);
  if (estadoDoCompartilhamento === 'compartilhado') exibirMensagem('Orçamento compartilhado.', { tipo: 'sucesso' });
  else if (estadoDoCompartilhamento === 'copiado') exibirMensagem('Link do orçamento copiado.', { tipo: 'sucesso' });
  else if (estadoDoCompartilhamento === 'cancelado' || estadoDoCompartilhamento === 'manual') return;
  else exibirMensagem('Não foi possível compartilhar ou copiar o link agora.', { tipo: 'erro' });
});

const emissor = lerDadosDoEmissor();
campo('emissor-nome').value = emissor.nome;
campo('emissor-contato').value = emissor.contato;
novaLinhaDeItem();
