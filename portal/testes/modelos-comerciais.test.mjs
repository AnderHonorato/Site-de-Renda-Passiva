import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from '../recursos/pdf-lib.esm.min.js';
import { gerarPdfOrcamento, gerarPdfRecibo } from '../scripts/comum/documentos/modelos-comerciais.js';

function decodificarLiteralPdf(literal) {
  const bytes = [];
  for (let i = 0; i < literal.length; i++) {
    const código = literal.charCodeAt(i);
    if (código !== 0x5c) { bytes.push(código & 0xff); continue; }
    const próximo = literal[++i];
    if (próximo >= '0' && próximo <= '7') {
      let octal = próximo;
      for (let n = 0; n < 2 && literal[i + 1] >= '0' && literal[i + 1] <= '7'; n++) octal += literal[++i];
      bytes.push(parseInt(octal, 8));
    } else {
      const escapes = { n: 10, r: 13, t: 9, b: 8, f: 12 };
      bytes.push(escapes[próximo] ?? (próximo?.charCodeAt(0) ?? 0));
    }
  }
  return new TextDecoder('windows-1252').decode(Uint8Array.from(bytes));
}

function textosPdf(bytes) {
  const fonte = new TextDecoder('latin1').decode(bytes);
  return [...fonte.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .flatMap(([, conteúdo]) => [...conteúdo.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(([, texto]) => decodificarLiteralPdf(texto)))
    .join('\n');
}

function textosColunaPdf(bytes, xAlvo) {
  const fonte = new TextDecoder('latin1').decode(bytes);
  const coordenada = `(${Number(xAlvo).toFixed(2)} ± 0.04)`;
  const [, x, tolerância] = /\(([-\d.]+) ± ([-\d.]+)\)/.exec(coordenada);
  return [...fonte.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .flatMap(([, conteúdo]) => [...conteúdo.matchAll(/([-\d.]+)\s+([-\d.]+)\s+Td\s+\(((?:\\.|[^\\)])*)\)\s*Tj\s*ET/g)]
      .filter(([, posição]) => Math.abs(Number(posição) - Number(x)) <= Number(tolerância))
      .map(([, , , literal]) => decodificarLiteralPdf(literal)))
    .join(' ');
}

const normalizar = texto => texto.replace(/\s+/g, ' ').trim();

test('recibo mantém identificação, centavos, partes e duas vias completas na mesma folha', async () => {
  const referência = ('Etapa de manutenção preventiva, troca de componentes e conferência integral do equipamento; ').repeat(10).slice(0, 600);
  const bytes = gerarPdfRecibo({
    identificação: 'REC-2026-0042', recebedor: 'João da Silva', documentoRecebedor: '123.456.789-00',
    pagador: 'Maria Souza', documentoPagador: '12.345.678/0001-90', valorCentavos: 125099,
    valorExtenso: 'mil duzentos e cinquenta reais e noventa e nove centavos', referência,
    cidade: 'São Paulo', data: '12/05/2026', duasVias: true,
    marca: 'Oficina Aurora', corMarca: '#a8472a',
  });
  const pdf = await PDFDocument.load(bytes);
  const texto = normalizar(textosPdf(bytes));
  assert.equal(pdf.getPageCount(), 1, 'as duas vias cabem sem corte na mesma folha');
  assert.ok(texto.includes('Recibo de pagamento'));
  assert.ok(texto.includes('REC-2026-0042'));
  assert.equal((texto.match(/1ª via/g) ?? []).length, 1);
  assert.equal((texto.match(/2ª via/g) ?? []).length, 1);
  assert.equal((texto.match(/Recebedor: João da Silva/g) ?? []).length, 2);
  assert.equal((texto.match(/Pagador: Maria Souza/g) ?? []).length, 2);
  assert.equal((texto.match(/123\.456\.789-00/g) ?? []).length, 2);
  assert.equal((texto.match(/12\.345\.678\/0001-90/g) ?? []).length, 2);
  assert.equal((texto.match(/R\$ 1\.250,99/g) ?? []).length, 2);
  assert.equal((texto.match(/mil duzentos e cinquenta reais e noventa e nove centavos/g) ?? []).length, 2);
  assert.ok(texto.includes(normalizar(referência)), 'a descrição completa está nas duas vias');
  assert.equal((texto.match(/João da Silva/g) ?? []).length >= 4, true, 'o nome identifica o recebedor e as duas assinaturas');

  const viaÚnica = gerarPdfRecibo({
    identificação: 'REC-2026-0042', recebedor: 'João da Silva', documentoRecebedor: '123.456.789-00',
    pagador: 'Maria Souza', documentoPagador: '12.345.678/0001-90', valorCentavos: 125099,
    valorExtenso: 'mil duzentos e cinquenta reais e noventa e nove centavos', referência,
    cidade: 'São Paulo', data: '12/05/2026', marca: 'Oficina Aurora', corMarca: '#a8472a',
  });
  const textoViaÚnica = normalizar(textosPdf(viaÚnica));
  assert.equal((await PDFDocument.load(viaÚnica)).getPageCount(), 1, 'a via única mantém todos os campos na folha');
  assert.ok(textoViaÚnica.includes('Quem recebeu'));
  assert.ok(textoViaÚnica.includes('Quem pagou'));
  assert.ok(textoViaÚnica.includes('Descrição do pagamento'));
  assert.ok(textoViaÚnica.includes(normalizar(referência)));
  assert.ok(textoViaÚnica.includes('A assinatura abaixo confirma o recebimento'));
  assert.ok(new TextDecoder('latin1').decode(viaÚnica).includes('24 Tf'), 'o valor da via única recebe destaque tipográfico grande');
  assert.ok(!textoViaÚnica.includes('2ª via'));
});

test('orçamento imprime os 100 itens, centavos, condições longas e conteúdo sem interpretar HTML', async () => {
  const injeçãoAparente = '</script><script>alert("x")</script> & <strong>conferência</strong>';
  const itens = Array.from({ length: 100 }, (_, i) => ({
    descrição: i === 41 ? injeçãoAparente
      : i === 99 ? 'Detalhamento técnico de fabricação, acabamento, embalagem e transporte para proposta comercial '.repeat(2).slice(0, 120)
        : `Item comercial ${String(i + 1).padStart(3, '0')} — material, acabamento e revisão`,
    quantidade: i % 3 + 1,
    unitárioCentavos: 101 + i,
    totalCentavos: (101 + i) * (i % 3 + 1),
  }));
  const subtotalCentavos = itens.reduce((total, item) => total + item.totalCentavos, 0);
  const descontoPercentual = 7.5;
  const descontoCentavos = Math.round(subtotalCentavos * descontoPercentual / 100);
  const totalCentavos = subtotalCentavos - descontoCentavos;
  const condições = 'Pagamento em duas etapas: entrada na aprovação da proposta e saldo após a conferência final. Entrega em até 12 dias úteis, com aviso prévio e confirmação do endereço.';
  const bytes = gerarPdfOrcamento({
    número: 2026, emissão: '13/05/2026', validade: '20/05/2026', emissor: 'Ateliê Aurora',
    contato: 'ana@example.com · (11) 90000-0000', cliente: 'Maria Souza', itens,
    subtotalCentavos, descontoPercentual, descontoCentavos, totalCentavos, condições,
    marca: 'Ateliê Aurora', corMarca: '#a8472a',
  });
  const pdf = await PDFDocument.load(bytes);
  const texto = normalizar(textosPdf(bytes));
  assert.ok(pdf.getPageCount() > 1, 'a tabela longa continua em páginas adicionais');
  assert.ok(texto.includes('Orçamento nº 2026'));
  assert.ok(texto.includes('Cliente Maria Souza'));
  assert.ok(texto.includes('Subtotal'));
  assert.ok(texto.includes('Desconto (7.5%)'));
  assert.ok(texto.includes('Desconto (7.5%) - R$'), 'desconto usa hífen ASCII seguro para a fonte do PDF');
  assert.ok(texto.includes('Total da proposta'));
  assert.ok(texto.includes(normalizar((totalCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))));
  assert.ok(texto.includes('R$ 1,01'), 'preço unitário conserva os centavos inteiros');
  assert.ok(texto.includes('R$ 2,04'), 'total de uma linha conserva multiplicação e centavos inteiros');
  assert.ok(texto.includes(normalizar(condições)));
  const colunaDescrições = textosColunaPdf(bytes, 56.69);
  for (const item of itens) assert.ok(colunaDescrições.includes(normalizar(item.descrição)), `descrição sem perda: ${item.descrição}`);
  assert.ok(colunaDescrições.includes(normalizar(injeçãoAparente)), 'texto com aparência de HTML é conteúdo literal do PDF');
  assert.ok(bytesTextos(bytes).length >= pdf.getPageCount(), 'cada página PDF tem ao menos um fluxo de texto');
});

test('modelo comercial recusa valores que não conservam centavos inteiros seguros', () => {
  assert.throws(() => gerarPdfRecibo({ valorCentavos: Number.MAX_SAFE_INTEGER + 1 }), /centavos inteiros/);
  assert.throws(() => gerarPdfOrcamento({
    itens: [{ descrição: 'Serviço', quantidade: 1, unitárioCentavos: 100.5, totalCentavos: 100 }],
    subtotalCentavos: 100, descontoCentavos: 0, totalCentavos: 100,
  }), /centavos inteiros/);
});

function bytesTextos(bytes) {
  const fonte = new TextDecoder('latin1').decode(bytes);
  return [...fonte.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
}
