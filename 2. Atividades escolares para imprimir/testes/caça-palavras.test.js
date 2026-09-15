import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCaçaPalavras } from '../scripts/geração/gerar-caça-palavras.js';
import { normalizarPalavraParaGrade } from '../scripts/geração/normalizar-palavra-para-grade.js';
import { formatarPalavraDaLista } from '../scripts/geração/formatar-palavra-da-lista.js';
import { validarCaçaPalavrasSalvo } from '../scripts/validação/validar-caça-palavras-salvo.js';

function extrairPalavraDaGrade(grade, colocada) {
  const vetores = { horizontal: [0, 1], vertical: [1, 0], 'diagonal-desce': [1, 1], 'diagonal-sobe': [-1, 1] };
  let [dl, dc] = vetores[colocada.direção];
  if (colocada.invertida) [dl, dc] = [-dl, -dc];
  let texto = '';
  for (let índice = 0; índice < colocada.palavraNaGrade.length; índice += 1) {
    texto += grade[colocada.linha + dl * índice][colocada.coluna + dc * índice];
  }
  return texto;
}

test('todas as palavras cabíveis aparecem na grade, na posição informada, e batem com o gabarito', () => {
  const resultado = gerarCaçaPalavras({
    palavras: ['SOL', 'LUA', 'MAR', 'CEU'],
    direções: ['horizontal', 'vertical', 'diagonal-desce', 'diagonal-sobe'],
    permitirInvertidas: true,
    linhas: 10,
    colunas: 10,
    modoDeAcentos: 'manter',
    semente: 5,
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.nãoColocadas.length, 0);
  assert.equal(resultado.colocadas.length, 4);
  for (const colocada of resultado.colocadas) {
    assert.equal(extrairPalavraDaGrade(resultado.grade, colocada), colocada.palavraNaGrade);
  }
});

test('a grade não tem células vazias: tudo é preenchido com letra', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['SOL'], direções: ['horizontal'], linhas: 6, colunas: 6, semente: 2 });
  for (const linha of resultado.grade) {
    for (const célula of linha) assert.equal(typeof célula, 'string');
  }
});

test('a mesma semente e as mesmas opções reproduzem exatamente a mesma grade', () => {
  const opções = { palavras: ['ESCOLA', 'CADERNO', 'LAPIS', 'REGUA'], direções: ['horizontal', 'vertical'], linhas: 10, colunas: 10, semente: 314 };
  const primeira = gerarCaçaPalavras(opções);
  const segunda = gerarCaçaPalavras(opções);
  assert.deepEqual(primeira, segunda);
});

test('palavra maior que a grade em qualquer direção é recusada com o motivo, sem travar', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['ABACAXIZEIRO'], direções: ['horizontal', 'vertical'], linhas: 5, colunas: 5, semente: 1 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.colocadas.length, 0);
  assert.equal(resultado.nãoColocadas.length, 1);
  assert.match(resultado.nãoColocadas[0].motivo, /não cabe/);
});

test('grade impossível (muitas palavras longas numa grade pequena) informa exatamente o que não coube, sem travar', () => {
  const palavras = ['PRIMAVERA', 'INVERNO', 'OUTONO', 'VERAO', 'CHUVOSO', 'ENSOLARADO'];
  const resultado = gerarCaçaPalavras({ palavras, direções: ['horizontal'], linhas: 6, colunas: 6, semente: 1 });
  assert.equal(resultado.válido, true);
  assert.ok(resultado.nãoColocadas.length > 0);
  assert.equal(resultado.colocadas.length + resultado.nãoColocadas.length, palavras.length);
  for (const item of resultado.nãoColocadas) assert.equal(typeof item.motivo, 'string');
});

test('caracteres brasileiros: modo "manter" preserva acentos e cedilha na grade e no gabarito', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['AÇÚCAR', 'MAÇÃ', 'CORAÇÃO'], direções: ['horizontal'], linhas: 10, colunas: 10, modoDeAcentos: 'manter', semente: 4 });
  assert.equal(resultado.válido, true);
  const colocadaAçúcar = resultado.colocadas.find((item) => item.palavra === 'AÇÚCAR');
  assert.ok(colocadaAçúcar);
  assert.equal(colocadaAçúcar.palavraNaGrade, 'AÇÚCAR');
  assert.equal(extrairPalavraDaGrade(resultado.grade, colocadaAçúcar), 'AÇÚCAR');
});

test('caracteres brasileiros: modo "remover" tira acentos e cedilha de forma consistente', () => {
  assert.equal(normalizarPalavraParaGrade('Coração', 'remover'), 'CORACAO');
  assert.equal(normalizarPalavraParaGrade('maçã', 'remover'), 'MACA');
  const resultado = gerarCaçaPalavras({ palavras: ['Coração'], direções: ['horizontal'], linhas: 10, colunas: 10, modoDeAcentos: 'remover', semente: 4 });
  assert.equal(resultado.colocadas[0].palavraNaGrade, 'CORACAO');
});

test('no modo "remover", a lista mostra a forma buscável na grade com a original entre parênteses quando elas diferem', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['Coração', 'SOL'], direções: ['horizontal'], linhas: 10, colunas: 10, modoDeAcentos: 'remover', semente: 4 });
  const coração = resultado.colocadas.find((item) => item.palavra === 'Coração');
  const sol = resultado.colocadas.find((item) => item.palavra === 'SOL');
  assert.equal(formatarPalavraDaLista(coração, 'remover'), 'CORACAO (Coração)');
  // Sem acentos a mais para remover, a forma na grade já bate com a digitada: sem parênteses redundantes.
  assert.equal(formatarPalavraDaLista(sol, 'remover'), 'SOL');
});

test('no modo "manter", a lista mostra a palavra exatamente como foi digitada, sem alterações', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['Coração'], direções: ['horizontal'], linhas: 10, colunas: 10, modoDeAcentos: 'manter', semente: 4 });
  const coração = resultado.colocadas.find((item) => item.palavra === 'Coração');
  assert.equal(formatarPalavraDaLista(coração, 'manter'), 'Coração');
});

test('rejeita configuração sem palavras, sem direção ou grade fora da faixa', () => {
  assert.equal(gerarCaçaPalavras({ palavras: [], direções: ['horizontal'], linhas: 8, colunas: 8 }).válido, false);
  assert.equal(gerarCaçaPalavras({ palavras: ['SOL'], direções: [], linhas: 8, colunas: 8 }).válido, false);
  assert.equal(gerarCaçaPalavras({ palavras: ['SOL'], direções: ['horizontal'], linhas: 2, colunas: 8 }).válido, false);
});

test('validador de caça-palavras salvo recusa dados adulterados', () => {
  const válido = {
    nome: 'Estações do ano',
    palavras: ['SOL', 'LUA'],
    direções: ['horizontal'],
    permitirInvertidas: false,
    linhas: 10,
    colunas: 10,
    modoDeAcentos: 'manter',
    semente: 1,
    comCabeçalho: false,
    tituloDaAtividade: '',
  };
  assert.equal(validarCaçaPalavrasSalvo(válido), true);
  assert.equal(validarCaçaPalavrasSalvo({ ...válido, direções: ['zigue-zague'] }), false);
  assert.equal(validarCaçaPalavrasSalvo({ ...válido, linhas: 2 }), false);
  assert.equal(validarCaçaPalavrasSalvo(null), false);
});
