/**
 * ZIP: compactar e descompactar (F201).
 *
 * Três fontes independentes conferem o código:
 * - um ZIP real, criado pelo Compress-Archive do PowerShell 7 (fixture em base64), que o leitor precisa abrir;
 * - o `zlib` do Node, que cria os dados deflate dos ZIPs hostis e confere o deflate que o navegador gera;
 * - o CRC-32 de "123456789", que vale 0xCBF43926 (valor de verificação do catálogo CRC de Greg Cook).
 *
 * Os ZIPs hostis são montados à mão (cabeçalhos escritos byte a byte) para fingir tamanhos, nomes e bandeiras.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';

import {
  LIMITES, ErroDeZip, criarZip, lerZip, extrairEntrada, conferirPedido, nomesParaCompactar, nomeParaBaixar,
  motivoDoCaminhoPerigoso, éExecutável, extensãoDe, comprimir, descomprimir,
} from '../scripts/cálculos/zip.js';
import { calcularCrc32 } from '../scripts/comum/exportação/calcular-crc32.js';
import { compactarNaTela, listarNaTela, extrairMarcados } from '../scripts/ferramentas/zip.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

const FIXTURE_DO_POWERSHELL = 'UEsDBBQAAAAIAHlsRl27OAwkEgAAABAAAAALAAAAcGFzdGEvYi50eHQrTk0vzUvJV0gsKizNLMvnAgBQSwMEFAAAAAgAeWxGXddzttAWAAAACAIAAAUAAABhLnR4dPPPObxQRyG3NC8lX1HBf5SjMELDAABQSwMEFAAAAAAAeWxGXQAAAAAAAAAAAAAAAAkAAAB2YXppby50eHRQSwMEFAAACAgAeWxGXfqYJogWAAAAFAAAAAoAAABhw6fDo28udHh0S87PK0k9vCslXyE5P1chMTk1ryQfAFBLAQIUABQAAAAIAHlsRl27OAwkEgAAABAAAAALAAAAAAAAAAAAAAAAAAAAAABwYXN0YS9iLnR4dFBLAQIUABQAAAAIAHlsRl3Xc7bQFgAAAAgCAAAFAAAAAAAAAAAAAAAAADsAAABhLnR4dFBLAQIUABQAAAAAAHlsRl0AAAAAAAAAAAAAAAAJAAAAAAAAAAAAAAAAAHQAAAB2YXppby50eHRQSwECFAAUAAAICAB5bEZd+pgmiBYAAAAUAAAACgAAAAAAAAAAAAAAAACbAAAAYcOnw6NvLnR4dFBLBQYAAAAABAAEANsAAADZAAAAAAA=';

const codificador = new TextEncoder();
const textoDe = (bytes) => new TextDecoder().decode(bytes);

/** Mensagem de erro de uma promessa que precisa falhar. */
async function recusaDe(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  return assert.fail('era esperada uma recusa');
}
function recusaSíncrona(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  return assert.fail('era esperada uma recusa');
}

/**
 * Monta um ZIP à mão. Cada entrada traz os bytes exatamente como ficam no arquivo (já deflate ou não) e os campos
 * dos cabeçalhos, que podem mentir.
 * @param {{nome: string, dados?: Uint8Array, método?: number, crc?: number, tamanho?: number, compactado?: number, bandeiras?: number, atributos?: number, deslocamento?: number}[]} entradas
 */
function montarZipManual(entradas, { semFim = false, quantidade } = {}) {
  const partes = [];
  const posições = [];
  let p = 0;
  const empurrar = (bytes) => { partes.push(bytes); p += bytes.length; };
  for (const e of entradas) {
    posições.push(e.deslocamento ?? p);
    if (e.deslocamento !== undefined) continue; // aponta para dados de outra entrada: não escreve nada
    const nome = codificador.encode(e.nome);
    const dados = e.dados ?? new Uint8Array(0);
    const cabeçalho = new DataView(new ArrayBuffer(30));
    cabeçalho.setUint32(0, 0x04034b50, true);
    cabeçalho.setUint16(4, 20, true);
    cabeçalho.setUint16(6, e.bandeiras ?? 0x0800, true);
    cabeçalho.setUint16(8, e.método ?? 0, true);
    cabeçalho.setUint32(14, e.crc ?? calcularCrc32(dados), true);
    cabeçalho.setUint32(18, e.compactado ?? dados.length, true);
    cabeçalho.setUint32(22, e.tamanho ?? dados.length, true);
    cabeçalho.setUint16(26, nome.length, true);
    empurrar(new Uint8Array(cabeçalho.buffer));
    empurrar(nome);
    empurrar(dados);
  }
  const inícioCentral = p;
  entradas.forEach((e, i) => {
    const nome = codificador.encode(e.nome);
    const dados = e.dados ?? new Uint8Array(0);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, e.bandeiras ?? 0x0800, true);
    central.setUint16(10, e.método ?? 0, true);
    central.setUint32(16, e.crc ?? calcularCrc32(dados), true);
    central.setUint32(20, e.compactado ?? dados.length, true);
    central.setUint32(24, e.tamanho ?? dados.length, true);
    central.setUint16(28, nome.length, true);
    central.setUint32(38, e.atributos ?? 0, true);
    central.setUint32(42, posições[i], true);
    empurrar(new Uint8Array(central.buffer));
    empurrar(nome);
  });
  const tamanhoCentral = p - inícioCentral;
  if (!semFim) {
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true);
    fim.setUint16(8, quantidade ?? entradas.length, true);
    fim.setUint16(10, quantidade ?? entradas.length, true);
    fim.setUint32(12, tamanhoCentral, true);
    fim.setUint32(16, inícioCentral, true);
    empurrar(new Uint8Array(fim.buffer));
  }
  const saída = new Uint8Array(p);
  let q = 0;
  for (const parte of partes) { saída.set(parte, q); q += parte.length; }
  return saída;
}

const comDeflate = (texto) => {
  const bruto = typeof texto === 'string' ? codificador.encode(texto) : texto;
  return { bruto, dados: new Uint8Array(deflateRawSync(bruto)) };
};

/* ------------------------------------------------------------------ ZIP de verdade */

test('CRC-32 de "123456789" é 0xCBF43926', () => {
  assert.equal(calcularCrc32(codificador.encode('123456789')), 0xCBF43926);
});

test('abre um ZIP criado por outro programa: nomes (com acento), pastas, tamanhos e conteúdo conferido pelo CRC', async () => {
  const bytes = new Uint8Array(Buffer.from(FIXTURE_DO_POWERSHELL, 'base64'));
  const { entradas, tamanhoTotal } = lerZip(bytes);
  assert.deepEqual(entradas.map((e) => [e.nome, e.tamanho, e.recusa]), [
    ['pasta/b.txt', 16, null], ['a.txt', 520, null], ['vazio.txt', 0, null], ['ação.txt', 20, null],
  ]);
  assert.equal(tamanhoTotal, 556);
  assert.equal(textoDe(await extrairEntrada(bytes, entradas[0])), 'segundo arquivo' + String.fromCharCode(10));
  assert.equal(textoDe(await extrairEntrada(bytes, entradas[1])), 'Olá, mundo! '.repeat(40));
  assert.equal((await extrairEntrada(bytes, entradas[2])).length, 0);
  assert.equal(textoDe(await extrairEntrada(bytes, entradas[3])), 'conteúdo com acento');
});

test('criar e abrir: o texto comprime, o binário aleatório fica guardado sem compressão, e tudo volta igual', async () => {
  const aleatório = new Uint8Array(randomBytes(5000)); // incompressível de verdade
  const texto = codificador.encode('linha repetida para comprimir bem. '.repeat(500));
  const arquivos = [
    { nome: 'texto.txt', bytes: texto }, { nome: 'binário.bin', bytes: aleatório },
    { nome: 'vazio.txt', bytes: new Uint8Array(0) }, { nome: 'ação ✓.txt', bytes: codificador.encode('ok') },
  ];
  const zip = await criarZip(arquivos);
  assert.equal(zip.método, 'misto');
  assert.ok(zip.bytes.length < texto.length / 5 + aleatório.length + 400, 'o texto repetido ficou pequeno');

  const { entradas } = lerZip(zip.bytes);
  assert.deepEqual(entradas.map((e) => e.nome), ['texto.txt', 'binário.bin', 'vazio.txt', 'ação ✓.txt']);
  assert.deepEqual(entradas.map((e) => e.método), [8, 0, 0, 0]);
  for (const [i, entrada] of entradas.entries()) {
    assert.deepEqual(await extrairEntrada(zip.bytes, entrada), arquivos[i].bytes, entrada.nome);
  }
  // Sem comprimir, tudo é "stored".
  const simples = await criarZip(arquivos, { comprimir: false });
  assert.equal(simples.método, 'stored');
  assert.ok(lerZip(simples.bytes).entradas.every((e) => e.método === 0));
});

test('o deflate que o navegador gera é lido pelo zlib do Node, e o do zlib é lido pelo leitor', async () => {
  const original = codificador.encode('abcabcabc '.repeat(2000));
  const deNós = await comprimir(original);
  assert.deepEqual(new Uint8Array(inflateRawSync(deNós)), original);
  assert.deepEqual(await descomprimir(new Uint8Array(deflateRawSync(original)), original.length), original);
});

test('o ZIP criado tem a estrutura certa: assinaturas, contagem e UTF-8 declarado', async () => {
  const { bytes } = await criarZip([{ nome: 'ação.txt', bytes: codificador.encode('x'.repeat(100)) }]);
  const visão = new DataView(bytes.buffer);
  assert.equal(visão.getUint32(0, true), 0x04034b50);
  assert.equal(visão.getUint16(6, true) & 0x0800, 0x0800);
  assert.equal(visão.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(visão.getUint16(bytes.length - 12, true), 1);
});

test('limites de compactar: nenhum arquivo, arquivos demais, soma grande demais e cancelamento', async () => {
  assert.match((await recusaDe(criarZip([]))).message, /pelo menos um/);
  const muitos = Array.from({ length: LIMITES.arquivos + 1 }, (_, i) => ({ nome: `f${i}`, bytes: new Uint8Array(1) }));
  assert.match((await recusaDe(criarZip(muitos))).message, /limite é 2000/);
  const grande = [{ nome: 'a', bytes: new Uint8Array(LIMITES.bytesTotais) }, { nome: 'b', bytes: new Uint8Array(1) }];
  assert.match((await recusaDe(criarZip(grande, { comprimir: false }))).message, /somam mais de 200 MB/);
  assert.match((await recusaDe(criarZip([{ nome: 'a', bytes: new Uint8Array(1) }], { cancelado: () => true }))).message, /Cancelado/);
});

test('nomes ao compactar: caminho some, repetido ganha número (sem diferenciar maiúscula), reservado e vazio são corrigidos', () => {
  assert.deepEqual(nomesParaCompactar(['a/b/foto.jpg', 'FOTO.jpg', 'Foto.JPG', 'con.txt', '', '...', 'a:b?.txt']),
    ['foto.jpg', 'FOTO (2).jpg', 'Foto (3).JPG', '_con.txt', 'arquivo', 'arquivo (2)', 'a_b_.txt']);
  const longo = nomesParaCompactar(['x'.repeat(400) + '.pdf'])[0];
  assert.ok(codificador.encode(longo).length <= LIMITES.nomeEmBytes);
});

/* ------------------------------------------------------------------ nomes perigosos (zip slip) */

test('caminhos perigosos são reconhecidos', () => {
  const RTL = String.fromCharCode(0x202E);
  const perigosos = ['../fora.txt', 'a/../../fora.txt', '/etc/passwd', 'C:\\Windows\\x.dll', 'c:/x', '..\\fora.txt', 'a\\..\\..\\b',
    'ok/%2e%2e/x', 'a\u0000.txt', `fdp${RTL}exe.txt`, '', 'x'.repeat(2000), '\\\\servidor\\pasta\\x', 'a/b/..'];
  for (const nome of perigosos) assert.ok(motivoDoCaminhoPerigoso(nome), JSON.stringify(nome.slice(0, 30)));
  for (const nome of ['a.txt', 'pasta/sub/a.txt', 'a..b.txt', '...hidden', 'pasta/...', 'ação/ç.txt', 'a b/c d.txt', 'pasta/']) {
    assert.equal(motivoDoCaminhoPerigoso(nome), null, nome);
  }
});

test('nome do arquivo baixado: só o último trecho, limpo, sem nome reservado e sem passar de 150', () => {
  assert.equal(nomeParaBaixar('a/b/c.txt'), 'c.txt');
  assert.equal(nomeParaBaixar('..\\..\\fora.txt'), 'fora.txt');
  assert.equal(nomeParaBaixar('a/b/'), 'b');
  assert.equal(nomeParaBaixar('a:b*c?.txt'), 'a_b_c_.txt');
  assert.equal(nomeParaBaixar('NUL.txt'), '_NUL.txt');
  assert.equal(nomeParaBaixar('x.txt...'), 'x.txt');
  assert.equal(nomeParaBaixar('..'), 'arquivo');
  assert.equal(nomeParaBaixar(''), 'arquivo');
  const longo = nomeParaBaixar(`${'n'.repeat(300)}.pdf`);
  assert.ok(longo.length <= 150 && longo.endsWith('.pdf'));
  for (const perigoso of ['../x', '..\\x', '/etc/x', 'a/../b', 'C:\\x']) {
    const nome = nomeParaBaixar(perigoso);
    assert.ok(!/[\\/]/.test(nome) && nome !== '..', perigoso);
  }
});

test('extensões executáveis', () => {
  assert.equal(extensãoDe('A.EXE'), 'exe');
  assert.equal(extensãoDe('semextensão'), '');
  assert.ok(éExecutável('setup.exe') && éExecutável('x.bat') && éExecutável('a.JS') && éExecutável('app.apk'));
  assert.ok(!éExecutável('foto.jpg') && !éExecutável('relatorio.pdf'));
});

test('entradas com caminho perigoso, senha, atalho e método estranho são listadas como RECUSADAS, e as demais seguem boas', () => {
  const ok = codificador.encode('ok');
  const zip = montarZipManual([
    { nome: 'bom.txt', dados: ok },
    { nome: '../fora.txt', dados: ok },
    { nome: '/etc/passwd', dados: ok },
    { nome: 'C:\\Windows\\sistema.dll', dados: ok },
    { nome: 'senha.txt', dados: ok, bandeiras: 0x0801 },
    { nome: 'atalho', dados: codificador.encode('/etc/shadow'), atributos: (0xA1FF << 16) >>> 0 },
    { nome: 'raro.txt', dados: ok, método: 12 },
    { nome: 'aes.txt', dados: ok, método: 99 },
    { nome: 'pasta/', dados: new Uint8Array(0) },
    { nome: 'setup.exe', dados: ok },
  ]);
  const { entradas } = lerZip(zip);
  const por = Object.fromEntries(entradas.map((e) => [e.nome, e]));
  assert.equal(por['bom.txt'].recusa, null);
  assert.match(por['../fora.txt'].recusa, /caminho suspeito: sobe de pasta/);
  assert.match(por['/etc/passwd'].recusa, /caminho absoluto/);
  assert.match(por['C:\\Windows\\sistema.dll'].recusa, /letra de unidade/);
  assert.match(por['senha.txt'].recusa, /senha/);
  assert.match(por.atalho.recusa, /symlink/);
  assert.match(por['raro.txt'].recusa, /método de compressão 12/);
  assert.match(por['aes.txt'].recusa, /senha/);
  assert.equal(por['pasta/'].éPasta, true);
  assert.equal(por['setup.exe'].recusa, null);
  assert.match(por['setup.exe'].aviso, /executável/);
});

test('extrair uma entrada recusada falha com o motivo, e o nome de exibição mostra caracteres escondidos', async () => {
  const RTL = String.fromCharCode(0x202E);
  const zip = montarZipManual([{ nome: `fdp${RTL}exe.txt`, dados: codificador.encode('x') }, { nome: '../x', dados: codificador.encode('x') }]);
  const { entradas } = lerZip(zip);
  assert.ok(entradas[0].nomeExibido.includes('‹U+202E›'));
  assert.ok(!entradas[0].nomeExibido.includes(RTL));
  const erro = await recusaDe(extrairEntrada(zip, entradas[1]));
  assert.ok(erro instanceof ErroDeZip);
  assert.match(erro.message, /não pode ser extraído: caminho suspeito/);
});

/* ------------------------------------------------------------------ ZIP bomba e arquivo ruim */

test('bomba: o tamanho declarado mente (pequeno), mas o conteúdo é enorme: a extração para antes de encher a memória', async () => {
  const { dados } = comDeflate(new Uint8Array(20 * 1024 * 1024)); // 20 MB de zeros viram uns 20 KB
  assert.ok(dados.length < 40_000);
  const zip = montarZipManual([{ nome: 'zeros.bin', dados, método: 8, tamanho: 100, crc: 0 }]);
  const { entradas } = lerZip(zip);
  assert.equal(entradas[0].recusa, null, 'declarou 100 bytes: passa na lista');
  const erro = await recusaDe(extrairEntrada(zip, entradas[0]));
  assert.ok(erro instanceof ErroDeZip);
  assert.match(erro.message, /mais do que o tamanho declarado/);
});

test('bomba: taxas de compressão impossíveis ou suspeitas são recusadas na lista', () => {
  const { dados } = comDeflate(new Uint8Array(50_000));
  const impossível = montarZipManual([{ nome: 'a.bin', dados, método: 8, tamanho: dados.length * 2000, crc: 0 }]);
  assert.match(lerZip(impossível).entradas[0].recusa, /taxa de compressão impossível/);

  // 30 MB declarados em ~30 KB reais: taxa de 1000:1 num arquivo grande (o deflate chega perto de 1030:1).
  const suspeita = montarZipManual([{ nome: 'b.bin', dados, método: 8, tamanho: 30 * 1024 * 1024, crc: 0, compactado: 100 }]);
  assert.match(lerZip(suspeita).entradas[0].recusa, /taxa de compressão suspeita|fora do arquivo|impossível/);

  // Arquivo maior que o limite por arquivo.
  const gigante = montarZipManual([{ nome: 'c.bin', dados, método: 8, tamanho: LIMITES.bytesPorArquivo + 1, crc: 0 }]);
  assert.match(lerZip(gigante).entradas[0].recusa, /maior que 200 MB|taxa/);
});

test('bomba sobreposta: entradas que apontam para os mesmos bytes fazem o ZIP inteiro ser recusado', () => {
  const { dados } = comDeflate(new Uint8Array(100_000));
  const entradas = [{ nome: 'a0.bin', dados, método: 8, tamanho: 100_000, crc: 0 }];
  for (let i = 1; i < 50; i += 1) entradas.push({ nome: `a${i}.bin`, método: 8, tamanho: 100_000, compactado: dados.length, crc: 0, deslocamento: 0 });
  const erro = recusaSíncrona(() => lerZip(montarZipManual(entradas)));
  assert.ok(erro instanceof ErroDeZip);
  assert.match(erro.message, /se sobrepõem/);
});

test('dados corrompidos: byte alterado no deflate ou no conteúdo guardado é pego (CRC ou deflate)', async () => {
  const { bruto, dados } = comDeflate('conteúdo importante que não pode mudar. '.repeat(30));
  const bom = montarZipManual([{ nome: 'a.txt', dados, método: 8, tamanho: bruto.length, crc: calcularCrc32(bruto) }]);
  assert.equal((await extrairEntrada(bom, lerZip(bom).entradas[0])).length, bruto.length);
  const ruim = Uint8Array.from(bom);
  ruim[30 + 5 + Math.floor(dados.length / 2)] ^= 0xFF;
  const erro = await recusaDe(extrairEntrada(ruim, lerZip(ruim).entradas[0]));
  assert.ok(erro instanceof ErroDeZip);
  assert.match(erro.message, /danificados|CRC|corrompido/);

  const guardado = montarZipManual([{ nome: 'b.txt', dados: codificador.encode('abcdef') }]);
  guardado[30 + 5] ^= 1;
  assert.match((await recusaDe(extrairEntrada(guardado, lerZip(guardado).entradas[0]))).message, /CRC-32/);

  // Declara 5 bytes, mas o conteúdo guardado tem outro tamanho: recusado na lista.
  const mente = montarZipManual([{ nome: 'c.txt', dados: codificador.encode('abcdef'), tamanho: 5 }]);
  assert.match(lerZip(mente).entradas[0].recusa, /tamanhos incoerentes/);
});

test('deflate truncado: erro de arquivo corrompido, não travamento', async () => {
  const { bruto, dados } = comDeflate('x y z '.repeat(1000));
  const cortado = dados.subarray(0, Math.floor(dados.length / 2));
  const zip = montarZipManual([{ nome: 'a.txt', dados: cortado, método: 8, tamanho: bruto.length, crc: calcularCrc32(bruto), compactado: cortado.length }]);
  const erro = await recusaDe(extrairEntrada(zip, lerZip(zip).entradas[0]));
  assert.ok(erro instanceof ErroDeZip);
});

test('arquivos que não são ZIP, ZIP cortado e índice quebrado', async () => {
  assert.match(recusaSíncrona(() => lerZip(new Uint8Array(0))).message, /vazio/);
  assert.match(recusaSíncrona(() => lerZip(new Uint8Array(10))).message, /pequeno demais/);
  assert.match(recusaSíncrona(() => lerZip(new Uint8Array(500).fill(7))).message, /não é um ZIP/);
  assert.match(recusaSíncrona(() => lerZip(codificador.encode('%PDF-1.4 '.repeat(50)))).message, /não é um ZIP/);
  const { bytes } = await criarZip([{ nome: 'a.txt', bytes: codificador.encode('x'.repeat(500)) }]);
  assert.match(recusaSíncrona(() => lerZip(bytes.subarray(0, bytes.length - 30))).message, /incompleto ou danificado/);
  assert.match(recusaSíncrona(() => lerZip(montarZipManual([{ nome: 'a', dados: new Uint8Array(1) }], { semFim: true }))).message, /incompleto ou danificado/);

  const quebrado = Uint8Array.from(bytes);
  new DataView(quebrado.buffer).setUint32(quebrado.length - 6, 0x7FFFFFFF, true); // índice aponta para fora
  assert.match(recusaSíncrona(() => lerZip(quebrado)).message, /fora do arquivo|corrompido/);

  const entradaRuim = Uint8Array.from(bytes);
  const inícioDoÍndice = new DataView(entradaRuim.buffer).getUint32(entradaRuim.length - 6, true);
  entradaRuim[inícioDoÍndice] = 0; // assinatura da entrada destruída
  assert.match(recusaSíncrona(() => lerZip(entradaRuim)).message, /índice do ZIP está corrompido/);
});

test('contagens mentirosas: ZIP64, volumes, vazio e entradas demais', () => {
  const ok = montarZipManual([{ nome: 'a', dados: new Uint8Array(1) }]);
  const mudar = (deslocamentoDoFim, valor, tamanho) => {
    const cópia = Uint8Array.from(ok);
    const visão = new DataView(cópia.buffer);
    if (tamanho === 2) visão.setUint16(cópia.length - 22 + deslocamentoDoFim, valor, true); else visão.setUint32(cópia.length - 22 + deslocamentoDoFim, valor, true);
    return cópia;
  };
  assert.match(recusaSíncrona(() => lerZip(mudar(10, 0xFFFF, 2))).message, /ZIP64/);
  assert.match(recusaSíncrona(() => lerZip(mudar(16, 0xFFFFFFFF, 4))).message, /ZIP64/);
  assert.match(recusaSíncrona(() => lerZip(mudar(4, 1, 2))).message, /vários volumes/);
  assert.match(recusaSíncrona(() => lerZip(mudar(10, 0, 2))).message, /vazio/);
  assert.match(recusaSíncrona(() => lerZip(montarZipManual([{ nome: 'a' }], { quantidade: 60000 }))).message, /entradas e o limite é 10\.000/);
  // Diz ter 3 entradas, mas só existe uma: o índice acaba antes.
  assert.match(recusaSíncrona(() => lerZip(montarZipManual([{ nome: 'a', dados: new Uint8Array(1) }], { quantidade: 3 }))).message, /corrompido/);
  // ZIP maior que o limite da ferramenta.
  assert.match(recusaSíncrona(() => lerZip(new Uint8Array(LIMITES.bytesTotais + 1))).message, /200 MB/);
});

test('ZIP com ruído e prefixo falso: não trava nem passa', () => {
  const t0 = performance.now();
  const ruído = new Uint8Array(3_000_000);
  let semente = 5;
  for (let i = 0; i < ruído.length; i += 1) { semente = (semente * 1103515245 + 12345) & 0x7fffffff; ruído[i] = semente >> 16; }
  assert.ok(recusaSíncrona(() => lerZip(ruído)) instanceof ErroDeZip);
  assert.ok(performance.now() - t0 < 2000);
});

test('nomes repetidos dentro do ZIP viram aviso, não erro', () => {
  const zip = montarZipManual([{ nome: 'a.txt', dados: codificador.encode('1') }, { nome: 'A.txt', dados: codificador.encode('2') }]);
  assert.match(lerZip(zip).avisos[0], /1 nome\(s\) aparecem mais de uma vez/);
});

test('pedido de extração: limites de quantidade e de tamanho', () => {
  const entrada = (tamanho) => ({ tamanho });
  assert.match(conferirPedido([]), /Marque pelo menos um/);
  assert.equal(conferirPedido([entrada(10)]), null);
  assert.match(conferirPedido(Array.from({ length: LIMITES.arquivosPorPedido + 1 }, () => entrada(1))), /até 25 arquivos/);
  assert.match(conferirPedido([entrada(LIMITES.bytesPorPedido), entrada(1)]), /somam mais de 300 MB/);
});

/* ------------------------------------------------------------------ a tela */

test('a tela de compactar: resumo, tabela, arquivo gerado legível, avisos de renomeados e de já comprimidos', async () => {
  const texto = codificador.encode('repete '.repeat(2000));
  const r = await compactarNaTela([
    { nome: 'a.txt', bytes: texto }, { nome: 'A.TXT', bytes: texto }, { nome: 'vazio.txt', bytes: new Uint8Array(0) },
  ], { nomeDoZip: 'Meus Arquivos.zip' });
  assert.equal(r.valor, 'ZIP com 3 arquivos');
  assert.equal(r.zipGerado.nome, 'meus-arquivos.zip');
  assert.match(r.resumo, /menor/);
  assert.deepEqual(r.tabela.linhas.map((l) => l[0]), ['a.txt', 'A (2).TXT', 'vazio.txt']);
  assert.ok(r.observações.some((o) => /1 arquivo foi renomeado/.test(o)));
  assert.ok(r.observações.some((o) => /não tem senha/.test(o)));
  const { entradas } = lerZip(r.zipGerado.bytes);
  assert.equal(entradas.length, 3);
  assert.equal(r.arquivos[0].rótulo, 'Baixar o ZIP');

  const aleatório = new Uint8Array(randomBytes(3000));
  const jáComprimido = await compactarNaTela([{ nome: 'foto.jpg', bytes: aleatório }]);
  assert.equal(jáComprimido.zipGerado.nome, 'foto.zip');
  assert.ok(jáComprimido.observações.some((o) => /já eram comprimidos/.test(o)));
});

test('a tela de compactar: erro de limite chega como erro do campo', async () => {
  const erro = await recusaDe(compactarNaTela([{ nome: 'a', bytes: new Uint8Array(1) }], { cancelado: () => true }));
  assert.ok(erro instanceof ErroDeEntrada);
  assert.equal(erro.campo, 'arquivo');
});

test('a tela de abrir: lista, conta, recusas explicadas, executáveis e nada extraído', () => {
  const ok = codificador.encode('ok');
  const zip = montarZipManual([
    { nome: 'docs/leia-me.txt', dados: ok }, { nome: 'docs/', dados: new Uint8Array(0) }, { nome: '../fora.txt', dados: ok }, { nome: 'instalar.exe', dados: ok },
  ]);
  const r = listarNaTela(zip);
  assert.equal(r.valor, '3 arquivos no ZIP');
  assert.ok(r.linhas.some(([k, v]) => k === 'Entradas recusadas' && v === '1'));
  assert.ok(r.linhas.some(([k, v]) => k === 'Pastas' && v === '1'));
  assert.ok(r.observações.some((o) => /1 entrada foi recusada.*caminho suspeito/.test(o)));
  assert.ok(r.observações.some((o) => /1 arquivo é executável/.test(o)));
  assert.ok(r.observações.some((o) => /Nada foi extraído ainda/.test(o)));
  assert.deepEqual(r.tabela.linhas.map((l) => l[2]), ['pode baixar', 'pasta', 'recusado: caminho suspeito: sobe de pasta (..), tentativa de escrever fora do destino', 'atenção: executável']);

  const erro = recusaSíncrona(() => listarNaTela(new Uint8Array(100).fill(1)));
  assert.ok(erro instanceof ErroDeEntrada);
  assert.equal(erro.campo, 'arquivo');
});

test('baixar os marcados: entrega cada arquivo com o nome limpo, na ordem, e recusa pedido fora do limite', async () => {
  const a = codificador.encode('conteúdo A');
  const b = codificador.encode('conteúdo B');
  const zip = montarZipManual([{ nome: 'pasta/sub/a.txt', dados: a }, { nome: 'b.txt', dados: b }, { nome: '../x.txt', dados: b }]);
  const { entradas } = lerZip(zip);
  const entregues = [];
  await extrairMarcados(zip, [entradas[0], entradas[1]], { entregar: (bytes, nome) => entregues.push([nome, textoDe(bytes)]) });
  assert.deepEqual(entregues, [['a.txt', 'conteúdo A'], ['b.txt', 'conteúdo B']]);
  // Entrada recusada nunca é extraída, mesmo se vier no pedido.
  const erro = await recusaDe(extrairMarcados(zip, [entradas[2]], { entregar: () => assert.fail('não pode entregar') }));
  assert.match(erro.message, /não pode ser extraído/);
  assert.match((await recusaDe(extrairMarcados(zip, [], { entregar: () => {} }))).message, /Marque pelo menos um/);
});
