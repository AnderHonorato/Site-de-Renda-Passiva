/** Marca d'água no PDF: carimbar texto ou imagem nas páginas, no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, número as lerNúmero } from '../núcleo/montador.js';
import { baixarPdf, nomeDeArquivo } from '../núcleo/exportar.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { textoDePáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import { conferirImagem, mensagemDeErroDaImagem, TAMANHO_MÁXIMO_DA_IMAGEM } from '../cálculos/imagens-em-pdf.js';
import {
  marcarPdf, mensagemDeErroDeMarcaDágua, LIMITE_DO_TEXTO, TAMANHO_MÍN, TAMANHO_MÁX, ESCALA_MÍN, ESCALA_MÁX,
} from '../cálculos/marca-dagua-no-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';
import { converterImagemPelaTela } from './auxiliares/converter-imagem.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro) {
  if (erro.startsWith('texto_')) return 'texto';
  if (erro.startsWith('imagem_') || erro === 'sem_imagem') return 'imagem';
  if (erro.startsWith('faixa_')) return 'páginas';
  const direto = {
    tamanho_inválido: 'tamanho', escala_inválida: 'escala', opacidade_inválida: 'opacidade', rotação_inválida: 'rotação',
    posição_inválida: 'posição', camada_inválida: 'camada', cor_inválida: 'cor', fonte_inválida: 'fonte', mosaico_pesado: 'mosaico',
  };
  return direto[erro] ?? 'arquivo';
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Escolha se a marca é um texto (RASCUNHO, CONFIDENCIAL, o nome de quem recebe) ou uma imagem, como um logotipo.',
      'Ajuste opacidade, rotação e posição. "Repetir pela página inteira" espalha a marca em mosaico. Para marcar só algumas páginas, escreva quais em "Páginas", como 2-3 ou ímpares.',
      'Toque em "Aplicar marca d\'água" e baixe o PDF. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um contrato de 5 páginas com o texto CONFIDENCIAL, opacidade 50%, rotação de 45 graus, no centro: cada página sai com a palavra '
        + 'atravessada na diagonal, meio transparente, sem esconder o texto do contrato. Com "Páginas" 2-3, só essas duas recebem a marca.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas; texto de até ${LIMITE_DO_TEXTO} caracteres; `
      + `imagem JPG, PNG, WebP ou GIF de até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB. O arquivo é reconhecido pelo conteúdo, não pela extensão. `
      + 'PDF protegido por senha não pode ser marcado. O texto usa uma fonte padrão do PDF: letras com acento e a pontuação comum funcionam; '
      + 'setas, emojis e letras de outros alfabetos não. Texto grande demais para a página é reduzido para caber (o resultado avisa). '
      + 'A marca fica dentro do conteúdo da página e vale na impressão, mas NÃO é à prova de remoção: quem tiver um editor de PDF consegue tirá-la. '
      + 'Para esconder de verdade informações sensíveis, use a ferramenta de ocultar informações. '
      + 'Com a marca "abaixo do conteúdo", páginas com fundo colorido ou imagem em tela cheia (como escaneamentos) escondem a marca. '
      + 'Assinaturas digitais do PDF deixam de valer depois de marcar, porque o arquivo muda. '
      + 'A marca d\'água usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF e minha imagem são enviados para algum servidor?',
        r: 'Não. A biblioteca é baixada com a página e roda no seu navegador; os arquivos não saem do aparelho.',
      },
      {
        p: 'Dá para tirar a marca d\'água depois?',
        r: 'Quem receber o PDF e tiver um editor de PDF pode removê-la. Ela serve para identificar (rascunho, cópia, confidencial), não para impedir que o arquivo seja reaproveitado.',
      },
      {
        p: 'A marca sumiu em algumas páginas. Por quê?',
        r: 'Se você escolheu "abaixo do conteúdo", páginas com um fundo ou uma imagem em tela cheia cobrem a marca. Use "acima do conteúdo" com opacidade menor.',
      },
      {
        p: 'Como faço a marca cruzar a página na diagonal?',
        r: 'Deixe a posição no centro e a rotação em 45 graus (ou -45 para a diagonal contrária).',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let escolhaDaImagem;
    let execução;

    const opçõesDePosição = [];
    for (const [v, vertical] of [['cima', 'No topo'], ['meio', 'No meio'], ['baixo', 'Embaixo']]) {
      for (const [h, horizontal] of [['esquerda', 'à esquerda'], ['centro', 'no centro'], ['direita', 'à direita']]) {
        opçõesDePosição.push({ valor: `${v}-${h}`, rótulo: `${vertical}, ${horizontal}` });
      }
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Aplicar marca d\'água',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'tipo', rótulo: 'Tipo de marca', tipo: 'seleção', padrão: 'texto',
          opções: [{ valor: 'texto', rótulo: 'Texto' }, { valor: 'imagem', rótulo: 'Imagem' }],
        },
        { nome: 'texto', rótulo: 'Texto da marca', tipo: 'text', padrão: 'CONFIDENCIAL', exemplo: 'RASCUNHO' },
        {
          nome: 'fonte', rótulo: 'Fonte', tipo: 'seleção', padrão: 'helvetica-negrito',
          opções: [
            { valor: 'helvetica', rótulo: 'Helvetica (sem serifa)' },
            { valor: 'helvetica-negrito', rótulo: 'Helvetica negrito' },
            { valor: 'times', rótulo: 'Times (com serifa)' },
            { valor: 'times-negrito', rótulo: 'Times negrito' },
            { valor: 'courier', rótulo: 'Courier (máquina de escrever)' },
          ],
        },
        { nome: 'tamanho', rótulo: 'Tamanho da letra (pt)', tipo: 'número', padrão: '60', dica: `De ${TAMANHO_MÍN} a ${TAMANHO_MÁX}. Se não couber na página, a letra encolhe.` },
        {
          nome: 'cor', rótulo: 'Cor', tipo: 'seleção', padrão: 'cinza',
          opções: [
            { valor: 'cinza', rótulo: 'Cinza' }, { valor: 'preto', rótulo: 'Preto' }, { valor: 'vermelho', rótulo: 'Vermelho' },
            { valor: 'azul', rótulo: 'Azul' }, { valor: 'verde', rótulo: 'Verde' },
          ],
        },
        {
          nome: 'imagem', rótulo: 'Imagem da marca', tipo: 'file',
          dica: `JPG, PNG, WebP ou GIF, até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB. PNG com fundo transparente funciona bem para logotipos.`,
        },
        { nome: 'escala', rótulo: 'Largura da imagem (% da página)', tipo: 'número', padrão: '40', dica: `De ${ESCALA_MÍN} a ${ESCALA_MÁX}.` },
        { nome: 'opacidade', rótulo: 'Opacidade (%)', tipo: 'número', padrão: '50', dica: 'De 1 a 100. Quanto menor, mais transparente.' },
        { nome: 'rotação', rótulo: 'Rotação (graus)', tipo: 'número', padrão: '45', dica: 'De -180 a 180. Positivo gira para a esquerda.' },
        { nome: 'posição', rótulo: 'Posição', tipo: 'seleção', padrão: 'meio-centro', opções: opçõesDePosição },
        { nome: 'mosaico', rótulo: 'Repetir pela página inteira (mosaico)', tipo: 'caixa', padrão: false },
        {
          nome: 'camada', rótulo: 'Camada', tipo: 'seleção', padrão: 'acima',
          opções: [{ valor: 'acima', rótulo: 'Acima do conteúdo' }, { valor: 'abaixo', rótulo: 'Abaixo do conteúdo' }],
        },
        {
          nome: 'páginas', rótulo: 'Páginas', tipo: 'text', exemplo: 'Todas',
          dica: 'Em branco, todas. Exemplos: 2-3, 1 4 6-, pares, ímpares.',
        },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        const éImagem = dados.tipo === 'imagem';
        // Os números e a imagem são lidos antes de abrir o PDF: erro de digitação não deve custar a leitura de 100 MB.
        const opacidade = lerNúmero(dados, 'opacidade', { rótulo: 'Opacidade', mín: 1, máx: 100 });
        const rotação = lerNúmero(dados, 'rotação', { rótulo: 'Rotação', mín: -180, máx: 180 });
        const tamanho = éImagem ? 60 : lerNúmero(dados, 'tamanho', { rótulo: 'Tamanho da letra', mín: TAMANHO_MÍN, máx: TAMANHO_MÁX });
        const escala = éImagem ? lerNúmero(dados, 'escala', { rótulo: 'Largura da imagem', mín: ESCALA_MÍN, máx: ESCALA_MÁX }) : 40;
        const itemDaImagem = escolhaDaImagem.itens()[0];
        if (éImagem && !itemDaImagem) throw new ErroDeEntrada(mensagemDeErroDeMarcaDágua('sem_imagem'), 'imagem');

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }

          progresso.andar(undefined, 'Lendo os arquivos…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());
          const imagem = éImagem ? { nome: itemDaImagem.nome, bytes: new Uint8Array(await itemDaImagem.arquivo.arrayBuffer()) } : undefined;

          progresso.andar(undefined, 'Abrindo o PDF…');
          const r = await marcarPdf({ nome, bytes }, {
            biblioteca, tipo: éImagem ? 'imagem' : 'texto', texto: dados.texto ?? '', fonte: dados.fonte, tamanho, cor: dados.cor,
            imagem, escala, converter: converterImagemPelaTela, opacidade, rotação,
            posição: dados.posição ?? 'meio-centro', mosaico: dados.mosaico === 'sim', camada: dados.camada, páginas: dados.páginas ?? '',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(100 * página / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            throw new ErroDeEntrada(mensagemDeErroDeMarcaDágua(r.erro, { nome, ...r.extras }), campoDoErro(r.erro));
          }

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = [
            'A marca d\'água não é à prova de remoção: quem tiver um editor de PDF consegue tirá-la.',
            'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
          ];
          if (r.avisos.includes('camada_abaixo')) {
            observações.unshift('Com a marca abaixo do conteúdo, páginas com fundo ou imagem em tela cheia podem esconder a marca.');
          }
          if (r.avisos.includes('marca_reduzida')) {
            const quais = r.reduzidas.slice(0, 6).join(', ') + (r.reduzidas.length > 6 ? '…' : '');
            observações.unshift(`A marca foi reduzida para caber ${r.reduzidas.length === 1 ? 'na página' : 'nas páginas'} ${quais}.`);
          }
          return {
            valor: `Marca aplicada em ${textoDePáginas(r.marcadas.length)}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Marca', éImagem ? `imagem ${imagem.nome}` : dados.texto.trim()],
              ['Páginas marcadas', r.marcadas.length === r.páginas ? 'todas' : r.marcadas.slice(0, 12).join(', ') + (r.marcadas.length > 12 ? '…' : '')],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-marca`) }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo',
          rótuloDoBotão: 'Escolher PDF',
          accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido',
          textoDoVazio: 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão "Escolher PDF".',
          textoDeSolte: 'Solte o PDF para escolher.',
          validar: validarPdfDaEscolha,
        });
        escolhaDaImagem = montarEscolhaDeArquivos(elemento, {
          campo: 'imagem',
          rótuloDoBotão: 'Escolher imagem',
          accept: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
          rótuloDaLista: 'Imagem da marca d\'água',
          textoDoVazio: 'Nenhuma imagem escolhida ainda. Use o botão "Escolher imagem".',
          textoDeSolte: '',
          ícone: 'imagem',
          soltar: false,
          async validar(arquivo) {
            if (arquivo.size === 0) return { erro: mensagemDeErroDaImagem('imagem_vazia', { nome: arquivo.name }) };
            if (arquivo.size > TAMANHO_MÁXIMO_DA_IMAGEM) return { erro: mensagemDeErroDaImagem('imagem_grande_demais', { nome: arquivo.name }) };
            const começo = new Uint8Array(await arquivo.slice(0, 256 * 1024).arrayBuffer());
            const r = conferirImagem({ nome: arquivo.name, bytes: começo });
            // Cabeçalho cortado pelo limite da leitura: não recusa agora, o processamento decide.
            if (!r.ok && !(r.erro === 'imagem_corrompida' && arquivo.size > começo.length)) {
              return { erro: mensagemDeErroDaImagem(r.erro, { ...r.extras, nome: arquivo.name }) };
            }
            return { extra: r.ok ? `${número(r.info.largura)} × ${número(r.info.altura)} px` : undefined };
          },
        });
        execução = prepararExecução(elemento, { escolha: [escolha, escolhaDaImagem] });

        // Texto e imagem têm campos diferentes; o mosaico dispensa a posição.
        const campo = (nome) => elemento.querySelector(`[data-campo="${nome}"]`);
        const tipo = elemento.querySelector('#campo-tipo');
        const mosaico = elemento.querySelector('#campo-mosaico');
        const posição = elemento.querySelector('#campo-posição');
        function atualizar() {
          const éImagem = tipo.value === 'imagem';
          for (const nome of ['texto', 'fonte', 'tamanho', 'cor']) campo(nome).hidden = éImagem;
          campo('escala').hidden = !éImagem;
          escolhaDaImagem.mostrar(éImagem);
          posição.disabled = mosaico.checked;
          campo('posição').classList.toggle('campo--inativo', mosaico.checked);
        }
        tipo.addEventListener('change', atualizar);
        mosaico.addEventListener('change', atualizar);
        elemento.querySelector('#formulário').addEventListener('reset', () => setTimeout(atualizar, 0));
        elemento.querySelector('#campo-texto').maxLength = LIMITE_DO_TEXTO;
        atualizar();
      },
    });
  },
};
