/**
 * Testes de Dividir PDF. Casos da pesquisa do iLovePDF
 * (documentação/pesquisa-ilovepdf/a-organizar.md, A2), com PDFs gerados aqui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  planejarDivisão, dividirPdf, nomesDasPartes, montarZipDasPartes,
  LIMITE_DE_ARQUIVOS_DE_SAÍDA, PARTES_COM_BOTÃO_PRÓPRIO,
} from '../scripts/cálculos/dividir-pdf.js';
import { abrirPdf } from '../scripts/cálculos/páginas-do-pdf.js';
import { calcularCrc32 } from '../scripts/comum/exportação/calcular-crc32.js';
import ferramenta from '../scripts/ferramentas/dividir-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import { biblioteca, pdfNumerado, origensDasPáginas } from './auxiliares/pdfs-de-teste.mjs';

async function abrir(quantidade, nome = 'Contrato Social.pdf') {
  const r = await abrirPdf({ nome, bytes: await pdfNumerado(quantidade) }, { biblioteca });
  assert.equal(r.ok, true);
  return { ...r, nome };
}

const dividir = async (aberto, pedido) => {
  const plano = planejarDivisão(aberto.total, pedido);
  assert.equal(plano.ok, true, plano.mensagem);
  const r = await dividirPdf(aberto, plano.partes, { biblioteca });
  assert.equal(r.ok, true, r.mensagem);
  return { plano, r };
};

/** Lê um ZIP "stored" (o que o portal grava) e confere o CRC de cada entrada. */
function lerZip(zip) {
  const visão = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fim = zip.length - 22;
  assert.equal(visão.getUint32(fim, true), 0x06054b50, 'fim do diretório central');
  const quantidade = visão.getUint16(fim + 10, true);
  let posição = visão.getUint32(fim + 16, true);
  const entradas = [];
  for (let i = 0; i < quantidade; i++) {
    assert.equal(visão.getUint32(posição, true), 0x02014b50);
    const crc = visão.getUint32(posição + 16, true);
    const tamanho = visão.getUint32(posição + 24, true);
    const tamanhoDoNome = visão.getUint16(posição + 28, true);
    const extras = visão.getUint16(posição + 30, true) + visão.getUint16(posição + 32, true);
    const local = visão.getUint32(posição + 42, true);
    const nome = new TextDecoder().decode(zip.subarray(posição + 46, posição + 46 + tamanhoDoNome));
    const início = local + 30 + visão.getUint16(local + 26, true) + visão.getUint16(local + 28, true);
    const bytes = zip.subarray(início, início + tamanho);
    assert.equal(calcularCrc32(bytes), crc, `CRC de ${nome}`);
    entradas.push({ nome, bytes });
    posição += 46 + tamanhoDoNome + extras;
  }
  return entradas;
}

test('intervalos 1-3 e 4-10 de 10 páginas: dois arquivos, de 3 e 7 páginas', async () => {
  const aberto = await abrir(10);
  const { plano, r } = await dividir(aberto, { modo: 'intervalos', intervalos: '1-3, 4-10' });
  assert.deepEqual(plano.partes, [{ de: 1, até: 3 }, { de: 4, até: 10 }]);
  assert.deepEqual(plano.fora, []);
  assert.equal(plano.sobrepostas, false);
  assert.deepEqual(r.arquivos.map((a) => a.páginas), [3, 7]);
  assert.deepEqual(r.arquivos.map((a) => a.nome), ['contrato-social-1-3.pdf', 'contrato-social-4-10.pdf']);
  assert.deepEqual(await origensDasPáginas(r.arquivos[0].bytes), [1, 2, 3]);
  assert.deepEqual(await origensDasPáginas(r.arquivos[1].bytes), [4, 5, 6, 7, 8, 9, 10]);
});

test('a cada 4 páginas de 10: arquivos de 4, 4 e 2 páginas', async () => {
  const { plano, r } = await dividir(await abrir(10), { modo: 'a-cada', tamanho: '4' });
  assert.deepEqual(plano.partes, [{ de: 1, até: 4 }, { de: 5, até: 8 }, { de: 9, até: 10 }]);
  assert.deepEqual(r.arquivos.map((a) => a.páginas), [4, 4, 2]);
  assert.deepEqual(await origensDasPáginas(r.arquivos[2].bytes), [9, 10]);
});

test('a cada 1 página: um arquivo por página, com o número da página no nome', async () => {
  const { r } = await dividir(await abrir(3), { modo: 'a-cada', tamanho: '1' });
  assert.deepEqual(r.arquivos.map((a) => a.nome), ['contrato-social-1.pdf', 'contrato-social-2.pdf', 'contrato-social-3.pdf']);
});

test('a cada N com N igual ou maior que o total: um arquivo só, com todas as páginas', async () => {
  for (const n of ['10', '11', '9999']) {
    const { plano, r } = await dividir(await abrir(10), { modo: 'a-cada', tamanho: n });
    assert.equal(plano.partes.length, 1, n);
    assert.deepEqual(await origensDasPáginas(r.arquivos[0].bytes), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }
});

test('propriedade: no modo a cada N, as partes juntas cobrem o PDF inteiro, sem repetir nem pular página', async () => {
  const aberto = await abrir(11);
  for (const n of [1, 2, 3, 5, 7, 11, 12]) {
    const { r } = await dividir(aberto, { modo: 'a-cada', tamanho: String(n) });
    const todas = (await Promise.all(r.arquivos.map((a) => origensDasPáginas(a.bytes)))).flat();
    assert.deepEqual(todas, Array.from({ length: 11 }, (_, i) => i + 1), `N = ${n}`);
    assert.ok(r.arquivos.slice(0, -1).every((a) => a.páginas === n), 'só o último pode ser menor');
  }
});

test('intervalos que deixam páginas de fora ou se sobrepõem são avisados, não recusados', async () => {
  const aberto = await abrir(10);
  const fora = planejarDivisão(10, { modo: 'intervalos', intervalos: '1-3, 6' });
  assert.equal(fora.ok, true);
  assert.deepEqual(fora.fora, [4, 5, 7, 8, 9, 10]);
  const sobre = planejarDivisão(10, { modo: 'intervalos', intervalos: '1-5, 4-10' });
  assert.equal(sobre.sobrepostas, true);
  assert.deepEqual(sobre.fora, []);
  const { r } = await dividir(aberto, { modo: 'intervalos', intervalos: '1-5, 4-10' });
  assert.deepEqual(r.arquivos.map((a) => a.páginas), [5, 7]);
});

test('a ordem digitada vale, e a mesma parte pedida duas vezes ganha nome diferente', async () => {
  const { r } = await dividir(await abrir(6), { modo: 'intervalos', intervalos: '4-6, 1-3, 4-6' });
  assert.deepEqual(r.arquivos.map((a) => a.nome), ['contrato-social-4-6.pdf', 'contrato-social-1-3.pdf', 'contrato-social-4-6-2.pdf']);
  assert.equal(new Set(r.arquivos.map((a) => a.nome)).size, 3);
  assert.deepEqual(nomesDasPartes('x.pdf', [{ de: 2, até: 2 }, { de: 2, até: 2 }]), ['x-2.pdf', 'x-2-2.pdf']);
});

test('recusas: 0-3, 5-11, 8-3, texto, vazio e intervalo digitado errado, no campo certo', () => {
  const recusa = (pedido, total = 10) => planejarDivisão(total, pedido);
  const zero = recusa({ modo: 'intervalos', intervalos: '0-3' });
  assert.equal(zero.ok, false);
  assert.equal(zero.erro, 'página_zero');
  assert.equal(zero.campo, 'intervalos');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '5-11' }).mensagem, 'O intervalo 5-11 passa do fim: o PDF tem 10 páginas.');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '8-3' }).erro, 'intervalo_invertido');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '1-3, abc' }).erro, 'páginas_inválido');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '' }).mensagem, 'Informe os intervalos, um por arquivo, por exemplo: 1-3, 4-10.');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '1,,3' }).ok, true, 'vírgula sobrando não atrapalha');
  assert.equal(recusa({ modo: 'intervalos', intervalos: '1-5, 4-5', extra: 1 }, 5).ok, true);
});

test('recusas do modo a cada N: vazio, zero, negativo, decimal, texto, notação científica e arquivos demais', () => {
  for (const tamanho of ['', '0', '-3', '2,5', '2.5', 'abc', '1e3', ' ', '00', undefined]) {
    const r = planejarDivisão(10, { modo: 'a-cada', tamanho });
    if (tamanho === '00') { assert.equal(r.erro, 'tamanho_inválido'); continue; }
    assert.equal(r.ok, false, String(tamanho));
    assert.equal(r.campo, 'tamanho');
    assert.equal(r.erro, 'tamanho_inválido');
  }
  assert.equal(planejarDivisão(10, { modo: 'a-cada', tamanho: ' 3 ' }).ok, true, 'espaços em volta não atrapalham');
  assert.equal(planejarDivisão(10, { modo: 'a-cada', tamanho: '99999999999999999999999' }).ok, false, 'número fora do inteiro seguro');

  const demais = planejarDivisão(2000, { modo: 'a-cada', tamanho: '1' });
  assert.equal(demais.erro, 'muitos_arquivos');
  assert.match(demais.mensagem, /mais de 500 arquivos/);
  assert.equal(planejarDivisão(500, { modo: 'a-cada', tamanho: '1' }).ok, true, 'no limite vale');
  assert.equal(LIMITE_DE_ARQUIVOS_DE_SAÍDA, 500);

  const intervalosDemais = Array.from({ length: 501 }, () => '1').join(',');
  assert.equal(planejarDivisão(10, { modo: 'intervalos', intervalos: intervalosDemais }).erro, 'muitos_arquivos');
});

test('cancelar interrompe e não entrega nada; o progresso conta parte a parte', async () => {
  const aberto = await abrir(6);
  const { partes } = planejarDivisão(6, { modo: 'a-cada', tamanho: '1' });
  const passos = [];
  const r = await dividirPdf(aberto, partes, { biblioteca, aoProgredir: (p) => passos.push(p.parte) });
  assert.equal(r.ok, true);
  assert.deepEqual(passos, [1, 2, 3, 4, 5, 6]);

  let vezes = 0;
  const cancelada = await dividirPdf(aberto, partes, { biblioteca, cancelado: () => ++vezes > 2 });
  assert.equal(cancelada.ok, false);
  assert.equal(cancelada.erro, 'cancelado');
  assert.match(cancelada.mensagem, /Nenhum arquivo foi gerado/);
});

test('soma das partes acima do limite é recusada com a explicação', async () => {
  const aberto = await abrir(4);
  const { partes } = planejarDivisão(4, { modo: 'a-cada', tamanho: '1' });
  const r = await dividirPdf(aberto, partes, { biblioteca, limiteTotal: 1500 });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'saída_grande_demais');
  assert.match(r.mensagem, /400 MB/);
});

test('o ZIP traz todas as partes, com nomes e conteúdo intactos e CRC correto', async () => {
  const { r } = await dividir(await abrir(5), { modo: 'a-cada', tamanho: '2' });
  const entradas = lerZip(montarZipDasPartes(r.arquivos));
  assert.deepEqual(entradas.map((e) => e.nome), ['contrato-social-1-2.pdf', 'contrato-social-3-4.pdf', 'contrato-social-5.pdf']);
  for (const [i, entrada] of entradas.entries()) {
    assert.deepEqual(Buffer.from(entrada.bytes), Buffer.from(r.arquivos[i].bytes));
    assert.equal((await origensDasPáginas(entrada.bytes)).length, r.arquivos[i].páginas);
  }
});

test('as partes são íntegras e o original aberto não muda', async () => {
  const aberto = await abrir(8);
  await dividir(aberto, { modo: 'a-cada', tamanho: '3' });
  assert.equal(aberto.documento.getPageCount(), 8);
  const de = async () => (await dividir(aberto, { modo: 'intervalos', intervalos: '2-3, 7' })).r.arquivos.map((a) => a.páginas);
  assert.deepEqual(await de(), await de());
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['dividir-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.doesNotMatch(ficha.processa, /fflate/);
  assert.match(ficha.processa, /não sai do aparelho/);
});

test('"Como usar" está completo e o exemplo bate com a conta', async () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3 && exemplo.texto && limites && perguntas.length >= 3);
  assert.match(limites, /100 MB/);
  assert.match(limites, /500 arquivos/);
  assert.ok(PARTES_COM_BOTÃO_PRÓPRIO >= 3);
  const { r } = await dividir(await abrir(10), { modo: 'a-cada', tamanho: '4' });
  assert.deepEqual(r.arquivos.map((a) => a.páginas), [4, 4, 2]);
  assert.match(exemplo.texto, /4, 4 e 2 páginas/);
});
