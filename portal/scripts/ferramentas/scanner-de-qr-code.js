/**
 * Ler QR Code: a partir de uma imagem (arquivo, print, colagem ou foto tirada na hora), tudo no navegador.
 *
 * Usa o leitor nativo (`BarcodeDetector`) quando o navegador tem; senão, a biblioteca jsQR (Apache-2.0),
 * carregada de `recursos/` só nesta página. NADA é aberto sozinho: o conteúdo é mostrado, com sinais de
 * alerta, e quem decide abrir o link é a pessoa, no botão.
 */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { criarProgresso, avisar } from '../núcleo/interface.js';
import { prepararEscolhaDeArquivos } from './auxiliares/escolher-arquivos.js';
import {
  conferirImagem, escalasParaTentar, procurarCódigos, textoDoAchado, PRAZO_DA_LEITURA_MS, TAMANHO_MÁXIMO_DA_IMAGEM, MEGAPIXELS_MÁXIMOS, MÁXIMO_DE_CÓDIGOS,
} from '../cálculos/scanner-de-qr-code.js';
import { analisarConteúdo, tornarVisíveis, resumirTexto } from '../cálculos/conteúdo-de-qr-code.js';

const TIPOS_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif' };

const FRASE_DO_NÍVEL = {
  perigo: 'Há sinais de golpe ou de risco neste código. Não abra.',
  atenção: 'Há pontos de atenção neste código. Confira antes de abrir qualquer coisa.',
  'sem-sinais': 'Não vi sinais óbvios de golpe, mas isso não garante que seja seguro.',
};
const PREFIXO_DO_AVISO = { perigo: 'Perigo', atenção: 'Atenção', dica: 'Dica' };

/* ------------------------------------------------------------------ leitura */

async function lerComLeitorNativo(bitmap) {
  if (!('BarcodeDetector' in globalThis)) return null;
  try {
    const formatos = await globalThis.BarcodeDetector.getSupportedFormats?.();
    if (formatos && !formatos.includes('qr_code')) return null;
    const detector = new globalThis.BarcodeDetector({ formats: ['qr_code'] });
    const achados = await detector.detect(bitmap);
    const textos = [...new Set(achados.map((a) => a.rawValue).filter((t) => typeof t === 'string'))];
    return textos.slice(0, MÁXIMO_DE_CÓDIGOS);
  } catch {
    return null; // leitor nativo indisponível ou com defeito: a jsQR assume
  }
}

function criarQuadro(largura, altura) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(largura, altura);
  const quadro = document.createElement('canvas');
  quadro.width = largura;
  quadro.height = altura;
  return quadro;
}

/** Desenha a imagem no tamanho pedido, sobre fundo branco (PNG transparente viraria preto e o QR sumiria). */
function pixelsDaImagem(bitmap, escala) {
  const quadro = criarQuadro(escala.largura, escala.altura);
  const contexto = quadro.getContext('2d', { willReadFrequently: true });
  contexto.imageSmoothingQuality = 'high';
  contexto.fillStyle = '#fff';
  contexto.fillRect(0, 0, escala.largura, escala.altura);
  contexto.drawImage(bitmap, 0, 0, escala.largura, escala.altura);
  return contexto.getImageData(0, 0, escala.largura, escala.altura);
}

const ERRO_PRAZO = 'A leitura demorou demais: a imagem é complexa ou tem muito ruído. Recorte só o QR Code, com um pouco de margem branca, e tente de novo.';
const ERRO_BIBLIOTECA = 'Não foi possível carregar o leitor de QR Code. Confira a conexão e tente de novo.';

/**
 * Manda os pixels ao trabalhador e espera a resposta até o prazo. Passou do prazo, o trabalhador é encerrado
 * (a jsQR não dá para interromper de dentro): é isso que impede uma imagem cheia de ruído de travar a página.
 */
function perguntarAoTrabalhador(trabalhador, pixels, prazoFinal) {
  return new Promise((resolver, rejeitar) => {
    const restante = prazoFinal - Date.now();
    if (restante <= 0) { rejeitar(new Error(ERRO_PRAZO)); return; }
    const relógio = setTimeout(() => { trabalhador.terminate(); rejeitar(new Error(ERRO_PRAZO)); }, restante);
    trabalhador.onmessage = ({ data }) => {
      clearTimeout(relógio);
      if (data.ok) resolver(data.achados.map((a) => a.texto));
      else rejeitar(new Error(ERRO_BIBLIOTECA));
    };
    trabalhador.onerror = (evento) => {
      clearTimeout(relógio);
      evento.preventDefault?.();
      rejeitar(Object.assign(new Error(ERRO_BIBLIOTECA), { semTrabalhador: true }));
    };
    trabalhador.postMessage({ largura: pixels.width, altura: pixels.height, buffer: pixels.data.buffer }, [pixels.data.buffer]);
  });
}

/** Sem Web Worker (navegador antigo): lê na própria página, num só tamanho e sem recortes, para limitar o tempo travado. */
async function lerNaPágina(bitmap) {
  try {
    await import('../../recursos/jsQR.js');
  } catch {
    throw new Error(ERRO_BIBLIOTECA);
  }
  const lado = Math.min(800, Math.max(bitmap.width, bitmap.height));
  const fator = lado / Math.max(bitmap.width, bitmap.height);
  const pixels = pixelsDaImagem(bitmap, { largura: Math.max(21, Math.round(bitmap.width * fator)), altura: Math.max(21, Math.round(bitmap.height * fator)) });
  return procurarCódigos(pixels, (dados, l, a) => {
    const achado = globalThis.jsQR(dados, l, a, { inversionAttempts: 'attemptBoth' });
    return achado ? { data: textoDoAchado(achado), location: achado.location } : null;
  }, { recortes: false }).map((a) => a.texto);
}

async function lerComJsQr(bitmap, aoProgredir) {
  const prazoFinal = Date.now() + PRAZO_DA_LEITURA_MS;
  const escalas = escalasParaTentar(bitmap.width, bitmap.height);
  let trabalhador;
  try {
    trabalhador = new Worker(new URL('./auxiliares/trabalhador-de-qr.js', import.meta.url), { type: 'module' });
  } catch {
    return lerNaPágina(bitmap);
  }
  try {
    for (const [i, escala] of escalas.entries()) {
      aoProgredir(30 + (60 * i) / escalas.length, `Procurando o QR Code (${i + 1} de ${escalas.length})…`);
      // Deixa o navegador pintar o progresso antes do trabalho pesado.
      await new Promise((resolver) => setTimeout(resolver, 0));
      let achados;
      try {
        achados = await perguntarAoTrabalhador(trabalhador, pixelsDaImagem(bitmap, escala), prazoFinal);
      } catch (erro) {
        if (erro.semTrabalhador) return lerNaPágina(bitmap);
        throw erro;
      }
      if (achados.length) return achados;
    }
    return [];
  } finally {
    trabalhador.terminate();
  }
}

/**
 * Lê todos os QR Codes de uma imagem já conferida.
 * @returns {Promise<{textos: string[], leitor: string}>}
 */
async function lerImagem(escolhida, aoProgredir) {
  const { bytes, tipo, largura, altura } = escolhida.dados;
  aoProgredir(10, 'Abrindo a imagem…');
  let bitmap;
  try {
    // Foto grande é reduzida já na abertura (lado máximo de 4000 px, o dobro do maior tamanho que a leitura usa):
    // 100 megapixels em RGBA seriam 400 MB de memória só para abrir.
    const reduzir = largura * altura > 16_000_000
      ? { resizeWidth: Math.round(largura * (4000 / Math.max(largura, altura))), resizeHeight: Math.round(altura * (4000 / Math.max(largura, altura))), resizeQuality: 'high' }
      : {};
    bitmap = await createImageBitmap(new Blob([bytes], { type: TIPOS_MIME[tipo] }), reduzir);
  } catch {
    throw new ErroDeEntrada('Não foi possível abrir esta imagem: o arquivo parece corrompido ou o navegador não o reconhece. Tente salvar de novo como PNG ou JPG.', 'arquivo');
  }
  try {
    aoProgredir(20, 'Lendo o QR Code…');
    const nativo = await lerComLeitorNativo(bitmap);
    if (nativo?.length) return { textos: nativo, leitor: 'leitor nativo do navegador' };
    const textos = await lerComJsQr(bitmap, aoProgredir);
    return { textos, leitor: 'biblioteca jsQR' };
  } finally {
    bitmap.close?.();
  }
}

/* ------------------------------------------------------------------ resultado */

/** Mostra o conteúdo bruto numa caixa de texto que rola e quebra linha: um endereço longo não estoura a tela. */
function mostrarConteúdoLido(raiz, códigos) {
  const resultado = raiz.querySelector('#resultado');
  if (!resultado) return;
  resultado.querySelector('[data-conteúdo-lido]')?.remove();
  const bloco = document.createElement('div');
  bloco.dataset.conteúdoLido = 'sim';
  bloco.className = 'campo t-3';
  códigos.forEach((código, i) => {
    const id = `conteúdo-lido-${i}`;
    const rótulo = document.createElement('label');
    rótulo.htmlFor = id;
    rótulo.textContent = códigos.length > 1 ? `Conteúdo lido, código ${i + 1}` : 'Conteúdo lido';
    const caixa = document.createElement('textarea');
    caixa.id = id;
    caixa.readOnly = true;
    caixa.spellcheck = false;
    caixa.rows = Math.min(8, Math.max(2, tornarVisíveis(código).split('\n').length + 1));
    caixa.value = tornarVisíveis(código);
    bloco.append(rótulo, caixa);
  });
  const primeiraObservação = [...resultado.querySelectorAll('p.pequeno.suave')][0];
  if (primeiraObservação) primeiraObservação.before(bloco);
  else (resultado.querySelector('.ações') ?? resultado).before(bloco);
}

/**
 * Monta o que a tela mostra para os códigos lidos. Exportada para os testes conferirem a tela sem navegador.
 * @param {string[]} textos conteúdo de cada código lido
 * @param {{abrir?: (endereço: string, nível: string) => void, leitor?: string}} [opções]
 */
export function descreverCódigos(textos, { abrir = () => {}, leitor = '' } = {}) {
  const análises = textos.map((t) => analisarConteúdo(t));
  const vários = análises.length > 1;
  const pior = análises.some((a) => a.nível === 'perigo') ? 'perigo' : análises.some((a) => a.nível === 'atenção') ? 'atenção' : 'sem-sinais';

  const linhas = [];
  const observações = [];
  análises.forEach((a, i) => {
    const marca = vários ? `Código ${i + 1}: ` : '';
    if (vários) linhas.push([`Código ${i + 1}`, a.rótulo]);
    else linhas.push(['Tipo', a.rótulo]);
    for (const [rótulo, valor] of a.detalhes) linhas.push([`${marca}${rótulo}`, valor]);
    for (const aviso of a.avisos) observações.push(`${marca}${PREFIXO_DO_AVISO[aviso.nível]}: ${aviso.texto}`);
  });
  observações.push(FRASE_DO_NÍVEL[pior]);
  observações.push('Nada foi aberto: abrir um link, se houver, é uma escolha sua.');
  if (leitor) observações.push(`Lido com: ${leitor}. A imagem não saiu do seu aparelho.`);

  const botões = análises.flatMap((a, i) => (a.endereço ? [{
    rótulo: vários ? `Abrir o link ${i + 1}` : 'Abrir o link',
    ícone: 'seta-diagonal',
    gerar: () => abrir(a.endereço, a.nível),
  }] : []));

  return {
    valor: vários ? `${análises.length} QR Codes encontrados` : análises[0].rótulo,
    resumo: vários ? 'Nada foi aberto. Confira cada código abaixo.' : resumirTexto(textos[0], 90),
    linhas,
    observações,
    texto: textos.map((t) => tornarVisíveis(t)).join('\n\n'),
    arquivos: botões,
    códigos: textos,
  };
}

/** Abre o link só depois de um pedido explícito; links com alerta pedem uma confirmação a mais. */
function abrirComCuidado(endereço, nível) {
  if (nível !== 'sem-sinais') {
    const aviso = nível === 'perigo'
      ? 'Este link tem SINAIS DE GOLPE. Abrir mesmo assim?'
      : 'Este link tem pontos de atenção. Abrir mesmo assim?';
    if (!window.confirm(`${aviso}\n\n${resumirTexto(endereço, 120)}`)) return;
  }
  window.open(endereço, '_blank', 'noopener,noreferrer');
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher imagem" (ou arraste o arquivo, ou cole uma imagem com Ctrl+V). No celular, "Tirar foto" abre a câmera do aparelho.',
      'A leitura começa sozinha. O conteúdo aparece em uma caixa, com o tipo do código (link, Wi-Fi, Pix, contato, texto) e os sinais de alerta.',
      'Leia os avisos. Nada é aberto automaticamente: se o conteúdo for um link e você quiser abri-lo, toque em "Abrir o link".',
      'Para guardar o conteúdo, use "Copiar".',
    ],
    exemplo: {
      texto: 'Um print de QR Code de cardápio mostra o link "https://exemplo.com.br/cardapio", tipo Link, conexão https. '
        + 'Um QR de encurtador como "https://bit.ly/abc" aparece com o alerta de que o destino verdadeiro fica escondido até abrir.',
    },
    limites: `Imagens PNG, JPG, WebP, GIF, BMP ou AVIF de até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB e ${MEGAPIXELS_MÁXIMOS} megapixels; até ${MÁXIMO_DE_CÓDIGOS} QR Codes por imagem. `
      + 'O tipo é conferido pelo conteúdo do arquivo, não pela extensão. '
      + 'Os alertas são sinais conhecidos de golpe (encurtador, endereço numérico, nome de banco em site de outro dono, letras que imitam outras, http sem criptografia): ajudam, mas não provam nada. A falta de alerta NÃO significa que o link é seguro. '
      + 'A leitura contínua pela câmera ao vivo não está disponível: a política de segurança do portal desliga a câmera das páginas. Pelo celular, "Tirar foto" abre a câmera do aparelho e lê a foto. '
      + 'Usa o leitor nativo do navegador quando existe e, senão, a biblioteca jsQR (licença Apache-2.0), que roda no aparelho. Nenhuma imagem sai do seu aparelho. '
      + 'QR Code muito pequeno, borrado, cortado ou com pouco contraste pode não ser lido; recorte só o código e tente de novo.',
    perguntas: [
      { p: 'Por que a ferramenta não abre o link sozinha?', r: 'Porque o golpe do QR Code funciona assim: o código leva a um site falso de banco, estacionamento ou cardápio. Ler é seguro; abrir é uma decisão sua, depois de conferir o endereço.' },
      { p: 'A ferramenta disse que não encontrou nenhum QR Code. E agora?', r: 'Recorte a imagem deixando só o código, com um pouco de margem branca em volta, e tente de novo. Fotos tremidas, em ângulo ou com reflexo costumam falhar; tire outra de frente e com boa luz.' },
      { p: 'E se o código for um Pix?', r: 'A ferramenta mostra o recebedor, a cidade, a chave e o valor que estão dentro do código e confere o código de verificação. Confirme os mesmos dados no aplicativo do seu banco antes de pagar.' },
      { p: 'Minha imagem foi enviada para algum lugar?', r: 'Não. A leitura acontece dentro do seu navegador, sem envio para servidor.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Ler QR Code',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Imagem com o QR Code', tipo: 'file',
          dica: `PNG, JPG, WebP, GIF, BMP ou AVIF, de até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB. Ela não sai do seu aparelho.`,
        },
      ],

      async calcular() {
        const escolhida = escolha.atuais()[0];
        if (!escolhida) throw new ErroDeEntrada('Escolha uma imagem com o QR Code primeiro.', 'arquivo');
        escolha.travar(true);
        try {
          let leitura;
          try {
            leitura = await lerImagem(escolhida, (p, rótulo) => progresso.andar(p, rótulo));
          } catch (erro) {
            // Falha de leitura (prazo, biblioteca) chega no campo da imagem, com o que fazer.
            if (erro.constructor === Error) throw new ErroDeEntrada(erro.message, 'arquivo');
            throw erro;
          }
          const { textos, leitor } = leitura;
          if (!textos.length) {
            throw new ErroDeEntrada('Não encontrei nenhum QR Code nesta imagem. Recorte só o código, com um pouco de margem branca, ou tire outra foto de frente e com boa luz.', 'arquivo');
          }
          const saída = descreverCódigos(textos, { abrir: abrirComCuidado, leitor });
          // O montador desenha o resultado logo depois deste retorno; a caixa com o conteúdo entra em seguida.
          setTimeout(() => mostrarConteúdoLido(raiz, textos), 0);
          return saída;
        } finally {
          escolha.travar(false);
        }
      },

      aoMontar(elemento, recalcular) {
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        const resultado = elemento.querySelector('#resultado');
        escolha = prepararEscolhaDeArquivos(elemento, {
          aceitar: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif',
          rótuloDoBotão: 'Escolher imagem',
          rótuloParaTrocar: 'Trocar a imagem',
          rótuloDaFoto: 'Tirar foto',
          ícone: 'imagem',
          textoDoVazio: 'Nenhuma imagem escolhida ainda. Arraste uma imagem para este quadro, cole com Ctrl+V ou use os botões.',
          textoDeSolte: 'Solte a imagem para ler o QR Code.',
          async conferir(arquivo) {
            const bytes = new Uint8Array(await arquivo.arrayBuffer());
            const conferência = conferirImagem(bytes);
            if (!conferência.ok) return { ok: false, mensagem: conferência.mensagem };
            return {
              ok: true,
              detalhe: `${conferência.largura} × ${conferência.altura} px`,
              dados: { bytes, tipo: conferência.tipo, largura: conferência.largura, altura: conferência.altura },
            };
          },
          aoMudar(lista) {
            resultado.hidden = true;
            // Escolheu a imagem, lê: um toque a menos, e quem usa leitor de tela ouve o resultado.
            if (lista.length) recalcular();
          },
        });

        // Colar uma imagem (print) direto na página.
        document.addEventListener('paste', (evento) => {
          const imagens = [...(evento.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
          if (!imagens.length) return;
          evento.preventDefault();
          escolha.adicionar(imagens);
          avisar('Imagem colada.');
        });
      },
    });
  },
};
