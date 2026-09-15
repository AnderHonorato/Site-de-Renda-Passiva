// Página "Orçamento ao cliente": monta itens editáveis, gera a prévia do documento e
// oferece baixar em PDF, baixar em planilha, imprimir, copiar texto e compartilhar link.
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
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
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const formulário = document.getElementById('formulário-orçamento');
const contêinerDeItens = document.querySelector('[data-linhas-de-itens]');
const botãoAdicionarItem = document.querySelector('[data-adicionar-item]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let contadorDeLinhas = 1;
let orçamentoAtual = null;

function criarLinhaDeItem(índice) {
  const sufixo = `${índice}-${contadorDeLinhas++}`;
  const rótuloDescrição = criarElemento('label', { texto: 'Item', atributos: { for: `item-descrição-${sufixo}` } });
  const entradaDescrição = criarElemento('input', { classe: 'entrada', atributos: { id: `item-descrição-${sufixo}`, type: 'text', maxlength: 120, placeholder: 'Ex.: Brigadeiro gourmet' }, dados: { campo: 'descrição' } });
  const rótuloQuantidade = criarElemento('label', { texto: 'Quantidade', atributos: { for: `item-quantidade-${sufixo}` } });
  const entradaQuantidade = criarElemento('input', { classe: 'entrada', atributos: { id: `item-quantidade-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 50' }, dados: { campo: 'quantidade' } });
  const rótuloUnidade = criarElemento('label', { texto: 'Unidade', atributos: { for: `item-unidade-${sufixo}` } });
  const entradaUnidade = criarElemento('input', { classe: 'entrada', atributos: { id: `item-unidade-${sufixo}`, type: 'text', maxlength: 12, placeholder: 'un.' }, dados: { campo: 'unidade' } });
  const rótuloPreço = criarElemento('label', { texto: 'Preço unitário (R$)', atributos: { for: `item-preço-${sufixo}` } });
  const entradaPreço = criarElemento('input', { classe: 'entrada', atributos: { id: `item-preço-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 2,29' }, dados: { campo: 'preço' } });
  // O ícone do sprite só é criado com createElementNS pelos módulos comuns; aqui, uma
  // linha adicionada dinamicamente usa um botão de texto para remover o item.
  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário', texto: 'Remover', atributos: { type: 'button', 'aria-label': 'Remover item' }, dados: { removerLinha: '' } });

  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [rótuloDescrição, entradaDescrição]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [rótuloQuantidade, entradaQuantidade]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [rótuloUnidade, entradaUnidade]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [rótuloPreço, entradaPreço]),
    botãoRemover,
  ]);
}

// A primeira linha já vem no HTML gerado; marca-a para o gerenciador de linhas.
contêinerDeItens.querySelector('.linha-editável')?.setAttribute('data-linha', '');
configurarLinhasEditáveis({ contêiner: contêinerDeItens, botãoAdicionar: botãoAdicionarItem, criarLinha: criarLinhaDeItem, mínimo: 1 });

function lerItens() {
  const linhas = [...contêinerDeItens.querySelectorAll('[data-linha]')];
  const itens = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const descrição = linha.querySelector('[data-campo="descrição"]').value.trim();
    const entradaQuantidade = linha.querySelector('[data-campo="quantidade"]');
    const unidade = linha.querySelector('[data-campo="unidade"]').value.trim();
    const entradaPreço = linha.querySelector('[data-campo="preço"]');

    if (!descrição && !entradaQuantidade.value.trim() && !entradaPreço.value.trim()) return; // linha em branco: ignora
    if (!descrição) {
      mostrarErroDeCampo(linha.querySelector('[data-campo="descrição"]'), `Item ${índice + 1}: informe uma descrição.`);
      válido = false;
      return;
    }
    const quantidade = validarQuantidade(entradaQuantidade.value, { rótulo: `Item ${índice + 1}, quantidade`, mínimo: 0.001, máximo: 1e6, casasMáximas: 3 });
    if (!quantidade.válido) {
      mostrarErroDeCampo(entradaQuantidade, quantidade.erro);
      válido = false;
      return;
    }
    const preço = validarQuantidade(entradaPreço.value, { rótulo: `Item ${índice + 1}, preço unitário`, mínimo: 0, máximo: 1e8, casasMáximas: 2 });
    if (!preço.válido) {
      mostrarErroDeCampo(entradaPreço, preço.erro);
      válido = false;
      return;
    }
    itens.push({ descrição, quantidade: quantidade.valor, unidade, preçoUnitárioEmCentavos: arredondarParaCentavos(preço.valor, 'próximo') });
  });
  if (!válido) return null;
  if (itens.length === 0) {
    mostrarErroDeCampo(campo('item-descrição-0') ?? contêinerDeItens, 'Adicione pelo menos um item com descrição, quantidade e preço.');
    return null;
  }
  return itens;
}

function lerDesconto() {
  const verificação = validarQuantidade(campo('desconto').value, { rótulo: 'Desconto', mínimo: 0, máximo: 1e8, casasMáximas: 2, obrigatório: false });
  if (!verificação.válido) {
    mostrarErroDeCampo(campo('desconto'), verificação.erro);
    return null;
  }
  return arredondarParaCentavos(verificação.valor ?? 0, 'próximo');
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
    orçamento.cliente.nome ? `Para: ${orçamento.cliente.nome}` : null,
    `De: ${orçamento.emissor.nome}${orçamento.emissor.contato ? ` (${orçamento.emissor.contato})` : ''}`,
    '',
    ...totais.itens.map((item) => `${formatarNúmero(item.quantidade, { casas: 3 })} ${item.unidade} × ${item.descrição} — ${formatarCentavos(item.subtotalEmCentavos)}`),
    '',
    totais.descontoEmCentavos ? `Subtotal: ${formatarCentavos(totais.subtotalEmCentavos)}` : null,
    totais.descontoEmCentavos ? `Desconto: − ${formatarCentavos(totais.descontoEmCentavos)}` : null,
    `Total: ${formatarCentavos(totais.totalEmCentavos)}`,
    orçamento.prazo ? `Prazo: ${orçamento.prazo}` : null,
    orçamento.observações ? `Observações: ${orçamento.observações}` : null,
  ];
  return linhas.filter((linha) => linha !== null).join('\n');
}

function gerarOrçamento() {
  limparErrosDeCampo(formulário);
  const itens = lerItens();
  const desconto = lerDesconto();
  const validade = lerValidade();
  const nomeDoEmissor = campo('emissor-nome').value.trim();
  if (!nomeDoEmissor) mostrarErroDeCampo(campo('emissor-nome'), 'Informe seu nome ou o nome do seu negócio.');
  if (!itens || desconto === null || !validade.ok || !nomeDoEmissor) {
    focarPrimeiroErro(formulário);
    return;
  }

  const montagem = montarOrçamento({
    emissor: { nome: nomeDoEmissor, contato: campo('emissor-contato').value.trim() },
    cliente: { nome: campo('cliente-nome').value.trim() },
    título: campo('título-orçamento').value.trim(),
    itens,
    descontoEmCentavos: desconto,
    observações: campo('observações').value.trim(),
    prazo: campo('prazo').value.trim(),
    validadeEmDias: validade.valor ?? null,
  });

  if (!montagem.válido) {
    exibirMensagem(montagem.erro, { tipo: 'erro' });
    return;
  }

  orçamentoAtual = montagem.orçamento;
  salvarDadosDoEmissor({ nome: nomeDoEmissor, contato: campo('emissor-contato').value.trim() });

  const contêinerDoDocumento = resultado.querySelector('[data-documento]');
  contêinerDoDocumento.replaceChildren(renderizarOrçamento(orçamentoAtual));
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
  const resultadoDoCompartilhamento = await compartilharOrçamento(orçamentoAtual);
  // 'manual': o próprio componente comum abriu o link para cópia manual; nada a
  // exibir aqui. 'cancelado': a pessoa fechou o menu nativo de compartilhamento.
  if (resultadoDoCompartilhamento === 'cancelado' || resultadoDoCompartilhamento === 'manual') return;
  const mensagens = {
    compartilhado: { texto: 'Orçamento compartilhado.', tipo: 'sucesso' },
    copiado: { texto: 'Link do orçamento copiado.', tipo: 'sucesso' },
    falhou: { texto: 'Não foi possível compartilhar ou copiar o link agora.', tipo: 'erro' },
  };
  const mensagem = mensagens[resultadoDoCompartilhamento];
  if (mensagem) exibirMensagem(mensagem.texto, { tipo: mensagem.tipo });
});

const dadosDoEmissor = lerDadosDoEmissor();
if (dadosDoEmissor.nome) campo('emissor-nome').value = dadosDoEmissor.nome;
if (dadosDoEmissor.contato) campo('emissor-contato').value = dadosDoEmissor.contato;
