/** Conversão entre CSV e JSON, nos dois sentidos. */
import { montarFerramenta, texto, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { lerCsv, detectarSeparador, paraObjetos, deObjetos } from '../cálculos/tabular.js';
import { montarCsv } from '../núcleo/exportar.js';

export default {
  instruções: {
    passos: [
      'Cole o CSV (ou as células copiadas da planilha) ou o JSON.',
      'Escolha o sentido da conversão.',
      'No sentido CSV para JSON, a primeira linha vira o nome dos campos.',
      'Copie o resultado ou baixe o arquivo.',
    ],
    exemplo: {
      texto: 'O CSV "nome;idade" com a linha "Ana;34" vira [{"nome":"Ana","idade":"34"}]. '
        + 'No caminho inverso, uma lista de objetos vira uma tabela com uma coluna por campo encontrado.',
    },
    limites: 'Os valores vindos de CSV são texto: "34" sai como "34" e não como número, porque adivinhar tipo '
      + 'estraga CEP, telefone e código com zero à esquerda. O separador é detectado sozinho e aspas e quebras de linha '
      + 'dentro das células são respeitadas. Tudo roda no seu navegador.',
    perguntas: [
      { p: 'Por que os números viram texto no JSON?', r: 'Para não corromper dados. Um CEP como 01310-000 ou um código 007 viraria outra coisa se a ferramenta tentasse converter sozinha. Se você precisa de números, converta no destino.' },
      { p: 'E se os objetos do JSON tiverem campos diferentes?', r: 'A tabela recebe a união de todos os campos encontrados, e as células sem valor ficam vazias.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter',
      campos: [
        { nome: 'conteúdo', rótulo: 'Conteúdo', tipo: 'área', linhas: 10, exemplo: 'nome;idade\nAna;34\nBruno;28' },
        {
          nome: 'sentido', rótulo: 'Converter', tipo: 'seleção', padrão: 'csv-json',
          opções: [
            { valor: 'csv-json', rótulo: 'CSV para JSON' },
            { valor: 'json-csv', rótulo: 'JSON para CSV' },
          ],
        },
        {
          nome: 'separador', rótulo: 'Separador do CSV', tipo: 'seleção', padrão: 'auto',
          opções: [
            { valor: 'auto', rótulo: 'Detectar sozinho' },
            { valor: ';', rótulo: 'Ponto e vírgula' },
            { valor: ',', rótulo: 'Vírgula' },
            { valor: '\t', rótulo: 'Tabulação' },
          ],
        },
      ],
      calcular(dados) {
        const conteúdo = texto(dados, 'conteúdo', { rótulo: 'Conteúdo', máximo: 3000000 });

        if (dados.sentido === 'json-csv') {
          let valor;
          try {
            valor = JSON.parse(conteúdo);
          } catch (erro) {
            throw new ErroDeEntrada(`JSON inválido: ${erro.message}`, 'conteúdo');
          }
          const lista = Array.isArray(valor) ? valor : [valor];
          const { cabeçalho, linhas } = deObjetos(lista);
          const separador = dados.separador === 'auto' ? ';' : dados.separador;
          const csv = montarCsv([cabeçalho, ...linhas], { separador });

          return {
            valor: `${linhas.length} linha(s) e ${cabeçalho.length} coluna(s)`,
            resumo: 'CSV pronto, em UTF-8 com marca de codificação para o Excel abrir com acentos.',
            texto: csv,
            tabela: { cabeçalho, linhas: linhas.slice(0, 20), semExportação: true },
            arquivos: [{
              rótulo: 'Baixar CSV',
              gerar: () => baixar(csv, `${nomeDeArquivo('dados')}.csv`, 'text/csv;charset=utf-8'),
            }],
          };
        }

        const separador = dados.separador === 'auto' ? detectarSeparador(conteúdo) : dados.separador;
        const tabela = lerCsv(conteúdo, { separador });
        if (tabela.length < 2) {
          throw new ErroDeEntrada('O CSV precisa ter o cabeçalho e ao menos uma linha de dados.', 'conteúdo');
        }
        const objetos = paraObjetos(tabela[0], tabela.slice(1));
        const json = JSON.stringify(objetos, null, 2);

        return {
          valor: `${objetos.length} objeto(s)`,
          resumo: `Campos: ${Object.keys(objetos[0]).join(', ')}.`,
          texto: json,
          tabela: { cabeçalho: tabela[0], linhas: tabela.slice(1, 21), semExportação: true },
          arquivos: [{
            rótulo: 'Baixar JSON',
            gerar: () => baixar(json, `${nomeDeArquivo('dados')}.json`, 'application/json;charset=utf-8'),
          }],
          observações: ['Os valores saem como texto. Converter tipos sozinho estragaria CEP, telefone e códigos com zero à esquerda.'],
        };
      },
    });
  },
};
