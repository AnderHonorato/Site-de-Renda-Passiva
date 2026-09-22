import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  analisarCsv,
  analisarTextoCsv,
  detectarSeparador,
  lerArquivo,
  removerBom,
  converterPlanilhaXlsx,
} from '../../frontend/ferramentas/limpar-planilha/limpar-planilha-leitura.js';
import { gerarBytesXlsx } from '../../frontend/ferramentas/limpar-planilha/limpar-planilha-exportacao.js';

test('removerBom tira o BOM UTF-8 do início, sem afetar o resto', () => {
  assert.equal(removerBom('﻿nome,email'), 'nome,email');
  assert.equal(removerBom('nome,email'), 'nome,email');
});

test('detectarSeparador reconhece vírgula, ponto e vírgula e tabulação', () => {
  assert.equal(detectarSeparador('nome,email,cpf\nAna,a@b.com,111'), ',');
  assert.equal(detectarSeparador('nome;email;cpf\nAna;a@b.com;111'), ';');
  assert.equal(detectarSeparador('nome\temail\tcpf\nAna\ta@b.com\t111'), '\t');
});

test('detectarSeparador ignora o separador dentro de aspas ao contar', () => {
  // O cabeçalho usa ";", mas o campo entre aspas tem várias vírgulas — não deve confundir a detecção.
  const texto = '"Nome, completo";email\n"Ana, Silva";a@b.com';
  assert.equal(detectarSeparador(texto), ';');
});

test('analisarCsv separa por ";" e preserva vírgulas dentro de aspas e quebras de linha internas', () => {
  const texto = 'nome;endereco;email\r\n"Ana Silva";"Rua A, 123\nApto 4";ana@exemplo.com\r\nBeto;Rua B;beto@exemplo.com';
  const linhas = analisarCsv(texto, ';');
  assert.deepEqual(linhas, [
    ['nome', 'endereco', 'email'],
    ['Ana Silva', 'Rua A, 123\nApto 4', 'ana@exemplo.com'],
    ['Beto', 'Rua B', 'beto@exemplo.com'],
  ]);
});

test('analisarCsv entende aspas duplicadas como aspas literais', () => {
  const linhas = analisarCsv('nome;apelido\n"Jo""ao";Jotinha', ';');
  assert.deepEqual(linhas, [
    ['nome', 'apelido'],
    ['Jo"ao', 'Jotinha'],
  ]);
});

test('analisarCsv ignora a quebra de linha final (não gera linha vazia extra)', () => {
  const linhas = analisarCsv('a,b\n1,2\n', ',');
  assert.deepEqual(linhas, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('analisarTextoCsv junta remoção de BOM, detecção de separador e separação do cabeçalho', () => {
  const resultado = analisarTextoCsv('﻿nome;email\nAna;ana@exemplo.com\nBeto;beto@exemplo.com');
  assert.equal(resultado.separador, ';');
  assert.deepEqual(resultado.cabecalho, ['nome', 'email']);
  assert.deepEqual(resultado.linhas, [
    ['Ana', 'ana@exemplo.com'],
    ['Beto', 'beto@exemplo.com'],
  ]);
});

test('converterPlanilhaXlsx lê a primeira aba como {cabecalho, linhas} usando o SheetJS', () => {
  const bytes = gerarBytesXlsx(XLSX, {
    cabecalho: ['nome', 'email'],
    linhas: [
      ['Ana', 'ana@exemplo.com'],
      ['Beto', 'beto@exemplo.com'],
    ],
  });
  const { cabecalho, linhas } = converterPlanilhaXlsx(XLSX, bytes);
  assert.deepEqual(cabecalho, ['nome', 'email']);
  assert.deepEqual(linhas, [
    ['Ana', 'ana@exemplo.com'],
    ['Beto', 'beto@exemplo.com'],
  ]);
});

function arquivoDeTexto(nome, texto) {
  const arquivo = new File([texto], nome, { type: 'text/csv' });
  return arquivo;
}

test('lerArquivo lê um CSV pequeno e devolve ok:true com cabeçalho e linhas', async () => {
  const arquivo = arquivoDeTexto('clientes.csv', 'nome;email\nAna;ana@exemplo.com');
  const resultado = await lerArquivo(arquivo);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.separador, ';');
  assert.deepEqual(resultado.cabecalho, ['nome', 'email']);
  assert.equal(resultado.nomeArquivo, 'clientes.csv');
});

test('lerArquivo recusa arquivo maior que 20 MB', async () => {
  const arquivo = { name: 'grande.csv', size: 21 * 1024 * 1024, text: async () => '' };
  const resultado = await lerArquivo(arquivo);
  assert.deepEqual(resultado, { ok: false, erro: 'arquivo_grande_demais' });
});

test('lerArquivo recusa formato não suportado', async () => {
  const arquivo = arquivoDeTexto('arquivo.pdf', 'nada');
  const resultado = await lerArquivo(arquivo);
  assert.deepEqual(resultado, { ok: false, erro: 'formato_nao_suportado' });
});

test('lerArquivo sem a biblioteca xlsx injetada devolve biblioteca_indisponivel para .xlsx', async () => {
  const arquivo = { name: 'planilha.xlsx', size: 10, arrayBuffer: async () => new ArrayBuffer(0) };
  const resultado = await lerArquivo(arquivo);
  assert.deepEqual(resultado, { ok: false, erro: 'biblioteca_indisponivel' });
});

test('lerArquivo lê um .xlsx quando a biblioteca é informada', async () => {
  const bytes = gerarBytesXlsx(XLSX, { cabecalho: ['nome'], linhas: [['Ana']] });
  const arquivo = {
    name: 'clientes.xlsx',
    size: bytes.byteLength ?? bytes.length,
    arrayBuffer: async () => bytes,
  };
  const resultado = await lerArquivo(arquivo, { xlsx: XLSX });
  assert.equal(resultado.ok, true);
  assert.deepEqual(resultado.cabecalho, ['nome']);
  assert.deepEqual(resultado.linhas, [['Ana']]);
});
