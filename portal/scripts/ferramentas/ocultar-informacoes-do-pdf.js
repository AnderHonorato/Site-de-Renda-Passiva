/**
 * Ocultar informações do PDF: tarja preta que apaga de verdade. Cada página afetada vira imagem
 * (o texto original deixa de existir no arquivo); a conferência final prova isso antes de entregar.
 */
import { montarFerramenta, ErroDeEntrada, número as lerNúmero, nomeDeArquivo } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { ícone } from '../núcleo/ícones.js';
import { mostrarErro, limparErros, avisar } from '../núcleo/interface.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import {
  procurarNoPdf, ocultarInformações, mensagemDeErroDeOcultação, termosDe, textoDePáginas,
  DPIS, DPI_PADRÃO, LIMITE_DE_PÁGINAS_OCULTADAS, LIMITE_DE_TERMOS, LIMITE_DO_TERMO, LIMITE_DE_ACHADOS,
} from '../cálculos/ocultar-informacoes-do-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const SVG = 'http://www.w3.org/2000/svg';
function elementoSvg(nome, atributos = {}) {
  const e = document.createElementNS(SVG, nome);
  for (const [chave, valor] of Object.entries(atributos)) e.setAttribute(chave, String(valor));
  return e;
}

const PRÉVIA_LARGURA_MÁX = 560;
/** Menor área desenhada à mão, em pontos: um toque sem arrasto não cria tarja. */
const ÁREA_MÍNIMA = 4;
/** Tipos de dado da tela: nome do campo, chave do cálculo e rótulo da caixa. */
const TIPOS_DE_DADO = [
  ['cpf', 'cpf', 'Ocultar CPFs (só os de dígitos válidos)'], ['cnpj', 'cnpj', 'Ocultar CNPJs'], ['email', 'email', 'Ocultar e-mails'],
  ['telefone', 'telefone', 'Ocultar telefones'], ['cartao', 'cartão', 'Ocultar números de cartão'], ['cep', 'cep', 'Ocultar CEPs'],
  ['data', 'data', 'Ocultar datas (dd/mm/aaaa)'],
];

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor. A primeira página aparece numa prévia.',
      'Diga o que esconder: escreva palavras ou frases (uma por linha) e/ou marque tipos de dado como CPF, CNPJ, e-mail e telefone. Toque em "Procurar nos textos" e confira a lista e a prévia: desmarque o que não é para esconder. Para o que a busca não acha, use "Marcar área à mão" e desenhe a tarja na prévia, ou escreva páginas inteiras em "Ocultar páginas inteiras".',
      'Toque em "Ocultar e gerar PDF". As páginas afetadas viram imagem com a tarja pintada; as outras ficam como estão.',
      'Baixe o PDF e abra-o antes de compartilhar, para conferir. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um contrato de 3 páginas traz "PALAVRA-SECRETA-123" em todas e o CPF 529.982.247-25 na página 1. Procurando o termo e marcando CPF, a lista mostra 4 trechos; ao gerar, as 3 páginas viram imagem com tarjas pretas '
        + 'no lugar deles. No PDF gerado não dá para selecionar nem copiar texto dessas páginas, e o texto original não existe mais no arquivo (a ferramenta confere isso antes de entregar). O CPF fictício 123.456.789-00, de dígitos inválidos, não é marcado.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas; até ${LIMITE_DE_PÁGINAS_OCULTADAS} páginas afetadas por vez; até ${LIMITE_DE_TERMOS} termos de até ${LIMITE_DO_TERMO} caracteres; `
      + `até ${LIMITE_DE_ACHADOS.toLocaleString('pt-BR')} trechos achados. O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser lido: salve uma cópia sem proteção. `
      + 'COMO A TARJA APAGA: cada página afetada é desenhada como imagem, a tarja é pintada na imagem e o arquivo novo traz só a imagem no lugar da página. O texto dessas páginas deixa de existir no arquivo e deixa de ser selecionável (o PDF gerado também fica maior). '
      + 'As páginas que nada pediu para ocultar são copiadas como estão e continuam com texto. O arquivo gerado é um documento novo: título, autor, comentários, links, marcadores, anexos e campos de formulário do original NÃO vão junto. '
      + 'Antes de entregar, a ferramenta abre o arquivo gerado e confere que as páginas ocultadas não têm nenhum texto; se achar algum, não entrega o arquivo. '
      + 'A BUSCA SÓ ACHA TEXTO QUE O PDF GUARDA como texto. PDF ESCANEADO (cada página é uma foto) não tem texto para achar: marque a área à mão ou páginas inteiras. Termo partido em duas linhas por hífen, ou escrito com letras separadas, pode não ser achado. '
      + 'A posição de cada trecho é ESTIMADA (o PDF não diz onde fica cada letra): a tarja ganha uma folga, mas confira a prévia e o PDF gerado antes de compartilhar, e use "cobrir o pedaço de texto inteiro" ou marque a área à mão se precisar de mais margem. '
      + 'O CPF só é marcado se os dígitos de controle conferem; o mesmo vale para CNPJ e cartão. Não há detecção de nomes de pessoas ou endereços sem você escrevê-los. '
      + 'A resolução do desenho vai de 150 a 300 dpi: quanto maior, mais nítida a página e maior o arquivo. Fontes que não vêm dentro do PDF são trocadas pelas do seu aparelho ao desenhar. '
      + 'O desenho usa o leitor pdf.js (licença Apache 2.0) e o arquivo é montado com a pdf-lib (licença MIT), os dois dentro da página.',
    perguntas: [
      {
        p: 'A tarja apaga de verdade ou só cobre o texto?',
        r: 'Apaga. As páginas com tarja viram imagem, e o texto original delas não existe mais no arquivo: não dá para copiar nem recuperar por baixo da tarja. A ferramenta confere isso no arquivo gerado antes de entregar. Em contrapartida, essas páginas deixam de ter texto selecionável.',
      },
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. Os leitores são baixados com a página e rodam no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'A busca não achou o dado que quero esconder. E agora?',
        r: 'Ela só acha texto que o PDF guarda como texto. Em PDF escaneado, ou quando o dado está escrito de forma diferente, desenhe a tarja à mão na prévia ("Marcar área à mão") ou use "Ocultar páginas inteiras".',
      },
      {
        p: 'Por que a tarja às vezes cobre um pouco além do dado?',
        r: 'O PDF não informa a posição exata de cada letra, então a ferramenta a estima e deixa uma folga para não sobrar pedaço do dado. Confira a prévia e o arquivo gerado.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    /** Leitor da prévia (pdf.js) do arquivo escolhido, e o total de páginas. */
    let prévia = null;
    /** Resultado da última busca (null = não buscou, ou os critérios mudaram) e os ids marcados. */
    let achados = null;
    let selecionados = new Set();
    let áreas = [];
    let desenharPrévia = () => {};
    let atualizarLista = () => {};

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Ocultar e gerar PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'termos', rótulo: 'Palavras ou frases a ocultar (uma por linha)', tipo: 'área', linhas: 4, exemplo: 'Maria Souza Santos',
          dica: `Até ${LIMITE_DE_TERMOS} termos. A busca vale para o texto que o PDF guarda; em PDF escaneado, marque a área à mão.`,
        },
        ...TIPOS_DE_DADO.map(([nome, , rótulo]) => ({ nome: `tipo_${nome}`, rótulo, tipo: 'caixa', padrão: false })),
        { nome: 'ignorar', rótulo: 'Ignorar maiúsculas e acentos na busca', tipo: 'caixa', padrão: true },
        { nome: 'cobertura', rótulo: 'Cobrir o pedaço de texto inteiro (tarja maior e mais segura)', tipo: 'caixa', padrão: false },
        {
          nome: 'inteiras', rótulo: 'Ocultar páginas inteiras', tipo: 'text', exemplo: 'Nenhuma',
          dica: 'Em branco, nenhuma. Exemplos: 2, 1-3, 5-. A página inteira vira uma tarja.',
        },
        {
          nome: 'cor', rótulo: 'Cor da tarja', tipo: 'seleção', padrão: 'preto',
          opções: [{ valor: 'preto', rótulo: 'Preto' }, { valor: 'cinza-escuro', rótulo: 'Cinza escuro' }, { valor: 'branco', rótulo: 'Branco (apaga sem marcar)' }],
        },
        {
          nome: 'dpi', rótulo: 'Resolução das páginas ocultadas', tipo: 'seleção', padrão: String(DPI_PADRÃO),
          opções: DPIS.map((d) => ({ valor: String(d), rótulo: `${d} dpi${d === 150 ? ' (menor arquivo)' : d === 300 ? ' (mais nítida)' : ''}` })),
        },
        { nome: 'páginaPrévia', rótulo: 'Página da prévia', tipo: 'número', padrão: '1' },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        const dpi = lerNúmero(dados, 'dpi', { rótulo: 'Resolução', inteiro: true, mín: DPIS[0], máx: DPIS.at(-1) });
        const critério = lerCritério(dados);
        const temCritério = critério.termos.length > 0 || critério.expressões.length > 0;
        if (!temCritério && áreas.length === 0 && (dados.inteiras ?? '').trim() === '') {
          throw new ErroDeEntrada(mensagemDeErroDeOcultação('nada_para_ocultar'), 'termos');
        }

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(4, 'Preparando os leitores de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }
          progresso.andar(8, 'Lendo o arquivo…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          // Quem escreveu termos e não tocou em "Procurar" quer que eles sejam ocultados: busca agora e marca tudo.
          if (temCritério && achados === null) {
            const busca = await procurarNoPdf({ nome, bytes }, {
              abrir: abrirComPdfjsParaTexto, ...critério, cancelado: execução.cancelado,
              aoProgredir: ({ página, total }) => progresso.andar(10 + (25 * página) / total, `Procurando: página ${número(página)} de ${número(total)}`),
            });
            if (!busca.ok) lançar(busca, nome);
            achados = busca.achados;
            selecionados = new Set(achados.map((a) => a.id));
            atualizarLista();
          }

          const retângulos = [
            ...(achados ?? []).filter((a) => selecionados.has(a.id)).flatMap((a) => a.retângulos.map((r) => ({ página: a.página, ...r }))),
            ...áreas,
          ];
          progresso.andar(36, 'Desenhando as páginas com a tarja…');
          const r = await ocultarInformações({ nome, bytes }, {
            abrir: abrirComPdfjsParaTexto, biblioteca, retângulos, páginasInteiras: dados.inteiras ?? '', cor: dados.cor, dpi,
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(36 + (58 * página) / total, `Página ${número(página)} de ${número(total)} ocultada`),
          });
          if (!r.ok) lançar(r, nome);

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = [
            `${r.ocultadas.length === 1 ? 'A página ocultada virou' : 'As páginas ocultadas viraram'} imagem: o texto ${r.ocultadas.length === 1 ? 'dela' : 'delas'} deixou de existir no arquivo e deixou de ser selecionável.`,
            'A ferramenta abriu o arquivo gerado e conferiu que nenhuma página ocultada tem texto. Mesmo assim, abra o PDF e confira as tarjas antes de compartilhar.',
            'Título, autor, comentários, links, marcadores, anexos e campos de formulário do original não foram levados para o arquivo gerado.',
            'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
          ];
          if (r.reduzidas.length) observações.unshift(`A resolução foi reduzida na página ${r.reduzidas.slice(0, 8).join(', ')} para a imagem caber nos limites do navegador.`);
          return {
            valor: `${textoDePáginas(r.ocultadas.length)} ${r.ocultadas.length === 1 ? 'ocultada' : 'ocultadas'}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${número(r.tarjas)} ${r.tarjas === 1 ? 'tarja' : 'tarjas'} · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Páginas viradas em imagem', r.ocultadas.slice(0, 12).join(', ') + (r.ocultadas.length > 12 ? '…' : '')],
              ['Páginas copiadas como estão', r.copiadas.length ? (r.copiadas.length > 12 ? `${r.copiadas.length} páginas` : r.copiadas.join(', ')) : 'nenhuma'],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-ocultado`) }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        const campos = elemento.querySelector('.campos');
        const campo = (nome) => elemento.querySelector(`[data-campo="${nome}"]`);
        const entrada = (nome) => elemento.querySelector(`#campo-${nome}`);

        const aviso = document.createElement('p');
        aviso.className = 'pequeno t-2';
        aviso.setAttribute('role', 'note');
        aviso.innerHTML = `${ícone('escudo', { tamanho: 16 })} <strong>Tarja que apaga de verdade:</strong> as páginas afetadas viram imagem, então o texto delas deixa de existir no arquivo (e deixa de ser selecionável). `
          + '<strong>Confira a prévia e o PDF gerado</strong> antes de compartilhar: a posição do texto é estimada.';
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
            try {
              const documento = await abrirComPdfjsParaTexto(new Uint8Array(await arquivo.arrayBuffer()));
              if (documento.páginas > LIMITE_DE_PÁGINAS) {
                await documento.fechar();
                return { erro: mensagemDeErroDoPdfÚnico('pdf_páginas_demais', { nome: arquivo.name, total: documento.páginas }) };
              }
              await fecharPrévia();
              prévia = { documento, total: documento.páginas };
              entrada('páginaPrévia').value = '1';
              reiniciarBusca();
              áreas = [];
              return { extra: textoDePáginas(documento.páginas) };
            } catch (erro) {
              if (erro?.name === 'PasswordException') return { erro: mensagemDeErroDoPdfÚnico('pdf_protegido', { nome: arquivo.name }) };
              if (erro?.name === 'LeitorIndisponível') return {};
              return { erro: mensagemDeErroDoPdfÚnico('pdf_corrompido', { nome: arquivo.name }) };
            }
          },
          aoMudar: async (itens) => {
            if (itens.length === 0) {
              await fecharPrévia();
              áreas = [];
              reiniciarBusca();
            }
            desenharPrévia();
          },
        });
        execução = prepararExecução(elemento, { escolha });

        async function fecharPrévia() {
          const antiga = prévia;
          prévia = null;
          if (antiga) await antiga.documento.fechar().catch(() => {});
        }

        const botão = (rótulo, nomeDoÍcone) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'botão botão--linha';
          b.innerHTML = `${ícone(nomeDoÍcone)}${rótulo}`;
          return b;
        };

        /* ------------------------------------------------- busca */
        const botãoProcurar = botão('Procurar nos textos', 'busca');
        formulário.querySelector('.ações').prepend(botãoProcurar);
        const situação = document.createElement('p');
        situação.className = 'pequeno t-2';
        situação.setAttribute('role', 'status');
        situação.hidden = true;
        const lista = document.createElement('div');
        lista.className = 'prosa t-2';
        lista.hidden = true;
        lista.setAttribute('role', 'group');
        lista.setAttribute('aria-label', 'Trechos achados');
        formulário.querySelector('.ações').after(situação, lista);

        function reiniciarBusca() {
          achados = null;
          selecionados = new Set();
          atualizarLista();
        }

        atualizarLista = () => {
          lista.replaceChildren();
          if (achados === null) {
            lista.hidden = true;
            situação.hidden = true;
            return;
          }
          situação.hidden = false;
          const páginasComAchado = new Set(achados.map((a) => a.página)).size;
          situação.textContent = achados.length === 0
            ? 'Nada achado nos textos do PDF. Se o dado está numa imagem (PDF escaneado), marque a área à mão na prévia.'
            : `${número(achados.length)} ${achados.length === 1 ? 'trecho achado' : 'trechos achados'} em ${textoDePáginas(páginasComAchado)}. Desmarque o que não for para ocultar.`;
          lista.hidden = achados.length === 0;
          if (achados.length === 0) return;
          const barra = document.createElement('div');
          barra.className = 'ações t-2';
          const todos = botão('Marcar todos', 'confere');
          const nenhum = botão('Desmarcar todos', 'fechar');
          todos.addEventListener('click', () => { selecionados = new Set(achados.map((a) => a.id)); atualizarLista(); desenharPrévia(); });
          nenhum.addEventListener('click', () => { selecionados = new Set(); atualizarLista(); desenharPrévia(); });
          barra.append(todos, nenhum);
          lista.append(barra);
          for (const a of achados) {
            const linha = document.createElement('div');
            linha.className = 'campo campo--linha';
            const caixa = document.createElement('input');
            caixa.type = 'checkbox';
            caixa.id = `achado-${a.id}`;
            caixa.checked = selecionados.has(a.id);
            const rótulo = document.createElement('label');
            rótulo.htmlFor = caixa.id;
            rótulo.textContent = `Página ${a.página} · ${a.rótulo}: ${a.texto.length > 70 ? `${a.texto.slice(0, 70)}…` : a.texto}`;
            caixa.addEventListener('change', () => {
              if (caixa.checked) selecionados.add(a.id); else selecionados.delete(a.id);
              entrada('páginaPrévia').value = String(a.página);
              desenharPrévia();
            });
            linha.append(caixa, rótulo);
            lista.append(linha);
          }
        };

        function lerSeleçãoDeDados() {
          return TIPOS_DE_DADO.filter(([nome]) => entrada(`tipo_${nome}`).checked).map(([, chave]) => chave);
        }
        const critérioDaTela = () => ({
          termos: termosDe(entrada('termos').value),
          expressões: lerSeleçãoDeDados(),
          ignorarCaixa: entrada('ignorar').checked,
          ignorarAcentos: entrada('ignorar').checked,
          coberturaTotal: entrada('cobertura').checked,
        });
        botãoProcurar.addEventListener('click', async () => {
          limparErros(formulário);
          const itens = escolha.itens();
          if (itens.length === 0) { mostrarErro(campo('arquivo'), mensagemDeErroDoPdfÚnico('sem_arquivo')); return; }
          const critério = critérioDaTela();
          if (critério.termos.length === 0 && critério.expressões.length === 0) { mostrarErro(campo('termos'), mensagemDeErroDeOcultação('sem_critério')); return; }
          try {
            await execução.executar(async () => {
              const { progresso } = execução;
              progresso.iniciar('Procurando…');
              const { nome, arquivo } = itens[0];
              const busca = await procurarNoPdf({ nome, bytes: new Uint8Array(await arquivo.arrayBuffer()) }, {
                abrir: abrirComPdfjsParaTexto, ...critério, cancelado: execução.cancelado,
                aoProgredir: ({ página, total }) => progresso.andar(5 + (90 * página) / total, `Procurando: página ${número(página)} de ${número(total)}`),
              });
              if (!busca.ok) lançar(busca, nome);
              achados = busca.achados;
              selecionados = new Set(achados.map((a) => a.id));
              progresso.concluir('Busca concluída');
              atualizarLista();
              if (achados.length) entrada('páginaPrévia').value = String(achados[0].página);
              desenharPrévia();
            });
          } catch (erro) {
            tratarErroDaTela(erro);
          }
        });

        /** Erros de busca e de ocultação chegam como ErroDeEntrada (campo certo) ou Error (aviso). */
        function tratarErroDaTela(erro) {
          execução.progresso.esconder();
          const alvo = erro instanceof ErroDeEntrada && erro.campo ? campo(erro.campo) : null;
          if (alvo) mostrarErro(alvo, erro.message);
          else if (erro instanceof Error && erro.constructor === Error) avisar(erro.message);
          else { console.error(erro); avisar('Algo deu errado aqui dentro. Confira os valores e tente de novo.'); }
        }

        for (const nome of ['termos', 'ignorar', 'cobertura', ...TIPOS_DE_DADO.map(([n]) => `tipo_${n}`)]) {
          entrada(nome).addEventListener('input', () => { reiniciarBusca(); desenharPrévia(); });
        }

        /* ------------------------------------------ áreas à mão */
        const listaDasÁreas = document.createElement('div');
        listaDasÁreas.className = 'pequeno';
        listaDasÁreas.setAttribute('role', 'list');
        listaDasÁreas.setAttribute('aria-label', 'Áreas marcadas à mão');

        function desenharListaDeÁreas() {
          listaDasÁreas.replaceChildren();
          for (const [i, a] of áreas.entries()) {
            const linha = document.createElement('div');
            linha.setAttribute('role', 'listitem');
            linha.className = 'ferramenta-linha';
            const texto = document.createElement('span');
            texto.className = 'ferramenta-linha__texto';
            texto.textContent = `Área ${i + 1}: página ${a.página}, ${Math.round(a.largura)} × ${Math.round(a.altura)} pt`;
            const remover = document.createElement('button');
            remover.type = 'button';
            remover.className = 'ícone-botão';
            remover.setAttribute('aria-label', `Remover a área ${i + 1}`);
            remover.innerHTML = ícone('lixeira');
            remover.addEventListener('click', () => { áreas.splice(i, 1); desenharListaDeÁreas(); desenharPrévia(); });
            linha.append(texto, remover);
            listaDasÁreas.append(linha);
          }
        }

        /* ----------------------------------------------- prévia */
        const blocoDaPrévia = document.createElement('div');
        blocoDaPrévia.className = 't-3';
        blocoDaPrévia.hidden = true;
        const títuloDaPrévia = document.createElement('p');
        títuloDaPrévia.className = 'rótulo';
        const barraDaPrévia = document.createElement('div');
        barraDaPrévia.className = 'ações t-2';
        const anterior = botão('Página anterior', 'seta-baixo');
        const próxima = botão('Próxima página', 'seta-baixo');
        anterior.firstElementChild?.style.setProperty('transform', 'rotate(90deg)');
        próxima.firstElementChild?.style.setProperty('transform', 'rotate(-90deg)');
        const marcar = botão('Marcar área à mão', 'alvo');
        marcar.setAttribute('aria-pressed', 'false');
        barraDaPrévia.append(anterior, próxima, marcar);
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
        folha.setAttribute('aria-label', 'Prévia da página do PDF com as tarjas');
        const sobre = elementoSvg('svg', { role: 'group', 'aria-label': 'Tarjas na página', preserveAspectRatio: 'none' });
        sobre.style.position = 'absolute';
        sobre.style.inset = '0';
        sobre.style.width = '100%';
        sobre.style.height = '100%';
        // Fora do modo de marcar, o dedo rola a página normalmente por cima da prévia.
        sobre.style.touchAction = 'pan-y';
        moldura.append(folha, sobre);
        const legendaDaPrévia = document.createElement('p');
        legendaDaPrévia.className = 'pequeno suave';
        legendaDaPrévia.textContent = 'Preto: será coberto. Contorno tracejado: achado desmarcado, não será coberto. Para marcar uma área à mão, toque em "Marcar área à mão" e arraste sobre a página.';
        blocoDaPrévia.append(títuloDaPrévia, barraDaPrévia, moldura, legendaDaPrévia, listaDasÁreas);
        formulário.querySelector('.campos').after(blocoDaPrévia);

        let páginaDesenhada = 0;
        let tamanhoDaPágina = null;
        let sequência = 0;
        let marcando = false;
        let arrasto = null;

        const lerPágina = () => Math.min(Math.max(Math.round(paraNúmero(String(entrada('páginaPrévia').value).trim()) || 1), 1), prévia?.total ?? 1);

        function pintarTarjas() {
          sobre.replaceChildren();
          if (!tamanhoDaPágina) return;
          const n = lerPágina();
          const traço = tamanhoDaPágina.largura / 300;
          for (const a of achados ?? []) {
            if (a.página !== n) continue;
            const marcada = selecionados.has(a.id);
            for (const r of a.retângulos) {
              sobre.append(elementoSvg('rect', {
                x: r.x, y: r.y, width: r.largura, height: r.altura,
                fill: marcada ? '#000' : 'none', 'fill-opacity': 0.93, stroke: marcada ? '#d33' : '#888', 'stroke-width': traço, 'stroke-dasharray': marcada ? '0' : `${traço * 4} ${traço * 3}`,
              }));
            }
          }
          for (const a of áreas) {
            if (a.página !== n) continue;
            sobre.append(elementoSvg('rect', { x: a.x, y: a.y, width: a.largura, height: a.altura, fill: '#000', 'fill-opacity': 0.93, stroke: '#38f', 'stroke-width': traço }));
          }
          if (arrasto) {
            sobre.append(elementoSvg('rect', { x: arrasto.x, y: arrasto.y, width: arrasto.largura, height: arrasto.altura, fill: '#38f', 'fill-opacity': 0.25, stroke: '#38f', 'stroke-width': traço, 'stroke-dasharray': `${traço * 4} ${traço * 3}` }));
          }
        }

        async function desenharPágina() {
          const minha = ++sequência;
          if (!prévia) {
            blocoDaPrévia.hidden = true;
            tamanhoDaPágina = null;
            return;
          }
          blocoDaPrévia.hidden = false;
          const n = lerPágina();
          títuloDaPrévia.textContent = `Prévia: página ${n} de ${prévia.total}`;
          anterior.disabled = n <= 1;
          próxima.disabled = n >= prévia.total;
          if (n !== páginaDesenhada || !tamanhoDaPágina) {
            try {
              const tamanho = await prévia.documento.desenharNaTela(n, folha, Math.min(PRÉVIA_LARGURA_MÁX, moldura.clientWidth || PRÉVIA_LARGURA_MÁX) * Math.min(window.devicePixelRatio || 1, 2));
              if (minha !== sequência) return;
              páginaDesenhada = n;
              tamanhoDaPágina = tamanho;
              sobre.setAttribute('viewBox', `0 0 ${tamanho.largura} ${tamanho.altura}`);
            } catch {
              tamanhoDaPágina = null;
              legendaDaPrévia.textContent = 'Não foi possível desenhar a prévia desta página. A busca e a ocultação continuam funcionando.';
            }
          }
          pintarTarjas();
        }
        desenharPrévia = () => {
          if (prévia && tamanhoDaPágina && páginaDesenhada === lerPágina()) pintarTarjas();
          else desenharPágina();
        };

        const irPara = (n) => { entrada('páginaPrévia').value = String(n); desenharPágina(); };
        anterior.addEventListener('click', () => irPara(Math.max(lerPágina() - 1, 1)));
        próxima.addEventListener('click', () => irPara(Math.min(lerPágina() + 1, prévia?.total ?? 1)));
        entrada('páginaPrévia').addEventListener('change', desenharPágina);

        marcar.addEventListener('click', () => {
          marcando = !marcando;
          marcar.setAttribute('aria-pressed', String(marcando));
          sobre.style.touchAction = marcando ? 'none' : 'pan-y';
          sobre.style.cursor = marcando ? 'crosshair' : 'default';
        });
        const naPágina = (evento) => {
          const caixa = sobre.getBoundingClientRect();
          return [
            Math.min(Math.max(((evento.clientX - caixa.left) / caixa.width) * tamanhoDaPágina.largura, 0), tamanhoDaPágina.largura),
            Math.min(Math.max(((evento.clientY - caixa.top) / caixa.height) * tamanhoDaPágina.altura, 0), tamanhoDaPágina.altura),
          ];
        };
        let início = null;
        sobre.addEventListener('pointerdown', (evento) => {
          if (!marcando || !tamanhoDaPágina || evento.button > 0) return;
          início = naPágina(evento);
          arrasto = { x: início[0], y: início[1], largura: 0, altura: 0 };
          sobre.setPointerCapture(evento.pointerId);
          evento.preventDefault();
        });
        sobre.addEventListener('pointermove', (evento) => {
          if (!início) return;
          const [x, y] = naPágina(evento);
          arrasto = { x: Math.min(x, início[0]), y: Math.min(y, início[1]), largura: Math.abs(x - início[0]), altura: Math.abs(y - início[1]) };
          pintarTarjas();
        });
        const terminar = () => {
          if (!início) return;
          const nova = arrasto;
          início = null;
          arrasto = null;
          if (nova && nova.largura >= ÁREA_MÍNIMA && nova.altura >= ÁREA_MÍNIMA) áreas.push({ página: lerPágina(), ...nova });
          desenharListaDeÁreas();
          pintarTarjas();
        };
        sobre.addEventListener('pointerup', terminar);
        sobre.addEventListener('pointercancel', terminar);

        formulário.addEventListener('reset', () => {
          áreas = [];
          marcando = false;
          marcar.setAttribute('aria-pressed', 'false');
          setTimeout(() => { reiniciarBusca(); desenharListaDeÁreas(); desenharPrévia(); }, 0);
        });
      },
    });

    /** Critério de busca a partir dos dados do formulário (a tela e `calcular` usam o mesmo). */
    function lerCritério(dados) {
      return {
        termos: termosDe(dados.termos),
        expressões: TIPOS_DE_DADO.filter(([nome]) => dados[`tipo_${nome}`] === 'sim').map(([, chave]) => chave),
        ignorarCaixa: dados.ignorar === 'sim',
        ignorarAcentos: dados.ignorar === 'sim',
        coberturaTotal: dados.cobertura === 'sim',
      };
    }

    /** Traduz a recusa de busca ou de ocultação para a tela: aviso (cancelar, rede) ou erro no campo certo. */
    function lançar(r, nome) {
      if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
      if (r.erro === 'leitor_indisponível') throw new Error(mensagemDeErroDeOcultação(r.erro));
      if (r.erro === 'verificação_falhou' || r.erro === 'página_com_erro' || r.erro === 'saída_grande') throw new Error(mensagemDeErroDeOcultação(r.erro, r.extras));
      const campos = {
        sem_critério: 'termos', termos_demais: 'termos', termo_longo: 'termos', achados_demais: 'termos', nada_para_ocultar: 'termos',
        dpi_inválido: 'dpi', cor_inválida: 'cor', páginas_demais_ocultar: 'inteiras',
      };
      const campo = r.erro.startsWith('faixa_') ? 'inteiras' : (campos[r.erro] ?? 'arquivo');
      throw new ErroDeEntrada(mensagemDeErroDeOcultação(r.erro, { nome, ...r.extras }), campo);
    }
  },
};
