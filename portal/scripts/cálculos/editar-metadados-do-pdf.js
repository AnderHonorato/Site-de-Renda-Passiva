/** Edição dos campos de metadados do documento PDF com pdf-lib. */
import { pareceArquivoPdf, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';

export const CAMPOS_DE_METADADOS = Object.freeze([
  { campo: 'titulo', rótulo: 'Título', chave: 'Title', getter: 'getTitle', setter: 'setTitle' },
  { campo: 'autor', rótulo: 'Autor', chave: 'Author', getter: 'getAuthor', setter: 'setAuthor' },
  { campo: 'assunto', rótulo: 'Assunto', chave: 'Subject', getter: 'getSubject', setter: 'setSubject' },
  { campo: 'palavras-chave', rótulo: 'Palavras-chave', chave: 'Keywords', getter: 'getKeywords', setter: 'setKeywords', palavras: true },
  { campo: 'criador', rótulo: 'Aplicativo criador', chave: 'Creator', getter: 'getCreator', setter: 'setCreator' },
  { campo: 'produtor', rótulo: 'Produtor do PDF', chave: 'Producer', getter: 'getProducer', setter: 'setProducer' },
  { campo: 'criado-em', rótulo: 'Data de criação (UTC)', chave: 'CreationDate', getter: 'getCreationDate', setter: 'setCreationDate', data: true },
  { campo: 'alterado-em', rótulo: 'Data de modificação (UTC)', chave: 'ModDate', getter: 'getModificationDate', setter: 'setModificationDate', data: true },
]);

export const TAMANHO_MÁXIMO = TAMANHO_MÁXIMO_POR_ARQUIVO;
export const LIMITE_DE_CARACTERES = 4000;
const XMP = 'Metadata';

const textoDaData = (valor) => valor instanceof Date && Number.isFinite(valor.getTime())
  ? valor.toISOString().replace(/\.000Z$/, 'Z') : '';

/** Lê campos comuns do dicionário Info; uma ausência é mostrada como campo vazio. */
export async function lerMetadadosPdf(bytes, biblioteca) {
  const { PDFDocument } = biblioteca;
  const documento = await PDFDocument.load(bytes, { updateMetadata: false });
  const campos = {};
  for (const definição of CAMPOS_DE_METADADOS) {
    const bruto = documento[definição.getter]();
    campos[definição.campo] = definição.data ? textoDaData(bruto)
      : definição.palavras ? (Array.isArray(bruto) ? bruto.join(', ') : String(bruto ?? ''))
        : String(bruto ?? '');
  }
  return { campos, páginas: documento.getPageCount() };
}

/**
 * Regrava os campos comuns do dicionário Info e remove o pacote XMP antigo.
 * Campos em branco são removidos, não gravados como strings vazias.
 */
export async function editarMetadadosPdf(bytes, valores, biblioteca, { limparTudo = false } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new Error('O arquivo não parece ser um PDF válido.');
  if (bytes.length > TAMANHO_MÁXIMO) throw new Error('O PDF passou do limite de 100 MB.');
  if (!pareceArquivoPdf(bytes)) {
    throw new Error('O arquivo não parece ser um PDF válido.');
  }
  const documento = await biblioteca.PDFDocument.load(bytes, { updateMetadata: false });
  const info = documento.getInfoDict();
  const { PDFName, PDFString, PDFHexString } = biblioteca;
  const excluir = (chave) => info.delete(PDFName.of(chave));

  if (limparTudo) {
    for (const chave of [...info.keys()]) info.delete(chave);
  } else {
    // As chaves standard são reescritas abaixo. Isso também permite limpar um
    // campo deixando sua caixa vazia, sem afetar os demais valores standard.
    for (const campo of CAMPOS_DE_METADADOS) excluir(campo.chave);
  }

  const atualizados = [];
  if (!limparTudo) {
    for (const campo of CAMPOS_DE_METADADOS) {
      const valor = String(valores?.[campo.campo] ?? '').trim();
      if (!valor) continue;
      if (valor.length > LIMITE_DE_CARACTERES) throw Object.assign(new Error(`${campo.rótulo} passou de ${LIMITE_DE_CARACTERES} caracteres.`), { campo: campo.campo });
      let objeto;
      if (campo.data) {
        const iso = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)Z$/u.exec(valor);
        const data = new Date(valor);
        const isoNormalizado = iso ? `${iso[1]}.000Z` : '';
        if (!iso || !Number.isFinite(data.getTime()) || data.toISOString() !== isoNormalizado) {
          throw Object.assign(new Error(`A data de ${campo.rótulo.toLowerCase()} não é válida. Use data e hora UTC em formato ISO, por exemplo 2026-11-14T15:30:00Z.`), { campo: campo.campo });
        }
        objeto = PDFString.fromDate(data);
      } else if (campo.palavras) {
        const termos = valor.split(/[,;\n]/u).map((termo) => termo.trim()).filter(Boolean);
        if (termos.length > 100) throw Object.assign(new Error('Use até 100 palavras-chave.'), { campo: campo.campo });
        objeto = PDFHexString.fromText(termos.join(', '));
      } else {
        objeto = PDFHexString.fromText(valor);
      }
      info.set(PDFName.of(campo.chave), objeto);
      atualizados.push(campo.rótulo);
    }
  }

  // XMP pode conter valores antigos e namespaces que pdf-lib não sabe atualizar
  // campo por campo. Removemos o fluxo inteiro para não deixar cópias obsoletas.
  const nomeXmp = PDFName.of(XMP);
  const referênciaXmp = documento.catalog.get(nomeXmp);
  // Tirar só o /Metadata do catálogo deixaria o XML órfão no arquivo serializado.
  if (referênciaXmp instanceof biblioteca.PDFRef) documento.context.delete(referênciaXmp);
  documento.catalog.delete(nomeXmp);
  const resultado = await documento.save({ updateFieldAppearances: false });
  return { bytes: resultado, camposAtualizados: atualizados, limpoTudo: limparTudo, páginas: documento.getPageCount() };
}
