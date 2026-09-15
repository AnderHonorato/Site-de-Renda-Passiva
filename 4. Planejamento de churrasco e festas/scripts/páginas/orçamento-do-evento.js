// Página "Orçamento do evento": soma compras e serviços informados, acrescenta uma
// reserva percentual de imprevistos como um item do próprio orçamento, e usa o
// componente comum de orçamento para baixar em PDF, baixar em planilha, imprimir e
// compartilhar um link com quem vai dividir os custos.
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { montarOrçamento } from '../comum/orçamento/montar-orçamento.js';
import { calcularTotaisDoOrçamento } from '../comum/orçamento/calcular-totais-do-orçamento.js';
import { renderizarOrçamento } from '../comum/orçamento/renderizar-orçamento.js';
import { baixarPdfDoOrçamento } from '../comum/orçamento/baixar-pdf-do-orçamento.js';
import { baixarPlanilhaDoOrçamento } from '../comum/orçamento/baixar-planilha-do-orçamento.js';
import { compartilharOrçamento } from '../comum/orçamento/compartilhar-orçamento.js';
import { lerDadosDoEmissor } from '../comum/orçamento/ler-dados-do-emissor.js';
import { salvarDadosDoEmissor } from '../comum/orçamento/salvar-dados-do-emissor.js';
import { calcularOrçamentoDoEvento } from '../cálculos/calcular-orçamento-do-evento.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const formulário = document.getElementById('formulário-orçamento');
const contêinerDeItens = document.querySelector('[data-linhas-de-itens]');
const botãoAdicionarItem = document.querySelector('[data-adicionar-item]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let contador = 1;
let orçamentoAtual = null;

function criarLinhaDeItem() {
  const sufixo = `item-${contador++}`;
  const entradaDescrição = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-descrição`, type: 'text', maxlength: 120, placeholder: 'Ex.: Buffet de carnes' }, dados: { campo: 'descrição' } });
  const seleçãoCategoria = criarElemento('select', { classe: 'entrada seleção', atributos: { id: `${sufixo}-categoria` }, dados: { campo: 'categoria' } }, [
    criarElemento('option', { texto: 'Compra', atributos: { value: 'compra' } }),
    criarElemento('option', { texto: 'Serviço', atributos: { value: 'serviço' } }),
  ]);
  const entradaValor = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-valor`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 250,00' }, dados: { campo: 'valor' } });
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover item' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Descrição do item', atributos: { for: `${sufixo}-descrição` } }), entradaDescrição]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Categoria', atributos: { for: `${sufixo}-categoria` } }), seleçãoCategoria]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Valor (R$)', atributos: { for: `${sufixo}-valor` } }), entradaValor]),
    botãoRemover,
  ]);
}

contêinerDeItens.querySelector('.linha-editável')?.setAttribute('data-linha', '');
configurarLinhasEditáveis({ contêiner: contêinerDeItens, botãoAdicionar: botãoAdicionarItem, criarLinha: criarLinhaDeItem, mínimo: 1 });

function lerItens() {
  const linhas = [...contêinerDeItens.querySelectorAll('[data-linha]')];
  const itens = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaDescrição = linha.querySelector('[data-campo="descrição"]');
    const entradaValor = linha.querySelector('[data-campo="valor"]');
    const categoria = linha.querySelector('[data-campo="categoria"]').value;
    if (!entradaDescrição.value.trim() && !entradaValor.value.trim()) return;
    if (!entradaDescrição.value.trim()) {
      mostrarErroDeCampo(entradaDescrição, `Item ${índice + 1}: informe uma descrição.`);
      válido = false;
      return;
    }
    const valor = validarQuantidade(entradaValor.value, { rótulo: `Item ${índice + 1}, valor`, mínimo: 0, máximo: 1e8, casasMáximas: 2 });
    if (!valor.válido) {
      mostrarErroDeCampo(entradaValor, valor.erro);
      válido = false;
      return;
    }
    itens.push({ descrição: entradaDescrição.value.trim(), categoria, valor: valor.valor });
  });
  if (!válido) return null;
  if (itens.length === 0) {
    exibirMensagem('Adicione ao menos um item de compra ou serviço.', { tipo: 'erro' });
    return null;
  }
  return itens;
}

function lerReserva() {
  const verificação = validarQuantidade(campo('reserva').value, { rótulo: 'Reserva de imprevistos', mínimo: 0, máximo: 99.99, casasMáximas: 2 });
  if (!verificação.válido) {
    mostrarErroDeCampo(campo('reserva'), verificação.erro);
    return null;
  }
  return verificação.valor;
}

function lerValidade() {
  const verificação = validarQuantidade(campo('validade').value, { rótulo: 'Validade', mínimo: 1, máximo: 365, inteiro: true, obrigatório: false });
  if (!verificação.válido) {
    mostrarErroDeCampo(campo('validade'), verificação.erro);
    return { ok: false };
  }
  return { ok: true, valor: verificação.valor };
}

function textoDoOrçamento(orçamento) {
  const totais = calcularTotaisDoOrçamento(orçamento);
  const linhas = [
    orçamento.título,
    `De: ${orçamento.emissor.nome}${orçamento.emissor.contato ? ` (${orçamento.emissor.contato})` : ''}`,
    '',
    ...totais.itens.map((item) => `${item.descrição} — ${formatarCentavos(item.subtotalEmCentavos)}`),
    '',
    `Total: ${formatarCentavos(totais.totalEmCentavos)}`,
    orçamento.observações ? `Observações: ${orçamento.observações}` : null,
  ];
  return linhas.filter((linha) => linha !== null).join('\n');
}

function esconderResultado() {
  resultado.hidden = true;
  estadoVazio.hidden = false;
}

function gerarOrçamento() {
  limparErrosDeCampo(formulário);
  const itens = lerItens();
  const reservaPercentual = lerReserva();
  const validade = lerValidade();
  const nomeDoEmissor = campo('emissor-nome').value.trim();
  if (!nomeDoEmissor) mostrarErroDeCampo(campo('emissor-nome'), 'Informe seu nome ou o nome de quem organiza.');
  if (!itens || reservaPercentual === null || !validade.ok || !nomeDoEmissor) {
    esconderResultado();
    focarPrimeiroErro(formulário);
    return;
  }

  const cálculo = calcularOrçamentoDoEvento({ itens, reservaPercentual });
  if (!cálculo.válido) {
    esconderResultado();
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  const itensDoOrçamento = cálculo.itens.map((item) => ({ descrição: `${item.descrição}${item.categoria === 'serviço' ? ' (serviço)' : ''}`, quantidade: 1, unidade: 'verba', preçoUnitárioEmCentavos: item.valorEmCentavos }));
  if (cálculo.reservaEmCentavos > 0) {
    itensDoOrçamento.push({ descrição: `Reserva de imprevistos (${formatarNúmero(reservaPercentual, { casas: 2 })}%)`, quantidade: 1, unidade: 'verba', preçoUnitárioEmCentavos: cálculo.reservaEmCentavos });
  }

  const montagem = montarOrçamento({
    emissor: { nome: nomeDoEmissor, contato: campo('emissor-contato').value.trim() },
    cliente: { nome: campo('cliente-nome').value.trim() },
    título: campo('título-orçamento').value.trim() || 'Orçamento do evento',
    itens: itensDoOrçamento,
    descontoEmCentavos: 0,
    observações: campo('observações').value.trim(),
    prazo: campo('prazo').value.trim(),
    validadeEmDias: validade.valor ?? null,
  });

  if (!montagem.válido) {
    esconderResultado();
    exibirMensagem(montagem.erro, { tipo: 'erro' });
    return;
  }

  orçamentoAtual = montagem.orçamento;
  salvarDadosDoEmissor({ nome: nomeDoEmissor, contato: campo('emissor-contato').value.trim() });

  resultado.querySelector('[data-documento]').replaceChildren(renderizarOrçamento(orçamentoAtual));
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  gerarOrçamento();
});

document.querySelector('[data-baixar-pdf]')?.addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  try {
    await baixarPdfDoOrçamento(orçamentoAtual);
  } catch {
    exibirMensagem('Não foi possível gerar o PDF agora.', { tipo: 'erro' });
  }
});

document.querySelector('[data-baixar-planilha]')?.addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  try {
    await baixarPlanilhaDoOrçamento(orçamentoAtual);
  } catch {
    exibirMensagem('Não foi possível gerar a planilha agora.', { tipo: 'erro' });
  }
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  const copiou = await copiarTexto(textoDoOrçamento(orçamentoAtual));
  exibirMensagem(copiou ? 'Texto do orçamento copiado.' : 'Não foi possível copiar automaticamente. Selecione e copie manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-compartilhar]')?.addEventListener('click', async () => {
  if (!orçamentoAtual) return;
  const estadoDoCompartilhamento = await compartilharOrçamento(orçamentoAtual);
  if (estadoDoCompartilhamento === 'compartilhado') exibirMensagem('Orçamento compartilhado.', { tipo: 'sucesso' });
  else if (estadoDoCompartilhamento === 'copiado') exibirMensagem('Link do orçamento copiado.', { tipo: 'sucesso' });
  else if (estadoDoCompartilhamento === 'cancelado' || estadoDoCompartilhamento === 'manual') return;
  else exibirMensagem('Não foi possível compartilhar ou copiar o link agora.', { tipo: 'erro' });
});

const dadosDoEmissor = lerDadosDoEmissor();
if (dadosDoEmissor.nome) campo('emissor-nome').value = dadosDoEmissor.nome;
if (dadosDoEmissor.contato) campo('emissor-contato').value = dadosDoEmissor.contato;
