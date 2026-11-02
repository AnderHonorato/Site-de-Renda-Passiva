/** Base64: codificar e decodificar texto, com suporte a acentos e URL-safe. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';

/** Codifica texto UTF-8 em Base64 sem estourar a pilha com textos grandes. */
function codificar(valor, urlSafe) {
  const bytes = new TextEncoder().encode(valor);
  let binário = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binário += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const base = btoa(binário);
  return urlSafe ? base.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : base;
}

/** Decodifica Base64 padrão ou URL-safe de volta para texto UTF-8. */
function decodificar(valor) {
  let limpo = valor.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (limpo.length % 4 !== 0) limpo += '=';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(limpo)) {
    throw new ErroDeEntrada('Isto não parece um texto em Base64: há caracteres fora do alfabeto.', 'conteúdo');
  }
  let binário;
  try {
    binário = atob(limpo);
  } catch {
    throw new ErroDeEntrada('Base64 incompleto ou corrompido.', 'conteúdo');
  }
  const bytes = Uint8Array.from(binário, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export default {
  instruções: {
    passos: [
      'Cole o texto no campo.',
      'Escolha codificar ou decodificar.',
      'Marque URL-safe se o resultado vai dentro de um endereço da web.',
      'Copie o resultado.',
    ],
    exemplo: { texto: '"Ação" codificado vira "QcOnw6Nv". Decodificando de volta, os acentos voltam intactos.' },
    limites: 'Trabalha com texto. Acentos são tratados como UTF-8, que é o padrão da web. '
      + 'O texto nunca sai do seu navegador.',
    perguntas: [
      { p: 'Base64 é criptografia?', r: 'Não. É apenas uma forma de representar dados em caracteres seguros para transporte. Qualquer pessoa consegue decodificar. Nunca use Base64 para esconder senha.' },
      { p: 'O que é URL-safe?', r: 'Uma variação que troca "+" por "-" e "/" por "_" e remove o "=" do fim, para o texto caber num endereço sem quebrar.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter',
      campos: [
        { nome: 'conteúdo', rótulo: 'Texto', tipo: 'área', linhas: 6, exemplo: 'Cole aqui o texto ou o Base64' },
        {
          nome: 'modo', rótulo: 'Operação', tipo: 'seleção', padrão: 'codificar',
          opções: [
            { valor: 'codificar', rótulo: 'Texto para Base64' },
            { valor: 'decodificar', rótulo: 'Base64 para texto' },
          ],
        },
        { nome: 'urlSafe', rótulo: 'Usar variação URL-safe', tipo: 'caixa' },
      ],
      calcular(dados) {
        const conteúdo = texto(dados, 'conteúdo', { rótulo: 'Texto', máximo: 200000 });
        const resultado = dados.modo === 'codificar'
          ? codificar(conteúdo, dados.urlSafe === 'sim')
          : decodificar(conteúdo);
        return {
          valor: resultado.length > 220 ? `${resultado.slice(0, 220)}…` : resultado,
          texto: resultado,
          resumo: `${resultado.length} caracteres no resultado.`,
          observações: resultado.length > 220 ? ['O resultado foi encurtado na tela. O botão Copiar leva o conteúdo completo.'] : [],
        };
      },
    });
  },
};
