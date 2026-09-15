// Página "Preço de venda": lê o formulário, valida, calcula, mostra resultado com
// memória de cálculo e permite salvar/reabrir o cálculo neste aparelho.
// Também permite preencher custo e quantidade a partir de uma receita salva na
// ferramenta "Custo da receita" (ferramentas conectadas), sem obrigar o uso conectado.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { listarRegistrosLocais } from '../comum/armazenamento/listar-registros-locais.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPreçoDeVenda } from '../cálculos/calcular-preço-de-venda.js';
import { calcularCustoDaReceita } from '../cálculos/calcular-custo-da-receita.js';

const COLEÇÃO = 'precificações';
const formulário = document.getElementById('formulário-preço');
const formulárioDeSalvar = document.getElementById('formulário-salvar-preço');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let registroAtual = null;
let últimasEntradas = null;

const regras = {
  'custo-total': { rótulo: 'Custo total do lote', mínimo: 0.01, máximo: 1e9, permitirZero: false, casasMáximas: 2 },
  quantidade: { rótulo: 'Quantidade', mínimo: 1, máximo: 1e6, inteiro: true },
  margem: { rótulo: 'Margem', mínimo: 0, máximo: 99.99, casasMáximas: 2 },
  taxas: { rótulo: 'Taxas', mínimo: 0, máximo: 99.99, casasMáximas: 2 },
};

function lerEntradas() {
  limparErrosDeCampo(formulário);
  const valores = {};
  let válido = true;
  for (const [id, regra] of Object.entries(regras)) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, regra);
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valores[id] = verificação.valor;
    }
  }
  if (!válido) return null;
  return {
    custoTotal: valores['custo-total'],
    quantidade: valores.quantidade,
    margemPercentual: valores.margem,
    taxasPercentuais: valores.taxas,
    modoDeArredondamento: campo('arredondamento').value === 'próximo' ? 'próximo' : 'acima',
  };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const percentual = (valor) => `${formatarNúmero(valor, { casas: 2 })}%`;
  const valorPrincipal = resultado.querySelector('[data-preço-unitário]');
  valorPrincipal.textContent = formatarCentavos(cálculo.preçoUnitárioEmCentavos);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Preço do lote', formatarCentavos(cálculo.preçoDoLoteEmCentavos)),
    linha('Custo por unidade', formatarMoeda(cálculo.custoUnitário)),
    linha('Taxas sobre o lote', formatarMoeda(cálculo.valorDasTaxas)),
    linha('Margem após arredondamento', `${formatarMoeda(cálculo.margemEmReais)} (${percentual(cálculo.margemRealPercentual)})`),
    linha('Acréscimo sobre o custo', percentual(cálculo.acréscimoSobreCustoPercentual)),
  );

  const denominador = formatarNúmero(1 - entradas.margemPercentual / 100 - entradas.taxasPercentuais / 100, { casas: 4 });
  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Preço do lote = custo ÷ (1 − margem − taxas) = ${formatarMoeda(entradas.custoTotal)} ÷ ${denominador} = R$ ${formatarNúmero(cálculo.preçoDoLoteMatemático, { casas: 4 })}.` }),
    criarElemento('li', { texto: `Por unidade: R$ ${formatarNúmero(cálculo.preçoDoLoteMatemático, { casas: 4 })} ÷ ${entradas.quantidade} = R$ ${formatarNúmero(cálculo.preçoUnitárioMatemático, { casas: 4 })}.` }),
    criarElemento('li', {
      texto: `Arredondado ${entradas.modoDeArredondamento === 'acima' ? 'para cima' : 'ao centavo mais próximo'}: ${formatarCentavos(cálculo.preçoUnitárioEmCentavos)} por unidade × ${entradas.quantidade} = ${formatarCentavos(cálculo.preçoDoLoteEmCentavos)}.`,
    }),
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
  const cálculo = calcularPreçoDeVenda(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('margem'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('custo-total').value = decimal(registro.custoTotal);
  campo('quantidade').value = String(registro.quantidade);
  campo('margem').value = decimal(registro.margemPercentual);
  campo('taxas').value = decimal(registro.taxasPercentuais);
  campo('arredondamento').value = registro.modoDeArredondamento;
  campo('nome-do-cálculo').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-cálculo').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-cálculo'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Brigadeiro 50 unidades”.');
    campo('nome-do-cálculo').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Cálculo salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

// Ferramentas conectadas: preencher custo total e quantidade a partir de uma receita
// salva na ferramenta "Custo da receita", sem impedir o preenchimento manual.
const blocoDeReceitaSalva = document.querySelector('[data-bloco-de-receita-salva]');
const seleçãoDeReceita = document.getElementById('receita-salva-preço');
const receitasSalvas = listarRegistrosLocais('receitas');
if (receitasSalvas.length > 0 && blocoDeReceitaSalva && seleçãoDeReceita) {
  blocoDeReceitaSalva.hidden = false;
  for (const receita of receitasSalvas) {
    seleçãoDeReceita.append(criarElemento('option', { texto: `${receita.nome} (rende ${receita.rendimentoAproveitável})`, atributos: { value: receita.id } }));
  }
  seleçãoDeReceita.addEventListener('change', () => {
    if (!seleçãoDeReceita.value) return;
    const receita = lerRegistroLocal('receitas', seleçãoDeReceita.value);
    if (!receita) return;
    const custo = calcularCustoDaReceita(receita);
    if (!custo.válido) {
      exibirMensagem(`Não foi possível calcular o custo dessa receita: ${custo.erro}`, { tipo: 'erro' });
      return;
    }
    campo('custo-total').value = formatarNúmero(custo.custoConsumidoTotal, { casas: 2 });
    campo('quantidade').value = String(receita.rendimentoAproveitável);
    exibirMensagem(`Custo e rendimento preenchidos a partir de "${receita.nome}". Você ainda pode ajustar os valores.`, { tipo: 'informação' });
  });
}

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('O cálculo salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
