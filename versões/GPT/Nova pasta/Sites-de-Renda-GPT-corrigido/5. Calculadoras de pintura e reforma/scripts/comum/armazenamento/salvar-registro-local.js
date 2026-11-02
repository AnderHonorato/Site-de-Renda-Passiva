// Sincronizado de compartilhado/scripts/armazenamento/salvar-registro-local.js — edite a origem e rode "npm run sincronizar" na raiz.
// Cria ou atualiza um registro em uma coleção local.
// Retorna { salvo: true, registro } ou { salvo: false, erro }.
import { criarArmazenamento } from './criar-armazenamento.js';
import { gerarIdentificador } from './gerar-identificador.js';
import { LIMITE_DE_REGISTROS_POR_COLEÇÃO, listarRegistrosLocais } from './listar-registros-locais.js';

export function salvarRegistroLocal(coleção, registro, { armazenamento = criarArmazenamento(), agora = new Date() } = {}) {
  if (!armazenamento.disponível) {
    return { salvo: false, erro: 'O navegador não permite salvar dados neste aparelho (modo privado ou bloqueio). A ferramenta continua funcionando sem salvar.' };
  }
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) return { salvo: false, erro: 'Registro inválido.' };

  const registros = listarRegistrosLocais(coleção, { armazenamento });
  const momento = agora.toISOString();
  const índice = typeof registro.id === 'string' ? registros.findIndex((existente) => existente.id === registro.id) : -1;
  let salvo;
  if (índice >= 0) {
    salvo = { ...registro, id: registros[índice].id, criadoEm: registros[índice].criadoEm ?? momento, atualizadoEm: momento };
    registros[índice] = salvo;
  } else {
    if (registros.length >= LIMITE_DE_REGISTROS_POR_COLEÇÃO) {
      return { salvo: false, erro: `Limite de ${LIMITE_DE_REGISTROS_POR_COLEÇÃO} itens atingido. Exclua itens antigos ou exporte uma cópia.` };
    }
    salvo = { ...registro, id: gerarIdentificador(), criadoEm: momento, atualizadoEm: momento };
    registros.push(salvo);
  }
  if (!armazenamento.gravar(`coleção:${coleção}`, registros)) {
    return { salvo: false, erro: 'Não foi possível salvar: o espaço do navegador pode estar cheio.' };
  }
  return { salvo: true, registro: salvo };
}
