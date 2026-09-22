// compartilhado-ferramenta-formulario.js — liga um formulário de ferramenta de cálculo à sua função pura.
// Cuida de: ler campos, calcular, mostrar erro no campo certo, exemplo, copiar, PDF, salvar trabalho,
// rascunho local e reabertura de trabalho salvo. A ferramenta só diz como ler e como mostrar.
import { chamarApi } from './compartilhado-api.js';
import { mostrarAviso } from './compartilhado-aviso.js';
import { baixarArquivo, copiarTexto, gerarPdfResumo, iniciarFerramenta, registrarUso, salvarTrabalho } from './compartilhado-ferramenta.js';
import { lerNumero } from './compartilhado-formatar.js';
import { aoTrocarIdioma, t } from './compartilhado-idioma.js';

/**
 * @param {object} configuracao
 * @param {string} configuracao.slug
 * @param {Record<string, HTMLElement>} configuracao.campos — nome do campo → elemento
 * @param {(valores: Record<string, string>) => object} configuracao.lerEntradas
 * @param {(entradas: object) => object} configuracao.calcular — função pura; devolve { ok } ou { ok:false, erro, campo, extras }
 * @param {(resultado: object, entradas: object) => void} configuracao.mostrar
 * @param {() => void} configuracao.limparMostrador
 * @param {Record<string, string>} configuracao.exemplo
 * @param {(resultado: object, entradas: object) => Array<[string, string]>} configuracao.linhasDoResumo
 * @param {(resultado: object, entradas: object) => string} [configuracao.tituloDoTrabalho]
 * @param {(erro: object) => Record<string, string>} [configuracao.variaveisDoErro]
 */
export function ligarFormularioDeFerramenta(configuracao) {
  const { slug, campos, lerEntradas, calcular, mostrar, limparMostrador, exemplo, linhasDoResumo } = configuracao;
  const formulario = document.querySelector('.ferramenta__formulario');
  const chaveRascunho = `af-rascunho-${slug}`;
  let ultimo = null;
  let usoRegistrado = false;

  function valores() {
    return Object.fromEntries(Object.entries(campos).map(([nome, campo]) => [nome, campo.value]));
  }

  function limparErros() {
    for (const [nome, campo] of Object.entries(campos)) {
      const caixa = document.getElementById(`erro-${nome}`);
      if (caixa) caixa.textContent = '';
      campo.removeAttribute('aria-invalid');
      campo.closest('.campo')?.classList.remove('campo--erro');
    }
  }

  function mostrarErro(resultado) {
    const nome = campos[resultado.campo] ? resultado.campo : Object.keys(campos)[0];
    const campo = campos[nome];
    const caixa = document.getElementById(`erro-${nome}`);
    const variaveis = configuracao.variaveisDoErro?.(resultado) ?? {};
    if (caixa) caixa.textContent = t(`${slug}.erros.${resultado.erro}`, variaveis);
    if (campo) {
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', `erro-${nome}`);
      campo.closest('.campo')?.classList.add('campo--erro');
    }
    limparMostrador();
    ultimo = null;
  }

  function guardarRascunho() {
    try {
      window.localStorage.setItem(chaveRascunho, JSON.stringify(valores()));
    } catch {
      // Armazenamento bloqueado: o rascunho é conveniência, não requisito.
    }
  }

  function preencher(dados) {
    for (const [nome, campo] of Object.entries(campos)) {
      if (dados?.[nome] !== undefined && dados[nome] !== null) campo.value = dados[nome];
    }
  }

  function calcularAgora() {
    limparErros();
    const entradas = lerEntradas(valores());
    const resultado = calcular(entradas);
    if (!resultado.ok) {
      mostrarErro(resultado);
      return null;
    }
    mostrar(resultado, entradas);
    ultimo = { resultado, entradas };
    guardarRascunho();
    if (!usoRegistrado) {
      usoRegistrado = true;
      registrarUso(slug);
    }
    return ultimo;
  }

  function exigirResultado() {
    return ultimo ?? calcularAgora();
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    calcularAgora();
  });

  for (const campo of Object.values(campos)) {
    campo.addEventListener('input', () => {
      if (ultimo || Object.values(campos).some((outro) => outro.value.trim())) calcularAgora();
    });
  }

  document.querySelector('[data-acao="exemplo"]')?.addEventListener('click', () => {
    preencher(exemplo);
    for (const campo of Object.values(campos)) campo.dispatchEvent(new Event('change', { bubbles: true }));
    calcularAgora();
  });

  document.querySelector('[data-acao="copiar"]')?.addEventListener('click', async () => {
    const atual = exigirResultado();
    if (!atual) return;
    const texto = linhasDoResumo(atual.resultado, atual.entradas).map(([rotulo, valor]) => `${rotulo}: ${valor}`).join('\n');
    await copiarTexto(texto);
    mostrarAviso(t('compartilhado.acoes.copiado'));
  });

  document.querySelector('[data-acao="pdf"]')?.addEventListener('click', async () => {
    const atual = exigirResultado();
    if (!atual) return;
    const blob = await gerarPdfResumo({
      titulo: t(`${slug}.titulo`),
      linhas: linhasDoResumo(atual.resultado, atual.entradas),
      rodape: t('compartilhado.ferramenta.processamento_local'),
    });
    baixarArquivo(blob, `${slug}.pdf`);
    registrarUso(slug, 'documento');
    mostrarAviso(t('compartilhado.acoes.baixar'));
  });

  document.querySelector('[data-acao="salvar-trabalho"]')?.addEventListener('click', async () => {
    const atual = exigirResultado();
    if (!atual) return;
    try {
      await salvarTrabalho({
        slug,
        titulo: configuracao.tituloDoTrabalho?.(atual.resultado, atual.entradas) ?? t(`${slug}.titulo`),
        dados: valores(),
      });
      mostrarAviso(t('compartilhado.ferramenta.trabalho_salvo'));
    } catch {
      mostrarAviso(t('compartilhado.ferramenta.entrar_para_salvar'), 'erro');
    }
  });

  aoTrocarIdioma(() => {
    if (ultimo) mostrar(ultimo.resultado, ultimo.entradas);
  });

  iniciarFerramenta({ slug });
  carregarRelacionadas(slug);

  (async () => {
    const id = new URLSearchParams(window.location.search).get('trabalho');
    if (id) {
      try {
        const resposta = await chamarApi('/api/trabalhos?situacao=em_aberto');
        const trabalho = (resposta?.trabalhos ?? []).find((item) => String(item.id) === id);
        if (trabalho?.dados) {
          preencher(trabalho.dados);
          calcularAgora();
          return;
        }
      } catch {
        // Sem conta acessível: segue para o rascunho deste aparelho.
      }
    }
    try {
      const bruto = window.localStorage.getItem(chaveRascunho);
      if (bruto) {
        preencher(JSON.parse(bruto));
        calcularAgora();
      }
    } catch {
      // Sem rascunho utilizável.
    }
  })();

  return { calcular: calcularAgora, preencher, valores, exigirResultado, lerNumero };
}

/** Lista "Quem usa esta, usa também" a partir do manifesto. */
export async function carregarRelacionadas(slug) {
  const lista = document.querySelector('.relacionadas');
  if (!lista) return;
  try {
    const detalhe = await chamarApi(`/api/ferramentas/${slug}`);
    const relacionadas = detalhe?.ferramenta?.relacionadas ?? [];
    if (!relacionadas.length) return;
    const catalogo = await chamarApi('/api/ferramentas');
    const porSlug = new Map((catalogo?.ferramentas ?? []).map((ferramenta) => [ferramenta.slug, ferramenta]));
    for (const outro of relacionadas) {
      const ferramenta = porSlug.get(outro);
      if (!ferramenta) continue;
      const item = document.createElement('li');
      const ligacao = document.createElement('a');
      ligacao.className = 'relacionadas__item';
      ligacao.href = ferramenta.url ?? `/ferramentas/${outro}`;
      const nome = document.createElement('b');
      nome.textContent = ferramenta.nome;
      const descricao = document.createElement('small');
      descricao.className = 'texto-2';
      descricao.textContent = ferramenta.descricao;
      ligacao.append(nome, descricao);
      item.append(ligacao);
      lista.append(item);
    }
  } catch {
    // Sem catálogo agora: a ferramenta funciona sem a lista de relacionadas.
  }
}
