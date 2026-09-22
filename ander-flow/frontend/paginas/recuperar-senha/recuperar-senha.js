// recuperar-senha.js — pedir link (sem token) e definir nova senha (com ?token=) (docs/contratos.md
// §11 "Autenticação"). Nunca revela se o e-mail existe: a etapa de pedido sempre termina em sucesso.
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

const etapaPedido = document.querySelector('[data-etapa="pedido"]');
const etapaRedefinir = document.querySelector('[data-etapa="redefinir"]');

function token() {
  return new URLSearchParams(window.location.search).get('token');
}

function limparErros(formulario) {
  for (const campo of formulario.querySelectorAll('.campo')) {
    campo.classList.remove('campo--erro');
    const caixaErro = campo.querySelector('.campo__erro');
    if (caixaErro) caixaErro.textContent = '';
    campo.querySelector('.campo__entrada')?.removeAttribute('aria-invalid');
  }
  const geral = formulario.parentElement.querySelector('.recuperar-senha__erro-geral');
  if (geral) {
    geral.textContent = '';
    geral.hidden = true;
  }
}

function mostrarErroDeCampo(formulario, nome, codigo) {
  const entrada = formulario.querySelector(`[name="${nome}"]`);
  const campo = entrada?.closest('.campo');
  if (!campo) return;
  campo.classList.add('campo--erro');
  entrada.setAttribute('aria-invalid', 'true');
  const caixaErro = campo.querySelector('.campo__erro');
  if (caixaErro) caixaErro.textContent = t(codigo);
}

function mostrarErroGeral(formulario, texto) {
  const geral = formulario.parentElement.querySelector('.recuperar-senha__erro-geral');
  if (!geral) return;
  geral.textContent = texto;
  geral.hidden = false;
}

function definirEnviando(formulario, enviando, chaveTexto) {
  const botao = formulario.querySelector('button[type="submit"]');
  if (!botao) return;
  botao.disabled = enviando;
  botao.setAttribute('aria-busy', String(enviando));
  if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.textContent;
  botao.textContent = enviando ? t(chaveTexto) : botao.dataset.textoOriginal;
}

function ligarFormularioPedido() {
  const formulario = etapaPedido.querySelector('[data-formulario="pedido"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const email = formulario.email.value.trim();
    if (!email) {
      mostrarErroDeCampo(formulario, 'email', 'compartilhado.erros.campo_obrigatorio');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarErroDeCampo(formulario, 'email', 'compartilhado.erros.email_invalido');
      return;
    }

    definirEnviando(formulario, true, 'recuperar-senha.pedido.enviando');
    try {
      await chamarApi('/api/autenticacao/recuperar-senha', { metodo: 'POST', corpo: { email } });
      formulario.hidden = true;
      etapaPedido.querySelector('.recuperar-senha__sucesso').hidden = false;
    } catch (erro) {
      mostrarErroGeral(formulario, mensagemDeErro(erro));
    } finally {
      definirEnviando(formulario, false, 'recuperar-senha.pedido.enviando');
    }
  });
}

function ligarFormularioRedefinir() {
  const formulario = etapaRedefinir.querySelector('[data-formulario="redefinir"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const senha = formulario.senha.value;
    const confirmar = formulario.confirmar.value;

    if (senha.length < 10) {
      mostrarErroDeCampo(formulario, 'senha', 'compartilhado.erros.senha_fraca');
      return;
    }
    if (senha !== confirmar) {
      mostrarErroDeCampo(formulario, 'confirmar', 'recuperar-senha.erros.senha_nao_confere');
      return;
    }

    definirEnviando(formulario, true, 'recuperar-senha.redefinir.enviando');
    try {
      await chamarApi('/api/autenticacao/redefinir-senha', { metodo: 'POST', corpo: { token: token(), senha } });
      formulario.hidden = true;
      etapaRedefinir.querySelector('.recuperar-senha__sucesso').hidden = false;
    } catch (erro) {
      mostrarErroGeral(formulario, mensagemDeErro(erro));
    } finally {
      definirEnviando(formulario, false, 'recuperar-senha.redefinir.enviando');
    }
  });
}

function iniciar() {
  ligarFormularioPedido();
  ligarFormularioRedefinir();
  if (token()) {
    etapaPedido.hidden = true;
    etapaRedefinir.hidden = false;
  }
}

iniciar();
