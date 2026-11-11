/** Sincronização apenas do endereço HTTPS público de teste; nunca publica credenciais. */
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {existsSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {PASTA_DADOS} from './servidor-tunel-estavel.mjs';

const GIST_ID='a888f4b63bc461e46552e3b651f1102e';
const status=join(PASTA_DADOS,'estado.json');
const urlFile=join(PASTA_DADOS,'endereco-atual.txt');
const destino=join(PASTA_DADOS,'endereco-teste.json');
const log=join(PASTA_DADOS,'logs','link-publico.log');
const ghLocal=join(process.env.LOCALAPPDATA||'',
 'Microsoft','WinGet','Packages',
 'GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe','bin','gh.exe');
const gh=existsSync(ghLocal)?ghLocal:'gh';
let ocupado=false,ultimo='';
function escrever(mensagem){
 try{appendFileSync(log,new Date().toISOString()+' '+String(mensagem).slice(0,450)+'\n');}catch{}
}
function publicar(url){
 return new Promise((resolve,reject)=>{
   const proc=spawn(gh,['gist','edit',GIST_ID,'--filename','endereco-teste.json',destino],{
     stdio:'ignore',windowsHide:true
   });
   const kill=setTimeout(()=>{proc.kill();reject(new Error('GitHub expirou em 25s'));},25000);
   proc.once('error',e=>{clearTimeout(kill);reject(e)});
   proc.once('exit',code=>{clearTimeout(kill);code===0?resolve():reject(new Error('GitHub status '+code))});
 });
}
async function sincronizar(){
 if(ocupado)return;
 let url;
 try{
   const state=JSON.parse(readFileSync(status,'utf8'));
   url=readFileSync(urlFile,'utf8').trim();
   if(state.fase!=='online'||state.url!==url)return;
   const parsed=new URL(url);
   if(parsed.protocol!=='https:'||parsed.pathname!=='/'||
      parsed.search||parsed.hash||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*\.tunnl\.gg$/.test(parsed.hostname))return;
   if(url===ultimo)return;
 }catch{return;}
 ocupado=true;
 try{
   writeFileSync(destino,JSON.stringify({
     url,updatedAt:new Date().toISOString(),environment:'teste',provider:'tunnl.gg'
   },null,2)+'\n','utf8');
   await publicar(url);
   ultimo=url;
   escrever('ENDERECO_ESTAVEL_SINCRONIZADO '+url);
 }catch(e){escrever('ERRO_ATUALIZACAO_GIST '+e.message)}
 finally{ocupado=false}
}
if(process.argv[1]&&process.argv[1].toLowerCase().endsWith('sincronizar-url-publica.mjs')){
 const server=createServer();
 server.on('error',()=>process.exit(0));
 server.listen('\\\\.\\pipe\\sites_ads_gist_estavel_as',()=>{
   void sincronizar();
   setInterval(()=>void sincronizar(),20000);
 });
}
