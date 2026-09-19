/**
 * Documento A4 com a identidade do portal.
 *
 * Reúne o que todo documento gerado aqui precisa ter e que o "imprimir do
 * navegador" não entrega: margem correta, faixa de cabeçalho, quebra de página
 * que não corta linha no meio, rodapé numerado e tipografia legível.
 */
import { criarDocumentoPdf } from '../pdf/criar-documento-pdf.js';
import { quebrarTextoEmLinhas } from '../pdf/quebrar-texto-em-linhas.js';

const MARGEM = 18;
const LARGURA = 210;
const ALTURA = 297;
const COR_MARCA = '#9a3d28';
const COR_TEXTO = '#241c18';
const COR_SUAVE = '#6d5d55';

/**
 * Cria um documento com cabeçalho de marca, controle de página e rodapé.
 * @param {{título: string, subtítulo?: string, marca?: string, autor?: string}} opções
 */
export function montarDocumentoPdf({ título, subtítulo = '', marca = 'Ferramentas do Ander', autor = 'Anderson' }) {
  const pdf = criarDocumentoPdf({ título, autor, largura: LARGURA, altura: ALTURA });
  let y = 0;
  let página = 1;

  /** Escreve o rodapé da página corrente, antes de virar para a próxima. */
  function rodapé() {
    pdf.texto(LARGURA / 2, ALTURA - 10,
      `${marca} · página ${página} · gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      { tamanho: 7.5, cor: COR_SUAVE, alinhamento: 'centro' });
  }

  function cabeçalho() {
    pdf.retângulo(0, 0, LARGURA, 26, { preenchimento: COR_MARCA, contorno: false });
    pdf.texto(MARGEM, 11, marca, { tamanho: 9, cor: '#ffffff', negrito: true });
    pdf.texto(MARGEM, 19, título, { tamanho: 14, cor: '#ffffff', negrito: true });
    if (subtítulo) {
      pdf.texto(LARGURA - MARGEM, 19, subtítulo, { tamanho: 9, cor: '#f6e3dc', alinhamento: 'direita' });
    }
    y = 38;
  }

  function novaPágina() {
    rodapé();
    pdf.novaPágina();
    página += 1;
    cabeçalho();
  }

  /** Garante espaço antes de desenhar; quebra a página quando não cabe. */
  function reservar(altura) {
    if (y + altura > ALTURA - 20) novaPágina();
  }

  cabeçalho();

  return {
    /** @param {string} conteúdo @param {{tamanho?: number, negrito?: boolean, cor?: string, espaço?: number}} [opções] */
    parágrafo(conteúdo, { tamanho = 10, negrito = false, cor = COR_TEXTO, espaço = 2 } = {}) {
      const linhas = quebrarTextoEmLinhas(
        String(conteúdo), LARGURA - MARGEM * 2,
        (t) => pdf.larguraDoTexto(t, tamanho, negrito),
      );
      for (const linha of linhas) {
        reservar(tamanho * 0.5);
        pdf.texto(MARGEM, y, linha, { tamanho, negrito, cor });
        y += tamanho * 0.48;
      }
      y += espaço;
      return this;
    },

    /** Título de seção com régua embaixo. */
    seção(nome) {
      reservar(14);
      y += 3;
      pdf.texto(MARGEM, y, nome, { tamanho: 11, negrito: true, cor: COR_MARCA });
      y += 2;
      pdf.linha(MARGEM, y, LARGURA - MARGEM, y, { cor: '#e2d5c7', espessura: 0.3 });
      y += 5;
      return this;
    },

    /** Par rótulo/valor em duas colunas. */
    campo(rótulo, valor) {
      reservar(7);
      pdf.texto(MARGEM, y, rótulo, { tamanho: 8.5, cor: COR_SUAVE });
      pdf.texto(MARGEM + 45, y, String(valor), { tamanho: 10, cor: COR_TEXTO });
      y += 6;
      return this;
    },

    /**
     * Tabela com cabeçalho repetido em cada página.
     * @param {string[]} cabeçalhoDaTabela
     * @param {(string|number)[][]} linhas
     * @param {number[]} larguras em milímetros, somando a largura útil
     */
    tabela(cabeçalhoDaTabela, linhas, larguras) {
      const útil = LARGURA - MARGEM * 2;
      const total = larguras.reduce((a, b) => a + b, 0);
      const colunas = larguras.map((l) => (l / total) * útil);

      const desenharCabeçalho = () => {
        pdf.retângulo(MARGEM, y - 4, útil, 7, { preenchimento: '#f1e8de', contorno: false });
        let x = MARGEM + 2;
        cabeçalhoDaTabela.forEach((célula, i) => {
          const direita = i > 0;
          pdf.texto(direita ? x + colunas[i] - 4 : x, y, String(célula), {
            tamanho: 8.5, negrito: true, cor: COR_SUAVE, alinhamento: direita ? 'direita' : 'esquerda',
          });
          x += colunas[i];
        });
        y += 7;
      };

      reservar(16);
      desenharCabeçalho();

      for (const linha of linhas) {
        if (y + 7 > ALTURA - 20) { novaPágina(); desenharCabeçalho(); }
        let x = MARGEM + 2;
        linha.forEach((célula, i) => {
          const direita = i > 0;
          pdf.texto(direita ? x + colunas[i] - 4 : x, y, String(célula), {
            tamanho: 9, cor: COR_TEXTO, alinhamento: direita ? 'direita' : 'esquerda',
          });
          x += colunas[i];
        });
        y += 5.5;
        pdf.linha(MARGEM, y - 1.5, LARGURA - MARGEM, y - 1.5, { cor: '#efe7dd', espessura: 0.2 });
      }
      y += 3;
      return this;
    },

    /** Caixa de destaque, usada para o total. */
    destaque(rótulo, valor) {
      reservar(18);
      pdf.retângulo(MARGEM, y - 3, LARGURA - MARGEM * 2, 14, { preenchimento: '#f6e3dc', contorno: false });
      pdf.texto(MARGEM + 4, y + 5, rótulo, { tamanho: 10, negrito: true, cor: COR_MARCA });
      pdf.texto(LARGURA - MARGEM - 4, y + 5, String(valor), {
        tamanho: 13, negrito: true, cor: COR_MARCA, alinhamento: 'direita',
      });
      y += 18;
      return this;
    },

    /** Linha de assinatura com nome embaixo. */
    assinatura(nome) {
      reservar(24);
      y += 12;
      pdf.linha(MARGEM + 25, y, LARGURA - MARGEM - 25, y, { cor: COR_TEXTO, espessura: 0.3 });
      y += 5;
      pdf.texto(LARGURA / 2, y, nome, { tamanho: 9, cor: COR_SUAVE, alinhamento: 'centro' });
      y += 8;
      return this;
    },

    /** Avança o cursor verticalmente. */
    espaço(milímetros) { y += milímetros; return this; },

    /** Fecha o documento e devolve os bytes. */
    gerarBytes() {
      rodapé();
      return pdf.gerarBytes();
    },
  };
}
