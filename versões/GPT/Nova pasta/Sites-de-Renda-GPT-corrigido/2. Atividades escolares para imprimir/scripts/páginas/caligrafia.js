// Página "Caligrafia": lê o formulário, calcula a geometria com
// calcularFolhaDeCaligrafia (mesma função usada pelo PDF) e desenha uma prévia em SVG —
// que também é o que a impressão do navegador usa. Sem gabarito: o objetivo é copiar.
import { calcularFolhaDeCaligrafia } from '../cálculos/calcular-folha-de-caligrafia.js';
import { criarElementoSvg } from '../interface/criar-elemento-svg.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'caligrafia';
const formulário = document.getElementById('formulário-caligrafia');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimaFolha = null;
let últimasEntradas = null;
let registroAtual = null;

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const texto = campo('texto').value.trim();
  if (!texto) {
    mostrarErroDeCampo(campo('texto'), 'Digite o texto que vai virar a folha de caligrafia.');
    válido = false;
  } else if (texto.length > 40) {
    mostrarErroDeCampo(campo('texto'), 'Use um texto de até 40 caracteres.');
    válido = false;
  }

  const regras = {
    repetições: { rótulo: 'Repetições por linha', mínimo: 1, máximo: 30, inteiro: true },
    'quantidade-de-linhas': { rótulo: 'Quantidade de linhas', mínimo: 1, máximo: 40, inteiro: true },
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

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    texto,
    repetições: valores.repetições,
    quantidadeDeLinhas: valores['quantidade-de-linhas'],
    tamanhoDaLetra: Number(campo('tamanho-da-letra').value),
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function desenharSvg(folha) {
  const linhas = folha.linhas.map((linha) => {
    const larguraLinha = folha.larguraPáginaMm - folha.margemMm * 2;
    const tamanhoDaFonteMm = linha.baselineYMm - linha.ascendenteYMm;
    const filhosDaLinha = [
      criarElementoSvg('line', { x1: folha.margemMm, y1: linha.ascendenteYMm, x2: folha.margemMm + larguraLinha, y2: linha.ascendenteYMm, stroke: '#c9c9c9', 'stroke-width': 0.2 }),
      criarElementoSvg('line', {
        x1: folha.margemMm,
        y1: linha.xAlturaYMm,
        x2: folha.margemMm + larguraLinha,
        y2: linha.xAlturaYMm,
        stroke: '#c9c9c9',
        'stroke-width': 0.2,
        'stroke-dasharray': '1.4,1.4',
      }),
      criarElementoSvg('line', { x1: folha.margemMm, y1: linha.baselineYMm, x2: folha.margemMm + larguraLinha, y2: linha.baselineYMm, stroke: '#8a8a8a', 'stroke-width': 0.3 }),
      ...linha.repetições.map((repetição) =>
        criarElementoSvg(
          'text',
          {
            x: repetição.xMm,
            y: linha.baselineYMm,
            'font-size': tamanhoDaFonteMm,
            'font-family': "'Figtree', sans-serif",
            fill: repetição.contorno ? 'none' : '#1a1a1a',
            stroke: repetição.contorno ? '#9a9a9a' : 'none',
            'stroke-width': repetição.contorno ? 0.25 : 0,
          },
          [folha.texto],
        ),
      ),
    ];
    return filhosDaLinha;
  });

  return criarElementoSvg(
    'svg',
    { class: 'caligrafia-svg', viewBox: `0 0 ${folha.larguraPáginaMm} ${folha.alturaPáginaMm}`, role: 'img', 'aria-label': `Prévia da folha de caligrafia com o texto ${folha.texto}` },
    linhas.flat(),
  );
}

function mostrarResultado(entradas, folha) {
  const título = entradas.tituloDaAtividade || `Caligrafia — ${folha.texto}`;
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  document.querySelector('[data-caligrafia-contêiner]').replaceChildren(desenharSvg(folha));

  const aviso = folha.limitadoPelaPágina ? ' Algumas linhas ou repetições foram ajustadas para caber numa folha A4.' : '';
  document.querySelector('[data-resumo-da-folha]').textContent = `${folha.linhasReais} linha(s) com ${folha.repetiçõesReais} repetição(ões) cada.${aviso}`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const folha = calcularFolhaDeCaligrafia(entradas);
  if (!folha.válido) {
    exibirMensagem(folha.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimaFolha = folha;
  mostrarResultado(entradas, folha);
}

function preencher(registro) {
  campo('texto').value = registro.texto;
  campo('repetições').value = String(registro.repetições);
  campo('quantidade-de-linhas').value = String(registro.quantidadeDeLinhas);
  campo('tamanho-da-letra').value = String(registro.tamanhoDaLetra);
  campo('título-da-atividade').value = registro.tituloDaAtividade;
  campo('com-cabeçalho').checked = registro.comCabeçalho;
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
  if (!últimaFolha || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDeCaligrafia } = await import('../geração/gerar-pdf-de-caligrafia.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeCaligrafia({ folha: últimaFolha, tituloDaAtividade: últimasEntradas.tituloDaAtividade, comCabeçalho: últimasEntradas.comCabeçalho });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'caligrafia'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('A folha de caligrafia salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}
