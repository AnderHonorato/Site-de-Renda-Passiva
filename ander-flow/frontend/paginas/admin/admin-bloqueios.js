// admin-bloqueios.js — seção "Bloqueios" do admin: lista de bloqueios de tráfego ativos, com
// desbloquear (docs/contratos.md §9.2, §11 bloco "Admin").
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { confirmar, mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { idiomaAtual, t } from '/estatico/compartilhado/compartilhado-idioma.js';

function avisarResumoDesatualizado() {
  document.dispatchEvent(new CustomEvent('admin:atualizar-resumo'));
}

function formatarDataHora(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const locale = idiomaAtual() === 'en' ? 'en-US' : 'pt-BR';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

function montarLinha(bloqueio, aoDesbloquear) {
  const linha = document.createElement('tr');

  const celulaGrupo = document.createElement('td');
  celulaGrupo.textContent = bloqueio.grupo;
  linha.append(celulaGrupo);

  const celulaChave = document.createElement('td');
  const codigo = document.createElement('code');
  codigo.className = 'admin__codigo';
  codigo.textContent = bloqueio.chave;
  celulaChave.append(codigo);
  linha.append(celulaChave);

  const celulaReincidencias = document.createElement('td');
  celulaReincidencias.textContent = String(bloqueio.reincidencias);
  linha.append(celulaReincidencias);

  const celulaAte = document.createElement('td');
  celulaAte.textContent = formatarDataHora(bloqueio.bloqueado_ate);
  linha.append(celulaAte);

  const celulaAcoes = document.createElement('td');
  celulaAcoes.className = 'tabela__acoes';
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao botao--secundario botao--pequeno';
  botao.textContent = t('admin.bloqueios.desbloquear');
  botao.addEventListener('click', () => aoDesbloquear(bloqueio, linha));
  celulaAcoes.append(botao);
  linha.append(celulaAcoes);

  return linha;
}

export async function iniciar(painel) {
  const carregando = painel.querySelector('[data-secao-estado="bloqueios"]');
  const bloco = painel.querySelector('.admin__tabela-bloco');
  const corpo = painel.querySelector('.admin-bloqueios__corpo');
  const vazio = painel.querySelector('.admin-bloqueios__vazio');
  const blocoErro = painel.querySelector('.admin-bloqueios__erro');
  const botaoRecarregar = painel.querySelector('.admin-bloqueios__recarregar');

  async function desbloquear(bloqueio) {
    const confirmou = await confirmar({
      titulo: t('admin.bloqueios.desbloquear_confirmar_titulo'),
      texto: t('admin.bloqueios.desbloquear_confirmar_texto'),
      rotuloConfirmar: t('admin.bloqueios.desbloquear'),
      perigo: false,
    });
    if (!confirmou) return;
    try {
      await chamarApi('/api/admin/bloqueios', { metodo: 'DELETE', corpo: { grupo: bloqueio.grupo, chave: bloqueio.chave } });
      mostrarAviso(t('admin.bloqueios.desbloqueado'));
      avisarResumoDesatualizado();
      await carregar();
    } catch (erro) {
      mostrarAviso(mensagemDeErro(erro), 'erro');
    }
  }

  async function carregar() {
    carregando.hidden = false;
    bloco.hidden = true;
    vazio.hidden = true;
    blocoErro.hidden = true;
    try {
      const resposta = await chamarApi('/api/admin/bloqueios');
      const bloqueios = resposta?.bloqueios ?? [];
      carregando.hidden = true;

      if (!bloqueios.length) {
        vazio.hidden = false;
        return;
      }

      while (corpo.firstChild) corpo.firstChild.remove();
      for (const bloqueio of bloqueios) corpo.append(montarLinha(bloqueio, desbloquear));
      bloco.hidden = false;
    } catch {
      carregando.hidden = true;
      blocoErro.hidden = false;
    }
  }

  botaoRecarregar.addEventListener('click', carregar);
  await carregar();
}
