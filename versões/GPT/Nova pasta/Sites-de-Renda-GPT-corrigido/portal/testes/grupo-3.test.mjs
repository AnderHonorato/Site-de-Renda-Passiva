import test from 'node:test';
import assert from 'node:assert/strict';
import { ferramentas } from '../scripts/ferramentas/grupo-3/index.js';
import { ratear } from '../scripts/ferramentas/grupo-3/helpers.js';

const obter = id => { const t = ferramentas.find(t => t.id === id); assert.ok(t, id); return t; };
const dados = id => Object.fromEntries(obter(id).campos.map(c => [c.nome, c.valor]));
const executar = (id, overrides = {}) => obter(id).executar({ ...dados(id), ...overrides });
const texto = r => [r.resumo, ...r.linhas].join('\n').replaceAll('\u00a0', ' ');

test('grupo 3: exatamente 50 ferramentas únicas, dez por categoria', () => {
  assert.equal(ferramentas.length, 50);
  assert.equal(new Set(ferramentas.map(t => t.id)).size, 50);
  for (let c = 11; c <= 15; c++) assert.equal(ferramentas.filter(t => t.categoria === c).length, 10);
  for (const t of ferramentas) { assert.ok(t.metodologia.length > 30); assert.ok(t.campos.length); assert.equal(typeof t.executar, 'function'); }
});

const exemplos = [
  ['porcentagem', {}, '30'],
  ['variacao-percentual', {}, '25%'],
  ['regra-de-tres', {}, '20'],
  ['media-ponderada', {}, '7,5'],
  ['conversor-de-unidades', {}, '2.500 m'],
  ['area-de-figuras', {}, '12 m²'],
  ['volume-geometrico', {}, '1.000 cm³\n1 L'],
  ['fracoes-e-simplificacao', {}, '5/6'],
  ['equacao-segundo-grau', {}, 'x₁ = 3; x₂ = 2'],
  ['estatistica-descritiva', {}, 'Média: 5\nMediana: 5'],
  ['preco-com-taxas-de-venda', {}, 'Preço matemático: 85,714286'],
  ['comparador-de-preco-unitario', {}, 'Menor preço: Pacote B'],
  ['descontos-sucessivos', {}, 'R$ 81,00'],
  ['rateio-de-frete', {}, 'Item A: R$ 10,00\nItem B: R$ 20,00'],
  ['meta-de-vendas', {}, '40 vendas'],
  ['ponto-de-equilibrio', {}, '100 unidades'],
  ['orcamento-de-servico', {}, 'R$ 280,00'],
  ['controle-de-caixa-local', {}, 'R$ 120,00'],
  ['margem-e-markup', {}, 'Margem: 40%'],
  ['ponto-de-reposicao', {}, 'Ponto de reposição: 30 un.'],
  ['gerador-de-qr-code', {}, 'QR Code criado localmente'],
  ['link-de-whatsapp', { mensagem: 'Olá' }, 'https://wa.me/5511999999999?text=Ol%C3%A1'],
  ['construtor-de-utm', {}, 'produto=1&utm_source=email'],
  ['formatador-de-json', {}, '{\n  "a": 1\n}'],
  ['codificador-de-url', {}, 'a%C3%A7%C3%A3o%20%C3%BAtil'],
  ['gerador-de-senha', {}, 'Senha gerada localmente com fonte criptográfica segura.'],
  ['verificador-de-contraste', {}, '21:1'],
  ['gerador-de-hash-de-arquivo', { arquivo: new Blob(['abc']) }, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['base64-utf8', {}, 'YcOnw6NvIMO6dGls'],
  ['gerador-de-uuid', {}, '5 UUIDs gerados'],
  ['consumo-de-energia', {}, 'R$ 60,00 estimados\nConsumo: 60 kWh'],
  ['comparador-de-aparelhos', {}, 'Diferença: 4 kWh; R$ 4,00'],
  ['orcamento-domestico', {}, 'Saldo: R$ 600,00'],
  ['divisor-de-contas-da-casa', {}, 'Pessoa A: R$ 200,00\nPessoa B: R$ 400,00'],
  ['custo-por-lavagem', {}, 'R$ 6,00 por ciclo'],
  ['custo-de-receita-domestica', {}, 'R$ 6,00 por porção'],
  ['lista-de-compras-comparativa', {}, 'Diferença: R$ 5,00'],
  ['planejador-de-meta-de-economia', {}, 'R$ 200,00 por mês'],
  ['consumo-de-agua', {}, '3.600 L\nVolume: 3,6 m³\nCusto variável estimado: R$ 18,00'],
  ['autonomia-de-estoque-domestico', {}, '25 dias de duração'],
  ['custo-de-combustivel', {}, 'R$ 150,00\nCombustível: 25 L'],
  ['divisor-de-viagem', {}, 'Pessoa 1: R$ 200,00'],
  ['comparador-de-combustiveis', {}, 'Mesmo custo por km'],
  ['orcamento-de-viagem', {}, 'R$ 600,00'],
  ['lista-de-bagagem', {}, '3 trocas de roupa'],
  ['tempo-de-trajeto-estimado', {}, '3 h 30 min'],
  ['consumo-medio-do-veiculo', {}, '12 km/L'],
  ['comparador-de-deslocamento', {}, 'diferença R$ 26,00'],
  ['conversor-de-moeda-informada', {}, '500 BRL'],
  ['peso-de-bagagem', {}, '3,4 kg no total']
];
for (const [id, entrada, esperado] of exemplos) test(id + ': exemplo independente', async () => {
  const r = await executar(id, entrada); assert.ok(texto(r).includes(esperado), id + ': saída diferente da esperada');
  if (r.arquivo) { assert.ok(r.arquivo.blob instanceof Blob); assert.ok(r.arquivo.blob.size > 0); }
});

for (const ferramenta of ferramentas) {
  for (const campo of ferramenta.campos.filter(c => c.tipo === 'number')) {
    test(ferramenta.id + ': valida campo ' + campo.nome, async () => {
      for (const v of ['', 'NaN', 'Infinity', '1.000,00', '--1', '1abc']) await assert.rejects(executar(ferramenta.id, { [campo.nome]: v }), Error);
      if (campo.min >= 0) await assert.rejects(executar(ferramenta.id, { [campo.nome]: '-1' }), Error);
      await assert.rejects(executar(ferramenta.id, { [campo.nome]: String(campo.max + 1) }), Error);
    });
  }
}

const invalidos = [
  ['variacao-percentual', { inicial: 0 }], ['regra-de-tres', { a: 0 }], ['regra-de-tres', { c: 0 }],
  ['media-ponderada', { itens: '6;0\n8;0' }], ['media-ponderada', { itens: '6;-1' }],
  ['conversor-de-unidades', { origem: 'kg', destino: 'L' }], ['conversor-de-unidades', { origem: 'C', destino: 'K', valor: -274 }],
  ['area-de-figuras', { altura: 0 }], ['volume-geometrico', { b: 0 }],
  ['fracoes-e-simplificacao', { a: '1/0' }], ['fracoes-e-simplificacao', { operacao: 'dividir', b: '0/3' }],
  ['equacao-segundo-grau', { a: 0 }], ['estatistica-descritiva', { valores: '2', tipo: 'amostra' }],
  ['preco-com-taxas-de-venda', { taxa: 80, margem: 20 }], ['comparador-de-preco-unitario', { itens: 'A;12;0;kg' }],
  ['comparador-de-preco-unitario', { itens: 'A;12;1;kg\nB;10;1;L' }], ['descontos-sucessivos', { descontos: '101' }],
  ['rateio-de-frete', { itens: 'A;0\nB;0' }], ['meta-de-vendas', { contribuicao: 0 }],
  ['ponto-de-equilibrio', { variavel: 50 }], ['orcamento-de-servico', { cliente: '' }],
  ['controle-de-caixa-local', { movimentos: 'Venda;erro;5' }], ['controle-de-caixa-local', { movimentos: 'Venda;entrada;-5' }],
  ['margem-e-markup', { custo: 0 }], ['ponto-de-reposicao', { alvo: 1 }],
  ['gerador-de-qr-code', { texto: '' }], ['gerador-de-qr-code', { texto: 'é'.repeat(1000) }],
  ['link-de-whatsapp', { telefone: '112' }], ['link-de-whatsapp', { telefone: 'abc5511999999999' }],
  ['construtor-de-utm', { url: 'javascript:alert(1)' }], ['construtor-de-utm', { origem: '' }],
  ['formatador-de-json', { json: '{' }], ['codificador-de-url', { modo: 'decodificar', texto: '%QZ' }],
  ['gerador-de-senha', { minusculas: false, maiusculas: false, numeros: false, simbolos: false }],
  ['verificador-de-contraste', { frente: '#GG0000' }], ['gerador-de-hash-de-arquivo', { arquivo: null }],
  ['gerador-de-hash-de-arquivo', { arquivo: { size: 52428801, arrayBuffer() { throw new Error('Não deve ler arquivo acima do limite.'); } } }],
  ['base64-utf8', { modo: 'decodificar', texto: '====' }], ['base64-utf8', { modo: 'decodificar', texto: '/w==' }],
  ['base64-utf8', { modo: 'decodificar', texto: 'Zh==' }], ['gerador-de-uuid', { quantidade: 1.5 }],
  ['consumo-de-energia', { dias: 1.5 }], ['orcamento-domestico', { itens: 'Compra;gasto;-1' }],
  ['divisor-de-contas-da-casa', { pessoas: 'A;0' }], ['custo-por-lavagem', { ciclos: 0.5 }],
  ['custo-de-receita-domestica', { ingredientes: 'Arroz;10;0;20' }], ['lista-de-compras-comparativa', { itens: 'Arroz;1;2' }],
  ['planejador-de-meta-de-economia', { meses: 1.5 }], ['consumo-de-agua', { usos: 0.5 }],
  ['autonomia-de-estoque-domestico', { diario: 0 }], ['custo-de-combustivel', { rendimento: 0 }],
  ['divisor-de-viagem', { pagantes: 2.5 }], ['comparador-de-combustiveis', { rendimentoA: 0 }],
  ['orcamento-de-viagem', { pessoas: 1.5 }], ['lista-de-bagagem', { atividade: 'inexistente' }],
  ['tempo-de-trajeto-estimado', { velocidade: 0 }], ['consumo-medio-do-veiculo', { distancia: 0 }],
  ['comparador-de-deslocamento', { alternativas: 'Carro;30;20;0;30' }],
  ['conversor-de-moeda-informada', { cotacao: 0 }], ['peso-de-bagagem', { itens: 'Camisa;1;-1' }]
];
for (const [i, [id, entrada]] of invalidos.entries()) test(id + ': caso inválido ' + i, async () => { await assert.rejects(executar(id, entrada), Error); });

test('aceita vírgula e negativos matematicamente válidos', async () => {
  assert.equal((await executar('porcentagem', { total: '250,5', percentual: '-20' })).resumo, '-50,1');
  assert.equal((await executar('variacao-percentual', { inicial: -80, final: -40 })).resumo, '50%');
  assert.equal((await executar('regra-de-tres', { modo: 'inversa', a: 3, b: 12, c: 6 })).resumo, '6');
  assert.equal((await executar('conversor-de-unidades', { origem: 'C', destino: 'F', valor: '-40' })).resumo, '-40 F');
});
test('geometria, frações e estatística em outros modos', async () => {
  assert.equal((await executar('area-de-figuras', { figura: 'triangulo' })).resumo, '6 m²');
  assert.equal((await executar('area-de-figuras', { figura: 'trapezio' })).resumo, '15 m²');
  assert.equal((await executar('fracoes-e-simplificacao', { a: '2/-4', b: '3/6', operacao: 'somar' })).resumo, '0');
  assert.equal((await executar('fracoes-e-simplificacao', { a: '1/2', b: '1/3', operacao: 'dividir' })).resumo, '3/2');
  assert.equal((await executar('fracoes-e-simplificacao', { a: '2/3', b: '3/4', operacao: 'multiplicar' })).resumo, '1/2');
  assert.equal((await executar('fracoes-e-simplificacao', { a: '1/2', b: '1/3', operacao: 'subtrair' })).resumo, '1/6');
  assert.match((await executar('equacao-segundo-grau', { a: 1, b: 0, c: 1 })).resumo, /0 ± 1i/);
  assert.match(texto(await executar('estatistica-descritiva', { valores: '1\n2\n3', tipo: 'amostra' })), /Desvio padrão: 1/);
});
test('centavos distribuídos preservam totais e metas pequenas', async () => {
  assert.deepEqual(ratear(100, [1, 1, 1]), [33.34, 33.33, 33.33]);
  assert.deepEqual(ratear(0.01, [1, 1, 1]), [0.01, 0, 0]);
  const r = await executar('planejador-de-meta-de-economia', { meta: '0,02', guardado: 0, meses: 5 });
  assert.match(texto(r), /Mês 3: R\$ 0,00/);
  assert.match(texto(await executar('divisor-de-contas-da-casa', { modo: 'igual' })), /Pessoa A: R\$ 300,00/);
});
test('documentos exportados preservam acentos e bloqueiam fórmulas CSV', async () => {
  const r = await executar('controle-de-caixa-local', { movimentos: '=IMPORTXML(A1);entrada;50' });
  assert.match(await r.arquivo.blob.text(), /"'=IMPORTXML\(A1\)"/);
  const p = await executar('orcamento-de-servico', { cliente: 'João' });
  assert.match(await p.arquivo.blob.text(), /João/);
});
test('URL e Base64 restauram UTF-8; UTM preserva outros parâmetros e fragmento', async () => {
  const s = 'ação útil 😀';
  const encoded = (await executar('base64-utf8', { texto: s })).resumo;
  assert.equal((await executar('base64-utf8', { texto: encoded, modo: 'decodificar' })).resumo, s);
  const url = new URL((await executar('construtor-de-utm')).resumo);
  assert.equal(url.searchParams.get('produto'), '1'); assert.equal(url.hash, '#detalhes');
  assert.equal((await executar('codificador-de-url', { modo: 'decodificar', texto: 'a%C3%A7%C3%A3o%20%C3%BAtil' })).resumo, 'ação útil');
});
test('senha atende tamanho e conjuntos, permanece marcada como sensível', async () => {
  const t = obter('gerador-de-senha'); assert.equal(t.sensivel, true); assert.equal(t.persistir, false);
  for (let i = 0; i < 20; i++) {
    const r = await executar(t.id); assert.equal(r.resumo.length, 20);
    assert.match(r.resumo, /[a-z]/); assert.match(r.resumo, /[A-Z]/); assert.match(r.resumo, /\d/); assert.match(r.resumo, /[!@#$%&*+\-=?_]/);
  }
  assert.match((await executar(t.id, { minusculas: false, maiusculas: false, simbolos: false, tamanho: 8 })).resumo, /^\d{8}$/);
});
test('UUIDs atendem versão e variante; contraste testa limiares sem arredondar', async () => {
  const r = await executar('gerador-de-uuid', { quantidade: 100 });
  for (const uuid of r.linhas) assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(new Set(r.linhas).size, 100);
  const c = texto(await executar('verificador-de-contraste', { frente: '#777777' }));
  assert.match(c, /AA texto normal: não passa/); assert.match(c, /AA texto grande: passa/);
});
test('QR é SVG local com área de respiro e conteúdo não injetado como HTML', async () => {
  const r = await executar('gerador-de-qr-code', { texto: 'ação <script>alert(1)</script>' });
  assert.match(r.svg, /^<svg/); assert.match(r.svg, /viewBox=/); assert.doesNotMatch(r.svg, /<script>/);
  assert.equal(await r.arquivo.blob.text(), r.svg);
});
