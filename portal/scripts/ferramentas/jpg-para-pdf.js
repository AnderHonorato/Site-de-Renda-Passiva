/** JPG para PDF: fotos e imagens viram páginas de um PDF, no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, baixar } from '../núcleo/montador.js';
import { baixarPdf, nomeDeArquivo } from '../núcleo/exportar.js';
import { criarProgresso } from '../núcleo/interface.js';
import { ícone } from '../núcleo/ícones.js';
import { compactarZip } from '../comum/exportação/compactar-zip.js';
import { formatarTamanho } from '../cálculos/pdf.js';
import {
  converterImagensEmPdf, mensagemDeErroDeJpgParaPdf, LIMITE_DE_IMAGENS, TAMANHO_TOTAL_MÁXIMO, MARGENS_MM,
} from '../cálculos/jpg-para-pdf.js';
import { conferirImagem, mensagemDeErroDaImagem, TAMANHO_MÁXIMO_DA_IMAGEM } from '../cálculos/imagens-em-pdf.js';
import { montarEscolhaDeArquivos } from './auxiliares/escolher-arquivos.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';
import { converterImagemPelaTela } from './auxiliares/converter-imagem.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const mm = (pt) => número(Math.round((pt * 25.4) / 72));
const TAMANHO_MÁXIMO_MB = TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024;

/** Nome único dentro do ZIP: dois "foto.jpg" de pastas diferentes não podem se sobrescrever. */
function nomesÚnicos(saídas) {
  const usados = new Map();
  return saídas.map(({ nome, bytes }) => {
    const base = nomeDeArquivo(nome);
    const vez = (usados.get(base) ?? 0) + 1;
    usados.set(base, vez);
    return { nome: `${base}${vez > 1 ? `-${vez}` : ''}.pdf`, conteúdo: bytes };
  });
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher imagens" ou arraste as fotos para o quadro. Elas são lidas no seu navegador, sem envio para servidor.',
      'Use as setas de cada linha para deixar as imagens na ordem das páginas. A lixeira tira a imagem da lista.',
      'Escolha o tamanho da página, a orientação e a margem. "Adaptar" faz cada página ter o tamanho da própria imagem.',
      'Toque em "Converter em PDF" e baixe o resultado. Com "Juntar tudo em um só PDF" desmarcado, você recebe um ZIP com um PDF por imagem.',
    ],
    exemplo: {
      texto: 'Para mandar a frente e o verso de um documento fotografado: escolha as duas fotos, deixe A4, retrato e margem pequena. '
        + 'O resultado é um PDF de 2 páginas A4, cada foto centralizada e inteira, sem cortar nada.',
    },
    limites: `Até ${LIMITE_DE_IMAGENS} imagens por vez, cada uma com até ${TAMANHO_MÁXIMO_MB} MB e, juntas, até ${TAMANHO_TOTAL_MÁXIMO / 1024 / 1024} MB. `
      + 'Aceita JPG, PNG, WebP e GIF (GIF animado vira o primeiro quadro); o formato é reconhecido pelo conteúdo, não pela extensão. '
      + 'TIFF e HEIC (fotos do iPhone nesse formato) não são lidos: salve como JPG antes. '
      + `As margens são de ${MARGENS_MM.pequena} mm (pequena) e ${MARGENS_MM.grande} mm (grande). `
      + 'O JPG entra no PDF sem ser recomprimido, então a qualidade e o tamanho da foto se mantêm; a foto de celular em pé sai em pé. '
      + 'PNG com fundo transparente fica sobre o fundo branco da página. A conversão usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Minhas fotos são enviadas para algum servidor?',
        r: 'Não. A conversão acontece no seu navegador; as imagens não saem do aparelho.',
      },
      {
        p: 'A foto saiu deitada. Como corrijo?',
        r: 'A ferramenta já respeita a rotação gravada pela câmera. Se a foto foi tirada deitada e salva assim, escolha orientação "Paisagem" ou "Automática" para a página combinar com ela.',
      },
      {
        p: 'O PDF ficou grande. O que fazer?',
        r: 'Como o JPG não é recomprimido, o PDF tem quase o tamanho das fotos somadas. Para reduzir, diminua as fotos antes de converter.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let cancelar = false;
    let progresso;
    let botãoConverter;
    let botãoCancelar;
    let escolha;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter em PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivos', rótulo: 'Imagens', tipo: 'file',
          dica: `Até ${LIMITE_DE_IMAGENS} imagens JPG, PNG, WebP ou GIF, com até ${TAMANHO_MÁXIMO_MB} MB cada. A ordem da lista é a ordem das páginas.`,
        },
        {
          nome: 'tamanho', rótulo: 'Tamanho da página', tipo: 'seleção', padrão: 'a4',
          opções: [
            { valor: 'a4', rótulo: 'A4 (210 × 297 mm)' },
            { valor: 'carta', rótulo: 'Carta (216 × 279 mm)' },
            { valor: 'adaptar', rótulo: 'Adaptar: a página tem o tamanho da imagem' },
          ],
        },
        {
          nome: 'orientação', rótulo: 'Orientação da página', tipo: 'seleção', padrão: 'retrato',
          opções: [
            { valor: 'retrato', rótulo: 'Retrato (em pé)' },
            { valor: 'paisagem', rótulo: 'Paisagem (deitada)' },
            { valor: 'automática', rótulo: 'Automática: segue a forma de cada imagem' },
          ],
        },
        {
          nome: 'margem', rótulo: 'Margem', tipo: 'seleção', padrão: 'sem',
          opções: [
            { valor: 'sem', rótulo: 'Sem margem' },
            { valor: 'pequena', rótulo: `Pequena (${MARGENS_MM.pequena} mm)` },
            { valor: 'grande', rótulo: `Grande (${MARGENS_MM.grande} mm)` },
          ],
        },
        { nome: 'juntar', rótulo: 'Juntar tudo em um só PDF', tipo: 'caixa', padrão: true },
      ],

      async calcular(dados) {
        const imagens = escolha.itens();
        if (imagens.length === 0) throw new ErroDeEntrada(mensagemDeErroDeJpgParaPdf('sem_imagens'), 'arquivos');

        cancelar = false;
        botãoConverter.disabled = true;
        botãoCancelar.hidden = false;
        escolha.travar(true);
        try {
          progresso.andar(undefined, 'Preparando o conversor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }

          progresso.andar(undefined, 'Lendo as imagens…');
          const arquivos = [];
          for (const { nome, arquivo } of imagens) {
            arquivos.push({ nome, bytes: new Uint8Array(await arquivo.arrayBuffer()) });
          }

          const juntar = dados.juntar !== 'não';
          const r = await converterImagensEmPdf(arquivos, {
            biblioteca,
            tamanho: dados.tamanho,
            orientação: dados.orientação ?? 'retrato',
            margem: dados.margem,
            juntar,
            converter: converterImagemPelaTela,
            cancelado: () => cancelar,
            aoProgredir: ({ imagem, total }) => progresso.andar(100 * imagem / total, `Imagem ${número(imagem)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') {
              const erro = new Error(mensagemDeErroDeJpgParaPdf('cancelado'));
              erro.cancelado = true;
              throw erro;
            }
            throw new ErroDeEntrada(mensagemDeErroDeJpgParaPdf(r.erro, r.extras), 'arquivos');
          }

          const linhas = r.detalhes.slice(0, 12).map((d, i) => [
            `${i + 1}. ${d.nome}`,
            `${número(d.largura)} × ${número(d.altura)} px → página de ${mm(d.páginaLargura)} × ${mm(d.páginaAltura)} mm`,
          ]);
          if (r.detalhes.length > linhas.length) linhas.push([`… e mais ${número(r.detalhes.length - linhas.length)}`, 'na mesma regra']);

          let arquivo;
          let resumo;
          if (juntar) {
            const { bytes } = r.arquivos[0];
            arquivo = { rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(bytes, 'imagens') };
            resumo = `${número(r.páginas)} ${r.páginas === 1 ? 'imagem virou' : 'imagens viraram'} páginas, na ordem da lista · ${formatarTamanho(bytes.length)}.`;
          } else {
            const zip = compactarZip(nomesÚnicos(r.arquivos));
            arquivo = { rótulo: 'Baixar ZIP', ícone: 'baixar', gerar: () => baixar(zip, 'imagens-pdf.zip', 'application/zip') };
            resumo = `${número(r.arquivos.length)} PDFs, um por imagem, dentro de um ZIP · ${formatarTamanho(zip.length)}.`;
          }
          return {
            valor: juntar ? `PDF pronto: ${número(r.páginas)} ${r.páginas === 1 ? 'página' : 'páginas'}` : `${número(r.arquivos.length)} PDFs prontos`,
            resumo,
            linhas,
            arquivos: [arquivo],
            observações: ['As imagens foram lidas no seu navegador e nada foi enviado. Os originais continuam intactos no seu aparelho.'],
          };
        } finally {
          botãoConverter.disabled = false;
          botãoCancelar.hidden = true;
          escolha.travar(false);
        }
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        botãoConverter = formulário.querySelector('button[type="submit"]');

        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivos',
          rótuloDoBotão: 'Escolher imagens',
          accept: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
          múltiplo: true,
          limite: LIMITE_DE_IMAGENS,
          mensagemDeLimite: mensagemDeErroDeJpgParaPdf('imagens_demais'),
          rótuloDaLista: 'Imagens escolhidas, na ordem das páginas',
          textoDoVazio: 'Nenhuma imagem escolhida ainda. Arraste as fotos para este quadro ou use o botão "Escolher imagens".',
          textoDeSolte: 'Solte as imagens para colocar na lista.',
          ícone: 'imagem',
          async validar(arquivo) {
            if (arquivo.size === 0) return { erro: mensagemDeErroDaImagem('imagem_vazia', { nome: arquivo.name }) };
            if (arquivo.size > TAMANHO_MÁXIMO_DA_IMAGEM) return { erro: mensagemDeErroDaImagem('imagem_grande_demais', { nome: arquivo.name }) };
            // O cabeçalho (e o EXIF, que pode ser grande) cabe no começo do arquivo; o resto é lido só ao converter.
            const começo = new Uint8Array(await arquivo.slice(0, 256 * 1024).arrayBuffer());
            const r = conferirImagem({ nome: arquivo.name, bytes: começo });
            // Cabeçalho cortado pelo limite da leitura: não recusa agora, a conversão decide.
            if (!r.ok && !(r.erro === 'imagem_corrompida' && arquivo.size > começo.length)) {
              return { erro: mensagemDeErroDaImagem(r.erro, { ...r.extras, nome: arquivo.name }) };
            }
            return { extra: r.ok ? `${número(r.info.largura)} × ${número(r.info.altura)} px` : undefined };
          },
        });

        const tamanho = elemento.querySelector('#campo-tamanho');
        const orientação = elemento.querySelector('#campo-orientação');
        botãoCancelar = document.createElement('button');
        botãoCancelar.type = 'button';
        botãoCancelar.className = 'botão botão--linha';
        botãoCancelar.hidden = true;
        botãoCancelar.innerHTML = `${ícone('fechar')}Cancelar`;
        botãoCancelar.addEventListener('click', () => { cancelar = true; });
        formulário.querySelector('.ações').append(botãoCancelar);
        formulário.addEventListener('reset', () => {
          cancelar = true;
          setTimeout(atualizarOrientação, 0);
        });

        // Com "Adaptar" a página segue a imagem: a orientação não faz diferença e fica desligada.
        function atualizarOrientação() {
          const adaptar = tamanho.value === 'adaptar';
          orientação.disabled = adaptar;
          orientação.closest('.campo').classList.toggle('campo--inativo', adaptar);
        }
        tamanho.addEventListener('change', atualizarOrientação);
        atualizarOrientação();
      },
    });
  },
};
