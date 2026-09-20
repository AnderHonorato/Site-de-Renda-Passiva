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
 *   aoMontar?: (raiz: HTMLElement, recalcular: () => void) => void
 * }} definição
 */
export function montarFerramenta(raiz, ferramenta, definição) {
  const { campos, calcular, rótuloDaAção = 'Calcular', demorada = false, aoMontar } = definição;

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

    caixaDeResultado.innerHTML = `<p class="rótulo">Resultado</p>
      <p class="resultado__valor">${escapar(saída.valor)}</p>
      ${saída.resumo ? `<p class="pequeno">${escapar(saída.resumo)}</p>` : ''}
      ${linhas ? `<ul class="resultado__linhas">${linhas}</ul>` : ''}
      ${tabela}
      ${observações}
      ${botões.length ? `<div class="ações t-3">${botões.join('')}</div>` : ''}`;
    caixaDeResultado.hidden = false;

    caixaDeResultado.querySelector('[data-copiar]')?.addEventListener('click', async () => {
      const conteúdo = saída.texto ?? [saída.valor, ...(saída.linhas ?? []).map(([r, v]) => `${r}: ${v}`)].join('\n');
      const situação = await copiar(conteúdo);
      avisar(situação === 'copiado' ? 'Copiado.' : 'Seu navegador bloqueou a cópia automática. Selecione o texto e copie.');
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

  async function executar() {
    limparErros(formulário);
    const dados = lerFormulário(formulário);
    if (demorada) progresso.iniciar('Calculando…');
    try {
      const saída = await calcular(dados);
      desenharResultado(saída);
      if (demorada) progresso.concluir('Pronto');
      else progresso.esconder();
      caixaDeResultado.focus({ preventScroll: true });
    } catch (erro) {
      caixaDeResultado.hidden = true;
      if (erro instanceof ErroDeEntrada) {
        progresso.esconder();
        const campo = erro.campo && formulário.querySelector(`[data-campo="${CSS.escape(erro.campo)}"]`);
        if (campo) {
          mostrarErro(campo, erro.message);
          campo.querySelector('input, select, textarea')?.focus();
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

  formulário.addEventListener('submit', (evento) => { evento.preventDefault(); executar(); });
  formulário.addEventListener('reset', () => {
    limparErros(formulário);
    caixaDeResultado.hidden = true;
    progresso.esconder();
  });

  aoMontar?.(raiz, executar);
}

export { baixar, baixarCsv, baixarPlanilha, nomeDeArquivo, copiar, avisar };
