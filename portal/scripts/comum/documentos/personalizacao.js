/** Identidade opcional do documento. O logotipo é processado no aparelho e não é salvo. */
import { ErroDeEntrada } from '../../núcleo/montador.js';
import { reconhecerArquivo, dimensõesDaImagem } from '../../cálculos/scanner-de-qr-code.js';

export const camposPersonalizacao = Object.freeze([
  { nome: 'corDocumento', rótulo: 'Cor do documento', tipo: 'color', padrão: '#a8472a', dica: 'A cor será aplicada aos destaques e às linhas do PDF.' },
  { nome: 'logoDocumento', rótulo: 'Logotipo da empresa (opcional)', tipo: 'file', dica: 'PNG ou JPG, até 2 MB e 8 megapixels. A imagem fica somente neste aparelho.' },
]);
const logotipos = new WeakMap();

export function ligarPersonalizacao(raiz) {
  const campos = ['corDocumento', 'logoDocumento'].map(nome => raiz.querySelector(`[data-campo="${nome}"]`)).filter(Boolean);
  if (!campos.length || raiz.querySelector('[data-personalizacao-documento]')) return;
  const detalhes = document.createElement('details');
  detalhes.className = 'documento-personalizacao';
  detalhes.dataset.personalizacaoDocumento = '';
  const resumo = document.createElement('summary');
  resumo.textContent = 'Personalizar documento (opcional)';
  const conteudo = document.createElement('div');
  conteudo.className = 'documento-personalizacao__campos';
  campos[0].before(detalhes);
  detalhes.append(resumo, conteudo);
  conteudo.append(...campos);
  const arquivo = raiz.querySelector('#campo-logoDocumento');
  if (arquivo) arquivo.accept = 'image/png,image/jpeg,.png,.jpg,.jpeg';
}

async function prepararLogo(arquivo) {
  if (arquivo.size <= 0 || arquivo.size > 2 * 1024 * 1024) throw new ErroDeEntrada('Escolha um logotipo PNG ou JPG de até 2 MB.', 'logoDocumento');
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = reconhecerArquivo(bytes).imagem;
  if (!['png', 'jpeg'].includes(tipo)) throw new ErroDeEntrada('O logotipo precisa ser uma imagem PNG ou JPG válida.', 'logoDocumento');
  const medida = dimensõesDaImagem(bytes, tipo);
  if (!medida || medida.largura * medida.altura > 8_000_000 || Math.max(medida.largura, medida.altura) > 8192) {
    throw new ErroDeEntrada('Use um logotipo de até 8 megapixels e 8.192 pixels de lado.', 'logoDocumento');
  }
  let bitmap;
  try { bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); }
  catch { throw new ErroDeEntrada('Não foi possível abrir o logotipo. Salve a imagem novamente como PNG ou JPG.', 'logoDocumento'); }
  const tela = document.createElement('canvas');
  try {
    const escala = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    tela.width = Math.max(1, Math.round(bitmap.width * escala));
    tela.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = tela.getContext('2d');
    if (!contexto) throw new Error('canvas indisponível');
    contexto.fillStyle = '#ffffff'; contexto.fillRect(0, 0, tela.width, tela.height);
    contexto.drawImage(bitmap, 0, 0, tela.width, tela.height);
    const blob = await new Promise((resolve, reject) => tela.toBlob(imagem => imagem ? resolve(imagem) : reject(new Error('sem imagem')), 'image/jpeg', 0.92));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), largura: tela.width, altura: tela.height };
  } catch {
    throw new ErroDeEntrada('Não foi possível preparar o logotipo. Tente outra imagem PNG ou JPG.', 'logoDocumento');
  } finally { bitmap.close?.(); tela.width = 0; tela.height = 0; }
}

export async function lerPersonalizacao(raiz, dados, { marca } = {}) {
  const corMarca = String(dados.corDocumento || '#a8472a');
  if (!/^#[0-9a-f]{6}$/i.test(corMarca)) throw new ErroDeEntrada('Escolha uma cor válida para o documento.', 'corDocumento');
  const arquivo = raiz.querySelector('#campo-logoDocumento')?.files?.[0];
  let logo;
  if (arquivo) {
    if (!logotipos.has(arquivo)) logotipos.set(arquivo, prepararLogo(arquivo).catch(erro => { logotipos.delete(arquivo); throw erro; }));
    logo = await logotipos.get(arquivo);
  }
  return { marca, corMarca, ...(logo ? { logo } : {}) };
}
