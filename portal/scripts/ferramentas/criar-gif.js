/**
 * Criar GIF: monta um GIF animado a partir de várias imagens, tudo no navegador.
 *
 * As imagens são decodificadas e desenhadas no tamanho final aqui; a escolha das cores e a compressão (o trabalho pesado)
 * rodam num Web Worker, com barra de andamento e botão de cancelar. O codificador de GIF é próprio (`cálculos/criar-gif.js`).
 * Nenhuma imagem sai do aparelho.
 *
 * Vídeo: a política de segurança do portal não deixa a página tocar vídeo de arquivo local (`media-src` não inclui `blob:`),
 * então esta ferramenta só faz GIF de imagens.
 */
import { montarFerramenta, ErroDeEntrada, baixar, número as lerNúmero } from '../núcleo/montador.js';
import { prepararEscolhaDeArquivos, formatarBytes } from './auxiliares/escolher-arquivos-avançadas.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import {
  LIMITES, REPETIÇÕES, AJUSTES, FUNDOS, ErroDeGif, conferirImagemDoGif, planejarGif, retânguloDeDesenho, gerarGif, nomeDoGif,
} from '../cálculos/criar-gif.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const CANCELADO = 'A criação do GIF foi cancelada.';
const COR_DO_FUNDO = { branco: '#ffffff', preto: '#000000' };
const FALHA_DO_TRABALHADOR = 'Não foi possível converter as imagens em GIF neste navegador. Tente com menos imagens ou com uma largura menor.';

/** Abre a imagem já em pé (o navegador aplica a rotação EXIF) e a solta logo depois de desenhar. */
async function abrirImagem(arquivo) {
  try {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch {
      return await createImageBitmap(arquivo); // navegador antigo, que não conhece a opção
    }
  } catch {
    throw new ErroDeEntrada(`"${arquivo.name}": não foi possível abrir esta imagem. O arquivo parece corrompido ou o navegador não o reconhece. Tire-a da lista ou salve-a de novo como JPG ou PNG.`, 'arquivo');
  }
}

/** Desenha cada imagem no tamanho final e devolve os pixels RGBA de cada uma. */
async function prepararQuadros(itens, plano, aoProgredir, cancelado) {
  const tela = document.createElement('canvas');
  tela.width = plano.largura;
  tela.height = plano.altura;
  const contexto = tela.getContext('2d', { willReadFrequently: true });
  contexto.imageSmoothingQuality = 'high';
  const quadros = [];
  for (const [i, item] of itens.entries()) {
    if (cancelado()) throw new Error(CANCELADO);
    aoProgredir(undefined, `Preparando a imagem ${i + 1} de ${itens.length}…`);
    const bitmap = await abrirImagem(item.arquivo);
    try {
      contexto.clearRect(0, 0, plano.largura, plano.altura);
      if (plano.fundo !== 'transparente') {
        contexto.fillStyle = COR_DO_FUNDO[plano.fundo];
        contexto.fillRect(0, 0, plano.largura, plano.altura);
      }
      const r = retânguloDeDesenho({ largura: bitmap.width, altura: bitmap.height }, plano, plano.ajuste);
      contexto.drawImage(bitmap, r.x, r.y, r.largura, r.altura);
      quadros.push(contexto.getImageData(0, 0, plano.largura, plano.altura).data);
      aoProgredir(100 * (i + 1) / itens.length, `Imagens preparadas: ${i + 1} de ${itens.length}`);
    } finally {
      bitmap.close?.();
    }
  }
  return quadros;
}

/** Roda a conversão no Web Worker. Rejeita com `semTrabalhador` quando o navegador não consegue criá-lo. */
function converterNoTrabalhador(pedido, aoProgredir, cancelado) {
  return new Promise((resolver, rejeitar) => {
    let trabalhador;
    try {
      trabalhador = new Worker(new URL('./auxiliares/trabalhador-de-gif.js', import.meta.url), { type: 'module' });
    } catch {
      rejeitar(Object.assign(new Error(FALHA_DO_TRABALHADOR), { semTrabalhador: true }));
      return;
    }
    const vigia = setInterval(() => {
      if (!cancelado()) return;
      clearInterval(vigia);
      trabalhador.terminate();
      rejeitar(new Error(CANCELADO));
    }, 150);
    const acabar = () => { clearInterval(vigia); trabalhador.terminate(); };
    trabalhador.onmessage = ({ data }) => {
      if (data.tipo === 'progresso') { aoProgredir(data.fração, data.texto); return; }
      acabar();
      if (data.tipo === 'pronto') resolver(data);
      else rejeitar(new Error(data.mensagem || FALHA_DO_TRABALHADOR));
    };
    trabalhador.onerror = (evento) => {
      evento.preventDefault?.();
      acabar();
      rejeitar(Object.assign(new Error(FALHA_DO_TRABALHADOR), { semTrabalhador: true }));
    };
    trabalhador.postMessage({ ...pedido, quadros: pedido.quadros.map((q) => q.buffer) }, pedido.quadros.map((q) => q.buffer));
  });
}

export default {
  instruções: {
    passos: [
      `Escolha de ${LIMITES.quadrosMín} a ${LIMITES.quadrosMáx} imagens (toque em "Escolher imagens" ou arraste os arquivos para o quadro). Elas são lidas no seu navegador e não saem do aparelho.`,
      'Use as setas ao lado de cada imagem para pôr os quadros na ordem. A primeira imagem define a proporção do GIF.',
      'Escolha a largura do GIF (480 pixels é um bom começo), o tempo de cada quadro, quantas vezes ele se repete e como encaixar as imagens de outro formato.',
      'Toque em "Criar GIF", acompanhe o andamento e veja a prévia animada, com o peso do arquivo. Gostou? Toque em "Baixar GIF".',
    ],
    exemplo: {
      texto: '5 fotos de 1600 × 1200 pixels, com largura 480 e 500 ms por quadro, viram um GIF de 480 × 360 pixels com 5 quadros, 2,5 segundos de duração e algo entre 300 KB e 1,5 MB, '
        + 'conforme as fotos. Com "Ida e volta", o GIF passa a ter 8 quadros (1 2 3 4 5 4 3 2) e roda sem pular de volta ao início.',
    },
    limites: `De ${LIMITES.quadrosMín} a ${LIMITES.quadrosMáx} imagens JPG, PNG, WebP, GIF, BMP ou AVIF (de até 30 MB e 50 megapixels cada); GIF e AVIF animados entram só com o primeiro quadro. `
      + `Largura de ${LIMITES.larguraMín} a ${número(LIMITES.larguraMáx)} pixels; o total de pixels de todos os quadros vai até ${LIMITES.pixelsTotais / 1_000_000} milhões (por exemplo, 60 quadros de 632 × 632), e a ida e volta conta os quadros repetidos. `
      + `Tempo por quadro de ${LIMITES.atrasoMínMs} ms a ${número(LIMITES.atrasoMáxMs)} ms: o GIF guarda centésimos de segundo e os navegadores trocam tempos abaixo de 20 ms por 100 ms. `
      + 'O GIF tem no máximo 256 cores no arquivo todo (uma paleta só, montada com as cores de todos os quadros), então fotos perdem cor e ganham granulado; "Suavizar degradês" espalha o erro de cor e melhora a aparência, mas deixa o arquivo maior. '
      + 'GIF é um formato pesado: poucas dezenas de quadros de fotos passam fácil de 5 MB. A tela avisa quando o arquivo passa de 8 MB; para diminuir, reduza a largura, tire quadros ou desligue a suavização. '
      + 'Transparência: com o fundo "Transparente", áreas transparentes das imagens ficam vazadas (a transparência do GIF é de tudo ou nada, sem meios-tons). '
      + 'Não faz GIF a partir de vídeo: a política de segurança do portal não permite tocar vídeo de arquivo local na página. '
      + 'O codificador de GIF é do próprio portal, sem biblioteca; nada é enviado para fora.',
    perguntas: [
      { p: 'Minhas imagens são enviadas para algum servidor?', r: 'Não. Elas são abertas e convertidas dentro do seu navegador, e o GIF é criado no próprio aparelho.' },
      { p: 'Por que o GIF ficou tão pesado?', r: 'O GIF não comprime como o JPG: cada quadro é gravado inteiro, com no máximo 256 cores. Para diminuir, reduza a largura, use menos imagens ou desligue "Suavizar degradês".' },
      { p: 'Por que as cores ficaram diferentes das fotos?', r: 'O GIF só tem 256 cores no arquivo todo. O portal escolhe as 256 que melhor representam todas as imagens juntas; fotos com muitas cores perdem nuances. A suavização reduz o efeito de faixas.' },
      { p: 'Posso fazer um GIF de um vídeo?', r: 'Ainda não. Por segurança, o portal não toca vídeo de arquivo local na página. Você pode tirar prints do vídeo e montar o GIF com eles.' },
      { p: 'O que é "Ida e volta"?', r: 'O GIF toca os quadros até o último e volta até o primeiro, sem repetir as pontas. Fica suave como um "boomerang".' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    let figura;
    let endereçoDaPrévia = null;

    const soltarPrévia = () => {
      if (endereçoDaPrévia) { URL.revokeObjectURL(endereçoDaPrévia); endereçoDaPrévia = null; }
      figura?.replaceChildren();
      if (figura) figura.hidden = true;
    };

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Criar GIF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Imagens', tipo: 'file',
          dica: `De ${LIMITES.quadrosMín} a ${LIMITES.quadrosMáx} imagens JPG, PNG, WebP, GIF, BMP ou AVIF. Elas não saem do seu aparelho.`,
        },
        { nome: 'largura', rótulo: 'Largura do GIF (pixels)', tipo: 'número', padrão: '480', dica: `De ${LIMITES.larguraMín} a ${número(LIMITES.larguraMáx)}. A altura segue a primeira imagem.` },
        { nome: 'atraso', rótulo: 'Tempo de cada quadro (ms)', tipo: 'número', padrão: '500', dica: `De ${LIMITES.atrasoMínMs} a ${número(LIMITES.atrasoMáxMs)}. 1000 ms = 1 segundo.` },
        {
          nome: 'repetições', rótulo: 'Repetir', tipo: 'seleção', padrão: 'infinito',
          opções: Object.entries(REPETIÇÕES).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        {
          nome: 'ajuste', rótulo: 'Imagens de outro formato', tipo: 'seleção', padrão: 'caber',
          opções: Object.entries(AJUSTES).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        {
          nome: 'fundo', rótulo: 'Fundo', tipo: 'seleção', padrão: 'branco',
          opções: Object.entries(FUNDOS).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        { nome: 'idaEVolta', rótulo: 'Ida e volta (toca até o fim e volta)', tipo: 'caixa', padrão: false },
        { nome: 'suavizar', rótulo: 'Suavizar degradês (melhora fotos, deixa o arquivo maior)', tipo: 'caixa', padrão: true },
      ],

      async calcular(dados) {
        const itens = escolha.atuais();
        if (itens.length < LIMITES.quadrosMín) {
          throw new ErroDeEntrada(`Escolha pelo menos ${LIMITES.quadrosMín} imagens: um GIF com uma imagem só não anima.`, 'arquivo');
        }
        // As opções são conferidas antes de abrir qualquer imagem: erro de digitação não deve custar a leitura de dezenas de fotos.
        const largura = lerNúmero(dados, 'largura', { rótulo: 'Largura', inteiro: true });
        const atrasoMs = lerNúmero(dados, 'atraso', { rótulo: 'Tempo de cada quadro' });
        let plano;
        try {
          plano = planejarGif({
            quantidade: itens.length, primeira: itens[0].dados, largura, atrasoMs, repetições: dados.repetições,
            idaEVolta: dados.idaEVolta === 'sim', ajuste: dados.ajuste, fundo: dados.fundo,
          });
        } catch (erro) {
          if (erro instanceof ErroDeGif) throw new ErroDeEntrada(erro.message, erro.campo);
          throw erro;
        }

        soltarPrévia();
        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando as imagens…');
          let quadros = await prepararQuadros(itens, plano, (porcentagem, texto) => progresso.andar(porcentagem, texto), execução.cancelado);

          const pedido = {
            largura: plano.largura, altura: plano.altura, sequência: plano.sequência, atrasoCs: plano.atrasoCs,
            repetições: plano.repetições, transparência: plano.fundo === 'transparente', suavizar: dados.suavizar === 'sim',
          };
          const andar = (_fração, texto) => {
            // O codificador só expõe frações ponderadas entre etapas internas; sem contagem
            // verificável, mantém o andamento indeterminado. A conclusão vem com o retorno dos bytes.
            if (texto !== 'Pronto') progresso.andar(undefined, texto);
          };
          let feito;
          try {
            feito = await converterNoTrabalhador({ ...pedido, quadros }, andar, execução.cancelado);
          } catch (erro) {
            if (!erro.semTrabalhador) throw erro;
            // Sem Web Worker (navegador antigo ou bloqueado): converte na própria página, cedendo a vez entre as etapas.
            quadros = await prepararQuadros(itens, plano, (porcentagem, texto) => progresso.andar(porcentagem, texto), execução.cancelado);
            try {
              feito = await gerarGif({ ...pedido, quadros }, {
                aoProgredir: andar, cancelado: execução.cancelado, ceder: () => new Promise((resolver) => { setTimeout(resolver, 0); }),
              });
            } catch (erro2) {
              if (erro2 instanceof ErroDeGif && erro2.campo === 'cancelado') throw new Error(CANCELADO);
              throw erro2;
            }
          }
          quadros = null;

          const blob = new Blob([feito.bytes], { type: 'image/gif' });
          endereçoDaPrévia = URL.createObjectURL(blob);
          const prévia = document.createElement('img');
          prévia.src = endereçoDaPrévia;
          prévia.alt = `Prévia do GIF criado: ${plano.quadros} quadros, ${plano.largura} por ${plano.altura} pixels`;
          prévia.width = plano.largura;
          prévia.height = plano.altura;
          prévia.style.height = 'auto';
          prévia.style.display = 'block';
          prévia.style.margin = '0 auto';
          figura.replaceChildren(prévia);
          figura.hidden = false;

          const nome = nomeDoGif(itens[0].nome.replace(/\.[^.]*$/, ''));
          const segundos = (plano.duraçãoMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
          const observações = [];
          if (blob.size > LIMITES.bytesPesado) {
            observações.push(`O GIF pesa ${formatarBytes(blob.size)}: pesado para mensagem e e-mail. Para diminuir, reduza a largura, use menos imagens ou desligue "Suavizar degradês".`);
          }
          if (itens.some((i) => i.dados.tipo === 'gif')) observações.push('GIFs animados que você escolheu entraram só com o primeiro quadro.');
          if (feito.coresUsadas >= 256) observações.push('Foram usadas as 256 cores que o GIF comporta: fotos perdem nuances de cor.');
          if (plano.fundo === 'transparente' && !feito.transparente) observações.push('Nenhuma das imagens tem áreas transparentes: o GIF saiu opaco.');
          observações.push('O GIF foi criado no seu navegador; nenhuma imagem foi enviada.');
          return {
            valor: 'GIF pronto',
            resumo: `${número(plano.quadros)} quadros de ${plano.largura} × ${plano.altura} px · ${segundos} s · ${formatarBytes(blob.size)}.`,
            linhas: [
              ['Quadros', `${número(plano.quadros)}${plano.quadros !== itens.length ? ` (${itens.length} imagens, com ida e volta)` : ''}`],
              ['Tamanho', `${plano.largura} × ${plano.altura} px`],
              ['Duração de uma volta', `${segundos} s`],
              ['Repetição', REPETIÇÕES[String(plano.repetições)] ?? 'Para sempre'],
              ['Cores', número(feito.coresUsadas)],
              ['Peso do arquivo', formatarBytes(blob.size)],
            ],
            texto: '',
            arquivos: [{ rótulo: 'Baixar GIF', ícone: 'baixar', gerar: () => baixar(blob, nome, 'image/gif') }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        const resultado = elemento.querySelector('#resultado');
        figura = document.createElement('figure');
        figura.className = 'painel t-3';
        figura.hidden = true;
        figura.setAttribute('aria-label', 'Prévia do GIF');
        Object.assign(figura.style, { margin: '14px 0 0', padding: '8px' });
        resultado.before(figura);

        escolha = prepararEscolhaDeArquivos(elemento, {
          aceitar: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif',
          múltiplos: true,
          máximoDeArquivos: LIMITES.quadrosMáx,
          reordenar: true,
          rótuloDoBotão: 'Escolher imagens',
          rótuloParaTrocar: 'Adicionar mais imagens',
          ícone: 'imagem',
          textoDoVazio: 'Nenhuma imagem escolhida ainda. Arraste as imagens para este quadro ou use o botão "Escolher imagens".',
          textoDeSolte: 'Solte as imagens para montar o GIF.',
          async conferir(arquivo) {
            const bytes = new Uint8Array(await arquivo.arrayBuffer());
            const conferência = conferirImagemDoGif(bytes);
            if (!conferência.ok) return { ok: false, mensagem: conferência.mensagem };
            return {
              ok: true,
              detalhe: `${número(conferência.largura)} × ${número(conferência.altura)} px`,
              dados: { largura: conferência.largura, altura: conferência.altura, tipo: conferência.tipo },
            };
          },
          aoMudar() {
            resultado.hidden = true;
            soltarPrévia();
          },
        });
        execução = prepararExecução(elemento, { escolha });
        elemento.querySelector('#formulário').addEventListener('reset', soltarPrévia);
      },
    });
  },
};
