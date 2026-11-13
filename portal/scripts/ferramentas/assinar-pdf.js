/**
 * Assinar PDF: desenhe, digite ou use uma imagem de assinatura e coloque-a na página, no próprio navegador.
 * É uma marca visual: NÃO é assinatura digital com certificado (ICP-Brasil).
 */
import { montarFerramenta, ErroDeEntrada, número as lerNúmero, nomeDeArquivo } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { ícone } from '../núcleo/ícones.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import { conferirImagem, mensagemDeErroDaImagem, TAMANHO_MÁXIMO_DA_IMAGEM, exifTrocaOsLados } from '../cálculos/imagens-em-pdf.js';
import {
  assinarPdf, proporçãoDoTexto, mensagemDeErroDeAssinatura, textoDePáginas, TINTAS,
  LARGURA_MÍN, LARGURA_MÁX, LIMITE_DO_TEXTO, LIMITE_DA_LEGENDA, LIMITE_DE_TRAÇOS, LIMITE_DE_PONTOS, ALTURA_MÁXIMA_DA_ASSINATURA,
} from '../cálculos/assinar-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';
import { converterImagemPelaTela } from './auxiliares/converter-imagem.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const SVG = 'http://www.w3.org/2000/svg';
function elementoSvg(nome, atributos = {}) {
  const e = document.createElementNS(SVG, nome);
  for (const [chave, valor] of Object.entries(atributos)) e.setAttribute(chave, String(valor));
  return e;
}

/** Quadro de desenho: tamanho lógico em pixels de desenho e espessura da caneta. */
const QUADRO = { largura: 600, altura: 220, espessura: 2.5 };
const PRÉVIA_LARGURA_MÁX = 560;

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro) {
  if (erro.startsWith('desenho_') || erro === 'tipo_inválido') return 'modo';
  if (erro.startsWith('texto_')) return 'texto';
  if (erro === 'fonte_inválida') return 'fonte';
  if (erro.startsWith('legenda_')) return 'legenda';
  if (erro.startsWith('imagem_') || erro === 'sem_imagem') return 'imagem';
  if (erro.startsWith('faixa_')) return 'páginas';
  const direto = { largura_inválida: 'largura', posição_inválida: 'esquerda', cor_inválida: 'cor' };
  return direto[erro] ?? 'arquivo';
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor. A primeira página aparece numa prévia.',
      'Escolha como assinar: "Desenhar" (com o dedo ou o mouse, no quadro), "Digitar" (o seu nome numa letra inclinada) ou "Imagem" (uma foto da sua assinatura em papel, de preferência PNG com fundo transparente).',
      'Toque na prévia ou arraste a assinatura até o lugar certo; dá para ajustar também pelos campos de posição e de largura. Use "Assinar nas páginas" para repetir em outras páginas, como 1-3, última ou todas. Se quiser, escreva um nome ou cargo e marque a data abaixo da assinatura.',
      'Toque em "Assinar PDF" e baixe o arquivo. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um contrato de 3 páginas, assinatura digitada "Maria Teste" com 25% da largura da página, no canto de baixo à direita da página 3 (campo "Assinar nas páginas": 3) e a data 06/10/2026 escrita embaixo: '
        + 'só a página 3 muda, e o nome aparece como uma assinatura inclinada naquele canto. Com "todas" nas páginas, as 3 páginas ganham a assinatura no mesmo lugar.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas; imagem JPG, PNG, WebP ou GIF de até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB; `
      + `texto de até ${LIMITE_DO_TEXTO} caracteres; desenho de até ${LIMITE_DE_TRAÇOS} traços; largura de ${LARGURA_MÍN}% a ${LARGURA_MÁX}% da página. O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser assinado. `
      + 'IMPORTANTE: isto NÃO é assinatura digital com certificado (como a do ICP-Brasil). É apenas uma marca visual, como uma assinatura carimbada na folha: ela não prova quem assinou, não registra data e hora confiáveis e não avisa se o documento for alterado depois. '
      + 'Se quem recebe o documento exige assinatura digital com certificado, use um serviço de assinatura com certificado; esta ferramenta não substitui isso. '
      + 'A assinatura digitada usa uma letra inclinada padrão do PDF (sem fontes novas): letras com acento e a pontuação comum funcionam; setas, emojis e letras de outros alfabetos não. '
      + 'Numa imagem JPG ou PNG com fundo branco, o branco some sobre o papel; com fundo colorido, use a imagem recortada. Se o PDF já tem assinatura digital, assinar de novo a invalida. '
      + 'O desenho e o texto entram como vetor (nítidos em qualquer zoom). A biblioteca usada é a pdf-lib (licença MIT) e a prévia usa o leitor pdf.js (licença Apache 2.0), os dois dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF e minha assinatura são enviados para algum servidor?',
        r: 'Não. As bibliotecas são baixadas com a página e rodam no seu navegador; o arquivo e a assinatura não saem do aparelho, e nada fica guardado.',
      },
      {
        p: 'Essa assinatura vale como assinatura digital?',
        r: 'Não é uma assinatura digital com certificado, como a do ICP-Brasil. É uma marca visual na página, que não prova quem assinou nem detecta alterações. Se o destinatário exige certificado, use um serviço próprio para isso.',
      },
      {
        p: 'Posso assinar em mais de uma página?',
        r: 'Sim. Em "Assinar nas páginas" escreva, por exemplo, 1-3, 5, última ou todas. A assinatura fica no mesmo lugar, em proporção, em cada página.',
      },
      {
        p: 'Minha assinatura em imagem saiu com um quadro branco em volta. E agora?',
        r: 'O branco da imagem some sobre a página; se sobrou um quadro, ele não é branco puro. Recorte a imagem, salve em PNG com fundo transparente e tente de novo, ou desmarque a opção do fundo.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let escolhaDaImagem;
    let execução;

    /** Estado das partes que a tela controla fora dos campos. */
    let prévia = null; // {documento, total}
    let traços = [];
    let informaçãoDaImagem = null; // {largura, altura, url}
    let desenharPrévia = () => {};
    let proporçãoDoTextoAtual = 4;
    let bibliotecaDePdf = null;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Assinar PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'modo', rótulo: 'Como assinar', tipo: 'seleção', padrão: 'texto',
          opções: [{ valor: 'texto', rótulo: 'Digitar o nome' }, { valor: 'desenho', rótulo: 'Desenhar com o dedo ou o mouse' }, { valor: 'imagem', rótulo: 'Usar uma imagem' }],
        },
        { nome: 'texto', rótulo: 'Texto da assinatura', tipo: 'text', exemplo: 'Maria Teste' },
        {
          nome: 'fonte', rótulo: 'Estilo da letra', tipo: 'seleção', padrão: 'times-itálico',
          opções: [
            { valor: 'times-itálico', rótulo: 'Times itálico' }, { valor: 'times-negrito-itálico', rótulo: 'Times negrito itálico' },
            { valor: 'helvetica-itálico', rótulo: 'Helvetica inclinada' }, { valor: 'courier-itálico', rótulo: 'Courier inclinada' },
          ],
        },
        {
          nome: 'imagem', rótulo: 'Imagem da assinatura', tipo: 'file',
          dica: `JPG, PNG, WebP ou GIF, até ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB. PNG com fundo transparente funciona melhor.`,
        },
        { nome: 'fundo', rótulo: 'Fazer o branco da imagem sumir sobre a página', tipo: 'caixa', padrão: true },
        {
          nome: 'cor', rótulo: 'Cor da tinta (desenho e texto)', tipo: 'seleção', padrão: 'preto',
          opções: [{ valor: 'preto', rótulo: 'Preto' }, { valor: 'azul', rótulo: 'Azul' }, { valor: 'vermelho', rótulo: 'Vermelho' }, { valor: 'verde', rótulo: 'Verde' }],
        },
        { nome: 'largura', rótulo: 'Largura da assinatura (% da página)', tipo: 'número', padrão: '25', dica: `De ${LARGURA_MÍN} a ${LARGURA_MÁX}.` },
        { nome: 'esquerda', rótulo: 'Distância da borda esquerda (%)', tipo: 'número', padrão: '60', dica: 'De 0 a 100. Toque ou arraste na prévia para posicionar.' },
        { nome: 'topo', rótulo: 'Distância do topo (%)', tipo: 'número', padrão: '80', dica: 'De 0 a 100.' },
        { nome: 'páginaPrévia', rótulo: 'Página da prévia', tipo: 'número', padrão: '1' },
        {
          nome: 'páginas', rótulo: 'Assinar nas páginas', tipo: 'text', exemplo: 'Só a da prévia',
          dica: 'Em branco, só a página da prévia. Exemplos: 1-3, 5, última, todas.',
        },
        { nome: 'legenda', rótulo: 'Texto abaixo da assinatura (opcional)', tipo: 'text', exemplo: 'Maria da Silva, diretora' },
        { nome: 'data', rótulo: 'Escrever a data de hoje abaixo da assinatura', tipo: 'caixa', padrão: false },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        const modo = dados.modo;
        // Os números são lidos antes de abrir o PDF: erro de digitação não deve custar a leitura de 100 MB.
        const largura = lerNúmero(dados, 'largura', { rótulo: 'Largura da assinatura', mín: LARGURA_MÍN, máx: LARGURA_MÁX });
        const esquerda = lerNúmero(dados, 'esquerda', { rótulo: 'Distância da borda esquerda', mín: 0, máx: 100 });
        const topo = lerNúmero(dados, 'topo', { rótulo: 'Distância do topo', mín: 0, máx: 100 });
        const páginaPrévia = lerNúmero(dados, 'páginaPrévia', { rótulo: 'Página da prévia', mín: 1, inteiro: true, obrigatório: false, padrão: 1 });
        const itemDaImagem = escolhaDaImagem.itens()[0];
        if (modo === 'imagem' && !itemDaImagem) throw new ErroDeEntrada(mensagemDeErroDeAssinatura('sem_imagem'), 'imagem');
        if (modo === 'desenho' && traços.length === 0) throw new ErroDeEntrada(mensagemDeErroDeAssinatura('desenho_vazio'), 'modo');
        if (modo === 'texto' && !(dados.texto ?? '').trim()) throw new ErroDeEntrada(mensagemDeErroDeAssinatura('texto_vazio'), 'texto');
        if ((dados.legenda ?? '').length > LIMITE_DA_LEGENDA) throw new ErroDeEntrada(mensagemDeErroDeAssinatura('legenda_longa'), 'legenda');

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando a biblioteca de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }
          progresso.andar(undefined, 'Lendo os arquivos…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());
          let assinatura;
          if (modo === 'desenho') assinatura = { tipo: 'desenho', traços, espessura: QUADRO.espessura };
          else if (modo === 'texto') assinatura = { tipo: 'texto', texto: dados.texto, fonte: dados.fonte };
          else {
            assinatura = {
              tipo: 'imagem', imagem: { nome: itemDaImagem.nome, bytes: new Uint8Array(await itemDaImagem.arquivo.arrayBuffer()) },
              converter: converterImagemPelaTela, fundoTransparente: dados.fundo === 'sim',
            };
          }

          progresso.andar(undefined, 'Abrindo o PDF…');
          const páginas = (dados.páginas ?? '').trim() || String(prévia ? Math.min(páginaPrévia, prévia.total) : páginaPrévia);
          const r = await assinarPdf({ nome, bytes }, {
            biblioteca, assinatura, cor: dados.cor, esquerda, topo, largura, páginas, legenda: dados.legenda ?? '',
            data: dados.data === 'sim' ? new Date().toLocaleDateString('pt-BR') : '',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(100 * página / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            throw new ErroDeEntrada(mensagemDeErroDeAssinatura(r.erro, { nome, ...r.extras }), campoDoErro(r.erro));
          }

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = [
            'Isto é uma marca visual, não uma assinatura digital com certificado (ICP-Brasil): ela não prova quem assinou nem avisa se o documento for alterado depois.',
            'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
          ];
          if (r.avisos.includes('assinatura_existente')) observações.unshift('Este PDF já tinha uma assinatura digital. Ao assiná-lo de novo, essa assinatura deixa de valer.');
          if (r.avisos.includes('assinatura_ajustada')) {
            observações.unshift(`Em ${r.ajustadas.length === 1 ? 'uma página' : `${r.ajustadas.length} páginas`} a assinatura foi movida ou reduzida para caber dentro da página.`);
          }
          const nomeDoModo = { texto: 'digitada', desenho: 'desenhada', imagem: 'em imagem' }[modo];
          return {
            valor: `Assinatura em ${textoDePáginas(r.assinadas.length)}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Assinatura', nomeDoModo],
              ['Páginas assinadas', r.assinadas.length === r.páginas ? 'todas' : r.assinadas.slice(0, 12).join(', ') + (r.assinadas.length > 12 ? '…' : '')],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-assinado`) }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        const campos = elemento.querySelector('.campos');
        const campo = (nome) => elemento.querySelector(`[data-campo="${nome}"]`);
        const entrada = (nome) => elemento.querySelector(`#campo-${nome}`);

        // O aviso fica antes de qualquer campo: é a coisa que mais importa saber sobre esta assinatura.
        const aviso = document.createElement('p');
        aviso.className = 'pequeno t-2';
        aviso.setAttribute('role', 'note');
        aviso.innerHTML = `${ícone('alerta', { tamanho: 16 })} <strong>Atenção:</strong> esta é uma marca visual, <strong>não</strong> uma assinatura digital com certificado (ICP-Brasil). `
          + 'Ela não prova quem assinou nem avisa se o documento for alterado depois.';
        campos.before(aviso);

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
            // Abre já na escolha: senha ou dano aparecem agora, e a prévia usa o mesmo leitor.
            try {
              const documento = await abrirComPdfjsParaTexto(new Uint8Array(await arquivo.arrayBuffer()));
              if (documento.páginas > LIMITE_DE_PÁGINAS) {
                await documento.fechar();
                return { erro: mensagemDeErroDoPdfÚnico('pdf_páginas_demais', { nome: arquivo.name, total: documento.páginas }) };
              }
              await fecharPrévia();
              prévia = { documento, total: documento.páginas };
              entrada('páginaPrévia').value = '1';
              return { extra: textoDePáginas(documento.páginas) };
            } catch (erro) {
              if (erro?.name === 'PasswordException') return { erro: mensagemDeErroDoPdfÚnico('pdf_protegido', { nome: arquivo.name }) };
              if (erro?.name === 'LeitorIndisponível') return {}; // sem prévia; o erro aparece ao assinar
              return { erro: mensagemDeErroDoPdfÚnico('pdf_corrompido', { nome: arquivo.name }) };
            }
          },
          aoMudar: async (itens) => {
            if (itens.length === 0) await fecharPrévia();
            desenharPrévia();
          },
        });

        escolhaDaImagem = montarEscolhaDeArquivos(elemento, {
          campo: 'imagem',
          rótuloDoBotão: 'Escolher imagem',
          accept: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
          rótuloDaLista: 'Imagem da assinatura',
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
            if (r.ok) {
              const trocada = exifTrocaOsLados(r.info.orientação ?? 1);
              if (informaçãoDaImagem?.url) URL.revokeObjectURL(informaçãoDaImagem.url);
              informaçãoDaImagem = {
                largura: trocada ? r.info.altura : r.info.largura, altura: trocada ? r.info.largura : r.info.altura, url: URL.createObjectURL(arquivo),
              };
            }
            return { extra: r.ok ? `${número(r.info.largura)} × ${número(r.info.altura)} px` : undefined };
          },
          aoMudar: (itens) => {
            if (itens.length === 0 && informaçãoDaImagem) {
              URL.revokeObjectURL(informaçãoDaImagem.url);
              informaçãoDaImagem = null;
            }
            desenharPrévia();
          },
        });
        execução = prepararExecução(elemento, { escolha: [escolha, escolhaDaImagem] });

        async function fecharPrévia() {
          const antiga = prévia;
          prévia = null;
          if (antiga) await antiga.documento.fechar().catch(() => {});
        }

        /* --------------------------------------------- quadro de desenho */
        const quadro = document.createElement('div');
        quadro.className = 't-2';
        const quadroRótulo = document.createElement('p');
        quadroRótulo.className = 'rótulo';
        quadroRótulo.id = 'rótulo-do-quadro';
        quadroRótulo.textContent = 'Desenhe a sua assinatura aqui';
        const tela = document.createElement('canvas');
        tela.width = QUADRO.largura;
        tela.height = QUADRO.altura;
        tela.setAttribute('role', 'img');
        tela.setAttribute('aria-labelledby', 'rótulo-do-quadro');
        // A tela deve capturar o dedo sem rolar a página; estas propriedades só existem como estilo, não como atributo.
        tela.style.touchAction = 'none';
        tela.style.width = '100%';
        tela.style.maxWidth = `${QUADRO.largura}px`;
        tela.style.height = 'auto';
        tela.style.border = '1px dashed currentColor';
        tela.style.borderRadius = '8px';
        tela.style.cursor = 'crosshair';
        tela.style.display = 'block';
        tela.style.background = '#ffffff';
        const barra = document.createElement('div');
        barra.className = 'ações t-2';
        const botão = (rótulo, nomeDoÍcone) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'botão botão--linha';
          b.innerHTML = `${ícone(nomeDoÍcone)}${rótulo}`;
          return b;
        };
        const desfazer = botão('Desfazer o último traço', 'atualizar');
        const limparDesenho = botão('Limpar o quadro', 'lixeira');
        barra.append(desfazer, limparDesenho);
        const notaDoQuadro = document.createElement('p');
        notaDoQuadro.className = 'pequeno suave';
        notaDoQuadro.textContent = 'Sem mouse nem toque? Escolha "Digitar o nome" em "Como assinar".';
        quadro.append(quadroRótulo, tela, barra, notaDoQuadro);
        campo('texto').before(quadro);

        const contextoDoQuadro = tela.getContext('2d');
        function pintarQuadro() {
          contextoDoQuadro.fillStyle = '#ffffff';
          contextoDoQuadro.fillRect(0, 0, tela.width, tela.height);
          const [r, g, b] = TINTAS[entrada('cor').value] ?? TINTAS.preto;
          contextoDoQuadro.strokeStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
          contextoDoQuadro.lineWidth = QUADRO.espessura;
          contextoDoQuadro.lineCap = 'round';
          contextoDoQuadro.lineJoin = 'round';
          for (const traço of traços) {
            contextoDoQuadro.beginPath();
            contextoDoQuadro.moveTo(traço[0][0], traço[0][1]);
            if (traço.length === 1) contextoDoQuadro.lineTo(traço[0][0] + 0.01, traço[0][1]);
            for (const [x, y] of traço.slice(1)) contextoDoQuadro.lineTo(x, y);
            contextoDoQuadro.stroke();
          }
        }
        const pontosNoQuadro = () => traços.reduce((s, t) => s + t.length, 0);
        const ponto = (evento) => {
          const caixa = tela.getBoundingClientRect();
          return [
            Math.round(Math.min(Math.max((evento.clientX - caixa.left) * (tela.width / caixa.width), 0), tela.width) * 10) / 10,
            Math.round(Math.min(Math.max((evento.clientY - caixa.top) * (tela.height / caixa.height), 0), tela.height) * 10) / 10,
          ];
        };
        let desenhando = false;
        tela.addEventListener('pointerdown', (evento) => {
          if (evento.button > 0 || traços.length >= LIMITE_DE_TRAÇOS || pontosNoQuadro() >= LIMITE_DE_PONTOS) return;
          desenhando = true;
          tela.setPointerCapture(evento.pointerId);
          traços.push([ponto(evento)]);
          pintarQuadro();
          evento.preventDefault();
        });
        tela.addEventListener('pointermove', (evento) => {
          if (!desenhando || pontosNoQuadro() >= LIMITE_DE_PONTOS) return;
          const p = ponto(evento);
          const atual = traços.at(-1);
          const último = atual.at(-1);
          if (Math.hypot(p[0] - último[0], p[1] - último[1]) < 0.8) return;
          atual.push(p);
          pintarQuadro();
        });
        const terminar = () => {
          if (!desenhando) return;
          desenhando = false;
          desenharPrévia();
        };
        tela.addEventListener('pointerup', terminar);
        tela.addEventListener('pointercancel', terminar);
        desfazer.addEventListener('click', () => { traços.pop(); pintarQuadro(); desenharPrévia(); });
        limparDesenho.addEventListener('click', () => { traços = []; pintarQuadro(); desenharPrévia(); });
        entrada('cor').addEventListener('change', () => { pintarQuadro(); desenharPrévia(); });
        pintarQuadro();

        /* ---------------------------------------------------- prévia */
        const blocoDaPrévia = document.createElement('div');
        blocoDaPrévia.className = 't-3';
        blocoDaPrévia.hidden = true;
        const títuloDaPrévia = document.createElement('p');
        títuloDaPrévia.className = 'rótulo';
        const cabeçalho = document.createElement('div');
        cabeçalho.className = 'ações t-2';
        const anterior = botão('Página anterior', 'seta-baixo');
        const próxima = botão('Próxima página', 'seta-baixo');
        anterior.firstElementChild?.setAttribute('aria-hidden', 'true');
        cabeçalho.append(anterior, próxima);
        const moldura = document.createElement('div');
        moldura.style.position = 'relative';
        moldura.style.width = '100%';
        moldura.style.maxWidth = `${PRÉVIA_LARGURA_MÁX}px`;
        moldura.style.lineHeight = '0';
        const folha = document.createElement('canvas');
        folha.style.width = '100%';
        folha.style.height = 'auto';
        folha.style.display = 'block';
        folha.style.background = '#ffffff';
        folha.style.border = '1px solid currentColor';
        folha.setAttribute('role', 'img');
        folha.setAttribute('aria-label', 'Prévia da página do PDF');
        const sobre = elementoSvg('svg', { role: 'group', 'aria-label': 'Posição da assinatura na página' });
        sobre.style.position = 'absolute';
        sobre.style.inset = '0';
        sobre.style.width = '100%';
        sobre.style.height = '100%';
        sobre.style.touchAction = 'none';
        sobre.style.cursor = 'crosshair';
        sobre.setAttribute('preserveAspectRatio', 'none');
        moldura.append(folha, sobre);
        const legendaDaPrévia = document.createElement('p');
        legendaDaPrévia.className = 'pequeno suave';
        legendaDaPrévia.textContent = 'A prévia é aproximada: o arquivo usa as medidas exatas da página. Toque ou arraste para mover a assinatura; as setas do teclado também movem quando a assinatura está em foco.';
        blocoDaPrévia.append(títuloDaPrévia, cabeçalho, moldura, legendaDaPrévia);
        campos.after(blocoDaPrévia);

        let páginaDesenhada = 0;
        let tamanhoDaPágina = null; // pontos
        let sequência = 0;

        const lerCampo = (nome, padrão) => {
          const v = paraNúmero(String(entrada(nome).value).trim());
          return Number.isFinite(v) ? v : padrão;
        };
        const escreverCampo = (nome, valor) => {
          entrada(nome).value = String(Math.round(valor * 10) / 10).replace('.', ',');
          entrada(nome).dispatchEvent(new Event('input', { bubbles: true }));
        };

        /** Proporção (largura ÷ altura) da assinatura que está para sair. */
        function proporção() {
          const modo = entrada('modo').value;
          if (modo === 'desenho' && traços.length) {
            const xs = traços.flat().map((p) => p[0]);
            const ys = traços.flat().map((p) => p[1]);
            const l = Math.max(Math.max(...xs) - Math.min(...xs), 1) + 2 * QUADRO.espessura;
            const a = Math.max(Math.max(...ys) - Math.min(...ys), 1) + 2 * QUADRO.espessura;
            return l / a;
          }
          if (modo === 'imagem' && informaçãoDaImagem) return informaçãoDaImagem.largura / informaçãoDaImagem.altura;
          return proporçãoDoTextoAtual;
        }

        function pintarAssinatura() {
          for (const filho of [...sobre.querySelectorAll('[data-assinatura]')]) filho.remove();
          if (!tamanhoDaPágina) return;
          const { largura: W, altura: H } = tamanhoDaPágina;
          const largPct = Math.min(Math.max(lerCampo('largura', 25), LARGURA_MÍN), LARGURA_MÁX);
          let w = (W * largPct) / 100;
          let h = w / proporção();
          if (h > H * ALTURA_MÁXIMA_DA_ASSINATURA) { h = H * ALTURA_MÁXIMA_DA_ASSINATURA; w = h * proporção(); }
          const x = Math.min(Math.max((W * lerCampo('esquerda', 60)) / 100, 0), Math.max(W - w, 0));
          const y = Math.min(Math.max((H * lerCampo('topo', 80)) / 100, 0), Math.max(H - h, 0));
          const grupo = elementoSvg('g', { 'data-assinatura': 'sim', tabindex: '0', role: 'img', 'aria-label': `Assinatura a ${Math.round(lerCampo('esquerda', 60))}% da esquerda e ${Math.round(lerCampo('topo', 80))}% do topo` });
          grupo.style.cursor = 'move';
          grupo.append(elementoSvg('rect', { x, y, width: w, height: h, fill: 'currentColor', 'fill-opacity': 0.06, stroke: 'currentColor', 'stroke-dasharray': `${W / 100} ${W / 200}`, 'stroke-width': W / 300 }));
          const modo = entrada('modo').value;
          const [r, g, b] = TINTAS[entrada('cor').value] ?? TINTAS.preto;
          const tinta = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
          if (modo === 'desenho' && traços.length) {
            const xs = traços.flat().map((p) => p[0]);
            const ys = traços.flat().map((p) => p[1]);
            const minX = Math.min(...xs) - QUADRO.espessura;
            const maxY = Math.max(...ys) + QUADRO.espessura;
            const esc = w / ((Math.max(Math.max(...xs) - Math.min(...xs), 1)) + 2 * QUADRO.espessura);
            for (const traço of traços) {
              const pontos = traço.map(([px, py]) => `${x + (px - minX) * esc},${y + h - (maxY - py) * esc}`).join(' ');
              grupo.append(elementoSvg('polyline', { points: traço.length === 1 ? `${pontos} ${pontos}` : pontos, fill: 'none', stroke: tinta, 'stroke-width': QUADRO.espessura * esc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
            }
          } else if (modo === 'imagem' && informaçãoDaImagem) {
            grupo.append(elementoSvg('image', { href: informaçãoDaImagem.url, x, y, width: w, height: h, preserveAspectRatio: 'none' }));
          } else if (modo === 'texto') {
            const t = elementoSvg('text', { x, y: y + h * 0.78, fill: tinta, 'font-size': h * 0.8, 'font-style': 'italic', 'font-family': 'Times New Roman, Times, serif', textLength: w, lengthAdjust: 'spacingAndGlyphs' });
            if (entrada('fonte').value.includes('negrito')) t.setAttribute('font-weight', 'bold');
            t.textContent = entrada('texto').value || 'Sua assinatura';
            grupo.append(t);
          }
          sobre.append(grupo);
          grupo.addEventListener('keydown', (evento) => {
            const passo = evento.shiftKey ? 5 : 1;
            const mover = { ArrowLeft: ['esquerda', -passo], ArrowRight: ['esquerda', passo], ArrowUp: ['topo', -passo], ArrowDown: ['topo', passo] }[evento.key];
            if (!mover) return;
            evento.preventDefault();
            escreverCampo(mover[0], Math.min(Math.max(lerCampo(mover[0], 0) + mover[1], 0), 100));
            sobre.querySelector('[data-assinatura]')?.focus();
          });
        }

        async function desenharPágina() {
          const minha = ++sequência;
          if (!prévia) {
            blocoDaPrévia.hidden = true;
            tamanhoDaPágina = null;
            return;
          }
          blocoDaPrévia.hidden = false;
          const n = Math.min(Math.max(Math.round(lerCampo('páginaPrévia', 1)), 1), prévia.total);
          títuloDaPrévia.textContent = `Prévia: página ${n} de ${prévia.total}`;
          anterior.disabled = n <= 1;
          próxima.disabled = n >= prévia.total;
          try {
            if (n !== páginaDesenhada || !tamanhoDaPágina) {
              const tamanho = await prévia.documento.desenharNaTela(n, folha, Math.min(PRÉVIA_LARGURA_MÁX, moldura.clientWidth || PRÉVIA_LARGURA_MÁX) * Math.min(window.devicePixelRatio || 1, 2));
              if (minha !== sequência) return;
              páginaDesenhada = n;
              tamanhoDaPágina = tamanho;
              sobre.setAttribute('viewBox', `0 0 ${tamanho.largura} ${tamanho.altura}`);
            }
          } catch {
            tamanhoDaPágina = null;
            legendaDaPrévia.textContent = 'Não foi possível desenhar a prévia desta página. Você ainda pode assinar usando os campos de posição.';
          }
          pintarAssinatura();
        }

        desenharPrévia = () => {
          if (prévia && tamanhoDaPágina && páginaDesenhada === Math.min(Math.max(Math.round(lerCampo('páginaPrévia', 1)), 1), prévia.total)) pintarAssinatura();
          else desenharPágina();
        };

        // Toque e arraste na prévia: o centro da assinatura segue o dedo.
        let arrastando = false;
        function moverPara(evento) {
          if (!tamanhoDaPágina) return;
          const caixa = sobre.getBoundingClientRect();
          const { largura: W, altura: H } = tamanhoDaPágina;
          const px = ((evento.clientX - caixa.left) / caixa.width) * W;
          const py = ((evento.clientY - caixa.top) / caixa.height) * H;
          const largPct = Math.min(Math.max(lerCampo('largura', 25), LARGURA_MÍN), LARGURA_MÁX);
          const w = (W * largPct) / 100;
          const h = w / proporção();
          escreverCampo('esquerda', Math.min(Math.max(((px - w / 2) / W) * 100, 0), 100));
          escreverCampo('topo', Math.min(Math.max(((py - h / 2) / H) * 100, 0), 100));
        }
        sobre.addEventListener('pointerdown', (evento) => {
          if (evento.button > 0) return;
          arrastando = true;
          sobre.setPointerCapture(evento.pointerId);
          moverPara(evento);
          evento.preventDefault();
        });
        sobre.addEventListener('pointermove', (evento) => { if (arrastando) moverPara(evento); });
        const soltar = () => { arrastando = false; };
        sobre.addEventListener('pointerup', soltar);
        sobre.addEventListener('pointercancel', soltar);

        const irParaPágina = (n) => { entrada('páginaPrévia').value = String(n); desenharPágina(); };
        anterior.addEventListener('click', () => irParaPágina(Math.max(Math.round(lerCampo('páginaPrévia', 1)) - 1, 1)));
        próxima.addEventListener('click', () => irParaPágina(Math.min(Math.round(lerCampo('páginaPrévia', 1)) + 1, prévia?.total ?? 1)));
        // O ícone da seta aponta para baixo: gira para virar "anterior" e "próxima".
        anterior.firstElementChild?.style.setProperty('transform', 'rotate(90deg)');
        próxima.firstElementChild?.style.setProperty('transform', 'rotate(-90deg)');
        entrada('páginaPrévia').addEventListener('change', desenharPágina);
        for (const nome of ['largura', 'esquerda', 'topo', 'fonte', 'texto', 'cor']) entrada(nome).addEventListener('input', async () => {
          if (nome === 'texto' || nome === 'fonte') {
            try {
              bibliotecaDePdf ??= await carregarBiblioteca();
              proporçãoDoTextoAtual = await proporçãoDoTexto(bibliotecaDePdf, entrada('texto').value, entrada('fonte').value);
            } catch { /* sem biblioteca, a prévia usa a última proporção conhecida */ }
          }
          pintarAssinatura();
        });

        /* ------------------------------------ campos de cada modo */
        function atualizar() {
          const modo = entrada('modo').value;
          quadro.hidden = modo !== 'desenho';
          campo('texto').hidden = modo !== 'texto';
          campo('fonte').hidden = modo !== 'texto';
          // Caixas de marcar não levam data-campo: o bloco é o pai da própria caixa.
          entrada('fundo').closest('.campo').hidden = modo !== 'imagem';
          campo('cor').hidden = modo === 'imagem';
          escolhaDaImagem.mostrar(modo === 'imagem');
          pintarAssinatura();
        }
        entrada('modo').addEventListener('change', atualizar);
        entrada('texto').maxLength = LIMITE_DO_TEXTO;
        entrada('legenda').maxLength = LIMITE_DA_LEGENDA;
        formulário.addEventListener('reset', () => {
          traços = [];
          setTimeout(() => { pintarQuadro(); atualizar(); desenharPrévia(); }, 0);
        });
        window.addEventListener('pagehide', () => { if (informaçãoDaImagem) URL.revokeObjectURL(informaçãoDaImagem.url); });
        atualizar();
      },
    });
  },
};
