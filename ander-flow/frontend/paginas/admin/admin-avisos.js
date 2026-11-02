// admin-avisos.js — seção "Avisos e mensagens" do admin: CRUD de avisos (dois idiomas e período
// obrigatórios) e as conversas de mensagens, com resposta (docs/contratos.md §11 bloco "Admin").
import { chamarApi, ErroApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { confirmar, mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { formatarData, formatarTempoRelativo } from '/estatico/compartilhado/compartilhado-formatar.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { aplicarErrosCampos, limparErrosCampos } from '/estatico/paginas/admin/admin-formulario.js';

function avisarResumoDesatualizado() {
  document.dispatchEvent(new CustomEvent('admin:atualizar-resumo'));
}

function traduzirCodigoErro(codigo) {
  return t(`compartilhado.erros.${codigo}`);
}

function criarIcone(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icone icone--20');
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

function criarBotaoIcone(nome, rotulo, aoClicar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'tabela__botao-acao';
  botao.setAttribute('aria-label', rotulo);
  botao.append(criarIcone(nome));
  botao.addEventListener('click', aoClicar);
  return botao;
}

function isoParaDatetimeLocal(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalParaIso(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

// ===================================================================
// Avisos (criar, editar, ativar/desativar, excluir)
// ===================================================================

function montarLinhaAviso(aviso, acoes) {
  const linha = document.createElement('tr');

  const celulaTitulo = document.createElement('td');
  celulaTitulo.textContent = aviso.titulo_pt_br;
  linha.append(celulaTitulo);

  const celulaTipo = document.createElement('td');
  celulaTipo.textContent = t(`admin.avisos.tipo_${aviso.tipo}`);
  linha.append(celulaTipo);

  const celulaPublico = document.createElement('td');
  celulaPublico.textContent = t(`admin.avisos.publico_${aviso.publico}`);
  linha.append(celulaPublico);

  const celulaVigencia = document.createElement('td');
  celulaVigencia.className = 'admin-avisos__vigencia';
  const fim = aviso.fim_em ? formatarData(aviso.fim_em) : t('admin.avisos.sem_fim');
  celulaVigencia.textContent = `${formatarData(aviso.inicio_em)} – ${fim}`;
  linha.append(celulaVigencia);

  const celulaStatus = document.createElement('td');
  const etiqueta = document.createElement('span');
  etiqueta.className = `etiqueta ${aviso.ativo ? 'etiqueta--pronta' : 'etiqueta--aviso'}`;
  etiqueta.textContent = t(aviso.ativo ? 'admin.avisos.status_ativo' : 'admin.avisos.status_inativo');
  celulaStatus.append(etiqueta);
  linha.append(celulaStatus);

  const celulaAcoes = document.createElement('td');
  celulaAcoes.className = 'tabela__acoes';
  celulaAcoes.append(
    criarBotaoIcone('editar', `${t('admin.avisos.editar')}: ${aviso.titulo_pt_br}`, () => acoes.editar(aviso)),
    criarBotaoIcone('excluir', `${t('compartilhado.acoes.excluir')}: ${aviso.titulo_pt_br}`, () => acoes.excluir(aviso)),
  );
  linha.append(celulaAcoes);

  return linha;
}

function criarDialogoAviso({ aoSalvar }) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';

  const titulo = document.createElement('p');
  titulo.className = 'modal__titulo';
  dialogo.append(titulo);

  const form = document.createElement('form');
  form.className = 'admin-avisos__formulario';
  form.method = 'dialog';

  function campoSelect(nome, rotuloChave, opcoes) {
    const label = document.createElement('label');
    label.className = 'campo';
    label.dataset.campo = nome;
    const rotulo = document.createElement('span');
    rotulo.className = 'campo__rotulo';
    rotulo.textContent = t(rotuloChave);
    const controle = document.createElement('span');
    controle.className = 'campo__controle';
    const select = document.createElement('select');
    select.className = 'campo__entrada';
    select.name = nome;
    for (const [valor, chaveTexto] of opcoes) {
      const opcao = document.createElement('option');
      opcao.value = valor;
      opcao.textContent = t(chaveTexto);
      select.append(opcao);
    }
    controle.append(select);
    const erro = document.createElement('span');
    erro.className = 'campo__erro';
    label.append(rotulo, controle, erro);
    return { label, select, erro };
  }

  function campoTexto(nome, rotuloChave, { tipo = 'text', area = false, ajudaChave = null } = {}) {
    const label = document.createElement('label');
    label.className = 'campo';
    label.dataset.campo = nome;
    const rotulo = document.createElement('span');
    rotulo.className = 'campo__rotulo';
    rotulo.textContent = t(rotuloChave);
    const controle = document.createElement('span');
    controle.className = 'campo__controle';
    const entrada = document.createElement(area ? 'textarea' : 'input');
    entrada.className = 'campo__entrada';
    entrada.name = nome;
    if (!area) entrada.type = tipo;
    if (area) entrada.rows = 4;
    controle.append(entrada);
    const partes = [label, rotulo, controle];
    let ajuda = null;
    if (ajudaChave) {
      ajuda = document.createElement('span');
      ajuda.className = 'campo__ajuda';
      ajuda.textContent = t(ajudaChave);
    }
    const erro = document.createElement('span');
    erro.className = 'campo__erro';
    label.append(rotulo, controle);
    if (ajuda) label.append(ajuda);
    label.append(erro);
    return { label, entrada, erro };
  }

  const tipoCampo = campoSelect('tipo', 'admin.avisos.campo_tipo', [
    ['sistema', 'admin.avisos.tipo_sistema'],
    ['popup', 'admin.avisos.tipo_popup'],
  ]);
  const publicoCampo = campoSelect('publico', 'admin.avisos.campo_publico', [
    ['todos', 'admin.avisos.publico_todos'],
    ['gratis', 'admin.avisos.publico_gratis'],
    ['plus', 'admin.avisos.publico_plus'],
    ['anonimos', 'admin.avisos.publico_anonimos'],
  ]);
  const linhaTipoPublico = document.createElement('div');
  linhaTipoPublico.className = 'admin-avisos__linha-dupla';
  linhaTipoPublico.append(tipoCampo.label, publicoCampo.label);

  const tituloPtBr = campoTexto('titulo_pt_br', 'admin.avisos.campo_titulo_pt_br');
  const tituloEn = campoTexto('titulo_en', 'admin.avisos.campo_titulo_en');
  const linhaTitulos = document.createElement('div');
  linhaTitulos.className = 'admin-avisos__linha-dupla';
  linhaTitulos.append(tituloPtBr.label, tituloEn.label);

  const corpoPtBr = campoTexto('corpo_pt_br', 'admin.avisos.campo_corpo_pt_br', { area: true });
  const corpoEn = campoTexto('corpo_en', 'admin.avisos.campo_corpo_en', { area: true });
  const linhaCorpos = document.createElement('div');
  linhaCorpos.className = 'admin-avisos__linha-dupla';
  linhaCorpos.append(corpoPtBr.label, corpoEn.label);

  const linkUrl = campoTexto('link_url', 'admin.avisos.campo_link_url', { ajudaChave: 'admin.avisos.campo_link_url_ajuda' });
  const linkRotuloPtBr = campoTexto('link_rotulo_pt_br', 'admin.avisos.campo_link_rotulo_pt_br');
  const linkRotuloEn = campoTexto('link_rotulo_en', 'admin.avisos.campo_link_rotulo_en');
  const linhaLinkRotulos = document.createElement('div');
  linhaLinkRotulos.className = 'admin-avisos__linha-dupla';
  linhaLinkRotulos.append(linkRotuloPtBr.label, linkRotuloEn.label);

  const inicioEm = campoTexto('inicio_em', 'admin.avisos.campo_inicio_em', { tipo: 'datetime-local' });
  const fimEm = campoTexto('fim_em', 'admin.avisos.campo_fim_em', { tipo: 'datetime-local' });
  const linhaPeriodo = document.createElement('div');
  linhaPeriodo.className = 'admin-avisos__linha-dupla';
  linhaPeriodo.append(inicioEm.label, fimEm.label);

  const ativoLabel = document.createElement('label');
  ativoLabel.className = 'marcador';
  const ativoEntrada = document.createElement('input');
  ativoEntrada.type = 'checkbox';
  ativoEntrada.name = 'ativo';
  const ativoTexto = document.createElement('span');
  ativoTexto.textContent = t('admin.avisos.campo_ativo');
  ativoLabel.append(ativoEntrada, ativoTexto);

  const acoesForm = document.createElement('div');
  acoesForm.className = 'admin__form-acoes';
  const botaoCancelar = document.createElement('button');
  botaoCancelar.type = 'button';
  botaoCancelar.className = 'botao botao--secundario';
  botaoCancelar.textContent = t('compartilhado.acoes.cancelar');
  botaoCancelar.addEventListener('click', () => dialogo.close());
  const botaoSalvar = document.createElement('button');
  botaoSalvar.type = 'submit';
  botaoSalvar.className = 'botao botao--primario';
  botaoSalvar.textContent = t('admin.avisos.salvar');
  acoesForm.append(botaoCancelar, botaoSalvar);

  form.append(
    linhaTipoPublico,
    linhaTitulos,
    linhaCorpos,
    linkUrl.label,
    linhaLinkRotulos,
    linhaPeriodo,
    ativoLabel,
    acoesForm,
  );
  dialogo.append(form);
  document.body.append(dialogo);

  const campos = {
    tipo: tipoCampo.select,
    publico: publicoCampo.select,
    titulo_pt_br: tituloPtBr.entrada,
    titulo_en: tituloEn.entrada,
    corpo_pt_br: corpoPtBr.entrada,
    corpo_en: corpoEn.entrada,
    link_url: linkUrl.entrada,
    link_rotulo_pt_br: linkRotuloPtBr.entrada,
    link_rotulo_en: linkRotuloEn.entrada,
    inicio_em: inicioEm.entrada,
    fim_em: fimEm.entrada,
    ativo: ativoEntrada,
  };

  let avisoEmEdicao = null;

  function abrir(aviso = null) {
    avisoEmEdicao = aviso;
    limparErrosCampos(form);
    titulo.textContent = aviso ? t('admin.avisos.editar') : t('admin.avisos.novo');
    campos.tipo.value = aviso?.tipo ?? 'sistema';
    campos.publico.value = aviso?.publico ?? 'todos';
    campos.titulo_pt_br.value = aviso?.titulo_pt_br ?? '';
    campos.titulo_en.value = aviso?.titulo_en ?? '';
    campos.corpo_pt_br.value = aviso?.corpo_pt_br ?? '';
    campos.corpo_en.value = aviso?.corpo_en ?? '';
    campos.link_url.value = aviso?.link_url ?? '';
    campos.link_rotulo_pt_br.value = aviso?.link_rotulo_pt_br ?? '';
    campos.link_rotulo_en.value = aviso?.link_rotulo_en ?? '';
    campos.inicio_em.value = aviso ? isoParaDatetimeLocal(aviso.inicio_em) : isoParaDatetimeLocal(new Date().toISOString());
    campos.fim_em.value = aviso?.fim_em ? isoParaDatetimeLocal(aviso.fim_em) : '';
    campos.ativo.checked = aviso ? Boolean(aviso.ativo) : true;
    dialogo.showModal();
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const corpoRequisicao = {
      tipo: campos.tipo.value,
      publico: campos.publico.value,
      titulo_pt_br: campos.titulo_pt_br.value,
      titulo_en: campos.titulo_en.value,
      corpo_pt_br: campos.corpo_pt_br.value,
      corpo_en: campos.corpo_en.value,
      inicio_em: datetimeLocalParaIso(campos.inicio_em.value) ?? new Date().toISOString(),
      fim_em: campos.fim_em.value ? datetimeLocalParaIso(campos.fim_em.value) : null,
      ativo: campos.ativo.checked,
    };
    if (campos.link_url.value.trim()) corpoRequisicao.link_url = campos.link_url.value.trim();
    if (campos.link_rotulo_pt_br.value.trim()) corpoRequisicao.link_rotulo_pt_br = campos.link_rotulo_pt_br.value.trim();
    if (campos.link_rotulo_en.value.trim()) corpoRequisicao.link_rotulo_en = campos.link_rotulo_en.value.trim();

    try {
      if (avisoEmEdicao) {
        await chamarApi(`/api/admin/avisos/${avisoEmEdicao.id}`, { metodo: 'PATCH', corpo: corpoRequisicao });
        mostrarAviso(t('admin.avisos.atualizado'));
      } else {
        await chamarApi('/api/admin/avisos', { metodo: 'POST', corpo: corpoRequisicao });
        mostrarAviso(t('admin.avisos.criado'));
      }
      dialogo.close();
      await aoSalvar();
    } catch (erro) {
      if (erro instanceof ErroApi && erro.codigo === 'dados_invalidos') {
        aplicarErrosCampos(form, erro.extras?.campos, traduzirCodigoErro);
        return;
      }
      mostrarAviso(mensagemDeErro(erro), 'erro');
    }
  });

  return { abrir };
}

function iniciarAvisos(painelAvisos) {
  const carregando = painelAvisos.querySelector('[data-secao-estado="avisos"]');
  const bloco = painelAvisos.querySelector('.admin__tabela-bloco');
  const corpo = painelAvisos.querySelector('.admin-avisos__corpo');
  const vazio = painelAvisos.querySelector('.admin-avisos__vazio');
  const blocoErro = painelAvisos.querySelector('.admin-avisos__erro');
  const botaoNovo = painelAvisos.querySelector('.admin-avisos__novo');
  const botaoRecarregar = painelAvisos.querySelector('.admin-avisos__recarregar');

  async function carregar() {
    carregando.hidden = false;
    bloco.hidden = true;
    vazio.hidden = true;
    blocoErro.hidden = true;
    try {
      const resposta = await chamarApi('/api/admin/avisos');
      const avisos = resposta?.avisos ?? [];
      carregando.hidden = true;

      if (!avisos.length) {
        vazio.hidden = false;
        return;
      }

      while (corpo.firstChild) corpo.firstChild.remove();
      for (const aviso of avisos) corpo.append(montarLinhaAviso(aviso, acoes));
      bloco.hidden = false;
    } catch {
      carregando.hidden = true;
      blocoErro.hidden = false;
    }
  }

  const dialogo = criarDialogoAviso({ aoSalvar: carregar });

  const acoes = {
    editar(aviso) {
      dialogo.abrir(aviso);
    },
    async excluir(aviso) {
      const confirmou = await confirmar({
        titulo: t('admin.avisos.excluir_confirmar_titulo'),
        texto: t('admin.avisos.excluir_confirmar_texto'),
        rotuloConfirmar: t('compartilhado.acoes.excluir'),
        perigo: true,
      });
      if (!confirmou) return;
      try {
        await chamarApi(`/api/admin/avisos/${aviso.id}`, { metodo: 'DELETE' });
        mostrarAviso(t('admin.avisos.excluido'));
        await carregar();
      } catch (erro) {
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
  };

  botaoNovo.addEventListener('click', () => dialogo.abrir(null));
  botaoRecarregar.addEventListener('click', carregar);

  return carregar();
}

// ===================================================================
// Mensagens (conversas com usuários, ler e responder)
// ===================================================================

function iniciarMensagens(painelMensagens) {
  const carregando = painelMensagens.querySelector('[data-secao-estado="mensagens"]');
  const lista = painelMensagens.querySelector('.admin-mensagens__lista');
  const vazio = painelMensagens.querySelector('.admin-mensagens__vazio');
  const blocoErro = painelMensagens.querySelector('.admin-mensagens__erro');
  const botaoRecarregar = painelMensagens.querySelector('.admin-mensagens__recarregar');
  const semSelecao = painelMensagens.querySelector('.admin-mensagens__sem-selecao');
  const thread = painelMensagens.querySelector('.admin-mensagens__thread');
  const linhasThread = painelMensagens.querySelector('.admin-mensagens__linhas');
  const formResposta = painelMensagens.querySelector('.admin-mensagens__form');
  const entradaResposta = painelMensagens.querySelector('.admin-mensagens__entrada');

  const estado = { conversas: [], usuarioSelecionadoId: null, carregado: false };

  function montarItemConversa(conversa) {
    const item = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'admin-mensagens__item';
    botao.dataset.usuarioId = String(conversa.usuario_id);
    if (conversa.usuario_id === estado.usuarioSelecionadoId) botao.setAttribute('aria-current', 'true');
    botao.setAttribute('aria-label', t('admin.mensagens.abrir_conversa', { nome: conversa.nome }));

    const linhaNome = document.createElement('span');
    linhaNome.className = 'admin-mensagens__item-nome';
    const nome = document.createElement('span');
    nome.textContent = conversa.nome;
    linhaNome.append(nome);
    if (conversa.nao_lidas > 0) {
      const etiqueta = document.createElement('span');
      etiqueta.className = 'etiqueta etiqueta--aviso';
      etiqueta.textContent = String(conversa.nao_lidas);
      linhaNome.append(etiqueta);
    }

    const email = document.createElement('span');
    email.className = 'admin-mensagens__item-email';
    email.textContent = conversa.email;

    const quando = document.createElement('span');
    quando.className = 'admin-mensagens__item-quando';
    quando.textContent = formatarTempoRelativo(conversa.ultima_em);

    botao.append(linhaNome, email, quando);
    botao.addEventListener('click', () => abrirConversa(conversa));
    item.append(botao);
    return item;
  }

  function desenharLista() {
    while (lista.firstChild) lista.firstChild.remove();
    for (const conversa of estado.conversas) lista.append(montarItemConversa(conversa));
    lista.hidden = false;
  }

  function montarBolhaMensagem(mensagem, nomeUsuario) {
    const bolha = document.createElement('div');
    bolha.className = `admin-mensagens__linha${mensagem.autor === 'admin' ? ' admin-mensagens__linha--admin' : ''}`;
    const corpo = document.createElement('p');
    corpo.textContent = mensagem.corpo;
    const meta = document.createElement('span');
    meta.className = 'admin-mensagens__linha-meta';
    meta.textContent = `${mensagem.autor === 'admin' ? t('admin.mensagens.autor_admin') : t('admin.mensagens.autor_usuario', { nome: nomeUsuario })} · ${formatarTempoRelativo(mensagem.criado_em)}`;
    bolha.append(corpo, meta);
    return bolha;
  }

  async function abrirConversa(conversa) {
    estado.usuarioSelecionadoId = conversa.usuario_id;
    for (const botao of lista.querySelectorAll('.admin-mensagens__item')) {
      if (Number(botao.dataset.usuarioId) === conversa.usuario_id) botao.setAttribute('aria-current', 'true');
      else botao.removeAttribute('aria-current');
    }

    try {
      const resposta = await chamarApi(`/api/admin/mensagens/${conversa.usuario_id}`);
      const mensagens = resposta?.mensagens ?? [];
      while (linhasThread.firstChild) linhasThread.firstChild.remove();
      for (const mensagem of mensagens) linhasThread.append(montarBolhaMensagem(mensagem, conversa.nome));
      linhasThread.scrollTop = linhasThread.scrollHeight;

      semSelecao.hidden = true;
      thread.hidden = false;
      formResposta.dataset.usuarioId = String(conversa.usuario_id);

      if (conversa.nao_lidas > 0) {
        conversa.nao_lidas = 0;
        const botaoConversa = lista.querySelector(`[data-usuario-id="${conversa.usuario_id}"]`);
        if (botaoConversa) botaoConversa.replaceWith(montarItemConversa(conversa));
        avisarResumoDesatualizado();
      }
    } catch (erro) {
      mostrarAviso(mensagemDeErro(erro), 'erro');
    }
  }

  async function carregar() {
    carregando.hidden = false;
    lista.hidden = true;
    vazio.hidden = true;
    blocoErro.hidden = true;
    try {
      const resposta = await chamarApi('/api/admin/mensagens');
      estado.conversas = resposta?.conversas ?? [];
      carregando.hidden = true;
      estado.carregado = true;

      if (!estado.conversas.length) {
        vazio.hidden = false;
        return;
      }
      desenharLista();
    } catch {
      carregando.hidden = true;
      blocoErro.hidden = false;
    }
  }

  formResposta.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const usuarioId = formResposta.dataset.usuarioId;
    const corpo = entradaResposta.value.trim();
    if (!usuarioId || !corpo) return;
    try {
      const resposta = await chamarApi(`/api/admin/mensagens/${usuarioId}`, { metodo: 'POST', corpo: { corpo } });
      const conversa = estado.conversas.find((item) => String(item.usuario_id) === usuarioId);
      linhasThread.append(montarBolhaMensagem(resposta.mensagem, conversa?.nome ?? ''));
      linhasThread.scrollTop = linhasThread.scrollHeight;
      entradaResposta.value = '';
      mostrarAviso(t('admin.mensagens.resposta_enviada'));
    } catch (erro) {
      mostrarAviso(mensagemDeErro(erro), 'erro');
    }
  });

  botaoRecarregar.addEventListener('click', carregar);

  return {
    async garantirCarregado() {
      if (!estado.carregado) await carregar();
    },
  };
}

// ===================================================================
// Abas (Avisos do sistema / Mensagens) e ponto de entrada da seção
// ===================================================================

export async function iniciar(painel) {
  const abaAvisos = painel.querySelector('#admin-aba-avisos');
  const abaMensagens = painel.querySelector('#admin-aba-mensagens');
  const painelAvisos = painel.querySelector('#admin-painel-avisos');
  const painelMensagens = painel.querySelector('#admin-painel-mensagens');

  const mensagens = iniciarMensagens(painelMensagens);

  function selecionarAba(aba) {
    const ehAvisos = aba === 'avisos';
    abaAvisos.setAttribute('aria-selected', ehAvisos ? 'true' : 'false');
    abaMensagens.setAttribute('aria-selected', ehAvisos ? 'false' : 'true');
    painelAvisos.hidden = !ehAvisos;
    painelMensagens.hidden = ehAvisos;
    if (!ehAvisos) mensagens.garantirCarregado();
  }

  abaAvisos.addEventListener('click', () => selecionarAba('avisos'));
  abaMensagens.addEventListener('click', () => selecionarAba('mensagens'));

  await iniciarAvisos(painelAvisos);
}
