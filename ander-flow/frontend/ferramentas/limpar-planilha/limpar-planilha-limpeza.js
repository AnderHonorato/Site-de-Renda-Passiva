// limpar-planilha-limpeza.js — funções puras da limpeza (etapa 2/3, sem DOM, testáveis no Node).
// Recebe {cabecalho, linhas} (arrays de strings) e opções; nunca altera os arrays originais.

const PADROES_COLUNA = {
  email: /e-?mail/i,
  cpf: /\bcpf\b/i,
  cnpj: /\bcnpj\b/i,
  telefone: /telefone|celular|\bfone\b|whats\s*app/i,
};

/** Espaços internos colapsados em um só e sem espaço nas pontas. Função pura. */
export function apararEspacosDoValor(valor) {
  if (typeof valor !== 'string') return valor;
  return valor.replace(/\s+/g, ' ').trim();
}

/** Minúsculas e sem espaço nas pontas (para colunas de e-mail). Função pura. */
export function normalizarEmail(valor) {
  if (typeof valor !== 'string') return valor;
  return valor.trim().toLowerCase();
}

/** Chave de comparação usada na detecção de duplicadas: minúsculas, sem espaço nas pontas. Função pura. */
export function chaveDeComparacao(valor) {
  return apararEspacosDoValor(String(valor ?? '')).toLowerCase();
}

/** `true` se todas as células da linha estiverem vazias (só espaço também conta como vazia). Função pura. */
export function linhaEstaVazia(linha) {
  return linha.every((celula) => String(celula ?? '').trim() === '');
}

/** Quantidade de células preenchidas (não vazias) da linha. Função pura. */
export function contarPreenchidos(linha) {
  return linha.reduce((total, celula) => (String(celula ?? '').trim() === '' ? total : total + 1), 0);
}

/**
 * Sugere colunas de duplicidade a partir do nome do cabeçalho (e-mail, CPF, CNPJ, telefone).
 * Devolve `[{ indice, nome, tipo }]`, na ordem do cabeçalho. Função pura.
 */
export function detectarColunasSugeridas(cabecalho) {
  const sugestoes = [];
  cabecalho.forEach((nome, indice) => {
    for (const [tipo, padrao] of Object.entries(PADROES_COLUNA)) {
      if (padrao.test(String(nome ?? ''))) {
        sugestoes.push({ indice, nome, tipo });
        break;
      }
    }
  });
  return sugestoes;
}

/** Tenta interpretar uma data em ISO (AAAA-MM-DD[...]) ou BR (DD/MM/AAAA); `null` se não conseguir. Função pura. */
export function interpretarData(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  const correspondenciaBr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto);
  if (correspondenciaBr) {
    const [, dia, mes, ano, hora = '0', minuto = '0', segundo = '0'] = correspondenciaBr;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
    return Number.isNaN(data.getTime()) ? null : data.getTime();
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data.getTime();
}

function construirChaveDuplicidade(linha, colunasDuplicidade) {
  return colunasDuplicidade.map((indice) => chaveDeComparacao(linha[indice])).join('');
}

function escolherIndiceVencedor(grupo, { qualLinhaFica, colunaData }) {
  if (qualLinhaFica === 'primeira') return grupo[0].indiceOriginal;

  if (qualLinhaFica === 'mais_completa') {
    let melhor = grupo[0];
    for (const item of grupo.slice(1)) {
      if (item.preenchidos > melhor.preenchidos) melhor = item;
    }
    return melhor.indiceOriginal;
  }

  // 'mais_recente': por coluna de data escolhida (a maior data válida) ou, sem coluna, a última ocorrência.
  if (Number.isInteger(colunaData)) {
    let melhor = grupo[0];
    let melhorData = interpretarData(melhor.linha[colunaData]);
    for (const item of grupo.slice(1)) {
      const data = interpretarData(item.linha[colunaData]);
      if (data !== null && (melhorData === null || data >= melhorData)) {
        melhor = item;
        melhorData = data;
      }
    }
    return melhor.indiceOriginal;
  }

  return grupo[grupo.length - 1].indiceOriginal;
}

/**
 * Limpa `{cabecalho, linhas}` conforme as opções da etapa "Configurar":
 * - `colunasDuplicidade`: índices das colunas que definem duplicada (vazio = nenhuma deduplicação).
 * - `qualLinhaFica`: `'primeira' | 'mais_recente' | 'mais_completa'`.
 * - `colunaData`: índice da coluna de data para `'mais_recente'` (opcional).
 * - `colunasEmail`: índices das colunas padronizadas em minúsculas (quando `padronizarEmail`).
 * - `padronizarEmail`, `apararEspacos`, `removerVazias`: booleanos.
 *
 * Devolve `{ cabecalho, linhas, linhasComStatus, total, totalFinal, totalVazias, totalDuplicadas }`.
 * `linhasComStatus` traz **todas** as linhas originais, na ordem original, com `{ linha, mantem, motivo }`
 * (a linha já com as transformações de texto aplicadas) — útil para a prévia da etapa "Revisar".
 * Função pura.
 */
export function limparPlanilha(
  { cabecalho, linhas },
  {
    colunasDuplicidade = [],
    qualLinhaFica = 'mais_recente',
    colunaData = null,
    colunasEmail = [],
    padronizarEmail = true,
    apararEspacos = true,
    removerVazias = true,
  } = {},
) {
  const colunasEmailConjunto = new Set(colunasEmail);

  const linhasTratadas = linhas.map((linhaOriginal) =>
    linhaOriginal.map((valor, indiceColuna) => {
      let novoValor = valor;
      if (apararEspacos) novoValor = apararEspacosDoValor(novoValor);
      if (padronizarEmail && colunasEmailConjunto.has(indiceColuna)) novoValor = normalizarEmail(novoValor);
      return novoValor;
    }),
  );

  const status = linhasTratadas.map((linha, indiceOriginal) => ({
    indiceOriginal,
    linha,
    mantem: true,
    motivo: null,
  }));

  let totalVazias = 0;
  if (removerVazias) {
    for (const item of status) {
      if (linhaEstaVazia(item.linha)) {
        item.mantem = false;
        item.motivo = 'vazia';
        totalVazias += 1;
      }
    }
  }

  let totalDuplicadas = 0;
  if (colunasDuplicidade.length > 0) {
    const grupos = new Map();
    for (const item of status) {
      if (!item.mantem) continue; // já removida por estar vazia
      const chave = construirChaveDuplicidade(item.linha, colunasDuplicidade);
      const grupo = grupos.get(chave) ?? [];
      grupo.push({ ...item, preenchidos: contarPreenchidos(item.linha) });
      grupos.set(chave, grupo);
    }

    for (const grupo of grupos.values()) {
      if (grupo.length < 2) continue;
      const indiceVencedor = escolherIndiceVencedor(grupo, { qualLinhaFica, colunaData });
      for (const itemGrupo of grupo) {
        if (itemGrupo.indiceOriginal !== indiceVencedor) {
          status[itemGrupo.indiceOriginal].mantem = false;
          status[itemGrupo.indiceOriginal].motivo = 'duplicada';
          totalDuplicadas += 1;
        }
      }
    }
  }

  const linhasFinais = status.filter((item) => item.mantem).map((item) => item.linha);

  return {
    cabecalho,
    linhas: linhasFinais,
    linhasComStatus: status,
    total: linhas.length,
    totalFinal: linhasFinais.length,
    totalVazias,
    totalDuplicadas,
  };
}
