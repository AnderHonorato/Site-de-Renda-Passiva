import { api } from '../../núcleo/api.js';
import { caminhoDoIdioma, obterSessao, voltaSegura } from '../../núcleo/sessão.js';

export const en = document.documentElement.lang === 'en';
export { api, caminhoDoIdioma, obterSessao, voltaSegura };

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
    credenciais_invalidas: en ? 'Check your email and password.' : 'Confira seu e-mail e sua senha.',
    email_em_uso: en ? 'This email is already in use.' : 'Este e-mail já está em uso.',
    usuario_em_uso: en ? 'This username is already in use.' : 'Este @usuário já está em uso.',
    senha_invalida: en ? 'Check your password.' : 'Confira sua senha.',
    dados_invalidos: en ? 'Check the fields and try again.' : 'Confira os campos e tente novamente.',
    csrf_invalido: en ? 'Session expired. Reload the page.' : 'Sessão expirada. Recarregue a página.',
  };
  return codigos[erro.message] || (en ? 'Could not complete this action.' : 'Não foi possível concluir esta ação.');
}
