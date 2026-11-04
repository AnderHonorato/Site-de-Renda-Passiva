/**
 * Processo de nuvem separado do modo de desenvolvimento (porta 4400).
 * O site escuta a PORT pública; a API usa somente loopback e proxy na mesma origem.
 * As contas persistem exclusivamente no volume montado em PORTAL_BANCO.
 */
import { spawn } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function configurarNuvem(ambiente = process.env) {
  const porta = Number(ambiente.PORT);
  if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) {
    throw new Error('PORT precisa ser uma porta válida de 1024 a 65535.');
  }
  if (ambiente.NODE_ENV !== 'production') {
    throw new Error('O servidor público exige NODE_ENV=production.');
  }
  let url;
  try { url = new URL(ambiente.URL_PUBLICA); } catch {
    throw new Error('URL_PUBLICA HTTPS é obrigatória no servidor público.');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const loopback = hostname === 'localhost' || hostname.endsWith('.localhost') ||
    (isIP(hostname) === 4 && hostname.startsWith('127.')) || hostname === '[::1]' || /^\[::ffff:7f[0-9a-f]{2}:/u.test(hostname);
  if (loopback || url.protocol !== 'https:' || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/' ||
      !url.hostname || /\.test$|\.invalid$|\.local$/iu.test(hostname)) {
    throw new Error('URL_PUBLICA deve ser a origem HTTPS pública, sem caminho nem credenciais.');
  }
  if (!ambiente.PORTAL_BANCO || !isAbsolute(ambiente.PORTAL_BANCO)) {
    throw new Error('PORTAL_BANCO precisa apontar para um caminho absoluto em volume persistente.');
  }
  if (ambiente.PORTAL_CHAT_LOCAL === '1' || ambiente.PORTAL_CHAT_PUBLICO === '1') {
    throw new Error('O chat público fica desativado enquanto a operação de moderação é preparada.');
  }
  return { porta, origem: url.origin, banco: ambiente.PORTAL_BANCO };
}

export function iniciarNuvem(ambiente = process.env) {
  const { porta } = configurarNuvem(ambiente);
  const configuracao = { ...ambiente, NODE_ENV: 'production', PORTAL_CHAT_LOCAL: '0', PORTAL_CHAT_PUBLICO: '0',
    PORTAL_ADS_ATIVO: '0', PORTAL_ADS_TESTE: '0' };
  const processos = [];
  let encerrando = false;

  function finalizar(codigo) {
    if (encerrando) return;
    encerrando = true;
    for (const p of processos) if (p.exitCode === null && !p.killed) p.kill('SIGTERM');
    process.exitCode = codigo;
  }
  for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => finalizar(0));
  for (const [nome, caminho, argumentos] of [
    ['API', 'servidor/iniciar.mjs', []],
    ['site', 'ferramentas/servir.mjs', [raiz, '--porta', String(porta)]],
  ]) {
    const filho = spawn(process.execPath, [resolve(raiz, caminho), ...argumentos], {
      cwd: raiz, env: configuracao, stdio: 'inherit', windowsHide: true,
    });
    processos.push(filho);
    filho.on('error', (erro) => {
      console.error('Falha ao iniciar ' + nome + ': ' + erro.message);
      finalizar(1);
    });
    filho.on('exit', (codigo) => {
      if (!encerrando) {
        console.error(nome + ' encerrou inesperadamente (' + codigo + ').');
        finalizar(1);
      }
    });
  }
  console.log('Portal completo iniciado em modo de produção na porta ' + porta + '.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { iniciarNuvem(); } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
