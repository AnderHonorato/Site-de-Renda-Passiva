import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const hash = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const erro = (status, codigo) => Object.assign(new Error(codigo), { status, codigo });

export function cookies(req) {
  const resultado = Object.create(null);
  for (const parte of (req.headers.cookie || '').split(';')) {
    const posicao = parte.indexOf('=');
    if (posicao <= 0) continue;
    try {
      const nome = decodeURIComponent(parte.slice(0, posicao).trim());
      const valor = decodeURIComponent(parte.slice(posicao + 1).trim());
      if (nome && !/[\x00-\x20\x7f;=]/.test(nome) && !['__proto__', 'constructor', 'prototype'].includes(nome) && !Object.hasOwn(resultado, nome)) {
        resultado[nome] = valor;
      }
    } catch {
      // Um cookie malformado não deve invalidar os demais cookies válidos.
    }
  }
  return resultado;
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
    if (typeof armazenado !== 'string') return false;
    const partes = armazenado.split('$');
    if (partes.length !== 6) return false;
    const [tipo, n, r, p, sal, h] = partes;
    if (tipo !== 'scrypt') return false;
    // Aceitar apenas parâmetros previamente utilizados pela aplicação.
    if (!['16384', '32768'].includes(n) || r !== '8' || !['1', '2', '3'].includes(p)) return false;
    if (!/^[A-Za-z0-9+/]{22}==$/.test(sal) || !/^[A-Za-z0-9+/]{86}==$/.test(h)) return false;
    const salBytes = Buffer.from(sal, 'base64');
    const esperado = Buffer.from(h, 'base64');
    if (salBytes.length !== 16 || esperado.length !== 64) return false;
    if (salBytes.toString('base64') !== sal || esperado.toString('base64') !== h) return false;
    const atual = await scrypt(senha, salBytes, esperado.length,
      { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(esperado, atual);
  } catch {
    return false;
  }
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
