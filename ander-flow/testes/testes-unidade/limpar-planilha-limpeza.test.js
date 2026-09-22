import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apararEspacosDoValor,
  chaveDeComparacao,
  contarPreenchidos,
  detectarColunasSugeridas,
  interpretarData,
  limparPlanilha,
  linhaEstaVazia,
  normalizarEmail,
} from '../../frontend/ferramentas/limpar-planilha/limpar-planilha-limpeza.js';

test('apararEspacosDoValor colapsa espaços internos e tira das pontas', () => {
  assert.equal(apararEspacosDoValor('  Ana   Silva  '), 'Ana Silva');
  assert.equal(apararEspacosDoValor(''), '');
});

test('normalizarEmail deixa minúsculo e sem espaço nas pontas', () => {
  assert.equal(normalizarEmail('  MARINA@ZETA.com '), 'marina@zeta.com');
});

test('chaveDeComparacao ignora caixa e espaço nas pontas', () => {
  assert.equal(chaveDeComparacao('  Marina@Zeta.com '), chaveDeComparacao('marina@zeta.com'));
});

test('linhaEstaVazia e contarPreenchidos', () => {
  assert.equal(linhaEstaVazia(['', '  ', '']), true);
  assert.equal(linhaEstaVazia(['', 'x', '']), false);
  assert.equal(contarPreenchidos(['a', '', 'b', '  ']), 2);
});

test('detectarColunasSugeridas reconhece e-mail, CPF, CNPJ e telefone pelo nome da coluna', () => {
  const sugestoes = detectarColunasSugeridas(['Nome', 'E-mail', 'CPF', 'Telefone celular', 'Cidade']);
  assert.deepEqual(sugestoes, [
    { indice: 1, nome: 'E-mail', tipo: 'email' },
    { indice: 2, nome: 'CPF', tipo: 'cpf' },
    { indice: 3, nome: 'Telefone celular', tipo: 'telefone' },
  ]);
});

test('interpretarData entende ISO e formato brasileiro dd/mm/aaaa', () => {
  assert.ok(interpretarData('2026-01-05') !== null);
  assert.ok(interpretarData('05/01/2026') !== null);
  assert.equal(interpretarData('não é data'), null);
  assert.equal(interpretarData(''), null);
});

// ---------------------------------------------------------------------------
// Caso do contrato (§13.6): 5 linhas, 2 duplicadas por e-mail em maiúsculas diferentes → 3 ficam.
// ---------------------------------------------------------------------------
const CABECALHO = ['nome', 'email', 'cidade'];
const LINHAS_COM_DUPLICATAS = [
  ['Ana Silva', 'ana@exemplo.com', 'Recife'],
  ['Beto Prado', 'beto@exemplo.com', 'Natal'],
  ['ANA SILVA', 'ANA@EXEMPLO.COM', 'Recife'],
  ['Carla Nunes', 'carla@exemplo.com', 'Fortaleza'],
  ['Beto P.', 'BETO@exemplo.com', 'Natal'],
];

test('5 linhas com 2 duplicadas por e-mail em maiúsculas diferentes → 3 linhas ficam', () => {
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas: LINHAS_COM_DUPLICATAS },
    { colunasDuplicidade: [1], qualLinhaFica: 'primeira', removerVazias: false },
  );
  assert.equal(resultado.total, 5);
  assert.equal(resultado.totalFinal, 3);
  assert.equal(resultado.totalDuplicadas, 2);
  assert.deepEqual(
    resultado.linhas.map((linha) => linha[1]),
    ['ana@exemplo.com', 'beto@exemplo.com', 'carla@exemplo.com'],
  );
});

test('regra "mais_completa" com empate mantém a primeira ocorrência', () => {
  const linhas = [
    ['Ana', 'ana@exemplo.com', ''], // 2 preenchidas
    ['Ana', 'ana@exemplo.com', ''], // 2 preenchidas — empate com a primeira
  ];
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas },
    { colunasDuplicidade: [1], qualLinhaFica: 'mais_completa', removerVazias: false },
  );
  assert.equal(resultado.totalFinal, 1);
  assert.equal(resultado.linhas[0][0], 'Ana');
  assert.equal(resultado.linhasComStatus[0].mantem, true);
  assert.equal(resultado.linhasComStatus[1].mantem, false);
});

test('regra "mais_completa" mantém a linha com mais células preenchidas', () => {
  const linhas = [
    ['Ana', 'ana@exemplo.com', ''],
    ['Ana', 'ana@exemplo.com', 'Recife'], // mais completa
  ];
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas },
    { colunasDuplicidade: [1], qualLinhaFica: 'mais_completa', removerVazias: false },
  );
  assert.equal(resultado.totalFinal, 1);
  assert.equal(resultado.linhas[0][2], 'Recife');
});

test('regra "mais_recente" por coluna de data escolhida mantém a maior data', () => {
  const cabecalhoComData = ['nome', 'email', 'atualizado_em'];
  const linhas = [
    ['Ana', 'ana@exemplo.com', '01/01/2026'],
    ['Ana Silva', 'ana@exemplo.com', '15/03/2026'],
  ];
  const resultado = limparPlanilha(
    { cabecalho: cabecalhoComData, linhas },
    { colunasDuplicidade: [1], qualLinhaFica: 'mais_recente', colunaData: 2, removerVazias: false },
  );
  assert.equal(resultado.totalFinal, 1);
  assert.equal(resultado.linhas[0][2], '15/03/2026');
});

test('regra "mais_recente" sem coluna de data usa a última ocorrência', () => {
  const linhas = [
    ['Ana', 'ana@exemplo.com', 'Recife'],
    ['Ana Silva', 'ana@exemplo.com', 'Recife'],
  ];
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas },
    { colunasDuplicidade: [1], qualLinhaFica: 'mais_recente', removerVazias: false },
  );
  assert.equal(resultado.linhas[0][0], 'Ana Silva');
});

test('linhas totalmente vazias são removidas quando removerVazias é true', () => {
  const linhas = [
    ['Ana', 'ana@exemplo.com', 'Recife'],
    ['', '', ''],
    ['  ', '', ''],
  ];
  const resultado = limparPlanilha({ cabecalho: CABECALHO, linhas }, { removerVazias: true });
  assert.equal(resultado.totalFinal, 1);
  assert.equal(resultado.totalVazias, 2);
});

test('padronizarEmail deixa a coluna de e-mail em minúsculas e sem espaço; apararEspacos afeta as demais colunas', () => {
  const linhas = [['  Ana  Silva  ', '  ANA@Exemplo.com ', 'Recife']];
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas },
    { colunasEmail: [1], padronizarEmail: true, apararEspacos: true, removerVazias: false },
  );
  assert.equal(resultado.linhas[0][0], 'Ana Silva');
  assert.equal(resultado.linhas[0][1], 'ana@exemplo.com');
});

test('sem colunas de duplicidade, nenhuma linha é removida por duplicidade', () => {
  const resultado = limparPlanilha(
    { cabecalho: CABECALHO, linhas: LINHAS_COM_DUPLICATAS },
    { colunasDuplicidade: [], removerVazias: false },
  );
  assert.equal(resultado.totalDuplicadas, 0);
  assert.equal(resultado.totalFinal, 5);
});
