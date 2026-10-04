// Servidor local de desenvolvimento e de pré-visualização do pacote publicado.
// Escuta no PC e na rede local (para abrir no celular); com --local, só em 127.0.0.1.
// Decodifica caminhos UTF-8 (acentos), bloqueia saída da pasta servida e envia os mesmos
// cabeçalhos de segurança da publicação (política-de-segurança.mjs).
// Uso: node ferramentas/servir.mjs [pasta] --porta 4311 [--local]
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { CABEÇALHOS_DE_SEGURANÇA, caminhoÉPrivado } from './política-de-segurança.mjs';

const argumentos = process.argv.slice(2);
const índiceDaPorta = argumentos.indexOf('--porta');
const porta = índiceDaPorta >= 0 ? Number(argumentos[índiceDaPorta + 1]) : 4311;
const sóLocal = argumentos.includes('--local');
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

// Os mesmos cabeçalhos da publicação; no servidor local, sem cache para ver cada edição.
const CABEÇALHOS = { ...CABEÇALHOS_DE_SEGURANÇA, 'Cache-Control': 'no-store' };

function responder(resposta, status, arquivo, método) {
  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream';
  resposta.writeHead(status, { ...CABEÇALHOS, 'Content-Type': tipo });
  if (método === 'HEAD') return resposta.end();
  fs.createReadStream(arquivo).pipe(resposta);
}

function responderNãoEncontrado(resposta, método) {
  const página = path.join(raiz, '404.html');
  if (fs.existsSync(página)) return responder(resposta, 404, página, método);
  resposta.writeHead(404, { ...CABEÇALHOS, 'Content-Type': 'text/plain; charset=utf-8' });
  return resposta.end('Página não encontrada.');
}

const servidor = http.createServer((requisição, resposta) => {
  const método = requisição.method ?? 'GET';
  if (método !== 'GET' && método !== 'HEAD') {
    resposta.writeHead(405, { ...CABEÇALHOS, Allow: 'GET, HEAD' });
    return resposta.end();
  }
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(requisição.url ?? '/', 'http://127.0.0.1').pathname).normalize('NFC');
  } catch {
    resposta.writeHead(400, CABEÇALHOS);
    return resposta.end('Endereço inválido.');
  }
  if (caminho.includes('\0')) {
    resposta.writeHead(400, CABEÇALHOS);
    return resposta.end('Endereço inválido.');
  }
  let alvo = path.resolve(raiz, `.${path.posix.normalize(caminho)}`);
  const relativo = path.relative(raiz, alvo);
  if (relativo.startsWith('..') || path.isAbsolute(relativo)) return responderNãoEncontrado(resposta, método);
  // Pastas de desenvolvimento, arquivos de projeto e pontos-arquivo parecem não existir.
  if (caminhoÉPrivado(relativo)) return responderNãoEncontrado(resposta, método);
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

/** Endereços IPv4 desta máquina na rede local (os que o celular consegue alcançar). */
function endereçosDaRede() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((interface_) => interface_ && interface_.family === 'IPv4' && !interface_.internal)
    .map((interface_) => interface_.address);
}

servidor.listen(porta, sóLocal ? '127.0.0.1' : '0.0.0.0', () => {
  const linhas = [`Servindo ${raiz}`, `No PC:      http://127.0.0.1:${porta}/`];
  if (!sóLocal) {
    for (const endereço of endereçosDaRede()) linhas.push(`Na rede:    http://${endereço}:${porta}/`);
    linhas.push('Atenção: a porta fica aberta para a rede em que o PC estiver. Em Wi-Fi público, use --local.');
  }
  linhas.push('(Ctrl+C para encerrar)');
  console.log(linhas.join('\n'));
});
