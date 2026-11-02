import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,arquivoTexto,saidaTexto,data,iso,palavras} from './comum.js';
export default definir("somar-dias-a-data",10,"Somar dias a uma data","Avance ou recue um número de dias civis.","Soma no calendário gregoriano; não aplica regras de prazos jurídicos.",[D('data','Data','2026-02-28'),N('dias','Dias (negativo para subtrair)',1,-1000000,1000000)],async d=>{const a=data(d.data);a.setUTCDate(a.getUTCDate()+inteiro(d,'dias',-1000000,1000000));return {resumo:iso(a),linhas:['Resultado: '+a.toLocaleDateString('pt-BR',{timeZone:'UTC'})]};});

