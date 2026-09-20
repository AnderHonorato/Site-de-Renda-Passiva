/** JSON: validar, formatar, minificar e apontar o erro com linha e coluna. */
import { montarFerramenta, texto, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';

/** Traduz a posição do erro em linha e coluna legíveis. */
function localizarErro(conteúdo, mensagem) {
  const posição = /position (\d+)/.exec(mensagem)?.[1];
  if (posição === undefined) return mensagem;
  const antes = conteúdo.slice(0, Number(posição));
  const linha = antes.split('\n').length;
  const coluna = antes.length - antes.lastIndexOf('\n');
  return `${mensagem.replace(/ in JSON at position \d+.*/, '')} — linha ${linha}, coluna ${coluna}.`;
}

/**
 * Profundidade máxima aceita.
 *
 * Acima disso, percorrer a árvore recursivamente estoura a pilha do navegador e
 * a pessoa recebia "JSON válido" seguido de um erro sem sentido. Melhor recusar
 * com uma explicação.
 */
const PROFUNDIDADE_MÁXIMA = 200;

/** Conta chaves e profundidade para dar uma noção do tamanho do documento. */
function medir(valor, profundidade = 1) {
  if (profundidade > PROFUNDIDADE_MÁXIMA) {
    throw new ErroDeEntrada(
      `Este JSON tem mais de ${PROFUNDIDADE_MÁXIMA} níveis encaixados, fundo demais para processar aqui.`,
      'conteúdo',
    );
  }
  if (Array.isArray(valor)) {
    return valor.reduce((acumulado, item) => {
      const filho = medir(item, profundidade + 1);
      return { chaves: acumulado.chaves + filho.chaves, profundidade: Math.max(acumulado.profundidade, filho.profundidade) };
    }, { chaves: 0, profundidade });
  }
  if (valor && typeof valor === 'object') {
    const chaves = Object.keys(valor);
    return chaves.reduce((acumulado, chave) => {
      const filho = medir(valor[chave], profundidade + 1);
      return { chaves: acumulado.chaves + filho.chaves, profundidade: Math.max(acumulado.profundidade, filho.profundidade) };
    }, { chaves: chaves.length, profundidade });
  }
  return { chaves: 0, profundidade };
}

/** Ordena as chaves de objetos, mantendo a ordem dos arrays. */
function ordenar(valor, profundidade = 1) {
  if (profundidade > PROFUNDIDADE_MÁXIMA) {
    throw new ErroDeEntrada(
      `Este JSON tem mais de ${PROFUNDIDADE_MÁXIMA} níveis encaixados, fundo demais para ordenar aqui.`,
      'conteúdo',
    );
  }
  if (Array.isArray(valor)) return valor.map((item) => ordenar(item, profundidade + 1));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor).sort().map((c) => [c, ordenar(valor[c], profundidade + 1)]),
    );
  }
  return valor;
}

export default {
  instruções: {
    passos: [
      'Cole o JSON no campo.',
      'Escolha formatar (para ler), minificar (para transportar) ou só validar.',
      'Se houver erro, a mensagem diz a linha e a coluna onde o interpretador parou.',
      'Baixe o resultado ou copie.',
    ],
    exemplo: { texto: 'Um JSON com vírgula sobrando antes da chave de fechamento acusa erro na linha exata onde ela está.' },
    limites: 'Usa o interpretador do próprio navegador, então segue o padrão JSON estrito: sem comentários, '
      + 'sem vírgula final e com chaves sempre entre aspas duplas. Nada é enviado a servidor.',
    perguntas: [
      { p: 'Por que meu JSON com comentários dá erro?', r: 'Porque o padrão JSON não aceita comentários. O que aceita é o JSON5 ou o JSONC, usados em arquivos de configuração, mas não em APIs.' },
      { p: 'Ordenar as chaves muda o significado?', r: 'Não para objetos: a ordem das chaves não faz parte do dado. Arrays mantêm a ordem original, porque nesse caso a ordem importa.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Processar',
      campos: [
        { nome: 'conteúdo', rótulo: 'JSON', tipo: 'área', linhas: 10, exemplo: '{"nome": "Ana", "itens": [1, 2, 3]}' },
        {
          nome: 'modo', rótulo: 'O que fazer', tipo: 'seleção', padrão: 'formatar',
          opções: [
            { valor: 'formatar', rótulo: 'Formatar com indentação' },
            { valor: 'minificar', rótulo: 'Minificar' },
            { valor: 'validar', rótulo: 'Só validar' },
          ],
        },
        { nome: 'ordenarChaves', rótulo: 'Ordenar as chaves em ordem alfabética', tipo: 'caixa' },
      ],
      calcular(dados) {
        const conteúdo = texto(dados, 'conteúdo', { rótulo: 'JSON', máximo: 1000000 });
        let valor;
        try {
          valor = JSON.parse(conteúdo);
        } catch (erro) {
          throw new ErroDeEntrada(localizarErro(conteúdo, erro.message), 'conteúdo');
        }

        // Medir primeiro: é a travessia que já conhece o teto de profundidade.
        const { chaves, profundidade } = medir(valor);
        const preparado = dados.ordenarChaves === 'sim' ? ordenar(valor) : valor;
        let saída;
        try {
          saída = dados.modo === 'minificar'
            ? JSON.stringify(preparado)
            : JSON.stringify(preparado, null, 2);
        } catch (erro) {
          throw new ErroDeEntrada(`Não foi possível escrever o resultado: ${erro.message}`, 'conteúdo');
        }

        const tipo = Array.isArray(preparado) ? `lista com ${preparado.length} itens`
          : preparado === null ? 'nulo' : typeof preparado === 'object' ? 'objeto' : typeof preparado;

        if (dados.modo === 'validar') {
          return {
            valor: 'JSON válido',
            resumo: `Raiz: ${tipo}.`,
            linhas: [['Chaves', String(chaves)], ['Profundidade', String(profundidade)], ['Tamanho', `${conteúdo.length} caracteres`]],
          };
        }

        return {
          valor: 'JSON válido',
          resumo: `Raiz: ${tipo}. ${saída.length} caracteres no resultado.`,
          texto: saída,
          linhas: [
            ['Chaves', String(chaves)],
            ['Profundidade', String(profundidade)],
            ['Antes', `${conteúdo.length} caracteres`],
            ['Depois', `${saída.length} caracteres`],
          ],
          arquivos: [{
            rótulo: 'Baixar .json',
            gerar: () => baixar(saída, `${nomeDeArquivo('dados')}.json`, 'application/json;charset=utf-8'),
          }],
        };
      },
    });
  },
};
