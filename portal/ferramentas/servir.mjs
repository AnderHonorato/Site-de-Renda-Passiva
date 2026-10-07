// Servidor local de desenvolvimento e de pré-visualização do pacote publicado.
// Escuta no PC e na rede local (para abrir no celular); com --local, só em 127.0.0.1.
// Decodifica caminhos UTF-8 (acentos), bloqueia saída da pasta servida e envia os mesmos
// cabeçalhos de segurança da publicação (política-de-segurança.mjs).
// Uso: node ferramentas/servir.mjs [pasta] --porta 4311 [--local]
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { CABEÇALHOS_DE_SEGURANÇA, caminhoÉPrivado } from './política-de-segurança.mjs';

const argumentos = process.argv.slice(2);
const índiceDaPorta = argumentos.indexOf('--porta');
const porta = índiceDaPorta >= 0 ? Number(argumentos[índiceDaPorta + 1]) : 4311;
const sóLocal = argumentos.includes('--local');
const pastaInformada = argumentos.find((argumento, índice) => !argumento.startsWith('--') && argumentos[índice - 1] !== '--porta') ?? '.';
const raiz = path.resolve(pastaInformada);
const portaApi = Number(process.env.PORTAL_API_PORTA || 4870);

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

async function responder(resposta, status, arquivo, método, requisição) {
  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream';
  // A CSP continua idêntica enquanto a API não autorizar publicidade nesta página.
  if (status === 200 && tipo.startsWith('text/html') && requisição) {
    try {
      const origem = new URL(process.env.URL_PUBLICA || `http://127.0.0.1:${porta}`).origin;
      const anuncios = await fetch(`http://127.0.0.1:${portaApi}/api/anuncios`, {
        headers: { Cookie: requisição.headers.cookie || '', Referer: `${origem}${requisição.url}` },
        signal: AbortSignal.timeout(1500),
      }).then(r => r.ok ? r.json() : null);
      if (anuncios?.permitido && /^ca-pub-\d{16}$/.test(anuncios.editor) && Object.values(anuncios.blocos || {}).some(v => /^\d{6,20}$/.test(v))) {
        const nonce = randomBytes(24).toString('base64');
        const csp = `default-src 'self'; script-src 'nonce-${nonce}' 'strict-dynamic'; style-src 'self'; img-src 'self' data: blob: https://*.google.com https://*.googleusercontent.com https://*.googlesyndication.com https://*.doubleclick.net; font-src 'self'; connect-src 'self' https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; frame-src https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
        const html = fs.readFileSync(arquivo, 'utf8').replace(/<script\b/g, `<script nonce="${nonce}"`);
        resposta.writeHead(status, { ...CABEÇALHOS, 'Content-Security-Policy': csp, 'Content-Type': tipo });
        return resposta.end(método === 'HEAD' ? undefined : html);
      }
    } catch { /* Falha de publicidade mantém a página e a CSP originais. */ }
  }
  resposta.writeHead(status, { ...CABEÇALHOS, 'Content-Type': tipo });
  if (método === 'HEAD') return resposta.end();
  fs.createReadStream(arquivo).pipe(resposta);
}

/** A 404 do idioma do endereço pedido: /en/... recebe a página em inglês; o resto, a em português. */
function responderNãoEncontrado(resposta, método, caminho = '/') {
  const noInglês = caminho === '/en' || caminho.startsWith('/en/');
  const página = path.join(raiz, noInglês ? 'en' : '', '404.html');
  if (fs.existsSync(página)) return responder(resposta, 404, página, método);
  resposta.writeHead(404, { ...CABEÇALHOS, 'Content-Type': 'text/plain; charset=utf-8' });
  return resposta.end('Página não encontrada.');
}

function encaminharApi(requisição, resposta) {
  const remoto = requisição.socket.remoteAddress || '127.0.0.1';
  const proxyLocal = process.env.PORTAL_PROXY_CONFIAVEL === '1' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoto);
  const ipEncaminhado = String(requisição.headers['x-forwarded-for'] || '').trim();
  const cliente = proxyLocal && /^[0-9a-f:.]{3,45}$/i.test(ipEncaminhado) ? ipEncaminhado : remoto;
  const headers = { ...requisição.headers, host: `127.0.0.1:${portaApi}`, 'x-forwarded-for': cliente };
  delete headers['connection'];
  const destino = http.request({ hostname: '127.0.0.1', port: portaApi, path: requisição.url, method: requisição.method, headers }, origem => {
    resposta.writeHead(origem.statusCode || 502, { ...origem.headers, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    origem.pipe(resposta);
  });
  const prazo = requisição.url?.startsWith('/api/chat/eventos') ? 0 : (requisição.url?.includes('/midias') ? 60000 : 10000);
  destino.setTimeout(prazo, () => destino.destroy());
  destino.on('error', () => {
    if (resposta.headersSent) return resposta.end();
    resposta.writeHead(503, { ...CABEÇALHOS, 'Content-Type': 'application/json; charset=utf-8' });
    resposta.end(JSON.stringify({ erro: 'servico_indisponivel' }));
  });
  resposta.on('close', () => destino.destroy());
  requisição.pipe(destino);
}

const servidor = http.createServer((requisição, resposta) => {
  const método = requisição.method ?? 'GET';
  // Origem única: credenciais e cookies não atravessam CORS nem aparecem em URLs.
  if (requisição.url?.startsWith('/api/')) return encaminharApi(requisição, resposta);
  if (requisição.url === '/ads.txt' && ['GET', 'HEAD'].includes(método)) {
    const editor = process.env.PORTAL_ADS_EDITOR || '';
    const valido = process.env.PORTAL_ADS_ATIVO === '1' && /^ca-pub-\d{16}$/.test(editor);
    resposta.writeHead(valido ? 200 : 404, { ...CABEÇALHOS, 'Content-Type': 'text/plain; charset=utf-8' });
    return resposta.end(método === 'HEAD' || !valido ? '' : `google.com, ${editor.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  }
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
  if (relativo.startsWith('..') || path.isAbsolute(relativo)) return responderNãoEncontrado(resposta, método, caminho);
  // Pastas de desenvolvimento, arquivos de projeto e pontos-arquivo parecem não existir.
  if (caminhoÉPrivado(relativo)) return responderNãoEncontrado(resposta, método, caminho);
  try {
    if (fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, 'index.html');
    if (!fs.statSync(alvo).isFile()) return responderNãoEncontrado(resposta, método, caminho);
  } catch {
    return responderNãoEncontrado(resposta, método, caminho);
  }
  return responder(resposta, 200, alvo, método, requisição);
});
servidor.headersTimeout = 15000;
servidor.requestTimeout = 90000;

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
