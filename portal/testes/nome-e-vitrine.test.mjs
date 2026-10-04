/** Testes do nome global do site e dos números reais da vitrine (Onda 0). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site } from '../dados/site.js';
import { ferramentas, ferramentasProntas } from '../dados/catálogo.js';
import { categorias } from '../dados/categorias.js';
import { números } from '../vitrine/vitrine-números.js';
import { textos } from '../vitrine/vitrine-textos.js';
import { montarPágina } from '../ferramentas/modelo-de-página.mjs';
import { montarDocumentoPdf } from '../scripts/comum/documentos/montar-documento-pdf.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS_DE_CÓDIGO = ['dados', 'scripts', 'ferramentas', 'vitrine', 'estilos'];

async function arquivosDe(pasta) {
  const achados = [];
  for (const entrada of await readdir(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...await arquivosDe(caminho));
    else if (/\.(js|mjs|css|md)$/.test(entrada.name)) achados.push(caminho);
  }
  return achados;
}

test('o nome do site só está escrito em dados/site.js', async () => {
  const proibido = `${site.destaque} ${site.complemento}`;
  const culpados = [];
  for (const pasta of PASTAS_DE_CÓDIGO) {
    for (const arquivo of await arquivosDe(join(RAIZ, pasta))) {
      if (relative(RAIZ, arquivo).replaceAll('\\', '/') === 'dados/site.js') continue;
      if ((await readFile(arquivo, 'utf8')).includes(proibido)) culpados.push(relative(RAIZ, arquivo));
    }
  }
  assert.deepEqual(culpados, [], 'o nome vem de dados/site.js; leia de lá em vez de escrever');
});

test('o nome é composto pelas duas partes e tem nome curto', () => {
  assert.equal(site.nome, `${site.destaque} ${site.complemento}`);
  assert.ok(site.nomeCurto.length > 0 && site.nomeCurto.length <= 12, 'o nome curto precisa caber sob o ícone do celular');
  assert.ok(site.assinatura['pt-BR'] && site.assinatura.en);
});

test('cabeçalho e rodapé leem o nome de dados/site.js', () => {
  const html = montarPágina({ título: 'T', descrição: 'D', conteúdo: '<p>x</p>' });
  assert.ok(html.includes(`<b>${site.destaque}</b><span>${site.complemento}</span>`));
  assert.ok(html.includes(`aria-label="${site.nome}, início"`));
  assert.ok(html.includes(`Criado por ${site.autor}`));
});

test('o PDF leva o nome e o autor de dados/site.js', () => {
  const bytes = montarDocumentoPdf({ título: 'Teste' }).gerarBytes();
  const texto = new TextDecoder('latin1').decode(bytes);
  assert.ok(texto.includes(site.nome), 'o rodapé do PDF traz o nome do site');
  const autorEmHex = [...site.autor].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('').toUpperCase();
  assert.ok(texto.includes(autorEmHex), 'o autor está nas propriedades do PDF');
});

test('os números da vitrine saem do catálogo', () => {
  assert.equal(números.prontas, ferramentasProntas.length);
  assert.equal(números.catálogo, ferramentas.length);
  assert.equal(números.categorias, categorias.length);
  for (const idioma of Object.keys(textos)) {
    assert.equal(Number(textos[idioma].número), ferramentasProntas.length, `idioma ${idioma}`);
  }
});

test('a vitrine não promete o que o site não tem', () => {
  for (const [idioma, tx] of Object.entries(textos)) {
    const tudo = JSON.stringify(tx, (chave, valor) => (typeof valor === 'function' ? '' : valor));
    assert.doesNotMatch(tudo, /\bpix\b/i, `Pix em ${idioma}`);
    assert.doesNotMatch(tudo, /an[úu]nci|\bads?\b/i, `anúncio em ${idioma}`);
    assert.doesNotMatch(tudo, /\b(seis|six)\b/i, `contagem fixa de áreas em ${idioma}`);
    assert.doesNotMatch(tudo, /\b49\b/, `número antigo em ${idioma}`);
  }
});

test('os mesmos textos existem nos dois idiomas', () => {
  assert.deepEqual(Object.keys(textos['pt-BR']).sort(), Object.keys(textos.en).sort());
  assert.equal(textos['pt-BR'].áreas.length, textos.en.áreas.length);
  assert.equal(textos['pt-BR'].nós.length, textos.en.nós.length);
});

test('a página inicial e o manifesto gerados usam o nome atual e o número real', async () => {
  const inicio = await readFile(join(RAIZ, 'index.html'), 'utf8');
  assert.ok(inicio.includes(`<title>${site.nome} — `), 'título da página inicial');
  const manifesto = JSON.parse(await readFile(join(RAIZ, 'manifesto.webmanifest'), 'utf8'));
  assert.equal(manifesto.name, site.nome);
  assert.equal(manifesto.short_name, site.nomeCurto);
  const gerado = await readFile(join(RAIZ, 'vitrine', 'vitrine-números.js'), 'utf8');
  assert.ok(gerado.includes(`prontas: ${ferramentasProntas.length},`), 'rode npm run gerar: o número da vitrine está velho');
});
