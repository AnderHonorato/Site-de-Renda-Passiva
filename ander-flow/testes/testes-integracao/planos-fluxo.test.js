import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

async function subirServidor() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-planos-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { base, fechar: () => servidor.close() };
}

test('GET /api/planos devolve moeda, pagamento e planos sem campos internos, sem sessão', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  const resposta = await fetch(`${ambiente.base}/api/planos`);
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();

  assert.equal(corpo.moeda, 'BRL');
  assert.equal(corpo.pagamento_integrado, false);
  assert.equal(corpo.planos.length, 2);

  const gratis = corpo.planos.find((plano) => plano.id === 'gratis');
  assert.deepEqual(gratis.limites, { favoritos: 10, trabalhos: 3, lote_arquivos: 3 });
  assert.deepEqual(gratis.recursos, []);

  const plus = corpo.planos.find((plano) => plano.id === 'plus');
  assert.equal(plus.preco_mensal, 14.9);
  assert.equal(plus.preco_anual, 149);

  const camposConhecidos = ['id', 'preco_mensal', 'preco_anual', 'limites', 'recursos'];
  for (const plano of corpo.planos) {
    assert.deepEqual(Object.keys(plano).sort(), [...camposConhecidos].sort());
  }
});
