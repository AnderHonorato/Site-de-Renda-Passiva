import * as h from './helpers.js';

export default h.tool("gerador-de-uuid",13,"Gerador de UUID","Gere identificadores UUID versão 4 localmente.","16 bytes obtidos com crypto.getRandomValues, com bits de versão 4 e variante RFC 9562 ajustados. Identificadores aleatórios, sem garantia matemática de unicidade.",[h.numero('quantidade','Quantidade de identificadores',5,1,100)],async d=>{const q=h.inteiro(d.quantidade,'Quantidade',1,100),crypto=h.cryptoSeguro(),a=[];for(let i=0;i<q;i++){const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const x=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');a.push(x.slice(0,8)+'-'+x.slice(8,12)+'-'+x.slice(12,16)+'-'+x.slice(16,20)+'-'+x.slice(20));}return {...h.resultado(q+' UUIDs gerados',...a),arquivo:h.arquivo('identificadores.txt',a.join('\n'))};});


