/**
 * Testes da limpeza de texto.
 *
 * Os três primeiros casos são os da especificação do Ander Flow
 * (docs/catalogo/catalogo-texto.md, "limpador-de-texto"), conferidos à mão: no
 * caso 1, "Olá   mundo" tem 2 espaços a mais e as três quebras viram duas, e
 * por isso saem 3 caracteres. Os demais são do portal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { limparTexto, OPÇÕES_PADRÃO } from '../scripts/cálculos/limpador-de-texto.js';
import ferramenta, { LIMITE_DE_CARACTERES } from '../scripts/ferramentas/limpador-de-texto.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const limpar = (texto, opções) => limparTexto(texto, opções).texto;
const juntando = { quebrasSoltas: true };

/* ------------------------------------------------- casos do Ander Flow */

test('caso 1 do catálogo: espaço duplo colapsa e três linhas vazias viram uma', () => {
  const r = limparTexto('Olá   mundo\n\n\nTudo bem?');
  assert.equal(r.texto, 'Olá mundo\n\nTudo bem?');
  assert.equal(r.caracteresRemovidos, 3);
});

test('caso 2 do catálogo: frase partida é juntada, o parágrafo continua separado', () => {
  const r = limparTexto('Isto é uma frase\nque continua na linha de baixo.\n\nNovo parágrafo.', juntando);
  assert.equal(r.texto, 'Isto é uma frase que continua na linha de baixo.\n\nNovo parágrafo.');
  assert.equal(r.caracteresRemovidos, 0); // uma quebra virou espaço: nada saiu
  assert.equal(r.linhasUnidas, 1);
});

test('caso 3 do catálogo: texto vazio dá saída vazia, 0 removidos e nenhum erro', () => {
  assert.deepEqual(limparTexto(''), {
    texto: '', caracteresRemovidos: 0, linhasUnidas: 0, linhasNaEntrada: 0, linhasNaSaída: 0,
  });
  assert.equal(limparTexto().texto, '');
  assert.equal(limparTexto(undefined, juntando).texto, '');
  assert.equal(limparTexto(null).caracteresRemovidos, 0);
});

test('as opções padrão seguem a especificação: só juntar linhas vem desligada', () => {
  assert.deepEqual({ ...OPÇÕES_PADRÃO }, { aparar: true, espaçosDuplos: true, linhasVazias: true, quebrasSoltas: false });
  assert.equal(LIMITE_DE_CARACTERES, 200000);
});

/* ---------------------------------------------- cada etapa isolada */

test('aparar: tira espaços do começo e do fim de cada linha, inclusive tabulação e NBSP', () => {
  const só = { aparar: true, espaçosDuplos: false, linhasVazias: false };
  assert.equal(limpar('  a  \n\t b\t\n c ', só), 'a\nb\nc');
});

test('aparar: também tira as linhas vazias do começo e do fim do texto inteiro', () => {
  assert.equal(limpar('\n\n  abc\n\n\n', { espaçosDuplos: false, linhasVazias: false }), 'abc');
  assert.equal(limpar('\n\nabc', { aparar: false, espaçosDuplos: false, linhasVazias: false }), '\n\nabc');
});

test('espaços duplos: dois ou mais viram um, de qualquer tipo, mas o espaço único não muda', () => {
  const só = { aparar: false, linhasVazias: false };
  assert.equal(limpar('a  b   c', só), 'a b c');
  assert.equal(limpar('a \t b', só), 'a b');
  assert.equal(limpar('a  b', só), 'a b'); // NBSP vindo de PDF ou página web
  assert.equal(limpar('R$ 10 e a\tb', só), 'R$ 10 e a\tb'); // um só: fica como estava
  assert.equal(limpar('  recuo', só), ' recuo');
});

test('espaços duplos nunca atravessam a quebra de linha', () => {
  const só = { aparar: false, linhasVazias: false };
  assert.equal(limpar('a  \n  b', só), 'a \n b');
});

test('linhas vazias: várias viram uma, uma sozinha fica, e linha só de espaços conta como vazia', () => {
  const só = { aparar: false, espaçosDuplos: false };
  assert.equal(limpar('a\n\n\n\nb', só), 'a\n\nb');
  assert.equal(limpar('a\n\nb', só), 'a\n\nb');
  assert.equal(limpar('a\n  \n \t \nb', só), 'a\n  \nb');
});

test('com tudo desligado o texto só tem as quebras padronizadas', () => {
  const nada = { aparar: false, espaçosDuplos: false, linhasVazias: false, quebrasSoltas: false };
  const texto = '  a  b \n\n\n\n c ';
  assert.equal(limpar(texto, nada), texto);
  assert.equal(limparTexto(texto, nada).caracteresRemovidos, 0);
});

/* --------------------------------------------- juntar linhas partidas */

test('juntar: várias linhas seguidas viram uma frase', () => {
  assert.equal(limpar('um\ndois\ntrês', juntando), 'um dois três');
});

test('juntar: cada final de frase da especificação mantém a quebra', () => {
  for (const fim of ['.', '!', '?', ':', ';', '-']) {
    assert.equal(limpar(`fim${fim}\nseguinte`, juntando), `fim${fim}\nseguinte`, `terminando em "${fim}"`);
  }
});

test('juntar: reticências e aspas ou parênteses depois do ponto também encerram a frase', () => {
  for (const fim of ['…', '."', '.)', '?”', '!»', '.’']) {
    assert.equal(limpar(`fim${fim}\nseguinte`, juntando), `fim${fim}\nseguinte`, `terminando em "${fim}"`);
  }
  assert.equal(limpar('ele disse "oi"\nseguinte', juntando), 'ele disse "oi" seguinte'); // aspas sem ponto não encerram
});

test('juntar: palavra partida por hífen no fim da linha não é emendada com espaço', () => {
  assert.equal(limpar('uma pala-\nvra partida', juntando), 'uma pala-\nvra partida');
});

test('juntar: nunca une uma linha a um item de lista', () => {
  assert.equal(limpar('Compras\n- pão\n- leite', juntando), 'Compras\n- pão\n- leite');
  assert.equal(limpar('Passos\n1. abrir\n2) fechar\n• sair', juntando), 'Passos\n1. abrir\n2) fechar\n• sair');
  assert.equal(limpar('item que continua\nna outra linha', juntando), 'item que continua na outra linha');
  // "2024" e "3.5" no começo da linha não são numeração de lista
  assert.equal(limpar('em\n2024 foi\n3.5 milhões', juntando), 'em 2024 foi 3.5 milhões');
});

test('juntar: a linha vazia sempre separa parágrafos, com ou sem a opção de linhas vazias', () => {
  assert.equal(limpar('a\nb\n\nc\nd', { ...juntando, linhasVazias: false }), 'a b\n\nc d');
  assert.equal(limpar('a\nb\n\n\n\nc', { ...juntando, linhasVazias: false }), 'a b\n\n\n\nc');
  assert.equal(limpar('a\nb\n\n\n\nc', juntando), 'a b\n\nc');
});

test('juntar: sem aparar, os espaços da emenda não se acumulam', () => {
  const r = limpar('frase   \n   continua', { aparar: false, espaçosDuplos: false, quebrasSoltas: true });
  assert.equal(r, 'frase continua');
});

test('juntar: conta as linhas juntadas', () => {
  assert.equal(limparTexto('a\nb\nc. d\ne', juntando).linhasUnidas, 3);
  assert.equal(limparTexto('a\nb').linhasUnidas, 0);
});

/* ---------------------------------------------- quebras de linha */

test('quebras do Windows, do Mac antigo e do Unicode viram \\n, sem contar como remoção', () => {
  const separador = String.fromCharCode(0x2028);
  const paragrafo = String.fromCharCode(0x2029);
  const r = limparTexto(`a\r\nb\rc${separador}d${paragrafo}e`, { aparar: false, espaçosDuplos: false, linhasVazias: false });
  assert.equal(r.texto, 'a\nb\nc\nd\ne');
  assert.equal(r.caracteresRemovidos, 0);
  assert.equal(r.linhasNaEntrada, 5);
});

test('texto do PDF colado com CRLF, espaços e linhas partidas sai limpo', () => {
  const colado = '  Primeira   linha da frase\r\ncontinua aqui.  \r\n\r\n\r\n  Outro   parágrafo\r\nque também continua.\r\n';
  assert.equal(
    limpar(colado, juntando),
    'Primeira linha da frase continua aqui.\n\nOutro parágrafo que também continua.',
  );
});

/* --------------------------------------------- contagem de caracteres */

test('caracteres removidos: espaços, quebras e linhas que saíram, conferido a mão', () => {
  // "a" + 3 espaços + "b" + 4 quebras + "c" = 10; sai "a b\n\nc" = 6 → 4 removidos
  assert.equal(limparTexto('a   b\n\n\n\nc').caracteresRemovidos, 4);
  // só aparar: dois espaços de cada lado de "x" e a quebra final
  assert.equal(limparTexto('  x  \n').caracteresRemovidos, 5);
});

test('caracteres removidos contam pontos de código: um emoji fora do básico é um só', () => {
  assert.equal(limparTexto('😀  😀').caracteresRemovidos, 1);
  assert.equal(limparTexto('😀 😀').caracteresRemovidos, 0);
});

test('linhas na entrada e na saída', () => {
  const r = limparTexto('a\n\n\n\nb\n');
  assert.equal(r.linhasNaEntrada, 6);
  assert.equal(r.linhasNaSaída, 3);
});

/* ------------------------------------- acentos, símbolos e hostilidade */

test('letras, acentos, símbolos e pontuação não mudam', () => {
  const texto = 'São Paulo — Ação & Café: R$ 10,00 (ok) 😀 한국어 ñ ß İ';
  assert.equal(limpar(texto), texto);
  assert.equal(limpar(texto, juntando), texto);
});

test('caracteres de HTML e de controle passam como texto, sem interpretação', () => {
  const texto = '<b>oi</b>   &amp;   <script>x</script>';
  assert.equal(limpar(texto), '<b>oi</b> &amp; <script>x</script>');
});

test('texto só de espaços e quebras vira vazio', () => {
  assert.equal(limpar('   \n\t\n  \n'), '');
  assert.equal(limparTexto('   \n\t\n  \n').caracteresRemovidos, 9);
});

test('uma linha de 200 mil caracteres e 200 mil quebras seguidas não travam', () => {
  const inicio = Date.now();
  assert.equal(limpar('a'.repeat(LIMITE_DE_CARACTERES)).length, LIMITE_DE_CARACTERES);
  assert.equal(limpar('\n'.repeat(LIMITE_DE_CARACTERES)), '');
  assert.equal(limpar(' '.repeat(LIMITE_DE_CARACTERES) + 'x'), 'x');
  assert.ok(Date.now() - inicio < 3000, 'demorou demais');
});

test('juntar 100 mil linhas curtas em uma só termina rápido e sai certo', () => {
  const inicio = Date.now();
  const r = limparTexto('a\n'.repeat(100000), juntando);
  assert.equal(r.texto.length, 199999);
  assert.equal(r.linhasUnidas, 99999);
  assert.equal(r.linhasNaSaída, 1);
  assert.ok(Date.now() - inicio < 3000, 'demorou demais');
});

test('a ordem das etapas não deixa espaço duplo nem linha vazia dupla para trás', () => {
  const r = limpar('a  \n\n  \n b  \n  c', { ...juntando, linhasVazias: true });
  assert.equal(r, 'a\n\nb c');
});

/* ------------------------------------------- propriedades que sempre valem */

test('propriedade: limpar duas vezes dá o mesmo que limpar uma (idempotência)', () => {
  const amostras = [
    '', 'a', '  a  b\n\n\n\nc  ', 'x\ny\nz.\nw\n- i\n- j', '\r\n\r\na\r\n  b\r\n', '😀   😀\n\n\n\n😀',
    'frase   \n   continua\n\n\n\nnovo. \n  fim',
  ];
  const combinações = [OPÇÕES_PADRÃO, juntando, { aparar: false, espaçosDuplos: false, linhasVazias: false }, { aparar: false }];
  for (const texto of amostras) {
    for (const opções of combinações) {
      const uma = limpar(texto, opções);
      assert.equal(limpar(uma, opções), uma, JSON.stringify({ texto, opções }));
    }
  }
});

test('propriedade: o texto limpo nunca é maior que o original e removidos + saída = entrada', () => {
  const amostras = ['', 'a  b', '\n\n\na\n\n\n', 'a\nb\nc.\nd', '  😀  \n\n\n  x  ', 'a\r\nb\r\n\r\n\r\nc'];
  for (const texto of amostras) {
    for (const quebrasSoltas of [false, true]) {
      const r = limparTexto(texto, { quebrasSoltas });
      const entrada = texto.replace(/\r\n?/g, '\n');
      assert.ok([...r.texto].length <= [...entrada].length);
      assert.equal(r.caracteresRemovidos + [...r.texto].length, [...entrada].length, JSON.stringify(texto));
    }
  }
});

test('propriedade: as palavras (e a ordem delas) são as mesmas antes e depois da limpeza', () => {
  const palavras = (texto) => texto.split(/\s+/).filter(Boolean);
  const texto = '  Olá   mundo\n\n\nTudo\nbem?  \n\n- item um\n- item dois\n   fim.  ';
  for (const quebrasSoltas of [false, true]) {
    assert.deepEqual(palavras(limpar(texto, { quebrasSoltas })), palavras(texto));
  }
});

/* ------------------------------------------------------ só do portal */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['limpador-de-texto'];
  assert.equal(ficha.id, 'F052');
  assert.equal(ficha.nome, 'Limpeza de texto');
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
  assert.equal(ficha.local, true);
});

test('"Como usar" está completo e o exemplo confere com o cálculo', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3);
  assert.ok(limites.includes('200.000'));
  assert.ok(perguntas.length >= 3 && perguntas.every((q) => q.p && q.r));
  assert.equal(limpar('Olá   mundo\n\n\n\nTudo bem?'), 'Olá mundo\n\nTudo bem?');
  assert.equal(
    limpar('Isto é uma frase\nque continua na linha de baixo.', juntando),
    'Isto é uma frase que continua na linha de baixo.',
  );
  assert.ok(exemplo.texto.includes('"Isto é uma frase que continua na linha de baixo."'));
  assert.ok(exemplo.texto.includes('"Olá mundo"'));
});
