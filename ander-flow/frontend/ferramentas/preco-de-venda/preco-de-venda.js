// preco-de-venda.js — interface da ferramenta: lê os campos, calcula e mostra o resultado.
import { ErroApi, chamarApi } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import {
  baixarArquivo, carregarRecursoPlus, copiarTexto, gerarPdfResumo,
  iniciarFerramenta, mostrarBloqueioPlano, registrarUso, salvarTrabalho,
} from '/estatico/compartilhado/compartilhado-ferramenta.js';
import { formatarMoeda, formatarPercentual, lerNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { calcularPrecoDeVenda } from '/estatico/ferramentas/preco-de-venda/preco-de-venda-calculo.js';

const SLUG = 'preco-de-venda';
const CHAVE_RASCUNHO = `af-rascunho-${SLUG}`;
const EXEMPLO = { custo: '38,40', despesa: '6,10', taxa: '4,2', imposto: '6', margem: 30 };

const formulario = document.querySelector('.ferramenta__formulario');
const campos = {
  custo: document.getElementById('campo-custo'),
  despesa: document.getElementById('campo-despesa'),
  taxa: document.getElementById('campo-taxa'),
  imposto: document.getElementById('campo-imposto'),
  margem: document.getElementById('campo-margem'),
};
const saidaMargem = document.querySelector('.preco-de-venda__margem-valor');
const bloqueio = document.querySelector('.bloqueio-plano');
const contaTexto = document.getElementById('conta-formula-texto');
const listaRelacionadas = document.querySelector('.relacionadas');

const NOMES_DE_CAMPO = {
  custoProduto: 'custo',
  despesaFixaPorUnidade: 'despesa',
  taxaCartao: 'taxa',
  imposto: 'imposto',
  margem: 'margem',
};

let ultimoResultado = null;
let usoRegistrado = false;

function lerEntradas() {
  return {
    custoProduto: lerNumero(campos.custo.value),
    despesaFixaPorUnidade: campos.despesa.value.trim() ? lerNumero(campos.despesa.value) : 0,
    taxaCartao: campos.taxa.value.trim() ? lerNumero(campos.taxa.value) / 100 : 0,
    imposto: campos.imposto.value.trim() ? lerNumero(campos.imposto.value) / 100 : 0,
    margem: Number(campos.margem.value) / 100,
  };
}

function limparErros() {
  for (const [nome, campo] of Object.entries(campos)) {
    const erro = document.getElementById(`erro-${nome}`);
    if (erro) erro.textContent = '';
    campo.removeAttribute('aria-invalid');
    campo.closest('.campo')?.classList.remove('campo--erro');
  }
}

function mostrarErro(resultado) {
  const nome = NOMES_DE_CAMPO[resultado.campo] ?? 'custo';
  const campo = campos[nome];
  const caixa = document.getElementById(`erro-${nome}`);
  const extras = resultado.extras?.limite !== undefined
    ? { limite: formatarPercentual(resultado.extras.limite, 1) }
    : {};
  if (caixa) caixa.textContent = t(`${SLUG}.erros.${resultado.erro}`, extras);
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.closest('.campo')?.classList.add('campo--erro');
    campo.setAttribute('aria-describedby', `erro-${nome}`);
  }
  for (const id of ['resultado-preco', 'resultado-custo', 'resultado-taxa', 'resultado-sobra', 'resultado-minimo']) {
    document.getElementById(id).textContent = t('compartilhado.simbolos.sem_valor');
  }
  contaTexto.textContent = t(`${SLUG}.conta.formula`);
  ultimoResultado = null;
}

function mostrarResultado(resultado, entradas) {
  document.getElementById('resultado-preco').textContent = formatarMoeda(resultado.preco);
  document.getElementById('resultado-custo').textContent = formatarMoeda(resultado.custoTotal);
  document.getElementById('resultado-taxa').textContent = formatarMoeda(resultado.taxaEImposto);
  document.getElementById('resultado-sobra').textContent = formatarMoeda(resultado.sobra);
  document.getElementById('resultado-minimo').textContent = formatarMoeda(resultado.precoMinimo);

  contaTexto.textContent = `${t(`${SLUG}.conta.formula`)}\n${t(`${SLUG}.conta.linha`, {
    preco: formatarMoeda(resultado.preco),
    custo: formatarMoeda(resultado.custoTotal),
    margem: formatarPercentual(entradas.margem, 1),
    taxa: formatarPercentual(entradas.taxaCartao, 1),
    imposto: formatarPercentual(entradas.imposto, 1),
  })}`;

  ultimoResultado = { resultado, entradas };
  if (!usoRegistrado) {
    usoRegistrado = true;
    registrarUso(SLUG);
  }
}

function calcular() {
  limparErros();
  const entradas = lerEntradas();
  const resultado = calcularPrecoDeVenda(entradas);
  if (!resultado.ok) {
    mostrarErro(resultado);
    return;
  }
  mostrarResultado(resultado, entradas);
  guardarRascunho();
}

function atualizarMargem() {
  saidaMargem.textContent = formatarPercentual(Number(campos.margem.value) / 100, 0);
}

function guardarRascunho() {
  try {
    const dados = Object.fromEntries(Object.entries(campos).map(([nome, campo]) => [nome, campo.value]));
    window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
  } catch {
    // Armazenamento bloqueado: o rascunho é conveniência, não requisito.
  }
}

function lerRascunho() {
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

function preencher(dados) {
  for (const [nome, campo] of Object.entries(campos)) {
    if (dados[nome] !== undefined && dados[nome] !== null) campo.value = dados[nome];
  }
  atualizarMargem();
}

function textoDoResumo() {
  const { resultado } = ultimoResultado;
  return t(`${SLUG}.resultado.resumo_copia`, {
    preco: formatarMoeda(resultado.preco),
    custo: formatarMoeda(resultado.custoTotal),
    taxa: formatarMoeda(resultado.taxaEImposto),
    sobra: formatarMoeda(resultado.sobra),
    minimo: formatarMoeda(resultado.precoMinimo),
  });
}

function linhasDoResultado() {
  const { resultado } = ultimoResultado;
  return [
    [t(`${SLUG}.resultado.titulo`), formatarMoeda(resultado.preco)],
    [t(`${SLUG}.resultado.custo_total`), formatarMoeda(resultado.custoTotal)],
    [t(`${SLUG}.resultado.taxa_imposto`), formatarMoeda(resultado.taxaEImposto)],
    [t(`${SLUG}.resultado.sobra`), formatarMoeda(resultado.sobra)],
    [t(`${SLUG}.resultado.minimo`), formatarMoeda(resultado.precoMinimo)],
  ];
}

function exigirResultado() {
  if (ultimoResultado) return true;
  calcular();
  return Boolean(ultimoResultado);
}

async function exportarXlsx() {
  if (!exigirResultado()) return;
  try {
    const modulo = await carregarRecursoPlus('xlsx', SLUG);
    const blob = await modulo.exportarCenariosXlsx(ultimoResultado.entradas, t);
    baixarArquivo(blob, 'preco-de-venda-cenarios.xlsx');
    registrarUso(SLUG, 'documento');
    mostrarAviso(t(`${SLUG}.resultado.xlsx_pronto`));
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 401 || erro.status === 403)) {
      bloqueio.hidden = false;
      await mostrarBloqueioPlano(bloqueio, {
        titulo: t(`${SLUG}.plus.titulo`),
        texto: t(`${SLUG}.plus.texto`),
      });
      bloqueio.scrollIntoView({ block: 'nearest' });
      return;
    }
    mostrarAviso(t('compartilhado.erros.erro_interno'), 'erro');
  }
}

async function carregarRelacionadas() {
  try {
    const resposta = await chamarApi(`/api/ferramentas/${SLUG}`);
    const relacionadas = resposta?.ferramenta?.relacionadas ?? [];
    if (!relacionadas.length) return;
    const catalogo = await chamarApi('/api/ferramentas');
    const porSlug = new Map((catalogo?.ferramentas ?? []).map((f) => [f.slug, f]));
    for (const slug of relacionadas) {
      const ferramenta = porSlug.get(slug);
      if (!ferramenta) continue;
      const item = document.createElement('li');
      const ligacao = document.createElement('a');
      ligacao.className = 'relacionadas__item';
      ligacao.href = ferramenta.url ?? `/ferramentas/${slug}`;
      const nome = document.createElement('b');
      nome.textContent = ferramenta.nome;
      const descricao = document.createElement('small');
      descricao.className = 'texto-2';
      descricao.textContent = ferramenta.descricao;
      ligacao.append(nome, descricao);
      item.append(ligacao);
      listaRelacionadas.append(item);
    }
  } catch {
    // Sem catálogo agora: a ferramenta funciona sem a lista de relacionadas.
  }
}

async function carregarTrabalho() {
  const id = new URLSearchParams(window.location.search).get('trabalho');
  if (!id) return false;
  try {
    const resposta = await chamarApi('/api/trabalhos?situacao=em_aberto');
    const trabalho = (resposta?.trabalhos ?? []).find((item) => String(item.id) === id);
    if (!trabalho?.dados) return false;
    preencher(trabalho.dados);
    calcular();
    return true;
  } catch {
    return false;
  }
}

function ligarAcoes() {
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    calcular();
  });
  for (const campo of Object.values(campos)) {
    campo.addEventListener('input', () => {
      if (campo === campos.margem) atualizarMargem();
      if (ultimoResultado || campos.custo.value.trim()) calcular();
    });
  }
  document.querySelector('[data-acao="exemplo"]').addEventListener('click', () => {
    preencher(EXEMPLO);
    calcular();
  });
  document.querySelector('[data-acao="copiar"]').addEventListener('click', async () => {
    if (!exigirResultado()) return;
    await copiarTexto(textoDoResumo());
    mostrarAviso(t(`${SLUG}.resultado.copiado`));
  });
  document.querySelector('[data-acao="pdf"]').addEventListener('click', async () => {
    if (!exigirResultado()) return;
    const blob = await gerarPdfResumo({
      titulo: t(`${SLUG}.titulo`),
      linhas: linhasDoResultado(),
      rodape: t('compartilhado.ferramenta.processamento_local'),
    });
    baixarArquivo(blob, 'preco-de-venda.pdf');
    registrarUso(SLUG, 'documento');
    mostrarAviso(t(`${SLUG}.resultado.pdf_pronto`));
  });
  document.querySelector('[data-acao="xlsx"]').addEventListener('click', exportarXlsx);
  const botaoSalvar = document.querySelector('[data-acao="salvar-trabalho"]');
  if (botaoSalvar) {
    botaoSalvar.addEventListener('click', async () => {
      if (!exigirResultado()) return;
      const dados = Object.fromEntries(Object.entries(campos).map(([nome, campo]) => [nome, campo.value]));
      try {
        await salvarTrabalho({
          slug: SLUG,
          titulo: t(`${SLUG}.trabalho.titulo_padrao`, { custo: formatarMoeda(ultimoResultado.resultado.custoTotal) }),
          dados,
        });
        mostrarAviso(t('compartilhado.ferramenta.trabalho_salvo'));
      } catch {
        mostrarAviso(t('compartilhado.ferramenta.entrar_para_salvar'), 'erro');
      }
    });
  }
}

aoTrocarIdioma(() => {
  atualizarMargem();
  if (ultimoResultado) mostrarResultado(ultimoResultado.resultado, ultimoResultado.entradas);
});

iniciarFerramenta({ slug: SLUG });
ligarAcoes();
atualizarMargem();
contaTexto.textContent = t(`${SLUG}.conta.formula`);
carregarRelacionadas();

carregarTrabalho().then((veioDoTrabalho) => {
  if (veioDoTrabalho) return;
  const rascunho = lerRascunho();
  if (rascunho) {
    preencher(rascunho);
    if (rascunho.custo) calcular();
  }
});
