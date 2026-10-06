/**
 * Criador de gráficos: barras, barras horizontais, linhas e pizza a partir de uma tabela colada ou de um CSV.
 *
 * O gráfico é desenhado em SVG pelo próprio portal (sem biblioteca de gráficos) e exportado em SVG e PNG. Os dados
 * nunca saem do navegador. A tela mostra, junto do gráfico, uma tabela com os mesmos números: é a alternativa para
 * quem usa leitor de tela e a conferência de quem quer ver o que foi lido.
 */
import { montarFerramenta, ErroDeEntrada, baixar, avisar } from '../núcleo/montador.js';
import { ícone } from '../núcleo/ícones.js';
import { prepararEscolhaDeArquivos } from './auxiliares/escolher-arquivos-avançadas.js';
import { recusarSeNãoForTexto, decodificarTexto } from '../cálculos/converter-planilha.js';
import {
  LIMITES, TIPOS, TAMANHOS, FUNDOS, ErroDeGráfico, lerDados, prepararParaOTipo, desenharGráfico, tabelaDoGráfico, nomeDoArquivo,
} from '../cálculos/criador-de-graficos.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const BYTES_DO_ARQUIVO = 2 * 1024 * 1024;
/** O PNG sai com o dobro da resolução do SVG (nítido em tela de alta densidade), até este lado máximo. */
const LADO_MÁXIMO_DO_PNG = 4096;
const EXEMPLO = ['Mês;Vendas;Custos', 'Janeiro;1200;800', 'Fevereiro;1500;900', 'Março;1100;850', 'Abril;1800;1000'].join('\n');
const MENSAGEM_DO_ARQUIVO = 'Este arquivo não é um CSV de texto. Abra a planilha no Excel ou no LibreOffice, salve como CSV e escolha o arquivo salvo, ou copie as células e cole na caixa.';

/** Desenha o SVG pronto num canvas e devolve o PNG. */
async function svgParaPng(svg, largura, altura, fundo) {
  const escala = Math.max(1, Math.min(2, LADO_MÁXIMO_DO_PNG / Math.max(largura, altura)));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const imagem = new Image();
    imagem.decoding = 'sync';
    await new Promise((resolver, rejeitar) => {
      imagem.onload = resolver;
      imagem.onerror = () => rejeitar(new Error('O navegador não conseguiu ler o SVG como imagem.'));
      imagem.src = url;
    });
    const tela = document.createElement('canvas');
    tela.width = Math.round(largura * escala);
    tela.height = Math.round(altura * escala);
    const contexto = tela.getContext('2d');
    contexto.fillStyle = fundo;
    contexto.fillRect(0, 0, tela.width, tela.height);
    contexto.drawImage(imagem, 0, 0, tela.width, tela.height);
    const png = await new Promise((resolver) => { tela.toBlob(resolver, 'image/png'); });
    if (!png) throw new Error('O navegador não conseguiu gravar o PNG.');
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default {
  instruções: {
    passos: [
      'Cole os dados na caixa (dá para copiar as células direto do Excel ou do Google Planilhas) ou escolha um arquivo CSV. A primeira coluna traz os nomes (meses, produtos…) e as outras, os valores. Se quiser ver como fica, toque em "Preencher com um exemplo".',
      'Escolha o tipo de gráfico (barras, barras horizontais, linhas ou pizza), dê um título e, se quiser, nomes para os eixos e uma unidade, como R$ ou %.',
      'Toque em "Criar gráfico". Ele aparece na tela, com a tabela dos mesmos números logo depois. Mudou uma opção? O gráfico se atualiza sozinho.',
      'Baixe em PNG (para slide, post ou documento) ou em SVG (desenho vetorial, que não perde nitidez ao ampliar).',
    ],
    exemplo: {
      texto: 'Os dados "Mês;Vendas;Custos" com as linhas "Janeiro;1200;800", "Fevereiro;1500;900", "Março;1100;850" e "Abril;1800;1000" viram um gráfico de barras com 4 meses e 2 séries (Vendas e Custos), '
        + 'eixo de 0 a 2.000, valores escritos em cada barra e legenda. Em gráfico de pizza, "Aluguel;1500", "Mercado;900" e "Lazer;600" viram fatias de 50,0%, 30,0% e 20,0%.',
    },
    limites: `Até ${LIMITES.linhas} linhas, ${LIMITES.séries} colunas de valores (séries) e ${(LIMITES.caracteres / 1000).toLocaleString('pt-BR')} mil caracteres; arquivo CSV de até ${BYTES_DO_ARQUIVO / 1024 / 1024} MB. `
      + `Barras comportam até ${LIMITES.categoriasNasBarras} categorias (para mais, use linhas ou resuma os dados); a pizza comporta ${LIMITES.fatiasDaPizza} fatias, e as menores são somadas em "Outros". `
      + 'A pizza usa só a primeira coluna de valores e não aceita valor negativo nem total zero. '
      + 'Os números são lidos como se escrevem no Brasil: 1.234,56, R$ 1.234,56, 12% e (5) para -5. Célula vazia, "-" ou "n/d" é lacuna: no gráfico de linhas a linha é interrompida. Texto numa coluna de valores é erro, com a linha e a coluna. '
      + 'O primeiro campo da primeira linha é tratado como cabeçalho quando há texto onde deveria haver número; dá para forçar nas opções. '
      + 'Barras começam sempre em zero; linhas só não começam em zero quando todos os valores são parecidos, e a tela avisa. '
      + 'Se os valores escritos não cabem sobre as barras ou os pontos, nenhum é escrito (para não enganar), e a tabela traz todos. '
      + 'As cores têm contraste de pelo menos 3:1 com o fundo e, nas linhas, as séries também se distinguem pela forma do marcador. Não há gráfico de dispersão, de área nem eixo duplo. '
      + 'O gráfico é desenhado pelo portal, sem biblioteca; nada é enviado para fora.',
    perguntas: [
      { p: 'Meus dados são enviados para algum servidor?', r: 'Não. A tabela é lida e o gráfico é desenhado dentro do seu navegador. O PNG e o SVG são criados no seu aparelho.' },
      { p: 'Como copio os dados do Excel?', r: 'Selecione as células (incluindo a linha de títulos, se houver), copie com Ctrl+C e cole na caixa de dados. O portal reconhece as colunas separadas por tabulação.' },
      { p: 'Por que o gráfico de pizza só mostra uma coluna?', r: 'Porque a pizza reparte um total entre categorias. Para comparar várias colunas, use barras ou linhas.' },
      { p: 'Qual a diferença entre PNG e SVG?', r: 'O PNG é uma imagem pronta, boa para colar em slide, documento ou rede social. O SVG é um desenho vetorial: abre em editores de imagem e pode ser ampliado sem perder nitidez.' },
      { p: 'Os valores não aparecem escritos nas barras. Por quê?', r: 'Eles foram omitidos porque não cabem: com muitas barras estreitas, os números se sobreporiam. Escolha um tamanho maior, menos categorias ou barras horizontais. A tabela do resultado traz todos os valores.' },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let figura;
    let carregandoArquivo = false;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Criar gráfico',
      campos: [
        { nome: 'arquivo', rótulo: 'Arquivo CSV (opcional)', tipo: 'file', dica: `CSV, TSV ou texto, de até ${BYTES_DO_ARQUIVO / 1024 / 1024} MB. Ele é lido no seu navegador e vira o conteúdo da caixa abaixo.` },
        {
          nome: 'dados', rótulo: 'Dados (cole da planilha ou digite)', tipo: 'área', linhas: 8, exemplo: EXEMPLO,
          dica: `Primeira coluna: os nomes. Demais colunas: os valores. Até ${LIMITES.linhas} linhas e ${LIMITES.séries} colunas de valores.`,
        },
        {
          nome: 'tipo', rótulo: 'Tipo de gráfico', tipo: 'seleção', padrão: 'barras',
          opções: Object.entries(TIPOS).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        {
          nome: 'cabeçalho', rótulo: 'Primeira linha', tipo: 'seleção', padrão: 'auto',
          opções: [{ valor: 'auto', rótulo: 'Detectar se é cabeçalho' }, { valor: 'sim', rótulo: 'É o cabeçalho (nomes das colunas)' }, { valor: 'não', rótulo: 'É dado, não cabeçalho' }],
        },
        { nome: 'título', rótulo: 'Título do gráfico', tipo: 'text', exemplo: 'Vendas do primeiro quadrimestre' },
        { nome: 'rótuloX', rótulo: 'Nome do eixo horizontal', tipo: 'text', exemplo: 'Mês' },
        { nome: 'rótuloY', rótulo: 'Nome do eixo vertical', tipo: 'text', exemplo: 'Reais' },
        { nome: 'prefixo', rótulo: 'Antes dos valores', tipo: 'text', exemplo: 'R$', dica: 'Por exemplo: R$.' },
        { nome: 'sufixo', rótulo: 'Depois dos valores', tipo: 'text', exemplo: '%', dica: 'Por exemplo: %, kg, un.' },
        {
          nome: 'tamanho', rótulo: 'Tamanho da imagem', tipo: 'seleção', padrão: 'pequeno',
          opções: Object.entries(TAMANHOS).map(([valor, t]) => ({ valor, rótulo: t.rótulo })),
        },
        {
          nome: 'fundo', rótulo: 'Fundo do gráfico', tipo: 'seleção', padrão: 'claro',
          opções: Object.entries(FUNDOS).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        { nome: 'valores', rótulo: 'Escrever os valores no gráfico', tipo: 'caixa', padrão: true },
        { nome: 'legenda', rótulo: 'Mostrar a legenda (a pizza sempre mostra)', tipo: 'caixa', padrão: true },
        { nome: 'empilhar', rótulo: 'Empilhar as séries (só barras)', tipo: 'caixa', padrão: false },
      ],

      async calcular(dados) {
        figura.hidden = true;
        figura.replaceChildren();
        let r;
        let tabela;
        let preparado;
        try {
          const lido = lerDados(dados.dados, { cabeçalho: dados.cabeçalho });
          preparado = prepararParaOTipo(lido, dados.tipo);
          r = desenharGráfico(preparado, {
            tipo: dados.tipo, título: dados.título, rótuloX: dados.rótuloX, rótuloY: dados.rótuloY, prefixo: dados.prefixo, sufixo: dados.sufixo,
            tamanho: dados.tamanho, fundo: dados.fundo, valores: dados.valores !== 'não', legenda: dados.legenda !== 'não', empilhar: dados.empilhar === 'sim',
          });
          tabela = tabelaDoGráfico(preparado, dados.tipo, { prefixo: dados.prefixo, sufixo: dados.sufixo, rótuloDasCategorias: lido.rótuloDasCategorias });
          preparado.avisos.push(...r.avisos);
        } catch (erro) {
          if (erro instanceof ErroDeGráfico) throw new ErroDeEntrada(erro.message, erro.campo);
          throw erro;
        }

        // O desenho vem do próprio módulo de cálculo, com todo texto de fora já escapado; ainda assim entra como XML
        // (e não como HTML), então um texto estranho nunca vira marcação da página.
        const documento = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        if (documento.querySelector('parsererror')) throw new Error('O SVG gerado não é válido.');
        const svg = document.importNode(documento.documentElement, true);
        svg.setAttribute('focusable', 'false');
        figura.replaceChildren(svg);
        figura.hidden = false;

        const nome = (extensão) => nomeDoArquivo(dados.título, extensão);
        const fundo = dados.fundo === 'escuro' ? '#15171c' : '#ffffff';
        const comprimento = tabela.linhas.length;
        const observações = [...preparado.avisos];
        observações.push('A tabela traz os mesmos números do gráfico, para conferir e para quem usa leitor de tela.');
        observações.push('O gráfico foi desenhado no seu navegador; nada foi enviado.');
        return {
          valor: `Gráfico de ${TIPOS[dados.tipo].toLowerCase().replace(' (verticais)', '')}`,
          resumo: `${número(comprimento)} ${comprimento === 1 ? 'categoria' : 'categorias'}${dados.tipo === 'pizza' ? '' : ` × ${número(preparado.séries.length)} ${preparado.séries.length === 1 ? 'série' : 'séries'}`} · ${r.largura} × ${r.altura} px.`,
          linhas: [['Tipo', TIPOS[dados.tipo]], ['Tamanho', `${r.largura} × ${r.altura} px`]],
          texto: [tabela.cabeçalho, ...tabela.linhas].map((l) => l.join('\t')).join('\n'),
          tabela: { cabeçalho: tabela.cabeçalho, linhas: tabela.linhas },
          arquivos: [
            {
              rótulo: 'Baixar PNG', ícone: 'imagem',
              gerar: () => {
                svgParaPng(r.svgParaArquivo, r.largura, r.altura, fundo)
                  .then((png) => baixar(png, nome('png'), 'image/png'))
                  .catch((erro) => { console.error(erro); avisar('Não foi possível gerar o PNG neste navegador. Baixe o SVG.'); });
              },
            },
            { rótulo: 'Baixar SVG', ícone: 'baixar', gerar: () => baixar(r.svgParaArquivo, nome('svg'), 'image/svg+xml') },
          ],
          observações,
        };
      },

      aoMontar(elemento, recalcular) {
        const formulário = elemento.querySelector('#formulário');
        const resultado = elemento.querySelector('#resultado');
        const campo = (nome) => elemento.querySelector(`#campo-${CSS.escape(nome)}`);
        const grupo = (nome) => campo(nome).closest('.campo');

        figura = document.createElement('figure');
        figura.className = 'painel t-3';
        figura.hidden = true;
        figura.setAttribute('aria-label', 'Gráfico criado');
        Object.assign(figura.style, { margin: '14px 0 0', padding: '8px' });
        resultado.before(figura);

        escolha = prepararEscolhaDeArquivos(elemento, {
          aceitar: '.csv,.tsv,.tab,.txt,text/csv,text/tab-separated-values,text/plain',
          rótuloDoBotão: 'Escolher arquivo CSV',
          rótuloParaTrocar: 'Escolher outro arquivo',
          ícone: 'planilha',
          textoDoVazio: 'Nenhum arquivo escolhido. Você pode colar os dados na caixa abaixo, ou arrastar um CSV para este quadro.',
          textoDeSolte: 'Solte o arquivo para ler os dados.',
          async conferir(arquivo) {
            if (arquivo.size === 0) return { ok: false, mensagem: 'O arquivo está vazio.' };
            if (arquivo.size > BYTES_DO_ARQUIVO) return { ok: false, mensagem: `O arquivo passa de ${BYTES_DO_ARQUIVO / 1024 / 1024} MB. Resuma a tabela: um gráfico legível tem poucas dezenas de pontos.` };
            const bytes = new Uint8Array(await arquivo.arrayBuffer());
            if (recusarSeNãoForTexto(bytes)) return { ok: false, mensagem: MENSAGEM_DO_ARQUIVO };
            const { texto } = decodificarTexto(bytes);
            return { ok: true, detalhe: `${número(texto.split(/\r?\n/).length)} linhas`, dados: { texto } };
          },
          aoMudar(lista) {
            if (carregandoArquivo || !lista.length) return;
            // O arquivo vira o conteúdo da caixa (dá para conferir e editar) e a lista de arquivos se esvazia.
            carregandoArquivo = true;
            campo('dados').value = lista[0].dados.texto;
            avisar(`"${lista[0].nome}" carregado na caixa de dados.`);
            escolha.limpar();
            carregandoArquivo = false;
            recalcular();
          },
        });

        // Exemplo para quem quer ver o resultado antes de preparar os próprios dados.
        const botãoDeExemplo = document.createElement('button');
        botãoDeExemplo.type = 'button';
        botãoDeExemplo.className = 'botão botão--linha t-1';
        botãoDeExemplo.innerHTML = `${ícone('lista')}Preencher com um exemplo`;
        botãoDeExemplo.addEventListener('click', () => {
          campo('dados').value = EXEMPLO;
          campo('dados').focus();
          avisar('Exemplo preenchido. Toque em "Criar gráfico".');
        });
        grupo('dados').append(botãoDeExemplo);

        // Só aparecem as opções que valem para o tipo escolhido.
        const ajustar = () => {
          const tipo = campo('tipo').value;
          const eixos = tipo !== 'pizza';
          grupo('rótuloX').hidden = !eixos;
          grupo('rótuloY').hidden = !eixos;
          grupo('empilhar').hidden = tipo !== 'barras' && tipo !== 'barras-horizontais';
          grupo('legenda').hidden = tipo === 'pizza';
        };
        ajustar();
        formulário.addEventListener('reset', () => {
          setTimeout(ajustar, 0);
          figura.hidden = true;
          figura.replaceChildren();
        });
        // Mudou uma opção com o gráfico na tela: refaz, sem tirar o foco do campo.
        formulário.addEventListener('change', (evento) => {
          if (evento.target.type === 'file') return;
          ajustar();
          if (!resultado.hidden) recalcular({ focar: false });
        });
      },
    });
  },
};
