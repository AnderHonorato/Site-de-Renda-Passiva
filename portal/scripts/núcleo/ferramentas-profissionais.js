/** Interface comum das análises profissionais. Os cálculos são executados pela API. */
import { especificacaoPorSlug } from '../../dados/profissionais.js';
import { api, ErroApi } from './api.js';
import { baixar } from './exportar.js';
import { caminhoDoIdioma } from './sessão.js';
import { registrarUso as registrarRecente } from './preferências.js';
import { importarArquivo, arquivosDoRelatorio } from '../comum/profissionais/arquivos.js';
import { criarExecucaoVisual, aguardarPintura, resolverDuracaoApresentacao } from './execucao-visual.js';

const LIMITE_TEXTO = 1_000_000;
const POR_PAGINA = 25;
const formato = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
let sequencia = 0;

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = String(texto);
  return no;
}
function botao(texto, classe = 'botão botão--linha') {
  const no = elemento('button', classe, texto);
  no.type = 'button';
  return no;
}
function valorLegivel(valor) { return valor == null ? '—' : typeof valor === 'number' ? formato.format(valor) : String(valor); }
function numeroInformado(texto) {
  const bruto = texto.trim();
  if (bruto.includes(',')) {
    if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+(?:[eE][+-]?\d+)?$/.test(bruto)) return NaN;
    return Number(bruto.replace(/\./g, '').replace(',', '.'));
  }
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(bruto) ? Number(bruto) : NaN;
}
function carregarEstilos() {
  const href = new URL('../../estilos/ferramentas-profissionais.css', import.meta.url).href;
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}
function criarTabela(colunas, linhas, legenda) {
  const rolagem = elemento('div', 'profissional__rolagem');
  rolagem.tabIndex = 0;
  rolagem.setAttribute('role', 'region');
  rolagem.setAttribute('aria-label', legenda);
  const tabela = elemento('table', 'tabela profissional__tabela');
  tabela.append(elemento('caption', 'profissional__legenda', legenda));
  const cabecalho = elemento('thead');
  const tr = elemento('tr');
  for (const nome of colunas) {
    const th = elemento('th', '', nome);
    th.scope = 'col';
    tr.append(th);
  }
  cabecalho.append(tr);
  const corpo = elemento('tbody');
  preencherTabela(corpo, linhas, colunas.length);
  tabela.append(cabecalho, corpo);
  rolagem.append(tabela);
  return { rolagem, corpo };
}
function preencherTabela(corpo, linhas, quantidadeColunas) {
  const fragmento = document.createDocumentFragment();
  for (const linha of linhas) {
    const tr = elemento('tr');
    for (let i = 0; i < quantidadeColunas; i++) tr.append(elemento('td', '', valorLegivel(linha[i])));
    fragmento.append(tr);
  }
  corpo.replaceChildren(fragmento);
}
/** Apenas uma prévia dos exemplos públicos; a validação de dados cabe ao servidor. */
function linhasDoExemplo(texto) {
  const delimitador = texto.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ';';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length && linhas.length < 5; i++) {
    const c = texto[i];
    if (c === '"' && aspas && texto[i + 1] === '"') { campo += '"'; i++; }
    else if (c === '"') aspas = !aspas;
    else if (c === delimitador && !aspas) { linha.push(campo); campo = ''; }
    else if ((c === '\n' || c === '\r') && !aspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (linhas.length < 5 && (campo || linha.length)) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
function graficoDeBarras(series, id) {
  const dados = series.filter(item => typeof item.valor === 'number' && Number.isFinite(item.valor));
  if (!dados.length) return null;
  const exibidos = dados.slice(0, 20);
  const figura = elemento('figure', 'profissional__grafico');
  figura.append(elemento('figcaption', '', dados.length > 20 ? `Visão gráfica · 20 de ${dados.length} valores` : 'Visão gráfica dos resultados'));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', `${id}-grafico-titulo ${id}-grafico-descricao`);
  const adicionar = (tag, attrs, texto) => {
    const no = document.createElementNS(ns, tag);
    for (const [chave, valor] of Object.entries(attrs)) no.setAttribute(chave, String(valor));
    if (texto !== undefined) no.textContent = texto;
    svg.append(no);
    return no;
  };
  const minimo = Math.min(0, ...exibidos.map(item => item.valor));
  const maximo = Math.max(0, ...exibidos.map(item => item.valor));
  const consultaMovel = window.matchMedia('(max-width: 520px)');
  function desenhar() {
    const movel = consultaMovel.matches;
    const largura = movel ? 360 : 680;
    const alturaLinha = movel ? 65 : 38;
    const altura = exibidos.length * alturaLinha + 16;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
    adicionar('title', { id: `${id}-grafico-titulo` }, 'Comparação de valores em barras');
    adicionar('desc', { id: `${id}-grafico-descricao` }, exibidos.map(item => `${item.nome}: ${valorLegivel(item.valor)}`).join('. '));
    const escala = valor => (movel ? 0 : 218) + (valor - minimo) / (maximo - minimo || 1) * (movel ? 360 : 340);
    const zero = escala(0);
    if (!movel) adicionar('line', { x1: zero, x2: zero, y1: 4, y2: altura - 8, class: 'profissional__eixo' });
    exibidos.forEach((item, indice) => {
      const y = indice * alturaLinha + (movel ? 18 : 26);
      const nome = String(item.nome);
      const limite = movel ? 22 : 28;
      adicionar('text', { x: 0, y, class: 'profissional__grafico-nome' }, nome.length > limite ? `${nome.slice(0, limite - 1)}…` : nome);
      const barraY = movel ? y + 11 : y - 17;
      if (movel) adicionar('line', { x1: zero, x2: zero, y1: barraY - 4, y2: barraY + 24, class: 'profissional__eixo' });
      const barra = adicionar('rect', { x: Math.min(zero, escala(item.valor)), y: barraY, width: Math.max(1, Math.abs(escala(item.valor) - zero)), height: 23, rx: 4, class: 'profissional__barra' });
      const titulo = document.createElementNS(ns, 'title');
      titulo.textContent = `${nome}: ${valorLegivel(item.valor)}`;
      barra.append(titulo);
      adicionar('text', { x: largura - 3, y, 'text-anchor': 'end', class: 'profissional__grafico-valor' }, valorLegivel(item.valor));
    });
  }
  desenhar();
  const redesenhar = () => {
    if (figura.isConnected) desenhar();
    else consultaMovel.removeEventListener('change', redesenhar);
  };
  consultaMovel.addEventListener('change', redesenhar);
  figura.append(svg);
  return { figura, destruir: () => consultaMovel.removeEventListener('change', redesenhar) };
}
function validarRelatorio(relatorio) {
  if (!relatorio || typeof relatorio.titulo !== 'string' || !Array.isArray(relatorio.indicadores)
    || !Array.isArray(relatorio.colunas) || !relatorio.colunas.length || !Array.isArray(relatorio.linhas)
    || relatorio.linhas.length > 10000 || relatorio.linhas.some(linha => !Array.isArray(linha))) {
    throw new Error('O servidor retornou um relatório incompleto. Tente novamente.');
  }
  return relatorio;
}

export function criarFerramentaProfissional(slug) {
  const spec = especificacaoPorSlug[slug];
  if (!spec) throw new Error(`Ferramenta profissional desconhecida: ${slug}`);
  return {
    instruções: {
      passos: ['Confira o exemplo e as colunas esperadas antes de inserir seus dados.', 'Importe um arquivo ou cole o conteúdo; revise os dados e as opções.', 'Execute a análise com sua conta e plano ativo. O conteúdo é enviado ao servidor para processamento.', 'Revise indicadores, método e limites. Baixe o relatório completo no formato necessário.'],
      exemplo: { texto: spec.problema },
      limites: `${spec.limites} Conteúdo de até 1 MB; tabelas com até 2.000 linhas de dados. Importações de até 10 MB.`,
      perguntas: [{ p: 'Os dados do exemplo são reais?', r: 'Não. O exemplo é fictício e serve para demonstrar o formato de entrada.' }, { p: 'Preciso entrar na conta para executar?', r: 'A execução exige conexão com o servidor do portal, login e plano ativo. Os exemplos podem ser consultados sem entrar.' }],
    },
    montar(raiz, ferramenta) {
      carregarEstilos();
      const id = `profissional-${++sequencia}`;
      raiz.classList.add('profissional');
      const documento = spec.entrada === 'documento';
      const formulario = elemento('form', 'profissional__formulario');
      formulario.noValidate = true;
      const introducao = elemento('div', 'profissional__introducao');
      introducao.append(elemento('span', 'profissional__selo', `${spec.plano === 'premium' ? 'Premium' : 'Plus'} · análise no servidor`), elemento('p', '', spec.problema));
      const exemplo = elemento('section', 'profissional__exemplo');
      const topoExemplo = elemento('div', 'profissional__cabecalho');
      const tituloExemplo = elemento('div');
      tituloExemplo.append(elemento('h2', '', 'Veja como preencher'), elemento('p', 'pequeno suave', 'Dados fictícios para experimentar a ferramenta.'));
      const usarExemplo = botao('Usar exemplo');
      topoExemplo.append(tituloExemplo, usarExemplo);
      exemplo.append(topoExemplo);
      if (documento) exemplo.append(elemento('pre', 'profissional__trecho', spec.exemplo.slice(0, 1300) + (spec.exemplo.length > 1300 ? '\n…' : '')));
      else {
        const [cabecalho, ...linhas] = linhasDoExemplo(spec.exemplo);
        exemplo.append(criarTabela(cabecalho || [], linhas, 'Exemplo · primeiras 4 linhas').rolagem);
      }
      const campo = elemento('div', 'campo profissional__entrada');
      const rotulo = elemento('label', '', documento ? 'Conteúdo do documento' : 'Dados em CSV ou TSV');
      rotulo.htmlFor = `${id}-conteudo`;
      const conteudo = elemento('textarea');
      conteudo.id = `${id}-conteudo`;
      conteudo.name = documento ? 'texto' : 'csv';
      conteudo.rows = 9;
      conteudo.spellcheck = documento;
      conteudo.placeholder = documento ? 'Cole o texto ou importe um documento abaixo.' : 'Cole a tabela com o cabeçalho ou use o exemplo acima.';
      const dica = elemento('p', 'campo__dica', documento ? 'Revise o texto extraído antes de executar. PDFs precisam conter texto selecionável; não há OCR.' : 'Mantenha o cabeçalho esperado. Separe colunas por ponto e vírgula ou tabulação e use datas no formato AAAA-MM-DD.');
      dica.id = `${id}-dica`;
      const erroCampo = elemento('p', 'campo__erro');
      erroCampo.id = `${id}-erro-campo`;
      erroCampo.hidden = true;
      conteudo.setAttribute('aria-describedby', dica.id);
      campo.append(rotulo, conteudo, dica, erroCampo);
      const esquema = elemento('details', 'profissional__detalhes');
      esquema.append(elemento('summary', '', documento ? 'Método e limites da entrada' : 'Colunas esperadas e tipos'));
      if (!documento) {
        const lista = elemento('ul', 'profissional__colunas');
        for (const coluna of spec.colunas || []) {
          const li = elemento('li');
          li.append(elemento('code', '', coluna.chave), elemento('span', '', ` · ${coluna.tipo}${coluna.minimo !== undefined ? ` · mínimo ${coluna.minimo}` : ''}${coluna.maximo !== undefined ? ` · máximo ${coluna.maximo}` : ''}`));
          lista.append(li);
        }
        esquema.append(lista);
      }
      esquema.append(elemento('p', '', spec.processa), elemento('p', 'pequeno suave', spec.limites));
      const importacao = elemento('div', 'profissional__importacao campo');
      const labelArquivo = elemento('label', '', 'Importar arquivo');
      labelArquivo.htmlFor = `${id}-arquivo`;
      const arquivo = elemento('input');
      arquivo.id = `${id}-arquivo`;
      arquivo.type = 'file';
      arquivo.accept = documento ? '.txt,.md,.json,.srt,.vtt,.pdf,.docx' : '.csv,.tsv,.xlsx,.json';
      const dicaArquivo = elemento('p', 'campo__dica', `${documento ? 'TXT, Markdown, JSON, SRT, VTT, PDF com texto ou DOCX' : 'CSV, TSV, XLSX ou JSON'} · até 10 MB. O conteúdo importado fica editável acima.`);
      dicaArquivo.id = `${id}-arquivo-dica`;
      arquivo.setAttribute('aria-describedby', dicaArquivo.id);
      const statusArquivo = elemento('p', 'profissional__situacao pequeno');
      statusArquivo.setAttribute('role', 'status');
      importacao.append(labelArquivo, arquivo, dicaArquivo, statusArquivo);
      const opcoes = elemento('div', 'profissional__opcoes');
      const controles = new Map();
      for (const opcao of spec.opcoes || []) {
        const caixa = elemento('div', 'campo');
        const label = elemento('label', '', opcao.rotulo || opcao.nome);
        const multilinha = opcao.tipo === 'area' || (opcao.tipo !== 'numero' && (String(opcao.padrao ?? '').includes('\n') || String(opcao.padrao ?? '').length > 120));
        const input = elemento(multilinha ? 'textarea' : 'input');
        input.id = `${id}-opcao-${controles.size}`;
        input.name = opcao.nome;
        if (multilinha) { input.rows = 5; caixa.classList.add('profissional__opcao-longa'); }
        else input.type = 'text';
        if (opcao.tipo === 'numero') input.inputMode = 'decimal';
        input.value = String(opcao.padrao ?? '');
        label.htmlFor = input.id;
        const ajuda = elemento('p', 'campo__dica', [opcao.minimo !== undefined ? `Mínimo: ${valorLegivel(opcao.minimo)}.` : '', opcao.maximo !== undefined ? `Máximo: ${valorLegivel(opcao.maximo)}.` : ''].filter(Boolean).join(' '));
        ajuda.id = `${input.id}-dica`;
        input.setAttribute('aria-describedby', ajuda.id);
        caixa.append(label, input, ajuda);
        opcoes.append(caixa);
        controles.set(opcao.nome, { input, opcao });
      }
      const acoes = elemento('div', 'ações profissional__acoes');
      const executar = botao('Executar análise', 'botão botão--g');
      executar.type = 'submit';
      const limpar = botao('Limpar');
      const cancelar = botao('Cancelar análise');
      cancelar.hidden = true;
      acoes.append(executar, limpar, cancelar);
      const estado = elemento('div', 'profissional__estado');
      estado.setAttribute('role', 'status');
      estado.setAttribute('aria-live', 'polite');
      estado.hidden = true;
      const visualAnaliseNo = elemento('div', 'profissional__execucao-visual');
      const visualAnalise = criarExecucaoVisual(visualAnaliseNo, {
        titulo: spec.nome, tipo: 'analise',
        duracaoMinimaMs: resolverDuracaoApresentacao({ tipo: 'analise', profissional: true }),
      });
      visualAnaliseNo.hidden = true;
      const visualImportacaoNo = elemento('div', 'profissional__execucao-visual');
      const visualImportacao = criarExecucaoVisual(visualImportacaoNo, {
        titulo: 'Importação de arquivo', tipo: 'importacao', compacta: true,
        duracaoMinimaMs: resolverDuracaoApresentacao({ tipo: 'importacao' }),
      });
      visualImportacaoNo.hidden = true;
      const erro = elemento('div', 'profissional__erro');
      erro.setAttribute('role', 'alert');
      erro.hidden = true;
      const mensagemErro = elemento('p');
      mensagemErro.id = `${id}-mensagem-erro`;
      const acaoErro = elemento('div', 'ações');
      erro.append(mensagemErro, acaoErro);
      const resultado = elemento('section', 'profissional__resultado');
      resultado.id = `${id}-resultado`;
      resultado.tabIndex = -1;
      resultado.hidden = true;
      importacao.append(visualImportacaoNo);
      formulario.append(introducao, exemplo, campo, esquema, importacao, opcoes, acoes, estado, visualAnaliseNo, erro);
      raiz.replaceChildren(formulario, resultado);
      let controlador = null, ocupado = false, ultimaImportacao = null, exportacaoAtual = null;
      let limparGrafico = () => {};

      function terminarExportacao(mensagem, final = 'cancelar') {
        if (!exportacaoAtual) return;
        const atual = exportacaoAtual;
        exportacaoAtual = null;
        clearTimeout(atual.temporizador);
        atual.worker.onmessage = null;
        atual.worker.onerror = null;
        atual.worker.onmessageerror = null;
        atual.worker.terminate();
        for (const botao of atual.botoes.querySelectorAll('button')) botao.disabled = false;
        atual.cancelar.remove();
        atual.exportacoes.setAttribute('aria-busy', 'false');
        if (mensagem) atual.status.textContent = mensagem;
        if (final === 'concluir') atual.visual.concluir('Arquivo pronto', mensagem);
        else if (final === 'falhar') atual.visual.falhar(mensagem || 'A geração do arquivo falhou.');
        else atual.visual.cancelar(mensagem || 'Exportação cancelada.');
      }

      function situacao(texto, ativa = false) {
        estado.textContent = texto;
        estado.hidden = !texto;
        estado.dataset.ativo = String(ativa);
      }
      function bloquear(valor) {
        ocupado = valor;
        for (const controle of [executar, limpar, usarExemplo, arquivo, conteudo, ...[...controles.values()].map(item => item.input)]) controle.disabled = valor;
        formulario.setAttribute('aria-busy', String(valor));
      }
      function limparErro() {
        erro.hidden = true;
        acaoErro.replaceChildren();
        erroCampo.hidden = true;
        conteudo.removeAttribute('aria-invalid');
        conteudo.setAttribute('aria-describedby', dica.id);
        for (const { input } of controles.values()) {
          input.removeAttribute('aria-invalid');
          input.setAttribute('aria-describedby', `${input.id}-dica`);
        }
      }
      function invalidarRelatorio(mensagem) {
        terminarExportacao('Exportação cancelada porque os dados foram alterados.');
        limparGrafico(); limparGrafico = () => {};
        visualAnalise.esconder();
        if (!resultado.hidden) situacao(mensagem);
        resultado.hidden = true;
      }
      function mostrarFalha(mensagem, codigo = 0, repetir = null) {
        mensagemErro.textContent = mensagem;
        erro.hidden = false;
        acaoErro.replaceChildren();
        if (codigo === 401 || codigo === 403) {
          const link = elemento('a', 'botão botão--linha', codigo === 401 ? 'Entrar na conta' : 'Ver planos');
          link.href = codigo === 401 ? `${caminhoDoIdioma('entrar.html')}?volta=${encodeURIComponent(location.pathname + location.search)}` : caminhoDoIdioma('planos.html');
          acaoErro.append(link);
        } else if (repetir) {
          const tentar = botao('Tentar novamente');
          tentar.addEventListener('click', repetir);
          acaoErro.append(tentar);
        }
      }
      usarExemplo.addEventListener('click', () => {
        invalidarRelatorio('');
        conteudo.value = spec.exemplo;
        limparErro();
        situacao('Exemplo fictício carregado. Revise os dados e execute a análise.');
        conteudo.focus();
      });
      limpar.addEventListener('click', () => {
        invalidarRelatorio('');
        conteudo.value = ''; arquivo.value = ''; ultimaImportacao = null;
        for (const { input, opcao } of controles.values()) input.value = String(opcao.padrao ?? '');
        statusArquivo.textContent = ''; resultado.hidden = true; resultado.replaceChildren();
        limparErro(); situacao(''); conteudo.focus();
      });
      cancelar.addEventListener('click', () => controlador?.abort());
      conteudo.addEventListener('input', () => {
        if (!erroCampo.hidden) limparErro();
        invalidarRelatorio('Dados alterados. Execute novamente para atualizar o relatório.');
      });
      for (const { input } of controles.values()) input.addEventListener('input', () => {
        input.removeAttribute('aria-invalid');
        invalidarRelatorio('Opções alteradas. Execute novamente para atualizar o relatório.');
      });
      async function importar(file) {
        if (ocupado || !file) return;
        invalidarRelatorio('');
        limparErro(); bloquear(true); ultimaImportacao = file;
        importacao.setAttribute('aria-busy', 'true');
        situacao(`Lendo ${file.name}…`, true);
        visualImportacao.iniciar(`Lendo ${file.name}…`);
        statusArquivo.textContent = '';
        try {
          await aguardarPintura();
          if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo excede 10 MB. Reduza o arquivo e tente novamente.');
          const extensao = file.name.split('.').pop().toLowerCase();
          if (!(documento ? ['txt', 'md', 'json', 'srt', 'vtt', 'pdf', 'docx'] : ['csv', 'tsv', 'xlsx', 'json']).includes(extensao)) throw new Error('Formato não aceito. Escolha um dos formatos indicados.');
          const importado = await importarArquivo(file, { entrada: spec.entrada, colunas: spec.colunas });
          if (new TextEncoder().encode(importado.conteudo).length > LIMITE_TEXTO) throw new Error('O conteúdo extraído excede 1 MB. Divida o arquivo em partes menores.');
          conteudo.value = importado.conteudo;
          statusArquivo.textContent = `${file.name} importado.${importado.aviso ? ` ${importado.aviso}` : ''}`;
          situacao('Arquivo lido. Revise o conteúdo antes de executar a análise.');
          visualImportacao.concluir('Arquivo importado', `${file.name} está pronto para revisão.`);
        } catch (falha) {
          situacao('Não foi possível importar o arquivo.');
          visualImportacao.falhar(falha.message || 'Não foi possível ler o arquivo.');
          mostrarFalha(falha.message || 'Não foi possível ler o arquivo.', 0, () => importar(ultimaImportacao));
        } finally { importacao.setAttribute('aria-busy', 'false'); bloquear(false); arquivo.value = ''; }
      }
      arquivo.addEventListener('change', () => importar(arquivo.files?.[0]));

      function desenharRelatorio(relatorio) {
        const titulo = elemento('h2', '', spec.nome);
        titulo.id = `${id}-titulo-resultado`;
        resultado.setAttribute('aria-labelledby', titulo.id);
        const topoResultado = elemento('header', 'profissional__resultado-topo');
        topoResultado.append(elemento('p', 'profissional__selo', 'Análise concluída'), titulo);
        if (relatorio.titulo && relatorio.titulo !== spec.nome) topoResultado.append(elemento('p', 'profissional__resultado-resumo', relatorio.titulo));
        resultado.replaceChildren(topoResultado);
        const indicadores = elemento('dl', 'profissional__indicadores');
        for (const [rotulo, valor] of relatorio.indicadores) {
          const bloco = elemento('div', 'profissional__indicador');
          bloco.append(elemento('dt', '', rotulo), elemento('dd', '', valorLegivel(valor)));
          indicadores.append(bloco);
        }
        resultado.append(indicadores);
        const grafico = graficoDeBarras(relatorio.series || [], id);
        if (grafico) { resultado.append(grafico.figura); limparGrafico = grafico.destruir; }
        const buscaCampo = elemento('div', 'campo profissional__busca');
        const label = elemento('label', '', 'Buscar no relatório');
        const busca = elemento('input');
        busca.type = 'search'; busca.id = `${id}-buscar`; label.htmlFor = busca.id;
        busca.placeholder = 'Digite uma palavra ou valor';
        buscaCampo.append(label, busca);
        const tabela = criarTabela(relatorio.colunas, [], 'Relatório detalhado');
        const navegacao = elemento('div', 'profissional__paginacao');
        const anterior = botao('Anterior'), proxima = botao('Próxima');
        const contagem = elemento('p', 'pequeno'); contagem.setAttribute('role', 'status');
        navegacao.append(anterior, contagem, proxima);
        let pagina = 0, filtradas = relatorio.linhas;
        function atualizar() {
          const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
          pagina = Math.max(0, Math.min(pagina, totalPaginas - 1));
          const inicio = pagina * POR_PAGINA;
          preencherTabela(tabela.corpo, filtradas.slice(inicio, inicio + POR_PAGINA), relatorio.colunas.length);
          contagem.textContent = filtradas.length ? `${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtradas.length)} de ${filtradas.length} linhas · página ${pagina + 1}/${totalPaginas}` : 'Nenhuma linha encontrada.';
          anterior.disabled = pagina === 0; proxima.disabled = pagina >= totalPaginas - 1;
        }
        busca.addEventListener('input', () => {
          const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
          filtradas = termo ? relatorio.linhas.filter(linha => linha.some(valor => `${String(valor ?? '')} ${valorLegivel(valor)}`.toLocaleLowerCase('pt-BR').includes(termo))) : relatorio.linhas;
          pagina = 0; atualizar();
        });
        anterior.addEventListener('click', () => { pagina--; atualizar(); });
        proxima.addEventListener('click', () => { pagina++; atualizar(); });
        atualizar();
        resultado.append(buscaCampo, tabela.rolagem, navegacao);
        const detalhes = elemento('details', 'profissional__detalhes');
        detalhes.append(elemento('summary', '', 'Método, notas e limites'), elemento('p', '', relatorio.metodo || spec.processa));
        for (const nota of relatorio.notas || []) detalhes.append(elemento('p', '', nota));
        if (!(relatorio.notas || []).includes(spec.limites)) detalhes.append(elemento('p', 'pequeno suave', spec.limites));
        if (spec.referencia) {
          try {
            const url = new URL(spec.referencia);
            if (['https:', 'http:'].includes(url.protocol)) {
              const ref = elemento('a', '', 'Consultar referência do método'); ref.href = url.href;
              ref.target = '_blank'; ref.rel = 'noopener noreferrer'; detalhes.append(ref);
            }
          } catch { /* referência ausente ou inválida não impede o relatório */ }
        }
        const exportacoes = elemento('div', 'profissional__exportacoes');
        exportacoes.append(elemento('h3', '', 'Baixar relatório completo'), elemento('p', 'pequeno suave', `Os arquivos incluem todas as ${relatorio.linhas.length} linhas, independentemente da busca e da página exibida.`));
        const botoes = elemento('div', 'ações profissional__formatos-exportacao');
        const statusExportacao = elemento('p', 'pequeno profissional__situacao'); statusExportacao.setAttribute('role', 'status');
        const visualExportacaoNo = elemento('div', 'profissional__execucao-visual');
        const visualExportacao = criarExecucaoVisual(visualExportacaoNo, {
          titulo: 'Seu relatório', tipo: 'arquivo', compacta: true,
          duracaoMinimaMs: resolverDuracaoApresentacao({ tipo: 'arquivo' }),
        });
        for (const item of arquivosDoRelatorio(relatorio, slug)) {
          const botaoArquivo = botao(item.rótulo);
          botaoArquivo.classList.add('profissional__formato-exportacao');
          botaoArquivo.addEventListener('click', async () => {
            if (exportacaoAtual) return;
            if (typeof Worker === 'undefined') {
              statusExportacao.textContent = 'Este navegador não oferece processamento de arquivos em segundo plano. Abra em um navegador atualizado e compatível para baixar o relatório.';
              return;
            }
            try {
              const worker = new Worker(new URL('../comum/profissionais/exportar-trabalhador.js', import.meta.url), { type: 'module' });
              const cancelarExportacao = botao('Cancelar exportação');
              cancelarExportacao.addEventListener('click', () => terminarExportacao('Exportação cancelada. Você pode escolher um formato novamente.'));
              const atual = { worker, temporizador: null, botoes, cancelar: cancelarExportacao, exportacoes, status: statusExportacao };
              atual.visual = visualExportacao;
              exportacaoAtual = atual;
              for (const botao of botoes.querySelectorAll('button')) botao.disabled = true;
              botoes.after(cancelarExportacao);
              statusExportacao.textContent = `Gerando ${item.rótulo} em segundo plano…`;
              visualExportacao.iniciar(`Gerando ${item.rótulo} em segundo plano…`);
              exportacoes.setAttribute('aria-busy', 'true');
              atual.temporizador = setTimeout(() => {
                if (exportacaoAtual === atual) terminarExportacao('A geração ultrapassou 30 segundos e foi interrompida. Tente outro formato ou uma análise menor.', 'falhar');
              }, 30000);
              worker.onmessage = ({ data }) => {
                if (exportacaoAtual !== atual) return;
                if (!data?.ok) {
                  terminarExportacao(`Não foi possível gerar o arquivo: ${typeof data?.mensagem === 'string' ? data.mensagem : 'tente novamente.'}`, 'falhar');
                  return;
                }
                try {
                  const saida = data.arquivo;
                  if (!(saida?.bytes instanceof Uint8Array) || typeof saida.nome !== 'string' || typeof saida.tipo !== 'string') throw new Error('Resposta de arquivo inválida.');
                  if (!resultado.hidden && botaoArquivo.isConnected) {
                    baixar(saida.bytes, saida.nome, saida.tipo);
                    terminarExportacao(`${saida.nome} pronto para download.`, 'concluir');
                  } else terminarExportacao('Relatório alterado antes do download. Execute a análise novamente para exportar.', 'cancelar');
                } catch { terminarExportacao('Não foi possível iniciar o download. Tente novamente.', 'falhar'); }
              };
              worker.onerror = evento => {
                evento.preventDefault();
                if (exportacaoAtual === atual) terminarExportacao('Não foi possível carregar o gerador de arquivos. Verifique a conexão e tente novamente em um navegador atualizado.', 'falhar');
              };
              worker.onmessageerror = () => {
                if (exportacaoAtual === atual) terminarExportacao('Não foi possível receber o arquivo gerado. Tente novamente.', 'falhar');
              };
              await aguardarPintura();
              if (exportacaoAtual !== atual) return;
              worker.postMessage({ relatorio, slug, rotulo: item.rótulo });
            } catch {
              const mensagem = 'Não foi possível iniciar o processamento em segundo plano. Tente novamente em um navegador atualizado e compatível.';
              terminarExportacao(mensagem, 'falhar');
              visualExportacao.falhar(mensagem);
              statusExportacao.textContent = mensagem;
            }
          });
          botoes.append(botaoArquivo);
        }
        exportacoes.append(botoes, visualExportacaoNo, statusExportacao);
        resultado.append(detalhes, exportacoes);
        resultado.hidden = false;
        resultado.focus({ preventScroll: true });
      }
      formulario.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (ocupado) return;
        limparErro();
        const texto = conteudo.value.trim();
        if (!texto || new TextEncoder().encode(texto).length > LIMITE_TEXTO) {
          erroCampo.textContent = texto ? 'O conteúdo excede 1 MB. Divida a análise em lotes menores.' : 'Cole seus dados, importe um arquivo ou carregue o exemplo antes de executar.';
          erroCampo.hidden = false; conteudo.setAttribute('aria-invalid', 'true');
          conteudo.setAttribute('aria-describedby', `${dica.id} ${erroCampo.id}`); conteudo.focus();
          return;
        }
        const valoresOpcoes = {};
        for (const [nome, { input, opcao }] of controles) {
          const valor = opcao.tipo === 'numero' ? numeroInformado(input.value) : input.value;
          if (opcao.tipo === 'numero' && (!input.value.trim() || !Number.isFinite(valor) || (opcao.minimo !== undefined && valor < opcao.minimo) || (opcao.maximo !== undefined && valor > opcao.maximo))) {
            mostrarFalha(`Confira a opção “${opcao.rotulo || nome}” e os limites indicados.`);
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', `${input.id}-dica ${mensagemErro.id}`);
            input.focus(); return;
          }
          valoresOpcoes[nome] = valor;
        }
        controlador = new AbortController(); bloquear(true); cancelar.hidden = false;
        invalidarRelatorio('');
        situacao('Preparando a análise…', true);
        visualAnalise.iniciar('Preparando a análise…');
        try {
          await aguardarPintura();
          situacao('Enviando dados. Aguardando a análise do servidor…', true);
          visualAnalise.andar(undefined, 'Enviando dados. Aguardando a análise do servidor…');
          const resposta = await api(`/api/profissionais/${encodeURIComponent(slug)}`, {
            metodo: 'POST', dados: { [documento ? 'texto' : 'csv']: texto, opcoes: valoresOpcoes }, signal: controlador.signal, prazoMs: 45000,
          });
          if (controlador.signal.aborted) { situacao('Análise cancelada. Seus dados foram preservados.'); visualAnalise.cancelar('Análise cancelada. Seus dados foram preservados.'); return; }
          const relatorio = validarRelatorio(resposta.relatorio);
          situacao('Análise concluída. Relatório completo disponível abaixo.');
          desenharRelatorio(relatorio);
          visualAnalise.concluir('Análise concluída', 'O relatório completo está disponível.');
          registrarRecente(ferramenta?.slug || slug);
        } catch (falha) {
          if (controlador.signal.aborted) { situacao('Análise cancelada. Seus dados foram preservados.'); visualAnalise.cancelar('Análise cancelada. Seus dados foram preservados.'); }
          else {
            situacao('A análise não foi concluída.');
            visualAnalise.falhar(falha.message || 'A análise não foi concluída.');
            const codigo = falha instanceof ErroApi ? falha.status : 0;
            const mensagem = codigo === 401 ? 'Entre na sua conta para executar esta análise.'
              : codigo === 403 ? `Esta ferramenta requer o plano ${spec.plano === 'premium' ? 'Premium' : 'Plus'} ativo.`
                : codigo === 503 && falha.message ? falha.message
                : falha.indisponivel ? 'A análise está indisponível neste endereço. Abra o portal conectado ao servidor para executar.'
                  : falha.message || 'Não foi possível concluir. Tente novamente.';
            mostrarFalha(mensagem, codigo, codigo !== 400 ? () => formulario.requestSubmit() : null);
          }
        } finally { bloquear(false); cancelar.hidden = true; controlador = null; }
      });
    },
  };
}

export default criarFerramentaProfissional;
