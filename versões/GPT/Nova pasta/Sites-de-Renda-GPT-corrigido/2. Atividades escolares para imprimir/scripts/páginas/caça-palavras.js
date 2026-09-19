// Página "Caça-palavras": lê a lista de palavras e as opções, monta a grade com
// gerarCaçaPalavras (determinística pela semente), mostra a prévia (também usada na
// impressão) com o gabarito destacado, oferece PDF sob demanda e permite salvar.
import { gerarSementeAleatória } from '../geração/criar-gerador-pseudoaleatório.js';
import { gerarCaçaPalavras } from '../geração/gerar-caça-palavras.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'caça-palavras';
const VETORES_POR_DIREÇÃO = { horizontal: [0, 1], vertical: [1, 0], 'diagonal-desce': [1, 1], 'diagonal-sobe': [-1, 1] };
const formulário = document.getElementById('formulário-caça-palavras');
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

function palavrasDoTexto() {
  return campo('lista-de-palavras').value
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

function direçõesSelecionadas() {
  return [...formulário.querySelectorAll('input[name="direção"]:checked')].map((entrada) => entrada.value);
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  campo('direções-erro').hidden = true;
  campo('lista-de-palavras-erro').hidden = true;
  let válido = true;

  const palavras = palavrasDoTexto();
  if (palavras.length === 0) {
    mostrarErroDeCampo(campo('lista-de-palavras'), 'Digite ao menos uma palavra.');
    válido = false;
  } else if (palavras.length > 30) {
    mostrarErroDeCampo(campo('lista-de-palavras'), 'Use no máximo 30 palavras.');
    válido = false;
  } else if (palavras.some((palavra) => palavra.length > 30)) {
    mostrarErroDeCampo(campo('lista-de-palavras'), 'Cada palavra pode ter até 30 caracteres.');
    válido = false;
  }

  const direções = direçõesSelecionadas();
  if (direções.length === 0) {
    campo('direções-erro').hidden = false;
    campo('direções-erro').textContent = 'Escolha ao menos uma direção.';
    válido = false;
  }

  const regras = {
    linhas: { rótulo: 'Linhas', mínimo: 4, máximo: 30, inteiro: true },
    colunas: { rótulo: 'Colunas', mínimo: 4, máximo: 30, inteiro: true },
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

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    palavras,
    direções,
    permitirInvertidas: campo('permitir-invertidas').checked,
    linhas: valores.linhas,
    colunas: valores.colunas,
    modoDeAcentos: campo('modo-de-acentos').value,
    semente: valores.semente,
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function célulasDaSolução(colocadas) {
  const conjunto = new Set();
  for (const item of colocadas) {
    const [dl, dc] = VETORES_POR_DIREÇÃO[item.direção];
    const [pdl, pdc] = item.invertida ? [-dl, -dc] : [dl, dc];
    for (let índice = 0; índice < item.palavraNaGrade.length; índice += 1) {
      conjunto.add(`${item.linha + pdl * índice},${item.coluna + pdc * índice}`);
    }
  }
  return conjunto;
}

function renderizarGrade(contêiner, gerado, mostrarSolução) {
  const solução = mostrarSolução ? célulasDaSolução(gerado.colocadas) : null;
  const grade = criarElemento('div', { classe: 'grade-de-caça-palavras' });
  grade.style.gridTemplateColumns = `repeat(${gerado.colunas}, 1fr)`;
  for (let linha = 0; linha < gerado.linhas; linha += 1) {
    for (let coluna = 0; coluna < gerado.colunas; coluna += 1) {
      const naSolução = solução ? solução.has(`${linha},${coluna}`) : false;
      grade.append(criarElemento('span', { classe: `célula-de-caça-palavras${naSolução ? ' célula-da-solução' : ''}`, texto: gerado.grade[linha][coluna] }));
    }
  }
  contêiner.replaceChildren(grade);
}

function renderizarListaDePalavras(contêiner, gerado) {
  const itens = [
    ...gerado.colocadas.map((item) => criarElemento('li', { texto: item.palavra })),
    ...gerado.nãoColocadas.map((item) => criarElemento('li', { texto: item.palavra, atributos: { 'data-não-coube': '' } })),
  ];
  contêiner.replaceChildren(...itens);
}

function mostrarResultado(entradas, gerado) {
  const título = entradas.tituloDaAtividade || 'Caça-palavras';
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-título-gabarito]').textContent = `Gabarito — ${título}`;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  renderizarGrade(document.querySelector('[data-grade]'), gerado, false);
  renderizarGrade(document.querySelector('[data-grade-gabarito]'), gerado, true);
  renderizarListaDePalavras(document.querySelector('[data-lista-de-palavras]'), gerado);

  const avisoNãoColocadas = document.querySelector('[data-aviso-não-colocadas]');
  if (gerado.nãoColocadas.length > 0) {
    avisoNãoColocadas.hidden = false;
    document.querySelector('[data-texto-aviso-não-colocadas]').textContent =
      `${gerado.nãoColocadas.length} palavra(s) não couberam nesta grade: ${gerado.nãoColocadas.map((item) => `${item.palavra} (${item.motivo})`).join('; ')}`;
  } else {
    avisoNãoColocadas.hidden = true;
  }

  document.querySelector('[data-resumo-da-semente]').textContent = `Semente desta grade: ${gerado.sementeUsada}. Modo de acentos: ${gerado.modoDeAcentos === 'manter' ? 'mantém acentos e cedilha' : 'sem acentos na grade'}.`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const gerado = gerarCaçaPalavras(entradas);
  if (!gerado.válido) {
    exibirMensagem(gerado.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimoResultado = gerado;
  mostrarResultado(entradas, gerado);
}

function preencher(registro) {
  campo('lista-de-palavras').value = registro.palavras.join('\n');
  for (const entrada of formulário.querySelectorAll('input[name="direção"]')) entrada.checked = registro.direções.includes(entrada.value);
  campo('permitir-invertidas').checked = registro.permitirInvertidas;
  campo('linhas').value = String(registro.linhas);
  campo('colunas').value = String(registro.colunas);
  campo('modo-de-acentos').value = registro.modoDeAcentos;
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
    const { gerarPdfDeCaçaPalavras } = await import('../geração/gerar-pdf-de-caça-palavras.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeCaçaPalavras({
      grade: últimoResultado.grade,
      linhas: últimoResultado.linhas,
      colunas: últimoResultado.colunas,
      colocadas: últimoResultado.colocadas,
      nãoColocadas: últimoResultado.nãoColocadas,
      tituloDaAtividade: últimasEntradas.tituloDaAtividade,
      comCabeçalho: últimasEntradas.comCabeçalho,
      sementeUsada: últimoResultado.sementeUsada,
    });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'caca-palavras'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('O caça-palavras salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
