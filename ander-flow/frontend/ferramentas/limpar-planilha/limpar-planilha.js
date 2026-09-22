// limpar-planilha.js — fluxo em quatro etapas: enviar, configurar, revisar, exportar.
// O arquivo é lido no navegador; o original nunca é alterado.
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { baixarArquivo, iniciarFerramenta, registrarUso, salvarTrabalho } from '/estatico/compartilhado/compartilhado-ferramenta.js';
import { carregarRelacionadas } from '/estatico/compartilhado/compartilhado-ferramenta-formulario.js';
import { formatarNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { gerarBlobCsv, gerarBlobXlsx, nomeArquivoLimpo } from '/estatico/ferramentas/limpar-planilha/limpar-planilha-exportacao.js';
import { lerArquivo } from '/estatico/ferramentas/limpar-planilha/limpar-planilha-leitura.js';
import { detectarColunasSugeridas, limparPlanilha } from '/estatico/ferramentas/limpar-planilha/limpar-planilha-limpeza.js';

const SLUG = 'limpar-planilha';
const ETAPAS = ['enviar', 'configurar', 'revisar', 'exportar'];
const LINHAS_NA_PREVIA = 20;

const areaSoltar = document.getElementById('area-soltar');
const campoArquivo = document.getElementById('campo-arquivo');
const caixaErro = document.getElementById('erro-planilha');
const erroColunas = document.getElementById('erro-colunas');
const resumoArquivo = document.getElementById('resumo-arquivo');
const listaColunas = document.getElementById('lista-colunas');
const campoColunaData = document.getElementById('campo-coluna-data');
const tituloConfigurar = document.getElementById('titulo-configurar');
const resumoContagens = document.getElementById('resumo-contagens');
const previaTitulo = document.getElementById('previa-titulo');
const previaCabecalho = document.getElementById('previa-cabecalho');
const previaCorpo = document.getElementById('previa-corpo');
const linhasContinuam = document.getElementById('linhas-continuam');

let planilha = null;
let resultado = null;

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function irPara(etapa) {
  for (const nome of ETAPAS) {
    const painel = document.querySelector(`[data-painel="${nome}"]`);
    const passo = document.querySelector(`[data-etapa="${nome}"]`);
    const atual = nome === etapa;
    painel.hidden = !atual;
    passo.classList.toggle('etapas__item--atual', atual);
    passo.classList.toggle('etapas__item--feita', ETAPAS.indexOf(nome) < ETAPAS.indexOf(etapa));
    if (atual) passo.setAttribute('aria-current', 'step');
    else passo.removeAttribute('aria-current');
  }
  const painelAtual = document.querySelector(`[data-painel="${etapa}"]`);
  painelAtual.focus();
}

function colunasMarcadas() {
  return [...listaColunas.querySelectorAll('input[type="checkbox"]:checked')].map((entrada) => Number(entrada.value));
}

function colunasDeEmail() {
  return [...listaColunas.querySelectorAll('input[data-tipo="email"]')].map((entrada) => Number(entrada.value));
}

function configuracaoAtual() {
  const qualLinhaFica = document.querySelector('input[name="qual-linha"]:checked')?.value ?? 'mais_recente';
  const colunaData = campoColunaData.value === '' ? null : Number(campoColunaData.value);
  return {
    colunasDuplicidade: colunasMarcadas(),
    qualLinhaFica,
    colunaData,
    colunasEmail: colunasDeEmail(),
    padronizarEmail: document.getElementById('campo-padronizar-email').checked,
    apararEspacos: document.getElementById('campo-aparar-espacos').checked,
    removerVazias: document.getElementById('campo-remover-vazias').checked,
  };
}

function montarColunas() {
  limparFilhos(listaColunas);
  const sugeridas = new Map(detectarColunasSugeridas(planilha.cabecalho).map((s) => [s.indice, s.tipo]));

  planilha.cabecalho.forEach((nome, indice) => {
    const rotulo = document.createElement('label');
    rotulo.className = 'marcador';

    const entrada = document.createElement('input');
    entrada.type = 'checkbox';
    entrada.value = String(indice);
    entrada.checked = sugeridas.has(indice);
    if (sugeridas.get(indice) === 'email') entrada.dataset.tipo = 'email';

    const texto = document.createElement('span');
    texto.textContent = String(nome ?? '').trim() || t('compartilhado.simbolos.sem_valor');

    rotulo.append(entrada, texto);
    listaColunas.append(rotulo);
    entrada.addEventListener('change', () => {
      erroColunas.textContent = '';
      atualizarTituloConfigurar();
    });
  });

  limparFilhos(campoColunaData);
  const semColuna = document.createElement('option');
  semColuna.value = '';
  semColuna.textContent = t(`${SLUG}.configurar.coluna_data_nenhuma`);
  campoColunaData.append(semColuna);
  planilha.cabecalho.forEach((nome, indice) => {
    const opcao = document.createElement('option');
    opcao.value = String(indice);
    opcao.textContent = String(nome ?? '').trim() || String(indice + 1);
    campoColunaData.append(opcao);
  });
}

function atualizarTituloConfigurar() {
  const previsto = limparPlanilha(planilha, configuracaoAtual());
  const duplicadas = previsto.totalDuplicadas;
  if (duplicadas === 0) tituloConfigurar.textContent = t(`${SLUG}.configurar.titulo_nenhuma`);
  else if (duplicadas === 1) tituloConfigurar.textContent = t(`${SLUG}.configurar.titulo_uma`);
  else tituloConfigurar.textContent = t(`${SLUG}.configurar.titulo`, { duplicadas: formatarNumero(duplicadas, 0) });
}

function montarRevisao() {
  resultado = limparPlanilha(planilha, configuracaoAtual());

  resumoContagens.textContent = t(`${SLUG}.revisar.resumo_contagens`, {
    total: formatarNumero(resultado.total, 0),
    duplicadas: formatarNumero(resultado.totalDuplicadas, 0),
    vazias: formatarNumero(resultado.totalVazias, 0),
  });

  const mostradas = Math.min(LINHAS_NA_PREVIA, resultado.linhasComStatus.length);
  previaTitulo.textContent = t(`${SLUG}.revisar.previa_titulo`, {
    mostradas: formatarNumero(mostradas, 0),
    total: formatarNumero(resultado.total, 0),
  });

  limparFilhos(previaCabecalho);
  for (const nome of planilha.cabecalho.slice(0, 5)) {
    const celula = document.createElement('th');
    celula.scope = 'col';
    celula.textContent = String(nome ?? '');
    previaCabecalho.append(celula);
  }
  const colunaAcao = document.createElement('th');
  colunaAcao.scope = 'col';
  colunaAcao.textContent = t(`${SLUG}.revisar.coluna_acao`);
  previaCabecalho.append(colunaAcao);

  limparFilhos(previaCorpo);
  for (const item of resultado.linhasComStatus.slice(0, LINHAS_NA_PREVIA)) {
    const linha = document.createElement('tr');
    if (!item.mantem) linha.className = 'limpar-planilha__linha-removida';
    for (const valor of item.linha.slice(0, 5)) {
      const celula = document.createElement('td');
      celula.textContent = String(valor ?? '');
      linha.append(celula);
    }
    const acao = document.createElement('td');
    const etiqueta = document.createElement('span');
    etiqueta.className = item.mantem ? 'etiqueta etiqueta--pronta' : 'etiqueta etiqueta--erro';
    etiqueta.textContent = t(item.mantem ? `${SLUG}.revisar.mantem` : `${SLUG}.revisar.remove`);
    acao.append(etiqueta);
    linha.append(acao);
    previaCorpo.append(linha);
  }

  linhasContinuam.textContent = resultado.totalFinal === 1
    ? t(`${SLUG}.revisar.linhas_continuam_uma`)
    : t(`${SLUG}.revisar.linhas_continuam`, { quantidade: formatarNumero(resultado.totalFinal, 0) });
}

async function receber(arquivo) {
  caixaErro.textContent = '';
  resumoArquivo.hidden = true;
  let xlsx;
  if (/\.(xlsx|xls)$/i.test(arquivo.name)) {
    try {
      xlsx = await import('/estatico/compartilhado/bibliotecas/xlsx.mjs');
    } catch {
      caixaErro.textContent = t(`${SLUG}.erros.biblioteca_indisponivel`);
      return;
    }
  }

  const lido = await lerArquivo(arquivo, { xlsx });
  if (!lido.ok) {
    caixaErro.textContent = t(`${SLUG}.erros.${lido.erro}`);
    return;
  }

  planilha = lido;
  resumoArquivo.textContent = t(`${SLUG}.enviar.resumo_arquivo`, {
    nome: lido.nomeArquivo,
    linhas: formatarNumero(lido.linhas.length, 0),
    colunas: formatarNumero(lido.cabecalho.length, 0),
  });
  resumoArquivo.hidden = false;
  montarColunas();
  atualizarTituloConfigurar();
  registrarUso(SLUG);
  irPara('configurar');
}

campoArquivo.addEventListener('change', () => {
  const arquivo = campoArquivo.files?.[0];
  if (arquivo) receber(arquivo);
  campoArquivo.value = '';
});

for (const evento of ['dragenter', 'dragover']) {
  areaSoltar.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSoltar.classList.add('soltar-arquivos--ativa');
  });
}
for (const evento of ['dragleave', 'drop']) {
  areaSoltar.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSoltar.classList.remove('soltar-arquivos--ativa');
  });
}
areaSoltar.addEventListener('drop', (evento) => {
  const arquivo = evento.dataTransfer?.files?.[0];
  if (arquivo) receber(arquivo);
});

for (const botao of document.querySelectorAll('[data-ir]')) {
  botao.addEventListener('click', () => {
    const destino = botao.dataset.ir;
    if (destino === 'revisar') {
      if (!colunasMarcadas().length) {
        erroColunas.textContent = t(`${SLUG}.configurar.nenhuma_coluna_selecionada`);
        return;
      }
      montarRevisao();
    }
    if (destino === 'exportar' && !resultado) montarRevisao();
    irPara(destino);
  });
}

for (const entrada of document.querySelectorAll('input[name="qual-linha"], #campo-coluna-data, #campo-padronizar-email, #campo-aparar-espacos, #campo-remover-vazias')) {
  entrada.addEventListener('change', () => {
    if (planilha) atualizarTituloConfigurar();
  });
}

document.querySelector('[data-acao="baixar-csv"]').addEventListener('click', () => {
  if (!resultado) return;
  baixarArquivo(gerarBlobCsv(resultado, planilha.separador), nomeArquivoLimpo(planilha.nomeArquivo, 'csv'));
  registrarUso(SLUG, 'documento');
  mostrarAviso(t(`${SLUG}.exportar.pronto_csv`));
});

document.querySelector('[data-acao="baixar-xlsx"]').addEventListener('click', async () => {
  if (!resultado) return;
  try {
    const xlsx = await import('/estatico/compartilhado/bibliotecas/xlsx.mjs');
    baixarArquivo(gerarBlobXlsx(xlsx, resultado), nomeArquivoLimpo(planilha.nomeArquivo, 'xlsx'));
    registrarUso(SLUG, 'documento');
    mostrarAviso(t(`${SLUG}.exportar.pronto_xlsx`));
  } catch {
    caixaErro.textContent = t(`${SLUG}.erros.biblioteca_indisponivel`);
  }
});

document.querySelector('[data-acao="recomecar"]').addEventListener('click', () => {
  planilha = null;
  resultado = null;
  resumoArquivo.hidden = true;
  caixaErro.textContent = '';
  irPara('enviar');
});

document.querySelector('[data-acao="salvar-trabalho"]')?.addEventListener('click', async () => {
  if (!planilha) return;
  try {
    // Guarda só a configuração: nenhum dado da planilha vai para a conta.
    await salvarTrabalho({
      slug: SLUG,
      titulo: t(`${SLUG}.trabalho.titulo_padrao`, { nome: planilha.nomeArquivo }),
      dados: configuracaoAtual(),
    });
    mostrarAviso(t('compartilhado.ferramenta.trabalho_salvo'));
  } catch {
    mostrarAviso(t('compartilhado.ferramenta.entrar_para_salvar'), 'erro');
  }
});

aoTrocarIdioma(() => {
  if (!planilha) return;
  montarColunas();
  atualizarTituloConfigurar();
  if (resultado) montarRevisao();
});

iniciarFerramenta({ slug: SLUG });
carregarRelacionadas(SLUG);
