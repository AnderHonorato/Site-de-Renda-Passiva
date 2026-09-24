// admin-ferramentas.js — seção "Ferramentas" do admin: tabela densa com liga/desliga, plano e
// destaque (docs/contratos.md §11 bloco "Admin"). A API devolve a lista inteira; a paginação é
// só de exibição, no navegador.
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { formatarNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { calcularFaixaPaginacao, statusFerramentaAdmin, temProximaPagina } from '/estatico/paginas/admin/admin-utilitarios.js';

const POR_PAGINA = 20;

/**
 * Ferramenta planejada não tem página própria: o interruptor "Ferramenta ativa" não pode
 * parecer ligado e clicável (docs/debate-criticos.md P5). Função pura, testável sem DOM.
 */
export function deveDesabilitarAtiva(ferramenta) {
  return ferramenta?.estado === 'planejada';
}

function avisarResumoDesatualizado() {
  document.dispatchEvent(new CustomEvent('admin:atualizar-resumo'));
}

function criarInterruptor({ marcado, rotulo, desabilitado = false, aoAlternar }) {
  const envolvente = document.createElement('span');
  envolvente.className = 'marcador';

  const interruptor = document.createElement('span');
  interruptor.className = 'interruptor';
  interruptor.setAttribute('role', 'switch');
  interruptor.setAttribute('aria-checked', marcado ? 'true' : 'false');
  interruptor.setAttribute('aria-label', rotulo);

  if (desabilitado) {
    // Ferramenta planejada: sem página própria, então o interruptor não pode parecer
    // clicável nem disparar ação (docs/debate-criticos.md P5).
    interruptor.setAttribute('aria-disabled', 'true');
    interruptor.setAttribute('tabindex', '-1');
  } else {
    interruptor.setAttribute('tabindex', '0');

    const alternar = () => {
      const novoValor = interruptor.getAttribute('aria-checked') !== 'true';
      interruptor.setAttribute('aria-checked', novoValor ? 'true' : 'false');
      aoAlternar(novoValor, () => interruptor.setAttribute('aria-checked', novoValor ? 'false' : 'true'));
    };

    interruptor.addEventListener('click', alternar);
    interruptor.addEventListener('keydown', (evento) => {
      if (evento.key === ' ' || evento.key === 'Enter') {
        evento.preventDefault();
        alternar();
      }
    });
  }

  envolvente.append(interruptor);
  return envolvente;
}

function criarSelectPlano(ferramenta, aoTrocar) {
  const select = document.createElement('select');
  select.className = 'campo__entrada';
  select.setAttribute('aria-label', t('admin.ferramentas.plano_rotulo', { nome: ferramenta.nome }));

  for (const valor of ['gratis', 'plus']) {
    const opcao = document.createElement('option');
    opcao.value = valor;
    opcao.textContent = t(`compartilhado.ferramenta.plano_${valor}`);
    if (ferramenta.plano_efetivo === valor) opcao.selected = true;
    select.append(opcao);
  }

  select.addEventListener('change', () => {
    const anterior = ferramenta.plano_efetivo;
    aoTrocar(select.value, () => {
      select.value = anterior;
    });
  });

  return select;
}

function montarLinha(ferramenta, acoes) {
  const linha = document.createElement('tr');

  const celulaNome = document.createElement('td');
  celulaNome.textContent = ferramenta.nome;
  linha.append(celulaNome);

  const celulaSlug = document.createElement('td');
  const codigo = document.createElement('code');
  codigo.className = 'admin__codigo';
  codigo.textContent = ferramenta.slug;
  celulaSlug.append(codigo);
  linha.append(celulaSlug);

  const celulaCategoria = document.createElement('td');
  celulaCategoria.textContent = t(`compartilhado.categorias.${ferramenta.categoria}.nome`);
  linha.append(celulaCategoria);

  const celulaPlano = document.createElement('td');
  celulaPlano.className = 'admin__tabela-plano';
  celulaPlano.append(criarSelectPlano(ferramenta, (novoPlano, desfazer) => acoes.trocarPlano(ferramenta, novoPlano, desfazer)));
  linha.append(celulaPlano);

  const celulaStatus = document.createElement('td');
  const etiqueta = document.createElement('span');
  const codigoStatus = statusFerramentaAdmin(ferramenta);
  const CLASSE_POR_STATUS = { desativada: 'etiqueta--aviso', pronta: 'etiqueta--pronta', planejada: 'etiqueta--planejada' };
  const CHAVE_POR_STATUS = {
    desativada: 'admin.ferramentas.status_desativada',
    pronta: 'compartilhado.ferramenta.estado_pronta',
    planejada: 'compartilhado.ferramenta.estado_planejada',
  };
  etiqueta.className = `etiqueta ${CLASSE_POR_STATUS[codigoStatus]}`;
  etiqueta.textContent = t(CHAVE_POR_STATUS[codigoStatus]);
  celulaStatus.append(etiqueta);
  linha.append(celulaStatus);

  const celulaUsos = document.createElement('td');
  celulaUsos.textContent = ferramenta.usos_30d > 0 ? formatarNumero(ferramenta.usos_30d, 0) : t('admin.ferramentas.sem_usos');
  linha.append(celulaUsos);

  const celulaAcoes = document.createElement('td');
  celulaAcoes.className = 'tabela__acoes';
  celulaAcoes.append(
    criarInterruptor({
      marcado: ferramenta.ativa,
      rotulo: t('admin.ferramentas.ativa_rotulo', { nome: ferramenta.nome }),
      desabilitado: deveDesabilitarAtiva(ferramenta),
      aoAlternar: (novoValor, desfazer) => acoes.trocarAtiva(ferramenta, novoValor, desfazer),
    }),
  );
  const marcadorDestaque = document.createElement('label');
  marcadorDestaque.className = 'marcador';
  const entradaDestaque = document.createElement('input');
  entradaDestaque.type = 'checkbox';
  entradaDestaque.checked = Boolean(ferramenta.destaque);
  entradaDestaque.setAttribute('aria-label', t('admin.ferramentas.destaque_rotulo', { nome: ferramenta.nome }));
  entradaDestaque.addEventListener('change', () => {
    const anterior = !entradaDestaque.checked;
    acoes.trocarDestaque(ferramenta, entradaDestaque.checked, () => {
      entradaDestaque.checked = anterior;
    });
  });
  marcadorDestaque.append(entradaDestaque);
  celulaAcoes.append(marcadorDestaque);
  linha.append(celulaAcoes);

  return linha;
}

export async function iniciar(painel) {
  const carregando = painel.querySelector('[data-secao-estado="ferramentas"]');
  const bloco = painel.querySelector('.admin__tabela-bloco');
  const corpo = painel.querySelector('.admin-ferramentas__corpo');
  const vazio = painel.querySelector('.admin-ferramentas__vazio');
  const blocoErro = painel.querySelector('.admin-ferramentas__erro');
  const mostrando = painel.querySelector('.admin-ferramentas__mostrando');
  const botaoAnterior = painel.querySelector('.admin-ferramentas__anterior');
  const botaoProxima = painel.querySelector('.admin-ferramentas__proxima');
  const botaoRecarregar = painel.querySelector('.admin-ferramentas__recarregar');

  const estado = { ferramentas: [], pagina: 1 };

  function desenharPagina() {
    const total = estado.ferramentas.length;
    const { inicio, fim } = calcularFaixaPaginacao(estado.pagina, POR_PAGINA, total);
    const visiveis = estado.ferramentas.slice(inicio - 1, fim);

    while (corpo.firstChild) corpo.firstChild.remove();
    for (const ferramenta of visiveis) corpo.append(montarLinha(ferramenta, acoes));

    mostrando.textContent = total ? t('admin.ferramentas.mostrando', { inicio, fim, total }) : '';
    botaoAnterior.disabled = estado.pagina <= 1;
    botaoProxima.disabled = !temProximaPagina(estado.pagina, POR_PAGINA, total);
  }

  function mostrarLista() {
    carregando.hidden = true;
    blocoErro.hidden = true;
    const semItens = estado.ferramentas.length === 0;
    vazio.hidden = !semItens;
    bloco.hidden = semItens;
    if (!semItens) desenharPagina();
  }

  async function aplicarMudanca(slug, mudancas) {
    const resposta = await chamarApi(`/api/admin/ferramentas/${slug}`, { metodo: 'PATCH', corpo: mudancas });
    const indice = estado.ferramentas.findIndex((item) => item.slug === slug);
    if (indice >= 0) estado.ferramentas[indice] = resposta.ferramenta;
    return resposta.ferramenta;
  }

  const acoes = {
    async trocarAtiva(ferramenta, novoValor, desfazer) {
      try {
        await aplicarMudanca(ferramenta.slug, { ativa: novoValor });
        mostrarAviso(t('admin.ferramentas.atualizada', { nome: ferramenta.nome }));
        avisarResumoDesatualizado();
        desenharPagina();
      } catch (erro) {
        desfazer();
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
    async trocarPlano(ferramenta, novoPlano, desfazer) {
      try {
        await aplicarMudanca(ferramenta.slug, { plano: novoPlano });
        mostrarAviso(t('admin.ferramentas.atualizada', { nome: ferramenta.nome }));
        avisarResumoDesatualizado();
        desenharPagina();
      } catch (erro) {
        desfazer();
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
    async trocarDestaque(ferramenta, novoValor, desfazer) {
      try {
        await aplicarMudanca(ferramenta.slug, { destaque: novoValor });
        mostrarAviso(t('admin.ferramentas.atualizada', { nome: ferramenta.nome }));
        desenharPagina();
      } catch (erro) {
        desfazer();
        mostrarAviso(mensagemDeErro(erro), 'erro');
      }
    },
  };

  async function carregar() {
    carregando.hidden = false;
    bloco.hidden = true;
    vazio.hidden = true;
    blocoErro.hidden = true;
    try {
      const resposta = await chamarApi('/api/admin/ferramentas');
      estado.ferramentas = resposta?.ferramentas ?? [];
      estado.pagina = 1;
      mostrarLista();
    } catch {
      carregando.hidden = true;
      blocoErro.hidden = false;
    }
  }

  botaoAnterior.addEventListener('click', () => {
    if (estado.pagina <= 1) return;
    estado.pagina -= 1;
    desenharPagina();
  });
  botaoProxima.addEventListener('click', () => {
    if (!temProximaPagina(estado.pagina, POR_PAGINA, estado.ferramentas.length)) return;
    estado.pagina += 1;
    desenharPagina();
  });
  botaoRecarregar.addEventListener('click', carregar);

  await carregar();
}
