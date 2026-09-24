// admin-tela-ferramentas.test.js — admin-ferramentas.js (docs/debate-criticos.md P5): ferramenta
// planejada não pode ter o interruptor "Ferramenta ativa" parecendo ligado e clicável.
//
// O módulo usa import absoluto ("/estatico/...", resolvido pelo navegador contra a pasta
// estática do servidor — docs/contratos.md). Para importar o módulo real no Node só para testar
// a função pura que decide o desabilitado, registramos aqui um resolvedor mínimo que traduz
// esse prefixo para a pasta frontend/ do projeto. Nenhum outro arquivo é tocado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const raizFrontend = pathToFileURL(path.join(import.meta.dirname, '../../frontend') + '/').href;

const codigoResolvedor = `
const raiz = ${JSON.stringify(raizFrontend)};
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/estatico/')) {
    return { url: raiz + specifier.slice('/estatico/'.length), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(codigoResolvedor)}`, import.meta.url);

const { deveDesabilitarAtiva } = await import(
  pathToFileURL(path.join(import.meta.dirname, '../../frontend/paginas/admin/admin-ferramentas.js')).href
);

test('deveDesabilitarAtiva desabilita o interruptor de ferramenta planejada', () => {
  assert.equal(deveDesabilitarAtiva({ estado: 'planejada', ativa: 1 }), true);
});

test('deveDesabilitarAtiva mantém o interruptor normal para ferramenta pronta', () => {
  assert.equal(deveDesabilitarAtiva({ estado: 'pronta', ativa: 1 }), false);
  assert.equal(deveDesabilitarAtiva({ estado: 'pronta', ativa: 0 }), false);
});

test('deveDesabilitarAtiva devolve false sem ferramenta', () => {
  assert.equal(deveDesabilitarAtiva(undefined), false);
  assert.equal(deveDesabilitarAtiva({}), false);
});
