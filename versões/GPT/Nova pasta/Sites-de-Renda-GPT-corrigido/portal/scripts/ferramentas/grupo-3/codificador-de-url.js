import * as h from './helpers.js';

export default h.tool("codificador-de-url",13,"Codificador de URL","Codifique ou decodifique um componente de URL.","Usa encodeURIComponent/decodeURIComponent em UTF-8. Este recurso opera sobre componentes, não sobre o endereço completo. Sinal + permanece literal na decodificação.",[h.texto('texto','Componente','ação útil'),h.escolha('modo','Operação',[['codificar','Codificar'],['decodificar','Decodificar']])],async d=>{const s=h.requerido(d.texto);h.opcao(d.modo,['codificar','decodificar']);try{return h.resultado(d.modo==='codificar'?encodeURIComponent(s):decodeURIComponent(s),'Transformação local de componente URL em UTF-8.');}catch{throw new Error('Componente inválido: confira sequências % e caracteres Unicode.');}});


