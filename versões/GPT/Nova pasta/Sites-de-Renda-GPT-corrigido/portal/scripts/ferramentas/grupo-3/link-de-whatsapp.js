import * as h from './helpers.js';

export default h.tool("link-de-whatsapp",13,"Link de WhatsApp","Monte um link com mensagem sem enviar automaticamente.","Número internacional com código do país (exemplo Brasil: 55), DDD e telefone. Remove espaços, parênteses e traços; valida de 8 a 15 dígitos, sem prometer existência da conta.",[h.texto('telefone','Telefone com país e DDD','5511999999999','text'),h.texto('mensagem','Mensagem','Olá! Gostaria de mais informações.')],async d=>{const raw=h.requerido(d.telefone,'Telefone',50).trim();if(!/^\+?[\d\s()-]+$/.test(raw))throw new Error('Telefone deve conter apenas dígitos, espaços, parênteses ou traços.');const t=raw.replace(/\D/g,'');if(!/^[1-9]\d{7,14}$/.test(t))throw new Error('Informe de 8 a 15 dígitos, incluindo código do país e DDD.');const msg=h.requerido(d.mensagem,'Mensagem',10000);return h.resultado('https://wa.me/'+t+'?text='+encodeURIComponent(msg),'O link não envia a mensagem automaticamente.');});


