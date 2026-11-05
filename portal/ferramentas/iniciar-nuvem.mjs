/**
 * Processo de nuvem separado do modo de desenvolvimento (porta 4400).
 * O site escuta a PORT pública; a API usa somente loopback e proxy na mesma origem.
 * As contas persistem exclusivamente no volume montado em PORTAL_BANCO.
 */
import { spawn } from 'node:child_process';
import { isAbsolute, dirname, resolve } from 'node:path';
import { readFileSync, accessSync, openSync, closeSync, unlinkSync, constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
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


/** Linux: identifica montagem independente da camada efêmera do contêiner. */
export function identificarVolumeMontado(arquivoBanco, mountinfo) {
  if (!isAbsolute(arquivoBanco) || typeof mountinfo !== 'string') return null;
  const pasta=resolve(dirname(arquivoBanco));
  const candidatas=mountinfo.split('\n').flatMap(linha=>{
    const parte=linha.split(' - ')[0]?.trim().split(/\s+/);
    if(!parte||parte.length<5)return [];
    const ponto=parte[4].replace(/\\([0-7]{3})/g,(_,octal)=>
      String.fromCharCode(Number.parseInt(octal,8)));
    return ponto!=='/' && isAbsolute(ponto) &&
      (pasta===ponto||pasta.startsWith(ponto.endsWith('/')?ponto:ponto+'/'))?[ponto]:[];
  });
  return candidatas.sort((a,b)=>b.length-a.length)[0]||null;
}
/** Falha fechada: não inicia contas e sessões se o DB estiver no disco temporário. */
export function verificarVolumeNuvem(ambiente=process.env,{
  mountinfo=readFileSync('/proc/self/mountinfo','utf8'),testarEscrita=true,
}={}){
  const arquivoBanco=ambiente.PORTAL_BANCO;
  if(!arquivoBanco||!isAbsolute(arquivoBanco))
    throw new Error('PORTAL_BANCO deve apontar para arquivo em volume absoluto.');
  const montado=identificarVolumeMontado(arquivoBanco,mountinfo);
  if(!montado)throw new Error('Recusado banco SQLite em armazenamento efêmero: monte um volume persistente.');
  if(ambiente.RAILWAY_VOLUME_MOUNT_PATH &&
      resolve(ambiente.RAILWAY_VOLUME_MOUNT_PATH)!==montado)
    throw new Error('O volume Railway não coincide com PORTAL_BANCO.');
  if(testarEscrita){
    const pasta=dirname(arquivoBanco);
    accessSync(pasta,constants.R_OK|constants.W_OK);
    const arquivo=resolve(pasta,'.portal-io-'+randomBytes(8).toString('hex'));
    const fd=openSync(arquivo,'wx',0o600);
    try{closeSync(fd);}finally{unlinkSync(arquivo);}
  }
  return montado;
}

export function iniciarNuvem(ambiente = process.env) {
  const { porta } = configurarNuvem(ambiente);
  verificarVolumeNuvem(ambiente);
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
