/**
 * ZIP: compactar vários arquivos em um ZIP, ou abrir um ZIP, listar o que há dentro e baixar só o que você marcar.
 *
 * Tudo no navegador. As defesas contra ZIP bomba e contra nomes de caminho perigosos ("zip slip") ficam em
 * `cálculos/zip.js`; aqui mora só a tela.
 */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { avisar, criarProgresso } from '../núcleo/interface.js';
import { ícone } from '../núcleo/ícones.js';
import { prepararEscolhaDeArquivos } from './auxiliares/escolher-arquivos-avançadas.js';
import {
  LIMITES, ErroDeZip, criarZip, lerZip, extrairEntrada, conferirPedido, nomesParaCompactar, nomeParaBaixar, temCompressor,
} from '../cálculos/zip.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const plural = (n, um, vários) => `${número(n)} ${n === 1 ? um : vários}`;
const LINHAS_NA_TABELA = 100;
const ENTRADAS_MARCÁVEIS = 200;

function tamanhoLegível(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`;
}

/**
 * Compacta arquivos e monta o que a tela mostra. Exportada para os testes conferirem a tela sem navegador.
 * @param {{nome: string, bytes: Uint8Array, data?: Date}[]} arquivos
 * @param {{nomeDoZip?: string, comprimir?: boolean, aoProgredir?: (feitos: number, total: number) => void, cancelado?: () => boolean}} [opções]
 */
export async function compactarNaTela(arquivos, { nomeDoZip = '', comprimir = true, aoProgredir, cancelado } = {}) {
  const nomes = nomesParaCompactar(arquivos.map((a) => a.nome));
  let zip;
  try {
    zip = await criarZip(arquivos.map((a, i) => ({ ...a, nome: nomes[i] })), { comprimir, aoProgredir, cancelado });
  } catch (erro) {
    if (erro instanceof ErroDeZip) throw new ErroDeEntrada(erro.message, 'arquivo');
    throw erro;
  }
  const original = arquivos.reduce((t, a) => t + a.bytes.length, 0);
  const diferença = original - zip.bytes.length;
  const base = nomeDeArquivo(nomeDoZip.replace(/\.zip$/i, '') || (arquivos.length === 1 ? arquivos[0].nome.replace(/\.[^.]*$/, '') : 'arquivos'));
  const renomeados = nomes.filter((n, i) => n !== arquivos[i].nome).length;

  const observações = [];
  if (renomeados) observações.push(`${plural(renomeados, 'arquivo foi renomeado', 'arquivos foram renomeados')} (nome repetido ou com caracteres que o ZIP não aceita bem).`);
  if (comprimir && !temCompressor()) observações.push('Este navegador não tem o compressor nativo: os arquivos foram guardados sem compressão.');
  if (zip.método === 'stored' && comprimir && temCompressor()) observações.push('Os arquivos já eram comprimidos (JPG, PDF, vídeo, ZIP) e não diminuíram: ficaram guardados como estão.');
  observações.push('O ZIP não tem senha. A compactação aconteceu no seu navegador; nada foi enviado.');

  return {
    valor: `ZIP com ${plural(arquivos.length, 'arquivo', 'arquivos')}`,
    resumo: `${tamanhoLegível(original)} viraram ${tamanhoLegível(zip.bytes.length)}${diferença > 0 ? ` (${Math.round((diferença / original) * 100)}% menor)` : ''}.`,
    linhas: [
      ['Arquivos', número(arquivos.length)],
      ['Tamanho original', tamanhoLegível(original)],
      ['Tamanho do ZIP', tamanhoLegível(zip.bytes.length)],
      ['Compressão', zip.método === 'deflate' ? 'deflate (todos)' : zip.método === 'misto' ? `deflate em ${zip.comprimidos}, sem compressão nos demais` : 'sem compressão'],
    ],
    tabela: {
      cabeçalho: ['Arquivo no ZIP', 'Tamanho'],
      linhas: nomes.slice(0, LINHAS_NA_TABELA).map((n, i) => [n, tamanhoLegível(arquivos[i].bytes.length)]),
      semExportação: true,
    },
    arquivos: [{ rótulo: 'Baixar o ZIP', ícone: 'baixar', gerar: () => baixar(zip.bytes, `${base}.zip`, 'application/zip') }],
    observações,
    zipGerado: { nome: `${base}.zip`, bytes: zip.bytes, método: zip.método },
  };
}

/**
 * Lê um ZIP e monta a listagem. Exportada para os testes.
 * @param {Uint8Array} bytes
 */
export function listarNaTela(bytes) {
  let lido;
  try {
    lido = lerZip(bytes);
  } catch (erro) {
    if (erro instanceof ErroDeZip) throw new ErroDeEntrada(erro.message, 'arquivo');
    throw erro;
  }
  const { entradas, tamanhoTotal, avisos } = lido;
  const arquivos = entradas.filter((e) => !e.éPasta);
  const recusadas = arquivos.filter((e) => e.recusa);
  const pastas = entradas.length - arquivos.length;

  const observações = [...avisos];
  if (recusadas.length) {
    observações.push(`${plural(recusadas.length, 'entrada foi recusada', 'entradas foram recusadas')} e não pode ser baixada: ${recusadas.slice(0, 3).map((e) => `"${e.nomeExibido.slice(0, 40)}" (${e.recusa})`).join('; ')}${recusadas.length > 3 ? '; e outras' : ''}.`);
  }
  const executáveis = arquivos.filter((e) => e.aviso);
  if (executáveis.length) observações.push(`${plural(executáveis.length, 'arquivo é executável', 'arquivos são executáveis')}: abra só se confiar em quem enviou o ZIP.`);
  if (entradas.length > LINHAS_NA_TABELA) observações.push(`A lista mostra as ${LINHAS_NA_TABELA} primeiras entradas.`);
  observações.push('Nada foi extraído ainda. Marque os arquivos que quer e toque em "Baixar os marcados". Tudo acontece no seu navegador.');

  return {
    valor: `${plural(arquivos.length, 'arquivo', 'arquivos')} no ZIP`,
    resumo: `${tamanhoLegível(tamanhoTotal)} quando abertos${pastas ? `, em ${plural(pastas, 'pasta', 'pastas')}` : ''}.`,
    linhas: [
      ['Arquivos', número(arquivos.length)],
      ['Pastas', número(pastas)],
      ['Tamanho descompactado', tamanhoLegível(tamanhoTotal)],
      ['Entradas recusadas', número(recusadas.length)],
    ],
    tabela: {
      cabeçalho: ['Nome', 'Tamanho', 'Situação'],
      linhas: entradas.slice(0, LINHAS_NA_TABELA).map((e) => [
        e.nomeExibido.length > 60 ? `${e.nomeExibido.slice(0, 59)}…` : e.nomeExibido,
        e.éPasta ? '—' : tamanhoLegível(e.tamanho),
        e.éPasta ? 'pasta' : e.recusa ? `recusado: ${e.recusa}` : (e.aviso ? 'atenção: executável' : 'pode baixar'),
      ]),
      semExportação: true,
    },
    observações,
    entradas,
  };
}

/**
 * Extrai e entrega os arquivos marcados, um a um.
 * @param {Uint8Array} bytes o ZIP inteiro
 * @param {import('../cálculos/zip.js').EntradaDoZip[]} escolhidas
 * @param {{entregar: (bytes: Uint8Array, nome: string) => void, aoProgredir?: (n: number, total: number) => void, pausa?: () => Promise<void>}} saída
 */
export async function extrairMarcados(bytes, escolhidas, { entregar, aoProgredir = () => {}, pausa = () => Promise.resolve() }) {
  const recusa = conferirPedido(escolhidas);
  if (recusa) throw new ErroDeZip(recusa);
  for (const [i, entrada] of escolhidas.entries()) {
    aoProgredir(i, escolhidas.length);
    entregar(await extrairEntrada(bytes, entrada), nomeParaBaixar(entrada.nome));
    if (i + 1 < escolhidas.length) await pausa();
  }
  aoProgredir(escolhidas.length, escolhidas.length);
}

export default {
  instruções: {
    passos: [
      'Escolha o que fazer: "Compactar em ZIP" ou "Abrir um ZIP".',
      'Para compactar, escolha os arquivos (vários de uma vez) e toque em "Compactar". Baixe o ZIP pronto.',
      'Para abrir, escolha o ZIP. A lista mostra tudo o que há dentro, com o tamanho, antes de extrair qualquer coisa. Entradas suspeitas aparecem recusadas, com o motivo.',
      'Marque os arquivos que quer e toque em "Baixar os marcados". Eles são baixados um a um.',
    ],
    exemplo: {
      texto: 'Três arquivos (relatorio.pdf, planilha.xlsx e foto.jpg) viram "arquivos.zip". Como PDF, XLSX e JPG já são comprimidos, o ZIP fica do tamanho dos três juntos. '
        + 'Já uma pasta de textos de 1 MB costuma virar um ZIP de 300 a 400 KB.',
    },
    limites: `Até ${LIMITES.arquivos.toLocaleString('pt-BR')} arquivos e ${LIMITES.bytesTotais / 1024 / 1024} MB no total, ao compactar; ZIP de até ${LIMITES.bytesTotais / 1024 / 1024} MB, ao abrir, com arquivos de até ${LIMITES.bytesPorArquivo / 1024 / 1024} MB cada e até ${LIMITES.arquivosPorPedido} baixados por vez (${LIMITES.bytesPorPedido / 1024 / 1024} MB no total). `
      + 'ZIP protegido por senha NÃO é aberto, e o ZIP que você cria não tem senha. Não abre ZIP de mais de 4 GB (ZIP64), dividido em vários volumes, nem entradas que são atalhos (symlink). '
      + 'Defesas: o tamanho declarado no ZIP não é confiado (a extração para se sair mais do que o declarado), entradas que se sobrepõem e taxas de compressão impossíveis são recusadas, '
      + 'e nomes com "..", caminho absoluto, letra de unidade ou caracteres invisíveis são recusados. O arquivo baixado leva só o nome, nunca o caminho. Cada arquivo tem o CRC-32 conferido. '
      + 'Não extrai ZIP dentro de ZIP sozinho. As pastas não são recriadas: cada arquivo é baixado solto. Tudo roda no seu navegador, sem envio.',
    perguntas: [
      { p: 'Por que meu ZIP quase não ficou menor?', r: 'Porque JPG, PNG, PDF, MP3, vídeos, XLSX e DOCX já são comprimidos. O ZIP agrupa, mas quase não consegue reduzir. Texto, CSV e código encolhem bastante.' },
      { p: 'Posso abrir um ZIP com senha?', r: 'Não. Abra com o programa que o criou, que pede a senha, e salve uma cópia sem proteção.' },
      { p: 'O que significa "caminho suspeito"?', r: 'O nome da entrada tenta sair da pasta de destino (com "..") ou aponta para um lugar do sistema (como C:\\ ou /etc). Ela é recusada para o arquivo não ser gravado fora do lugar. O resto do ZIP continua disponível.' },
      { p: 'Por que a ferramenta recusou meu ZIP inteiro como "bomba"?', r: 'Porque o ZIP é montado de um jeito que reaproveita os mesmos dados várias vezes, ou declara tamanhos que não batem com o conteúdo. ZIPs normais não fazem isso; se o seu é de uma fonte confiável, gere-o de novo.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    let cancelar = false;
    let botãoCancelar;
    let botãoPrincipal;
    let último = null; // ZIP aberto na listagem atual

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Compactar',
      demorada: true,
      campos: [
        {
          nome: 'modo', rótulo: 'O que fazer', tipo: 'seleção', padrão: 'compactar',
          opções: [{ valor: 'compactar', rótulo: 'Compactar em ZIP' }, { valor: 'abrir', rótulo: 'Abrir um ZIP' }],
        },
        { nome: 'arquivo', rótulo: 'Arquivos', tipo: 'file', dica: `Até ${LIMITES.bytesTotais / 1024 / 1024} MB no total. Eles não saem do seu aparelho.` },
        { nome: 'nomeDoZip', rótulo: 'Nome do ZIP', tipo: 'text', exemplo: 'arquivos', dica: 'Opcional. A extensão .zip é acrescentada.' },
        { nome: 'comprimir', rótulo: 'Comprimir os arquivos (desmarque para só agrupar)', tipo: 'caixa', padrão: true },
      ],

      async calcular(dados) {
        const lista = escolha.atuais();
        if (!lista.length) {
          throw new ErroDeEntrada(dados.modo === 'abrir' ? 'Escolha o ZIP que você quer abrir.' : 'Escolha pelo menos um arquivo para compactar.', 'arquivo');
        }
        if (dados.modo === 'abrir') {
          const { bytes } = lista[0].dados;
          const saída = listarNaTela(bytes);
          último = { bytes, entradas: saída.entradas };
          setTimeout(() => desenharMarcação(saída.entradas), 0);
          return {
            ...saída,
            arquivos: [{ rótulo: 'Baixar os marcados', ícone: 'baixar', gerar: () => baixarMarcados() }],
          };
        }

        cancelar = false;
        escolha.travar(true);
        botãoPrincipal.disabled = true;
        botãoCancelar.hidden = false;
        try {
          progresso.andar(undefined, 'Lendo os arquivos…');
          const arquivos = [];
          for (const [i, item] of lista.entries()) {
            if (cancelar) {
              const erro = new Error('Operação cancelada.');
              erro.cancelado = true;
              throw erro;
            }
            progresso.andar(undefined, `Lendo ${item.nome}…`);
            arquivos.push({ nome: item.nome, bytes: new Uint8Array(await item.arquivo.arrayBuffer()), data: new Date(item.arquivo.lastModified) });
            progresso.andar(100 * (i + 1) / lista.length, `Arquivos lidos: ${i + 1} de ${lista.length}`);
          }
          try {
            const saída = await compactarNaTela(arquivos, {
              nomeDoZip: (dados.nomeDoZip ?? '').trim(),
              comprimir: dados.comprimir !== 'não',
              aoProgredir: (feitos, total) => progresso.andar(100 * feitos / total, `Compactando ${feitos} de ${total}…`),
              cancelado: () => cancelar,
            });
            if (cancelar) {
              const erro = new Error('Operação cancelada.');
              erro.cancelado = true;
              throw erro;
            }
            return saída;
          } catch (erro) {
            if (cancelar && erro?.cancelado !== true) {
              const cancelamento = new Error(erro instanceof Error ? erro.message : 'Operação cancelada.');
              cancelamento.cancelado = true;
              throw cancelamento;
            }
            throw erro;
          }
        } finally {
          escolha.travar(false);
          botãoPrincipal.disabled = false;
          botãoCancelar.hidden = true;
        }
      },

      aoMontar(elemento) {
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        const resultado = elemento.querySelector('#resultado');
        const formulário = elemento.querySelector('#formulário');
        const campo = (nome) => elemento.querySelector(`#campo-${nome}`);
        botãoPrincipal = formulário.querySelector('button[type="submit"]');

        botãoCancelar = document.createElement('button');
        botãoCancelar.type = 'button';
        botãoCancelar.className = 'botão botão--linha';
        botãoCancelar.hidden = true;
        botãoCancelar.innerHTML = `${ícone('fechar')}Cancelar`;
        botãoCancelar.addEventListener('click', () => { cancelar = true; });
        formulário.querySelector('.ações').append(botãoCancelar);
        formulário.addEventListener('reset', () => { cancelar = true; último = null; });

        const modo = () => campo('modo').value;
        escolha = prepararEscolhaDeArquivos(elemento, {
          múltiplos: true,
          máximoDeArquivos: LIMITES.arquivos,
          únicoAgora: () => modo() === 'abrir',
          aceitar: '',
          rótuloDoBotão: 'Escolher arquivos',
          rótuloParaTrocar: 'Escolher arquivos',
          ícone: 'caixa',
          textoDoVazio: 'Nenhum arquivo escolhido. Arraste os arquivos para este quadro ou use o botão.',
          textoDeSolte: 'Solte os arquivos aqui.',
          async conferir(arquivo, jáEscolhidos) {
            if (modo() === 'abrir') {
              if (arquivo.size > LIMITES.bytesTotais) return { ok: false, mensagem: `O ZIP passa de ${LIMITES.bytesTotais / 1024 / 1024} MB, o limite desta ferramenta.` };
              if (arquivo.size === 0) return { ok: false, mensagem: 'O arquivo está vazio.' };
              const bytes = new Uint8Array(await arquivo.arrayBuffer());
              try {
                const { entradas } = lerZip(bytes);
                return { ok: true, detalhe: `${plural(entradas.filter((e) => !e.éPasta).length, 'arquivo', 'arquivos')} dentro`, dados: { bytes } };
              } catch (erro) {
                if (erro instanceof ErroDeZip) return { ok: false, mensagem: erro.message };
                throw erro;
              }
            }
            const soma = jáEscolhidos.reduce((t, e) => t + e.tamanho, 0) + arquivo.size;
            if (soma > LIMITES.bytesTotais) return { ok: false, mensagem: `Com este arquivo, a soma passa de ${LIMITES.bytesTotais / 1024 / 1024} MB, o limite desta ferramenta.` };
            return { ok: true };
          },
          aoMudar(lista) {
            resultado.hidden = true;
            último = null;
            // Escolher o ZIP já mostra o que há dentro.
            if (modo() === 'abrir' && lista.length) botãoPrincipal.click();
          },
        });

        const ajustar = () => {
          const abrir = modo() === 'abrir';
          campo('nomeDoZip').closest('.campo').hidden = abrir;
          campo('comprimir').closest('.campo').hidden = abrir;
          campo('arquivo').closest('.campo').querySelector('label').textContent = abrir ? 'ZIP' : 'Arquivos';
          botãoPrincipal.innerHTML = `${ícone('confere')}${abrir ? 'Abrir ZIP' : 'Compactar'}`;
          campo('arquivo').accept = abrir ? '.zip,application/zip,application/x-zip-compressed' : '';
        };
        ajustar();
        campo('modo').addEventListener('change', () => { escolha.limpar(); resultado.hidden = true; último = null; ajustar(); });
        formulário.addEventListener('reset', () => setTimeout(ajustar, 0));
      },
    });

    /** Caixas de marcação com os arquivos do ZIP aberto (entradas recusadas ficam de fora). */
    function desenharMarcação(entradas) {
      const caixaDeResultado = raiz.querySelector('#resultado');
      if (!caixaDeResultado) return;
      caixaDeResultado.querySelector('[data-marcação]')?.remove();
      const marcáveis = entradas.filter((e) => !e.éPasta && !e.recusa);
      if (!marcáveis.length) return;
      const bloco = document.createElement('fieldset');
      bloco.dataset.marcação = 'sim';
      bloco.className = 'campo t-3';
      const legenda = document.createElement('legend');
      legenda.className = 'pequeno';
      legenda.textContent = marcáveis.length > ENTRADAS_MARCÁVEIS
        ? `Escolha o que baixar (mostrando ${ENTRADAS_MARCÁVEIS} de ${número(marcáveis.length)})`
        : 'Escolha o que baixar';
      bloco.append(legenda);
      const marcarTodos = marcáveis.length <= LIMITES.arquivosPorPedido;
      for (const entrada of marcáveis.slice(0, ENTRADAS_MARCÁVEIS)) {
        const linha = document.createElement('div');
        linha.className = 'campo--linha';
        const caixa = document.createElement('input');
        caixa.type = 'checkbox';
        caixa.id = `zip-entrada-${entrada.índice}`;
        caixa.dataset.zipEntrada = String(entrada.índice);
        caixa.checked = marcarTodos;
        const rótulo = document.createElement('label');
        rótulo.htmlFor = caixa.id;
        rótulo.textContent = `${entrada.nomeExibido.length > 70 ? `${entrada.nomeExibido.slice(0, 69)}…` : entrada.nomeExibido} · ${tamanhoLegível(entrada.tamanho)}`;
        linha.append(caixa, rótulo);
        bloco.append(linha);
      }
      const ações = document.createElement('div');
      ações.className = 'ações t-2';
      for (const [rótuloDoBotão, valor] of [['Marcar todos', true], ['Desmarcar todos', false]]) {
        const botão = document.createElement('button');
        botão.type = 'button';
        botão.className = 'botão botão--linha';
        botão.textContent = rótuloDoBotão;
        botão.addEventListener('click', () => { for (const c of bloco.querySelectorAll('input[type="checkbox"]')) c.checked = valor; });
        ações.append(botão);
      }
      bloco.append(ações);
      const primeira = [...caixaDeResultado.querySelectorAll('p.pequeno.suave')][0];
      if (primeira) primeira.before(bloco); else (caixaDeResultado.querySelector('.ações') ?? caixaDeResultado).before(bloco);
    }

    async function baixarMarcados() {
      if (!último) return;
      const índices = [...raiz.querySelectorAll('input[data-zip-entrada]:checked')].map((c) => Number(c.dataset.zipEntrada));
      const escolhidas = índices.map((i) => último.entradas[i]).filter(Boolean);
      try {
        await extrairMarcados(último.bytes, escolhidas, {
          entregar: (bytes, nome) => baixar(bytes, nome, 'application/octet-stream'),
          aoProgredir: (n, total) => { if (n === total) avisar(`${plural(total, 'arquivo baixado', 'arquivos baixados')}.`); },
          pausa: () => new Promise((resolver) => setTimeout(resolver, 350)),
        });
      } catch (erro) {
        if (erro instanceof ErroDeZip) avisar(erro.message, { duração: 6000 });
        else { console.error(erro); avisar('Não foi possível extrair o arquivo.'); }
      }
    }
  },
};
