import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const hash = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const erro = (status, codigo) => Object.assign(new Error(codigo), { status, codigo });

export function cookies(req) {
  try {
    return Object.fromEntries((req.headers.cookie || '')
      .split(';').map(x => x.trim().split('=').map(decodeURIComponent))
      .filter(x => x.length === 2));
  } catch { return {}; }
}

export async function senhaHash(senha) {
  const sal = randomBytes(16);
  const derivado = await scrypt(senha, sal, 64, { N:32768, r:8, p:3, maxmem:64*1024*1024 });
  return `scrypt$32768$8$3$${sal.toString('base64')}$${derivado.toString('base64')}`;
}

export const hashDummy = senhaHash(randomBytes(32).toString('base64url'));

export async function comparar(senha, armazenado) {
  try {
    if (typeof senha !== 'string' || senha.length > 128) return false;
    const [tipo, n, r, p, sal, h] = armazenado.split('$');
    if (tipo !== 'scrypt' || +n > 32768 || +r > 8 || +p > 3) return false;
    const esperado = Buffer.from(h, 'base64');
    const atual = await scrypt(senha, Buffer.from(sal, 'base64'), esperado.length,
      { N:+n, r:+r, p:+p, maxmem:64*1024*1024 });
    return esperado.length === atual.length && timingSafeEqual(esperado, atual);
  } catch { return false; }
}

export async function corpo(req, maxBytes = 16384) {
  const partes = []; let bytes = 0;
  for await (const parte of req) {
    bytes += parte.length;
    if (bytes > maxBytes) throw erro(413, 'corpo_grande');
    partes.push(parte);
  }
  try {
    const dados = Buffer.concat(partes).toString('utf8');
    const objeto = dados ? JSON.parse(dados) : {};
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) throw Error();
    return objeto;
  } catch { throw erro(400, 'json_invalido'); }
}
