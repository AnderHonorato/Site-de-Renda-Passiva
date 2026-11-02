import { CHAVE_CONSENTIMENTO, VERSAO_CONSENTIMENTO, consentimentoVigente } from './consentimento-dados.js';

const iniciarPublicidade = () => import('../publicidade/anúncios-condicionais.js')
  .then(m => m.iniciarPublicidade()).catch(() => {});

const en = document.documentElement.lang === 'en';
const t = (pt, english) => en ? english : pt;
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE_CONSENTIMENTO)); } catch { return null; } };

function escolher(escolha) {
  const valor = { versao: VERSAO_CONSENTIMENTO, expiraEm: Date.now() + 180 * 86400000, publicidade: escolha === 'recusar' ? 'nao' : 'sim', escolha };
  try { localStorage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify(valor)); } catch { return false; }
  window.dispatchEvent(new Event('consentimento-alterado'));
  return true;
}

function criarEscolha(alvo, faixa = false) {
  const painel = document.createElement('section');
  painel.className = faixa ? 'consentimento painel' : 'painel consentimento-opcoes';
  painel.setAttribute('aria-label', t('Preferências de privacidade', 'Privacy preferences'));
  const texto = document.createElement('p');
  texto.textContent = t('Usamos cookies essenciais para sua conta e guardamos as preferências neste aparelho. O cookie funcional visto_novidades lembra, por um ano, a última novidade vista. Se houver anúncios, você pode escolher anúncios personalizados, não personalizados ou nenhum anúncio.', 'We use essential cookies for your account and store preferences on this device. The functional visto_novidades cookie remembers the last news seen for one year. When ads are available, you may choose personalized ads, non-personalized ads or no ads.');
  painel.append(texto);
  const acoes = document.createElement('div');
  acoes.className = 'consentimento__acoes';
  for (const [escolha, pt, english] of [['recusar', 'Recusar anúncios', 'Reject ads'], ['essencial', 'Só o essencial', 'Essential only'], ['aceitar', 'Permitir personalizados', 'Allow personalized ads']]) {
    const botao = document.createElement('button');
    botao.type = 'button'; botao.className = 'botão'; botao.textContent = t(pt, english);
    botao.addEventListener('click', () => {
      if (!escolher(escolha)) { texto.textContent = t('Não foi possível guardar sua escolha. Nenhum anúncio foi autorizado.', 'Your choice could not be stored. No ads have been authorized.'); return; }
      if (faixa) painel.remove();
      else { const status = document.getElementById('estado-consentimento'); if (status) status.textContent = t('Preferência atualizada.', 'Preference updated.'); location.reload(); }
    });
    acoes.append(botao);
  }
  const link = document.createElement('a'); link.href = `${document.documentElement.dataset.raizIdioma || ''}cookies.html`; link.textContent = t('Detalhes e alterar escolha', 'Details and change choice');
  acoes.append(link); painel.append(acoes); alvo.append(painel);
}

async function iniciar() {
  const preferencias = document.getElementById('preferencias-cookies');
  if (preferencias) criarEscolha(preferencias);
  const atual = ler();
  if (consentimentoVigente(atual) || (atual?.escolha === 'recusar' && atual.versao === VERSAO_CONSENTIMENTO && atual.expiraEm > Date.now())) return iniciarPublicidade();
  if (!document.querySelector('[data-anuncio-posicao]')) return;
  try {
    const r = await fetch('/api/anuncios', { credentials: 'same-origin', signal: AbortSignal.timeout(4000) });
    const config = r.ok ? await r.json() : null;
    if (config?.ativo && config.permitido && Object.keys(config.blocos || {}).length) criarEscolha(document.body, true);
  } catch { /* A indisponibilidade da API mantém as ferramentas utilizáveis. */ }
}

iniciar().catch(() => {}).finally(() => {
  document.documentElement.dataset.consentimentoPronto = 'sim';
  window.dispatchEvent(new Event('consentimento-pronto'));
});
