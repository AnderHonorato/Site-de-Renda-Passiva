/**
 * Servidor de testes Sites ADS com domínio HTTPS estável no tunnl.gg gratuito.
 * O portal e a API continuam privados em loopback; apenas o túnel SSH sai para a internet.
 * É um ambiente de TESTE, não hospedagem de produção.
 *
 * Instalar uma vez: node ferramentas/configurar-tunel-estavel.mjs --instalar
 */
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {
  existsSync,mkdirSync,readFileSync,writeFileSync,appendFileSync,statSync
} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const PASTA_PORTAL=join(dirname(fileURLToPath(import.meta.url)),'..');
export const PASTA_DADOS=join(process.env.LOCALAPPDATA||join(PASTA_PORTAL,'.execucao'),'SitesAdsTeste');
export const ARQUIVO_CHAVE=join(PASTA_DADOS,'chave-ssh-tunnl');
export const PORTA_WEB=4418,PORTA_API=4888;
const raiz=PASTA_PORTAL, dados=PASTA_DADOS;
const arquivoEstado=join(dados,'estado.json');
const arquivoEndereco=join(dados,'endereco-atual.txt');
const arquivoLog=join(dados,'logs','tunnel-estavel.log');
const arquivoChave=process.env.SITES_ADS_CHAVE_TUNEL||ARQUIVO_CHAVE;
const node=process.execPath;
const ssh=process.platform==='win32'
  ?join(process.env.SystemRoot||'C:\\Windows','System32','OpenSSH','ssh.exe')
  :'ssh';

export function extrairEnderecoEstavel(saida) {
  if(typeof saida!=='string')return null;
  // json ou banner do serviço; nenhum outro domínio é permitido.
  const urls=saida.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.tunnl\.gg(?![a-z0-9._-])/ig)||[];
  return urls.length?urls[0].toLowerCase():null;
}
export function variaveisDeServidor(endereco,base=process.env) {
  const url=extrairEnderecoEstavel(endereco);
  if(!url||url!==endereco)
    throw new Error('O endereço externo deve ser um URL HTTPS tunnl.gg válido.');
  return {
    ...base,NODE_ENV:'production',URL_PUBLICA:url,
    PORTAL_BANCO:base.PORTAL_BANCO||join(dados,'portal.sqlite'),
    PORTAL_API_PORTA:String(PORTA_API),
    PORTAL_CHAT_PUBLICO:'0',PORTAL_CHAT_LOCAL:'0',
    PORTAL_ADS_ATIVO:'0',PORTAL_ADS_TESTE:'0',PORTAL_PROXY_CONFIAVEL:'0'
  };
}
const pausa=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let encerrar=false;
let sshProcess=null,apiProcess=null,webProcess=null;
let hostnameAtual='';
function registrar(mensagem) {
  try{
    if(existsSync(arquivoLog)&&statSync(arquivoLog).size>1200000)
      writeFileSync(arquivoLog,readFileSync(arquivoLog,'utf8').slice(-450000),'utf8');
    appendFileSync(arquivoLog,new Date().toISOString()+' '+String(mensagem).slice(0,800)+'\n');
  }catch{}
}
function estado(fase,extra={}) {
  try{
    writeFileSync(arquivoEstado,JSON.stringify({
      fase,...extra,pc:process.env.USERNAME||'servidor',
      provedor:'tunnl.gg',atualizadoEm:new Date().toISOString()
    },null,2),'utf8');
  }catch(e){registrar('Erro gravando estado: '+e.message)}
}
function iniciar(nome,executavel,args,ambiente=process.env){
  const processo=spawn(executavel,args,{cwd:raiz,env:ambiente,
    stdio:['ignore','pipe','pipe'],windowsHide:true});
  processo.on('error',erro=>registrar(nome+' falhou: '+erro.message));
  processo.on('exit',(codigo,sinal)=>registrar(nome+' encerrou: '+codigo+'/'+sinal));
  // As saídas do túnel podem conter URL e registros de requisições.
  // Não logar caminhos com parâmetros, cabeçalhos ou corpos recebidos.
  if(nome!=='TUNNEL')for(const canal of [processo.stdout,processo.stderr])
    canal?.on('data',conteudo=>{
      const frase=String(conteudo).slice(0,500);
      if(frase.includes('Portal API em ')||frase.includes('Servindo '))
        registrar(nome+' pronto');
    });
  return processo;
}
function terminou(processo){
  return !processo||processo.exitCode!==null||processo.signalCode!==null;
}
function terminar(processo){
  try{if(processo&&!terminou(processo))processo.kill()}catch{}
}
async function saude(){
  for(let tentativa=0;tentativa<20&&!encerrar;tentativa++){
    try{
      const resposta=await fetch('http://127.0.0.1:'+PORTA_WEB+'/api/saude',{
        signal:AbortSignal.timeout(3500),cache:'no-store'
      });
      if(resposta.ok&&(await resposta.json()).estado==='ok')return true;
    }catch{}
    await pausa(1200);
  }
  return false;
}
function reabrirAplicacoes(endereco){
  const env=variaveisDeServidor(endereco);
  terminar(apiProcess);terminar(webProcess);
  apiProcess=iniciar('API',node,[join(raiz,'servidor','iniciar.mjs')],env);
  webProcess=iniciar('WEB',node,[
    join(raiz,'ferramentas','servir.mjs'),raiz,'--porta',String(PORTA_WEB),'--loopback'
  ],env);
}
async function abrirTunel(){
  const argumentos=[
    '-n','-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=accept-new',
    '-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3',
    '-o','ExitOnForwardFailure=yes','-o','IdentitiesOnly=yes',
    '-i',arquivoChave,'-R','80:127.0.0.1:'+PORTA_WEB,
    'stable@proxy.tunnl.gg','output=json'
  ];
  const processo=iniciar('TUNNEL',ssh,argumentos);
  sshProcess=processo;
  let buffer='',url=null;
  const capturar=bytes=>{
    buffer=(buffer+String(bytes)).slice(-8192);
    const achado=extrairEnderecoEstavel(buffer);
    if(achado)url=achado;
  };
  processo.stdout?.on('data',capturar);
  processo.stderr?.on('data',capturar);
  for(let tentativas=0;tentativas<65&&!encerrar;tentativas++){
    if(url)return url;
    if(terminou(processo))break;
    await pausa(1000);
  }
  terminar(processo);
  throw new Error('O túnel SSH não retornou endereço HTTPS estável. Consulte logs e conectividade SSH.');
}
async function gerenciar(){
  if(!existsSync(arquivoChave))
    throw new Error('Chave SSH ausente. Execute configurar-tunel-estavel.mjs --instalar no usuário AS.');
  mkdirSync(join(dados,'logs'),{recursive:true});
  estado('iniciando');
  while(!encerrar){
    try{
      estado('conectando',{url:hostnameAtual||undefined});
      const url=await abrirTunel();
      if(hostnameAtual&&hostnameAtual!==url){
        registrar('O hostname mudou; reiniciando API com a origem HTTPS correta.');
        reabrirAplicacoes(url);
      }else if(terminou(apiProcess)||terminou(webProcess)){
        reabrirAplicacoes(url);
      }
      hostnameAtual=url;
      if(!(await saude())){
        reabrirAplicacoes(url);
        if(!(await saude()))throw new Error('API ou site não responde em loopback.');
      }
      writeFileSync(arquivoEndereco,url+'\n','utf8');
      estado('online',{url,sitePorta:PORTA_WEB,apiPorta:PORTA_API,
        banco:'SQLite de testes persistente'});
      registrar('Túnel estabelecido no endereço estável '+url);
      while(!encerrar&&!terminou(sshProcess)){
        if(terminou(apiProcess)){
          registrar('Recuperando somente API sem renovar túnel.');
          apiProcess=iniciar('API',node,[join(raiz,'servidor','iniciar.mjs')],variaveisDeServidor(url));
        }
        if(terminou(webProcess)){
          registrar('Recuperando somente site sem renovar túnel.');
          webProcess=iniciar('WEB',node,[
            join(raiz,'ferramentas','servir.mjs'),raiz,'--porta',String(PORTA_WEB),'--loopback'
          ],variaveisDeServidor(url));
        }
        await pausa(1400);
      }
      registrar('Túnel desconectado; será reconectado com a mesma chave.');
    }catch(e){
      registrar('Falha na conexão: '+e.message);
      estado('reconectando',{url:hostnameAtual||undefined});
    }
    terminar(sshProcess);
    if(!encerrar)await pausa(6000);
  }
}
function fechar(){
  encerrar=true;terminar(sshProcess);terminar(apiProcess);terminar(webProcess);
}
if(process.argv[1]&&fileURLToPath(import.meta.url).toLowerCase()===process.argv[1].toLowerCase()){
  if(process.platform!=='win32'){
    console.error('Supervisor de testes preparado para o Windows AS.');
    process.exitCode=2;
  }else{
    mkdirSync(join(dados,'logs'),{recursive:true});
    const lock=createServer();
    lock.on('error',e=>{
      registrar('Supervisor duplicado não iniciado: '+e.code);
      process.exit(0);
    });
    lock.listen('\\\\.\\pipe\\sites_ads_tunel_estavel_as',()=>{
      registrar('Supervisor de túnel estável iniciado em segundo plano.');
      void gerenciar().catch(e=>{registrar('Erro fatal: '+e.message);process.exitCode=1});
    });
    process.on('SIGTERM',fechar);
    process.on('SIGINT',fechar);
  }
}
