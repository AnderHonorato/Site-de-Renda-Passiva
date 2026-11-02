// Servidor local minimo (so localhost) que entrega os arquivos de exemplo com CORS liberado,
// para que o navegador possa buscar (fetch) o arquivo e montar um File sem passar base64 pela conversa.
// Uso: node servir-amostras.mjs <pasta-das-amostras> [porta=8765]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const pasta = path.resolve(process.argv[2] || './amostras');
const porta = Number(process.argv[3] || 8765);
const tipos = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.html': 'text/html', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

http.createServer((req, res) => {
  const nome = path.basename(decodeURIComponent(req.url.split('?')[0]));
  const caminho = path.join(pasta, nome);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); res.writeHead(204); return res.end(); }
  if (!fs.existsSync(caminho) || !fs.statSync(caminho).isFile()) { res.writeHead(404); return res.end('nao encontrado'); }
  res.writeHead(200, { 'Content-Type': tipos[path.extname(nome).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(caminho).pipe(res);
}).listen(porta, '127.0.0.1', () => console.log(`servindo ${pasta} em http://127.0.0.1:${porta}`));
