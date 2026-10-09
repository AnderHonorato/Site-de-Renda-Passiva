import { lerDadosTexto, tabelaParaTexto, LIMITES_IMPORTACAO } from '../../cálculos/importar-planilha.js';
import { decodificarTexto, recusarSeNãoForTexto } from '../../cálculos/converter-planilha.js';
import { criarLeitorXlsx } from './leitor-planilha.js';

export function ligarEtapasPlanilha(raiz) {
  const el = (tag, classe, texto) => { const n = document.createElement(tag);if (classe) n.className = classe;if (texto !== undefined) n.textContent = texto;return n; };
  const form = raiz.querySelector('#formulário'), campos = form.querySelector('.campos'), resultado = raiz.querySelector('#resultado');
  const conteudo = form.elements.conteúdo, arquivoInput = form.elements.arquivo;
  const fonte = { nome: '', aba: '', avisos: [] };
  let etapa = 1, liberada = 1, leitor, carregando = false, geracao = 0, abaAtual = 0, assinatura = '';
  raiz.classList.add('limpeza-etapas');
  const nav = el('nav', 'limpeza-etapas__nav');nav.setAttribute('aria-label', 'Etapas da limpeza');
  const botoes = ['Carregar', 'Configurar', 'Revisar', 'Baixar'].map((nome, i) => { const b = el('button', '', `${i+1}. ${nome}`);b.type = 'button';b.addEventListener('click', () => ir(i+1));nav.append(b);return b; });
  form.before(nav);
  const carregar = el('section', 'limpeza-etapas__carregar');carregar.setAttribute('aria-label', 'Carregar dados');
  const configurar = el('section', 'limpeza-etapas__configurar');configurar.setAttribute('aria-label', 'Configurar limpeza');
  const labelAba = el('label', 'campo');labelAba.append(el('span', '', 'Aba do XLSX'));
  const aba = el('select');aba.id = 'limpeza-aba';labelAba.htmlFor = aba.id;labelAba.append(aba);labelAba.hidden = true;
  const situacao = el('p', 'limpeza-etapas__situacao');situacao.setAttribute('role', 'status');
  const erro = el('p', 'limpeza-etapas__erro');erro.setAttribute('role', 'alert');erro.hidden = true;
  const seguir = el('button', 'botão', 'Configurar limpeza');seguir.type = 'button';seguir.id = 'limpeza-configurar';
  carregar.append(form.querySelector('[data-campo="arquivo"]'), labelAba, form.querySelector('[data-campo="conteúdo"]'), situacao, erro, seguir);
  campos.before(carregar, configurar);configurar.append(campos);
  const campoChaves = form.querySelector('[data-campo="colunasChave"]');form.elements.colunasChave.type = 'hidden';
  const listaColunas = el('div', 'limpeza-etapas__colunas');listaColunas.setAttribute('role', 'group');listaColunas.setAttribute('aria-label', 'Colunas que identificam uma duplicata');
  campoChaves.append(el('p', 'campo__dica', 'Todas compara a linha inteira. Selecione somente e-mail ou código para usá-los como chave. As demais colunas continuam na saída.'), listaColunas);
  const acoes = form.querySelector(':scope > .ações');configurar.append(acoes);
  const voltar = el('button', 'botão botão--linha', 'Voltar ao arquivo');voltar.type = 'button';voltar.addEventListener('click', () => ir(1));acoes.prepend(voltar);acoes.querySelector('[type="reset"]').textContent = 'Começar novamente';
  const revisao = el('div', 'limpeza-etapas__revisao');
  const ajustar = el('button', 'botão botão--linha', 'Ajustar limpeza');ajustar.type = 'button';ajustar.addEventListener('click', () => ir(2));
  const confirmar = el('button', 'botão', 'Confirmar e baixar');confirmar.id = 'limpeza-confirmar';confirmar.type = 'button';confirmar.addEventListener('click', () => ir(4));
  revisao.append(el('p', '', 'Confira as contagens e a amostra antes de baixar. O arquivo original permanece no seu aparelho.'), ajustar, confirmar);resultado.before(revisao);

  function ir(n) {
    if (n > liberada) return;
    etapa = n;raiz.dataset.etapa = String(n);
    carregar.hidden = n !== 1;configurar.hidden = n !== 2;form.hidden = n >= 3;
    revisao.hidden = n < 3;confirmar.hidden = n === 4;resultado.hidden = n < 3;
    for (const b of resultado.querySelectorAll('[data-arquivo],[data-salvar-trabalho]')) b.hidden = n !== 4;
    botoes.forEach((b, i) => { b.disabled = i+1 > liberada || carregando;if (i+1 === n) b.setAttribute('aria-current', 'step');else b.removeAttribute('aria-current'); });
  }
  function falhar(mensagem) { erro.textContent = mensagem;erro.hidden = false; }
  function ocupado(valor) { carregando = valor;seguir.disabled = valor;aba.disabled = valor;arquivoInput.disabled = valor;conteudo.disabled = valor;raiz.setAttribute('aria-busy', String(valor));ir(etapa); }
  function invalidar() { liberada = Math.min(liberada, 2);resultado.hidden = true;if (etapa >= 3) ir(2);else ir(etapa); }
  function gravarColunas() { form.elements.colunasChave.value = JSON.stringify([...listaColunas.querySelectorAll('input:checked')].map(c => Number(c.value))); }
  function prepararColunas(tabela) {
    const nomes = tabela[0].map((nome, i) => form.elements.comCabeçalho.checked ? nome || `Coluna ${i+1}` : `Coluna ${i+1}`);
    assinatura = JSON.stringify(nomes);listaColunas.replaceChildren();
    let selecionadas;try { selecionadas = JSON.parse(form.elements.colunasChave.value); } catch {}
    if (!Array.isArray(selecionadas)) selecionadas = nomes.map((_, i) => i);
    nomes.forEach((nome, i) => { const label = el('label'), c = el('input');c.type = 'checkbox';c.value = String(i);c.checked = selecionadas.includes(i);c.addEventListener('change', () => { gravarColunas();invalidar(); });label.append(c, el('span', '', `${i+1}. ${nome}`));listaColunas.append(label); });gravarColunas();
  }
  seguir.addEventListener('click', () => { erro.hidden = true;try { const dados = lerDadosTexto(conteudo.value);prepararColunas(dados.linhas);situacao.textContent = `${dados.linhas.length.toLocaleString('pt-BR')} linhas × ${dados.colunas} colunas`;liberada = Math.max(2, liberada);ir(2); } catch (e) { falhar(e.message);conteudo.focus(); } });
  arquivoInput.accept = '.xlsx,.csv,.tsv,.txt';
  conteudo.addEventListener('input', () => { geracao++;leitor?.fechar();leitor = null;labelAba.hidden = true;fonte.nome = '';fonte.aba = '';fonte.avisos = [];assinatura = '';form.elements.colunasChave.value = '';invalidar(); });
  form.elements.comCabeçalho.addEventListener('change', () => { try { prepararColunas(lerDadosTexto(conteudo.value).linhas); } catch {} });
  // O montador restaura os campos de um trabalho em sequência. Sincronizar a
  // chave restaurada evita que as caixas mostrem todas as colunas por engano.
  form.elements.colunasChave.addEventListener('change', () => {
    try { if (Array.isArray(JSON.parse(form.elements.colunasChave.value))) prepararColunas(lerDadosTexto(conteudo.value).linhas); } catch {}
  });
  campos.addEventListener('change', invalidar);

  function aceitarDados(dados, nome) {
    const texto = tabelaParaTexto(dados.linhas);
    conteudo.value = texto;fonte.nome = nome;fonte.aba = dados.aba || '';fonte.avisos = dados.avisos || [];
    assinatura = '';form.elements.colunasChave.value = '';prepararColunas(dados.linhas);invalidar();
    situacao.textContent = `${nome}${fonte.aba ? ` · ${fonte.aba}` : ''} · ${dados.linhas.length.toLocaleString('pt-BR')} linhas × ${dados.colunas} colunas. Pronto para configurar.`;
  }
  arquivoInput.addEventListener('change', async () => {
    const arquivo = arquivoInput.files[0];if (!arquivo) return;
    const atual = ++geracao;let novo;erro.hidden = true;ocupado(true);situacao.textContent = 'Lendo o arquivo no seu aparelho…';
    try {
      if (arquivo.size > LIMITES_IMPORTACAO.bytes) throw new Error('O limite do arquivo é 10 MB. Divida a planilha em partes.');
      if (!/\.(xlsx|csv|tsv|txt)$/i.test(arquivo.name)) throw new Error('Escolha XLSX, CSV ou TSV. Para XLS, ODS ou macros, salve a aba como XLSX sem macros ou CSV.');
      const buffer = await arquivo.arrayBuffer();
      if (/\.xlsx$/i.test(arquivo.name)) {
        novo = criarLeitorXlsx();const abas = await novo.abrir(buffer);let dados, recusa;
        try { dados = await novo.lerAba(0);if (dados) tabelaParaTexto(dados.linhas); } catch (e) { recusa = e.message; }
        if (atual !== geracao) { novo.fechar();return; }
        if (dados && !recusa) aceitarDados(dados, arquivo.name);else { conteudo.value = '';fonte.aba = '';fonte.nome = arquivo.name;fonte.avisos = [];liberada = 1;ir(1);situacao.textContent = 'Escolha uma aba com dados para continuar.';falhar(recusa); }
        aba.replaceChildren(...abas.map((nome, i) => { const option = el('option', '', nome);option.value = String(i);return option; }));
        leitor?.fechar();leitor = novo;labelAba.hidden = false;abaAtual = 0;
      } else {
        const bytes = new Uint8Array(buffer), recusa = recusarSeNãoForTexto(bytes);if (recusa) throw new Error(recusa);
        const { texto, codificação } = decodificarTexto(bytes), dados = lerDadosTexto(texto);
        if (atual !== geracao) return;
        aceitarDados({ ...dados, avisos: codificação === 'UTF-8' ? [] : [`Texto lido em ${codificação}; a saída usa UTF-8.`] }, arquivo.name);
        leitor?.fechar();leitor = null;labelAba.hidden = true;
      }
    } catch (e) { novo?.fechar();if (atual === geracao) { falhar(e.message);arquivoInput.value = '';situacao.textContent = conteudo.value ? 'Os dados anteriores continuam disponíveis.' : 'Escolha outro arquivo ou cole os dados.'; } }
    finally { if (atual === geracao) ocupado(false); }
  });
  aba.addEventListener('change', async () => {
    if (!leitor) return;const atual = ++geracao, indice = Number(aba.value);ocupado(true);erro.hidden = true;situacao.textContent = 'Lendo a aba escolhida…';
    try { const dados = await leitor.lerAba(indice);if (atual !== geracao) return;aceitarDados(dados, fonte.nome);abaAtual = indice; }
    catch (e) { if (atual === geracao) { aba.value = String(abaAtual);falhar(e.message);situacao.textContent = 'Os dados da aba anterior continuam disponíveis.'; } }
    finally { if (atual === geracao) ocupado(false); }
  });
  const observer = new MutationObserver(() => { if (!resultado.hidden && etapa < 3) { liberada = 4;ir(3); } });observer.observe(resultado, { attributes: true, attributeFilter: ['hidden'] });
  form.addEventListener('reset', () => { geracao++;leitor?.fechar();leitor = null;fonte.nome = '';fonte.aba = '';fonte.avisos = [];liberada = 1;assinatura = '';labelAba.hidden = true;situacao.textContent = '';erro.hidden = true;listaColunas.replaceChildren();queueMicrotask(() => { ocupado(false);ir(1); }); });
  window.addEventListener('pagehide', () => { leitor?.fechar();observer.disconnect(); }, { once: true });
  ir(1);return fonte;
}
