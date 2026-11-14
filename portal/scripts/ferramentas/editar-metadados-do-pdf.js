/** Editor de metadados do PDF; leitura e gravação no próprio navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf, nomeDeArquivo } from '../núcleo/exportar.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { mensagemDeErroDoPdfÚnico } from '../cálculos/pdf-páginas.js';
import { CAMPOS_DE_METADADOS, editarMetadadosPdf, lerMetadadosPdf, LIMITE_DE_CARACTERES } from '../cálculos/editar-metadados-do-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');

export default {
  instruções: {
    passos: [
      'Escolha um PDF: os campos de título, autoria, palavras-chave e datas serão lidos e preenchidos automaticamente.',
      'Edite o que deseja manter. Deixe um campo vazio para removê-lo; use vírgula ou ponto e vírgula entre palavras-chave.',
      'Para remover também campos personalizados e o pacote XMP, marque “Limpar todos os metadados”. Os campos editáveis ficam desativados.',
      'Toque em “Salvar metadados” para baixar uma cópia. O PDF original não é alterado e o arquivo não sai do aparelho.',
    ],
    exemplo: {
      texto: 'Um PDF pode informar o título “Relatório final” e o autor “Editor desconhecido”. Troque o título para “Relatório de vendas — novembro” e deixe Autor vazio: o arquivo novo recebe o título escolhido e não inclui o autor. O restante das páginas permanece no PDF.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. A ferramenta lê e grava os campos comuns do dicionário de informações do PDF: título, autor, assunto, palavras-chave, aplicativo criador, produtor e datas de criação e modificação. `
      + `Cada campo de texto aceita até ${LIMITE_DE_CARACTERES.toLocaleString('pt-BR')} caracteres; palavras-chave aceitam até 100 termos. Datas devem estar no padrão ISO em UTC (por exemplo, 2026-11-14T15:30:00Z). `
      + 'O XMP incorporado é removido ao salvar porque esta ferramenta não consegue atualizar seus diferentes esquemas com segurança. “Limpar todos” remove também todas as entradas do dicionário de informações. Não é uma limpeza forense de dados ocultos em objetos, anexos ou conteúdo das páginas. PDFs protegidos por senha não são aceitos. Assinaturas digitais deixam de ser válidas quando o arquivo é alterado. A gravação usa pdf-lib (MIT), incluída no site; o arquivo fica no navegador.',
    perguntas: [
      { p: 'O PDF é enviado para um servidor?', r: 'Não. A leitura e a gravação acontecem no navegador, com uma biblioteca que já faz parte do site.' },
      { p: 'Deixar um campo vazio remove o valor antigo?', r: 'Sim. O valor correspondente é removido do dicionário de informações. O XMP inteiro também é retirado para evitar que uma cópia antiga do metadado continue no PDF.' },
      { p: '“Limpar todos” apaga qualquer dado escondido do arquivo?', r: 'Remove todas as entradas do dicionário de informações e o pacote XMP. Não apaga dados que possam estar em anexos, comentários, objetos ou no próprio conteúdo das páginas; para isso, revise o PDF separadamente.' },
      { p: 'Por que minha assinatura digital aparece como inválida depois?', r: 'A assinatura valida os bytes originais. Como salvar os metadados cria uma cópia modificada, a assinatura digital anterior deixa de conferir.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    let avisoDeLeitura;
    let campos;
    let limpar;
    let leituraId = 0;
    let arquivoLido;

    const preencher = (valores) => {
      for (const campo of CAMPOS_DE_METADADOS) campos[campo.campo].value = valores?.[campo.campo] ?? '';
    };

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Salvar metadados',
      demorada: true,
      invalidarAoEditar: true,
      campos: [
        { nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file', dica: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. A leitura acontece neste navegador.` },
        { nome: 'titulo', rótulo: 'Título', tipo: 'text', opcional: true, dica: 'Nome do documento. Vazio remove o valor atual.' },
        { nome: 'autor', rótulo: 'Autor', tipo: 'text', opcional: true, dica: 'Pessoa ou organização responsável.' },
        { nome: 'assunto', rótulo: 'Assunto', tipo: 'text', opcional: true, dica: 'Descrição curta do conteúdo.' },
        { nome: 'palavras-chave', rótulo: 'Palavras-chave', tipo: 'text', opcional: true, dica: 'Separe termos com vírgula ou ponto e vírgula.' },
        { nome: 'criador', rótulo: 'Aplicativo criador', tipo: 'text', opcional: true },
        { nome: 'produtor', rótulo: 'Produtor do PDF', tipo: 'text', opcional: true },
        { nome: 'criado-em', rótulo: 'Data de criação (UTC)', tipo: 'text', opcional: true, exemplo: '2026-11-14T15:30:00Z' },
        { nome: 'alterado-em', rótulo: 'Data de modificação (UTC)', tipo: 'text', opcional: true, exemplo: '2026-11-14T15:30:00Z' },
        { nome: 'limpar-tudo', rótulo: 'Limpar todos os metadados do documento', tipo: 'caixa', padrão: false, dica: 'Apaga campos personalizados, campos comuns e o pacote XMP.' },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (!itens.length) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        const { nome, arquivo } = itens[0];
        if (arquivoLido !== arquivo) throw new ErroDeEntrada('Aguarde a leitura dos metadados terminar antes de salvar o PDF.', 'arquivo');
        const valores = Object.fromEntries(CAMPOS_DE_METADADOS.map((campo) => [campo.campo, dados[campo.campo] ?? '']));
        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o gravador de PDF…');
          let biblioteca;
          try { biblioteca = await carregarBiblioteca(); } catch { throw new Error(ERRO_DE_BIBLIOTECA); }
          progresso.andar(undefined, 'Lendo o PDF…');
          const bytes = new Uint8Array(await arquivo.arrayBuffer());
          progresso.andar(undefined, 'Salvando os metadados…');
          let resultado;
          try {
            resultado = await editarMetadadosPdf(bytes, valores, biblioteca, { limparTudo: dados['limpar-tudo'] === 'sim' });
          } catch (erro) {
            if (erro.campo) throw new ErroDeEntrada(erro.message, erro.campo);
            const mensagem = /encrypted|password|decrypt/i.test(erro.message ?? '')
              ? 'Este PDF está protegido por senha. Salve uma cópia sem proteção e tente de novo.'
              : 'Não foi possível ler este PDF. Confira se ele abre no seu leitor e tente salvar uma cópia sem senha.';
            throw new ErroDeEntrada(mensagem, 'arquivo');
          }
          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const detalhes = resultado.limpoTudo ? 'Todos os campos do dicionário de informações foram removidos.'
            : resultado.camposAtualizados.length ? `${resultado.camposAtualizados.length} campos preenchidos; campos vazios foram removidos.`
              : 'Os campos comuns foram removidos porque ficaram vazios.';
          return {
            valor: 'PDF atualizado',
            resumo: `${nome} · ${número(resultado.páginas)} ${resultado.páginas === 1 ? 'página' : 'páginas'} · ${formatarTamanho(resultado.bytes.length)}.`,
            linhas: [['Metadados', detalhes], ['Privacidade', 'O pacote XMP antigo também foi removido.']],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(resultado.bytes, `${base}-metadados`) }],
            previaPdf: { bytes: resultado.bytes, nome: `${base}-metadados.pdf` },
            observações: ['A cópia foi processada no navegador. O PDF original não foi alterado.'],
          };
        });
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        campos = Object.fromEntries(CAMPOS_DE_METADADOS.map((campo) => [campo.campo, elemento.querySelector(`#campo-${campo.campo}`)]));
        limpar = elemento.querySelector('#campo-limpar-tudo');
        const configurarCampos = (habilitados) => {
          for (const campo of Object.values(campos)) campo.disabled = !habilitados || limpar.checked;
          limpar.disabled = !habilitados;
        };
        configurarCampos(false);
        avisoDeLeitura = document.createElement('p');
        avisoDeLeitura.className = 'pequeno suave';
        avisoDeLeitura.setAttribute('aria-live', 'polite');
        avisoDeLeitura.textContent = 'Escolha um PDF para ler os valores existentes e preencher os campos.';
        elemento.querySelector('[data-campo="arquivo"]').after(avisoDeLeitura);

        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo', rótuloDoBotão: 'Escolher PDF', accept: 'application/pdf,.pdf', rótuloDaLista: 'PDF escolhido',
          textoDoVazio: 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão “Escolher PDF”.',
          textoDeSolte: 'Solte o PDF para escolher.', validar: validarPdfDaEscolha,
          aoMudar: (itens) => {
            const token = ++leituraId;
            arquivoLido = undefined;
            preencher({});
            limpar.checked = false;
            configurarCampos(false);
            if (!itens.length) { avisoDeLeitura.textContent = 'Escolha um PDF para ler os valores existentes e preencher os campos.'; return; }
            avisoDeLeitura.textContent = 'Lendo os campos de metadados do PDF…';
            void (async () => {
              try {
                const biblioteca = await carregarBiblioteca();
                const resultado = await lerMetadadosPdf(new Uint8Array(await itens[0].arquivo.arrayBuffer()), biblioteca);
                // O resultado pertence ao arquivo que ainda está escolhido.
                if (token !== leituraId || escolha.itens()[0]?.arquivo !== itens[0].arquivo) return;
                preencher(resultado.campos);
                arquivoLido = itens[0].arquivo;
                configurarCampos(true);
                avisoDeLeitura.textContent = `Foram lidas as propriedades de ${número(resultado.páginas)} ${resultado.páginas === 1 ? 'página' : 'páginas'}. Edite os valores e salve uma cópia.`;
              } catch {
                if (token !== leituraId) return;
                avisoDeLeitura.textContent = 'Não foi possível ler os metadados. O PDF pode estar protegido por senha ou danificado.';
              }
            })();
          },
        });
        execução = prepararExecução(elemento, { escolha });

        const atualizarCampos = () => { for (const campo of Object.values(campos)) campo.disabled = !arquivoLido || limpar.checked; };
        limpar.addEventListener('change', atualizarCampos);
        formulário.addEventListener('reset', () => setTimeout(() => { atualizarCampos(); preencher({}); }, 0));
        for (const campo of Object.values(campos)) campo.maxLength = LIMITE_DE_CARACTERES;
      },
    });
  },
};
