// Sincronizado de compartilhado/scripts/configuração/carregar-configuração.js — edite a origem e rode "npm run sincronizar" na raiz.
// Lê a configuração pública publicada junto com o site, uma única vez por página.
// Em caso de falha, devolve a configuração vazia validada: apoio e publicidade ficam
// indisponíveis e as ferramentas continuam funcionando.
import { analisarJsonSeguro } from '../armazenamento/analisar-json-seguro.js';
import { validarConfiguração } from './validar-configuração.js';

let promessa = null;

export function carregarConfiguração() {
  if (!promessa) {
    promessa = (async () => {
      try {
        const endereço = new URL('../../../configurações/configuração-pública.json', import.meta.url);
        const resposta = await fetch(endereço, { cache: 'no-cache', credentials: 'same-origin' });
        if (!resposta.ok) throw new Error(`resposta ${resposta.status}`);
        const analisado = analisarJsonSeguro(await resposta.text(), { tamanhoMáximo: 100_000 });
        if (!analisado.válido) throw new Error(analisado.erro);
        return validarConfiguração(analisado.dados);
      } catch (erro) {
        const resultado = validarConfiguração({});
        resultado.problemas.push({ campo: 'arquivo', mensagem: `Não foi possível ler a configuração pública: ${erro.message}` });
        return resultado;
      }
    })();
  }
  return promessa;
}
