/** Motor roda em Worker separado. O chamador pode interromper via terminate(). */
import { formatarComBiblioteca } from '../../terceiros/formatadores.js';
import { validarFormato } from './formatador-regras.js';
self.addEventListener('message', async (evento) => {
  try {
    const dados = validarFormato(evento.data);
    const resultado = await formatarComBiblioteca(dados);
    if (resultado.length > 250000) throw new Error('Saída excedeu 250 mil caracteres.');
    self.postMessage({ok:true,resultado});
  } catch(e) {
    self.postMessage({ok:false,erro:{
      mensagem: String(e?.message??'Erro ao formatar código.').slice(0,450),
      campo: e?.campo??'codigo',
    }});
  }
});
