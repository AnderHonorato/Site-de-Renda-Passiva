import { api } from '../../núcleo/api.js';
import { caminhoDoIdioma, obterSessao, voltaSegura } from '../../núcleo/sessão.js';

export const en = document.documentElement.lang === 'en';
export { api, caminhoDoIdioma, obterSessao, voltaSegura };

function fecharPainelConta() {
  const painel=document.querySelector('.conta.conta--modal');
  if(painel?.dataset.fechando==='sim')return;
  if(painel) { painel.dataset.fechando='sim'; painel.classList.add('conta--saindo'); }
  setTimeout(()=>{
    if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
    else location.assign(document.documentElement.dataset.raizIdioma || './');
  },painel&&!matchMedia('(prefers-reduced-motion: reduce)').matches?180:0);
}

document.querySelector('.conta__fechar-painel')?.addEventListener('click', fecharPainelConta);
document.querySelector('.conta.conta--modal')?.addEventListener('click', evento => {
  if (evento.target === evento.currentTarget) fecharPainelConta();
});
document.addEventListener('keydown', evento => {
  if (evento.defaultPrevented || document.querySelector('dialog[open],:popover-open')) return;
  if (evento.key === 'Escape' && document.querySelector('.conta.conta--modal')) fecharPainelConta();
  if(evento.key==='Tab') {
    const modal=document.querySelector('.conta.conta--modal');if(!modal)return;
    const controles=[...modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length>0);
    const primeiro=controles[0],ultimo=controles.at(-1);
    if(evento.shiftKey&&document.activeElement===primeiro) { evento.preventDefault();ultimo?.focus(); }
    else if(!evento.shiftKey&&document.activeElement===ultimo) { evento.preventDefault();primeiro?.focus(); }
  }
});

const modalConta=document.querySelector('.conta.conta--modal');
if(modalConta) {
  modalConta.setAttribute('role','dialog');modalConta.setAttribute('aria-modal','true');
  const titulo=modalConta.querySelector('h1');if(titulo) { titulo.id='titulo-painel-conta';modalConta.setAttribute('aria-labelledby',titulo.id); }
  modalConta.querySelector('.conta__fechar-painel')?.focus({preventScroll:true});
}

export function estado(mensagem, erro = false) {
  const alvo = document.querySelector('.conta__estado');
  if (!alvo) return;
  alvo.textContent = mensagem;
  alvo.dataset.erro = erro ? 'sim' : 'não';
}

export function dados(form) { return Object.fromEntries(new FormData(form)); }

export function ligar(formId, ação) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botão = form.querySelector('[type="submit"]');
    if (botão) botão.disabled = true;
    estado('');
    try { await obterSessao(); await ação(form); }
    catch (erro) { estado(mensagemErro(erro), true); }
    finally { if (botão) botão.disabled = false; }
  });
}

export function mensagemErro(erro) {
  if (erro.indisponivel) return en ? 'Service unavailable. Please try again shortly.' : 'Serviço indisponível. Tente novamente em instantes.';
  const codigos = {
    acesso_negado: en ? 'Access restricted to administrators.' : 'Acesso restrito a administradores.',
    credenciais_invalidas: en ? 'Check your email and password.' : 'Confira seu e-mail e sua senha.',
    sessao_nao_persistida: en ? 'Account created, but the browser did not keep the session. Allow cookies for this website and sign in again.' : 'Sua conta foi criada, mas o navegador não manteve a sessão. Permita cookies deste site e entre novamente.',
    email_em_uso: en ? 'This email is already in use.' : 'Este e-mail já está em uso.',
    usuario_em_uso: en ? 'This username is already in use.' : 'Este @usuário já está em uso.',
    senha_invalida: en ? 'Check your password.' : 'Confira sua senha.',
    dados_invalidos: en ? 'Check the fields and try again.' : 'Confira os campos e tente novamente.',
    editorial_alterado: en ? 'Another edit changed this draft. Refresh before saving.' : 'Outra edição alterou o rascunho. Atualize antes de salvar.',
    nome_repetido: en ? 'Another tool already uses this name.' : 'Outra ferramenta já usa esse nome.',
    cotas_fora_de_ordem: en ? 'Plus quotas must cover Free, and Premium must cover Plus.' : 'As cotas do Plus devem cobrir as do Grátis, e as do Premium devem cobrir as do Plus.',
    publicacao_em_andamento: en ? 'A publication is running or needs recovery. Refresh the panel.' : 'Há uma publicação em andamento ou aguardando recuperação. Atualize o painel.',
    publicacao_falhou: en ? 'Publishing failed. The previous version was kept; check the panel to recover if needed.' : 'A publicação falhou. A versão anterior foi preservada; confira o painel para recuperar, se necessário.',
    bloqueio_alterado: en ? 'This restriction changed. Refresh before releasing it.' : 'A restrição mudou. Atualize antes de liberar.',
    evento_alterado: en ? 'This event was edited elsewhere. Reload before saving.' : 'Este evento foi editado em outro lugar. Recarregue antes de salvar.',
    limite_eventos: en ? 'Pause an event before publishing more than 20.' : 'Pause um evento antes de publicar mais de 20.',
    limite_dados_do_plano: en ? 'These saved values exceed your plan size limit.' : 'Estes valores ultrapassam o espaço por trabalho do seu plano.',
    limite_armazenamento_do_plano: en ? 'Your saved-work storage is full.' : 'O espaço dos seus trabalhos salvos está cheio.',
    sociais_invalidas: en ? 'Check your social links. Use a username or the direct profile URL; WhatsApp needs 8 to 15 digits.' : 'Confira os links sociais. Use o @usuário ou o endereço direto do perfil; WhatsApp precisa de 8 a 15 dígitos.',
    ferramentas_nao_usadas: en ? 'Choose up to five tools you have already used.' : 'Escolha até cinco ferramentas que você já usou.',
    imagem_invalida: en ? 'Use a PNG, JPEG or WebP image.' : 'Use uma imagem PNG, JPEG ou WebP.',
    corpo_grande: en ? 'This file is too large.' : 'Este arquivo é grande demais.',
    csrf_invalido: en ? 'Session expired. Reload the page.' : 'Sessão expirada. Recarregue a página.',
  };
  return codigos[erro.message] || (en ? 'Could not complete this action.' : 'Não foi possível concluir esta ação.');
}
