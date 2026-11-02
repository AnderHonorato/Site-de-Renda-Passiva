// admin-usuarios.js — seção "Usuários" do admin: busca, paginação de 20, plano/papel/situação e
// encerrar sessões (docs/contratos.md §11 bloco "Admin"). A própria conta não pode se rebaixar
// nem se suspender — a API devolve `acao_nao_permitida` e a mensagem real é mostrada, nunca escondida.
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { confirmar, mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { formatarData } from '/estatico/compartilhado/compartilhado-formatar.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { calcularFaixaPaginacao, temProximaPagina } from '/estatico/paginas/admin/admin-utilitarios.js';

const POR_PAGINA = 20;
const ATRASO_BUSCA_MS = 350;

function avisarResumoDesatualizado() {
  document.dispatchEvent(new CustomEvent('admin:atualizar-resumo'));
}

function criarSelect(valores, valorAtual, rotulo, traduzirOpcao) {
  const select = document.createElement('select');
  select.className = 'campo__entrada';
  select.setAttribute('aria-label', rotulo);
  for (const valor of valores) {
    const opcao = document.createElement('option');
    opcao.value = valor;
    opcao.textContent = traduzirOpcao(valor);
    if (valor === valorAtual) opcao.selected = true;
    select.append(opcao);
  }
  return select;
}

function montarLinha(usuario, acoes) {
  const linha = document.createElement('tr');

  const celulaNome = document.createElement('td');
  celulaNome.textContent = usuario.nome;
  linha.append(celulaNome);

  const celulaEmail = document.createElement('td');
  celulaEmail.textContent = usuario.email;
  linha.append(celulaEmail);

  const celulaPlano = document.createElement('td');
  const selectPlano = criarSelect(['gratis', 'plus'], usuario.plano, t('admin.usuarios.plano_rotulo', { nome: usuario.nome }), (valor) =>
    t(`compartilhado.ferramenta.plano_${valor}`),
  );
  selectPlano.addEventListener('change', () => {
    const anterior = usuario.plano;
    acoes.aplicar(usuario, { plano: selectPlano.value }, () => {
      selectPlano.value = anterior;
    });
  });
  celulaPlano.append(selectPlano);
  linha.append(celulaPlano);

  const celulaPapel = document.createElement('td');
  const selectPapel = criarSelect(['usuario', 'admin'], usuario.papel, t('admin.usuarios.papel_rotulo', { nome: usuario.nome }), (valor) =>
    t(`admin.usuarios.papel_${valor}`),
  );
  selectPapel.addEventListener('change', async () => {
    const anterior = usuario.papel;
    if (anterior === 'admin' && selectPapel.value === 'usuario') {
      const confirmou = await confirmar({
        titulo: t('admin.usuarios.rebaixar_confirmar_titulo', { nome: usuario.nome }),
        texto: t('admin.usuarios.rebaixar_confirmar_texto'),
        rotuloConfirmar: t('compartilhado.acoes.confirmar'),
        perigo: true,
      });
      if (!confirmou) {
        selectPapel.value = anterior;
        return;
      }
    }
    acoes.aplicar(usuario, { papel: selectPapel.value }, () => {
      selectPapel.value = anterior;
    });
  });
  celulaPapel.append(selectPapel);
  linha.append(celulaPapel);

  const celulaSituacao = document.createElement('td');
  const selectSituacao = criarSelect(['ativo', 'suspenso'], usuario.situacao, t('admin.usuarios.situacao_rotulo', { nome: usuario.nome }), (valor) =>
    t(`admin.usuarios.situacao_${valor}`),
  );
  selectSituacao.addEventListener('change', async () => {
    const anterior = usuario.situacao;
    if (selectSituacao.value === 'suspenso') {
      const confirmou = await confirmar({
        titulo: t('admin.usuarios.suspender_confirmar_titulo', { nome: usuario.nome }),
        texto: t('admin.usuarios.suspender_confirmar_texto'),
        rotuloConfirmar: t('compartilhado.acoes.confirmar'),
        perigo: true,
      });
      if (!confirmou) {
        selectSituacao.value = anterior;
        return;
      }
    }
    acoes.aplicar(usuario, { situacao: selectSituacao.value }, () => {
      selectSituacao.value = anterior;
    });
  });
  celulaSituacao.append(selectSituacao);
  linha.append(celulaSituacao);

  const celulaCriado = document.createElement('td');
  celulaCriado.textContent = formatarData(usuario.criado_em);
  linha.append(celulaCriado);

  const celulaAcesso = document.createElement('td');
  celulaAcesso.textContent = usuario.ultimo_acesso_em ? formatarData(usuario.ultimo_acesso_em) : t('admin.usuarios.sem_acesso');
  linha.append(celulaAcesso);

  const celulaAcoes = document.createElement('td');
  celulaAcoes.className = 'tabela__acoes';
  const botaoEncerrar = document.createElement('button');
  botaoEncerrar.type = 'button';
  botaoEncerrar.className = 'botao botao--secundario botao--pequeno';
  botaoEncerrar.textContent = t('admin.usuarios.encerrar_sessoes');
  botaoEncerrar.addEventListener('click', () => acoes.encerrarSessoes(usuario));
  celulaAcoes.append(botaoEncerrar);
  linha.append(celulaAcoes);

  return linha;
}

export async function iniciar(painel) {
  const campoBusca = painel.querySelector('.busca-intencao__entrada');
  const carregando = painel.querySelector('[data-secao-estado="usuarios"]');
  const bloco = painel.querySelector('.admin__tabela-bloco');
  const corpo = painel.querySelector('.admin-usuarios__corpo');
  const vazio = painel.querySelector('.admin-usuarios__vazio');
  const vazioTitulo = painel.querySelector('.admin-usuarios__vazio-titulo');
  const blocoErro = painel.querySelector('.admin-usuarios__erro');
  const mostrando = painel.querySelector('.admin-usuarios__mostrando');
  const botaoAnterior = painel.querySelector('.admin-usuarios__anterior');
  const botaoProxima = painel.querySelector('.admin-usuarios__proxima');
  const botaoRecarregar = painel.querySelector('.admin-usuarios__recarregar');

  const estado = { busca: '', pagina: 1, usuarios: [], total: 0 };
  let idTemporizador = null;

  const acoes = {
    async aplicar(usuario, mudancas, desfazer) {
      try {
        const resposta = await chamarApi(`/api/admin/usuarios/${usuario.id}`, { metodo: 'PATCH', corpo: mudancas });
        Object.assign(usuario, resposta.usuario);
        mostrarAviso(t('admin.usuarios.atualizado', { nome: usuario.nome }));
        avisarResumoDesatualizado();
      } catch (erro) {
        desfazer();
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
    async encerrarSessoes(usuario) {
      const confirmou = await confirmar({
        titulo: t('admin.usuarios.encerrar_sessoes_confirmar_titulo', { nome: usuario.nome }),
        texto: t('admin.usuarios.encerrar_sessoes_confirmar_texto'),
        rotuloConfirmar: t('admin.usuarios.encerrar_sessoes'),
        perigo: true,
      });
      if (!confirmou) return;
      try {
        await chamarApi(`/api/admin/usuarios/${usuario.id}/encerrar-sessoes`, { metodo: 'POST' });
        mostrarAviso(t('admin.usuarios.sessoes_encerradas', { nome: usuario.nome }));
      } catch (erro) {
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
  };

  function desenhar() {
    while (corpo.firstChild) corpo.firstChild.remove();
    for (const usuario of estado.usuarios) corpo.append(montarLinha(usuario, acoes));

    const { inicio, fim } = calcularFaixaPaginacao(estado.pagina, POR_PAGINA, estado.total);
    mostrando.textContent = estado.total ? t('admin.usuarios.mostrando', { inicio, fim, total: estado.total }) : '';
    botaoAnterior.disabled = estado.pagina <= 1;
    botaoProxima.disabled = !temProximaPagina(estado.pagina, POR_PAGINA, estado.total);
  }

  async function carregar() {
    carregando.hidden = false;
    bloco.hidden = true;
    vazio.hidden = true;
    blocoErro.hidden = true;
    try {
      const parametros = new URLSearchParams({ pagina: String(estado.pagina) });
      if (estado.busca) parametros.set('busca', estado.busca);
      const resposta = await chamarApi(`/api/admin/usuarios?${parametros.toString()}`);
      estado.usuarios = resposta?.usuarios ?? [];
      estado.total = resposta?.total ?? 0;
      carregando.hidden = true;

      if (!estado.usuarios.length) {
        vazioTitulo.textContent = estado.busca
          ? t('admin.usuarios.vazio_busca', { consulta: estado.busca })
          : t('admin.usuarios.vazio_titulo');
        vazio.hidden = false;
        bloco.hidden = true;
        return;
      }

      bloco.hidden = false;
      desenhar();
    } catch {
      carregando.hidden = true;
      blocoErro.hidden = false;
    }
  }

  campoBusca.addEventListener('input', () => {
    if (idTemporizador) clearTimeout(idTemporizador);
    idTemporizador = setTimeout(() => {
      estado.busca = campoBusca.value.trim();
      estado.pagina = 1;
      carregar();
    }, ATRASO_BUSCA_MS);
  });

  botaoAnterior.addEventListener('click', () => {
    if (estado.pagina <= 1) return;
    estado.pagina -= 1;
    carregar();
  });
  botaoProxima.addEventListener('click', () => {
    if (!temProximaPagina(estado.pagina, POR_PAGINA, estado.total)) return;
    estado.pagina += 1;
    carregar();
  });
  botaoRecarregar.addEventListener('click', carregar);

  await carregar();
}
