/**
 * Converter planilha: CSV, TSV e JSON entre si e para XLSX, tudo no navegador.
 *
 * Lê arquivo ou texto colado. Gera arquivo para baixar e, nos formatos de texto, também para copiar.
 * XLS, ODS e a leitura de XLSX ficam de fora: exigiriam uma biblioteca de planilhas que o portal não tem.
 */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { prepararEscolhaDeArquivos } from './auxiliares/escolher-arquivos-avançadas.js';
import {
  LIMITES, FORMATOS_DE_ENTRADA, FORMATOS_DE_SAÍDA, ErroDePlanilha,
  recusarSeNãoForTexto, decodificarTexto, detectarFormato, lerTabela, converterTabela, contarFórmulasProtegidas,
} from '../cálculos/converter-planilha.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const plural = (n, um, vários) => `${número(n)} ${n === 1 ? um : vários}`;
const LINHAS_NA_PRÉVIA = 20;
const COLUNAS_NA_PRÉVIA = 12;
const LIMITE_PARA_COPIAR = 2_000_000;

const TEXTO_DE_EXEMPLO = ['nome;cidade;cep', 'Ana;São Paulo;01310-000', 'Bruno;Recife;50030-230'].join('\n');
const nomeDoFormato = (f) => FORMATOS_DE_ENTRADA[f] ?? f.toUpperCase();

function tamanhoLegível(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Converte e monta o que a tela mostra. Exportada para os testes conferirem a tela sem navegador.
 * @param {{
 *   bytes?: Uint8Array, nome?: string, texto?: string,
 *   formatoDeEntrada?: string, separador?: string, comCabeçalho?: boolean,
 *   formatoDeSaída: string, separadorDeSaída?: string, comBom?: boolean, detectarTipos?: boolean,
 * }} entrada
 */
export function converterNaTela(entrada) {
  const {
    bytes, nome = '', formatoDeEntrada = 'auto', separador = 'auto', comCabeçalho = true,
    formatoDeSaída, separadorDeSaída = ';', comBom = true, detectarTipos = false,
  } = entrada;

  let texto = entrada.texto ?? '';
  let codificação = 'UTF-8';
  if (bytes) {
    if (bytes.length > LIMITES.bytes) throw new ErroDeEntrada(`O arquivo passa de ${LIMITES.bytes / 1024 / 1024} MB.`, 'arquivo');
    const recusa = recusarSeNãoForTexto(bytes);
    if (recusa) throw new ErroDeEntrada(recusa, 'arquivo');
    ({ texto, codificação } = decodificarTexto(bytes));
  } else if (texto.length > LIMITES.bytes) {
    throw new ErroDeEntrada(`O texto passa de ${LIMITES.bytes / 1024 / 1024} milhões de caracteres. Use o botão de arquivo.`, 'conteúdo');
  }
  if (!texto.trim()) {
    throw new ErroDeEntrada(bytes ? 'O arquivo não tem conteúdo.' : 'Escolha um arquivo ou cole o conteúdo da planilha.', bytes ? 'arquivo' : 'conteúdo');
  }

  const formato = formatoDeEntrada === 'auto' ? detectarFormato(texto, nome) : formatoDeEntrada;
  let tabela;
  let convertido;
  try {
    tabela = lerTabela(texto, { formato, separador, comCabeçalho });
    convertido = converterTabela(tabela, { formato: formatoDeSaída, separador: separadorDeSaída, comBom, detectarTipos, nomeDaAba: nome.replace(/\.[^.]*$/, '') || 'Planilha' });
  } catch (erro) {
    if (erro instanceof ErroDePlanilha) throw new ErroDeEntrada(erro.message, erro.campo === 'conteúdo' && bytes ? 'arquivo' : erro.campo);
    throw erro;
  }

  const saída = FORMATOS_DE_SAÍDA[formatoDeSaída];
  const conteúdo = convertido.bytes ?? convertido.texto;
  const tamanho = convertido.bytes ? convertido.bytes.length : new TextEncoder().encode(convertido.texto).length;
  const base = nomeDeArquivo(nome.replace(/\.[^.]*$/, '') || 'planilha');
  const protegidas = formatoDeSaída === 'csv' || formatoDeSaída === 'tsv' ? contarFórmulasProtegidas(tabela) : 0;

  const colunasMostradas = Math.min(tabela.colunas, COLUNAS_NA_PRÉVIA);
  const cabeçalhoDaPrévia = (tabela.cabeçalho ?? Array.from({ length: tabela.colunas }, (_, i) => `Coluna ${i + 1}`)).slice(0, colunasMostradas);
  const linhasDaPrévia = tabela.linhas.slice(0, LINHAS_NA_PRÉVIA).map((l) => l.slice(0, colunasMostradas).map((c) => String(c)));

  const observações = [...tabela.avisos];
  if (tabela.linhas.length > LINHAS_NA_PRÉVIA || tabela.colunas > COLUNAS_NA_PRÉVIA) {
    observações.push(`A prévia mostra as ${LINHAS_NA_PRÉVIA} primeiras linhas e as ${COLUNAS_NA_PRÉVIA} primeiras colunas; o arquivo traz tudo.`);
  }
  if (protegidas) {
    observações.push(`${plural(protegidas, 'célula começava', 'células começavam')} com =, +, - ou @ e ${protegidas === 1 ? 'recebeu' : 'receberam'} um apóstrofo à frente no ${saída.rótulo.split(' ')[0]}, para o Excel não executar como fórmula.`);
  }
  if (codificação !== 'UTF-8') observações.push(`O arquivo estava em ${codificação}; a saída sai em UTF-8, e os acentos foram preservados.`);
  if (formatoDeSaída === 'xlsx') observações.push('O XLSX leva só os valores (texto e números), sem fórmulas, formatação nem várias abas.');
  if (!detectarTipos && ['json', 'json-linhas', 'xlsx'].includes(formatoDeSaída) && formato !== 'json') {
    observações.push('Os valores saem como texto: converter tipos sozinho estragaria CEP, telefone e códigos com zero à esquerda. Marque "Converter números" se quiser números.');
  }
  observações.push('A conversão aconteceu no seu navegador; nada foi enviado.');

  const copiável = convertido.texto !== undefined && convertido.texto.length <= LIMITE_PARA_COPIAR;
  const textoParaColar = (t, tipos) => (t.linhas.length * t.colunas <= 100_000 ? converterTabela(t, { formato: 'tsv', comBom: false, detectarTipos: tipos }).texto : undefined);
  return {
    valor: `${plural(tabela.linhas.length, 'linha', 'linhas')} × ${plural(tabela.colunas, 'coluna', 'colunas')}`,
    resumo: `${nomeDoFormato(formato)} para ${saída.rótulo}${tabela.cabeçalho ? ', com a primeira linha como cabeçalho' : ', sem cabeçalho'}.`,
    linhas: [
      ['Entrada', `${nomeDoFormato(formato)}${nome ? ` (${nome})` : ''}`],
      ['Codificação lida', codificação],
      ['Saída', saída.rótulo],
      ['Tamanho gerado', tamanhoLegível(tamanho)],
    ],
    // O texto copiado é o arquivo de saída; no XLSX, que é binário, é a tabela em TSV, que o Excel cola em células.
    texto: copiável ? convertido.texto : (convertido.bytes ? textoParaColar(tabela, detectarTipos) : undefined),
    tabela: { cabeçalho: cabeçalhoDaPrévia, linhas: linhasDaPrévia, semExportação: true },
    arquivos: [{
      rótulo: `Baixar ${saída.rótulo.split(' ')[0]}`,
      ícone: 'baixar',
      gerar: () => baixar(conteúdo, `${base}.${saída.extensão}`, saída.tipo),
    }],
    observações,
    arquivoGerado: { nome: `${base}.${saída.extensão}`, tipo: saída.tipo, conteúdo, tamanho },
    tabelaLida: tabela,
  };
}

export default {
  instruções: {
    passos: [
      'Escolha um arquivo CSV, TSV ou JSON, ou cole o conteúdo da planilha na caixa (dá para copiar as células direto do Excel).',
      'Escolha o formato de saída: CSV, TSV, JSON ou XLSX. O formato de entrada e o separador são detectados sozinhos; se errar, escolha à mão.',
      'Confira a prévia e toque em "Baixar". Nos formatos de texto, "Copiar" leva o resultado para a área de transferência.',
    ],
    exemplo: {
      texto: 'O CSV "nome;cidade;cep" com as linhas "Ana;São Paulo;01310-000" e "Bruno;Recife;50030-230" vira, em JSON, uma lista de dois objetos com os campos nome, cidade e cep. '
        + 'O CEP continua "01310-000" (texto). Em XLSX, o resultado é uma planilha de 2 linhas de dados e 3 colunas, com o cabeçalho destacado.',
    },
    limites: `Arquivos de até ${LIMITES.bytes / 1024 / 1024} MB, ${número(LIMITES.linhas)} linhas e ${número(LIMITES.colunas)} colunas; o XLSX gerado vai até ${número(LIMITES.células)} células. `
      + 'Lê CSV, TSV e JSON (lista de objetos ou lista de listas), em UTF-8, UTF-16 ou Windows-1252 (o "CSV" do Excel em português). Não lê XLSX, XLS nem ODS: abra a planilha no Excel ou no LibreOffice e salve como CSV. '
      + 'Saem só os valores: fórmulas, formatação, gráficos, macros e várias abas não são levados, e o XLSX gerado tem uma aba. '
      + 'Valores de CSV/TSV são texto; marque "Converter números" para gravar números e verdadeiro/falso no JSON e no XLSX (números com zero à esquerda, como "007", continuam texto). '
      + 'No CSV e no TSV, célula de texto que começa com =, +, - ou @ ganha um apóstrofo, para o Excel não rodá-la como fórmula. '
      + 'Cabeçalhos repetidos ganham sufixo (nome, nome_2). Tudo roda no seu navegador, sem envio.',
    perguntas: [
      { p: 'Posso converter um XLSX em CSV?', r: 'Ainda não: esta ferramenta não lê XLSX. No Excel, use Arquivo > Salvar como > CSV UTF-8 e depois converta aqui para JSON, TSV ou outro CSV.' },
      { p: 'Por que meu CSV abre com os acentos errados no Excel?', r: 'O Excel precisa da marca de codificação (BOM) no começo do arquivo UTF-8. A opção vem marcada por padrão; desmarque só se o programa de destino reclamar dela.' },
      { p: 'Por que "007" não virou número?', r: 'Porque número com zero à esquerda costuma ser código (CEP, telefone, SKU), e virar número apagaria o zero. Ele só vira número se não tiver zero à esquerda.' },
      { p: 'O que acontece com linhas de tamanhos diferentes?', r: 'Elas são completadas com células vazias até a largura da maior linha, e a tela avisa quantas foram ajustadas.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter',
      campos: [
        { nome: 'arquivo', rótulo: 'Arquivo (CSV, TSV ou JSON)', tipo: 'file', dica: `Até ${LIMITES.bytes / 1024 / 1024} MB. Ele não sai do seu aparelho.` },
        { nome: 'conteúdo', rótulo: 'Ou cole o conteúdo aqui', tipo: 'área', linhas: 6, exemplo: TEXTO_DE_EXEMPLO },
        { nome: 'formatoDeEntrada', rótulo: 'Formato de entrada', tipo: 'seleção', padrão: 'auto', opções: Object.entries(FORMATOS_DE_ENTRADA).map(([valor, rótulo]) => ({ valor, rótulo })) },
        {
          nome: 'separador', rótulo: 'Separador do CSV de entrada', tipo: 'seleção', padrão: 'auto',
          opções: [
            { valor: 'auto', rótulo: 'Detectar sozinho' }, { valor: ';', rótulo: 'Ponto e vírgula' },
            { valor: ',', rótulo: 'Vírgula' }, { valor: '\t', rótulo: 'Tabulação' }, { valor: '|', rótulo: 'Barra vertical' },
          ],
        },
        { nome: 'formatoDeSaída', rótulo: 'Converter para', tipo: 'seleção', padrão: 'json', opções: Object.entries(FORMATOS_DE_SAÍDA).map(([valor, f]) => ({ valor, rótulo: f.rótulo })) },
        {
          nome: 'separadorDeSaída', rótulo: 'Separador do CSV de saída', tipo: 'seleção', padrão: ';',
          opções: [{ valor: ';', rótulo: 'Ponto e vírgula (Excel em português)' }, { valor: ',', rótulo: 'Vírgula' }],
        },
        { nome: 'comCabeçalho', rótulo: 'A primeira linha é o cabeçalho', tipo: 'caixa', padrão: true },
        { nome: 'detectarTipos', rótulo: 'Converter números e verdadeiro/falso (JSON e XLSX)', tipo: 'caixa', padrão: false },
        { nome: 'comBom', rótulo: 'Marca de codificação (BOM) no CSV, para o Excel ler os acentos', tipo: 'caixa', padrão: true },
      ],

      async calcular(dados) {
        const escolhido = escolha.atuais()[0];
        if (!escolhido && !dados.conteúdo?.trim()) throw new ErroDeEntrada('Escolha um arquivo ou cole o conteúdo da planilha.', 'arquivo');
        return converterNaTela({
          bytes: escolhido?.dados.bytes, nome: escolhido?.nome ?? '', texto: dados.conteúdo,
          formatoDeEntrada: dados.formatoDeEntrada, separador: dados.separador, comCabeçalho: dados.comCabeçalho !== 'não',
          formatoDeSaída: dados.formatoDeSaída, separadorDeSaída: dados.separadorDeSaída,
          comBom: dados.comBom !== 'não', detectarTipos: dados.detectarTipos === 'sim',
        });
      },

      aoMontar(elemento, recalcular) {
        const resultado = elemento.querySelector('#resultado');
        const campo = (nome) => elemento.querySelector(`#campo-${nome}`);
        const grupo = (nome) => campo(nome).closest('.campo');

        escolha = prepararEscolhaDeArquivos(elemento, {
          aceitar: '.csv,.tsv,.tab,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json',
          rótuloDoBotão: 'Escolher arquivo',
          rótuloParaTrocar: 'Trocar o arquivo',
          ícone: 'planilha',
          textoDoVazio: 'Nenhum arquivo escolhido. Arraste um CSV, TSV ou JSON para este quadro, use o botão ou cole o conteúdo abaixo.',
          textoDeSolte: 'Solte o arquivo para convertê-lo.',
          async conferir(arquivo) {
            if (arquivo.size === 0) return { ok: false, mensagem: 'O arquivo está vazio.' };
            if (arquivo.size > LIMITES.bytes) return { ok: false, mensagem: `O arquivo passa de ${LIMITES.bytes / 1024 / 1024} MB.` };
            const bytes = new Uint8Array(await arquivo.arrayBuffer());
            const recusa = recusarSeNãoForTexto(bytes);
            return recusa ? { ok: false, mensagem: recusa } : { ok: true, dados: { bytes } };
          },
          aoMudar(lista) {
            resultado.hidden = true;
            if (lista.length) recalcular();
          },
        });

        // Só aparecem as opções que valem para o formato escolhido.
        const ajustar = () => {
          const entrada = campo('formatoDeEntrada').value;
          const saída = campo('formatoDeSaída').value;
          grupo('separador').hidden = entrada === 'json' || entrada === 'tsv';
          grupo('separadorDeSaída').hidden = saída !== 'csv';
          grupo('comBom').hidden = saída !== 'csv' && saída !== 'tsv';
          grupo('detectarTipos').hidden = saída === 'csv' || saída === 'tsv';
        };
        ajustar();
        for (const nome of ['formatoDeEntrada', 'formatoDeSaída']) {
          campo(nome).addEventListener('change', () => { ajustar(); resultado.hidden = true; });
        }
        elemento.querySelector('#formulário').addEventListener('reset', () => setTimeout(ajustar, 0));
      },
    });
  },
};
