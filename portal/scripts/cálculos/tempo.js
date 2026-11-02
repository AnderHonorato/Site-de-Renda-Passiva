/**
 * Cálculos de data e hora.
 *
 * Datas são tratadas como data civil (ano, mês, dia) em UTC interno, nunca como
 * instante local: assim o horário de verão e o fuso do aparelho não mudam a
 * contagem de dias, que é o erro clássico destas ferramentas.
 */

const DIA_EM_MS = 86400000;
const DIAS_DA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/**
 * Converte "AAAA-MM-DD" em data civil.
 * @param {string} texto
 * @returns {Date}
 */
export function lerData(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? '').trim());
  if (!partes) throw new Error('Informe a data no formato dia/mês/ano.');
  const [, ano, mês, dia] = partes.map(Number);
  const data = new Date(Date.UTC(ano, mês - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mês - 1 || data.getUTCDate() !== dia) {
    throw new Error('Esta data não existe no calendário.');
  }
  return data;
}

/** Formata uma data civil como dd/mm/aaaa. */
export function formatarData(data) {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mês = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mês}/${data.getUTCFullYear()}`;
}

/** Nome do dia da semana de uma data civil. */
export function diaDaSemana(data) {
  return DIAS_DA_SEMANA[data.getUTCDay()];
}

/**
 * Soma meses a uma data civil, limitando o dia ao tamanho do mês de destino.
 *
 * 31 de janeiro mais um mês é 28 de fevereiro, não 3 de março: é assim que se
 * conta prazo e idade.
 * @param {Date} data
 * @param {number} meses
 * @returns {Date}
 */
function somarMeses(data, meses) {
  const ano = data.getUTCFullYear();
  const mês = data.getUTCMonth() + meses;
  const diasDoMêsDestino = new Date(Date.UTC(ano, mês + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mês, Math.min(data.getUTCDate(), diasDoMêsDestino)));
}

/**
 * Diferença entre duas datas, em várias unidades.
 *
 * `anos`, `meses` e `restoDeDias` são sempre grandezas positivas e formam uma
 * decomposição válida: "1 mês e 1 dia", nunca "1 mês e −2 dias". O sentido da
 * contagem fica em `dias` (com sinal) e em `invertido`.
 *
 * @param {Date} inicial
 * @param {Date} final
 * @returns {{dias: number, invertido: boolean, semanas: number, anos: number, meses: number, restoDeDias: number}}
 */
export function diferençaEntreDatas(inicial, final) {
  const dias = Math.round((final - inicial) / DIA_EM_MS);
  const [menor, maior] = dias < 0 ? [final, inicial] : [inicial, final];

  let anos = maior.getUTCFullYear() - menor.getUTCFullYear();
  let meses = maior.getUTCMonth() - menor.getUTCMonth();
  // Se ainda não chegou no mesmo dia do mês, o último mês não completou.
  if (maior.getUTCDate() < menor.getUTCDate()) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }

  // O resto em dias é medido a partir da data já avançada em anos e meses.
  // Contar pela diferença bruta de dia do mês produz resto negativo quando o
  // dia inicial não existe no mês de destino — o defeito que isto corrige.
  const âncora = somarMeses(menor, anos * 12 + meses);
  const restoDeDias = Math.round((maior - âncora) / DIA_EM_MS);

  return {
    dias,
    invertido: dias < 0,
    semanas: Math.trunc(Math.abs(dias) / 7),
    anos,
    meses,
    restoDeDias,
  };
}

/**
 * Soma dias corridos ou úteis a uma data.
 * @param {Date} data
 * @param {number} dias pode ser negativo
 * @param {{úteis?: boolean, feriados?: string[]}} [opções] feriados em "AAAA-MM-DD"
 * @returns {Date}
 */
export function somarDias(data, dias, { úteis = false, feriados = [] } = {}) {
  if (!Number.isInteger(dias)) throw new Error('A quantidade de dias precisa ser inteira.');
  if (Math.abs(dias) > 36500) throw new Error('Limite de 100 anos por cálculo.');

  if (!úteis) return new Date(data.getTime() + dias * DIA_EM_MS);

  const bloqueados = new Set(feriados);
  const passo = dias < 0 ? -1 : 1;
  let restantes = Math.abs(dias);
  // Teto de segurança: mesmo com muitos feriados, 7 dias de calendário por dia
  // útil pedido é folga de sobra. Sem o teto, uma lista que bloqueie toda a
  // semana faria o laço girar para sempre.
  let passosRestantes = Math.abs(dias) * 7 + 400;
  let atual = new Date(data.getTime());
  while (restantes > 0) {
    if (passosRestantes-- <= 0) {
      throw new Error('Não foi possível encontrar dias úteis suficientes: confira a lista de feriados.');
    }
    atual = new Date(atual.getTime() + passo * DIA_EM_MS);
    const diaDaSemanaAtual = atual.getUTCDay();
    const fimDeSemana = diaDaSemanaAtual === 0 || diaDaSemanaAtual === 6;
    if (!fimDeSemana && !bloqueados.has(atual.toISOString().slice(0, 10))) restantes -= 1;
  }
  return atual;
}

/**
 * Conta dias úteis entre duas datas, incluindo a final.
 * @param {Date} inicial
 * @param {Date} final
 * @param {string[]} [feriados]
 * @returns {number}
 */
export function diasÚteisEntre(inicial, final, feriados = []) {
  if (final < inicial) return -diasÚteisEntre(final, inicial, feriados);
  const bloqueados = new Set(feriados);
  let total = 0;
  for (let t = inicial.getTime() + DIA_EM_MS; t <= final.getTime(); t += DIA_EM_MS) {
    const dia = new Date(t);
    const diaDaSemanaAtual = dia.getUTCDay();
    if (diaDaSemanaAtual === 0 || diaDaSemanaAtual === 6) continue;
    if (bloqueados.has(dia.toISOString().slice(0, 10))) continue;
    total += 1;
  }
  return total;
}

/**
 * Idade completa em anos, meses e dias.
 * @param {Date} nascimento
 * @param {Date} [referência]
 * @returns {{anos: number, meses: number, dias: number, totalDeDias: number}}
 */
export function idade(nascimento, referência = new Date(Date.UTC(
  new Date().getFullYear(), new Date().getMonth(), new Date().getDate(),
))) {
  if (nascimento > referência) throw new Error('A data de nascimento é posterior à data de referência.');
  const d = diferençaEntreDatas(nascimento, referência);
  return { anos: d.anos, meses: d.meses, dias: d.restoDeDias, totalDeDias: d.dias };
}

/* --------------------------------------------------------------- horas */

/**
 * Converte "HH:MM" em minutos desde a meia-noite.
 * @param {string} texto
 * @returns {number}
 */
export function lerHora(texto) {
  const partes = /^(\d{1,2}):?(\d{2})$/.exec(String(texto ?? '').trim());
  if (!partes) throw new Error('Informe o horário como HH:MM.');
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 47 || minutos > 59) throw new Error('Horário fora do intervalo.');
  return horas * 60 + minutos;
}

/**
 * Formata minutos como "HHhMM", aceitando valores negativos e acima de 24 h.
 * @param {number} minutos
 * @returns {string}
 */
export function formatarMinutos(minutos) {
  const sinal = minutos < 0 ? '−' : '';
  const absoluto = Math.abs(Math.round(minutos));
  return `${sinal}${Math.floor(absoluto / 60)}h${String(absoluto % 60).padStart(2, '0')}`;
}

/**
 * Calcula a jornada de um dia.
 *
 * Saída anterior à entrada significa virada de dia (turno da noite), não erro.
 * @param {{entrada: string, saída: string, intervaloMinutos?: number}} dia
 * @returns {number} minutos trabalhados
 */
export function jornadaDoDia({ entrada, saída, intervaloMinutos = 0 }) {
  const início = lerHora(entrada);
  let fim = lerHora(saída);
  if (fim < início) fim += 24 * 60;
  const trabalhados = fim - início - Math.max(0, intervaloMinutos);
  if (trabalhados < 0) throw new Error('O intervalo é maior que o tempo entre entrada e saída.');
  return trabalhados;
}
