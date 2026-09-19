// Copia o código comum para dentro de cada produto, para que cada pasta possa ser
// publicada sozinha. As pastas de destino são totalmente gerenciadas por este script:
// o conteúdo anterior é substituído. Edite sempre a origem em compartilhado/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produtos } from './produtos.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const compartilhado = path.join(raiz, 'compartilhado');

const MAPEAMENTO = [
  ['scripts', 'scripts/comum'],
  ['estilos', 'estilos/comum'],
  ['recursos/fontes', 'recursos/fontes'],
  ['recursos/bibliotecas', 'recursos/bibliotecas'],
  ['ferramentas', 'ferramentas'],
  ['conteúdo-comum', 'conteúdo/comum'],
];

function comCabeçalho(conteúdo, relativo, extensão) {
  const aviso = `Sincronizado de compartilhado/${relativo} — edite a origem e rode "npm run sincronizar" na raiz.`;
  if (extensão === '.css') {
    const charset = '@charset "UTF-8";';
    const resto = conteúdo.startsWith(charset) ? conteúdo.slice(charset.length).replace(/^\r?\n/, '') : conteúdo;
    return `${charset}\n/* ${aviso} */\n${resto}`;
  }
  return `// ${aviso}\n${conteúdo}`;
}

function copiarPasta(origem, destino, relativoBase) {
  fs.mkdirSync(destino, { recursive: true });
  let total = 0;
  for (const entrada of fs.readdirSync(origem, { withFileTypes: true })) {
    const nome = entrada.name.normalize('NFC');
    const caminhoDeOrigem = path.join(origem, entrada.name);
    const caminhoDeDestino = path.join(destino, nome);
    const relativo = `${relativoBase}/${nome}`;
    if (entrada.isDirectory()) {
      total += copiarPasta(caminhoDeOrigem, caminhoDeDestino, relativo);
      continue;
    }
    const extensão = path.extname(nome);
    if (['.js', '.mjs', '.css'].includes(extensão) && nome !== 'qrcode.mjs') {
      fs.writeFileSync(caminhoDeDestino, comCabeçalho(fs.readFileSync(caminhoDeOrigem, 'utf8'), relativo, extensão), 'utf8');
    } else {
      fs.copyFileSync(caminhoDeOrigem, caminhoDeDestino);
    }
    total += 1;
  }
  return total;
}

for (const produto of produtos) {
  const pasta = path.join(raiz, produto.pasta);
  let total = 0;
  for (const [origem, destino] of MAPEAMENTO) {
    const caminhoDeOrigem = path.join(compartilhado, origem);
    if (!fs.existsSync(caminhoDeOrigem)) continue;
    const caminhoDeDestino = path.join(pasta, destino);
    fs.rmSync(caminhoDeDestino, { recursive: true, force: true });
    total += copiarPasta(caminhoDeOrigem, caminhoDeDestino, origem);
  }
  console.log(`${produto.pasta}: ${total} arquivos sincronizados.`);
}
