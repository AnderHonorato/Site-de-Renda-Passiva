/** OCR local: interfaces de imagem e PDF compartilham seleção, revisão e cancelamento. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../../núcleo/montador.js';
import { criarProgresso, mostrarErro } from '../../núcleo/interface.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './escolher-arquivos.js';
import { conferirFoto } from '../../cálculos/editor-de-fotos.js';
import { interpretarPáginas, mensagemDeErroDoPdfÚnico } from '../../cálculos/pdf-páginas.js';
import { abrirComPdfjsParaTexto } from './pdfjs-textos.js';
import { carregarBiblioteca } from './biblioteca-pdf.js';
import { site } from '../../../dados/site.js';

const MB = 1024 * 1024;
export const LIMITES_OCR = Object.freeze({ imagemBytes: 10 * MB, pdfBytes: 20 * MB, imagemPixels: 20_000_000, rasterPixels: 8_000_000, paginas: 20, caracteres: 1_000_000, saidaBytes: 100 * MB });
const IDIOMAS = [{ valor: 'por', rótulo: 'Português' }, { valor: 'eng', rótulo: 'Inglês' }, { valor: 'spa', rótulo: 'Espanhol' }];
const numero = (n) => n.toLocaleString('pt-BR');

/** Valida os cabeçalhos antes de o navegador alocar os pixels da imagem. */
export function conferirImagemOCR(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) return { ok: false, mensagem: 'A imagem está vazia. Escolha uma foto ou um print com texto.' };
  if (bytes.length > LIMITES_OCR.imagemBytes) return { ok: false, mensagem: 'A imagem passa de 10 MB. Reduza o arquivo antes de reconhecer o texto.' };
  const resultado = conferirFoto(bytes);
  if (!resultado.ok) return { ...resultado, mensagem: resultado.motivo === 'tipo' ? 'Escolha uma imagem JPG, PNG ou WebP com texto legível.' : resultado.mensagem };
  if (!['jpeg', 'png', 'webp'].includes(resultado.tipo)) return { ok: false, mensagem: 'Escolha uma imagem JPG, PNG ou WebP.' };
  if (resultado.largura * resultado.altura > LIMITES_OCR.imagemPixels || Math.max(resultado.largura, resultado.altura) > 16384) {
    return { ok: false, mensagem: 'A imagem passa de 20 megapixels ou 16.384 pixels de lado. Reduza as dimensões para continuar.' };
  }
  return resultado;
}

export function medidaRasterOCR(largura, altura, escala = 1) {
  if (![largura, altura, escala].every(Number.isFinite) || largura <= 0 || altura <= 0 || escala <= 0) throw new Error('Não foi possível ler o tamanho desta página.');
  const fator = Math.min(escala, Math.sqrt(LIMITES_OCR.rasterPixels / (largura * altura)), 6000 / Math.max(largura, altura));
  let pixelsDeLargura = Math.max(1, Math.floor(largura * fator));
  // PDF.js arredonda a altura ao desenhar pela largura: reserve esse pixel para não ultrapassar o motor.
  while (pixelsDeLargura > 1 && pixelsDeLargura * Math.ceil(altura * pixelsDeLargura / largura) > LIMITES_OCR.rasterPixels) pixelsDeLargura--;
  return { largura: pixelsDeLargura, altura: Math.max(1, Math.floor(altura * pixelsDeLargura / largura)), escala: pixelsDeLargura / largura, reduzida: fator < escala - 0.0001 };
}

const tela = (largura, altura) => {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  return canvas;
};
const confirmarAtivo = (signal) => {
  if (signal.aborted) { const erro = new Error('Reconhecimento cancelado. Você pode escolher outro arquivo e começar de novo.'); erro.cancelado = true; throw erro; }
};

async function imagemNaTela(arquivo) {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const medidas = conferirImagemOCR(bytes);
  if (!medidas.ok) throw new ErroDeEntrada(medidas.mensagem, 'arquivo');
  let bitmap;
  try { bitmap = await createImageBitmap(new Blob([bytes], { type: { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[medidas.tipo] }), { imageOrientation: 'from-image' }); }
  catch { throw new ErroDeEntrada('Não foi possível abrir esta imagem. Salve uma cópia em JPG ou PNG e tente de novo.', 'arquivo'); }
  try {
    if (bitmap.width * bitmap.height > LIMITES_OCR.imagemPixels) throw new ErroDeEntrada('A imagem passa de 20 megapixels. Reduza as dimensões para continuar.', 'arquivo');
    // createImageBitmap aplica EXIF em from-image, inclusive espelho/giro sem mudar dimensões.
    const largura = bitmap.width;
    const altura = bitmap.height;
    const raster = medidaRasterOCR(largura, altura);
    const canvas = tela(raster.largura, raster.altura);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { canvas, reduzida: raster.reduzida, largura, altura };
  } finally { bitmap.close(); }
}

function preencherExemplo(canvas) {
  canvas.width = 1300; canvas.height = 1650;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#151515'; ctx.font = 'bold 57px Arial'; ctx.fillText('RELATORIO DE NOVEMBRO', 100, 180);
  ctx.font = '38px Arial';
  ['Projeto Flower', 'Documento de exemplo para reconhecer texto.', 'Cliente: Ana Silva', 'Itens entregues: 24', 'Valor total: R$ 1.250,00', 'Prazo de entrega: 20 de novembro.', 'Confira os dados antes de compartilhar.'].forEach((linha, i) => ctx.fillText(linha, 100, 330 + i * 120));
  return canvas;
}
const blobPNG = (canvas) => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')), 'image/png'));

/** Todas as operações usam bytes locais. O único carregamento é do motor do próprio site. */
export function montarOCR(raiz, ferramenta, { pdf = false } = {}) {
  let escolha, progresso, bloco, preview, legenda, editor, nota, botaoCancelar, botaoExemplo;
  let controlador = null, versaoPreview = 0, versaoExecucao = 0, versaoExemplo = 0, emExecucao = false;
  const invalidar = () => { bloco.hidden = true; editor.value = ''; };
  const limparPreview = () => { preview.width = 0; preview.height = 0; preview.hidden = true; };
  const travar = (valor) => {
    emExecucao = valor;
    escolha.travar(valor);
    for (const campo of raiz.querySelectorAll('#formulário select, #formulário input:not([type=file])')) campo.disabled = valor;
    botaoExemplo.disabled = valor;
    botaoCancelar.hidden = !valor;
    raiz.classList.toggle('ocr-em-execucao', valor);
    raiz.setAttribute('aria-busy', String(valor));
  };

  montarFerramenta(raiz, ferramenta, {
    rótuloDaAção: pdf ? 'Reconhecer PDF' : 'Reconhecer texto',
    demorada: true,
    progressoExterno: true,
    permitirSalvarTrabalho: false,
    campos: [
      { nome: 'arquivo', rótulo: pdf ? 'PDF escaneado' : 'Imagem com texto', tipo: 'file', dica: pdf ? 'PDF de até 20 MB e 20 páginas. O processamento acontece neste aparelho.' : 'JPG, PNG ou WebP de até 10 MB e 20 megapixels. O arquivo fica neste aparelho.' },
      { nome: 'idioma', rótulo: 'Idioma do documento', tipo: 'seleção', padrão: 'por', opções: IDIOMAS },
      ...(pdf ? [{ nome: 'paginas', rótulo: 'Páginas para reconhecer', tipo: 'text', exemplo: 'Todas', dica: 'Deixe vazio para todas, ou informe 1-3, 5. A saída contém somente as páginas escolhidas.' }] : []),
    ],
    async calcular(dados) {
      if (emExecucao) throw new Error('Aguarde o reconhecimento atual terminar.');
      const item = escolha.itens()[0];
      if (!item) throw new ErroDeEntrada(pdf ? 'Escolha um PDF escaneado para reconhecer o texto.' : 'Escolha uma imagem com texto para começar.', 'arquivo');
      invalidar();
      const rodada = ++versaoExecucao;
      const controle = new AbortController(); controlador = controle;
      const { signal } = controle;
      let leitor, documento;
      travar(true);
      progresso.iniciar('Preparando o reconhecimento de texto…');
      const resultados = [];
      const medidas = [];
      let reduzidas = 0;
      try {
        let paginas = [1];
        if (pdf) {
          try { documento = await abrirComPdfjsParaTexto(new Uint8Array(await item.arquivo.arrayBuffer())); }
          catch (erro) { throw new ErroDeEntrada(erro?.name === 'PasswordException' ? 'Este PDF tem senha. Salve uma cópia sem proteção para reconhecer o texto.' : 'Não foi possível abrir este PDF. Confira se ele abre no seu leitor e salve uma cópia sem senha.', 'arquivo'); }
          confirmarAtivo(signal);
          if (documento.páginas > LIMITES_OCR.paginas) throw new ErroDeEntrada('O PDF tem mais de 20 páginas. Divida o documento e processe uma parte por vez.', 'arquivo');
          const faixa = interpretarPáginas(dados.paginas || '', documento.páginas);
          if (!faixa.ok) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico(faixa.erro, faixa.extras), 'paginas');
          paginas = faixa.índices.map((indiceDaPagina) => indiceDaPagina + 1);
        }
        let indice = 0;
        const motor = await import('../../comum/ocr/motor.js');
        confirmarAtivo(signal);
        leitor = await motor.criarLeitorOCR({
          idioma: dados.idioma, signal,
          aoProgredir: ({ etapa, progresso: valor }) => {
            if (signal.aborted) return;
            const percentual = Number.isFinite(valor) ? 100 * (indice + Math.min(1, Math.max(0, valor))) / paginas.length : undefined;
            const mensagem = etapa === 'carregando' ? 'Carregando o leitor de texto…' : 'Reconhecendo as letras…';
            progresso.andar(percentual, `${pdf ? `Página ${paginas[indice]} de ${documento.páginas} · ` : ''}${mensagem}`);
          },
        });
        for (indice = 0; indice < paginas.length; indice++) {
          confirmarAtivo(signal);
          let canvas;
          try {
            if (pdf) {
              const medida = await documento.tamanho(paginas[indice]);
              const raster = medidaRasterOCR(medida.largura, medida.altura, 300 / 72);
              canvas = tela(1, 1);
              await documento.desenharNaTela(paginas[indice], canvas, raster.largura);
              if (canvas.width * canvas.height > LIMITES_OCR.rasterPixels + 10000) throw new Error('Esta página excede o tamanho seguro para o reconhecimento.');
              medidas.push(medida);
              if (raster.reduzida) reduzidas++;
            } else {
              const imagem = await imagemNaTela(item.arquivo);
              canvas = imagem.canvas;
              if (imagem.reduzida) reduzidas++;
            }
            confirmarAtivo(signal);
            preview.width = Math.min(700, canvas.width); preview.height = Math.max(1, Math.round(canvas.height * preview.width / canvas.width));
            preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height); preview.hidden = false;
            legenda.textContent = pdf ? `Reconhecendo a página ${paginas[indice]} de ${documento.páginas}.` : 'Reconhecendo as letras da imagem escolhida.';
            const resultado = await leitor.reconhecer(canvas, { pdf });
            confirmarAtivo(signal);
            if (typeof resultado.texto !== 'string') throw new Error('Não foi possível obter o texto desta página. Tente uma imagem mais nítida.');
            resultados.push({ ...resultado, pagina: paginas[indice] });
            if (resultados.reduce((soma, r) => soma + r.texto.length, 0) > LIMITES_OCR.caracteres) throw new Error('O texto reconhecido passa de um milhão de caracteres. Processe menos páginas por vez.');
            if (resultados.reduce((soma, r) => soma + (r.pdf?.length || 0), 0) > LIMITES_OCR.saidaBytes) throw new Error('O resultado ficou maior que 100 MB. Processe menos páginas por vez.');
          } finally { if (canvas) { canvas.width = 0; canvas.height = 0; } }
        }
        const reconhecido = resultados.map((r) => pdf ? `--- Página ${r.pagina} ---\n${r.texto.trim()}` : r.texto.trim()).join('\n\n');
        if (!resultados.some((r) => r.texto.trim())) throw new ErroDeEntrada('Não encontrei texto legível. Use um documento com letras impressas, reto, nítido e bem iluminado; confira também o idioma escolhido.', 'arquivo');
        const confiancas = resultados.map((r) => r.confianca).filter((n) => Number.isFinite(n));
        const confianca = confiancas.length ? Math.max(0, Math.min(100, confiancas.reduce((a, b) => a + b, 0) / confiancas.length)) : null;
        const base = nomeDeArquivo(item.nome.replace(/\.[^.]+$/, '')) || 'documento';
        let pdfFinal;
        if (pdf) {
          progresso.andar(99, 'Montando o PDF pesquisável…');
          const biblioteca = await carregarBiblioteca();
          confirmarAtivo(signal);
          const saida = await biblioteca.PDFDocument.create();
          for (let i = 0; i < resultados.length; i++) {
            confirmarAtivo(signal);
            if (!(resultados[i].pdf instanceof Uint8Array) || !resultados[i].pdf.length) throw new Error('Não foi possível montar o PDF pesquisável. Tente novamente com menos páginas.');
            const origem = await biblioteca.PDFDocument.load(resultados[i].pdf);
            const original = origem.getPages()[0];
            const [pagina] = await saida.embedPdf(origem, [0]);
            const medida = medidas[i];
            const destino = saida.addPage([medida.largura, medida.altura]);
            destino.drawPage(pagina, { x: 0, y: 0, width: medida.largura, height: medida.altura });
            if (!original) throw new Error('Uma das páginas não pôde ser reconhecida.');
          }
          saida.setTitle(`${base} — texto reconhecido`);
          saida.setProducer(`${site.nome} · OCR local`);
          pdfFinal = await saida.save();
          if (pdfFinal.length > LIMITES_OCR.saidaBytes) throw new Error('O PDF pesquisável ficou maior que 100 MB. Processe menos páginas por vez.');
        }
        confirmarAtivo(signal);
        editor.value = reconhecido;
        bloco.hidden = false;
        nota.textContent = pdf ? 'Revise o texto antes de copiar ou baixar o TXT. As correções neste campo não alteram a camada de texto do PDF pesquisável.' : 'O reconhecimento pode trocar letras, números e acentos. Revise o texto antes de compartilhar.';
        legenda.textContent = pdf ? `${resultados.length} ${resultados.length === 1 ? 'página reconhecida' : 'páginas reconhecidas'}. Prévia da última página processada.` : 'Imagem processada. O texto reconhecido está disponível abaixo.';
        progresso.concluir('Texto reconhecido');
        return {
          valor: pdf ? 'PDF pesquisável pronto' : 'Texto reconhecido',
          get texto() { return editor.value; },
          resumo: `${numero(reconhecido.length)} caracteres · ${pdf ? `${resultados.length} ${resultados.length === 1 ? 'página' : 'páginas'}` : item.nome}`,
          linhas: [['Idioma', IDIOMAS.find((i) => i.valor === dados.idioma)?.rótulo || 'Português'], ...(confianca === null ? [] : [['Confiança estimada', `${Math.round(confianca)}% · revise o texto`]])],
          arquivos: [
            ...(pdf ? [{ rótulo: 'Baixar PDF pesquisável', ícone: 'baixar', gerar: () => baixar(pdfFinal, `${base}-pesquisavel.pdf`, 'application/pdf') }] : []),
            { rótulo: 'Baixar TXT revisado', ícone: 'baixar', gerar: () => baixar(editor.value, `${base}-texto.txt`, 'text/plain;charset=utf-8') },
          ],
          ...(pdf ? { previaPdf: { bytes: pdfFinal, nome: `${base}-pesquisavel.pdf` } } : {}),
          observações: [
            'O arquivo foi processado neste navegador. Nenhum documento foi enviado a um serviço de reconhecimento.',
            ...(reduzidas ? [`${reduzidas} ${reduzidas === 1 ? 'imagem foi reduzida' : 'imagens foram reduzidas'} para até 8 megapixels durante o reconhecimento, para limitar o uso de memória.`] : []),
            ...(pdf ? ['As páginas foram convertidas em imagens com uma camada de texto pesquisável. Links, formulários, anexos e assinaturas digitais do original não são preservados.'] : []),
          ],
        };
      } catch (erro) {
        if (signal.aborted || erro?.cancelado) {
          const cancelado = new Error('Reconhecimento cancelado.'); cancelado.cancelado = true;
          if (rodada === versaoExecucao) progresso.cancelar(cancelado.message);
          else progresso.esconder();
          throw cancelado;
        }
        progresso.falhar('Não foi possível reconhecer o texto');
        if (erro?.name === 'ErroOCR') throw new Error(erro.message);
        throw erro;
      } finally {
        try { await leitor?.fechar(); } catch { /* já encerrado por cancelamento */ }
        try { await documento?.fechar(); } catch { /* documento já encerrado */ }
        if (controlador === controle) { controlador = null; travar(false); }
      }
    },
    aoResultado(elemento) {
      elemento.querySelector('#resultado .resultado__principal').after(bloco);
      const copiar = elemento.querySelector('#resultado [data-copiar]');
      if (copiar) { copiar.lastChild.textContent = 'Copiar texto revisado'; copiar.setAttribute('aria-label', 'Copiar texto revisado'); }
    },
    aoMontar(elemento) {
      elemento.classList.add('ocr-documentos');
      const formulario = elemento.querySelector('#formulário');
      const stage = document.createElement('section');
      stage.className = 'ocr-stage ocr-stage--exemplo'; stage.setAttribute('aria-label', 'Prévia do documento');
      stage.innerHTML = '<div class="ocr-stage__titulo"><div><span class="ocr-etiqueta">DO ARQUIVO AO TEXTO</span><h2>Veja o que será reconhecido</h2></div><button class="botão botão--linha" type="button" data-ocr-exemplo>Experimentar com exemplo</button></div><div class="ocr-stage__papel"><canvas role="img" aria-label="Prévia do documento escolhido"></canvas><span class="ocr-stage__feixe" aria-hidden="true"></span></div><p class="ocr-stage__legenda"></p>';
      formulario.before(stage);
      preview = stage.querySelector('canvas'); legenda = stage.querySelector('.ocr-stage__legenda');
      preencherExemplo(preview);
      legenda.textContent = 'Exemplo de documento. Experimente para reconhecer este texto com o mesmo motor usado nos seus arquivos.';
      botaoExemplo = stage.querySelector('[data-ocr-exemplo]');
      botaoExemplo.addEventListener('click', async () => {
        const pedido = ++versaoExemplo;
        botaoExemplo.disabled = true;
        const exemplo = preencherExemplo(tela(1, 1));
        try {
          const imagem = await blobPNG(exemplo);
          let arquivo;
          if (pdf) {
            const biblioteca = await carregarBiblioteca();
            const doc = await biblioteca.PDFDocument.create();
            const png = await doc.embedPng(await imagem.arrayBuffer());
            doc.addPage([468, 594]).drawImage(png, { x: 0, y: 0, width: 468, height: 594 });
            arquivo = new File([await doc.save()], 'exemplo-escaneado.pdf', { type: 'application/pdf' });
          } else arquivo = new File([imagem], 'exemplo-texto.png', { type: 'image/png' });
          if (pedido !== versaoExemplo) return;
          await escolha.adicionar([arquivo]);
          elemento.querySelector('#campo-idioma').value = 'por';
        } catch { mostrarErro(elemento.querySelector('[data-campo="arquivo"]'), 'Não foi possível preparar o exemplo. Escolha um arquivo seu para continuar.'); }
        finally { exemplo.width = 0; exemplo.height = 0; botaoExemplo.disabled = emExecucao; }
      });
      escolha = montarEscolhaDeArquivos(elemento, {
        campo: 'arquivo', rótuloDoBotão: pdf ? 'Escolher PDF' : 'Escolher imagem', accept: pdf ? 'application/pdf,.pdf' : 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
        rótuloDaLista: pdf ? 'PDF escolhido' : 'Imagem escolhida', textoDoVazio: pdf ? 'Arraste um PDF escaneado para cá ou escolha um arquivo.' : 'Arraste uma imagem para cá ou escolha um arquivo.', textoDeSolte: 'Solte o arquivo para reconhecer o texto.',
        validar: async (arquivo, comeco) => {
          if (pdf) {
            if (arquivo.size > LIMITES_OCR.pdfBytes) return { erro: 'O PDF passa de 20 MB. Reduza ou divida o arquivo para continuar.' };
            return validarPdfDaEscolha(arquivo, comeco);
          }
          if (arquivo.size > LIMITES_OCR.imagemBytes) return { erro: 'A imagem passa de 10 MB. Reduza o arquivo antes de reconhecer o texto.' };
          const resultado = conferirImagemOCR(new Uint8Array(await arquivo.arrayBuffer()));
          return resultado.ok ? {} : { erro: resultado.mensagem };
        },
        aoMudar: (itens) => {
          stage.classList.remove('ocr-stage--exemplo');
          invalidar();
          const versao = ++versaoPreview;
          limparPreview();
          if (!itens.length) { legenda.textContent = 'Escolha um arquivo para ver a prévia antes do reconhecimento.'; return; }
          legenda.textContent = 'Preparando a prévia do arquivo…';
          void (async () => {
            let doc, canvas;
            try {
              if (pdf) {
                doc = await abrirComPdfjsParaTexto(new Uint8Array(await itens[0].arquivo.arrayBuffer()));
                canvas = tela(1, 1);
                const medida = await doc.tamanho(1);
                await doc.desenharNaTela(1, canvas, Math.min(700, medida.largura));
                if (versao !== versaoPreview || emExecucao) return;
                legenda.textContent = `${doc.páginas} ${doc.páginas === 1 ? 'página' : 'páginas'} no documento. Prévia da primeira página. ${doc.páginas > 20 ? 'Divida o PDF: o limite é 20 páginas por arquivo.' : 'Escolha o idioma e reconheça o texto.'}`;
              } else {
                const imagem = await imagemNaTela(itens[0].arquivo);
                canvas = imagem.canvas;
                if (versao !== versaoPreview || emExecucao) return;
                legenda.textContent = `${numero(imagem.largura)} × ${numero(imagem.altura)} pixels.${imagem.reduzida ? ' O reconhecimento usa uma cópia de até 8 megapixels.' : ''} Escolha o idioma e reconheça o texto.`;
              }
              preview.width = Math.min(700, canvas.width); preview.height = Math.max(1, Math.round(canvas.height * preview.width / canvas.width));
              preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height); preview.hidden = false;
            } catch { if (versao === versaoPreview) legenda.textContent = 'A prévia não pôde ser aberta. Confira o arquivo e tente uma cópia sem senha.'; }
            finally { if (canvas) { canvas.width = 0; canvas.height = 0; } try { await doc?.fechar(); } catch { /* fim da prévia */ } }
          })();
        },
      });
      const linha = document.createElement('div'); linha.className = 'progresso ocr-progresso t-2'; linha.hidden = true;
      linha.innerHTML = '<p class="progresso__texto"></p><div class="progresso__trilho"><div class="progresso__barra"></div></div>';
      elemento.querySelector('#progresso').before(linha);
      progresso = criarProgresso(linha, { tipo: 'arquivo', demorada: true });
      botaoCancelar = document.createElement('button'); botaoCancelar.type = 'button'; botaoCancelar.className = 'botão botão--linha'; botaoCancelar.textContent = 'Cancelar reconhecimento'; botaoCancelar.hidden = true;
      botaoCancelar.addEventListener('click', () => controlador?.abort());
      formulario.querySelector('.ações').append(botaoCancelar);
      bloco = document.createElement('section'); bloco.className = 'ocr-revisao t-3'; bloco.hidden = true;
      const rotulo = document.createElement('label'); rotulo.htmlFor = 'ocr-texto-revisao'; rotulo.textContent = 'Revise o texto reconhecido';
      editor = document.createElement('textarea'); editor.id = 'ocr-texto-revisao'; editor.className = 'ocr-texto'; editor.rows = 10; editor.maxLength = LIMITES_OCR.caracteres; editor.spellcheck = true;
      nota = document.createElement('p'); nota.className = 'campo__dica'; nota.id = 'ocr-texto-nota'; editor.setAttribute('aria-describedby', nota.id);
      bloco.append(rotulo, editor, nota); elemento.querySelector('#resultado').after(bloco);
      formulario.addEventListener('reset', () => { controlador?.abort(); versaoPreview++; versaoExecucao++; versaoExemplo++; invalidar(); progresso.esconder(); });
      for (const campo of formulario.querySelectorAll('select,input:not([type=file])')) campo.addEventListener('input', () => { invalidar(); elemento.querySelector('#resultado').hidden = true; progresso.esconder(); });
      window.addEventListener('pagehide', () => controlador?.abort());
    },
  });
}
