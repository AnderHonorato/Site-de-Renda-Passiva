/**
 * Leitura do orçamento recebido por link.
 *
 * O conteúdo viaja no fragmento da URL (depois do `#`), que o navegador não
 * envia ao servidor. Aqui ele é decodificado e validado antes de virar tela:
 * o link pode ter sido adulterado ou truncado no caminho, então nada é exibido
 * sem passar pela conferência de formato.
 */
import { escapar } from '../../núcleo/texto.js';
import { ícone } from '../../núcleo/ícones.js';
import { formatarMoeda } from '../../comum/formatação/formatar-moeda.js';

const LIMITE_DE_ITENS = 60;

/**
 * Decodifica e valida o conteúdo do fragmento.
 * @param {string} codificado texto em base64url
 * @returns {object} orçamento validado
 * @throws {Error} quando o link não tem o formato esperado
 */
export function lerOrçamentoDoLink(codificado) {
  let limpo = String(codificado).replace(/-/g, '+').replace(/_/g, '/');
  while (limpo.length % 4 !== 0) limpo += '=';
  if (limpo.length > 8000) throw new Error('Link grande demais para ser um orçamento.');

  let dados;
  try {
    const binário = atob(limpo);
    const bytes = Uint8Array.from(binário, (c) => c.charCodeAt(0));
    dados = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Este link está incompleto ou foi alterado no caminho.');
  }

  // Validação de formato: o link é dado de fora e não merece confiança.
  const erro = (mensagem) => { throw new Error(mensagem); };
  if (!dados || typeof dados !== 'object' || dados.v !== 1) erro('Este link não é de um orçamento deste portal.');
  if (typeof dados.e !== 'string' || typeof dados.c !== 'string') erro('Faltam dados no link.');
  if (!Array.isArray(dados.i) || dados.i.length === 0 || dados.i.length > LIMITE_DE_ITENS) erro('A lista de itens do link é inválida.');
  if (!Number.isFinite(dados.t)) erro('O total do link é inválido.');

  const itens = dados.i.map((item) => {
    if (!Array.isArray(item) || item.length < 3) erro('Um dos itens do link está incompleto.');
    const [descrição, quantidade, unitárioCentavos] = item;
    if (typeof descrição !== 'string' || !Number.isFinite(quantidade) || !Number.isSafeInteger(unitárioCentavos)) {
      erro('Um dos itens do link tem valores inválidos.');
    }
    return { descrição, quantidade, unitárioCentavos, totalCentavos: Math.round(unitárioCentavos * quantidade) };
  });

  return {
    emissor: dados.e.slice(0, 120),
    cliente: dados.c.slice(0, 120),
    número: Number.isSafeInteger(dados.n) ? dados.n : null,
    desconto: Number.isFinite(dados.d) ? dados.d : 0,
    totalCentavos: dados.t,
    emitidoEm: typeof dados.em === 'string' ? dados.em.slice(0, 20) : '',
    válidoAté: typeof dados.va === 'string' ? dados.va.slice(0, 20) : null,
    itens,
  };
}

/**
 * Desenha o orçamento recebido, no lugar do formulário.
 * @param {HTMLElement} raiz
 * @param {string} codificado
 */
export function mostrarOrçamentoCompartilhado(raiz, codificado) {
  let orçamento;
  try {
    orçamento = lerOrçamentoDoLink(codificado);
  } catch (erro) {
    raiz.innerHTML = `<p class="vazio">${ícone('alerta')}${escapar(erro.message)}
      <br><br><a class="botão botão--linha" href="./">Montar um orçamento novo</a></p>`;
    return;
  }

  const subtotal = orçamento.itens.reduce((soma, i) => soma + i.totalCentavos, 0);
  const descontoCentavos = subtotal - orçamento.totalCentavos;

  raiz.innerHTML = `
    <p class="rótulo">Orçamento recebido</p>
    <h2 class="b-1">${escapar(orçamento.emissor)}</h2>
    <p class="suave pequeno b-3">
      Para ${escapar(orçamento.cliente)}${orçamento.número ? ` · nº ${orçamento.número}` : ''}
      ${orçamento.emitidoEm ? ` · emitido em ${escapar(orçamento.emitidoEm)}` : ''}
      ${orçamento.válidoAté ? ` · válido até ${escapar(orçamento.válidoAté)}` : ''}
    </p>
    <div class="tabela-rolagem">
      <table class="tabela">
        <thead><tr><th>Descrição</th><th class="número">Qtd.</th><th class="número">Unitário</th><th class="número">Total</th></tr></thead>
        <tbody>${orçamento.itens.map((i) => `<tr>
          <td>${escapar(i.descrição)}</td>
          <td class="número">${escapar(i.quantidade)}</td>
          <td class="número">${escapar(formatarMoeda(i.unitárioCentavos / 100))}</td>
          <td class="número">${escapar(formatarMoeda(i.totalCentavos / 100))}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="resultado t-3">
      <p class="rótulo">Total</p>
      <p class="resultado__valor">${escapar(formatarMoeda(orçamento.totalCentavos / 100))}</p>
      ${descontoCentavos > 0 ? `<ul class="resultado__linhas">
        <li><span>Subtotal</span><b>${escapar(formatarMoeda(subtotal / 100))}</b></li>
        <li><span>Desconto (${escapar(orçamento.desconto)}%)</span><b>− ${escapar(formatarMoeda(descontoCentavos / 100))}</b></li>
      </ul>` : ''}
    </div>
    <div class="ações t-3">
      <button class="botão botão--linha" type="button" id="imprimir-orçamento">${ícone('imprimir')}Imprimir</button>
      <a class="botão botão--linha" href="./">${ícone('mais')}Montar o meu</a>
    </div>
    <p class="pequeno suave t-2">Este orçamento veio inteiro dentro do link: nada foi consultado em servidor.
      É uma proposta de preço, não é documento fiscal.</p>`;

  raiz.querySelector('#imprimir-orçamento')?.addEventListener('click', () => print());
}
