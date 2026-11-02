// Página "Preço da peça": materiais em linhas editáveis, soma de custos conferida antes da
// margem, margem/taxas/conjunto, comparação com preço informado e salvar/reabrir a ficha.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
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
import { calcularPreçoDaPeça } from '../cálculos/calcular-preço-da-peça.js';

const COLEÇÃO = 'peças';
const AJUDA_POR_PERFIL = {
  'crochê': 'Liste as linhas, agulhas de uso único e aviamentos usados nesta peça.',
  amigurumi: 'Liste fios, enchimento, olhos de segurança e outros materiais do amigurumi.',
  'peça-artesanal': 'Liste tecido, aviamentos e outros insumos usados na peça.',
  personalizado: 'Liste os materiais usados nesta peça.',
};

const formulário = document.getElementById('formulário-peça');
const formulárioDeSalvar = document.getElementById('formulário-salvar-peça');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeMateriais = document.querySelector('[data-linhas-de-materiais]');
const campo = (id) => document.getElementById(id);
let registroAtual = null;
let últimasEntradas = null;
let contadorDeLinhas = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';
function íconeRemover() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(SVG_NS, 'use');
  uso.setAttribute('href', `${document.documentElement.getAttribute('data-raiz') || './'}recursos/ícones/ícones.svg#remover`);
  svg.append(uso);
  return svg;
}

function novaLinhaDeMaterial(nome = '', custo = '') {
  contadorDeLinhas += 1;
  const índice = contadorDeLinhas;
  const idNome = `material-nome-${índice}`;
  const idCusto = `material-custo-${índice}`;
  const botãoRemover = criarElemento(
    'button',
    { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover material' }, dados: { removerMaterial: '' } },
    [íconeRemover()],
  );

  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Material', atributos: { for: idNome } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idNome, type: 'text', maxlength: 120, autocomplete: 'off', placeholder: 'Ex.: Fio Alegria rosa' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Custo (R$)', atributos: { for: idCusto } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idCusto, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 20,00' } }),
    ]),
    botãoRemover,
  ]);
  linha.querySelector(`#${idNome}`).value = nome;
  linha.querySelector(`#${idCusto}`).value = custo;
  linhasDeMateriais.append(linha);
}

linhasDeMateriais.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover-material]');
  if (!botão) return;
  if (linhasDeMateriais.children.length <= 1) return;
  botão.closest('.linha-editável').remove();
});

document.querySelector('[data-adicionar-material]').addEventListener('click', () => novaLinhaDeMaterial());

campo('perfil').addEventListener('change', () => {
  document.querySelector('[data-ajuda-perfil]').textContent = AJUDA_POR_PERFIL[campo('perfil').value] ?? AJUDA_POR_PERFIL.personalizado;
});

function lerMateriais() {
  const materiais = [];
  let válido = true;
  for (const linha of linhasDeMateriais.querySelectorAll('.linha-editável')) {
    const entradaNome = linha.querySelector('input[type="text"]');
    const entradaCusto = linha.querySelectorAll('input')[1];
    const nome = entradaNome.value.trim();
    const custoTexto = entradaCusto.value.trim();
    if (!nome && !custoTexto) continue; // linha em branco: ignorada, não é erro
    const custo = validarQuantidade(custoTexto, { rótulo: nome || 'Custo do material', mínimo: 0, máximo: 1e9, permitirZero: true, casasMáximas: 2 });
    if (!custo.válido) {
      mostrarErroDeCampo(entradaCusto, custo.erro);
      válido = false;
      continue;
    }
    materiais.push({ nome: nome || 'Material', custo: custo.valor });
  }
  return válido ? materiais : null;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const materiais = lerMateriais();
  if (materiais === null) válido = false;

  const horas = validarQuantidade(campo('horas').value, { rótulo: 'Horas', mínimo: 0, máximo: 1e4, permitirZero: true, casasMáximas: 2 });
  if (!horas.válido) { mostrarErroDeCampo(campo('horas'), horas.erro); válido = false; }

  const valorHora = validarQuantidade(campo('valor-hora').value, { rótulo: 'Valor da hora', mínimo: 0, máximo: 1e6, permitirZero: true, casasMáximas: 2 });
  if (!valorHora.válido) { mostrarErroDeCampo(campo('valor-hora'), valorHora.erro); válido = false; }

  const embalagem = validarQuantidade(campo('embalagem').value, { rótulo: 'Embalagem', mínimo: 0, máximo: 1e6, permitirZero: true, casasMáximas: 2 });
  if (!embalagem.válido) { mostrarErroDeCampo(campo('embalagem'), embalagem.erro); válido = false; }

  const custosAdicionais = validarQuantidade(campo('custos-adicionais').value, { rótulo: 'Custos adicionais', mínimo: 0, máximo: 1e6, permitirZero: true, casasMáximas: 2 });
  if (!custosAdicionais.válido) { mostrarErroDeCampo(campo('custos-adicionais'), custosAdicionais.erro); válido = false; }

  const margem = validarQuantidade(campo('margem').value, { rótulo: 'Margem', mínimo: 0, máximo: 99.99, casasMáximas: 2 });
  if (!margem.válido) { mostrarErroDeCampo(campo('margem'), margem.erro); válido = false; }

  const taxas = validarQuantidade(campo('taxas').value, { rótulo: 'Taxas', mínimo: 0, máximo: 99.99, permitirZero: true, casasMáximas: 2 });
  if (!taxas.válido) { mostrarErroDeCampo(campo('taxas'), taxas.erro); válido = false; }

  const quantidadeDoConjunto = validarQuantidade(campo('quantidade-do-conjunto').value, { rótulo: 'Peças no conjunto', mínimo: 1, máximo: 1000, inteiro: true });
  if (!quantidadeDoConjunto.válido) { mostrarErroDeCampo(campo('quantidade-do-conjunto'), quantidadeDoConjunto.erro); válido = false; }

  const precoInformado = validarQuantidade(campo('preço-informado').value, { rótulo: 'Preço para comparar', mínimo: 0, máximo: 1e9, casasMáximas: 2, obrigatório: false });
  if (!precoInformado.válido) { mostrarErroDeCampo(campo('preço-informado'), precoInformado.erro); válido = false; }

  if (!válido) return null;
  return {
    perfil: campo('perfil').value,
    materiais,
    horas: horas.valor,
    valorHora: valorHora.valor,
    embalagem: embalagem.valor,
    custosAdicionais: custosAdicionais.valor,
    margemPercentual: margem.valor,
    taxasPercentuais: taxas.valor,
    quantidadeDoConjunto: quantidadeDoConjunto.valor,
    modoDeArredondamento: campo('arredondamento').value === 'próximo' ? 'próximo' : 'acima',
    precoInformado: precoInformado.valor,
  };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo, custoDeMateriais) {
  const valorPrincipal = resultado.querySelector('[data-preço-peça]');
  valorPrincipal.textContent = formatarCentavos(cálculo.preçoPorPeçaEmCentavos);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  const avisoComparação = document.querySelector('[data-aviso-comparação]');
  if (cálculo.comparação) {
    avisoComparação.hidden = false;
    avisoComparação.className = `aviso ${cálculo.comparação.cobre ? 'aviso-sucesso' : 'aviso-erro'}`;
    const diferença = formatarMoeda(Math.abs(cálculo.comparação.diferençaEmCentavos) / 100);
    avisoComparação.querySelector('[data-texto-comparação]').textContent = cálculo.comparação.cobre
      ? `Seu preço informado cobre o mínimo calculado, com ${diferença} de folga por peça.`
      : `Seu preço informado não cobre o mínimo calculado: falta ${diferença} por peça.`;
  } else {
    avisoComparação.hidden = true;
  }

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Custo de materiais', formatarMoeda(custoDeMateriais)),
    linha('Custo de mão de obra', formatarMoeda(cálculo.custoDeMãoDeObra)),
    linha('Custo do artesanato (antes da margem)', formatarMoeda(cálculo.custoDoArtesanato)),
    linha('Taxas sobre a peça', formatarMoeda(cálculo.valorDasTaxas)),
    linha('Margem real após arredondamento', `${formatarMoeda(cálculo.margemEmReais)} (${formatarNúmero(cálculo.margemRealPercentual, { casas: 2 })}%)`),
    linha(`Preço do conjunto (${entradas.quantidadeDoConjunto} peça${entradas.quantidadeDoConjunto === 1 ? '' : 's'})`, formatarCentavos(cálculo.preçoDoConjuntoEmCentavos)),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Custo do artesanato = materiais + mão de obra + embalagem + custos adicionais = ${formatarMoeda(custoDeMateriais)} + ${formatarMoeda(cálculo.custoDeMãoDeObra)} + ${formatarMoeda(entradas.embalagem)} + ${formatarMoeda(entradas.custosAdicionais)} = ${formatarMoeda(cálculo.custoDoArtesanato)}.` }),
    criarElemento('li', { texto: `Preço por peça = custo do artesanato ÷ (1 − margem − taxas) = ${formatarMoeda(cálculo.custoDoArtesanato)} ÷ ${formatarNúmero(1 - entradas.margemPercentual / 100 - entradas.taxasPercentuais / 100, { casas: 4 })} = R$ ${formatarNúmero(cálculo.preçoPorPeçaMatemático, { casas: 4 })}, arredondado ${entradas.modoDeArredondamento === 'acima' ? 'para cima' : 'ao centavo mais próximo'} para ${formatarCentavos(cálculo.preçoPorPeçaEmCentavos)}.` }),
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
  const custoDeMateriais = entradas.materiais.reduce((total, item) => total + item.custo, 0);
  const cálculo = calcularPreçoDaPeça({ ...entradas, custoDeMateriais });
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('margem'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo, custoDeMateriais);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('perfil').value = registro.perfil;
  campo('perfil').dispatchEvent(new Event('change'));
  linhasDeMateriais.replaceChildren();
  contadorDeLinhas = 0;
  for (const material of registro.materiais.length ? registro.materiais : [{ nome: '', custo: '' }]) novaLinhaDeMaterial(material.nome, decimal(material.custo));
  campo('horas').value = decimal(registro.horas);
  campo('valor-hora').value = decimal(registro.valorHora);
  campo('embalagem').value = decimal(registro.embalagem);
  campo('custos-adicionais').value = decimal(registro.custosAdicionais);
  campo('margem').value = decimal(registro.margemPercentual);
  campo('taxas').value = decimal(registro.taxasPercentuais);
  campo('quantidade-do-conjunto').value = String(registro.quantidadeDoConjunto);
  campo('arredondamento').value = registro.modoDeArredondamento;
  campo('preço-informado').value = registro.precoInformado === null || registro.precoInformado === undefined ? '' : decimal(registro.precoInformado);
  campo('nome-da-peça').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-da-peça').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-da-peça'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Amigurumi coelho pequeno”.');
    campo('nome-da-peça').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Ficha salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

novaLinhaDeMaterial();

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('A ficha salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}
