import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  gerarBlobCsv,
  gerarBlobXlsx,
  gerarBytesXlsx,
  gerarTextoCsv,
  gerarTextoCsvComBom,
  nomeArquivoLimpo,
} from '../../frontend/ferramentas/limpar-planilha/limpar-planilha-exportacao.js';
import { analisarTextoCsv, converterPlanilhaXlsx, removerBom } from '../../frontend/ferramentas/limpar-planilha/limpar-planilha-leitura.js';

const DADOS = {
  cabecalho: ['nome', 'email', 'observacao'],
  linhas: [
    ['Ana Silva', 'ana@exemplo.com', 'sem observação'],
    ['Beto Prado, Jr.', 'beto@exemplo.com', 'endereço com "aspas"'],
  ],
};

test('gerarTextoCsv separa por "," por padrão e usa \\r\\n entre linhas', () => {
  const texto = gerarTextoCsv(DADOS, ',');
  assert.equal(texto.includes('\r\n'), true);
  assert.equal(texto.split('\r\n')[0], 'nome,email,observacao');
});

test('gerarTextoCsv coloca aspas em campo com separador, aspas ou quebra de linha', () => {
  const texto = gerarTextoCsv({ cabecalho: ['a'], linhas: [['tem, vírgula'], ['tem "aspas"'], ['tem\nquebra']] }, ',');
  const linhas = texto.split('\r\n');
  assert.equal(linhas[1], '"tem, vírgula"');
  assert.equal(linhas[2], '"tem ""aspas"""');
  assert.equal(linhas[3], '"tem\nquebra"');
});

test('gerarTextoCsvComBom começa com o caractere BOM', () => {
  const texto = gerarTextoCsvComBom(DADOS, ';');
  assert.equal(texto.charCodeAt(0), 0xfeff);
});

test('CSV exportado com BOM, relido, dá o mesmo cabeçalho e linhas', async () => {
  // `Blob#text()` decodifica com TextDecoder, que por padrão já remove o BOM (é o comportamento
  // do navegador e do Node); por isso a garantia real do BOM está nos bytes, checada a seguir.
  const separadorOriginal = ';';
  const blob = gerarBlobCsv(DADOS, separadorOriginal);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]); // BOM UTF-8 em bytes

  const textoLido = await blob.text();
  const resultado = analisarTextoCsv(textoLido);
  assert.equal(resultado.separador, separadorOriginal);
  assert.deepEqual(resultado.cabecalho, DADOS.cabecalho);
  assert.deepEqual(resultado.linhas, DADOS.linhas);
});

test('removerBom junto com gerarTextoCsv (sem Blob) também fecha o ciclo', () => {
  const textoComBom = gerarTextoCsvComBom(DADOS, ',');
  const textoSemBom = removerBom(textoComBom);
  assert.equal(textoSemBom, gerarTextoCsv(DADOS, ','));
});

test('XLSX gerado com gerarBytesXlsx é relido com o pacote xlsx do node_modules e dá os mesmos dados', () => {
  const bytes = gerarBytesXlsx(XLSX, DADOS);
  const { cabecalho, linhas } = converterPlanilhaXlsx(XLSX, bytes);
  assert.deepEqual(cabecalho, DADOS.cabecalho);
  assert.deepEqual(linhas, DADOS.linhas);
});

test('gerarBlobXlsx devolve um Blob cujo conteúdo relido bate com os dados originais', async () => {
  const blob = gerarBlobXlsx(XLSX, DADOS);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { cabecalho, linhas } = converterPlanilhaXlsx(XLSX, bytes);
  assert.deepEqual(cabecalho, DADOS.cabecalho);
  assert.deepEqual(linhas, DADOS.linhas);
});

test('nomeArquivoLimpo troca só a extensão final por -limpo.<extensao>', () => {
  assert.equal(nomeArquivoLimpo('clientes-setembro.xlsx', 'csv'), 'clientes-setembro-limpo.csv');
  assert.equal(nomeArquivoLimpo('dados.csv', 'xlsx'), 'dados-limpo.xlsx');
  assert.equal(nomeArquivoLimpo('sem.extensao.aqui.csv', 'csv'), 'sem.extensao.aqui-limpo.csv');
});
