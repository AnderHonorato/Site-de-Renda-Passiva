import * as h from './helpers.js';

export default h.tool("formatador-de-json",13,"Formatador de JSON","Valide e formate JSON sem executar código.","Validação sintática com JSON.parse. Recuo de 2 ou 4 espaços, ou saída compacta. Chaves duplicadas e números muito grandes seguem semântica JavaScript; não usar para preservar representação exata desses dados.",[h.texto('json','JSON','{"a":1}'),h.escolha('recuo','Formato',[['2','2 espaços'],['4','4 espaços'],['0','Compacto']])],async d=>{const s=h.requerido(d.json,'JSON',1000000);h.opcao(d.recuo,['0','2','4']);let value;try{value=JSON.parse(s);}catch(e){throw new Error('JSON inválido: '+e.message);}const output=JSON.stringify(value,null,Number(d.recuo));return {...h.resultado(output,'JSON sintaticamente válido.'),arquivo:h.arquivo('formatado.json',output,'application/json')};});


