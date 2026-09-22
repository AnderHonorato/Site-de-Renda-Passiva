import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  encontrarTextoSolto,
  encontrarScriptInline,
  encontrarAtributosProibidos,
  encontrarCorLiteral,
  encontrarInnerHtml,
  encontrarTextoLiteralEmJs,
} from '../../scripts/scripts-verificar-textos-fixos.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const caminhoScript = join(raizProjeto, 'scripts', 'scripts-verificar-textos-fixos.js');

test('encontrarTextoSolto acusa texto entre tags', () => {
  const achados = encontrarTextoSolto('<h1 class="titulo-display">Preço de venda</h1>');
  assert.deepEqual(achados, ['Preço de venda']);
});

test('encontrarTextoSolto aceita elemento vazio (chave de idioma preenche depois)', () => {
  assert.deepEqual(encontrarTextoSolto('<h1 data-texto="principal.titulo"></h1>'), []);
});

test('encontrarTextoSolto aceita símbolos puros e ignora <script type="application/json">', () => {
  const html = '<nav>/</nav><span>·</span><script type="application/json" id="af-textos">{"a":"Preço"}</script>';
  assert.deepEqual(encontrarTextoSolto(html), []);
});

test('encontrarScriptInline acusa <script> sem src e sem type application/json', () => {
  assert.deepEqual(encontrarScriptInline('<script>alert("oi")</script>'), ['alert("oi")']);
});

test('encontrarScriptInline aceita módulo externo e bloco de dados', () => {
  const html = '<script type="module" src="/x.js"></script><script type="application/json">{}</script>';
  assert.deepEqual(encontrarScriptInline(html), []);
});

test('encontrarAtributosProibidos acusa style= e onclick=', () => {
  assert.deepEqual(encontrarAtributosProibidos('<div style="color:red">'), ['style=']);
  assert.deepEqual(encontrarAtributosProibidos('<button onclick="fazer()">'), ['onclick="']);
});

test('encontrarAtributosProibidos não acusa markup limpo', () => {
  assert.deepEqual(encontrarAtributosProibidos('<div class="superficie"></div>'), []);
});

test('encontrarCorLiteral acusa hexadecimal e rgb() fora dos tokens', () => {
  assert.deepEqual(encontrarCorLiteral('color: #A05134;'), ['#A05134']);
  assert.deepEqual(encontrarCorLiteral('background: rgba(0,0,0,.4);'), ['rgba(']);
});

test('encontrarCorLiteral ignora variável CSS e fragmento de ícone', () => {
  assert.deepEqual(encontrarCorLiteral('color: var(--cor-destaque);'), []);
  assert.deepEqual(encontrarCorLiteral('href="/x.svg#icone-fechar"'), []);
});

test('encontrarInnerHtml acusa innerHTML/outerHTML/insertAdjacentHTML', () => {
  assert.deepEqual(encontrarInnerHtml('elemento.innerHTML = "<b>x</b>";'), ['.innerHTML']);
});

test('encontrarTextoLiteralEmJs acusa texto visível fixo em textContent e setAttribute', () => {
  const achados = encontrarTextoLiteralEmJs('elemento.textContent = "Preço de venda";');
  assert.equal(achados.length, 1);
  const achadosAtributo = encontrarTextoLiteralEmJs('elemento.setAttribute("aria-label", "Fechar aviso");');
  assert.equal(achadosAtributo.length, 1);
});

test('encontrarTextoLiteralEmJs não acusa uso de t() nem string vazia', () => {
  assert.deepEqual(encontrarTextoLiteralEmJs('elemento.textContent = t("principal.titulo");'), []);
  assert.deepEqual(encontrarTextoLiteralEmJs("elemento.textContent = '';"), []);
});

function criarProjetoTemporario() {
  const pasta = mkdtempSync(join(tmpdir(), 'af-verificar-textos-'));
  mkdirSync(join(pasta, 'frontend', 'paginas', 'teste'), { recursive: true });
  return pasta;
}

test('script reprova texto solto, style= inline e cor literal fora dos tokens', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(
      join(pasta, 'frontend', 'paginas', 'teste', 'teste.html'),
      '<div style="color:#A05134">Texto solto sem chave</div>',
    );
    assert.throws(() => execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' }));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('script aprova HTML limpo, com texto só por data-texto', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(
      join(pasta, 'frontend', 'paginas', 'teste', 'teste.html'),
      '<h1 class="titulo-display" data-texto="teste.titulo"></h1>',
    );
    const saida = execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' });
    assert.match(saida, /APROVADO/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
