import { montarFerramenta, ErroDeEntrada, baixar, avisar } from '../núcleo/montador.js';
import { api } from '../núcleo/api.js';
import { criarProgresso } from '../núcleo/interface.js';
import { montarPreviaPdf } from '../núcleo/previa-pdf.js';
import { formatarTamanho } from '../cálculos/pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';

const base = '/api/central-pdf/trabalhos';
const MiB = 1024 * 1024;

function no(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function mensagem(erro) {
  if (erro.status === 401) return 'Sua sessão expirou. Entre novamente para usar a Central de PDF.';
  if (erro.status === 403) return 'Confira se sua conta tem o plano Premium ativo e recarregue a página.';
  if (erro.status === 404) return 'Este lote já foi excluído ou expirou. Processe os PDFs novamente.';
  if (erro.indisponivel) return 'O servidor de PDF está indisponível. Aguarde um instante antes de enviar outro lote.';
  return erro.message;
}

function excluir(id) {
  return api(base + '/' + encodeURIComponent(id), { metodo: 'DELETE' });
}

function escolhasDoLote(dados) {
  return {
    perfil: dados.perfil,
    cinza: dados.cinza === 'sim',
    removerMetadados: dados.removerMetadados === 'sim',
    unir: dados.unir === 'sim',
  };
}

function mostrarComparacao(resultado, linhas) {
  const secao = no('section', 'pdf-lote__comparacao');
  secao.append(no('h3', '', 'Tamanho por documento'));
  for (const [nome, paginas, antes, depois] of linhas) {
    const item = no('article', 'pdf-lote__comparativo');
    item.append(no('h4', '', nome), no('p', 'pequeno suave', paginas + (paginas === 1 ? ' página' : ' páginas')));
    for (const [rotulo, bytes] of [['Original', antes], ['Otimizado', depois]]) {
      const linha = no('div', 'pdf-lote__medida');
      const barra = no('meter');
      barra.setAttribute('aria-hidden', 'true');
      barra.max = Math.max(antes, depois, 1);
      barra.value = bytes;
      linha.append(no('span', '', rotulo), barra, no('strong', '', formatarTamanho(bytes)));
      item.append(linha);
    }
    secao.append(item);
  }
  resultado.querySelector('.resultado__principal').after(secao);
}

export default {
  instruções: {
    passos: [
      'Escolha até seis PDFs. Use as setas da lista para definir a ordem do documento unificado.',
      'Selecione o perfil de qualidade. Você também pode converter em tons de cinza, remover metadados e juntar as cópias.',
      'Toque em Processar lote para enviar os documentos ao servidor e acompanhe a etapa em execução.',
      'Compare o tamanho de cada arquivo, confira a prévia e baixe os PDFs ou o pacote ZIP antes de sair.',
    ],
    exemplo: { texto: 'Para enviar uma proposta por e-mail, coloque a proposta antes dos anexos, escolha o perfil equilibrado e ative a cópia unificada. O relatório mostra a variação de tamanho de cada documento.' },
    limites: 'Premium com servidor ativo. Até 10 MB e 100 páginas por PDF, com 40 MB e 200 páginas por lote. Use PDFs sem senha. A conversão pode alterar formulários, transparências e assinaturas digitais. Guarde os originais. Os arquivos ficam disponíveis por 15 minutos a partir da criação do lote.',
    perguntas: [
      { p: 'Qual perfil devo usar?', r: 'Tela usa 72 dpi para imagens pequenas, Equilibrado usa 150 dpi para leitura e Impressão usa 300 dpi para preservar detalhes.' },
      { p: 'O PDF sempre diminui?', r: 'Um PDF que já tem imagens comprimidas pode crescer. Compare os tamanhos medidos antes de escolher qual versão guardar.' },
      { p: 'O que entra no ZIP?', r: 'As cópias individuais, a cópia unificada quando selecionada e o relatório em PDF, Excel, CSV, JSON e TXT.' },
    ],
  },

  montar(raiz, ferramenta) {
    raiz.classList.add('pdf-lote');
    let escolha, andamento, cancelar, formulario, trabalho, previa;
    const limparPrevia = () => { previa?.destruir(); previa = null; };
    function abandonar() {
      if (!trabalho) return;
      const anterior = trabalho;
      trabalho = null;
      anterior.controlador.abort();
      limparPrevia();
      if (anterior.id) void excluir(anterior.id).catch(erro => {
        if (erro.status !== 404) avisar('Não foi possível confirmar a exclusão do lote. Os arquivos expiram no servidor.');
      });
    }
    function travar(ocupado) {
      escolha.travar(ocupado);
      for (const campo of formulario.querySelectorAll('select, input[type=checkbox]')) campo.disabled = ocupado;
      cancelar.hidden = !ocupado;
      cancelar.disabled = false;
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Processar lote', demorada: true, permitirSalvarTrabalho: false,
      campos: [
        { nome: 'arquivos', rótulo: 'Documentos PDF', tipo: 'file', dica: 'Até 6 arquivos de 10 MB cada e 40 MB no total. O envio começa ao tocar em Processar lote.' },
        { nome: 'perfil', rótulo: 'Qualidade das imagens', tipo: 'seleção', padrão: 'equilibrado', opções: [
          { valor: 'tela', rótulo: 'Tela · 72 dpi' }, { valor: 'equilibrado', rótulo: 'Equilibrado · 150 dpi' }, { valor: 'impressao', rótulo: 'Impressão · 300 dpi' },
        ] },
        { nome: 'cinza', tipo: 'caixa', rótulo: 'Converter em tons de cinza' },
        { nome: 'removerMetadados', tipo: 'caixa', rótulo: 'Remover metadados do documento' },
        { nome: 'unir', tipo: 'caixa', rótulo: 'Incluir PDF unificado na ordem da lista' },
      ],
      aoMontar() {
        formulario = raiz.querySelector('form');
        andamento = criarProgresso(raiz.querySelector('#progresso'));
        escolha = montarEscolhaDeArquivos(raiz, {
          campo: 'arquivos', accept: '.pdf,application/pdf', múltiplo: true, limite: 6,
          mensagemDeLimite: 'o lote comporta até seis documentos.',
          rótuloDoBotão: 'Escolher PDFs', rótuloDaLista: 'Documentos na ordem de processamento',
          textoDoVazio: 'Arraste seus PDFs para cá.', textoDeSolte: 'Solte para adicionar ao lote.',
          validar(arquivo, inicio) {
            if (arquivo.size > 10 * MiB) return { erro: arquivo.name + ' ultrapassa 10 MB.' };
            return validarPdfDaEscolha(arquivo, inicio);
          },
          aoMudar() { limparPrevia(); },
        });
        cancelar = no('button', 'botão botão--linha', 'Cancelar processamento');
        cancelar.type = 'button'; cancelar.hidden = true;
        cancelar.addEventListener('click', () => { abandonar(); cancelar.disabled = true; andamento.cancelar('Cancelando o lote…'); });
        formulario.querySelector('.ações').append(cancelar);
        formulario.addEventListener('reset', () => { abandonar(); travar(false); });
        formulario.addEventListener('change', () => {
          limparPrevia();
          raiz.querySelector('#resultado').hidden = true;
        });
      },
      async calcular(dados) {
        const itens = [...escolha.itens()];
        if (!itens.length) throw new ErroDeEntrada('Escolha pelo menos um PDF para processar.', 'arquivos');
        if (itens.reduce((soma, item) => soma + item.tamanho, 0) > 40 * MiB) {
          throw new ErroDeEntrada('Os documentos ultrapassam 40 MB. Divida-os em dois lotes.', 'arquivos');
        }
        abandonar();
        raiz.querySelector('#resultado').hidden = true;
        const atual = { controlador: new AbortController(), id: null };
        trabalho = atual;
        const signal = atual.controlador.signal;
        travar(true);
        try {
          // Aguarda o identificador mesmo após cancelar para poder excluir um lote criado em trânsito.
          const criado = await api(base, { metodo: 'POST', dados: {
            arquivos: itens.map(({ nome, tamanho }) => ({ nome, tamanho })), opcoes: escolhasDoLote(dados),
          } });
          atual.id = criado.trabalho.id;
          if (signal.aborted) { await excluir(atual.id); signal.throwIfAborted(); }
          const rota = base + '/' + encodeURIComponent(atual.id);
          for (const [i, item] of itens.entries()) {
            andamento.andar(undefined, 'Enviando ' + (i + 1) + ' de ' + itens.length + ' · ' + item.nome);
            await api(rota + '/entradas/' + i, { metodo: 'PUT', binario: item.arquivo, signal, prazoMs: 120000 });
          }
          let { trabalho: lote } = await api(rota + '/iniciar', { metodo: 'POST', signal });
          while (lote.estado === 'processando') {
            andamento.andar(lote.progresso, lote.etapa || 'Aguardando processamento…');
            await new Promise(resolve => setTimeout(resolve, 650));
            signal.throwIfAborted();
            ({ trabalho: lote } = await api(rota, { signal }));
          }
          if (lote.estado !== 'concluido') throw new Error(lote.mensagem || 'O servidor não concluiu o lote. Confira os documentos e tente novamente.');
          const obterArquivo = indice => api(rota + '/arquivos/' + indice, { resposta: 'blob', prazoMs: 120000, signal });
          const arquivos = lote.arquivos.map((arquivo, indice) => ({
            rótulo: arquivo.mime === 'application/zip' ? 'Baixar pacote ZIP' : arquivo.nome,
            async gerar() {
              try {
                const blob = await obterArquivo(indice);
                if (!signal.aborted) baixar(blob, arquivo.nome, arquivo.mime);
              } catch (erro) {
                if (signal.aborted) return;
                const resultado = raiz.querySelector('#resultado');
                let alerta = resultado.querySelector('[data-erro-download]');
                if (!alerta) {
                  alerta = no('p', 'pequeno');
                  alerta.dataset.erroDownload = '';
                  alerta.setAttribute('role', 'alert');
                  resultado.querySelector('.resultado__exportações').append(alerta);
                }
                alerta.textContent = mensagem(erro);
                throw erro;
              }
            },
          }));
          const linhas = lote.relatorio?.linhas || [];
          const expira = new Date(lote.expiraEm);
          const validade = Number.isFinite(expira.getTime()) ? 'Downloads disponíveis até ' + expira.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.' : 'Os arquivos expiram 15 minutos após a criação do lote.';
          return {
            valor: itens.length + (itens.length === 1 ? ' PDF processado' : ' PDFs processados'),
            resumo: lote.relatorio?.metodo, observações: [validade, ...(lote.relatorio?.notas || [])],
            arquivos, linhasComparacao: linhas, saidas: lote.arquivos, obterArquivo, signal,
          };
        } catch (erro) {
          if (signal.aborted) throw Object.assign(new Error('Processamento cancelado.'), { cancelado: true });
          abandonar();
          throw new Error(mensagem(erro));
        } finally {
          if (!trabalho || trabalho === atual) travar(false);
        }
      },
      aoResultado(_, saida) {
        const resultado = raiz.querySelector('#resultado');
        if (saida.linhasComparacao.length) mostrarComparacao(resultado, saida.linhasComparacao);
        const controles = no('div', 'pdf-lote__leitor');
        const rotulo = no('label', 'campo', 'Documento para prévia');
        const lista = no('select');
        saida.saidas.forEach((arquivo, indice) => {
          if (arquivo.mime !== 'application/pdf') return;
          const opcao = no('option', '', arquivo.nome);
          opcao.value = String(indice); lista.append(opcao);
        });
        rotulo.append(lista);
        const abrir = no('button', 'botão botão--linha', 'Visualizar PDF');
        abrir.type = 'button';
        const painel = no('div');
        abrir.onclick = async () => {
          abrir.disabled = true; lista.disabled = true;
          try {
            const indice = Number(lista.value);
            const bytes = new Uint8Array(await (await saida.obterArquivo(indice)).arrayBuffer());
            if (saida.signal.aborted || resultado.hidden || !painel.isConnected) return;
            limparPrevia();
            previa = montarPreviaPdf(painel, { bytes, nome: saida.saidas[indice].nome });
          } catch (erro) { if (!saida.signal.aborted) avisar(mensagem(erro)); }
          finally { abrir.disabled = false; lista.disabled = false; }
        };
        lista.onchange = () => { limparPrevia(); painel.replaceChildren(); painel.classList.remove('pdf-previa'); };
        controles.append(rotulo, abrir);
        resultado.append(controles, painel);
      },
    });
  },
};
