/** Apresentação pública de amostras fixas; não importa motores nem executa análises. */
import { escapar } from './texto.js';
import { ícone } from './ícones.js';

const numeros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
export const formatoDemo = v => v === null || v === undefined ? '—' : typeof v === 'number'
  ? (v !== 0 && Math.abs(v) < 0.000001 ? v.toExponential(2) : numeros.format(v))
  : String(v);
const formatos = { xlsx: 'Excel', txt: 'TXT', pdf: 'PDF', csv: 'CSV', json: 'JSON', svg: 'SVG', png: 'PNG', baixar: 'Arquivo', imprimir: 'Impressão' };

function tabela({ colunas = [], linhas = [] } = {}) {
  if (!colunas.length) return '';
  return `<div class="demonstracao__tabela"><table><thead><tr>${colunas.map(c => `<th scope="col">${escapar(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${colunas.map((_, i) => `<td>${escapar(formatoDemo(l[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function htmlDemonstracao(demo, { id = 'demonstracao-ferramenta' } = {}) {
  const calculado = demo.tipo === 'calculado';
  const indicadores = `<dl class="demonstracao__indicadores">${demo.indicadores.map(([k, v]) => `<div><dt>${escapar(k)}</dt><dd>${escapar(formatoDemo(v))}</dd></div>`).join('')}</dl>`;
  const resultado = tabela(demo.tabela);
  const entrada = demo.entrada.colunas?.length
    ? tabela({ colunas: demo.entrada.colunas, linhas: demo.entrada.linhas })
    : `<pre>${escapar(demo.entrada.texto || demo.entrada.rotulo)}</pre>`;
  return `<section class="demonstracao" id="${escapar(id)}" data-demonstracao aria-labelledby="${escapar(id)}-titulo">
    <div class="demonstracao__cabecalho"><div><p class="demonstracao__rotulo">${ícone('estrela')} Demonstração animada</p><h2 id="${escapar(id)}-titulo">Veja o que esta ferramenta entrega</h2><p>Em 15 segundos, veja o exemplo virar um resultado para revisar e exportar.</p></div><span class="insígnia-plano insígnia-plano--${demo.plano}">${demo.plano === 'premium' ? 'Premium' : 'Plus'}</span></div>
    <div class="demonstracao__palco">
      <div class="demonstracao__estatico"><p class="rótulo">${escapar(demo.nome)}</p>${indicadores}${resultado}</div>
      <canvas role="img" aria-label="${escapar(`Demonstração de ${demo.nome}: dados fictícios e ${calculado ? 'resultado calculado do exemplo' : 'ilustração do fluxo'}. Os dados também estão disponíveis em texto abaixo.`)}" aria-describedby="${escapar(id)}-resumo"></canvas>
    </div>
    <div class="demonstracao__controles" hidden>
      <button type="button" class="botão botão--linha" data-demo-tocar aria-label="Pausar demonstração">${ícone('pausar')}<span>Pausar</span></button>
      <button type="button" class="ícone-botão" data-demo-repetir aria-label="Rever demonstração">${ícone('repetir')}</button>
      <label class="demonstracao__tempo"><span class="demonstracao__sr">Posição da demonstração</span><input type="range" min="0" max="15" step="0.1" value="0" aria-label="Posição da demonstração"><output>0:00 / 0:15</output></label>
    </div>
    <div class="demonstracao__etapas" hidden aria-label="Cenas da demonstração"><button type="button" data-demo-cena="1.8" aria-pressed="true">01 · Dados</button><button type="button" data-demo-cena="6" aria-pressed="false">02 · Análise</button><button type="button" data-demo-cena="12" aria-pressed="false">03 · Resultado</button></div>
    <p class="demonstracao__nota" id="${escapar(id)}-resumo">${calculado ? 'Dados fictícios · saída calculada do exemplo. Valores na animação podem estar abreviados; confira os detalhes em texto.' : 'Ilustração do fluxo com dados fictícios.'} Analisar seus arquivos exige o plano indicado.</p>
    <details class="demonstracao__dados"><summary>Ver os dados e o resultado em texto</summary><h3>Trecho da entrada</h3>${entrada}<h3>Recorte do resultado</h3>${indicadores}${resultado}${demo.series.length ? `<h3>Dados do gráfico</h3>${tabela({colunas:[demo.medida||'Item','Valor'],linhas:demo.series.map(s=>[s.rotulo,s.valor])})}` : ''}<p>${escapar(demo.metodo)}</p>${demo.notas?.length ? `<ul>${demo.notas.map(n => `<li>${escapar(n)}</li>`).join('')}</ul>` : ''}</details>
    <div class="demonstracao__formatos" aria-label="Formatos disponíveis na ferramenta">${demo.exporta.map(f => `<span>${escapar(formatos[f] || f)}</span>`).join('')}</div>
    <template data-demonstracao-dados>${escapar(JSON.stringify(demo))}</template>
  </section>`;
}
