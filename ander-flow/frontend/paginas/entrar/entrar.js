// entrar.js — abas Entrar / Criar conta (docs/contratos.md §11 "Autenticação", §2 `/entrar`).
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

const abas = [...document.querySelectorAll('.entrar__abas [data-aba]')];
const paineis = {
  entrar: document.getElementById('entrar-painel-entrar'),
  criar: document.getElementById('entrar-painel-criar'),
};

/** Caminho de retorno seguro: só relativo, começando por "/" e sem "//". Função pura. */
export function caminhoDeVoltaValido(valor) {
  if (typeof valor !== 'string' || valor.length === 0) return null;
  if (!valor.startsWith('/')) return null;
  if (valor.startsWith('//')) return null;
  return valor;
}

function obterVolta() {
  const bruto = new URLSearchParams(window.location.search).get('volta');
  return caminhoDeVoltaValido(bruto) ?? '/';
}

function mostrarAba(nome, { focar = false } = {}) {
  for (const botao of abas) {
    const ativa = botao.dataset.aba === nome;
    botao.setAttribute('aria-selected', String(ativa));
    botao.tabIndex = ativa ? 0 : -1;
  }
  for (const [chave, painel] of Object.entries(paineis)) {
    painel.hidden = chave !== nome;
  }
  if (focar) {
    const botaoAtivo = abas.find((botao) => botao.dataset.aba === nome);
    botaoAtivo?.focus();
  }
}

function abaInicial() {
  const bruto = new URLSearchParams(window.location.search).get('aba');
  return bruto === 'criar' ? 'criar' : 'entrar';
}

function ligarAbas() {
  for (const botao of abas) {
    botao.addEventListener('click', () => {
      const nome = botao.dataset.aba;
      mostrarAba(nome);
      const url = new URL(window.location.href);
      if (nome === 'criar') url.searchParams.set('aba', 'criar');
      else url.searchParams.delete('aba');
      window.history.replaceState(null, '', url);
    });
    botao.addEventListener('keydown', (evento) => {
      if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
      evento.preventDefault();
      const indiceAtual = abas.indexOf(botao);
      const proximo = evento.key === 'ArrowRight'
        ? abas[(indiceAtual + 1) % abas.length]
        : abas[(indiceAtual - 1 + abas.length) % abas.length];
      proximo.click();
      proximo.focus();
    });
  }
}

function limparErros(formulario) {
  for (const campo of formulario.querySelectorAll('.campo')) {
    campo.classList.remove('campo--erro');
    const caixaErro = campo.querySelector('.campo__erro');
    if (caixaErro) caixaErro.textContent = '';
    campo.querySelector('.campo__entrada')?.removeAttribute('aria-invalid');
  }
  const erroTermos = formulario.querySelector('.entrar__erro-termos');
  if (erroTermos) {
    erroTermos.textContent = '';
    erroTermos.classList.remove('entrar__erro-termos--visivel');
  }
  const geral = formulario.parentElement.querySelector('.entrar__erro-geral');
  if (geral) {
    geral.textContent = '';
    geral.hidden = true;
  }
}

function mostrarErroDeCampo(formulario, nome, codigo) {
  const entrada = formulario.querySelector(`[name="${nome}"]`);
  const campo = entrada?.closest('.campo');
  if (campo) {
    campo.classList.add('campo--erro');
    entrada.setAttribute('aria-invalid', 'true');
    const caixaErro = campo.querySelector('.campo__erro');
    if (caixaErro) caixaErro.textContent = t(`compartilhado.erros.${codigo}`);
    return;
  }
  if (nome === 'aceitou_termos') {
    const erroTermos = formulario.querySelector('.entrar__erro-termos');
    if (erroTermos) {
      erroTermos.textContent = t(`compartilhado.erros.${codigo}`);
      erroTermos.classList.add('entrar__erro-termos--visivel');
    }
  }
}

function mostrarErroGeral(formulario, texto) {
  const geral = formulario.parentElement.querySelector('.entrar__erro-geral');
  if (!geral) return;
  geral.textContent = texto;
  geral.hidden = false;
}

/** Reparte um erro de API entre os campos certos e a mensagem geral. */
function aplicarErroApi(formulario, erro, mapaCampoUnico) {
  limparErros(formulario);
  const campos = erro?.extras?.campos;
  if (campos && typeof campos === 'object' && Object.keys(campos).length) {
    for (const [nome, codigo] of Object.entries(campos)) mostrarErroDeCampo(formulario, nome, codigo);
    return;
  }
  const nomeDoCampo = mapaCampoUnico?.[erro?.codigo];
  if (nomeDoCampo) {
    mostrarErroDeCampo(formulario, nomeDoCampo, erro.codigo);
    return;
  }
  mostrarErroGeral(formulario, mensagemDeErro(erro));
}

function definirEnviando(formulario, enviando, chaveTexto) {
  const botao = formulario.querySelector('button[type="submit"]');
  if (!botao) return;
  botao.disabled = enviando;
  botao.setAttribute('aria-busy', String(enviando));
  if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.textContent;
  botao.textContent = enviando ? t(chaveTexto) : botao.dataset.textoOriginal;
}

function validarEmailNoNavegador(formulario, email) {
  if (!email.trim()) {
    mostrarErroDeCampo(formulario, 'email', 'campo_obrigatorio');
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    mostrarErroDeCampo(formulario, 'email', 'email_invalido');
    return false;
  }
  return true;
}

function ligarFormularioEntrar() {
  const formulario = document.querySelector('[data-formulario="entrar"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const email = formulario.email.value;
    const senha = formulario.senha.value;
    let valido = validarEmailNoNavegador(formulario, email);
    if (!senha) {
      mostrarErroDeCampo(formulario, 'senha', 'campo_obrigatorio');
      valido = false;
    }
    if (!valido) return;

    definirEnviando(formulario, true, 'entrar.formulario_entrar.enviando');
    try {
      await chamarApi('/api/autenticacao/entrar', { metodo: 'POST', corpo: { email, senha } });
      window.location.assign(obterVolta());
    } catch (erro) {
      aplicarErroApi(formulario, erro, {});
    } finally {
      definirEnviando(formulario, false, 'entrar.formulario_entrar.enviando');
    }
  });
}

function ligarFormularioCriar() {
  const formulario = document.querySelector('[data-formulario="criar"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const nome = formulario.nome.value;
    const email = formulario.email.value;
    const senha = formulario.senha.value;
    const aceitouTermos = formulario.aceitou_termos.checked;

    let valido = true;
    if (!nome.trim()) {
      mostrarErroDeCampo(formulario, 'nome', 'campo_obrigatorio');
      valido = false;
    }
    if (!validarEmailNoNavegador(formulario, email)) valido = false;
    if (senha.length < 10) {
      mostrarErroDeCampo(formulario, 'senha', 'senha_fraca');
      valido = false;
    }
    if (!aceitouTermos) {
      mostrarErroDeCampo(formulario, 'aceitou_termos', 'termos_nao_aceitos');
      valido = false;
    }
    if (!valido) return;

    definirEnviando(formulario, true, 'entrar.formulario_criar.enviando');
    try {
      await chamarApi('/api/autenticacao/criar-conta', {
        metodo: 'POST',
        corpo: { nome, email, senha, aceitou_termos: aceitouTermos },
      });
      window.location.assign(obterVolta());
    } catch (erro) {
      aplicarErroApi(formulario, erro, {
        email_em_uso: 'email',
        senha_fraca: 'senha',
        termos_nao_aceitos: 'aceitou_termos',
      });
    } finally {
      definirEnviando(formulario, false, 'entrar.formulario_criar.enviando');
    }
  });
}

ligarAbas();
mostrarAba(abaInicial());
ligarFormularioEntrar();
ligarFormularioCriar();
