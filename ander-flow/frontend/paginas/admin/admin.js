// admin.js — orquestra a tela /admin: seção ativa (?secao=), contagens reais da lateral e a
// faixa de alerta de bloqueios de tráfego. Cada seção mora no seu próprio módulo, iniciado só
// quando é a seção ativa (docs/contratos.md §2, §11 bloco "Admin").
import { chamarApi } from '/estatico/compartilhado/compartilhado-api.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

const SECOES_VALIDAS = ['ferramentas', 'usuarios', 'avisos', 'bloqueios'];
const CARREGADORES_SECAO = {
  ferramentas: () => import('/estatico/paginas/admin/admin-ferramentas.js'),
  usuarios: () => import('/estatico/paginas/admin/admin-usuarios.js'),
  avisos: () => import('/estatico/paginas/admin/admin-avisos.js'),
  bloqueios: () => import('/estatico/paginas/admin/admin-bloqueios.js'),
};

function lerSecaoAtual() {
  const parametros = new URLSearchParams(window.location.search);
  const secao = parametros.get('secao');
  return SECOES_VALIDAS.includes(secao) ? secao : 'ferramentas';
}

function ativarNavegacaoLateral(secaoAtual) {
  for (const item of document.querySelectorAll('.admin__nav-item')) {
    const ativo = item.dataset.secaoLink === secaoAtual;
    if (ativo) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
}

function mostrarPainelDaSecao(secaoAtual) {
  for (const painel of document.querySelectorAll('.admin__secao')) {
    painel.hidden = painel.dataset.secaoPainel !== secaoAtual;
  }
}

function preencherContagens(resumo) {
  const contagens = {
    ferramentas: resumo.ferramentas?.total ?? 0,
    usuarios: resumo.usuarios?.total ?? 0,
    avisos: resumo.mensagens_nao_lidas ?? 0,
    bloqueios: resumo.bloqueios_ativos ?? 0,
  };
  for (const [secao, valor] of Object.entries(contagens)) {
    const elemento = document.querySelector(`[data-contagem="${secao}"]`);
    if (elemento) elemento.textContent = String(valor);
  }
}

function atualizarAlertaBloqueios(resumo) {
  const alerta = document.querySelector('.admin__alerta');
  const texto = document.querySelector('.admin__alerta-texto');
  const quantidade = resumo.bloqueios_ativos ?? 0;
  if (!alerta || !texto) return;
  if (quantidade > 0) {
    texto.textContent = t('admin.alerta.bloqueios_ativos', { quantidade });
    alerta.hidden = false;
  } else {
    alerta.hidden = true;
  }
}

function preencherResumosDeSecao(resumo) {
  const ferramentas = document.querySelector('[data-secao-resumo="ferramentas"]');
  if (ferramentas) {
    ferramentas.textContent = t('admin.ferramentas.resumo', {
      prontas: resumo.ferramentas?.prontas ?? 0,
      planejadas: resumo.ferramentas?.planejadas ?? 0,
      plus: resumo.ferramentas?.plus ?? 0,
    });
  }

  const usuarios = document.querySelector('[data-secao-resumo="usuarios"]');
  if (usuarios) {
    usuarios.textContent = t('admin.usuarios.resumo', {
      total: resumo.usuarios?.total ?? 0,
      plus: resumo.usuarios?.plus ?? 0,
    });
  }

  const bloqueios = document.querySelector('[data-secao-resumo="bloqueios"]');
  if (bloqueios) {
    bloqueios.textContent = t('admin.bloqueios.resumo', { total: resumo.bloqueios_ativos ?? 0 });
  }
}

async function carregarResumo() {
  try {
    const resumo = await chamarApi('/api/admin/resumo');
    preencherContagens(resumo);
    preencherResumosDeSecao(resumo);
    atualizarAlertaBloqueios(resumo);
  } catch {
    // Falha no resumo não impede o uso da seção ativa; contagens ficam em branco.
  }
}

async function iniciarSecaoAtiva(secaoAtual) {
  const painel = document.querySelector(`[data-secao-painel="${secaoAtual}"]`);
  if (!painel) return;
  const carregar = CARREGADORES_SECAO[secaoAtual];
  const modulo = await carregar();
  await modulo.iniciar(painel);
}

// Seções mutam dados que afetam as contagens da lateral (ex.: desativar ferramenta) e avisam
// disparando este evento, em vez de importar admin.js de volta (evita dependência circular).
document.addEventListener('admin:atualizar-resumo', carregarResumo);

async function iniciar() {
  const secaoAtual = lerSecaoAtual();
  ativarNavegacaoLateral(secaoAtual);
  mostrarPainelDaSecao(secaoAtual);
  await Promise.all([carregarResumo(), iniciarSecaoAtiva(secaoAtual)]);
}

iniciar();
