/** Extrai objetos de imagem incorporados num PDF no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, baixar } from '../núcleo/montador.js';
import { nomeDeArquivo } from '../núcleo/exportar.js';
import { compactarZip } from '../comum/exportação/compactar-zip.js';
import { formatarTamanho } from '../cálculos/pdf.js';
import {
  extrairImagensDoPdf, mensagemDeErroDeExtrairImagens, TAMANHO_MÁXIMO_PDF, LIMITE_DE_PÁGINAS,
  LIMITE_DE_IMAGENS, LIMITE_DE_PIXELS_POR_IMAGEM, LIMITE_TOTAL_DE_PIXELS, LIMITE_DE_SAÍDA,
} from '../cálculos/extrair-imagens-do-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';

const número = valor => valor.toLocaleString('pt-BR');
async function validarArquivo(arquivo, começo) {
  if (arquivo.size > TAMANHO_MÁXIMO_PDF) return { erro: 'O PDF passa de ' + formatarTamanho(TAMANHO_MÁXIMO_PDF) + '.' };
  return validarPdfDaEscolha(arquivo, começo);
}
async function criarMiniatura(bytes, largura, altura) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const escala = Math.min(1, 256 / Math.max(largura, altura));
  const w = Math.max(1, Math.round(largura * escala)), h = Math.max(1, Math.round(altura * escala));
  const tela = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  try {
    const contexto = tela.getContext('2d'); contexto.imageSmoothingQuality = 'high'; contexto.drawImage(bitmap, 0, 0, w, h);
    if (tela.convertToBlob) return await tela.convertToBlob({ type: 'image/png' });
    return await new Promise((resolve, reject) => tela.toBlob(blob => blob ? resolve(blob) : reject(new Error('preview png unavailable')), 'image/png'));
  } finally { bitmap.close(); }
}

export default {
  instruções: {
    passos: [
      'Escolha um PDF de até 20 MB. O arquivo é lido no seu navegador e não é enviado a um servidor.',
      'Toque em “Extrair imagens”. A ferramenta procura os objetos de imagem incorporados e mostra uma prévia dos primeiros resultados.',
      'Baixe um ZIP com as imagens em PNG e um manifesto JSON com páginas, dimensões e número de usos de cada imagem.',
    ],
    exemplo: { texto: 'Se o mesmo objeto aparecer em mais de uma página, o ZIP inclui uma cópia PNG e o manifesto lista todas as páginas em que ele aparece.' },
    limites: 'PDF de até ' + formatarTamanho(TAMANHO_MÁXIMO_PDF) + ', ' + LIMITE_DE_PÁGINAS + ' páginas e ' + LIMITE_DE_IMAGENS + ' imagens únicas. Cada imagem pode ter até ' + número(LIMITE_DE_PIXELS_POR_IMAGEM) + ' pixels; o conjunto, até ' + número(LIMITE_TOTAL_DE_PIXELS) + ' pixels e ' + formatarTamanho(LIMITE_DE_SAÍDA) + ' de saída. '
      + 'Os PNGs são codificados a partir dos pixels que o leitor local decodifica; não são os bytes comprimidos originais do PDF. Máscaras, padrões, desenhos vetoriais e páginas inteiras não são exportados como imagens. A transparência disponível nos pixels é mantida. Usa pdf.js local (licença Apache 2.0).',
    perguntas: [
      { p: 'O arquivo sai do meu aparelho?', r: 'Não. O PDF e as imagens são processados no seu navegador, sem envio ao servidor.' },
      { p: 'Por que o PNG não é idêntico ao objeto original do PDF?', r: 'O leitor decodifica os pixels, e a ferramenta os grava em PNG. Isso mantém a imagem visual e a transparência, mas não conserva o formato comprimido que estava dentro do PDF.' },
      { p: 'A ferramenta extrai logos desenhados com vetores?', r: 'Não. Ela extrai objetos de imagem. Máscaras, padrões e ilustrações vetoriais não entram no ZIP.' },
    ],
  },
  montar(raiz, ferramenta) {
    let escolha, execução;
    const urls = new Set();
    let geraçãoPreview = 0;
    const soltarPrevias = () => {
      geraçãoPreview++;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      const grade = raiz.querySelector('#previas-imagens-extraidas');
      if (grade) { grade.querySelector('.estudio-imagens__grade')?.replaceChildren(); grade.querySelector('p')?.remove(); grade.hidden = true; }
    };
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Extrair imagens', demorada: true,
      campos: [{ nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file', dica: 'PDF de até ' + formatarTamanho(TAMANHO_MÁXIMO_PDF) + '; fica no seu aparelho.' }],
      async calcular() {
        soltarPrevias();
        const geraçãoDaExecução = geraçãoPreview;
        const item = escolha.itens()[0];
        if (!item) throw new ErroDeEntrada('Escolha um PDF primeiro.', 'arquivo');
        return execução.executar(async () => {
          const progresso = execução.progresso;
          progresso.andar(undefined, 'Lendo o PDF…');
          const bytes = new Uint8Array(await item.arquivo.arrayBuffer());
          progresso.andar(undefined, 'Procurando objetos de imagem…');
          const resultado = await extrairImagensDoPdf({ nome: item.nome, bytes }, {
            cancelado: execução.cancelado,
            aoProgredir: ({ pagina, total, imagens }) => progresso.andar(100 * pagina / total, 'Página ' + número(pagina) + ' de ' + número(total) + ' · ' + número(imagens) + ' imagens únicas'),
          });
          if (!resultado.ok) {
            if (resultado.erro === 'cancelado') throw new Error(resultado.mensagem);
            throw new ErroDeEntrada(resultado.mensagem || mensagemDeErroDeExtrairImagens(resultado.erro, resultado.extras), 'arquivo');
          }
          const manifesto = {
            arquivo: item.nome,
            imagens: resultado.imagens.map(({ nome, largura, altura, pixels, pagina, paginas, ocorrencias }) => ({ nome, largura, altura, pixels, primeira_pagina: pagina, paginas, ocorrencias })),
            paginas_no_pdf: resultado.paginas,
            ocorrencias_de_imagem: resultado.ocorrencias,
            imagens_ignoradas: resultado.ignoradas,
            pixels_extraidos: resultado.pixels,
          };
          const arquivos = resultado.imagens.map(imagem => ({ nome: imagem.nome, conteúdo: imagem.bytes }));
          arquivos.push({ nome: 'manifesto.json', conteúdo: JSON.stringify(manifesto, null, 2) });
          const zip = compactarZip(arquivos);
          if (zip.length > LIMITE_DE_SAÍDA) throw new ErroDeEntrada(mensagemDeErroDeExtrairImagens('saida_grande'), 'arquivo');

          const grade = raiz.querySelector('#previas-imagens-extraidas');
          const miniaturas = grade.querySelector('.estudio-imagens__grade');
          miniaturas.replaceChildren();
          grade.querySelector('p')?.remove();
          for (const imagem of resultado.imagens.slice(0, 12)) {
            let blob;
            try { blob = await criarMiniatura(imagem.bytes, imagem.largura, imagem.altura); }
            catch { blob = new Blob([imagem.bytes], { type: 'image/png' }); }
            if (execução.cancelado() || geraçãoDaExecução !== geraçãoPreview) throw new Error('Extração cancelada. Nenhum ZIP foi gerado.');
            const url = URL.createObjectURL(blob);
            urls.add(url);
            const figura = document.createElement('figure');
            const img = document.createElement('img'); img.src = url; img.alt = imagem.nome + ', ' + imagem.largura + ' por ' + imagem.altura + ' pixels';
            const legenda = document.createElement('figcaption'); legenda.textContent = imagem.nome + ' · ' + número(imagem.largura) + ' × ' + número(imagem.altura) + ' px · página(s) ' + imagem.paginas.join(', ');
            figura.append(img, legenda); miniaturas.append(figura);
          }
          const nota = document.createElement('p'); nota.className = 'suave pequeno';
          nota.textContent = resultado.imagens.length > 12 ? 'Prévia das primeiras 12 de ' + número(resultado.imagens.length) + ' imagens.' : 'Prévia de ' + número(resultado.imagens.length) + ' imagens.';
          grade.append(nota); grade.hidden = false;
          const observações = [
            'O PDF foi lido no seu navegador e não foi enviado. Os PNGs contêm pixels decodificados pelo leitor, não os bytes comprimidos originais do PDF.',
            'Máscaras de imagem, padrões e elementos vetoriais não são extraídos como imagens.',
          ];
          if (resultado.ignoradas) observações.push(número(resultado.ignoradas) + ' operadores de máscara foram ignorados.');
          return {
            valor: número(resultado.imagens.length) + ' imagens extraídas',
            resumo: item.nome + ': ' + número(resultado.ocorrencias) + ' ocorrências em ' + número(resultado.paginas) + ' páginas · ZIP de ' + formatarTamanho(zip.length) + '.',
            linhas: resultado.imagens.slice(0, 6).map(imagem => [imagem.nome, número(imagem.largura) + ' × ' + número(imagem.altura) + ' px · página(s) ' + imagem.paginas.join(', ') + ' · ' + imagem.ocorrencias + ' uso(s)'])
              .concat(resultado.imagens.length > 6 ? [['…', 'e mais ' + número(resultado.imagens.length - 6)]] : []),
            arquivos: [{ rótulo: 'Baixar PNGs + manifesto (ZIP)', ícone: 'baixar', gerar: () => baixar(zip, (nomeDeArquivo(item.nome.replace(/\.pdf$/iu, '')) || 'documento') + '-imagens.zip', 'application/zip') }],
            observações,
          };
        });
      },
      aoMontar(elemento) {
        const grade = document.createElement('section'); grade.id = 'previas-imagens-extraidas'; grade.className = 'estudio-imagens__previa t-3'; grade.hidden = true;
        grade.setAttribute('aria-label', 'Prévia das imagens extraídas');
        const título = document.createElement('h3'); título.textContent = 'Prévia das imagens extraídas';
        const miniaturas = document.createElement('div'); miniaturas.className = 'estudio-imagens__grade';
        grade.append(título, miniaturas);
        elemento.querySelector('#resultado').after(grade);
        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo', rótuloDoBotão: 'Escolher PDF', accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido', textoDoVazio: 'Nenhum PDF escolhido. Escolha um arquivo para começar.',
          textoDeSolte: 'Solte o PDF para escolher.', validar: validarArquivo, aoMudar: soltarPrevias,
        });
        execução = prepararExecução(elemento, { escolha });
        elemento.querySelector('#formulário').addEventListener('reset', soltarPrevias);
        window.addEventListener('pagehide', soltarPrevias, { once: true });
      },
    });
  },
};
