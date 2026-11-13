/**
 * Ler QR Code (F186).
 *
 * A leitura de verdade é conferida com a jsQR (a mesma biblioteca que a página usa quando o navegador não
 * tem leitor nativo), sobre QR Codes desenhados aqui com o gerador do portal (qrcode-generator): um gera,
 * o outro lê, e as duas bibliotecas são independentes.
 *
 * Valores de referência conferidos fora do código:
 * - CRC-16/CCITT-FALSE de "123456789" = 29B1 (valor de verificação do catálogo CRC de Greg Cook).
 * - punycode: a decodificação é comparada com `domainToUnicode` do próprio Node, que usa outra implementação.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { domainToUnicode } from 'node:url';
import vm from 'node:vm';

import { desenharQr } from './auxiliares/qr-de-teste.mjs';
import {
  analisarConteúdo, avaliarEndereço, lerWifi, lerPix, crc16, punycodeParaUnicode, domínioRegistrável,
  tornarVisíveis, LIMITE_DO_CONTEÚDO,
} from '../scripts/cálculos/conteúdo-de-qr-code.js';
import {
  reconhecerArquivo, dimensõesDaImagem, conferirImagem, escalasParaTentar, procurarCódigos, textoDoAchado,
  TAMANHO_MÁXIMO_DA_IMAGEM, MÁXIMO_DE_CÓDIGOS,
} from '../scripts/cálculos/scanner-de-qr-code.js';
import { descreverCódigos } from '../scripts/ferramentas/scanner-de-qr-code.js';

/* ------------------------------------------------------------------ ferramentas de teste */

const contexto = vm.createContext({ self: {} });
vm.runInContext(readFileSync(new URL('../recursos/jsQR.js', import.meta.url), 'utf8'), contexto);
const jsQR = contexto.self.jsQR;
const decodificarUm = (dados, l, a) => {
  const achado = jsQR(dados, l, a, { inversionAttempts: 'attemptBoth' });
  return achado ? { data: textoDoAchado(achado), location: achado.location } : null;
};

const desenhar = desenharQr;

const bytesDe = (...partes) => new Uint8Array(partes.flat());
const texto = (t) => [...t].map((c) => c.charCodeAt(0));
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n) => [n & 255, (n >>> 8) & 255];
const le32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

const cabeçalhoPng = (l, a) => bytesDe([0x89], texto('PNG\r\n'), [0x1A, 0x0A], be32(13), texto('IHDR'), be32(l), be32(a), [8, 6, 0, 0, 0], be32(0));
const cabeçalhoGif = (l, a) => bytesDe(texto('GIF89a'), le16(l), le16(a), [0, 0, 0]);
const cabeçalhoBmp = (l, a) => bytesDe(texto('BM'), le32(0), le32(0), le32(54), le32(40), le32(l), le32(a), le16(1), le16(24));
const cabeçalhoJpeg = (l, a) => bytesDe([0xFF, 0xD8, 0xFF, 0xE0, 0, 16], texto('JFIF\0'), [1, 1, 0, 0, 1, 0, 1, 0, 0], [0xFF, 0xC0, 0, 17, 8, a >> 8, a & 255, l >> 8, l & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
const cabeçalhoWebpX = (l, a) => bytesDe(texto('RIFF'), le32(30), texto('WEBPVP8X'), le32(10), [0, 0, 0, 0], [(l - 1) & 255, ((l - 1) >> 8) & 255, ((l - 1) >> 16) & 255], [(a - 1) & 255, ((a - 1) >> 8) & 255, ((a - 1) >> 16) & 255]);
const cabeçalhoWebpL = (l, a) => {
  const bits = ((a - 1) << 14 | (l - 1)) >>> 0;
  return bytesDe(texto('RIFF'), le32(30), texto('WEBPVP8L'), le32(10), [0x2F], le32(bits), [0, 0, 0, 0, 0, 0, 0, 0]);
};
const cabeçalhoWebpLossy = (l, a) => bytesDe(texto('RIFF'), le32(30), texto('WEBPVP8 '), le32(10), [0, 0, 0], [0x9D, 0x01, 0x2A], le16(l), le16(a), [0, 0]);
const cabeçalhoAvif = (l, a) => bytesDe(be32(24), texto('ftypavif'), be32(0), texto('avifmif1'), be32(20), texto('ispe'), be32(0), be32(l), be32(a));

/* ------------------------------------------------------------------ CRC e punycode */

test('CRC-16/CCITT-FALSE de "123456789" é 29B1', () => {
  assert.equal(crc16('123456789'), '29B1');
  assert.equal(crc16(''), 'FFFF');
});

test('punycode decodifica como o Node: acentos, cirílico, japonês e o caso do "paypal" com a cirílico', () => {
  for (const rótulo of ['xn--pypal-4ve', 'xn--bcher-kva', 'xn--r8jz45g', 'xn--e1afmkfd', 'xn--80ak6aa92e', 'xn--caf-dma', 'xn--mnchen-3ya']) {
    assert.equal(punycodeParaUnicode(rótulo), domainToUnicode(rótulo), rótulo);
  }
  assert.equal(punycodeParaUnicode('xn--pypal-4ve'), 'pаypal'); // o "а" é U+0430
  assert.equal(punycodeParaUnicode('exemplo'), null);
  assert.equal(punycodeParaUnicode('xn--!!!'), null);
  assert.equal(punycodeParaUnicode('xn--'), '');
});

test('domínio registrável: com.br leva três partes', () => {
  assert.equal(domínioRegistrável('www.itau.com.br'), 'itau.com.br');
  assert.equal(domínioRegistrável('a.b.exemplo.com'), 'exemplo.com');
  assert.equal(domínioRegistrável('bit.ly'), 'bit.ly');
  assert.equal(domínioRegistrável('localhost'), 'localhost');
});

/* ------------------------------------------------------------------ links */

test('link https comum: tipo Link, sem sinais, endereço pronto para o botão', () => {
  const r = analisarConteúdo('https://exemplo.com.br/cardapio');
  assert.equal(r.tipo, 'link');
  assert.equal(r.nível, 'sem-sinais');
  assert.equal(r.endereço, 'https://exemplo.com.br/cardapio');
  assert.deepEqual(r.avisos, []);
});

test('sinais de alerta: http, encurtador, IP, porta, usuário antes do @, terminação .zip, subdomínios demais', () => {
  const casos = [
    ['http://exemplo.com.br', 'atenção', /sem criptografia/],
    ['https://bit.ly/abc123', 'atenção', /encurtador/],
    ['https://192.168.0.10/login', 'atenção', /rede local/],
    ['http://2130706433/', 'atenção', /numérico/], // 2130706433 é 127.0.0.1 escrito como número
    ['https://exemplo.com:8443/x', 'atenção', /porta 8443/],
    ['https://banco.com.br@malicioso.top/entrar', 'perigo', /usuário ou senha/],
    ['https://arquivos.zip/', 'atenção', /terminação/],
    ['https://a.b.c.d.exemplo.com/', 'atenção', /muitos níveis/],
    ['https://loja.com/instalar/app.apk', 'atenção', /executável \(\.apk\)/],
  ];
  for (const [entrada, nível, padrão] of casos) {
    const r = analisarConteúdo(entrada);
    assert.equal(r.tipo, 'link', entrada);
    assert.equal(r.nível, nível, entrada);
    assert.ok(r.avisos.some((a) => padrão.test(a.texto)), `${entrada}: ${JSON.stringify(r.avisos)}`);
  }
});

test('o host real é o que vem depois do @, e o aviso diz isso', () => {
  const análise = avaliarEndereço('https://www.banco.com.br@malicioso.top/entrar');
  assert.equal(análise.host, 'malicioso.top');
  assert.match(análise.avisos[0].texto, /malicioso\.top/);
});

test('letras que imitam outras (punycode) são mostradas por extenso', () => {
  const r = analisarConteúdo('https://xn--pypal-4ve.com/entrar');
  assert.equal(r.nível, 'atenção');
  assert.ok(r.avisos.some((a) => /pаypal\.com/.test(a.texto)));
  assert.ok(r.detalhes.some(([k, v]) => k === 'Como o navegador vê' && v === 'xn--pypal-4ve.com'));
});

test('nome de banco em domínio de outro dono é apontado; o domínio verdadeiro não', () => {
  for (const falso of ['https://itau.com.evil.top/login', 'https://login-nubank.xyz/', 'https://gov.br.consulta-cpf.com/']) {
    assert.ok(analisarConteúdo(falso).avisos.some((a) => /cita "/.test(a.texto)), falso);
  }
  for (const verdadeiro of ['https://www.itau.com.br/', 'https://app.nubank.com.br/x', 'https://www.gov.br/receitafederal', 'https://pay.google.com/']) {
    assert.equal(analisarConteúdo(verdadeiro).nível, 'sem-sinais', verdadeiro);
  }
});

test('caracteres invisíveis ou de inversão de direção no endereço são perigo e ficam visíveis', () => {
  const r = analisarConteúdo('https://exemplo.com/\u202Efdp.exe');
  assert.equal(r.nível, 'perigo');
  assert.ok(r.avisos.some((a) => /invisíveis/.test(a.texto)));
  assert.equal(tornarVisíveis('a\u202Eb\u200Bc\nd\te'), 'a‹U+202E›b‹U+200B›c\nd\te');
});

test('esquemas que executam ações são perigo e não oferecem endereço para abrir', () => {
  for (const entrada of ['javascript:alert(1)', 'JavaScript:fetch("//x")', 'data:text/html,<script>1</script>', 'file:///C:/Windows', 'vbscript:msgbox(1)']) {
    const r = analisarConteúdo(entrada);
    assert.equal(r.tipo, 'esquema-perigoso', entrada);
    assert.equal(r.nível, 'perigo', entrada);
    assert.equal(r.endereço, null, entrada);
  }
});

test('texto que parece endereço, sem http: avisa e não oferece abrir', () => {
  const r = analisarConteúdo('www.exemplo.com.br/oferta');
  assert.equal(r.tipo, 'link-sem-esquema');
  assert.equal(r.endereço, null);
  assert.ok(r.avisos.some((a) => /não diz se é http ou https/.test(a.texto)));
});

test('link inválido não quebra: vira aviso', () => {
  const r = analisarConteúdo('https://');
  assert.equal(r.endereço, null);
  assert.equal(r.nível, 'atenção');
});

/* ------------------------------------------------------------------ Wi-Fi, Pix, contato e demais */

test('Wi-Fi com caracteres escapados', () => {
  const w = lerWifi('WIFI:T:WPA;S:Minha\\;Rede;P:senha\\\\forte\\:1;H:true;;');
  assert.equal(w.rede, 'Minha;Rede');
  assert.equal(w.senha, 'senha\\forte:1');
  assert.equal(w.oculta, true);
  assert.equal(w.aberta, false);
  assert.equal(lerWifi('WIFI:T:nopass;S:Cafe;;').aberta, true);
  assert.equal(lerWifi('WIFI:S:Cafe;;').aberta, true);
  assert.equal(lerWifi('WIFI:T:WEP;S:Velha;P:12345;;').fraca, true);
});

test('Wi-Fi na tela: mostra rede e segurança, avisa de rede aberta e não vaza a senha nas linhas', () => {
  const r = analisarConteúdo('WIFI:T:WPA;S:Casa;P:segredo123;;');
  assert.equal(r.tipo, 'wifi');
  assert.ok(r.detalhes.some(([k, v]) => k === 'Rede' && v === 'Casa'));
  assert.ok(!JSON.stringify(r.detalhes).includes('segredo123'));
  assert.equal(r.nível, 'sem-sinais');
  assert.equal(analisarConteúdo('WIFI:T:nopass;S:Cafe;;').nível, 'atenção');
});

/** Monta um BR Code do Pix com o CRC certo. */
const tlv = (tag, valor) => `${tag}${String(valor.length).padStart(2, '0')}${valor}`;
function montarPix({ chave = 'fulano@exemplo.com', valor = '12.50', nome = 'FULANO DE TAL', cidade = 'SAO PAULO', url = '' } = {}) {
  const conta = tlv('00', 'br.gov.bcb.pix') + (url ? tlv('25', url) : tlv('01', chave));
  const corpo = tlv('00', '01') + tlv('01', '12') + tlv('26', conta) + tlv('52', '0000') + tlv('53', '986')
    + (valor ? tlv('54', valor) : '') + tlv('58', 'BR') + tlv('59', nome) + tlv('60', cidade) + tlv('62', tlv('05', '***')) + '6304';
  return corpo + crc16(corpo);
}

test('Pix: lê recebedor, cidade, chave e valor, e confere o CRC', () => {
  const código = montarPix();
  const p = lerPix(código);
  assert.equal(p.recebedor, 'FULANO DE TAL');
  assert.equal(p.cidade, 'SAO PAULO');
  assert.equal(p.chave, 'fulano@exemplo.com');
  assert.equal(p.valor, 12.5);
  assert.equal(p.crcConfere, true);
  const r = analisarConteúdo(código);
  assert.equal(r.tipo, 'pix');
  assert.ok(r.detalhes.some(([k, v]) => k === 'Valor' && /12,50/.test(v)));
  assert.equal(r.nível, 'sem-sinais'); // só a dica de conferir
  assert.ok(r.avisos.every((a) => a.nível === 'dica'));
});

test('Pix com um caractere alterado: CRC não confere e vira perigo', () => {
  const adulterado = montarPix().replace('FULANO DE TAL', 'FULANO DE TAM');
  assert.equal(lerPix(adulterado).crcConfere, false);
  const r = analisarConteúdo(adulterado);
  assert.equal(r.tipo, 'pix');
  assert.equal(r.nível, 'perigo');
  assert.ok(r.avisos.some((a) => /CRC/.test(a.texto)));
});

test('Pix cortado ou com o tamanho de um campo trocado não é lido como texto qualquer: vira perigo', () => {
  for (const defeituoso of [montarPix().replace('FULANO DE TAL', 'BELTRANO DE TAL'), montarPix().slice(0, 60)]) {
    const r = analisarConteúdo(defeituoso);
    assert.equal(r.tipo, 'pix-defeituoso');
    assert.equal(r.nível, 'perigo');
    assert.match(r.avisos[0].texto, /incompleto ou alterado/);
  }
});

test('Pix sem valor fica "em aberto", com endereço de cobrança é outro rótulo e lixo não vira Pix', () => {
  assert.match(analisarConteúdo(montarPix({ valor: '' })).detalhes.find(([k]) => k === 'Valor')[1], /em aberto/);
  assert.equal(analisarConteúdo(montarPix({ url: 'pix.psp.com.br/qr/v2/abc' })).rótulo, 'Pix (cobrança por link)');
  assert.equal(lerPix('000201zzzz'), null);
  assert.equal(lerPix('0002010102'), null);
  assert.equal(analisarConteúdo('000201 olá').tipo, 'texto'); // sem "br.gov.bcb.pix", não finge ser Pix
});

test('contato em vCard e em MECARD', () => {
  const v = analisarConteúdo('BEGIN:VCARD\nVERSION:3.0\nFN:Ana Souza\nTEL;TYPE=CELL:+55 11 91234-5678\nEMAIL:ana@exemplo.com\nORG:Padaria\nEND:VCARD');
  assert.equal(v.tipo, 'contato');
  assert.ok(v.detalhes.some(([k, val]) => k === 'Nome' && val === 'Ana Souza'));
  assert.ok(v.detalhes.some(([k, val]) => k === 'Telefone' && val.includes('91234-5678')));
  const m = analisarConteúdo('MECARD:N:Souza,Ana;TEL:11912345678;EMAIL:ana@exemplo.com;;');
  assert.equal(m.tipo, 'contato');
  assert.ok(m.detalhes.some(([k, val]) => k === 'Nome' && val === 'Ana Souza'));
});

test('e-mail, telefone, SMS, localização, evento, aplicativo e autenticador', () => {
  assert.equal(analisarConteúdo('mailto:ana@exemplo.com?subject=Ol%C3%A1').tipo, 'email');
  assert.ok(analisarConteúdo('mailto:ana@exemplo.com?subject=Ol%C3%A1').detalhes.some(([, v]) => v === 'Olá'));
  assert.equal(analisarConteúdo('tel:+5511912345678').tipo, 'telefone');
  assert.equal(analisarConteúdo('SMSTO:11999999999:Oi').tipo, 'sms');
  assert.equal(analisarConteúdo('geo:-23.55,-46.63').tipo, 'localização');
  assert.equal(analisarConteúdo('BEGIN:VEVENT\nSUMMARY:Reunião\nDTSTART:20261010T100000\nEND:VEVENT').tipo, 'evento');
  assert.equal(analisarConteúdo('intent://scan/#Intent;scheme=zxing;end').nível, 'atenção');
  assert.equal(analisarConteúdo('otpauth://totp/Conta?secret=ABC').tipo, 'autenticador');
});

test('texto livre, vazio e conteúdo enorme', () => {
  assert.equal(analisarConteúdo('Mesa 12').tipo, 'texto');
  assert.equal(analisarConteúdo('').tipo, 'vazio');
  assert.equal(analisarConteúdo('   ').tipo, 'vazio');
  const enorme = analisarConteúdo(`https://exemplo.com/${'a'.repeat(1_000_000)}`);
  assert.equal(enorme.truncado, true);
  assert.ok(enorme.avisos.some((a) => /foi cortado/.test(a.texto)));
  const t0 = performance.now();
  analisarConteúdo('a.'.repeat(LIMITE_DO_CONTEÚDO * 4) + '!');
  analisarConteúdo('x'.repeat(2_000_000));
  assert.ok(performance.now() - t0 < 2000, 'entrada hostil não pode travar a análise');
});

/* ------------------------------------------------------------------ arquivo e dimensões */

test('reconhece imagens pelos bytes, e os que não são imagem pelo que são', () => {
  assert.deepEqual(reconhecerArquivo(cabeçalhoPng(100, 100)), { imagem: 'png' });
  assert.deepEqual(reconhecerArquivo(cabeçalhoJpeg(100, 100)), { imagem: 'jpeg' });
  assert.deepEqual(reconhecerArquivo(cabeçalhoGif(100, 100)), { imagem: 'gif' });
  assert.deepEqual(reconhecerArquivo(cabeçalhoBmp(100, 100)), { imagem: 'bmp' });
  assert.deepEqual(reconhecerArquivo(cabeçalhoWebpX(100, 100)), { imagem: 'webp' });
  assert.deepEqual(reconhecerArquivo(cabeçalhoAvif(100, 100)), { imagem: 'avif' });
  assert.deepEqual(reconhecerArquivo(bytesDe(texto('%PDF-1.7\n'))), { outro: 'pdf' });
  assert.deepEqual(reconhecerArquivo(bytesDe([0x50, 0x4B, 3, 4, 0, 0])), { outro: 'zip' });
  assert.deepEqual(reconhecerArquivo(bytesDe(texto('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))), { outro: 'svg' });
  assert.deepEqual(reconhecerArquivo(bytesDe(be32(24), texto('ftypheic'), be32(0), texto('heicmif1'))), { outro: 'heic' });
  assert.deepEqual(reconhecerArquivo(bytesDe(texto('BMW é um carro muito bonito, não é?'))), { outro: 'texto' });
  assert.deepEqual(reconhecerArquivo(bytesDe(texto('só texto'))), { outro: 'texto' });
  assert.deepEqual(reconhecerArquivo(bytesDe([0, 1, 2, 3, 0, 0, 0, 0])), { outro: 'desconhecido' });
});

test('dimensões lidas do cabeçalho em cada formato', () => {
  assert.deepEqual(dimensõesDaImagem(cabeçalhoPng(640, 480), 'png'), { largura: 640, altura: 480 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoGif(320, 200), 'gif'), { largura: 320, altura: 200 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoBmp(300, 150), 'bmp'), { largura: 300, altura: 150 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoJpeg(1920, 1080), 'jpeg'), { largura: 1920, altura: 1080 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoWebpX(4000, 3000), 'webp'), { largura: 4000, altura: 3000 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoWebpL(500, 400), 'webp'), { largura: 500, altura: 400 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoWebpLossy(256, 128), 'webp'), { largura: 256, altura: 128 });
  assert.deepEqual(dimensõesDaImagem(cabeçalhoAvif(800, 600), 'avif'), { largura: 800, altura: 600 });
});

test('cabeçalho truncado ou zerado não passa', () => {
  for (const [bytes, tipo] of [[cabeçalhoPng(10, 10).slice(0, 20), 'png'], [cabeçalhoGif(10, 10).slice(0, 8), 'gif'], [cabeçalhoJpeg(10, 10).slice(0, 12), 'jpeg'],
    [cabeçalhoPng(0, 50), 'png'], [bytesDe([0xFF, 0xD8, 0xFF, 0xDA, 0, 2]), 'jpeg']]) {
    assert.equal(dimensõesDaImagem(bytes, tipo), null);
  }
});

test('conferirImagem: aceita imagem normal e recusa vazio, grande, tipo errado, bomba de pixels e minúscula', () => {
  const ok = conferirImagem(cabeçalhoPng(800, 600));
  assert.equal(ok.ok, true);
  assert.equal(ok.tipo, 'png');
  assert.equal(conferirImagem(new Uint8Array(0)).motivo, 'vazio');

  const grande = new Uint8Array(TAMANHO_MÁXIMO_DA_IMAGEM + 1);
  grande.set(cabeçalhoPng(800, 600));
  assert.equal(conferirImagem(grande).motivo, 'grande');
  const nolimite = new Uint8Array(TAMANHO_MÁXIMO_DA_IMAGEM);
  nolimite.set(cabeçalhoPng(800, 600));
  assert.equal(conferirImagem(nolimite).ok, true);

  // Um PDF renomeado para .png é reconhecido como PDF.
  const pdf = conferirImagem(bytesDe(texto('%PDF-1.4\n%âãÏÓ\n')));
  assert.equal(pdf.motivo, 'tipo');
  assert.match(pdf.mensagem, /PDF/);
  assert.match(conferirImagem(bytesDe(texto('<svg></svg>'))).mensagem, /SVG/);
  assert.match(conferirImagem(bytesDe(be32(24), texto('ftypheic'), be32(0), texto('heicmif1'))).mensagem, /HEIC/);

  // 60000 × 60000 cabe num PNG de poucos bytes, mas jamais deve ser decodificada.
  const bomba = conferirImagem(cabeçalhoPng(60000, 60000));
  assert.equal(bomba.motivo, 'megapixels');
  assert.match(bomba.mensagem, /60000 × 60000/);
  assert.equal(conferirImagem(cabeçalhoPng(10000, 10000)).ok, true); // 100 MP exatos
  assert.equal(conferirImagem(cabeçalhoPng(10001, 10000)).motivo, 'megapixels');

  assert.equal(conferirImagem(cabeçalhoPng(10, 10)).motivo, 'pequena');
  assert.equal(conferirImagem(cabeçalhoPng(2000, 0)).motivo, 'corrompido');
  assert.equal(conferirImagem(cabeçalhoPng(50, 50).slice(0, 18)).motivo, 'corrompido');
});

test('escalas: primeiro até 1000 px, depois o tamanho cheio (até 2000) e a metade; imagem pequena ganha o dobro', () => {
  assert.deepEqual(escalasParaTentar(4000, 3000), [
    { largura: 1000, altura: 750 }, { largura: 2000, altura: 1500 }, { largura: 500, altura: 375 },
  ]);
  assert.deepEqual(escalasParaTentar(1500, 1000), [
    { largura: 1000, altura: 667 }, { largura: 1500, altura: 1000 }, { largura: 500, altura: 333 },
  ]);
  assert.deepEqual(escalasParaTentar(1100, 800), [{ largura: 1000, altura: 727 }, { largura: 500, altura: 364 }]);
  assert.deepEqual(escalasParaTentar(800, 600), [{ largura: 800, altura: 600 }, { largura: 400, altura: 300 }]);
  assert.deepEqual(escalasParaTentar(300, 200), [{ largura: 300, altura: 200 }, { largura: 600, altura: 400 }]);
  assert.ok(escalasParaTentar(30, 30).every((e) => e.largura >= 21));
  // Nenhuma escala passa do limite nem fica sem tamanho, mesmo em formatos extremos.
  for (const [l, a] of [[100000, 25], [25, 100000], [1, 1], [9000, 9000], [21, 21]]) {
    for (const e of escalasParaTentar(l, a)) assert.ok(e.largura >= 21 && e.altura >= 21 && Math.max(e.largura, e.altura) <= 2000, `${l}x${a}`);
  }
  assert.ok(escalasParaTentar(9000, 9000).length <= 3);
});

/* ------------------------------------------------------------------ leitura de verdade */

test('lê o QR Code de verdade: link, texto com acento, Wi-Fi e Pix', () => {
  for (const conteúdo of ['https://exemplo.com.br/cardapio', 'Olá, mundo! Ação é coração.', 'WIFI:T:WPA;S:Casa;P:segredo;;', montarPix()]) {
    const imagem = desenhar([conteúdo]);
    const achados = procurarCódigos(imagem, decodificarUm);
    assert.equal(achados.length, 1, conteúdo);
    assert.equal(achados[0].texto, conteúdo);
  }
});

test('lê QR Code com cores invertidas', () => {
  const achados = procurarCódigos(desenhar(['https://exemplo.com.br'], { inverter: true }), decodificarUm);
  assert.deepEqual(achados.map((a) => a.texto), ['https://exemplo.com.br']);
});

test('lê vários QR Codes da mesma imagem (por recortes) e não repete o igual', () => {
  const três = ['https://um.exemplo.com', 'https://dois.exemplo.com', 'https://tres.exemplo.com'];
  const achados = procurarCódigos(desenhar(três), decodificarUm);
  assert.deepEqual(achados.map((a) => a.texto).sort(), [...três].sort());

  const iguais = procurarCódigos(desenhar(['https://igual.exemplo.com', 'https://igual.exemplo.com']), decodificarUm);
  assert.equal(iguais.length, 1);
});

test('imagem sem QR Code (branca, preta, ruído) devolve lista vazia e não altera a original', () => {
  const branca = { data: new Uint8ClampedArray(200 * 200 * 4).fill(255), width: 200, height: 200 };
  assert.deepEqual(procurarCódigos(branca, decodificarUm), []);
  const preta = { data: new Uint8ClampedArray(200 * 200 * 4).map((_, i) => (i % 4 === 3 ? 255 : 0)), width: 200, height: 200 };
  assert.deepEqual(procurarCódigos(preta, decodificarUm), []);
  const ruído = new Uint8ClampedArray(200 * 200 * 4);
  let semente = 12345;
  for (let i = 0; i < ruído.length; i += 1) { semente = (semente * 1103515245 + 12345) & 0x7fffffff; ruído[i] = semente >> 16; }
  assert.deepEqual(procurarCódigos({ data: ruído, width: 200, height: 200 }, decodificarUm), []);

  const imagem = desenhar(['https://um.exemplo.com', 'https://dois.exemplo.com']);
  const antes = Uint8ClampedArray.from(imagem.data);
  procurarCódigos(imagem, decodificarUm);
  assert.deepEqual(imagem.data, antes);
});

test('o texto do achado lê como ISO-8859-1 os bytes que a jsQR não consegue ler como UTF-8', () => {
  assert.equal(textoDoAchado({ data: 'x', chunks: [{ type: 'byte', text: '', bytes: [0x4F, 0x6C, 0xE1] }] }), 'Olá');
  assert.equal(textoDoAchado({ data: 'x', chunks: [{ type: 'byte', text: 'ação', bytes: [0x61] }, { type: 'numeric', text: '123' }] }), 'ação123');
  assert.equal(textoDoAchado({ data: 'sem partes' }), 'sem partes');
  // O QR Code que o próprio portal gera grava "á" como um byte só (ISO-8859-1), e a leitura recupera o texto.
  const achados = procurarCódigos(desenhar(['Café com açúcar']), decodificarUm);
  assert.equal(achados[0].texto, 'Café com açúcar');
});

test('decodificador sem posição ou que sempre acha não gera laço infinito', () => {
  const imagem = { data: new Uint8ClampedArray(40 * 40 * 4).fill(255), width: 40, height: 40 };
  assert.equal(procurarCódigos(imagem, () => ({ data: 'x' })).length, 1);
  let chamadas = 0;
  const sempre = () => { chamadas += 1; return { data: `t${chamadas}`, location: { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } } }; };
  assert.equal(procurarCódigos(imagem, sempre, { máximo: 3 }).length, 3);
  assert.ok(chamadas <= 6);
  chamadas = 0;
  assert.equal(procurarCódigos(imagem, sempre).length, MÁXIMO_DE_CÓDIGOS);
  assert.ok(chamadas <= MÁXIMO_DE_CÓDIGOS * 2);
});

/* ------------------------------------------------------------------ a tela */

test('a tela de um link bom: tipo, conteúdo, frase honesta e botão de abrir', () => {
  const abertos = [];
  const saída = descreverCódigos(['https://exemplo.com.br/cardapio'], { abrir: (e, n) => abertos.push([e, n]), leitor: 'biblioteca jsQR' });
  assert.equal(saída.valor, 'Link');
  assert.match(saída.observações.join(' '), /não garante que seja seguro/);
  assert.match(saída.observações.join(' '), /Nada foi aberto/);
  assert.match(saída.observações.join(' '), /não saiu do seu aparelho/);
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].tipo, 'acao', 'abrir um endereço não é exportar um arquivo');
  assert.equal(saída.texto, 'https://exemplo.com.br/cardapio');
  // Descrever o código NUNCA abre nada; só o clique no botão.
  assert.deepEqual(abertos, []);
  saída.arquivos[0].gerar();
  assert.deepEqual(abertos, [['https://exemplo.com.br/cardapio', 'sem-sinais']]);
});

test('a tela de um link suspeito e a de vários códigos', () => {
  const suspeito = descreverCódigos(['https://banco.com.br@malicioso.top/']);
  assert.match(suspeito.observações.join(' '), /Perigo: .*usuário ou senha/);
  assert.match(suspeito.observações.join(' '), /Não abra/);

  const vários = descreverCódigos(['https://a.com', 'Mesa 3', 'WIFI:T:nopass;S:Cafe;;']);
  assert.equal(vários.valor, '3 QR Codes encontrados');
  assert.equal(vários.arquivos.length, 1);
  assert.match(vários.arquivos[0].rótulo, /Abrir o link 1/);
  assert.ok(vários.linhas.some(([k]) => k === 'Código 2'));
});

test('o texto copiado traz o conteúdo com os caracteres escondidos à mostra', () => {
  const saída = descreverCódigos(['https://exemplo.com/\u202Efdp.exe']);
  assert.ok(saída.texto.includes('‹U+202E›'));
  assert.ok(!saída.texto.includes('\u202E'));
});
