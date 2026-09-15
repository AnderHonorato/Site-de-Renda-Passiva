export const numero = (nome, rotulo, valor = 0, min = 0, max = 1e12) => ({ nome, rotulo, tipo: 'number', valor, min, max, passo: 'any', obrigatorio: true });
export const texto = (nome, rotulo, valor = '', tipo = 'textarea') => ({ nome, rotulo, tipo, valor, obrigatorio: true });
export const escolha = (nome, rotulo, opcoes, valor = opcoes[0][0]) => ({ nome, rotulo, tipo: 'select', valor, opcoes: opcoes.map(([valor, rotulo]) => ({ valor, rotulo })) });
export function n(valor, nome = 'Valor', min = -1e12, max = 1e12) {
  const s = String(valor ?? '').trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(s)) throw new Error(`${nome}: informe um número válido, sem separador de milhar.`);
  const x = Number(s.replace(',', '.'));
  if (!Number.isFinite(x) || x < min || x > max) throw new Error(`${nome}: valor fora do intervalo permitido (${min} a ${max}).`);
  return x;
}
export function inteiro(valor, nome, min = 0, max = 1e6) { const x = n(valor, nome, min, max); if (!Number.isSafeInteger(x)) throw new Error(`${nome}: use um número inteiro.`); return x; }
export function positivo(valor, nome) { const x = n(valor, nome, 0); if (!x) throw new Error(`${nome}: precisa ser maior que zero.`); return x; }
export function requerido(valor, nome = 'Texto', max = 1000000) { const s = String(valor ?? ''); if (!s.trim()) throw new Error(`${nome}: preencha este campo.`); if (s.length > max) throw new Error(`${nome}: limite de ${max} caracteres excedido.`); return s; }
export function opcao(valor, permitidas) { if (!permitidas.includes(valor)) throw new Error('Selecione uma opção válida.'); return valor; }
export const f = (x, casas = 4) => { if (!Number.isFinite(x)) throw new Error('O resultado excede o limite numérico.'); return new Intl.NumberFormat('pt-BR', Math.abs(x)>0 && Math.abs(x)<10**(-casas) ? {notation:'scientific',maximumSignificantDigits:6} : {maximumFractionDigits:casas}).format(Object.is(x,-0)?0:x); };
export const reais = x => { if (!Number.isFinite(x)) throw new Error('O resultado excede o limite numérico.'); return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(x); };
export const resultado = (resumo, ...linhas) => ({ resumo, linhas });
export function linhas(text, min = 1, max = 1000) { const a = requerido(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean); if (a.length < min || a.length > max) throw new Error(`Informe entre ${min} e ${max} linhas.`); return a; }
export function tabela(text, colunas) { return linhas(text).map((line, i) => { const parts = line.split(';').map(s => s.trim()); if (parts.length !== colunas || parts.some(s => !s)) throw new Error(`Linha ${i + 1}: use ${colunas} colunas separadas por ponto e vírgula.`); return parts; }); }
export function numeros(text, min = 1) { return linhas(text, min).map((v, i) => n(v, `Linha ${i + 1}`)); }
export const soma = a => a.reduce((s, x) => s + x, 0);
export const arquivo = (nome, conteudo, tipo = 'text/plain;charset=utf-8') => ({ nome, blob: new Blob([conteudo], { type: tipo }) });
export function csv(linhas) { return '\uFEFF' + linhas.map(l => l.map(v => { let s = String(v); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }).join(';')).join('\r\n'); }
export function tool(id, categoria, titulo, descricao, metodologia, campos, executar) {
  return { id, categoria, titulo, descricao, metodologia, campos, executar: async dados => {
    for (const campo of campos) if (campo.tipo === 'number') n(dados[campo.nome], campo.rotulo, campo.min ?? -1e12, campo.max ?? 1e12);
    return executar(dados);
  } };
}
export function ratear(total, pesos) {
  const t = Math.round(total * 100), sum = soma(pesos);
  if (sum <= 0) throw new Error('A soma dos pesos precisa ser maior que zero.');
  const raw = pesos.map(p => t * p / sum), values = raw.map(Math.floor);
  const ordem = raw.map((x, i) => ({ i, resto: x - values[i] })).sort((a, b) => b.resto - a.resto);
  const faltam = t - soma(values);
  for (let i = 0; i < faltam; i++) values[ordem[i % ordem.length].i]++;
  return values.map(x => x / 100);
}
export function cryptoSeguro() { if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) throw new Error('Este recurso requer navegador com criptografia segura em HTTPS ou localhost.'); return globalThis.crypto; }
export function aleatorio(max) { const c = cryptoSeguro(), a = new Uint32Array(1), limite = Math.floor(4294967296 / max) * max; do { c.getRandomValues(a); } while (a[0] >= limite); return a[0] % max; }
export function urlWeb(valor) { let u; try { u = new URL(requerido(valor, 'URL', 16000)); } catch { throw new Error('Informe uma URL completa válida, começando com https:// ou http://.'); } if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Use uma URL HTTP(S) sem credenciais.'); return u; }

