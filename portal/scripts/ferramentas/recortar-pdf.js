/** Recortar PDF: tirar margens das páginas, no próprio navegador (o conteúdo cortado continua no arquivo). */
import { montarFerramenta, ErroDeEntrada, número as lerNúmero } from '../núcleo/montador.js';
import { baixarPdf, nomeDeArquivo } from '../núcleo/exportar.js';
import { paraNúmero } from '../núcleo/texto.js';
import { ícone } from '../núcleo/ícones.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import {
  textoDePáginas, mensagemDeErroDoPdfÚnico, carregarPdf, geometriaDaPágina, ptParaMm, arredondar, LIMITE_DE_PÁGINAS,
} from '../cálculos/pdf-páginas.js';
import { recortarPdf, mensagemDeErroDeRecorte, UNIDADES, LADOS, MARGEM_MÁXIMA } from '../cálculos/recortar-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const mm = (pt) => número(arredondar(ptParaMm(pt), 1));

const RÓTULO_DO_LADO = { cima: 'Cortar em cima', direita: 'Cortar à direita', baixo: 'Cortar embaixo', esquerda: 'Cortar à esquerda' };

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro, extras) {
  if (erro.startsWith('margem_')) return extras?.lado ?? 'cima';
  if (erro === 'sem_corte' || erro === 'corte_demais') return 'cima';
  if (erro === 'unidade_inválida') return 'unidade';
  if (erro.startsWith('faixa_')) return 'páginas';
  return 'arquivo';
}

const SVG = 'http://www.w3.org/2000/svg';
function elementoSvg(nome, atributos) {
  const elemento = document.createElementNS(SVG, nome);
  for (const [chave, valor] of Object.entries(atributos)) elemento.setAttribute(chave, String(valor));
  return elemento;
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Diga quanto cortar em cima, à direita, embaixo e à esquerda, e a unidade (milímetros, centímetros ou pontos). O desenho mostra, na primeira página, o que fica.',
      'Se quiser recortar só algumas páginas, escreva quais em "Páginas", como 2 ou 1-3 ou ímpares. Em branco, vale o PDF todo.',
      'Toque em "Recortar PDF" e baixe o arquivo. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Uma apostila A4 de 5 páginas, cortando 50 pontos de cada lado em todas as páginas: cada página passa a mostrar só a área de '
        + '495,3 × 741,9 pontos no meio (a página continua do tamanho original por dentro do arquivo). Escrevendo "2" em "Páginas", só a página 2 muda.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser recortado. '
      + 'ATENÇÃO: o recorte só muda a área que aparece; o que ficou de fora CONTINUA DENTRO DO ARQUIVO. Quem abrir o PDF em um editor, copiar o texto ou extrair as imagens '
      + 'consegue recuperar o conteúdo cortado. Não use o recorte para esconder dados pessoais, senhas ou informações sigilosas: para isso, use a ferramenta de ocultar informações. '
      + 'O corte parte da área que você já via: se o PDF já tinha uma área visível menor que a página, o recorte continua dentro dela. '
      + 'Em página girada (como um escaneamento de lado) as margens valem como você vê a página. '
      + 'Cada página precisa sobrar com pelo menos 10 pontos (cerca de 3,5 mm) de largura e de altura. '
      + 'O recorte usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'O que fica de fora do recorte some do arquivo?',
        r: 'Não. Fica escondido, mas continua dentro do PDF. Por isso o recorte serve para tirar margens brancas e deixar só uma área na tela, e não para proteger informação.',
      },
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. A biblioteca é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'Dá para desfazer o recorte?',
        r: 'Sim, num editor de PDF que mostre as caixas da página, porque o conteúdo continua lá. Aqui na ferramenta, basta usar o arquivo original, que não é alterado.',
      },
      {
        p: 'As páginas têm tamanhos diferentes. Como o corte se comporta?',
        r: 'O corte é o mesmo em milímetros (ou na unidade escolhida) em todas as páginas escolhidas, então páginas maiores sobram maiores. O desenho mostra a primeira página como exemplo.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    /** Tamanho da primeira página, como aparece, em pontos; vem do arquivo escolhido. */
    let primeira = null;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Recortar PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'unidade', rótulo: 'Unidade', tipo: 'seleção', padrão: 'mm',
          opções: [{ valor: 'mm', rótulo: 'Milímetros (mm)' }, { valor: 'cm', rótulo: 'Centímetros (cm)' }, { valor: 'pt', rótulo: 'Pontos (pt)' }],
        },
        ...LADOS.map((lado) => ({ nome: lado, rótulo: RÓTULO_DO_LADO[lado], tipo: 'número', padrão: '0', dica: lado === 'cima' ? '0 não corta nada naquele lado.' : undefined })),
        {
          nome: 'páginas', rótulo: 'Páginas', tipo: 'text', exemplo: 'Todas',
          dica: 'Em branco, todas. Exemplos: 2, 1-3, 5-, pares, ímpares.',
        },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        // As margens são lidas antes de abrir o PDF: erro de digitação não deve custar a leitura de 100 MB.
        const margens = {};
        for (const lado of LADOS) {
          margens[lado] = lerNúmero(dados, lado, { rótulo: RÓTULO_DO_LADO[lado], mín: 0, máx: MARGEM_MÁXIMA, obrigatório: false, padrão: 0 });
        }

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(4, 'Preparando o leitor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }

          progresso.andar(8, 'Lendo o arquivo…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          progresso.andar(15, 'Abrindo o PDF…');
          const r = await recortarPdf({ nome, bytes }, {
            biblioteca, margens, unidade: dados.unidade, páginas: dados.páginas ?? '',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(20 + (75 * página) / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            throw new ErroDeEntrada(mensagemDeErroDeRecorte(r.erro, { nome, ...r.extras }), campoDoErro(r.erro, r.extras));
          }

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const amostra = r.tamanhos.slice(0, 3).map((t) => [`Página ${t.página}, área visível`, `${mm(t.largura)} × ${mm(t.altura)} mm`]);
          return {
            valor: `${textoDePáginas(r.cortadas.length)} ${r.cortadas.length === 1 ? 'recortada' : 'recortadas'}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${formatarTamanho(r.bytes.length)}.`,
            linhas: amostra.concat(r.tamanhos.length > 3 ? [['…', `e mais ${número(r.tamanhos.length - 3)}`]] : []),
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-recortado`) }],
            observações: [
              'Atenção: o que ficou de fora do recorte continua dentro do arquivo, só escondido. Não use o recorte para esconder informação sigilosa.',
              'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
            ],
          };
        });
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        const campos = elemento.querySelector('.campos');

        // O aviso fica antes de qualquer campo: é a coisa que mais importa saber sobre o recorte.
        const aviso = document.createElement('p');
        aviso.className = 'pequeno t-2';
        aviso.setAttribute('role', 'note');
        aviso.innerHTML = `${ícone('alerta', { tamanho: 16 })} <strong>Atenção:</strong> o recorte só esconde. O que ficar de fora continua dentro do arquivo e pode ser recuperado. `
          + 'Para apagar de verdade, use a ferramenta de ocultar informações.';
        campos.before(aviso);

        // Desenho esquemático da primeira página e da área que fica.
        const prévia = document.createElement('div');
        prévia.className = 't-2';
        const desenho = elementoSvg('svg', { width: 200, height: 200, viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Prévia do recorte' });
        const legenda = document.createElement('p');
        legenda.className = 'pequeno suave';
        prévia.append(desenho, legenda);
        campos.after(prévia);

        function lerMargem(lado) {
          const valor = paraNúmero(String(elemento.querySelector(`#campo-${lado}`).value).trim());
          return Number.isFinite(valor) && valor > 0 ? valor : 0;
        }

        function desenharPrévia() {
          desenho.replaceChildren();
          if (!primeira) {
            prévia.hidden = true;
            return;
          }
          prévia.hidden = false;
          const fator = UNIDADES[elemento.querySelector('#campo-unidade').value] ?? 1;
          const m = Object.fromEntries(LADOS.map((lado) => [lado, lerMargem(lado) * fator]));
          const escala = Math.min(190 / primeira.largura, 190 / primeira.altura);
          const l = primeira.largura * escala;
          const a = primeira.altura * escala;
          const x0 = (200 - l) / 2;
          const y0 = (200 - a) / 2;
          desenho.append(elementoSvg('rect', { x: x0, y: y0, width: l, height: a, fill: 'currentColor', 'fill-opacity': 0.08, stroke: 'currentColor', 'stroke-opacity': 0.5 }));
          const sobraL = primeira.largura - m.esquerda - m.direita;
          const sobraA = primeira.altura - m.cima - m.baixo;
          if (sobraL > 0 && sobraA > 0) {
            desenho.append(elementoSvg('rect', {
              x: x0 + m.esquerda * escala, y: y0 + m.cima * escala, width: sobraL * escala, height: sobraA * escala,
              fill: 'currentColor', 'fill-opacity': 0.2, stroke: 'currentColor', 'stroke-width': 2, 'stroke-dasharray': '5 3',
            }));
            legenda.textContent = `Página 1: sobra ${mm(sobraL)} × ${mm(sobraA)} mm de ${mm(primeira.largura)} × ${mm(primeira.altura)} mm. A parte tracejada é a que fica.`;
          } else {
            legenda.textContent = 'O corte é maior que a página: corte menos.';
          }
          desenho.setAttribute('aria-label', legenda.textContent);
        }

        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo',
          rótuloDoBotão: 'Escolher PDF',
          accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido',
          textoDoVazio: 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão "Escolher PDF".',
          textoDeSolte: 'Solte o PDF para escolher.',
          async validar(arquivo, começo) {
            const básica = await validarPdfDaEscolha(arquivo, começo);
            if (básica.erro) return básica;
            // Abre já na escolha: senha ou dano aparecem agora, e a primeira página alimenta o desenho.
            try {
              const biblioteca = await carregarBiblioteca();
              const aberto = await carregarPdf({ nome: arquivo.name, bytes: new Uint8Array(await arquivo.arrayBuffer()) }, { biblioteca });
              if (!aberto.ok) return { erro: mensagemDeErroDoPdfÚnico(aberto.erro, aberto.extras) };
              const g = geometriaDaPágina(aberto.documento.getPage(0));
              primeira = { largura: g.largura, altura: g.altura };
              return { extra: `${textoDePáginas(aberto.páginas)} · ${mm(g.largura)} × ${mm(g.altura)} mm` };
            } catch {
              // Biblioteca fora do ar: a escolha vale, e o erro aparece ao recortar.
              return {};
            }
          },
          aoMudar: (itens) => {
            if (itens.length === 0) primeira = null;
            desenharPrévia();
          },
        });
        execução = prepararExecução(elemento, { escolha });

        for (const nome of [...LADOS, 'unidade']) elemento.querySelector(`#campo-${nome}`).addEventListener('input', desenharPrévia);
        formulário.addEventListener('reset', () => setTimeout(desenharPrévia, 0));
        desenharPrévia();
      },
    });
  },
};
