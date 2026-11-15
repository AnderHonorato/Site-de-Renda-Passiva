/**
 * Editor de fotos: girar, espelhar, cortar, redimensionar e ajustar as cores de uma foto, tudo no navegador.
 *
 * A foto nunca sai do aparelho e o arquivo original nunca é alterado: a edição acontece em canvas e o resultado é
 * um arquivo novo. A prévia usa uma cópia reduzida da foto (rápida de refazer a cada ajuste); o arquivo final é
 * desenhado direto da foto inteira, no tamanho pedido, e as cores são aplicadas em faixas para não segurar duas
 * cópias gigantes na memória.
 */
import { montarFerramenta, ErroDeEntrada, baixar, número as lerNúmero, avisar } from '../núcleo/montador.js';
import { criarProgresso, limparErros, mostrarErro, lerFormulário } from '../núcleo/interface.js';
import { ícone } from '../núcleo/ícones.js';
import { prepararEscolhaDeArquivos, formatarBytes } from './auxiliares/escolher-arquivos-avançadas.js';
import {
  LIMITES, FORMATOS_DE_SAÍDA, FILTROS, MODOS_DE_TAMANHO, PROPORÇÕES, ErroDeEdição,
  conferirFoto, matrizDeOrientação, margensDeProporção, margensDeRetângulo, girarMargens, espelharMargens, aplicarOperação,
  normalizarAjustes, ajustarPixels, coresNeutras, descreverAjustes, nomeDaSaída,
} from '../cálculos/editor-de-fotos.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const TIPOS_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif' };
const EXTENSÃO_DO_TIPO = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' };
/** Lado maior da cópia usada na prévia. */
const LADO_DA_PRÉVIA = 2800; // até 7,84 MP; exportação continua usando o original inteiro.
/** Quantos pixels as cores processam por vez no arquivo final (4 bytes cada). */
const PIXELS_POR_FAIXA = 1_000_000;
const PASSOS_NO_HISTÓRICO = 60;
const SEM_MEMÓRIA = 'O navegador não conseguiu gerar uma imagem deste tamanho (falta de memória). Diminua o tamanho final e tente de novo.';

const CAMPOS_DE_MARGEM = [['esquerda', 'margemEsquerda'], ['topo', 'margemTopo'], ['direita', 'margemDireita'], ['base', 'margemBase']];
const CAMPOS_GUARDADOS = [
  'proporção', 'margemEsquerda', 'margemTopo', 'margemDireita', 'margemBase', 'brilho', 'contraste', 'saturação', 'temperatura',
  'filtro', 'redimensionar', 'larguraPx', 'alturaPx', 'porcentagem', 'formato', 'qualidade',
];
/** Valor de cada campo guardado quando a foto é trocada ou os ajustes são restaurados. */
const PADRÃO_DOS_CAMPOS = {
  proporção: 'livre', margemEsquerda: '0', margemTopo: '0', margemDireita: '0', margemBase: '0', brilho: '0', contraste: '0', saturação: '0',
  temperatura: '0', filtro: 'nenhum', redimensionar: 'original', larguraPx: '', alturaPx: '', porcentagem: '100', formato: 'jpg', qualidade: '90',
};
const CONTROLES_DE_FAIXA = { brilho: 'Brilho', contraste: 'Contraste', saturação: 'Saturação', temperatura: 'Temperatura' };

const formatarPorcentagem = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ abrir a foto */

function criarTela(largura, altura) {
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  return tela;
}

/**
 * Decodifica a foto já "em pé". O navegador aplica a rotação EXIF sozinho; se não aplicar (as dimensões do bitmap
 * continuam as gravadas), a rotação é feita aqui com a matriz da orientação.
 */
async function abrirFoto(bytes, conferência) {
  const blob = new Blob([bytes], { type: TIPOS_MIME[conferência.tipo] });
  let bitmap;
  try {
    try {
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(blob); // navegador antigo, que não conhece a opção
    }
  } catch {
    throw new Error('Não foi possível abrir esta foto: o arquivo parece corrompido ou o navegador não o reconhece. Tente salvar de novo como JPG ou PNG.');
  }
  if (bitmap.width * bitmap.height > LIMITES.megapixels * 1_000_000) {
    bitmap.close();
    throw new Error(`A foto tem mais de ${LIMITES.megapixels} megapixels, o limite para o navegador não travar. Reduza a foto antes e tente de novo.`);
  }
  const { brutas, orientação } = conferência;
  const semGiro = orientação > 1 && bitmap.width === brutas.largura && bitmap.height === brutas.altura;
  if (!semGiro) return bitmap;
  const tela = criarTela(conferência.largura, conferência.altura);
  const contexto = tela.getContext('2d');
  contexto.setTransform(...matrizDeOrientação(orientação, brutas.largura, brutas.altura));
  contexto.drawImage(bitmap, 0, 0);
  bitmap.close();
  return createImageBitmap(tela);
}

/** Cópia reduzida da foto para a prévia. */
function criarPrévia(bitmap) {
  const fator = Math.min(1, LADO_DA_PRÉVIA / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * fator));
  const altura = Math.max(1, Math.round(bitmap.height * fator));
  const tela = criarTela(largura, altura);
  const contexto = tela.getContext('2d', { willReadFrequently: true });
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  return tela;
}

/* ------------------------------------------------------------------ arquivo final */

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

/**
 * Desenha a foto final e a grava no formato pedido.
 * @param {ImageBitmap} bitmap
 * @param {ReturnType<typeof normalizarAjustes>} a
 * @param {(porcentagem: number | undefined, texto: string) => void} aoProgredir
 * @returns {Promise<Blob>}
 */
async function gerarArquivo(bitmap, a, aoProgredir, camadas = []) {
  const { saída } = a;
  const formato = FORMATOS_DE_SAÍDA[a.formato];
  const tela = criarTela(saída.largura, saída.altura);
  const contexto = tela.getContext('2d', { willReadFrequently: !coresNeutras(a) });
  if (!contexto) throw new ErroDeEntrada(SEM_MEMÓRIA, 'redimensionar');
  try {
    // JPG não tem transparência: o que for transparente (PNG recortado) viraria preto sem este fundo.
    if (a.formato === 'jpg') {
      contexto.fillStyle = '#fff';
      contexto.fillRect(0, 0, saída.largura, saída.altura);
    }
    aoProgredir(undefined, 'Desenhando a foto…');
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = 'high';
    contexto.setTransform(...a.matriz);
    contexto.drawImage(bitmap, 0, 0);
    contexto.setTransform(1, 0, 0, 1, 0, 0);

    if (!coresNeutras(a)) {
      const linhasPorFaixa = Math.max(1, Math.floor(PIXELS_POR_FAIXA / saída.largura));
      for (let y = 0; y < saída.altura; y += linhasPorFaixa) {
        const altura = Math.min(linhasPorFaixa, saída.altura - y);
        const imagem = contexto.getImageData(0, y, saída.largura, altura);
        ajustarPixels(imagem.data, a);
        contexto.putImageData(imagem, 0, y);
        aoProgredir(100 * (y + altura) / saída.altura, `Aplicando as cores: ${y + altura} de ${saída.altura} linhas…`);
        await esperar();
      }
    }

    // Camadas são posicionadas sobre a área final, em proporções do quadro para
    // manter a posição ao trocar o tamanho de exportação.
    desenharCamadas(contexto, camadas, saída.largura, saída.altura);

    aoProgredir(undefined, 'Gravando o arquivo…');
    const blob = await new Promise((resolver) => {
      tela.toBlob(resolver, formato.tipo, formato.comQualidade ? a.qualidade / 100 : undefined);
    });
    if (!blob) throw new ErroDeEntrada(SEM_MEMÓRIA, 'redimensionar');
    return blob;
  } finally {
    // Solta a memória do canvas grande já.
    tela.width = 1;
    tela.height = 1;
  }
}

function desenharCamadas(contexto, camadas, largura, altura) {
  for (const camada of camadas) {
    if (camada.visível === false) continue;
    const x = camada.x * largura, y = camada.y * altura;
    const w = camada.largura * largura, h = camada.altura * altura;
    contexto.save();
    contexto.globalAlpha = camada.opacidade ?? 1;
    if (camada.tipo === 'texto' || camada.tipo === 'marca') {
      contexto.fillStyle = camada.cor;
      contexto.font = `700 ${Math.max(10, h)}px ${camada.fonte || 'sans-serif'}`;
      contexto.textAlign = 'center'; contexto.textBaseline = 'middle';
      contexto.shadowColor = 'rgba(0,0,0,.35)'; contexto.shadowBlur = Math.max(1, h * .08);
      contexto.fillText(camada.texto, x + w / 2, y + h / 2, w);
    } else if (camada.tipo === 'retângulo' || camada.tipo === 'círculo') {
      contexto.fillStyle = camada.cor;
      if (camada.tipo === 'círculo') { contexto.beginPath(); contexto.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); contexto.fill(); }
      else contexto.fillRect(x, y, w, h);
    } else if (camada.bitmap) contexto.drawImage(camada.bitmap, x, y, w, h);
    contexto.restore();
  }
}

/* ------------------------------------------------------------------ página */

export default {
  instruções: {
    passos: [
      'Toque em "Escolher foto" (ou arraste o arquivo para o quadro, ou cole uma imagem com Ctrl+V). A foto é aberta no seu navegador e não sai do aparelho.',
      'Gire ou espelhe com os botões, corte escolhendo uma proporção pronta, arrastando sobre a foto em "Desenhar o corte" ou digitando as margens, e ajuste brilho, contraste, saturação e temperatura nos controles. A prévia mostra o resultado na hora.',
      'Se quiser, mude o tamanho final (largura, altura ou porcentagem) e escolha o formato: JPG e WebP têm qualidade ajustável; PNG não perde nada.',
      'Toque em "Gerar foto editada" e depois em "Baixar". Para voltar atrás, use "Desfazer" ou "Restaurar tudo". A foto original no seu aparelho não é alterada.',
    ],
    exemplo: {
      texto: 'Uma foto de celular de 3000 × 2000 pixels, cortada em 16:9, vira 3000 × 1688. Redimensionada para largura 1280 (a altura acompanha), sai com 1280 × 720 pixels, '
        + 'pronta para um post ou um slide. Com brilho +10 e saturação +20, os tons ficam um pouco mais claros e vivos; em JPG com qualidade 85, o arquivo costuma ficar bem menor que o original.',
    },
    limites: `Fotos JPG, PNG, WebP, GIF, BMP ou AVIF de até ${LIMITES.bytes / 1024 / 1024} MB e ${LIMITES.megapixels} megapixels; o tamanho final também vai até ${LIMITES.megapixelsDaSaída} megapixels e ${número(LIMITES.ladoMáximo)} pixels de lado. A prévia é reduzida para no máximo 7,84 megapixels quando necessário; a exportação usa a resolução original. `
      + 'O tipo é conferido pelo conteúdo do arquivo, não pela extensão. HEIC (iPhone) não abre: salve como JPG antes. GIF animado e AVIF animado entram só com o primeiro quadro. '
      + 'A ordem das operações é fixa: girar, espelhar, cortar, redimensionar e, por fim, as cores. A rotação gravada pela câmera (EXIF) é respeitada, então a foto abre em pé. '
      + 'A foto gerada não leva os metadados da original (data, localização, modelo da câmera): é um arquivo novo. JPG não guarda transparência, e as áreas transparentes saem brancas; use PNG ou WebP para mantê-las. '
      + 'Se o navegador não gravar WebP, o arquivo sai em PNG e a tela avisa. Aumentar a foto além do tamanho original não cria detalhe: ela só fica maior e mais borrada. '
      + 'Não há nitidez, remoção de olhos vermelhos nem retoque. A edição usa o canvas do navegador; em celulares com pouca memória, fotos muito grandes podem falhar, e a tela diz o que fazer.',
    perguntas: [
      { p: 'Minha foto é enviada para algum servidor?', r: 'Não. A foto é aberta e editada dentro do seu navegador, e o arquivo gerado é criado no próprio aparelho. Nada é enviado.' },
      { p: 'A foto original é alterada?', r: 'Não. O arquivo original continua como estava. A ferramenta gera um arquivo novo, com o nome terminado em "-editada".' },
      { p: 'Por que a foto sai menor em bytes que a original?', r: 'Porque a foto é regravada: no JPG e no WebP, a qualidade escolhida define o tamanho, e os metadados (como a localização) são descartados. Para o menor arquivo, diminua a qualidade ou o tamanho.' },
      { p: 'Que qualidade devo escolher?', r: 'Entre 80 e 90 costuma ser indistinguível do original a olho nu e bem menor. Abaixo de 60, começam a aparecer quadrados e bordas sujas. O PNG ignora a qualidade e não perde nada, mas gera arquivos grandes para fotos.' },
      { p: 'O corte muda de lugar quando eu giro a foto?', r: 'Não: o corte gira junto com a imagem. As margens são sempre contadas sobre a foto como ela aparece na tela.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    /** Preenchido em `aoMontar`: `calcular` roda depois da montagem e usa a mesma leitura da prévia. */
    let lerAjustesDaTela;
    /** Foto aberta: { nome, bitmap, prévia, largura, altura, orientação }. */
    let foto = null;
    const bitmapsAbertos = new Set();
    /** O que se vê: giro e espelho. */
    let visão = { giro: 0, espelharH: false, espelharV: false };
    let histórico = [];
    let posição = -1;
    let comparar = false;
    let desenhandoCorte = false;
    let camadas = [];
    let camadaSelecionada = null;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar foto editada',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Foto', tipo: 'file',
          dica: `JPG, PNG, WebP, GIF, BMP ou AVIF, de até ${LIMITES.bytes / 1024 / 1024} MB. Ela não sai do seu aparelho.`,
        },
        {
          nome: 'proporção', rótulo: 'Proporção do corte', tipo: 'seleção', padrão: 'livre',
          opções: Object.entries(PROPORÇÕES).map(([valor, p]) => ({ valor, rótulo: p.rótulo })),
        },
        { nome: 'margemEsquerda', rótulo: 'Margem da esquerda (%)', tipo: 'número', padrão: '0' },
        { nome: 'margemTopo', rótulo: 'Margem de cima (%)', tipo: 'número', padrão: '0' },
        { nome: 'margemDireita', rótulo: 'Margem da direita (%)', tipo: 'número', padrão: '0' },
        { nome: 'margemBase', rótulo: 'Margem de baixo (%)', tipo: 'número', padrão: '0' },
        { nome: 'brilho', rótulo: 'Brilho', tipo: 'range', padrão: '0' },
        { nome: 'contraste', rótulo: 'Contraste', tipo: 'range', padrão: '0' },
        { nome: 'saturação', rótulo: 'Saturação', tipo: 'range', padrão: '0' },
        { nome: 'temperatura', rótulo: 'Temperatura', tipo: 'range', padrão: '0', dica: 'Negativo esfria (mais azul); positivo esquenta (mais amarelo).' },
        {
          nome: 'filtro', rótulo: 'Filtro', tipo: 'seleção', padrão: 'nenhum',
          opções: Object.entries(FILTROS).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        {
          nome: 'redimensionar', rótulo: 'Tamanho final', tipo: 'seleção', padrão: 'original',
          opções: Object.entries(MODOS_DE_TAMANHO).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        { nome: 'larguraPx', rótulo: 'Largura (pixels)', tipo: 'número', exemplo: '1280' },
        { nome: 'alturaPx', rótulo: 'Altura (pixels)', tipo: 'número', exemplo: '720' },
        { nome: 'porcentagem', rótulo: 'Porcentagem do tamanho (%)', tipo: 'número', padrão: '100', dica: `De ${LIMITES.porcentagemMín} a ${LIMITES.porcentagemMáx}.` },
        {
          nome: 'formato', rótulo: 'Formato do arquivo', tipo: 'seleção', padrão: 'jpg',
          opções: Object.entries(FORMATOS_DE_SAÍDA).map(([valor, f]) => ({ valor, rótulo: f.rótulo })),
        },
        { nome: 'qualidade', rótulo: 'Qualidade', tipo: 'range', padrão: '90', dica: 'Quanto maior, melhor a imagem e maior o arquivo. 80 a 90 serve para quase tudo.' },
      ],

      async calcular(dados) {
        if (!foto) throw new ErroDeEntrada('Escolha uma foto primeiro.', 'arquivo');
        const ajustes = lerAjustesDaTela(dados);
        const nome = nomeDaSaída(foto.nome, ajustes.formato);
        const blob = await gerarArquivo(foto.bitmap, ajustes, (p, texto) => progresso.andar(p, texto), camadas);
        const esperado = FORMATOS_DE_SAÍDA[ajustes.formato];
        const gravado = EXTENSÃO_DO_TIPO[blob.type] ?? esperado.nome;
        const nomeFinal = nome.replace(/\.[^.]+$/, `.${gravado.toLowerCase()}`);
        const observações = [];
        if (blob.type !== esperado.tipo) {
          observações.push(`Seu navegador não grava ${esperado.nome}; a foto foi gravada em ${gravado}.`);
        }
        const feito = descreverAjustes(ajustes);
        observações.push(feito.length ? `Foto ${feito.join(', ')}.` : 'Nenhum ajuste foi feito: a foto foi só regravada.');
        observações.push('A foto original não foi alterada. A nova não leva os metadados da original (data, localização, câmera). Nada saiu do seu aparelho.');
        return {
          valor: 'Foto pronta',
          resumo: `${foto.nome}: ${número(ajustes.saída.largura)} × ${número(ajustes.saída.altura)} px · ${formatarBytes(blob.size)} · ${gravado}.`,
          linhas: [
            ['Foto original', `${número(foto.largura)} × ${número(foto.altura)} px · ${formatarBytes(foto.tamanho)}`],
            ['Foto final', `${número(ajustes.saída.largura)} × ${número(ajustes.saída.altura)} px (${(ajustes.saída.largura * ajustes.saída.altura / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MP)`],
            ['Arquivo', `${formatarBytes(blob.size)} em ${gravado}`],
          ],
          texto: '',
          arquivos: [{ rótulo: `Baixar ${gravado}`, ícone: 'baixar', gerar: () => baixar(blob, nomeFinal, blob.type) }],
          observações,
        };
      },

      aoMontar(elemento, recalcular) {
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        const formulário = elemento.querySelector('#formulário');
        const resultado = elemento.querySelector('#resultado');
        const campo = (nome) => elemento.querySelector(`#campo-${CSS.escape(nome)}`);
        const grupoDe = (nome) => campo(nome).closest('.campo');

        escolha = prepararEscolhaDeArquivos(elemento, {
          aceitar: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif',
          rótuloDoBotão: 'Escolher foto',
          rótuloParaTrocar: 'Trocar a foto',
          rótuloDaFoto: 'Tirar foto',
          ícone: 'imagem',
          textoDoVazio: 'Nenhuma foto escolhida ainda. Arraste uma foto para este quadro, cole com Ctrl+V ou use os botões.',
          textoDeSolte: 'Solte a foto para editar.',
          async conferir(arquivo) {
            const bytes = new Uint8Array(await arquivo.arrayBuffer());
            const conferência = conferirFoto(bytes);
            if (!conferência.ok) return { ok: false, mensagem: conferência.mensagem };
            let bitmap;
            try {
              bitmap = await abrirFoto(bytes, conferência);
            } catch (erro) {
              return { ok: false, mensagem: erro.message };
            }
            bitmapsAbertos.add(bitmap);
            return {
              ok: true,
              detalhe: `${número(bitmap.width)} × ${número(bitmap.height)} px`,
              dados: { bitmap, orientação: conferência.orientação, tipo: conferência.tipo },
            };
          },
          aoMudar(lista) {
            resultado.hidden = true;
            const atual = lista[0];
            for (const bitmap of [...bitmapsAbertos]) {
              if (bitmap !== atual?.dados.bitmap) { bitmap.close?.(); bitmapsAbertos.delete(bitmap); }
            }
            if (!atual) { foto = null; mostrarEdição(false); return; }
            const { bitmap } = atual.dados;
            foto = {
              nome: atual.nome, tamanho: atual.tamanho, bitmap, prévia: criarPrévia(bitmap), largura: bitmap.width, altura: bitmap.height,
            };
            reiniciar();
            mostrarEdição(true);
            desenharPrévia({ mostrarErros: true });
          },
        });

        // Colar uma imagem (print) direto na página.
        document.addEventListener('paste', (evento) => {
          const imagens = [...(evento.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
          if (!imagens.length) return;
          evento.preventDefault();
          escolha.adicionar(imagens.slice(0, 1));
          avisar('Imagem colada.');
        });

        /* ---------------------------------------------- montar os grupos de controles */

        for (const [nome, rótulo] of Object.entries(CONTROLES_DE_FAIXA)) {
          const entrada = campo(nome);
          Object.assign(entrada, { min: '-100', max: '100', step: '1' });
          entrada.closest('.campo').querySelector('label').dataset.rótuloBase = rótulo;
        }
        Object.assign(campo('qualidade'), { min: String(LIMITES.qualidadeMín), max: String(LIMITES.qualidadeMáx), step: '1' });
        campo('qualidade').closest('.campo').querySelector('label').dataset.rótuloBase = 'Qualidade';

        const grupos = {};
        const novoGrupo = (id, título, antes) => {
          const grupo = document.createElement('div');
          grupo.setAttribute('role', 'group');
          grupo.setAttribute('aria-labelledby', `grupo-${id}`);
          grupo.className = 'b-3';
          grupo.hidden = true;
          grupo.innerHTML = `<p class="rótulo b-1" id="grupo-${id}">${título}</p>`;
          const caixa = document.createElement('div');
          caixa.className = 'campos campos--2';
          grupo.append(caixa);
          grupos[id] = { grupo, caixa };
          antes.before(grupo);
          return caixa;
        };
        const camposOriginais = elemento.querySelector('.campos');
        const prévia = document.createElement('div');
        prévia.className = 'b-3';
        prévia.hidden = true;
        prévia.innerHTML = `
          <div class="ações b-2" data-barra>
            <button class="botão botão--linha" type="button" data-ação="desfazer" disabled>Desfazer</button>
            <button class="botão botão--linha" type="button" data-ação="refazer" disabled>Refazer</button>
            <button class="botão botão--linha" type="button" data-ação="restaurar">${ícone('atualizar')}Restaurar tudo</button>
          </div>
          <div class="campo campo--linha b-2"><input type="checkbox" id="campo-original"><label for="campo-original">Mostrar a foto original (sem ajustes)</label></div>
          <canvas data-prévia role="img" aria-label="Prévia da foto"></canvas>
          <section class="editor-imagem__camadas" aria-labelledby="editor-camadas-título">
            <h3 id="editor-camadas-título">Texto, formas e marca d’água</h3>
            <div class="editor-imagem__linha"><label for="editor-texto">Texto</label><input id="editor-texto" maxlength="120" placeholder="Seu texto"></div>
            <div class="editor-imagem__linha"><label for="editor-cor">Cor</label><input id="editor-cor" type="color" value="#fff2df"></div>
            <div class="editor-imagem__linha"><label for="editor-forma">Forma</label><select id="editor-forma"><option value="retângulo">Retângulo</option><option value="círculo">Elipse</option></select></div>
            <div class="editor-imagem__ações">
              <button class="botão botão--linha" type="button" data-camada="texto">Adicionar texto</button>
              <button class="botão botão--linha" type="button" data-camada="forma">Adicionar forma</button>
              <button class="botão botão--linha" type="button" data-camada="marca">Marca d’água</button>
              <label class="botão botão--linha editor-imagem__arquivo">Adicionar imagem<input data-camada-imagem type="file" accept="image/png,image/jpeg,image/webp"></label>
            </div>
            <div class="editor-imagem__lista" data-lista-camadas aria-label="Camadas da edição"></div>
            <p class="campo__dica">Arraste a camada no quadro para posicionar. O conteúdo é aplicado ao arquivo exportado.</p>
          </section>
          <div class="editor-imagem__zoom"><label for="editor-zoom">Zoom da prévia</label><input id="editor-zoom" type="range" min="50" max="200" value="100"><output data-zoom>100%</output></div>
          <p class="pequeno suave t-1" role="status" data-informação></p>`;
        camposOriginais.before(prévia);
        const tela = prévia.querySelector('canvas');
        const quadroVisual = document.createElement('div'); quadroVisual.className = 'editor-imagem__quadro'; quadroVisual.dataset.préviaQuadro = 'sim';
        tela.before(quadroVisual); quadroVisual.append(tela);
        Object.assign(tela.style, { maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '8px', background: 'var(--superfície-2)' });
        const informação = prévia.querySelector('[data-informação]');
        const corDeSeleção = getComputedStyle(document.documentElement).getPropertyValue('--marca').trim() || '#a8472a';
        const listaCamadas = prévia.querySelector('[data-lista-camadas]');
        const atualizarListaCamadas = () => {
          listaCamadas.replaceChildren();
          camadas.forEach((camada, i) => {
            const linha = document.createElement('div'); linha.className = 'editor-imagem__camada';
            const nome = document.createElement('button'); nome.type = 'button'; nome.className = 'botão botão--texto';
            nome.textContent = camada.tipo === 'imagem' ? `Imagem ${i + 1}` : camada.tipo === 'marca' ? 'Marca d’água' : camada.tipo === 'texto' ? camada.texto : camada.tipo;
            nome.setAttribute('aria-pressed', String(camada.id === camadaSelecionada)); nome.addEventListener('click', () => { camadaSelecionada = camada.id; atualizarListaCamadas(); });
            const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'botão botão--texto'; remover.textContent = 'Remover'; remover.setAttribute('aria-label', `Remover camada ${nome.textContent}`);
            remover.addEventListener('click', () => { camadas = camadas.filter((c) => c !== camada); camadaSelecionada = camadas.at(-1)?.id ?? null; confirmar(); atualizarListaCamadas(); agendarPrévia(); });
            linha.append(nome, remover); listaCamadas.append(linha);
          });
        };

        const girar = novoGrupo('girar', 'Girar e espelhar', camposOriginais);
        girar.className = 'ações';
        girar.innerHTML = `
          <button class="botão botão--linha" type="button" data-operação="girar-anti">Girar à esquerda</button>
          <button class="botão botão--linha" type="button" data-operação="girar-horário">Girar à direita</button>
          <button class="botão botão--linha" type="button" data-operação="espelhar-h">Espelhar na horizontal</button>
          <button class="botão botão--linha" type="button" data-operação="espelhar-v">Espelhar na vertical</button>`;
        const corte = novoGrupo('corte', 'Cortar', camposOriginais);
        corte.append(grupoDe('proporção'), grupoDe('margemEsquerda'), grupoDe('margemTopo'), grupoDe('margemDireita'), grupoDe('margemBase'));
        const botãoCorte = document.createElement('button');
        botãoCorte.type = 'button';
        botãoCorte.className = 'botão botão--linha t-2';
        botãoCorte.setAttribute('aria-pressed', 'false');
        botãoCorte.textContent = 'Desenhar o corte sobre a foto';
        grupos.corte.grupo.append(botãoCorte);
        const dicaDoCorte = document.createElement('p');
        dicaDoCorte.className = 'campo__dica t-1';
        dicaDoCorte.textContent = 'Arraste sobre a foto para escolher a área que fica. Se preferir, digite as margens: elas contam a partir de cada borda da foto, em porcentagem.';
        grupos.corte.grupo.append(dicaDoCorte);
        const cores = novoGrupo('cores', 'Cores', camposOriginais);
        cores.append(grupoDe('brilho'), grupoDe('contraste'), grupoDe('saturação'), grupoDe('temperatura'), grupoDe('filtro'));
        const tamanho = novoGrupo('tamanho', 'Tamanho', camposOriginais);
        tamanho.append(grupoDe('redimensionar'), grupoDe('larguraPx'), grupoDe('alturaPx'), grupoDe('porcentagem'));
        const saída = novoGrupo('saída', 'Arquivo', camposOriginais);
        saída.append(grupoDe('formato'), grupoDe('qualidade'));
        camposOriginais.remove();
        const todosOsGrupos = Object.values(grupos).map((g) => g.grupo);

        function mostrarEdição(visível) {
          prévia.hidden = !visível;
          for (const g of todosOsGrupos) g.hidden = !visível;
          if (!visível) { desenhandoCorte = false; marcarCorte(); }
        }
        mostrarEdição(false);

        /* ---------------------------------------------- leitura dos campos */

        function lerAjustes(dados = lerFormulário(formulário)) {
          const num = (nome, rótulo, opções = {}) => lerNúmero(dados, nome, { rótulo, ...opções });
          const margem = (nome, rótulo) => num(nome, rótulo, { obrigatório: false, padrão: 0 });
          const modo = dados.redimensionar;
          const tamanhoFinal = { modo, largura: null, altura: null, porcentagem: 100 };
          if (modo === 'largura' || modo === 'exato') tamanhoFinal.largura = num('larguraPx', 'Largura');
          if (modo === 'altura' || modo === 'exato') tamanhoFinal.altura = num('alturaPx', 'Altura');
          if (modo === 'porcentagem') tamanhoFinal.porcentagem = num('porcentagem', 'Porcentagem');
          const entrada = {
            ...visão,
            recorte: {
              esquerda: margem('margemEsquerda', 'Margem da esquerda'), topo: margem('margemTopo', 'Margem de cima'),
              direita: margem('margemDireita', 'Margem da direita'), base: margem('margemBase', 'Margem de baixo'),
            },
            brilho: num('brilho', 'Brilho'), contraste: num('contraste', 'Contraste'), saturação: num('saturação', 'Saturação'),
            temperatura: num('temperatura', 'Temperatura'), filtro: dados.filtro, tamanho: tamanhoFinal,
            formato: dados.formato, qualidade: num('qualidade', 'Qualidade'),
          };
          try {
            return normalizarAjustes(entrada, { largura: foto.largura, altura: foto.altura });
          } catch (erro) {
            if (erro instanceof ErroDeEdição) throw new ErroDeEntrada(erro.message, erro.campo);
            throw erro;
          }
        }
        // `calcular` (acima) usa a mesma leitura.
        lerAjustesDaTela = lerAjustes;

        const lerMargens = () => {
          const dados = lerFormulário(formulário);
          const ler = (nome) => lerNúmero(dados, nome, { rótulo: 'Margem', obrigatório: false, padrão: 0, mín: 0, máx: LIMITES.margemMáxima });
          return { esquerda: ler('margemEsquerda'), topo: ler('margemTopo'), direita: ler('margemDireita'), base: ler('margemBase') };
        };
        const definirMargens = (m) => {
          for (const [lado, nome] of CAMPOS_DE_MARGEM) campo(nome).value = formatarPorcentagem(m[lado]);
        };

        /* ---------------------------------------------- prévia */

        let cache = { geometria: '', girada: null, cores: '', colorida: null };
        let quadroDaPrévia = { largura: 1, altura: 1 };
        let corteDaPrévia = { x: 0, y: 0, largura: 1, altura: 1 };
        let pendente = 0;

        function atualizarRótulos() {
          for (const nome of [...Object.keys(CONTROLES_DE_FAIXA), 'qualidade']) {
            const rótulo = campo(nome).closest('.campo').querySelector('label');
            rótulo.textContent = `${rótulo.dataset.rótuloBase}: ${campo(nome).value}`;
          }
        }
        function atualizarVisibilidade() {
          const modo = campo('redimensionar').value;
          grupoDe('larguraPx').hidden = modo !== 'largura' && modo !== 'exato';
          grupoDe('alturaPx').hidden = modo !== 'altura' && modo !== 'exato';
          grupoDe('porcentagem').hidden = modo !== 'porcentagem';
          grupoDe('qualidade').hidden = !FORMATOS_DE_SAÍDA[campo('formato').value].comQualidade;
        }

        function desenharPrévia({ mostrarErros = false } = {}) {
          if (!foto) return;
          let a;
          try {
            a = lerAjustes();
            limparErros(elemento.querySelector('#formulário'));
          } catch (erro) {
            if (!(erro instanceof ErroDeEntrada)) throw erro;
            if (mostrarErros) {
              const alvo = erro.campo && formulário.querySelector(`[data-campo="${CSS.escape(erro.campo)}"]`);
              limparErros(formulário);
              if (alvo) mostrarErro(alvo, erro.message); else avisar(erro.message);
            }
            return;
          }
          const contexto = tela.getContext('2d');
          const { prévia: base } = foto;
          if (comparar) {
            tela.width = base.width;
            tela.height = base.height;
            contexto.drawImage(base, 0, 0);
            informação.textContent = 'Mostrando a foto original, sem nenhum ajuste.';
            tela.setAttribute('aria-label', 'Prévia da foto original, sem ajustes');
            return;
          }
          // O quadro inteiro girado (sem o corte) na escala da prévia; o corte entra como moldura por cima.
          const semCorte = normalizarAjustes({ ...a, recorte: { esquerda: 0, topo: 0, direita: 0, base: 0 }, tamanho: { modo: 'original' } }, { largura: base.width, altura: base.height });
          const comCorte = normalizarAjustes({ ...a, tamanho: { modo: 'original' } }, { largura: base.width, altura: base.height });
          quadroDaPrévia = semCorte.trabalho;
          corteDaPrévia = comCorte.corte;

          const geometria = `${base.width}|${visão.giro}|${visão.espelharH}|${visão.espelharV}`;
          if (cache.geometria !== geometria) {
            const girada = criarTela(semCorte.trabalho.largura, semCorte.trabalho.altura);
            const c = girada.getContext('2d', { willReadFrequently: true });
            c.imageSmoothingQuality = 'high';
            c.setTransform(...semCorte.matriz);
            c.drawImage(base, 0, 0);
            cache = { geometria, girada, cores: '', colorida: null };
          }
          const chaveDeCores = [a.brilho, a.contraste, a.saturação, a.temperatura, a.filtro].join('|');
          if (cache.cores !== chaveDeCores || !cache.colorida) {
            const { girada } = cache;
            const colorida = criarTela(girada.width, girada.height);
            const c = colorida.getContext('2d', { willReadFrequently: true });
            c.drawImage(girada, 0, 0);
            if (!coresNeutras(a)) {
              const imagem = c.getImageData(0, 0, colorida.width, colorida.height);
              ajustarPixels(imagem.data, a);
              c.putImageData(imagem, 0, 0);
            }
            cache.colorida = colorida;
            cache.cores = chaveDeCores;
          }
          const { colorida } = cache;
          tela.width = colorida.width;
          tela.height = colorida.height;
          contexto.drawImage(colorida, 0, 0);
          const { x, y, largura, altura } = comCorte.corte;
          if (largura < tela.width || altura < tela.height) {
            contexto.fillStyle = 'rgba(0, 0, 0, 0.55)';
            contexto.fillRect(0, 0, tela.width, y);
            contexto.fillRect(0, y + altura, tela.width, tela.height - y - altura);
            contexto.fillRect(0, y, x, altura);
            contexto.fillRect(x + largura, y, tela.width - x - largura, altura);
            contexto.lineWidth = Math.max(2, tela.width / 400);
            contexto.strokeStyle = '#fff';
            contexto.strokeRect(x, y, largura, altura);
          }
          contexto.save(); contexto.beginPath(); contexto.rect(x, y, largura, altura); contexto.clip(); contexto.translate(x, y);
          desenharCamadas(contexto, camadas, largura, altura);
          if (camadaSelecionada) {
            const selecionada = camadas.find((c) => c.id === camadaSelecionada);
            if (selecionada) { contexto.strokeStyle = corDeSeleção; contexto.lineWidth = Math.max(2, largura / 500); contexto.setLineDash([8, 5]); contexto.strokeRect(selecionada.x * largura, selecionada.y * altura, selecionada.largura * largura, selecionada.altura * altura); }
          }
          contexto.restore();
          const mp = (a.saída.largura * a.saída.altura) / 1_000_000;
          const reduzida = foto.largura > LADO_DA_PRÉVIA || foto.altura > LADO_DA_PRÉVIA;
          informação.textContent = `Original: ${número(foto.largura)} × ${número(foto.altura)} px. Resultado: ${número(a.saída.largura)} × ${número(a.saída.altura)} px (${mp.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MP).${reduzida ? ' Esta prévia foi reduzida para caber na memória; o arquivo final usa a resolução original.' : ''}`;
          tela.setAttribute('aria-label', `Prévia da foto editada, ${a.saída.largura} por ${a.saída.altura} pixels`);
        }
        const agendarPrévia = () => {
          if (pendente) return;
          pendente = requestAnimationFrame(() => { pendente = 0; desenharPrévia(); });
        };

        const novaCamada = (camada) => {
          if (camadas.length >= 30) { avisar('O limite é 30 camadas por foto. Remova uma para continuar.'); return; }
          camada.id = crypto.randomUUID(); camada.x ??= .1; camada.y ??= .82; camada.largura ??= .8; camada.altura ??= .1;
          camadas.push(camada); camadaSelecionada = camada.id; atualizarListaCamadas(); resultado.hidden = true; desenharPrévia(); confirmar();
        };
        prévia.querySelector('[data-camada="texto"]').addEventListener('click', () => {
          const texto = prévia.querySelector('#editor-texto').value.trim(); if (!texto) { avisar('Escreva o texto da camada primeiro.'); return; }
          novaCamada({ tipo: 'texto', texto, cor: prévia.querySelector('#editor-cor').value, largura: .8, altura: .1 });
        });
        prévia.querySelector('[data-camada="marca"]').addEventListener('click', () => {
          const texto = prévia.querySelector('#editor-texto').value.trim() || '© Sua marca';
          novaCamada({ tipo: 'marca', texto, cor: prévia.querySelector('#editor-cor').value, x: .62, y: .88, largura: .34, altura: .07, opacidade: .75 });
        });
        prévia.querySelector('[data-camada="forma"]').addEventListener('click', () => novaCamada({ tipo: prévia.querySelector('#editor-forma').value, cor: prévia.querySelector('#editor-cor').value, largura: .25, altura: .18 }));
        prévia.querySelector('[data-camada-imagem]').addEventListener('change', async (evento) => {
          const arquivo = evento.target.files?.[0]; if (!arquivo) return;
          const imagensMantidas = [...bitmapsAbertos].filter((bitmap) => bitmap !== foto?.bitmap).length;
          if (imagensMantidas >= 4) { avisar('O limite é quatro imagens sobrepostas por foto. Escolha outra foto para liberar espaço.'); evento.target.value = ''; return; }
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) || arquivo.size > 25 * 1024 * 1024) { avisar('Escolha uma imagem PNG, JPG ou WebP de até 25 MB.'); evento.target.value = ''; return; }
          try {
            const bitmap = await createImageBitmap(arquivo);
            if (bitmap.width * bitmap.height > 8_000_000) { bitmap.close(); throw new Error('A imagem da camada passa de 8 megapixels.'); }
            bitmapsAbertos.add(bitmap); novaCamada({ tipo: 'imagem', bitmap, largura: .25, altura: .2, origem: arquivo.name });
          } catch (erro) { avisar(erro.message || 'Não foi possível abrir essa imagem.'); }
          evento.target.value = '';
        });
        prévia.querySelector('#editor-zoom').addEventListener('input', (evento) => {
          const valor = Number(evento.target.value); const saída = prévia.querySelector('[data-zoom]'); saída.value = `${valor}%`; saída.textContent = `${valor}%`;
          tela.style.width = `${valor}%`; tela.style.maxWidth = 'none';
        });

        /* ---------------------------------------------- histórico */

        const capturar = () => ({
          valores: Object.fromEntries(CAMPOS_GUARDADOS.map((nome) => [nome, campo(nome).value])),
          visão: { ...visão },
          camadas: camadas.map((camada) => ({ ...camada })),
        });
        const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        const botão = (ação) => prévia.querySelector(`[data-ação="${ação}"]`);
        function atualizarBotõesDoHistórico() {
          botão('desfazer').disabled = posição <= 0;
          botão('refazer').disabled = posição >= histórico.length - 1;
        }
        /** Registra o estado atual como um passo, se ele mudou. */
        function confirmar() {
          if (!foto) return;
          const atual = capturar();
          if (posição >= 0 && igual(histórico[posição], atual)) return;
          histórico = [...histórico.slice(0, posição + 1), atual].slice(-PASSOS_NO_HISTÓRICO);
          posição = histórico.length - 1;
          atualizarBotõesDoHistórico();
        }
        function aplicarEstado(estado) {
          for (const [nome, valor] of Object.entries(estado.valores)) campo(nome).value = valor;
          visão = { ...estado.visão };
          camadas = (estado.camadas ?? []).map((camada) => ({ ...camada }));
          camadaSelecionada = camadas.at(-1)?.id ?? null;
          atualizarListaCamadas();
          atualizarRótulos();
          atualizarVisibilidade();
          limparErros(formulário);
          resultado.hidden = true;
          desenharPrévia({ mostrarErros: true });
        }
        function reiniciar() {
          visão = { giro: 0, espelharH: false, espelharV: false };
          comparar = false;
          camadas = []; camadaSelecionada = null; atualizarListaCamadas();
          prévia.querySelector('#campo-original').checked = false;
          for (const nome of CAMPOS_GUARDADOS) campo(nome).value = PADRÃO_DOS_CAMPOS[nome];
          cache = { geometria: '', girada: null, cores: '', colorida: null };
          atualizarRótulos();
          atualizarVisibilidade();
          histórico = [];
          posição = -1;
          confirmar();
        }

        botão('desfazer').addEventListener('click', () => { if (posição > 0) { posição -= 1; aplicarEstado(histórico[posição]); atualizarBotõesDoHistórico(); } });
        botão('refazer').addEventListener('click', () => { if (posição < histórico.length - 1) { posição += 1; aplicarEstado(histórico[posição]); atualizarBotõesDoHistórico(); } });
        botão('restaurar').addEventListener('click', () => {
          const inicial = histórico[0];
          if (!inicial || igual(inicial, capturar())) { avisar('A foto já está sem ajustes.'); return; }
          aplicarEstado(inicial);
          confirmar();
          avisar('Ajustes desfeitos.');
        });

        /* ---------------------------------------------- girar, espelhar, cortar */

        grupos.girar.caixa.addEventListener('click', (evento) => {
          const alvo = evento.target.closest('[data-operação]');
          if (!alvo || !foto) return;
          const operação = alvo.dataset.operação;
          let margens;
          try { margens = lerMargens(); } catch { margens = { esquerda: 0, topo: 0, direita: 0, base: 0 }; }
          const girada = operação === 'girar-horário' ? girarMargens(margens, 1)
            : operação === 'girar-anti' ? girarMargens(margens, -1)
              : espelharMargens(margens, operação === 'espelhar-h' ? 'h' : 'v');
          visão = aplicarOperação(visão, operação);
          definirMargens(girada);
          campo('proporção').value = 'livre';
          resultado.hidden = true;
          desenharPrévia({ mostrarErros: true });
          confirmar();
        });

        campo('proporção').addEventListener('change', () => {
          const proporção = PROPORÇÕES[campo('proporção').value];
          if (!proporção?.razão) return;
          const quadro = visão.giro % 180 === 0 ? { largura: foto.largura, altura: foto.altura } : { largura: foto.altura, altura: foto.largura };
          definirMargens(margensDeProporção(quadro, proporção.razão));
        });
        for (const [, nome] of CAMPOS_DE_MARGEM) {
          campo(nome).addEventListener('input', () => { campo('proporção').value = 'livre'; });
        }

        function marcarCorte() {
          botãoCorte.setAttribute('aria-pressed', String(desenhandoCorte));
          botãoCorte.textContent = desenhandoCorte ? 'Parar de desenhar o corte' : 'Desenhar o corte sobre a foto';
          tela.style.touchAction = desenhandoCorte ? 'none' : '';
          tela.style.cursor = desenhandoCorte ? 'crosshair' : '';
        }
        botãoCorte.addEventListener('click', () => { desenhandoCorte = !desenhandoCorte; marcarCorte(); });

        let arrasto = null;
        const pontoNaFoto = (evento) => {
          const caixa = tela.getBoundingClientRect();
          const escala = tela.width / caixa.width;
          return { x: (evento.clientX - caixa.left) * escala, y: (evento.clientY - caixa.top) * escala };
        };
        tela.addEventListener('pointerdown', (evento) => {
          if (!desenhandoCorte || comparar || evento.button > 0) return;
          evento.preventDefault();
          tela.setPointerCapture(evento.pointerId);
          arrasto = { início: pontoNaFoto(evento), fim: pontoNaFoto(evento) };
        });
        tela.addEventListener('pointermove', (evento) => {
          if (!arrasto) return;
          arrasto.fim = pontoNaFoto(evento);
          if (Math.abs(arrasto.fim.x - arrasto.início.x) < 3 || Math.abs(arrasto.fim.y - arrasto.início.y) < 3) return;
          definirMargens(margensDeRetângulo(quadroDaPrévia, { x0: arrasto.início.x, y0: arrasto.início.y, x1: arrasto.fim.x, y1: arrasto.fim.y }));
          campo('proporção').value = 'livre';
          agendarPrévia();
        });
        const soltar = () => { if (!arrasto) return; arrasto = null; resultado.hidden = true; desenharPrévia({ mostrarErros: true }); confirmar(); };
        tela.addEventListener('pointerup', soltar);
        tela.addEventListener('pointercancel', soltar);
        let arrastoCamada = null;
        tela.addEventListener('pointerdown', (evento) => {
          if (desenhandoCorte || comparar || !camadas.length || evento.button > 0) return;
          const ponto = pontoNaFoto(evento); const { x, y, largura, altura } = corteDaPrévia;
          const px = (ponto.x - x) / largura, py = (ponto.y - y) / altura;
          const encontrada = [...camadas].reverse().find((c) => px >= c.x && px <= c.x + c.largura && py >= c.y && py <= c.y + c.altura);
          if (!encontrada) return;
          evento.preventDefault(); tela.setPointerCapture(evento.pointerId); camadaSelecionada = encontrada.id;
          arrastoCamada = { camada: encontrada, x: px, y: py, inícioX: encontrada.x, inícioY: encontrada.y }; atualizarListaCamadas();
        });
        tela.addEventListener('pointermove', (evento) => {
          if (!arrastoCamada) return;
          const ponto = pontoNaFoto(evento); const c = corteDaPrévia;
          const px = (ponto.x - c.x) / c.largura, py = (ponto.y - c.y) / c.altura;
          arrastoCamada.camada.x = Math.max(0, Math.min(1 - arrastoCamada.camada.largura, arrastoCamada.inícioX + px - arrastoCamada.x));
          arrastoCamada.camada.y = Math.max(0, Math.min(1 - arrastoCamada.camada.altura, arrastoCamada.inícioY + py - arrastoCamada.y)); agendarPrévia();
        });
        const soltarCamada = () => { if (!arrastoCamada) return; arrastoCamada = null; resultado.hidden = true; desenharPrévia(); confirmar(); };
        tela.addEventListener('pointerup', soltarCamada); tela.addEventListener('pointercancel', soltarCamada);

        /* ---------------------------------------------- eventos dos campos */

        prévia.querySelector('#campo-original').addEventListener('change', (evento) => {
          comparar = evento.target.checked;
          desenharPrévia();
        });
        formulário.addEventListener('input', (evento) => {
          if (evento.target.id === 'campo-original') return;
          atualizarRótulos();
          resultado.hidden = true;
          agendarPrévia();
        });
        formulário.addEventListener('change', (evento) => {
          if (evento.target.id === 'campo-original' || evento.target.type === 'file') return;
          atualizarVisibilidade();
          desenharPrévia({ mostrarErros: true });
          confirmar();
        });
        formulário.addEventListener('reset', () => {
          setTimeout(() => {
            for (const bitmap of bitmapsAbertos) bitmap.close?.();
            bitmapsAbertos.clear(); camadas = []; camadaSelecionada = null; atualizarListaCamadas();
            foto = null;
            visão = { giro: 0, espelharH: false, espelharV: false };
            comparar = false;
            histórico = [];
            posição = -1;
            atualizarRótulos();
            atualizarVisibilidade();
            mostrarEdição(false);
          }, 0);
        });

        atualizarRótulos();
        atualizarVisibilidade();
      },
    });
  },
};
