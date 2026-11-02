import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,arquivoTexto,saidaTexto,data,iso,palavras} from './comum.js';
export default definir("limpar-espacos",7,"Limpar espaços","Remova espaços repetidos com opção de preservar parágrafos.","Preservar parágrafos mantém quebras de linha; espaços horizontais consecutivos viram um.",[T('texto','Texto','Bom   dia'),C('paragrafos','Preservar parágrafos',true)],async d=>{const s=texto(d,'texto');return saidaTexto(d.paragrafos?s.split(/\r?\n/).map(l=>l.replace(/[^\S\r\n]+/g,' ').trim()).join('\n'):s.replace(/\s+/g,' ').trim());});

