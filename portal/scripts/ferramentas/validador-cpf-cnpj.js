/** Validação de CPF e CNPJ pelos dígitos verificadores. */
import { montarFerramenta, texto } from '../núcleo/montador.js';
import { validarDocumento } from '../cálculos/documentos-br.js';

export default {
  instruções: {
    passos: [
      'Cole o CPF ou o CNPJ. Pode vir com ponto, barra e traço ou só com números.',
      'Toque em Conferir. A ferramenta identifica o tipo pelo tamanho.',
      'Se for válido, você recebe o número já formatado para copiar.',
    ],
    exemplo: { texto: '111.444.777-35 é um CPF matematicamente válido. 111.444.777-36 não é: o último dígito não confere.' },
    limites: 'A conferência é matemática: confirma que os dígitos verificadores batem. '
      + 'Isso não significa que o documento exista, esteja ativo ou pertença à pessoa que informou. '
      + 'Nenhuma consulta é feita à Receita Federal e nada sai do seu navegador.',
    perguntas: [
      { p: 'Isso consulta a situação na Receita?', r: 'Não. A ferramenta só recalcula os dígitos verificadores. Para situação cadastral é preciso consultar a Receita Federal.' },
      { p: 'Para que serve então?', r: 'Para pegar erro de digitação antes de salvar um cadastro ou emitir um documento. É o uso real: a maioria dos problemas é dígito trocado.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Conferir',
      campos: [
        { nome: 'documento', rótulo: 'CPF ou CNPJ', exemplo: '111.444.777-35' },
      ],
      calcular(dados) {
        const entrada = texto(dados, 'documento', { rótulo: 'CPF ou CNPJ', máximo: 40 });
        const r = validarDocumento(entrada);
        if (!r.válido) {
          return {
            valor: r.tipo === 'indefinido' ? 'Não é um CPF nem um CNPJ' : `${r.tipo} inválido`,
            resumo: r.motivo,
            observações: ['Confira se algum dígito foi trocado na digitação.'],
          };
        }
        return {
          valor: `${r.tipo} válido`,
          resumo: r.formatado,
          texto: r.formatado,
          observações: ['Os dígitos verificadores conferem. Isso não confirma que o documento exista ou esteja ativo.'],
        };
      },
    });
  },
};
