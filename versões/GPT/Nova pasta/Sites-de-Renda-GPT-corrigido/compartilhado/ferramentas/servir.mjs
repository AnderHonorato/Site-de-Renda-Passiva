// Servidor local de desenvolvimento e de pré-visualização do pacote publicado.
// Escuta somente em 127.0.0.1, decodifica caminhos UTF-8 (acentos), bloqueia saída da
// pasta servida e envia os mesmos cabeçalhos de segurança do perfil sem anúncios.
// Uso: node ferramentas/servir.mjs [pasta] --porta 4311
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const argumentos = process.argv.slice(2);
const índiceDaPorta = argumentos.indexOf('--porta');
const porta = índiceDaPorta >= 0 ? Number(argumentos[índiceDaPorta + 1]) : 4311;
const pastaInformada = argumentos.find((argumento, índice) => !argumento.startsWith('--') && argumentos[índice - 1] !== '--porta') ?? '.';
const raiz = path.resolve(pastaInformada);

if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) {
  console.error('Porta inválida. Use --porta com um número entre 1024 e 65535.');
  process.exit(2);
}
if (!fs.existsSync(path.join(raiz, 'index.html'))) {
  console.error(`Não há index.html em ${raiz}. Rode "npm run gerar" (ou "npm run construir" para a pasta publicação).`);
  process.exit(2);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

const CABEÇALHOS_DE_SEGURANÇA = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store',
};

function responder(resposta, status, arquivo, método) {
  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream';
  resposta.writeHead(status, { ...CABEÇALHOS_DE_SEGURANÇA, 'Content-Type': tipo });
  if (método === 'HEAD') return resposta.end();
  fs.createReadStream(arquivo).pipe(resposta);
}

function responderNãoEncontrado(resposta, método) {
  const página = path.join(raiz, 'páginas', 'página-não-encontrada.html');
  if (fs.existsSync(página)) return responder(resposta, 404, página, método);
  resposta.writeHead(404, { ...CABEÇALHOS_DE_SEGURANÇA, 'Content-Type': 'text/plain; charset=utf-8' });
  return resposta.end('Página não encontrada.');
}

const servidor = http.createServer((requisição, resposta) => {
  const método = requisição.method ?? 'GET';
  if (método !== 'GET' && método !== 'HEAD') {
    resposta.writeHead(405, { ...CABEÇALHOS_DE_SEGURANÇA, Allow: 'GET, HEAD' });
    return resposta.end();
  }
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(requisição.url ?? '/', 'http://127.0.0.1').pathname).normalize('NFC');
  } catch {
    resposta.writeHead(400, CABEÇALHOS_DE_SEGURANÇA);
    return resposta.end('Endereço inválido.');
  }
  if (caminho.includes('\0')) {
    resposta.writeHead(400, CABEÇALHOS_DE_SEGURANÇA);
    return resposta.end('Endereço inválido.');
  }
  let alvo = path.resolve(raiz, `.${path.posix.normalize(caminho)}`);
  const relativo = path.relative(raiz, alvo);
  if (relativo.startsWith('..') || path.isAbsolute(relativo)) return responderNãoEncontrado(resposta, método);
  if (relativo.split(path.sep).some((parte) => parte.startsWith('.'))) return responderNãoEncontrado(resposta, método);
  try {
    if (fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, 'index.html');
    if (!fs.statSync(alvo).isFile()) return responderNãoEncontrado(resposta, método);
  } catch {
    return responderNãoEncontrado(resposta, método);
  }
  return responder(resposta, 200, alvo, método);
});

servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') console.error(`A porta ${porta} está ocupada. Escolha outra com --porta.`);
  else console.error(erro.message);
  process.exit(1);
});

servidor.listen(porta, '127.0.0.1', () => {
  console.log(`Servindo ${raiz}\nAbra http://127.0.0.1:${porta}/  (Ctrl+C para encerrar)`);
});
