// Sincronizado de compartilhado/scripts/armazenamento/importar-cópia-local.js — edite a origem e rode "npm run sincronizar" na raiz.
// Importa uma cópia de segurança. Aceita somente o esquema e a versão deste produto,
// coleções conhecidas e registros aprovados pelo validador de cada coleção.
// Dados importados nunca alteram configuração de Pix, publicidade ou consentimento.
import { analisarJsonSeguro } from './analisar-json-seguro.js';
import { criarArmazenamento } from './criar-armazenamento.js';
import { VERSÃO_DA_CÓPIA_LOCAL } from './exportar-cópia-local.js';
import { LIMITE_DE_REGISTROS_POR_COLEÇÃO, listarRegistrosLocais } from './listar-registros-locais.js';

function éObjetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

export function importarCópiaLocal(texto, { coleçõesLocais, armazenamento = criarArmazenamento(), modo = 'mesclar' } = {}) {
  if (!armazenamento.disponível) return { válido: false, erro: 'O navegador não permite salvar dados neste aparelho.' };
  const analisado = analisarJsonSeguro(texto, { tamanhoMáximo: 2_000_000, profundidadeMáxima: 12 });
  if (!analisado.válido) return { válido: false, erro: analisado.erro };
  const cópia = analisado.dados;
  if (!éObjetoSimples(cópia) || cópia.esquema !== `${armazenamento.prefixo}.cópia-local`) {
    return { válido: false, erro: 'Este arquivo não é uma cópia deste site.' };
  }
  if (cópia.versão !== VERSÃO_DA_CÓPIA_LOCAL) return { válido: false, erro: 'Versão de cópia não suportada.' };
  if (!éObjetoSimples(cópia.coleções)) return { válido: false, erro: 'A cópia não contém coleções.' };

  const conhecidas = new Map(coleçõesLocais.map((coleção) => [coleção.chave, coleção]));
  let importados = 0;
  let rejeitados = 0;
  const pendentes = [];

  for (const [chave, registros] of Object.entries(cópia.coleções)) {
    const coleção = conhecidas.get(chave);
    if (!coleção || !Array.isArray(registros)) {
      rejeitados += Array.isArray(registros) ? registros.length : 1;
      continue;
    }
    const aceitos = [];
    for (const registro of registros.slice(0, LIMITE_DE_REGISTROS_POR_COLEÇÃO)) {
      const válido =
        éObjetoSimples(registro) &&
        typeof registro.id === 'string' &&
        registro.id.length > 0 &&
        registro.id.length <= 100 &&
        (() => {
          try {
            return coleção.validar(registro) === true;
          } catch {
            return false;
          }
        })();
      if (válido) aceitos.push(registro);
      else rejeitados += 1;
    }
    rejeitados += Math.max(0, registros.length - LIMITE_DE_REGISTROS_POR_COLEÇÃO);

    const atuais = modo === 'substituir' ? [] : listarRegistrosLocais(chave, { armazenamento });
    const porId = new Map(atuais.map((registro) => [registro.id, registro]));
    for (const registro of aceitos) porId.set(registro.id, registro);
    const combinados = [...porId.values()].slice(0, LIMITE_DE_REGISTROS_POR_COLEÇÃO);
    pendentes.push([chave, combinados]);
    importados += aceitos.length;
  }

  for (const [chave, registros] of pendentes) {
    if (!armazenamento.gravar(`coleção:${chave}`, registros)) {
      return { válido: false, erro: 'Não foi possível gravar a cópia: o espaço do navegador pode estar cheio.' };
    }
  }
  return { válido: true, importados, rejeitados };
}
