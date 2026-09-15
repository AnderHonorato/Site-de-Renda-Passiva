// Página "Flashcards": mantém a lista editável de pares pergunta/resposta, monta a grade
// com montarPáginasDeFlashcards (mesma função usada pelo PDF), mostra a prévia de frente e
// verso (também usada na impressão), oferece PDF sob demanda e permite salvar.
import { montarPáginasDeFlashcards, QUANTIDADE_MÁXIMA_DE_PARES, TAMANHO_MÁXIMO_DO_TEXTO } from '../cálculos/montar-páginas-de-flashcards.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { criarElementoSvg } from '../interface/criar-elemento-svg.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';

const COLEÇÃO = 'flashcards';
const formulário = document.getElementById('formulário-flashcards');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const listaDePares = document.querySelector('[data-lista-de-pares]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const PARES_DE_EXEMPLO = [
  { pergunta: 'Capital do Brasil', resposta: 'Brasília' },
  { pergunta: '7 × 8', resposta: '56' },
  { pergunta: 'Maior planeta do Sistema Solar', resposta: 'Júpiter' },
  { pergunta: 'Autor de Dom Casmurro', resposta: 'Machado de Assis' },
];

function criarLinhaDePar(pergunta = '', resposta = '') {
  const campoPergunta = criarElemento('input', { classe: 'entrada', atributos: { type: 'text', maxlength: TAMANHO_MÁXIMO_DO_TEXTO, autocomplete: 'off', placeholder: 'Pergunta' }, dados: { campo: 'pergunta' } });
  campoPergunta.value = pergunta;
  const campoResposta = criarElemento('input', { classe: 'entrada', atributos: { type: 'text', maxlength: TAMANHO_MÁXIMO_DO_TEXTO, autocomplete: 'off', placeholder: 'Resposta' }, dados: { campo: 'resposta' } });
  campoResposta.value = resposta;

  const íconeRemover = criarElementoSvg('svg', { class: 'ícone', 'aria-hidden': 'true', focusable: 'false' }, [
    criarElementoSvg('use', { href: `${obterRaiz()}recursos/ícones/ícones.svg#excluir` }),
  ]);
  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário botão-ícone', atributos: { type: 'button', 'aria-label': 'Remover este par' } }, [íconeRemover]);
  botãoRemover.addEventListener('click', () => {
    linha.remove();
  });

  const linha = criarElemento('div', { classe: 'par-de-flashcard' }, [
    criarElemento('label', { classe: 'campo par-de-flashcard-campo' }, [criarElemento('span', { classe: 'visualmente-oculto', texto: 'Pergunta' }), campoPergunta]),
    criarElemento('label', { classe: 'campo par-de-flashcard-campo' }, [criarElemento('span', { classe: 'visualmente-oculto', texto: 'Resposta' }), campoResposta]),
    botãoRemover,
  ]);
  return linha;
}

for (const par of PARES_DE_EXEMPLO) listaDePares.append(criarLinhaDePar(par.pergunta, par.resposta));

document.getElementById('botão-adicionar-par').addEventListener('click', () => {
  if (listaDePares.children.length >= QUANTIDADE_MÁXIMA_DE_PARES) {
    exibirMensagem(`Use no máximo ${QUANTIDADE_MÁXIMA_DE_PARES} pares.`, { tipo: 'aviso' });
    return;
  }
  const linha = criarLinhaDePar();
  listaDePares.append(linha);
  linha.querySelector('input').focus();
});

function paresDoFormulário() {
  return [...listaDePares.children].map((linha) => ({
    pergunta: linha.querySelector('[data-campo="pergunta"]').value.trim(),
    resposta: linha.querySelector('[data-campo="resposta"]').value.trim(),
  }));
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const pares = paresDoFormulário();
  const preenchidos = pares.filter((par) => par.pergunta || par.resposta);
  if (preenchidos.length === 0) {
    mostrarErroDeCampo(listaDePares, 'Adicione ao menos um par de pergunta e resposta.');
    válido = false;
  }
  const incompleto = preenchidos.find((par) => !par.pergunta || !par.resposta);
  if (incompleto) {
    mostrarErroDeCampo(listaDePares, 'Preencha a pergunta e a resposta de cada par, ou remova o par incompleto.');
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return { pares: preenchidos, espelharVerso: campo('espelhar-verso').checked, tituloDaAtividade: título };
}

function criarGrade(grade, colunas) {
  const grid = criarElemento('div', { classe: 'grade-de-flashcards' });
  grid.style.gridTemplateColumns = `repeat(${colunas}, 1fr)`;
  for (const linha of grade) {
    for (const texto of linha) {
      grid.append(criarElemento('span', { classe: `cartão-de-flashcard${texto === null ? ' cartão-vazio' : ''}`, texto: texto ?? '' }));
    }
  }
  return grid;
}

function criarFolha(título, grade, colunas, primeira) {
  return criarElemento('article', { classe: `folha-de-atividade${primeira ? '' : ' quebra-de-página'}` }, [
    criarElemento('header', { classe: 'cabeçalho-da-atividade' }, [criarElemento('h3', { classe: 'cabeçalho-da-atividade-título', texto: título })]),
    criarGrade(grade, colunas),
  ]);
}

function mostrarResultado(entradas, gerado) {
  const título = entradas.tituloDaAtividade || 'Flashcards';
  const contêiner = document.querySelector('[data-folhas]');
  const folhas = [];
  gerado.páginas.forEach((página, índice) => {
    folhas.push(criarFolha(`${título} — Frente ${índice + 1}/${gerado.páginas.length}`, página.frente, gerado.colunas, índice === 0));
    folhas.push(criarFolha(`${título} — Verso ${índice + 1}/${gerado.páginas.length}`, página.verso, gerado.colunas, false));
  });
  contêiner.replaceChildren(...folhas);

  const avisoEspelho = gerado.espelharVerso ? 'O verso está espelhado horizontalmente para impressão frente e verso alinhada.' : 'O verso não está espelhado (mesma ordem da frente).';
  document.querySelector('[data-resumo]').textContent = `${gerado.pares.length} par(es) em ${gerado.páginas.length} folha(s) de frente e verso. ${avisoEspelho}`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const gerado = montarPáginasDeFlashcards(entradas);
  if (!gerado.válido) {
    exibirMensagem(gerado.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimoResultado = gerado;
  mostrarResultado(entradas, gerado);
}

function preencher(registro) {
  listaDePares.replaceChildren(...registro.pares.map((par) => criarLinhaDePar(par.pergunta, par.resposta)));
  campo('espelhar-verso').checked = registro.espelharVerso;
  campo('título-da-atividade').value = registro.tituloDaAtividade;
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
    const { gerarPdfDeFlashcards } = await import('../geração/gerar-pdf-de-flashcards.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeFlashcards({
      páginas: últimoResultado.páginas,
      colunas: últimoResultado.colunas,
      linhas: últimoResultado.linhas,
      tituloDaAtividade: últimasEntradas.tituloDaAtividade,
    });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'flashcards'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('O jogo de flashcards salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
