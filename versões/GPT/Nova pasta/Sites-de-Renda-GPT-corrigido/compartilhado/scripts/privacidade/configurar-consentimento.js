// Liga o aviso de primeira visita e o diálogo de preferências de privacidade.
// A escolha controla de fato o carregamento de publicidade (ver iniciar-aplicação-comum).
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';
import { abrirDiálogo } from '../interface/abrir-diálogo.js';
import { exibirMensagem } from '../interface/exibir-mensagem.js';
import { fecharDiálogo } from '../interface/fechar-diálogo.js';
import { lerConsentimento } from './ler-consentimento.js';
import { salvarConsentimento } from './salvar-consentimento.js';

export function configurarConsentimento(configuração, { aoMudar } = {}) {
  const armazenamento = criarArmazenamento();
  const versão = configuração.privacidade.versãoDaPolítica;
  const validadeEmDias = configuração.privacidade.validadeDoConsentimentoEmDias;
  const aviso = document.getElementById('consentimento');
  const diálogo = document.getElementById('preferências-de-privacidade');
  const formulário = diálogo?.querySelector('[data-formulário-de-privacidade]');
  const opçãoDePublicidade = diálogo?.querySelector('[data-preferência="publicidade"]');
  const estadoDaPublicidade = diálogo?.querySelector('[data-estado-da-publicidade]');
  let escolhaDaSessão = null;

  const obterConsentimento = () => lerConsentimento({ armazenamento, versão }) ?? escolhaDaSessão;

  function registrar(publicidade) {
    const anterior = obterConsentimento();
    const { salvo, consentimento } = salvarConsentimento({ publicidade, medição: false }, { armazenamento, versão, validadeEmDias });
    escolhaDaSessão = consentimento;
    if (aviso) aviso.hidden = true;
    if (!salvo) exibirMensagem('Sua escolha vale só nesta visita: o navegador não permite guardar dados.', { tipo: 'informação' });
    else exibirMensagem(publicidade ? 'Preferências salvas: opcionais permitidos.' : 'Preferências salvas: opcionais recusados.', { tipo: 'sucesso' });
    const revogouAnúnciosCarregados = anterior?.publicidade === true && !publicidade && document.documentElement.classList.contains('publicidade-ativa');
    if (revogouAnúnciosCarregados) {
      exibirMensagem('Recarregando a página para remover a publicidade. Seus itens salvos continuam aqui.', { tipo: 'informação' });
      setTimeout(() => window.location.reload(), 1200);
      return;
    }
    aoMudar?.(consentimento);
  }

  function abrirPreferências() {
    if (!diálogo) return;
    const menuMais = document.getElementById('menu-mais');
    if (menuMais?.open) fecharDiálogo(menuMais);
    if (opçãoDePublicidade) opçãoDePublicidade.checked = obterConsentimento()?.publicidade === true;
    if (estadoDaPublicidade && !configuração.publicidade.ativa) {
      estadoDaPublicidade.textContent = 'A publicidade não está ativa neste site no momento: nada é carregado. Sua escolha fica guardada para o caso de ela ser ativada no futuro.';
    }
    abrirDiálogo(diálogo);
  }

  if (!obterConsentimento() && aviso) aviso.hidden = false;

  aviso?.addEventListener('click', (evento) => {
    const botão = evento.target.closest('[data-consentimento]');
    if (!botão) return;
    const ação = botão.dataset.consentimento;
    if (ação === 'aceitar') registrar(true);
    else if (ação === 'rejeitar') registrar(false);
    else if (ação === 'personalizar') abrirPreferências();
  });

  document.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-abrir-preferências-de-privacidade]')) abrirPreferências();
  });

  formulário?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const escolha = evento.submitter?.value === 'rejeitar' ? false : Boolean(opçãoDePublicidade?.checked);
    fecharDiálogo(diálogo);
    registrar(escolha);
  });

  return { obterConsentimento, abrirPreferências };
}
