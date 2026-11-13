/** Comparar PDF: o que mudou no texto entre duas versões, página a página, no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, baixar, baixarCsv, nomeDeArquivo } from '../núcleo/montador.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { textoDePáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import {
  compararPdfs, mensagemDeErroDeComparação, relatórioEmTexto, linhasDoCsv, linhasDoRelatório, abreviar,
  LIMITE_DE_PÁGINAS_COMPARADAS, SEMELHANÇA_MÍNIMA,
} from '../cálculos/comparar-pdf.js';
import { listaDePáginas } from '../cálculos/extrair-texto-de-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Mudanças desenhadas na tela; o relatório baixado leva todas. */
const MUDANÇAS_NA_TELA = 150;

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro, extras) {
  if (erro === 'sem_original') return 'original';
  if (erro === 'sem_novo') return 'novo';
  if (erro === 'cancelado') return 'original';
  return extras?.arquivo === 'novo' ? 'novo' : 'original';
}

export default {
  instruções: {
    passos: [
      'Escolha o PDF "Original" (a versão mais antiga) e o PDF "Novo" (a versão alterada). Dá para arrastar os dois de uma vez para o quadro: o primeiro vira o original e o segundo, o novo. Eles são lidos no seu navegador, sem envio para servidor.',
      'Se não quiser que "Contrato" e "contrato" contem como diferença, marque para ignorar maiúsculas e minúsculas.',
      'Toque em "Comparar PDFs" e acompanhe o progresso.',
      'Leia a lista de mudanças, página por página: o que saiu aparece riscado, o que entrou aparece destacado. Copie ou baixe o relatório.',
    ],
    exemplo: {
      texto: 'O contrato A tem 2 páginas e o contrato B, 3. Na página 1, o título trocou "versão A" por "versão B" e uma linha nova foi acrescentada; a página 3 só existe no B. '
        + 'O relatório lista uma edição e um acréscimo na página 1 e a página 3 inteira como "página acrescentada". Comparando um PDF com ele mesmo, o resultado é "Nenhuma diferença no texto".',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} cada e até ${LIMITE_DE_PÁGINAS_COMPARADAS} páginas por versão (a leitura de um PDF só vai até ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')}). `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser comparado. '
      + 'SÓ O TEXTO É COMPARADO, palavra por palavra: esta ferramenta NÃO faz comparação visual. Mudança de imagem, de cor, de fonte, de tabela desenhada ou de posição das coisas não aparece, e quebras de linha e espaços não contam. '
      + 'PDF escaneado (cada página é uma foto) não tem texto e não pode ser comparado: o OCR (reconhecimento de caracteres) é outra ferramenta. '
      + `As páginas das duas versões são pareadas pelo conteúdo (semelhança mínima de ${Math.round(SEMELHANÇA_MÍNIMA * 100)}%), então uma página nova ou removida no meio não faz o resto "mudar". `
      + 'Em páginas com colunas ou tabelas, o texto vem na ordem em que o arquivo o guarda, que pode não ser a ordem visual. Páginas totalmente diferentes e muito grandes aparecem como uma troca só. '
      + 'A leitura usa o leitor de PDF pdf.js (licença Apache 2.0), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meus PDFs são enviados para algum servidor?',
        r: 'Não. O leitor é baixado com a página e roda no seu navegador; os arquivos não saem do aparelho.',
      },
      {
        p: 'Ela mostra as diferenças de imagem ou de formatação?',
        r: 'Não. A comparação é só do texto. Se a única mudança foi uma imagem, uma cor ou o tamanho de uma letra, o resultado diz que não há diferença no texto.',
      },
      {
        p: 'Inseri uma página no meio e o resto não ficou todo diferente. Por quê?',
        r: 'Porque as páginas são pareadas pelo conteúdo, não pela posição. A página nova aparece como "acrescentada" e as outras continuam emparelhadas com as suas.',
      },
      {
        p: 'O PDF é escaneado. Dá para comparar?',
        r: 'Não com esta ferramenta, porque não há texto dentro do arquivo. É preciso passar o OCR antes, e o OCR é outra ferramenta.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let original;
    let novo;
    let execução;
    let blocoDoRelatório;
    let esconderRelatório = () => {};

    /** Desenha a lista de mudanças com `textContent`: o texto vem do PDF e nunca vira HTML. */
    function desenharRelatório(r) {
      blocoDoRelatório.replaceChildren();
      const título = document.createElement('h3');
      título.textContent = 'Mudanças no texto';
      blocoDoRelatório.append(título);
      const linhas = linhasDoRelatório(r);
      if (!linhas.length) {
        const p = document.createElement('p');
        p.textContent = 'Nenhuma diferença no texto.';
        blocoDoRelatório.append(p);
        return;
      }
      const legenda = document.createElement('p');
      legenda.className = 'pequeno suave';
      legenda.textContent = 'Riscado: o que estava no original e saiu. Destacado: o que entrou no novo.';
      blocoDoRelatório.append(legenda);

      let mostradas = 0;
      for (const página of r.páginas.filter((p) => p.mudanças.length)) {
        if (mostradas >= MUDANÇAS_NA_TELA) break;
        const cabeça = document.createElement('h4');
        cabeça.textContent = página.a === null ? `Página ${página.b} do novo`
          : página.b === null ? `Página ${página.a} do original`
            : página.a === página.b ? `Página ${página.a}` : `Página ${página.a} do original (página ${página.b} do novo)`;
        blocoDoRelatório.append(cabeça);
        for (const m of página.mudanças) {
          if (mostradas >= MUDANÇAS_NA_TELA) break;
          mostradas++;
          const item = document.createElement('p');
          item.className = 't-1';
          const rótulo = document.createElement('strong');
          rótulo.textContent = `${m.tipo[0].toUpperCase()}${m.tipo.slice(1)}: `;
          item.append(rótulo);
          if (m.antes) item.append(`…${m.antes} `);
          if (m.antigo) {
            const velho = document.createElement('del');
            velho.textContent = abreviar(m.antigo);
            item.append(velho, ' ');
          }
          if (m.novo) {
            const nova = document.createElement('mark');
            nova.textContent = abreviar(m.novo);
            item.append(nova);
          }
          if (m.depois) item.append(` ${m.depois}…`);
          blocoDoRelatório.append(item);
        }
      }
      if (linhas.length > mostradas) {
        const mais = document.createElement('p');
        mais.className = 'pequeno suave';
        mais.textContent = `Mostrando ${número(mostradas)} de ${número(linhas.length)} mudanças. O relatório baixado e o texto copiado levam todas.`;
        blocoDoRelatório.append(mais);
      }
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Comparar PDFs',
      demorada: true,
      campos: [
        {
          nome: 'original', rótulo: 'PDF original (versão antiga)', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        { nome: 'novo', rótulo: 'PDF novo (versão alterada)', tipo: 'file' },
        { nome: 'caixa', rótulo: 'Ignorar maiúsculas e minúsculas', tipo: 'caixa', padrão: false },
      ],

      async calcular(dados) {
        esconderRelatório();
        const a = original.itens()[0];
        const b = novo.itens()[0];
        if (!a) throw new ErroDeEntrada(mensagemDeErroDeComparação('sem_original'), 'original');
        if (!b) throw new ErroDeEntrada(mensagemDeErroDeComparação('sem_novo'), 'novo');

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          progresso.andar(undefined, 'Lendo os arquivos…');
          const bytesA = new Uint8Array(await a.arquivo.arrayBuffer());
          const bytesB = new Uint8Array(await b.arquivo.arrayBuffer());

          const r = await compararPdfs({ nome: a.nome, bytes: bytesA }, { nome: b.nome, bytes: bytesB }, {
            abrir: abrirComPdfjsParaTexto, ignorarCaixa: dados.caixa === 'sim', cancelado: execução.cancelado,
            aoProgredir: ({ etapa, página, total }) => {
              if (etapa === 'original') progresso.andar(100 * página / total, `Lendo o original: página ${número(página)} de ${número(total)}`);
              else if (etapa === 'novo') progresso.andar(100 * página / total, `Lendo o novo: página ${número(página)} de ${número(total)}`);
              else progresso.andar(undefined, 'Comparando as páginas…');
            },
          });

          if (!r.ok) {
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            if (r.erro === 'leitor_indisponível') throw new Error(mensagemDeErroDeComparação(r.erro));
            const nome = r.extras?.nome ?? '';
            throw new ErroDeEntrada(mensagemDeErroDeComparação(r.erro, { nome, ...r.extras }), campoDoErro(r.erro, r.extras));
          }

          const s = r.resumo;
          const relatório = relatórioEmTexto(r);
          const base = nomeDeArquivo(`comparacao-${a.nome.replace(/\.pdf$/i, '')}-${b.nome.replace(/\.pdf$/i, '')}`) || 'comparacao';
          desenharRelatório(r);
          blocoDoRelatório.hidden = false;

          const observações = [];
          const vazias = [...r.semTexto.original.map((p) => `original ${p}`), ...r.semTexto.novo.map((p) => `novo ${p}`)];
          if (vazias.length) {
            observações.push(`Há páginas sem texto (${listaDePáginas(vazias, 8)}): podem ser imagens escaneadas, que esta ferramenta não compara.`);
          }
          observações.push('Só o texto foi comparado: mudanças de imagem, cor ou layout não aparecem. Não há comparação visual.');
          observações.push('Os arquivos foram lidos no seu navegador e nada foi enviado. Os originais continuam intactos no seu aparelho.');

          return {
            valor: s.iguais ? 'Nenhuma diferença no texto' : `${número(s.totalDeMudanças)} ${s.totalDeMudanças === 1 ? 'diferença' : 'diferenças'} em ${textoDePáginas(s.páginasComDiferença)}`,
            resumo: `${a.nome} (${textoDePáginas(s.páginasA)}) × ${b.nome} (${textoDePáginas(s.páginasB)}).`,
            linhas: s.iguais ? [] : [
              ['Acréscimos', número(s.acréscimo)], ['Remoções', número(s.remoção)], ['Edições', número(s.edição)],
              ...(s.acrescentadas.length ? [['Páginas novas', listaDePáginas(s.acrescentadas)]] : []),
              ...(s.removidas.length ? [['Páginas que saíram', listaDePáginas(s.removidas)]] : []),
            ],
            texto: relatório,
            arquivos: [
              { rótulo: 'Baixar relatório (.txt)', ícone: 'baixar', gerar: () => baixar(relatório, `${base}.txt`, 'text/plain;charset=utf-8') },
              { rótulo: 'Baixar CSV', ícone: 'planilha', gerar: () => baixarCsv(linhasDoCsv(r), base) },
            ],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        const comuns = {
          rótuloDoBotão: 'Escolher PDF',
          accept: 'application/pdf,.pdf',
          textoDeSolte: 'Solte os PDFs para escolher.',
          validar: validarPdfDaEscolha,
          soltar: false,
          aoMudar: () => esconderRelatório(),
        };
        original = montarEscolhaDeArquivos(elemento, {
          ...comuns, campo: 'original', rótuloDaLista: 'PDF original',
          textoDoVazio: 'Nenhum PDF original escolhido ainda. Use o botão "Escolher PDF" ou arraste os dois arquivos para este quadro.',
        });
        novo = montarEscolhaDeArquivos(elemento, {
          ...comuns, campo: 'novo', rótuloDaLista: 'PDF novo',
          textoDoVazio: 'Nenhum PDF novo escolhido ainda. Use o botão "Escolher PDF".',
        });
        execução = prepararExecução(elemento, { escolha: [original, novo] });

        // Arrastar para qualquer ponto: com dois arquivos, o primeiro é o original; com um, ele vai para o campo que estiver livre.
        const temArquivos = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
        elemento.addEventListener('dragover', (e) => { if (temArquivos(e)) e.preventDefault(); });
        elemento.addEventListener('drop', (e) => {
          if (!temArquivos(e)) return;
          e.preventDefault();
          const arquivos = [...e.dataTransfer.files];
          if (arquivos.length >= 2) {
            original.adicionar([arquivos[0]]);
            novo.adicionar([arquivos[1]]);
          } else if (arquivos.length === 1) {
            (original.itens().length === 0 || novo.itens().length > 0 ? original : novo).adicionar(arquivos);
          }
        });

        blocoDoRelatório = document.createElement('div');
        blocoDoRelatório.className = 'prosa t-3';
        blocoDoRelatório.hidden = true;
        blocoDoRelatório.setAttribute('aria-label', 'Lista de mudanças');
        blocoDoRelatório.setAttribute('role', 'region');
        elemento.querySelector('#resultado').after(blocoDoRelatório);
        esconderRelatório = () => { if (blocoDoRelatório) blocoDoRelatório.hidden = true; };
        elemento.querySelector('#formulário').addEventListener('reset', esconderRelatório);
        elemento.querySelector('#campo-caixa').addEventListener('input', esconderRelatório);
      },
    });
  },
};
