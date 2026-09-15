// Página "Lista de compras da produção": soma os ingredientes de várias receitas
// salvas × lotes, calcula embalagens inteiras a comprar, custo e sobra; permite
// copiar a lista em texto e imprimir uma versão limpa.
import { listarRegistrosLocais } from '../comum/armazenamento/listar-registros-locais.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { agregarItensDeProdução } from '../cálculos/agregar-itens-de-produção.js';
import { calcularListaDeCompras } from '../cálculos/calcular-lista-de-compras.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const formulário = document.getElementById('formulário-produção');
const contêinerDeLinhas = document.querySelector('[data-linhas-de-produção]');
const botãoAdicionar = document.querySelector('[data-adicionar-produção]');
const avisoSemReceitas = document.querySelector('[data-sem-receitas]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
let contadorDeLinhas = 0;
let últimoResultado = null;

const receitasSalvas = listarRegistrosLocais('receitas');

function criarLinhaDeProdução() {
  const sufixo = contadorDeLinhas++;
  const seleçãoDeReceita = criarElemento(
    'select',
    { classe: 'entrada seleção', atributos: { id: `produção-receita-${sufixo}` }, dados: { campo: 'receita' } },
    receitasSalvas.map((receita) => criarElemento('option', { texto: `${receita.nome} (rende ${receita.rendimentoAproveitável})`, atributos: { value: receita.id } })),
  );
  const campoReceita = criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Receita', atributos: { for: `produção-receita-${sufixo}` } }), seleçãoDeReceita]);

  const entradaLotes = criarElemento('input', { classe: 'entrada', atributos: { id: `produção-lotes-${sufixo}`, type: 'text', inputmode: 'numeric', placeholder: 'Ex.: 2' }, dados: { campo: 'lotes' } });
  const campoLotes = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Lotes', atributos: { for: `produção-lotes-${sufixo}` } }), entradaLotes]);

  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário', texto: 'Remover', atributos: { type: 'button', 'aria-label': 'Remover receita da lista' }, dados: { removerLinha: '' } });

  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [campoReceita, campoLotes, botãoRemover]);
}

if (receitasSalvas.length === 0) {
  avisoSemReceitas.hidden = false;
  botãoAdicionar.disabled = true;
} else {
  const gerenciador = configurarLinhasEditáveis({ contêiner: contêinerDeLinhas, botãoAdicionar, criarLinha: criarLinhaDeProdução, mínimo: 1 });
  gerenciador.adicionarLinha();
}

function linhaDaTabela(item) {
  return criarElemento('tr', {}, [
    criarElemento('td', { texto: item.nome }),
    criarElemento('td', { texto: `${formatarNúmero(item.quantidadeNecessária, { casas: 3 })} ${item.unidadeNecessária}` }),
    criarElemento('td', { texto: `${item.pacotes} × ${formatarNúmero(item.quantidadeComprada, { casas: 3 })} ${item.unidadeComprada}` }),
    criarElemento('td', { texto: formatarMoeda(item.custoDosPacotes) }),
    criarElemento('td', { texto: `${formatarMoeda(item.sobraEmReais)} (${formatarNúmero(item.sobraNaUnidadeComprada, { casas: 2 })} ${item.unidadeComprada})` }),
  ]);
}

function textoDaLista(cálculo) {
  const linhas = [
    'Lista de compras da produção',
    '',
    ...cálculo.itens.map((item) => `${item.nome}: ${item.pacotes} × ${formatarNúmero(item.quantidadeComprada, { casas: 3 })} ${item.unidadeComprada} — ${formatarMoeda(item.custoDosPacotes)}`),
    '',
    `Custo total: ${formatarMoeda(cálculo.custoTotal)}`,
  ];
  return linhas.join('\n');
}

function calcular() {
  limparErrosDeCampo(formulário);
  const linhasDeProdução = [];
  let válido = true;

  for (const linha of contêinerDeLinhas.querySelectorAll('[data-linha]')) {
    const seleçãoDeReceita = linha.querySelector('[data-campo="receita"]');
    const entradaLotes = linha.querySelector('[data-campo="lotes"]');
    const receita = lerRegistroLocal('receitas', seleçãoDeReceita.value);
    if (!receita) {
      mostrarErroDeCampo(seleçãoDeReceita, 'Escolha uma receita salva válida.');
      válido = false;
      continue;
    }
    const lotes = validarQuantidade(entradaLotes.value, { rótulo: `${receita.nome}: lotes`, mínimo: 1, máximo: 10000, inteiro: true });
    if (!lotes.válido) {
      mostrarErroDeCampo(entradaLotes, lotes.erro);
      válido = false;
      continue;
    }
    linhasDeProdução.push({ nomeDaReceita: receita.nome, lotes: lotes.valor, ingredientes: receita.ingredientes });
  }

  if (!válido) return;
  if (linhasDeProdução.length === 0) {
    exibirMensagem('Adicione pelo menos uma receita à produção.', { tipo: 'erro' });
    return;
  }

  const agregado = agregarItensDeProdução({ linhas: linhasDeProdução });
  if (!agregado.válido) {
    exibirMensagem(agregado.erro, { tipo: 'erro' });
    return;
  }
  const cálculo = calcularListaDeCompras({ itens: agregado.itens });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  últimoResultado = cálculo;
  resultado.querySelector('[data-custo-total]').textContent = formatarMoeda(cálculo.custoTotal);
  resultado.querySelector('[data-corpo-da-tabela]').replaceChildren(...cálculo.itens.map(linhaDaTabela));
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  if (!últimoResultado) return;
  const copiou = await copiarTexto(textoDaLista(últimoResultado));
  exibirMensagem(copiou ? 'Lista copiada.' : 'Não foi possível copiar automaticamente. Selecione e copie manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());
