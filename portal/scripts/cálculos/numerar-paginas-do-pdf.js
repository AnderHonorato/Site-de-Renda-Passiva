/**
 * Números de página no PDF: desenha o número de cada página (ou só de algumas)
 * com uma fonte padrão do PDF, por cima do conteúdo e sem mexer no resto.
 *
 * A posição é calculada na página como a pessoa a vê, levando em conta a
 * rotação (/Rotate) e a área visível (CropBox): o número sai legível e dentro
 * do que aparece na tela, mesmo em PDF escaneado de lado ou com margens cortadas.
 */
import {
  carregarPdf, interpretarPáginas, geometriaDaPágina, paraEspaçoDoPdf, inserirOperadores, mmParaPt,
  primeiroCaractereForaDaFonte, CORES, FONTES, mensagemDeErroDoPdfÚnico,
} from './pdf-páginas.js';

/** Margem da borda até o número, em milímetros (valores nossos, mostrados na tela). */
export const MARGENS_MM = Object.freeze({ pequena: 8, recomendada: 12, grande: 20 });

export const TAMANHO_MÍN = 6;
export const TAMANHO_MÁX = 72;
export const LIMITE_DO_MODELO = 80;
export const NÚMERO_MÁXIMO = 99999;

export const POSIÇÕES = Object.freeze([
  'cima-esquerda', 'cima-centro', 'cima-direita',
  'meio-esquerda', 'meio-centro', 'meio-direita',
  'baixo-esquerda', 'baixo-centro', 'baixo-direita',
]);

export const FORMATOS = Object.freeze(['arábico', 'romano-minúsculo', 'romano-maiúsculo', 'letra-minúscula', 'letra-maiúscula']);

/** Modelos prontos do texto; "personalizado" usa o que a pessoa escreveu. */
export const MODELOS = Object.freeze({
  número: '{n}',
  página: 'Página {n}',
  'página-de': 'Página {n} de {p}',
});

const ALGARISMOS_ROMANOS = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/**
 * Número na numeração escolhida. Romano vai de 1 a 3999; letras de 1 em diante
 * (a, b, … z, aa, ab, …). Arábico aceita 0 e valores maiores.
 * @param {number} n
 * @param {string} formato
 * @returns {string}
 */
export function formatarNúmero(n, formato = 'arábico') {
  if (formato === 'arábico') return String(n);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`Número ${n} não existe na numeração ${formato}.`);
  if (formato.startsWith('romano')) {
    if (n > 3999) throw new RangeError('A numeração romana vai até 3999.');
    let resto = n;
    let romano = '';
    for (const [valor, letras] of ALGARISMOS_ROMANOS) {
      while (resto >= valor) { romano += letras; resto -= valor; }
    }
    return formato === 'romano-minúsculo' ? romano.toLowerCase() : romano;
  }
  let resto = n;
  let letras = '';
  while (resto > 0) {
    resto -= 1;
    letras = String.fromCharCode(97 + (resto % 26)) + letras;
    resto = Math.floor(resto / 26);
  }
  return formato === 'letra-maiúscula' ? letras.toUpperCase() : letras;
}

/** Troca {n} e {p} do modelo. {p} é o total de páginas do documento. */
export function montarTexto(modelo, n, formato, total) {
  return modelo.replaceAll('{n}', formatarNúmero(n, formato)).replaceAll('{p}', formatarNúmero(total, formato));
}

/**
 * Confere o texto do número. Devolve o código do erro ou null.
 * @param {string} modelo
 * @returns {'modelo_vazio'|'modelo_sem_numero'|'modelo_longo'|'modelo_caractere'|null}
 */
export function conferirModelo(modelo) {
  const texto = String(modelo ?? '');
  if (texto.trim() === '') return 'modelo_vazio';
  if (!texto.includes('{n}')) return 'modelo_sem_numero';
  if (texto.length > LIMITE_DO_MODELO) return 'modelo_longo';
  if (primeiroCaractereForaDaFonte(texto) !== null) return 'modelo_caractere';
  return null;
}

export function mensagemDeErroDeNumeração(erro, extras = {}) {
  const mensagens = {
    modelo_vazio: 'Escreva o texto do número, por exemplo "Página {n} de {p}".',
    modelo_sem_numero: 'O texto precisa ter {n}, que é onde entra o número da página.',
    modelo_longo: `O texto passou de ${LIMITE_DO_MODELO} caracteres.`,
    modelo_caractere: `O caractere "${extras.caractere ?? ''}" não existe na fonte do PDF. Use letras, números e a pontuação comum.`,
    primeiro_inválido: 'O primeiro número precisa ser um número inteiro.',
    primeiro_negativo: 'O primeiro número não pode ser menor que 0.',
    primeiro_romano: 'Na numeração romana e em letras, o primeiro número começa em 1.',
    primeiro_grande: `O primeiro número não pode passar de ${NÚMERO_MÁXIMO.toLocaleString('pt-BR')}.`,
    romano_estoura: 'A numeração romana vai só até 3999; com este primeiro número ela passaria disso.',
    tamanho_inválido: `O tamanho da letra vai de ${TAMANHO_MÍN} a ${TAMANHO_MÁX}.`,
    opacidade_inválida: 'A opacidade vai de 1 a 100.',
    posição_inválida: 'Escolha uma posição da lista.',
    formato_inválido: 'Escolha um formato de numeração da lista.',
    margem_inválida: 'Escolha uma margem da lista.',
    cor_inválida: 'Escolha uma cor da lista.',
    fonte_inválida: 'Escolha uma fonte da lista.',
    texto_largo: `Na página ${extras.página ?? ''} o texto é mais largo que a página. Diminua o tamanho da letra ou encurte o texto.`,
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/** Posição do texto na área visível: onde fica o início da linha de base, na página como aparece. */
export function posicionarTexto({ largura, altura }, { posição, margem, larguraDoTexto, alturaDasMaiúsculas, espelhar = false, par = false }) {
  const [vertical, lado] = posição.split('-');
  let horizontal = lado;
  // Em frente e verso, o "lado de fora" troca de lugar nas páginas pares.
  if (espelhar && par) horizontal = lado === 'esquerda' ? 'direita' : lado === 'direita' ? 'esquerda' : lado;
  const x = horizontal === 'esquerda' ? margem
    : horizontal === 'direita' ? largura - margem - larguraDoTexto
      : (largura - larguraDoTexto) / 2;
  const y = vertical === 'baixo' ? margem
    : vertical === 'cima' ? altura - margem - alturaDasMaiúsculas
      : (altura - alturaDasMaiúsculas) / 2;
  return { x, y };
}

/**
 * Numera as páginas de um PDF.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   biblioteca: any,
 *   posição?: string, formato?: string, modelo?: string, primeiro?: number, páginas?: string,
 *   fonte?: string, tamanho?: number, cor?: string, opacidade?: number, margem?: string, espelhar?: boolean,
 *   aoProgredir?: (p: {página: number, total: number}) => void, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, numeradas: {página: number, texto: string}[], avisos: string[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function numerarPáginas(arquivo, {
  biblioteca, posição = 'baixo-centro', formato = 'arábico', modelo = MODELOS.número, primeiro = 1, páginas = '',
  fonte = 'helvetica', tamanho = 12, cor = 'preto', opacidade = 100, margem = 'recomendada', espelhar = false,
  aoProgredir, cancelado, limiteDePáginas,
} = {}) {
  // Opções primeiro: recusar barato antes de abrir um PDF de 100 MB.
  if (!POSIÇÕES.includes(posição)) return { ok: false, erro: 'posição_inválida' };
  if (!FORMATOS.includes(formato)) return { ok: false, erro: 'formato_inválido' };
  if (!(margem in MARGENS_MM)) return { ok: false, erro: 'margem_inválida' };
  if (!(cor in CORES)) return { ok: false, erro: 'cor_inválida' };
  if (!(fonte in FONTES)) return { ok: false, erro: 'fonte_inválida' };
  if (!Number.isFinite(tamanho) || tamanho < TAMANHO_MÍN || tamanho > TAMANHO_MÁX) return { ok: false, erro: 'tamanho_inválido' };
  if (!Number.isFinite(opacidade) || opacidade < 1 || opacidade > 100) return { ok: false, erro: 'opacidade_inválida' };
  if (!Number.isInteger(primeiro)) return { ok: false, erro: 'primeiro_inválido' };
  if (primeiro < 0) return { ok: false, erro: 'primeiro_negativo' };
  if (primeiro < 1 && formato !== 'arábico') return { ok: false, erro: 'primeiro_romano' };
  if (primeiro > NÚMERO_MÁXIMO) return { ok: false, erro: 'primeiro_grande' };
  const erroDoModelo = conferirModelo(modelo);
  if (erroDoModelo) return { ok: false, erro: erroDoModelo, extras: { caractere: primeiroCaractereForaDaFonte(modelo) } };

  const aberto = await carregarPdf(arquivo, { biblioteca, limiteDePáginas });
  if (!aberto.ok) return aberto;
  const { documento, páginas: total } = aberto;

  const faixa = interpretarPáginas(páginas, total);
  if (!faixa.ok) return faixa;
  if (formato.startsWith('romano') && primeiro + faixa.índices.length - 1 > 3999) return { ok: false, erro: 'romano_estoura' };

  const { StandardFonts, rgb, degrees, drawText } = biblioteca;
  const fontePdf = await documento.embedFont(StandardFonts[FONTES[fonte]]);
  const [r, g, b] = CORES[cor];
  const alfa = opacidade / 100;
  const margemEmPt = mmParaPt(MARGENS_MM[margem]);
  const numeradas = [];

  for (const [vez, índice] of faixa.índices.entries()) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const página = documento.getPage(índice);
    const número = primeiro + vez;
    const texto = montarTexto(modelo, número, formato, total);
    const geometria = geometriaDaPágina(página);
    const larguraDoTexto = fontePdf.widthOfTextAtSize(texto, tamanho);
    if (larguraDoTexto > geometria.largura - 2 * margemEmPt) return { ok: false, erro: 'texto_largo', extras: { página: índice + 1 } };

    const { x: vx, y: vy } = posicionarTexto(geometria, {
      posição, margem: margemEmPt, larguraDoTexto, espelhar, par: número % 2 === 0,
      alturaDasMaiúsculas: fontePdf.heightAtSize(tamanho, { descender: false }),
    });
    const { x, y } = paraEspaçoDoPdf(geometria, vx, vy);

    página.node.normalize();
    const nomeDaFonte = página.node.newFontDictionary('Num', fontePdf.ref);
    const estado = alfa < 1
      ? página.node.newExtGState('Num', documento.context.obj({ Type: 'ExtGState', ca: alfa, CA: alfa }))
      : undefined;
    inserirOperadores(documento, página, drawText(fontePdf.encodeText(texto), {
      color: rgb(r, g, b), font: nomeDaFonte, size: tamanho, rotate: degrees(geometria.rot), xSkew: degrees(0), ySkew: degrees(0), x, y,
      graphicsState: estado,
    }));
    numeradas.push({ página: índice + 1, texto });
    aoProgredir?.({ página: vez + 1, total: faixa.índices.length });
    if ((vez + 1) % 25 === 0) await new Promise((resolver) => { setTimeout(resolver, 0); });
  }

  documento.setProducer('Portal de Ferramentas');
  const bytes = await documento.save();
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };

  const avisos = [];
  if (modelo.includes('{p}') && (!faixa.todas || primeiro !== 1)) avisos.push('total_do_documento');
  return { ok: true, bytes, páginas: total, numeradas, avisos };
}
