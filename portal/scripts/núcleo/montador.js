/**
 * Montador declarativo de ferramentas.
 *
 * Uma ferramenta descreve seus campos e a função de cálculo; o montador entrega
 * de graça: rótulos ligados aos campos, validação com erro no campo certo,
 * estado de carregamento, estado de conclusão, tratamento de exceção, resultado
 * acessível e os botões de exportação. Assim nenhuma ferramenta "esquece" de ter
 * erro ou loading, que era o defeito mais comum do portal antigo.
 */
import { escapar, paraNúmero } from './texto.js';
import { ícone } from './ícones.js';
import { criarProgresso, mostrarErro, limparErros, lerFormulário, avisar } from './interface.js';
import { copiar, baixar, baixarCsv, baixarPlanilha, nomeDeArquivo } from './exportar.js';
import { marcarResultado, pulsar } from './movimento.js';
import { registrarUso } from './uso-ferramentas.js';
import { api } from './api.js';
import { caminhoDoIdioma, obterSessao } from './sessão.js';

/** Erro de entrada: a mensagem vai para o campo indicado, não para o console. */
export class ErroDeEntrada extends Error {
  /** @param {string} mensagem @param {string} [campo] nome do campo culpado */
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = 'ErroDeEntrada';
    this.campo = campo;
  }
}

/**
 * Executa um cálculo e transforma a recusa dele em erro do campo certo.
 *
 * Os módulos de cálculo lançam `Error` comum, porque não conhecem a interface.
 * Sem esta ponte, uma recusa legítima — "margem e taxas somam mais de 100%" —
 * chegava à pessoa como "Algo deu errado no cálculo", que não ajuda ninguém a
 * consertar o que digitou.
 *
 * @template T
 * @param {string} campo nome do campo que a pessoa precisa corrigir
 * @param {() => T} executar
 * @returns {T}
 */
export function comCampo(campo, executar) {
  try {
    return executar();
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) throw erro;
    if (erro instanceof RangeError) {
      throw new ErroDeEntrada('O valor informado é grande ou profundo demais para processar.', campo);
    }
    throw new ErroDeEntrada(erro instanceof Error ? erro.message : String(erro), campo);
  }
}

/**
 * Lê um campo numérico validando faixa.
 * @param {Record<string,string>} dados
 * @param {string} nome
 * @param {{rótulo: string, mín?: number, máx?: number, inteiro?: boolean, obrigatório?: boolean, padrão?: number}} regras
 * @returns {number}
 */
export function número(dados, nome, regras) {
  const { rótulo, mín, máx, inteiro = false, obrigatório = true, padrão } = regras;
  const bruto = String(dados[nome] ?? '').trim();
  if (!bruto) {
    // Não dá para acertar género e número derivando do rótulo: "Informe renda
    // desejada" e "Informe custo" pedem artigos diferentes. Citar o campo entre
    // aspas resolve para todos os rótulos sem inventar concordância.
    if (obrigatório) throw new ErroDeEntrada(`Preencha o campo "${rótulo}".`, nome);
    return padrão ?? 0;
  }
  const valor = paraNúmero(bruto);
  if (!Number.isFinite(valor)) throw new ErroDeEntrada(`${rótulo} precisa ser um número.`, nome);
  if (inteiro && !Number.isInteger(valor)) throw new ErroDeEntrada(`${rótulo} precisa ser um número inteiro.`, nome);
  if (mín !== undefined && valor < mín) throw new ErroDeEntrada(`${rótulo} não pode ser menor que ${mín}.`, nome);
  if (máx !== undefined && valor > máx) throw new ErroDeEntrada(`${rótulo} não pode ser maior que ${máx}.`, nome);
  return valor;
}

/**
 * Lê um campo de texto validando tamanho.
 * @param {Record<string,string>} dados
 * @param {string} nome
 * @param {{rótulo: string, obrigatório?: boolean, máximo?: number}} regras
 * @returns {string}
 */
export function texto(dados, nome, { rótulo, obrigatório = true, máximo = 2000 }) {
  const valor = String(dados[nome] ?? '').trim();
  if (!valor && obrigatório) throw new ErroDeEntrada(`Preencha o campo "${rótulo}".`, nome);
  if (valor.length > máximo) throw new ErroDeEntrada(`${rótulo} passou de ${máximo} caracteres.`, nome);
  return valor;
}

export function preencherFormulário(formulário, dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return;
  for (const [nome, valor] of Object.entries(dados)) {
    const controles = formulário.querySelectorAll(`[name="${CSS.escape(nome)}"]`);
    for (const controle of controles) {
      if (controle instanceof HTMLInputElement && controle.type === 'file') continue;
      if (controle instanceof HTMLInputElement && controle.type === 'checkbox') {
        controle.checked = valor === true || valor === 'sim' || valor === 'true' || valor === '1';
      } else if (controle instanceof HTMLInputElement && controle.type === 'radio') {
        controle.checked = String(controle.value) === String(valor);
      } else if ('value' in controle) {
        controle.value = valor == null ? '' : String(valor);
      }
      controle.dispatchEvent(new Event('input', { bubbles: true }));
      controle.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

function markupDeCampo(campo) {
  const id = `campo-${campo.nome}`;
  const dica = campo.dica ? `<span class="campo__dica" id="${id}-dica">${escapar(campo.dica)}</span>` : '';
  const descrito = campo.dica ? ` aria-describedby="${id}-dica"` : '';
  const comuns = `id="${id}" name="${escapar(campo.nome)}"${descrito}`;

  let controle;
  if (campo.tipo === 'seleção') {
    const opções = campo.opções
      .map((o) => `<option value="${escapar(o.valor)}"${o.valor === campo.padrão ? ' selected' : ''}>${escapar(o.rótulo)}</option>`)
      .join('');
    controle = `<select ${comuns}>${opções}</select>`;
  } else if (campo.tipo === 'área') {
    controle = `<textarea ${comuns} rows="${campo.linhas ?? 6}" placeholder="${escapar(campo.exemplo ?? '')}">${escapar(campo.padrão ?? '')}</textarea>`;
  } else if (campo.tipo === 'caixa') {
    return `<div class="campo campo--linha">
      <input type="checkbox" ${comuns}${campo.padrão ? ' checked' : ''}>
      <label for="${id}">${escapar(campo.rótulo)}</label>
    </div>`;
  } else {
    const tipo = campo.tipo === 'número' ? 'text' : (campo.tipo ?? 'text');
    const modo = campo.tipo === 'número' ? ' inputmode="decimal"' : '';
    const extras = [
      campo.mín !== undefined ? ` data-mín="${campo.mín}"` : '',
      campo.máx !== undefined ? ` data-máx="${campo.máx}"` : '',
      campo.exemplo ? ` placeholder="${escapar(campo.exemplo)}"` : '',
      campo.padrão !== undefined ? ` value="${escapar(campo.padrão)}"` : '',
    ].join('');
    controle = `<input type="${tipo}" ${comuns}${modo}${extras} autocomplete="off">`;
  }

  return `<div class="campo" data-campo="${escapar(campo.nome)}">
    <label for="${id}">${escapar(campo.rótulo)}</label>
    ${controle}
    ${dica}
    <p class="campo__erro" hidden></p>
  </div>`;
}

/**
 * Monta a interface completa de uma ferramenta.
 *
 * @param {HTMLElement} raiz contêiner da ferramenta
 * @param {object} ferramenta entrada do catálogo
 * @param {{
 *   campos: object[],
 *   rótuloDaAção?: string,
 *   calcular: (dados: Record<string,string>) => {
 *     valor: string, resumo?: string,
 *     linhas?: [string, string][],
 *     observações?: string[],
 *     texto?: string,
 *     tabela?: { cabeçalho: string[], linhas: (string|number)[][] },
 *     arquivos?: { rótulo: string, ícone?: string, gerar: () => void }[]
 *   },
 *   demorada?: boolean,
 *   permitirSalvarTrabalho?: boolean,
 *   registrarUsoAtivo?: boolean,
 *   aoMontar?: (raiz: HTMLElement, recalcular: (opções?: {focar?: boolean}) => Promise<void>) => void
 * }} definição
 */
export function montarFerramenta(raiz, ferramenta, definição) {
  const { campos, calcular, rótuloDaAção = 'Calcular', demorada = false, aoMontar,
    permitirSalvarTrabalho = true, registrarUsoAtivo = true } = definição;

  raiz.innerHTML = `<form id="formulário" novalidate>
  <div class="campos campos--2">${campos.map(markupDeCampo).join('')}</div>
  <div class="ações t-3">
    <button class="botão botão--g" type="submit">${ícone('confere')}${escapar(rótuloDaAção)}</button>
    <button class="botão botão--linha" type="reset">${ícone('atualizar')}Limpar</button>
  </div>
  <div class="progresso t-2" id="progresso" hidden>
    <p class="progresso__texto"></p>
    <div class="progresso__trilho"><div class="progresso__barra"></div></div>
  </div>
</form>
<div class="resultado t-3" id="resultado" hidden tabindex="-1"></div>`;

  const formulário = raiz.querySelector('#formulário');
  const caixaDeResultado = raiz.querySelector('#resultado');
  const progresso = criarProgresso(raiz.querySelector('#progresso'));
  const emInglês = document.documentElement.lang === 'en';
  let dadosAtuais = null;

  function desenharResultado(saída) {
    const linhas = (saída.linhas ?? [])
      .map(([r, v]) => `<li><span>${escapar(r)}</span><b>${escapar(v)}</b></li>`).join('');
    const observações = (saída.observações ?? [])
      .map((o) => `<p class="pequeno suave t-1">${escapar(o)}</p>`).join('');
    const tabela = saída.tabela
      ? `<div class="tabela-rolagem t-2"><table class="tabela">
          <thead><tr>${saída.tabela.cabeçalho.map((c, i) => `<th${i ? ' class="número"' : ''}>${escapar(c)}</th>`).join('')}</tr></thead>
          <tbody>${saída.tabela.linhas.map((l) => `<tr>${l.map((c, i) => `<td${i ? ' class="número"' : ''}>${escapar(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`
      : '';

    const botões = [];
    if (saída.texto ?? saída.valor) {
      botões.push(`<button class="botão botão--linha" type="button" data-copiar>${ícone('copiar')}Copiar</button>`);
    }
    for (const [i, arquivo] of (saída.arquivos ?? []).entries()) {
      botões.push(`<button class="botão botão--linha" type="button" data-arquivo="${i}">${ícone(arquivo.ícone ?? 'baixar')}${escapar(arquivo.rótulo)}</button>`);
    }
    // A exportação automática da tabela é desligada quando a ferramenta oferece
    // arquivos próprios, para não entregar um recorte da tela como se fosse tudo.
    if (saída.tabela && !saída.tabela.semExportação) {
      botões.push(`<button class="botão botão--linha" type="button" data-tabela="csv">${ícone('baixar')}CSV</button>`);
      botões.push(`<button class="botão botão--linha" type="button" data-tabela="xlsx">${ícone('planilha')}Planilha</button>`);
    }
    if (permitirSalvarTrabalho) botões.push(`<button class="botão botão--linha" type="button" data-salvar-trabalho>${ícone('confere')}${emInglês ? 'Save work' : 'Salvar trabalho'}</button>`);

    caixaDeResultado.innerHTML = `<p class="rótulo">Resultado</p>
      <p class="resultado__valor">${escapar(saída.valor)}</p>
      ${saída.resumo ? `<p class="pequeno">${escapar(saída.resumo)}</p>` : ''}
      ${linhas ? `<ul class="resultado__linhas">${linhas}</ul>` : ''}
      ${tabela}
      ${observações}
      ${botões.length ? `<div class="ações t-3">${botões.join('')}</div>` : ''}`;
    const primeiraVez = caixaDeResultado.hidden;
    caixaDeResultado.hidden = false;
    marcarResultado(caixaDeResultado, primeiraVez);

    caixaDeResultado.querySelector('[data-copiar]')?.addEventListener('click', async (evento) => {
      const conteúdo = saída.texto ?? [saída.valor, ...(saída.linhas ?? []).map(([r, v]) => `${r}: ${v}`)].join('\n');
      const situação = await copiar(conteúdo);
      if (situação === 'copiado') pulsar(evento.currentTarget);
      avisar(situação === 'copiado' ? 'Copiado.' : 'Seu navegador bloqueou a cópia automática. Selecione o texto e copie.');
    });

    caixaDeResultado.querySelector('[data-salvar-trabalho]')?.addEventListener('click', async (evento) => {
      const botãoSalvar = evento.currentTarget;
      botãoSalvar.disabled = true;
      try {
        const sessao = await obterSessao({ renovar: true });
        if (!sessao.usuario) {
          const volta = `${location.pathname}${location.search}`;
          location.assign(`${caminhoDoIdioma('entrar.html')}?volta=${encodeURIComponent(volta)}`);
          return;
        }
        const data = new Intl.DateTimeFormat(emInglês ? 'en' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
        const titulo = `${ferramenta.nome} · ${data}`.slice(0, 120);
        const resposta = await api('/api/trabalhos', {
          metodo: 'POST',
          dados: { ferramenta_slug: ferramenta.slug, titulo, dados: dadosAtuais ?? lerFormulário(formulário), situacao: 'salvo' },
        });
        botãoSalvar.textContent = emInglês ? 'Work saved' : 'Trabalho salvo';
        botãoSalvar.dataset.trabalhoId = String(resposta.trabalho.id);
        import('./evolução.js').then(m=>m.conferirConquistas(sessao)).catch(()=>{});
        const temArquivo = formulário.querySelector('input[type="file"]');
        avisar(temArquivo
          ? (emInglês ? 'Settings saved. Choose the local file again when reopening.' : 'Configurações salvas. Ao reabrir, escolha novamente o arquivo local.')
          : (emInglês ? 'Saved to My works.' : 'Salvo em Meus trabalhos.'));
      } catch (erro) {
        if (erro?.message === 'limite_do_plano') {
          avisar(emInglês ? 'Your plan reached its saved-work limit. Manage your saved works or request a plan change.' : 'Seu plano atingiu o limite de trabalhos salvos. Gerencie os salvos ou peça uma mudança de plano.');
        } else if (erro?.message === 'limite_armazenamento_do_plano') {
          avisar(emInglês ? 'Your saved-work storage is full. Remove unneeded works or request a plan change. Your local result and downloads remain available.' : 'O espaço dos seus trabalhos salvos está cheio. Remova trabalhos que não precisa ou peça uma mudança de plano. O resultado e os downloads locais continuam disponíveis.');
        } else if (erro?.message === 'limite_dados_do_plano') {
          avisar(emInglês ? 'These saved values exceed your plan’s size limit. Reduce the data or request a plan change. Your local result and downloads remain available.' : 'Estes valores ultrapassam o espaço por trabalho do seu plano. Reduza os dados ou peça uma mudança de plano. O resultado e os downloads locais continuam disponíveis.');
        } else if (erro?.indisponivel) {
          avisar(emInglês ? 'Could not save now. Your result remains on this screen.' : 'Não foi possível salvar agora. Seu resultado continua nesta tela.');
        } else {
          avisar(emInglês ? 'Could not save this work.' : 'Não foi possível salvar este trabalho.');
        }
        botãoSalvar.disabled = false;
      }
    });

    for (const botão of caixaDeResultado.querySelectorAll('[data-arquivo]')) {
      botão.addEventListener('click', () => {
        try {
          saída.arquivos[Number(botão.dataset.arquivo)].gerar();
        } catch (erro) {
          console.error(erro);
          avisar('Não foi possível gerar o arquivo.');
        }
      });
    }

    for (const botão of caixaDeResultado.querySelectorAll('[data-tabela]')) {
      botão.addEventListener('click', () => {
        const linhasDoArquivo = [saída.tabela.cabeçalho, ...saída.tabela.linhas];
        const nome = nomeDeArquivo(ferramenta.nome);
        if (botão.dataset.tabela === 'csv') baixarCsv(linhasDoArquivo, nome);
        else baixarPlanilha(linhasDoArquivo, nome, { aba: ferramenta.nome.slice(0, 28) });
      });
    }
  }

  /**
   * Valida, calcula e desenha. `focar: false` serve às ferramentas que
   * recalculam enquanto a pessoa digita: o foco fica no campo, e não salta
   * para o resultado (o que fecharia o teclado do celular a cada letra).
   * @param {{focar?: boolean}} [opções]
   */
  async function executar({ focar = true } = {}) {
    limparErros(formulário);
    const dados = lerFormulário(formulário);
    if (demorada) progresso.iniciar('Calculando…');
    try {
      const saída = await calcular(dados);
      dadosAtuais = { ...dados };
      desenharResultado(saída);
      // O uso recebe só o identificador; os valores só saem do aparelho quando a pessoa toca em "Salvar trabalho".
      if (registrarUsoAtivo) void registrarUso(ferramenta.slug);
      if (demorada) progresso.concluir('Pronto');
      else progresso.esconder();
      if (focar) caixaDeResultado.focus({ preventScroll: true });
    } catch (erro) {
      caixaDeResultado.hidden = true;
      if (erro instanceof ErroDeEntrada) {
        progresso.esconder();
        const campo = erro.campo && formulário.querySelector(`[data-campo="${CSS.escape(erro.campo)}"]`);
        if (campo) {
          mostrarErro(campo, erro.message);
          if (focar) campo.querySelector('input, select, textarea')?.focus();
        } else {
          avisar(erro.message);
        }
      } else if (erro instanceof Error && erro.constructor === Error) {
        // Recusa de regra de negócio vinda de um módulo de cálculo: ele não
        // conhece os campos da tela, mas a mensagem dele é útil e precisa
        // chegar a quem está usando, em vez de morrer no console.
        progresso.esconder();
        avisar(erro.message);
      } else {
        // Defeito de programação (TypeError, ReferenceError e afins): a mensagem
        // não ajuda ninguém, então vai para o console e a pessoa recebe um aviso
        // honesto de que o problema é nosso.
        console.error(erro);
        if (demorada) progresso.falhar('Não foi possível concluir');
        else progresso.esconder();
        avisar('Algo deu errado aqui dentro. Confira os valores e tente de novo.');
      }
    }
  }

  async function reabrirSeSolicitado() {
    const id = new URLSearchParams(location.search).get('trabalho');
    if (!id || !/^\d+$/.test(id)) return;
    try {
      const sessao = await obterSessao();
      if (!sessao.usuario) {
        const volta = `${location.pathname}${location.search}`;
        location.replace(`${caminhoDoIdioma('entrar.html')}?volta=${encodeURIComponent(volta)}`);
        return;
      }
      const resposta = await api(`/api/trabalhos/${id}`);
      if (resposta.trabalho.ferramenta_slug !== ferramenta.slug) {
        avisar(emInglês ? 'This saved work belongs to another tool.' : 'Este trabalho salvo pertence a outra ferramenta.');
        return;
      }
      preencherFormulário(formulário, resposta.trabalho.dados);
      await executar({ focar: false });
      avisar(emInglês ? 'Saved values restored.' : 'Valores salvos restaurados.');
    } catch (erro) {
      avisar(erro?.indisponivel
        ? (emInglês ? 'Saved work is unavailable right now. The tool still works locally.' : 'O trabalho salvo está indisponível agora. A ferramenta continua funcionando localmente.')
        : (emInglês ? 'Could not reopen this saved work.' : 'Não foi possível reabrir este trabalho salvo.'));
    }
  }

  formulário.addEventListener('submit', (evento) => { evento.preventDefault(); executar(); });
  formulário.addEventListener('reset', () => {
    limparErros(formulário);
    dadosAtuais = null;
    caixaDeResultado.hidden = true;
    progresso.esconder();
  });

  aoMontar?.(raiz, executar);
  if (permitirSalvarTrabalho) void reabrirSeSolicitado();
}

export { baixar, baixarCsv, baixarPlanilha, nomeDeArquivo, copiar, avisar };
