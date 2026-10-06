/**
 * Base comum das ferramentas que mexem nas páginas de UM PDF (remover, extrair,
 * dividir, girar e organizar): abrir o arquivo com mensagem de erro clara, ler o
 * campo "páginas" digitado por uma pessoa e montar um PDF novo a partir de páginas
 * já escolhidas.
 *
 * Fica num arquivo próprio para que as cinco ferramentas leiam "1, 3-5, 9" do mesmo
 * jeito e recusem o mesmo erro com a mesma mensagem. A pdf-lib entra por parâmetro:
 * o teste roda no Node e a página só baixa a biblioteca quando precisa.
 */
import { validarArquivoPdf, formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';

export { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO };

/** Páginas que uma ferramenta aceita de uma vez; acima disso a cópia fica lenta demais no celular. */
export const LIMITE_DE_PÁGINAS = 2000;

/** Tamanho do campo "páginas": um texto de 1 MB colado por engano não pode travar a leitura. */
export const LIMITE_DO_TEXTO = 5000;

/** Itens que uma seleção pode ter, contando as repetições ("1-2000, 1-2000, ..." também é hostil). */
export const LIMITE_DA_SELEÇÃO = 10000;

const número = (valor) => valor.toLocaleString('pt-BR');
export const páginas = (quantidade) => `${número(quantidade)} ${quantidade === 1 ? 'página' : 'páginas'}`;

/**
 * Mensagem para a pessoa a partir do código de erro.
 * @param {string} erro
 * @param {Record<string, any>} [dados]
 * @returns {string}
 */
export function mensagemDeErro(erro, dados = {}) {
  const { nome = '', total = 0, limite = 0, trecho = '', página = '', de = '', até = '' } = dados;
  const mensagens = {
    arquivo_vazio: `"${nome}" está vazio (0 bytes).`,
    arquivo_nao_pdf: `"${nome}" não é um PDF de verdade: o conteúdo do arquivo não confere.`,
    arquivo_grande_demais: `"${nome}" passa de ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Escolha um arquivo menor.`,
    pdf_protegido: `"${nome}" está protegido por senha. Abra no leitor de PDF, salve uma cópia sem proteção e use a cópia.`,
    pdf_corrompido: `Não foi possível ler "${nome}". O arquivo parece estar danificado.`,
    pdf_sem_páginas: `"${nome}" não tem nenhuma página.`,
    limite_de_páginas: `"${nome}" tem ${páginas(total)}, e o limite desta ferramenta é ${número(limite)}. Separe o arquivo em partes menores antes.`,
    sem_arquivo: 'Escolha um PDF primeiro.',
    páginas_vazio: 'Informe as páginas, por exemplo: 1, 3-5, 9.',
    texto_longo: `O texto das páginas passou de ${número(LIMITE_DO_TEXTO)} caracteres.`,
    páginas_inválido: `Não entendi "${trecho}". Use só números, vírgulas e hífens, como em 1, 3-5, 9.`,
    página_zero: `As páginas começam em 1, então "${trecho}" não vale.`,
    fora_do_total: de === ''
      ? `A página ${página} não existe: o PDF tem ${páginas(total)}.`
      : `O intervalo ${de}-${até} passa do fim: o PDF tem ${páginas(total)}.`,
    intervalo_invertido: `O intervalo "${trecho}" está de trás para frente. Escreva ${até}-${de}.`,
    seleção_grande: `Foram pedidas páginas demais de uma vez (mais de ${número(LIMITE_DA_SELEÇÃO)} itens, contando as repetições).`,
    tudo_removido: 'Você marcou todas as páginas. Deixe pelo menos uma página no PDF.',
    nenhuma_marcada: 'Nenhuma página foi marcada para remover.',
    saída_grande_demais: 'As partes passariam de 400 MB juntas. Use menos partes (mais páginas por arquivo) ou divida em etapas.',
    tamanho_inválido: 'Informe quantas páginas cada arquivo terá, com um número inteiro a partir de 1.',
    muitos_arquivos:`Isso daria mais de ${número(dados.limiteDeArquivos ?? 0)} arquivos. Use intervalos maiores.`,
    cancelado: 'Operação cancelada. Nenhum arquivo foi gerado.',
    falha_ao_montar: 'Não foi possível montar o novo PDF. O arquivo pode estar danificado.',
  };
  return mensagens[erro] ?? 'Não foi possível processar o PDF.';
}

/** Número digitado com dígitos demais só atrapalha a mensagem de erro. */
const curto = (dígitos) => (dígitos.length > 12 ? `${dígitos.slice(0, 12)}…` : dígitos);

function classificarFalha(erro) {
  return /encrypt/i.test(String(erro?.message ?? erro)) ? 'pdf_protegido' : 'pdf_corrompido';
}

/**
 * Abre o PDF e confere tudo o que dá para conferir antes de qualquer operação:
 * se está vazio, se é PDF de verdade (pelo conteúdo, não pela extensão), se tem
 * senha, se está íntegro e se cabe no limite de páginas.
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{biblioteca: {PDFDocument: any}, limiteDePáginas?: number}} opções
 * @returns {Promise<{ok: true, documento: any, total: number} | {ok: false, erro: string, extras: object}>}
 */
export async function abrirPdf({ nome, bytes }, { biblioteca, limiteDePáginas = LIMITE_DE_PÁGINAS }) {
  const falha = (erro, extras = {}) => ({ ok: false, erro, extras: { nome, ...extras } });
  if (!bytes?.length) return falha('arquivo_vazio');
  const validação = validarArquivoPdf({ nome, tamanho: bytes.length, bytes });
  if (!validação.ok) return falha(validação.erro);

  let documento;
  try {
    documento = await biblioteca.PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (erro) {
    return falha(classificarFalha(erro));
  }
  let total;
  try {
    total = documento.getPageCount();
  } catch {
    return falha('pdf_corrompido');
  }
  if (total === 0) return falha('pdf_sem_páginas');
  if (total > limiteDePáginas) return falha('limite_de_páginas', { total, limite: limiteDePáginas });
  return { ok: true, documento, total };
}

/**
 * Lê "1, 3-5, 9" em trechos [{de, até, texto}], na ordem digitada, conferindo cada um
 * contra o total de páginas. Aceita vírgula, ponto e vírgula, espaço e quebra de linha
 * entre os trechos, e espaços (ou travessão) em volta do hífen.
 *
 * Intervalo de trás para frente (8-3) é recusado em vez de adivinhado: a pessoa vê
 * a mensagem e escolhe, em vez de receber um PDF que ela não pediu.
 * @param {string} texto
 * @param {number} total páginas do PDF
 * @returns {{ok: true, trechos: {de: number, até: number, texto: string}[]} | {ok: false, erro: string, extras: object}}
 */
export function lerTrechos(texto, total) {
  const falha = (erro, extras = {}) => ({ ok: false, erro, extras: { total, ...extras } });
  const bruto = String(texto ?? '');
  if (bruto.length > LIMITE_DO_TEXTO) return falha('texto_longo');
  const normal = bruto.replace(/[–—−]/g, '-').replace(/\s*-\s*/g, '-').trim();
  const pedaços = normal.split(/[,;\s]+/).filter(Boolean);
  if (pedaços.length === 0) return falha('páginas_vazio');

  // Primeiro a forma de cada trecho, depois os números: "1, 15-20, abc" reclama do "abc"
  // (que a pessoa precisa apagar de qualquer jeito) em vez de só do 20.
  const lidos = [];
  for (const pedaço of pedaços) {
    const partes = /^(\d+)(?:-(\d+))?$/.exec(pedaço);
    if (!partes) return falha('páginas_inválido', { trecho: pedaço.length > 30 ? `${pedaço.slice(0, 30)}…` : pedaço });
    lidos.push({ pedaço, partes });
  }

  const trechos = [];
  let itens = 0;
  for (const { pedaço, partes } of lidos) {
    const [, completoDe, completoAté] = partes;
    const textoDe = curto(completoDe);
    const textoAté = completoAté === undefined ? undefined : curto(completoAté);
    const de = Number(completoDe);
    const até = completoAté === undefined ? de : Number(completoAté);
    if (de === 0 || até === 0) return falha('página_zero', { trecho: pedaço });
    if (de > até) return falha('intervalo_invertido', { trecho: pedaço, de: textoDe, até: textoAté });
    if (até > total) {
      return textoAté === undefined
        ? falha('fora_do_total', { página: textoDe })
        : falha('fora_do_total', { de: textoDe, até: textoAté });
    }
    itens += até - de + 1;
    if (itens > LIMITE_DA_SELEÇÃO) return falha('seleção_grande');
    trechos.push({ de, até, texto: textoAté === undefined ? textoDe : `${textoDe}-${textoAté}` });
  }
  return { ok: true, trechos };
}

/**
 * Páginas escolhidas, uma a uma (começando em 1).
 *
 * `ordem: 'digitada'` guarda a ordem do texto e as repetições (extrair "8, 2-3" dá 8, 2, 3);
 * `ordem: 'crescente'` devolve cada página uma vez, em ordem (remover e girar não ligam
 * para a ordem digitada, e "2, 2" é a mesma página).
 * @param {string} texto
 * @param {number} total
 * @param {{ordem?: 'digitada'|'crescente'}} [opções]
 * @returns {{ok: true, páginas: number[], repetidas: number[]} | {ok: false, erro: string, extras: object}}
 */
export function interpretarPáginas(texto, total, { ordem = 'crescente' } = {}) {
  const lidos = lerTrechos(texto, total);
  if (!lidos.ok) return lidos;
  const vistas = new Set();
  const repetidas = new Set();
  const lista = [];
  for (const { de, até } of lidos.trechos) {
    for (let página = de; página <= até; página++) {
      if (vistas.has(página)) repetidas.add(página);
      vistas.add(página);
      lista.push(página);
    }
  }
  if (ordem === 'crescente') return { ok: true, páginas: [...vistas].sort((a, b) => a - b), repetidas: [...repetidas].sort((a, b) => a - b) };
  return { ok: true, páginas: lista, repetidas: [...repetidas].sort((a, b) => a - b) };
}

/**
 * Escreve uma lista de páginas do jeito mais curto: [1,2,3,7] vira "1-3, 7".
 * Só junta sequências crescentes de passo 1 e de pelo menos três páginas, e mantém
 * a ordem recebida (por isso serve para a lista digitada de "extrair").
 * @param {number[]} lista
 * @returns {string}
 */
export function condensarPáginas(lista) {
  const partes = [];
  for (let i = 0; i < lista.length;) {
    let fim = i;
    while (fim + 1 < lista.length && lista[fim + 1] === lista[fim] + 1) fim++;
    if (fim - i >= 2) {
      partes.push(`${lista[i]}-${lista[fim]}`);
      i = fim + 1;
    } else {
      partes.push(String(lista[i]));
      i++;
    }
  }
  return partes.join(', ');
}

/**
 * Nome de arquivo (sem extensão) a partir do nome original: tira ".pdf", os acentos e o que
 * o sistema de arquivos não aceita.
 * @param {string} nome
 * @param {string} [padrão]
 * @returns {string}
 */
export function nomeBase(nome, padrão = 'documento') {
  return String(nome ?? '')
    .replace(/\.pdf$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || padrão;
}

/**
 * Passa título, autor, assunto e palavras-chave para o documento novo. `PDFDocument.create()`
 * começa sem nada, e o arquivo ficaria "sem título" mesmo quando o original tinha um.
 * Um metadado ilegível não pode impedir a operação, por isso cada cópia é isolada.
 * @param {any} origem
 * @param {any} destino
 */
export function copiarMetadados(origem, destino) {
  const pares = [
    ['getTitle', 'setTitle', (v) => v],
    ['getAuthor', 'setAuthor', (v) => v],
    ['getSubject', 'setSubject', (v) => v],
    ['getKeywords', 'setKeywords', (v) => [v]],
    ['getCreator', 'setCreator', (v) => v],
    ['getCreationDate', 'setCreationDate', (v) => v],
  ];
  for (const [ler, gravar, converter] of pares) {
    try {
      const valor = origem[ler]();
      if (valor) destino[gravar](converter(valor));
    } catch { /* metadado quebrado: segue sem ele */ }
  }
}

/** Devolve a vez ao navegador para a barra de progresso aparecer entre uma etapa pesada e outra. */
export const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

/**
 * Cria um PDF novo só com as páginas pedidas, na ordem recebida (índices a partir de 0).
 * Copiar para um documento novo, em vez de apagar páginas do original, deixa de fora
 * o conteúdo das páginas descartadas: ele não fica escondido dentro do arquivo.
 * @param {any} origem documento aberto
 * @param {number[]} índices
 * @param {{biblioteca: {PDFDocument: any}}} opções
 * @returns {Promise<Uint8Array>}
 */
export async function montarPdfComPáginas(origem, índices, { biblioteca }) {
  const novo = await biblioteca.PDFDocument.create();
  copiarMetadados(origem, novo);
  // Uma chamada só: os recursos compartilhados (fontes, imagens) entram uma vez no arquivo novo.
  const cópias = await novo.copyPages(origem, índices);
  for (const cópia of cópias) novo.addPage(cópia);
  return novo.save();
}
