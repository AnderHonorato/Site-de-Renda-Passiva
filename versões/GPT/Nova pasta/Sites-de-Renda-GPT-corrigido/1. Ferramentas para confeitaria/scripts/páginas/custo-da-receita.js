// Página "Custo da receita": ingredientes em linhas editáveis, cálculo de custo
// consumido/estoque/dinheiro necessário, exemplos prontos (preços em branco) e
// salvar/reabrir a receita neste aparelho (coleção "receitas").
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularCustoDaReceita } from '../cálculos/calcular-custo-da-receita.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const UNIDADES = ['g', 'kg', 'ml', 'L', 'unidade'];

const EXEMPLOS = {
  brigadeiro: {
    nome: 'Brigadeiro gourmet',
    rendimento: 30,
    tempo: 40,
    ingredientes: [
      { nome: 'Leite condensado', quantidadeComprada: 1, unidadeComprada: 'unidade', quantidadeUsada: 1, unidadeUsada: 'unidade' },
      { nome: 'Chocolate em pó 50%', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 60, unidadeUsada: 'g' },
      { nome: 'Manteiga sem sal', quantidadeComprada: 500, unidadeComprada: 'g', quantidadeUsada: 20, unidadeUsada: 'g' },
      { nome: 'Granulado para cobertura', quantidadeComprada: 500, unidadeComprada: 'g', quantidadeUsada: 100, unidadeUsada: 'g' },
    ],
  },
  brownie: {
    nome: 'Brownie tradicional',
    rendimento: 16,
    tempo: 50,
    ingredientes: [
      { nome: 'Chocolate meio amargo', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 200, unidadeUsada: 'g' },
      { nome: 'Manteiga sem sal', quantidadeComprada: 500, unidadeComprada: 'g', quantidadeUsada: 100, unidadeUsada: 'g' },
      { nome: 'Açúcar refinado', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 200, unidadeUsada: 'g' },
      { nome: 'Farinha de trigo', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 100, unidadeUsada: 'g' },
      { nome: 'Ovos', quantidadeComprada: 12, unidadeComprada: 'unidade', quantidadeUsada: 3, unidadeUsada: 'unidade' },
    ],
  },
  'bolo-de-pote': {
    nome: 'Bolo de pote',
    rendimento: 20,
    tempo: 90,
    ingredientes: [
      { nome: 'Farinha de trigo', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 300, unidadeUsada: 'g' },
      { nome: 'Açúcar refinado', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 300, unidadeUsada: 'g' },
      { nome: 'Leite', quantidadeComprada: 1, unidadeComprada: 'L', quantidadeUsada: 250, unidadeUsada: 'ml' },
      { nome: 'Ovos', quantidadeComprada: 12, unidadeComprada: 'unidade', quantidadeUsada: 3, unidadeUsada: 'unidade' },
      { nome: 'Doce de leite (recheio)', quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 400, unidadeUsada: 'g' },
      { nome: 'Potinho descartável com tampa', quantidadeComprada: 50, unidadeComprada: 'unidade', quantidadeUsada: 20, unidadeUsada: 'unidade' },
    ],
  },
};

const formulário = document.getElementById('formulário-receita');
const formulárioDeSalvar = document.getElementById('formulário-salvar-receita');
const contêinerDeIngredientes = document.querySelector('[data-linhas-de-ingredientes]');
const botãoAdicionarIngrediente = document.querySelector('[data-adicionar-ingrediente]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let contadorDeLinhas = 2;
let registroAtual = null;
let últimasEntradas = null;

function opção(valor, selecionado) {
  return criarElemento('option', { texto: valor, atributos: { value: valor, selected: selecionado ? true : undefined } });
}

function seleçãoDeUnidade(id, unidadePadrão) {
  return criarElemento('select', { classe: 'entrada seleção', atributos: { id }, dados: {} }, UNIDADES.map((unidade) => opção(unidade, unidade === unidadePadrão)));
}

function criarLinhaDeIngrediente() {
  const sufixo = contadorDeLinhas++;
  const linha = criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } });

  const campoNome = criarElemento('div', { classe: 'campo' }, [
    criarElemento('label', { texto: 'Ingrediente', atributos: { for: `ingrediente-nome-${sufixo}` } }),
    criarElemento('input', { classe: 'entrada', atributos: { id: `ingrediente-nome-${sufixo}`, type: 'text', maxlength: 80, placeholder: 'Ex.: Farinha de trigo' }, dados: { campo: 'nome' } }),
  ]);
  const campoPreço = criarElemento('div', { classe: 'campo campo-estreito' }, [
    criarElemento('label', { texto: 'Preço pago (R$)', atributos: { for: `ingrediente-preço-${sufixo}` } }),
    criarElemento('input', { classe: 'entrada', atributos: { id: `ingrediente-preço-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 6,50' }, dados: { campo: 'preço' } }),
  ]);
  const campoQtdComprada = criarElemento('div', { classe: 'campo campo-estreito' }, [
    criarElemento('label', { texto: 'Qtde. comprada', atributos: { for: `ingrediente-qtd-comprada-${sufixo}` } }),
    criarElemento('input', { classe: 'entrada', atributos: { id: `ingrediente-qtd-comprada-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 1' }, dados: { campo: 'quantidade-comprada' } }),
  ]);
  const seleçãoComprada = seleçãoDeUnidade(`ingrediente-un-comprada-${sufixo}`, 'g');
  seleçãoComprada.dataset.campo = 'unidade-comprada';
  const campoUnComprada = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Unidade comprada', atributos: { for: `ingrediente-un-comprada-${sufixo}` } }), seleçãoComprada]);

  const campoQtdUsada = criarElemento('div', { classe: 'campo campo-estreito' }, [
    criarElemento('label', { texto: 'Qtde. usada', atributos: { for: `ingrediente-qtd-usada-${sufixo}` } }),
    criarElemento('input', { classe: 'entrada', atributos: { id: `ingrediente-qtd-usada-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 1' }, dados: { campo: 'quantidade-usada' } }),
  ]);
  const seleçãoUsada = seleçãoDeUnidade(`ingrediente-un-usada-${sufixo}`, 'g');
  seleçãoUsada.dataset.campo = 'unidade-usada';
  const campoUnUsada = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Unidade usada', atributos: { for: `ingrediente-un-usada-${sufixo}` } }), seleçãoUsada]);

  // O ícone do sprite só é criado com createElementNS pelos módulos comuns (ver
  // exibir-mensagem.js); uma linha criada por script usa um botão de texto.
  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário', texto: 'Remover', atributos: { type: 'button', 'aria-label': 'Remover ingrediente' }, dados: { removerLinha: '' } });

  linha.append(campoNome, campoPreço, campoQtdComprada, campoUnComprada, campoQtdUsada, campoUnUsada, botãoRemover);
  return linha;
}

const gerenciadorDeIngredientes = configurarLinhasEditáveis({
  contêiner: contêinerDeIngredientes,
  botãoAdicionar: botãoAdicionarIngrediente,
  criarLinha: criarLinhaDeIngrediente,
  mínimo: 1,
});

function preencherLinhaDeIngrediente(linha, dados) {
  linha.querySelector('[data-campo="nome"]').value = dados.nome ?? '';
  linha.querySelector('[data-campo="preço"]').value = dados.preçoComprado !== undefined ? String(dados.preçoComprado).replace('.', ',') : '';
  linha.querySelector('[data-campo="quantidade-comprada"]').value = dados.quantidadeComprada !== undefined ? String(dados.quantidadeComprada).replace('.', ',') : '';
  linha.querySelector('[data-campo="unidade-comprada"]').value = dados.unidadeComprada ?? 'g';
  linha.querySelector('[data-campo="quantidade-usada"]').value = dados.quantidadeUsada !== undefined ? String(dados.quantidadeUsada).replace('.', ',') : '';
  linha.querySelector('[data-campo="unidade-usada"]').value = dados.unidadeUsada ?? 'g';
}

function limparLinhasDeIngredientes() {
  for (const linha of [...contêinerDeIngredientes.querySelectorAll('[data-linha]')]) linha.remove();
}

function usarExemplo(chave) {
  const exemplo = EXEMPLOS[chave];
  if (!exemplo) return;
  limparLinhasDeIngredientes();
  campo('nome-da-receita').value = exemplo.nome;
  campo('rendimento').value = String(exemplo.rendimento);
  campo('tempo-de-preparo').value = String(exemplo.tempo ?? 0);
  campo('valor-da-hora').value = '0';
  campo('embalagem-de-venda').value = '0';
  campo('custos-adicionais').value = '0';
  for (const ingrediente of exemplo.ingredientes) {
    const linha = gerenciadorDeIngredientes.adicionarLinha();
    preencherLinhaDeIngrediente(linha, ingrediente);
  }
  limparErrosDeCampo(formulário);
  estadoVazio.hidden = false;
  resultado.hidden = true;
  exibirMensagem(`Exemplo "${exemplo.nome}" carregado com os preços em branco. Preencha o que você paga antes de calcular.`, { tipo: 'informação' });
}

for (const botão of document.querySelectorAll('[data-exemplo]')) {
  botão.addEventListener('click', () => usarExemplo(botão.dataset.exemplo));
}

function lerIngredientes() {
  const linhas = [...contêinerDeIngredientes.querySelectorAll('[data-linha]')];
  const ingredientes = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaNome = linha.querySelector('[data-campo="nome"]');
    const entradaPreço = linha.querySelector('[data-campo="preço"]');
    const entradaQtdComprada = linha.querySelector('[data-campo="quantidade-comprada"]');
    const seleçãoUnComprada = linha.querySelector('[data-campo="unidade-comprada"]');
    const entradaQtdUsada = linha.querySelector('[data-campo="quantidade-usada"]');
    const seleçãoUnUsada = linha.querySelector('[data-campo="unidade-usada"]');
    const nome = entradaNome.value.trim();
    if (!nome) {
      mostrarErroDeCampo(entradaNome, `Ingrediente ${índice + 1}: informe um nome.`);
      válido = false;
      return;
    }
    const preço = validarQuantidade(entradaPreço.value, { rótulo: `${nome}: preço pago`, mínimo: 0.01, máximo: 1e7, casasMáximas: 2 });
    if (!preço.válido) {
      mostrarErroDeCampo(entradaPreço, preço.erro);
      válido = false;
      return;
    }
    const quantidadeComprada = validarQuantidade(entradaQtdComprada.value, { rótulo: `${nome}: quantidade comprada`, mínimo: 0.0001, máximo: 1e7, casasMáximas: 4 });
    if (!quantidadeComprada.válido) {
      mostrarErroDeCampo(entradaQtdComprada, quantidadeComprada.erro);
      válido = false;
      return;
    }
    const quantidadeUsada = validarQuantidade(entradaQtdUsada.value, { rótulo: `${nome}: quantidade usada`, mínimo: 0.0001, máximo: 1e7, casasMáximas: 4 });
    if (!quantidadeUsada.válido) {
      mostrarErroDeCampo(entradaQtdUsada, quantidadeUsada.erro);
      válido = false;
      return;
    }
    ingredientes.push({
      nome,
      preçoComprado: preço.valor,
      quantidadeComprada: quantidadeComprada.valor,
      unidadeComprada: seleçãoUnComprada.value,
      quantidadeUsada: quantidadeUsada.valor,
      unidadeUsada: seleçãoUnUsada.value,
    });
  });
  if (!válido) return null;
  if (ingredientes.length === 0) {
    exibirMensagem('Adicione pelo menos um ingrediente.', { tipo: 'erro' });
    return null;
  }
  return ingredientes;
}

const regrasNuméricas = {
  rendimento: { rótulo: 'Rendimento aproveitável', mínimo: 1, máximo: 100000, inteiro: true },
  'embalagem-de-venda': { rótulo: 'Embalagem de venda por unidade', mínimo: 0, máximo: 1e6, casasMáximas: 2 },
  'tempo-de-preparo': { rótulo: 'Tempo de preparo', mínimo: 0, máximo: 100000, inteiro: true },
  'valor-da-hora': { rótulo: 'Valor da hora', mínimo: 0, máximo: 1e6, casasMáximas: 2 },
  'custos-adicionais': { rótulo: 'Custos adicionais', mínimo: 0, máximo: 1e7, casasMáximas: 2 },
};

function lerEntradas() {
  limparErrosDeCampo(formulário);
  const nome = campo('nome-da-receita').value.trim();
  if (!nome) mostrarErroDeCampo(campo('nome-da-receita'), 'Dê um nome para a receita.');

  const valores = {};
  let válido = Boolean(nome);
  for (const [id, regra] of Object.entries(regrasNuméricas)) {
    const verificação = validarQuantidade(campo(id).value, regra);
    if (!verificação.válido) {
      mostrarErroDeCampo(campo(id), verificação.erro);
      válido = false;
    } else {
      valores[id] = verificação.valor;
    }
  }

  const ingredientes = lerIngredientes();
  if (!ingredientes) válido = false;
  if (!válido) return null;

  return {
    nome,
    ingredientes,
    rendimentoAproveitável: valores.rendimento,
    embalagemDeVendaPorUnidade: valores['embalagem-de-venda'],
    tempoDePreparoEmMinutos: valores['tempo-de-preparo'],
    valorDaHora: valores['valor-da-hora'],
    custosAdicionais: valores['custos-adicionais'],
  };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-custo-por-unidade]');
  valorPrincipal.textContent = formatarMoeda(cálculo.custoPorUnidade);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Custo consumido total', formatarMoeda(cálculo.custoConsumidoTotal)),
    linha('Custo de estoque (embalagens que sobram)', formatarMoeda(cálculo.custoDeEstoqueTotal)),
    linha('Dinheiro necessário para comprar tudo em embalagens inteiras', formatarMoeda(cálculo.dinheiroNecessárioTotal)),
    linha('Mão de obra', formatarMoeda(cálculo.custoDaMãoDeObra)),
    linha('Embalagens de venda', formatarMoeda(cálculo.custoDasEmbalagensDeVenda)),
  );

  resultado.querySelector('[data-corpo-da-tabela]').replaceChildren(
    ...cálculo.ingredientesCalculados.map((item) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: item.nome }),
        criarElemento('td', { texto: formatarMoeda(item.custoConsumido) }),
        criarElemento('td', { texto: String(item.pacotesNecessários) }),
        criarElemento('td', { texto: formatarMoeda(item.custoDeEstoque) }),
      ]),
    ),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    ...cálculo.ingredientesCalculados.map((item) =>
      criarElemento('li', { texto: `${item.nome}: custo consumido ${formatarMoeda(item.custoConsumido)} (proporcional); ${item.pacotesNecessários} embalagem(ns) inteira(s) custariam ${formatarMoeda(item.dinheiroNecessário)}, sobrando ${formatarMoeda(item.custoDeEstoque)} em estoque.` }),
    ),
    criarElemento('li', { texto: `Mão de obra: ${formatarNúmero(entradas.tempoDePreparoEmMinutos, { casas: 0 })} min ÷ 60 × ${formatarMoeda(entradas.valorDaHora)} = ${formatarMoeda(cálculo.custoDaMãoDeObra)}.` }),
    criarElemento('li', { texto: `Custo consumido total ÷ rendimento = ${formatarMoeda(cálculo.custoConsumidoTotal)} ÷ ${entradas.rendimentoAproveitável} = ${formatarMoeda(cálculo.custoPorUnidade)} por unidade.` }),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularCustoDaReceita(entradas);
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencherFormulário(registro) {
  campo('nome-da-receita').value = registro.nome;
  campo('rendimento').value = String(registro.rendimentoAproveitável);
  campo('embalagem-de-venda').value = String(registro.embalagemDeVendaPorUnidade).replace('.', ',');
  campo('tempo-de-preparo').value = String(registro.tempoDePreparoEmMinutos);
  campo('valor-da-hora').value = String(registro.valorDaHora).replace('.', ',');
  campo('custos-adicionais').value = String(registro.custosAdicionais).replace('.', ',');
  limparLinhasDeIngredientes();
  for (const ingrediente of registro.ingredientes) {
    const linhaAdicionada = gerenciadorDeIngredientes.adicionarLinha();
    preencherLinhaDeIngrediente(linhaAdicionada, ingrediente);
  }
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal('receitas', { ...(registroAtual ?? {}), ...últimasEntradas });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Receita salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal('receitas', idSalvo);
  if (registro) {
    registroAtual = registro;
    preencherFormulário(registro);
    calcular();
  } else {
    exibirMensagem('A receita salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}
