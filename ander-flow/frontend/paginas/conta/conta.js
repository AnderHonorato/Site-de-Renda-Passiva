// conta.js — perfil, preferências, plano e uso, trocar senha, exportar e excluir a conta
// (docs/contratos.md §11 bloco "Conta", §12 trocarIdioma/definirTema).
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { confirmar, mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { t, trocarIdioma } from '/estatico/compartilhado/compartilhado-idioma.js';
import { definirTema } from '/estatico/compartilhado/compartilhado-tema.js';

function limparErros(formulario) {
  for (const campo of formulario.querySelectorAll('.campo')) {
    campo.classList.remove('campo--erro');
    const caixaErro = campo.querySelector('.campo__erro');
    if (caixaErro) caixaErro.textContent = '';
    campo.querySelector('.campo__entrada')?.removeAttribute('aria-invalid');
  }
  const geral = formulario.querySelector('.conta__erro-geral');
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
  if (caixaErro) caixaErro.textContent = t(`compartilhado.erros.${codigo}`);
}

function mostrarErroGeral(formulario, texto) {
  const geral = formulario.querySelector('.conta__erro-geral');
  if (!geral) return;
  geral.textContent = texto;
  geral.hidden = false;
}

/** Reparte um erro de API entre os campos certos e a mensagem geral. */
function aplicarErroApi(formulario, erro, mapaCampoUnico = {}) {
  limparErros(formulario);
  const campos = erro?.extras?.campos;
  if (campos && typeof campos === 'object' && Object.keys(campos).length) {
    for (const [nome, codigo] of Object.entries(campos)) mostrarErroDeCampo(formulario, nome, codigo);
    return;
  }
  const nomeDoCampo = mapaCampoUnico[erro?.codigo];
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
  if (chaveTexto) {
    if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.textContent;
    botao.textContent = enviando ? t(chaveTexto) : botao.dataset.textoOriginal;
  }
}

function marcarOpcaoSelecionada(grupo, valor) {
  const raiz = document.querySelector(`[data-grupo="${grupo}"]`);
  if (!raiz) return;
  for (const entrada of raiz.querySelectorAll('input')) entrada.checked = entrada.value === valor;
}

function preencherPlanoEUso(dados) {
  const etiqueta = document.querySelector('.conta__etiqueta-plano');
  if (etiqueta) {
    const plus = dados.usuario.plano === 'plus';
    etiqueta.classList.add(plus ? 'etiqueta--plus' : 'etiqueta--gratis');
    etiqueta.textContent = t(plus ? 'compartilhado.ferramenta.plano_plus' : 'compartilhado.ferramenta.plano_gratis');
  }

  for (const chave of ['favoritos', 'trabalhos']) {
    const usado = dados.uso?.[chave] ?? 0;
    const limite = dados.limites?.[chave] ?? 0;
    const numeros = document.querySelector(`[data-uso="${chave}"]`);
    const barra = document.querySelector(`[data-progresso="${chave}"]`);
    if (numeros) numeros.textContent = t('conta.plano.de_limite', { usado, limite });
    if (barra) {
      barra.max = Math.max(limite, 1);
      barra.value = Math.min(usado, Math.max(limite, 1));
    }
  }
}

async function carregarConta() {
  try {
    const dados = await chamarApi('/api/conta');
    if (!dados) return;
    const campoEmail = document.getElementById('perfil-campo-email');
    if (campoEmail) campoEmail.value = dados.usuario.email;
    marcarOpcaoSelecionada('idioma', dados.usuario.idioma);
    marcarOpcaoSelecionada('tema', dados.usuario.tema);
    preencherPlanoEUso(dados);
  } catch {
    // A sessão já garante o acesso à página; se a API falhar agora, os campos ficam vazios.
  }
}

function ligarPreferencias() {
  const grupoIdioma = document.querySelector('[data-grupo="idioma"]');
  grupoIdioma?.addEventListener('change', (evento) => {
    if (evento.target.name === 'conta-idioma') trocarIdioma(evento.target.value);
  });

  const grupoTema = document.querySelector('[data-grupo="tema"]');
  grupoTema?.addEventListener('change', (evento) => {
    if (evento.target.name === 'conta-tema') definirTema(evento.target.value);
  });
}

function ligarFormularioPerfil() {
  const formulario = document.querySelector('[data-formulario="perfil"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);
    const nome = formulario.nome.value.trim();
    if (!nome) {
      mostrarErroDeCampo(formulario, 'nome', 'campo_obrigatorio');
      return;
    }

    definirEnviando(formulario, true);
    try {
      await chamarApi('/api/conta', { metodo: 'PATCH', corpo: { nome } });
      mostrarAviso(t('conta.perfil.salvo'));
    } catch (erro) {
      aplicarErroApi(formulario, erro);
    } finally {
      definirEnviando(formulario, false);
    }
  });
}

function ligarFormularioSenha() {
  const formulario = document.querySelector('[data-formulario="senha"]');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const senhaAtual = formulario.senha_atual.value;
    const senhaNova = formulario.senha_nova.value;
    const senhaConfirmar = formulario.senha_confirmar.value;

    if (!senhaAtual) {
      mostrarErroDeCampo(formulario, 'senha_atual', 'campo_obrigatorio');
      return;
    }
    if (senhaNova.length < 10) {
      mostrarErroDeCampo(formulario, 'senha_nova', 'senha_fraca');
      return;
    }
    if (senhaNova !== senhaConfirmar) {
      const campo = formulario.senha_confirmar.closest('.campo');
      campo?.classList.add('campo--erro');
      const caixaErro = campo?.querySelector('.campo__erro');
      if (caixaErro) caixaErro.textContent = t('conta.erros.senha_nao_confere');
      return;
    }

    definirEnviando(formulario, true, 'conta.senha.enviando');
    try {
      await chamarApi('/api/conta/senha', { metodo: 'POST', corpo: { senha_atual: senhaAtual, senha_nova: senhaNova } });
      formulario.reset();
      mostrarAviso(t('conta.senha.sucesso'));
    } catch (erro) {
      aplicarErroApi(formulario, erro, { senha_atual_incorreta: 'senha_atual' });
    } finally {
      definirEnviando(formulario, false, 'conta.senha.enviando');
    }
  });
}

function ligarExclusao() {
  const secao = document.querySelector('.conta__secao--perigo');
  const botaoAbrir = secao.querySelector('[data-acao="abrir-exclusao"]');
  const formulario = secao.querySelector('[data-formulario="excluir"]');
  const botaoCancelar = formulario.querySelector('[data-acao="cancelar-exclusao"]');

  botaoAbrir.addEventListener('click', () => {
    botaoAbrir.hidden = true;
    formulario.hidden = false;
    formulario.querySelector('#excluir-campo-senha')?.focus();
  });

  botaoCancelar.addEventListener('click', () => {
    formulario.reset();
    limparErros(formulario);
    formulario.hidden = true;
    botaoAbrir.hidden = false;
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const senha = formulario.senha.value;
    if (!senha) {
      mostrarErroDeCampo(formulario, 'senha', 'campo_obrigatorio');
      return;
    }

    const confirmou = await confirmar({
      titulo: t('conta.excluir.titulo_confirmacao'),
      texto: t('conta.excluir.texto_confirmacao'),
      rotuloConfirmar: t('conta.excluir.botao_confirmacao'),
      perigo: true,
    });
    if (!confirmou) return;

    definirEnviando(formulario, true);
    try {
      await chamarApi('/api/conta/excluir', { metodo: 'POST', corpo: { senha } });
      window.location.assign('/');
    } catch (erro) {
      aplicarErroApi(formulario, erro, { senha_atual_incorreta: 'senha' });
    } finally {
      definirEnviando(formulario, false);
    }
  });
}

carregarConta();
ligarPreferencias();
ligarFormularioPerfil();
ligarFormularioSenha();
ligarExclusao();
