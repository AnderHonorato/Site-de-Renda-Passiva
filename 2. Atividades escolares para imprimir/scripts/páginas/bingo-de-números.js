// Página "Bingo de números": lê o formulário, valida, gera com gerarCartelasDeBingo
// (determinística pela semente), mostra a prévia de todas as cartelas mais a lista de
// sorteio separada (também usada na impressão), oferece PDF sob demanda e permite salvar.
import { gerarSementeAleatória } from '../geração/criar-gerador-pseudoaleatório.js';
import { gerarCartelasDeBingo, TAMANHOS_DE_CARTELA_VÁLIDOS } from '../cálculos/gerar-cartelas-de-bingo.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'bingo-de-números';
const formulário = document.getElementById('formulário-bingo');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

campo('semente').value = String(gerarSementeAleatória());
campo('botão-nova-semente').addEventListener('click', () => {
  campo('semente').value = String(gerarSementeAleatória());
});

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const regras = {
    'intervalo-mínimo': { rótulo: 'Início do intervalo', mínimo: 0, máximo: 1_000_000, inteiro: true },
    'intervalo-máximo': { rótulo: 'Fim do intervalo', mínimo: 0, máximo: 1_000_000, inteiro: true },
    'quantidade-de-cartelas': { rótulo: 'Quantidade de cartelas', mínimo: 1, máximo: 50, inteiro: true },
    semente: { rótulo: 'Semente', mínimo: 0, máximo: 4_294_967_295, inteiro: true },
  };
  const valores = {};
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
  if (válido && valores['intervalo-mínimo'] > valores['intervalo-máximo']) {
    mostrarErroDeCampo(campo('intervalo-máximo'), 'O fim do intervalo precisa ser maior ou igual ao início.');
    válido = false;
  }

  const tamanhoDaGrade = Number(campo('tamanho-da-grade').value);
  if (!TAMANHOS_DE_CARTELA_VÁLIDOS.includes(tamanhoDaGrade)) {
    mostrarErroDeCampo(campo('tamanho-da-grade'), 'Escolha um tamanho de cartela válido.');
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    intervaloMínimo: valores['intervalo-mínimo'],
    intervaloMáximo: valores['intervalo-máximo'],
    tamanhoDaGrade,
    quantidadeDeCartelas: valores['quantidade-de-cartelas'],
    semente: valores.semente,
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function criarGradeDeCartela(grade, tamanhoDaGrade) {
  const elemento = criarElemento('div', { classe: 'grade-de-bingo' });
  elemento.style.gridTemplateColumns = `repeat(${tamanhoDaGrade}, 1fr)`;
  for (const linha of grade) {
    for (const número of linha) {
      elemento.append(criarElemento('span', { classe: 'célula-de-bingo', texto: String(número) }));
    }
  }
  return elemento;
}

function criarFolhaDaCartela(cartela, entradas, título, primeira) {
  const cabeçalho = [criarElemento('h3', { classe: 'cabeçalho-da-atividade-título', texto: `${título} — Cartela ${cartela.número}` })];
  if (entradas.comCabeçalho) {
    cabeçalho.push(
      criarElemento('div', { classe: 'cabeçalho-da-atividade-campos' }, [criarElemento('span', { texto: 'Nome:' }), criarElemento('span', { texto: 'Data:' })]),
    );
  }
  return criarElemento('article', { classe: `folha-de-atividade${primeira ? '' : ' quebra-de-página'}` }, [
    criarElemento('header', { classe: 'cabeçalho-da-atividade' }, cabeçalho),
    criarGradeDeCartela(cartela.grade, entradas.tamanhoDaGrade),
  ]);
}

function renderizarListaDeSorteio(contêiner, listaDeSorteio) {
  contêiner.replaceChildren(...listaDeSorteio.map((número, índice) => criarElemento('li', { texto: `${índice + 1}) ${número}` })));
}

function mostrarResultado(entradas, gerado) {
  const título = entradas.tituloDaAtividade || 'Bingo de números';
  document.querySelector('[data-título-sorteio]').textContent = `Lista de sorteio — ${título}`;

  const contêinerDeCartelas = document.querySelector('[data-cartelas]');
  contêinerDeCartelas.replaceChildren(...gerado.cartelas.map((cartela, índice) => criarFolhaDaCartela(cartela, entradas, título, índice === 0)));

  renderizarListaDeSorteio(document.querySelector('[data-lista-de-sorteio]'), gerado.listaDeSorteio);

  document.querySelector('[data-resumo-da-semente]').textContent =
    `${gerado.cartelas.length} cartela(s) ${gerado.tamanhoDaGrade}×${gerado.tamanhoDaGrade}, números de ${gerado.intervaloMínimo} a ${gerado.intervaloMáximo}. Semente desta folha: ${gerado.sementeUsada}.`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const gerado = gerarCartelasDeBingo(entradas);
  if (!gerado.válido) {
    exibirMensagem(gerado.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimoResultado = gerado;
  mostrarResultado(entradas, gerado);
}

function preencher(registro) {
  campo('intervalo-mínimo').value = String(registro.intervaloMínimo);
  campo('intervalo-máximo').value = String(registro.intervaloMáximo);
  campo('tamanho-da-grade').value = String(registro.tamanhoDaGrade);
  campo('quantidade-de-cartelas').value = String(registro.quantidadeDeCartelas);
  campo('título-da-atividade').value = registro.tituloDaAtividade;
  campo('com-cabeçalho').checked = registro.comCabeçalho;
  campo('semente').value = String(registro.semente);
  campo('nome-do-registro').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  gerar();
});

resultado.querySelector('[data-ação="imprimir"]').addEventListener('click', () => {
  imprimirPágina();
});

resultado.querySelector('[data-ação="baixar-pdf"]').addEventListener('click', async (evento) => {
  if (!últimoResultado || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDeBingo } = await import('../geração/gerar-pdf-de-bingo.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeBingo({
      cartelas: últimoResultado.cartelas,
      listaDeSorteio: últimoResultado.listaDeSorteio,
      tamanhoDaGrade: últimoResultado.tamanhoDaGrade,
      tituloDaAtividade: últimasEntradas.tituloDaAtividade,
      comCabeçalho: últimasEntradas.comCabeçalho,
      sementeUsada: últimoResultado.sementeUsada,
    });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'bingo'}.pdf`, bytes, 'application/pdf');
  } catch {
    exibirMensagem('Não foi possível gerar o PDF neste aparelho. Tente imprimir a prévia diretamente.', { tipo: 'erro' });
  } finally {
    botão.disabled = false;
  }
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-registro').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-registro'), 'Dê um nome de 1 a 120 caracteres.');
    campo('nome-do-registro').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Configuração salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('O bingo salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
