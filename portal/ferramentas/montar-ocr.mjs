/** Motor OCR local e idiomas fixados: nenhum recurso de execução vem de CDN. */
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const pacotes = { 'tesseract.js': '6.0.1', 'tesseract.js-core': '6.1.2', '@tesseract.js-data/por': '1.0.0', '@tesseract.js-data/eng': '1.0.0', '@tesseract.js-data/spa': '1.0.0' };
for (const [nome, versao] of Object.entries(pacotes)) {
  if (JSON.parse(await readFile(join(raiz, 'node_modules', nome, 'package.json'))).version !== versao) throw new Error(`Versão inesperada do motor OCR: ${nome}.`);
}
const hashes = {
  'worker.min.js': '38645599043239c0eb6db08a6504a92dcdc292200535f3e9339cd77c4443b842',
  'tesseract-core-lstm.wasm.js': '775a35df6f2ae100e02609443e6bd5cafcd07983dd6175454ca4a432a7730687',
  'tesseract-core-lstm.wasm': '220e2e87551edccb85519796a170469f8ab2a8055216789e3b8b1ada18b7bc2b',
  'tesseract-core-simd-lstm.wasm.js': '9d7c43fb206dc9f48475228b46bf35f888fa9e6259da2e67d5a75c77049f2dc7',
  'tesseract-core-simd-lstm.wasm': '187d76742dfc0d8929f0b49a619f145bb6370730776c7bd0d3e20c6b2098808d',
  'por.traineddata.gz': 'dacebc1386ddaaf8389f81094236cca0d690897cde693d48cbdaa881c86e2b4c',
  'eng.traineddata.gz': '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91',
  'spa.traineddata.gz': '40be52f97b5d4eb7460073dc1f94cd546b27150333c0bf854ed7e7132db6bceb',
};
const destino = join(raiz, 'recursos/ocr');
await mkdir(destino, { recursive: true });
for (const [nome, hash] of Object.entries(hashes)) {
  const origem = nome === 'worker.min.js' ? 'tesseract.js/dist/worker.min.js'
    : nome.endsWith('.gz') ? `@tesseract.js-data/${nome.slice(0, 3)}/4.0.0_best_int/${nome}` : `tesseract.js-core/${nome}`;
  const bytes = await readFile(join(raiz, 'node_modules', origem));
  if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error(`Integridade inesperada de ${nome}.`);
  await writeFile(join(destino, nome), bytes);
}
await cp(join(raiz, 'node_modules/tesseract.js/LICENSE.md'), join(destino, 'Apache-2.0.txt'));
await cp(join(raiz, 'node_modules/tesseract.js-core/LICENSE'), join(destino, 'LICENCAS-CORE.txt'));
await cp(join(raiz, 'node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt'), join(destino, 'AVISOS-WORKER.txt'));
await writeFile(join(destino, 'AVISOS.txt'), [
  'Tesseract.js 6.0.1 e tesseract.js-core 6.1.2 — Apache-2.0 e licenças indicadas no core.',
  'Modelos LSTM por/eng/spa: @tesseract.js-data/* 1.0.0, 4.0.0_best_int.',
  'O pacote dos modelos declara MIT; os modelos tessdata são distribuídos sob Apache-2.0.',
  'Fontes e receitas correspondentes:', 'https://github.com/naptha/tesseract.js/tree/v6.0.1',
  'https://github.com/naptha/tesseract.js-core/tree/v6.1.2', 'https://github.com/naptha/tessdata',
  'https://github.com/tesseract-ocr/tessdata_best', JSON.stringify(hashes, null, 2), '',
].join('\n'));
console.log('OCR local preparado: Tesseract.js 6.0.1, português, inglês e espanhol.');
