import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linhaDeFerramenta } from '../scripts/núcleo/lista.js';

function ferramenta(plano, status = 'pronta') {
  return {
    slug: 'ferramenta-de-teste',
    nome: 'Ferramenta de teste',
    resumo: 'Resumo de teste',
    ícone: 'cadeado',
    status,
    plano,
  };
}

test('a linha mostra a insígnia Premium, com texto e ícone', () => {
  const html = linhaDeFerramenta(ferramenta('premium'));
  assert.match(html, /insígnia-plano--premium/);
  assert.match(html, />Premium<\/span>/);
  assert.match(html, /aria-hidden="true"/);
});

test('a linha continua distinguindo Plus', () => {
  const html = linhaDeFerramenta(ferramenta('plus'));
  assert.match(html, /insígnia-plano--plus/);
  assert.match(html, />Plus<\/span>/);
  assert.doesNotMatch(html, />Premium<\/span>/);
});

test('ferramenta gratuita não ganha insígnia de plano', () => {
  const html = linhaDeFerramenta(ferramenta('gratuito'));
  assert.doesNotMatch(html, /insígnia-plano/);
  assert.doesNotMatch(html, />Plus<\/span>|>Premium<\/span>/);
});

test('planejada preserva o selo e a ficha sem exibir plano pago', () => {
  const html = linhaDeFerramenta(ferramenta('premium', 'planejada'));
  assert.match(html, /Planejada/);
  assert.doesNotMatch(html, /insígnia-plano|>Premium<\/span>/);
  assert.match(html, /data-ficha="ferramenta-de-teste"/);
});
