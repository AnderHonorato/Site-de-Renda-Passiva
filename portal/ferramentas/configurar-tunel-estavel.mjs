/**
 * Configuração local, sem contas externas, restrita ao perfil Windows AS.
 * Chave SSH permanece em %LOCALAPPDATA%\SitesAdsTeste (NUNCA no Git).
 * Uso: node ferramentas/configurar-tunel-estavel.mjs --instalar
 */
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PASTA_DADOS,ARQUIVO_CHAVE} from './servidor-tunel-estavel.mjs';

export function comandoInicializacao(caminhoVbs){
 if(!caminhoVbs||!/\.vbs$/i.test(caminhoVbs))
   throw new Error('Lançador Windows inválido.');
 return 'wscript.exe "'+caminhoVbs.replaceAll('"','')+'"';
}
function executar(nome,args){
 const resultado=spawnSync(nome,args,{encoding:'utf8',timeout:20000,windowsHide:true});
 if(resultado.error||resultado.status!==0)throw new Error(
   nome+' falhou: '+(resultado.error?.message||resultado.stderr||resultado.status).slice(0,500));
}
function instalar(){
 if(process.platform!=='win32'||process.env.USERNAME?.toLowerCase()!=='as')
  throw new Error('Instalação autorizada somente no perfil Windows AS.');
 const sys=process.env.SystemRoot||'C:\\Windows';
 const keygen=join(sys,'System32','OpenSSH','ssh-keygen.exe');
 const ssh=join(sys,'System32','OpenSSH','ssh.exe');
 if(!existsSync(keygen)||!existsSync(ssh))
  throw new Error('OpenSSH Client não instalado no Windows.');
 mkdirSync(PASTA_DADOS,{recursive:true});
 if(!existsSync(ARQUIVO_CHAVE)){
  executar(keygen,['-q','-t','ed25519','-C','SitesADS-Teste','-N','','-f',ARQUIVO_CHAVE]);
 }
 const perfil=(process.env.USERDOMAIN?process.env.USERDOMAIN+'\\':'')+process.env.USERNAME;
 executar('icacls.exe',[ARQUIVO_CHAVE,'/inheritance:r','/grant:r',perfil+':(R)']);
 const launcher=join(dirname(fileURLToPath(import.meta.url)),'iniciar-tunel-estavel-oculto.vbs');
 if(!existsSync(launcher))throw new Error('Lançador .vbs ausente no repositório.');
 const comando=comandoInicializacao(launcher);
 executar('reg.exe',['add',
   'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
   '/v','SitesADS-Teste-AS','/t','REG_SZ','/d',comando,'/f']);
 console.log('INSTALACAO_PREPARADA_USUARIO_AS');
 console.log('Banco e contas existentes serão mantidos no SQLite local.');
 console.log('Requer iniciar o lançador após encerrar o supervisor Cloudflare antigo.');
 console.log('CHAVE_SSH_GERADA_LOCALMENTE_SEM_ENVIO');
}
if(process.argv.includes('--instalar')){
 try{instalar()}catch(e){console.error('FALHA_INSTALACAO '+e.message);process.exitCode=1}
}
