// Sincronizado de compartilhado/scripts/orçamento/renderizar-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Monta a prévia visual do orçamento (papel com a identidade do site), usada na
// ferramenta, na impressão e na página que o cliente abre pelo link. Só textContent.
import { formatarCentavos } from '../formatação/formatar-centavos.js';
import { formatarNúmero } from '../formatação/formatar-número.js';
import { criarElemento } from '../interface/criar-elemento.js';
import { calcularTotaisDoOrçamento } from './calcular-totais-do-orçamento.js';
import { formatarDataDoOrçamento } from './formatar-data-do-orçamento.js';

function informação(rótulo, valor) {
  return valor ? criarElemento('div', { classe: 'orçamento-informação' }, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]) : null;
}

export function renderizarOrçamento(orçamento, { marca = orçamento.marca || '' } = {}) {
  const totais = calcularTotaisDoOrçamento(orçamento);
  const datas = formatarDataDoOrçamento(orçamento);
  const linhas = totais.itens.map((item) =>
    criarElemento('tr', {}, [
      criarElemento('td', { texto: item.descrição }),
      criarElemento('td', { classe: 'número', texto: `${formatarNúmero(item.quantidade, { casas: 3 })} ${item.unidade}` }),
      criarElemento('td', { classe: 'número', texto: formatarCentavos(item.preçoUnitárioEmCentavos) }),
      criarElemento('td', { classe: 'número', texto: formatarCentavos(item.subtotalEmCentavos) }),
    ]),
  );
  const linhasDeTotal = [
    totais.descontoEmCentavos ? informação('Subtotal', formatarCentavos(totais.subtotalEmCentavos)) : null,
    totais.descontoEmCentavos ? informação('Desconto', `− ${formatarCentavos(totais.descontoEmCentavos)}`) : null,
    criarElemento('div', { classe: 'orçamento-informação orçamento-total' }, [criarElemento('dt', { texto: 'Total' }), criarElemento('dd', { texto: formatarCentavos(totais.totalEmCentavos) })]),
  ];

  return criarElemento('article', { classe: 'documento-de-orçamento evitar-quebra', atributos: { 'aria-label': `Orçamento: ${orçamento.título}` } }, [
    criarElemento('header', { classe: 'orçamento-topo' }, [
      criarElemento('p', { classe: 'orçamento-marca logotipo', texto: marca }),
      criarElemento('p', { classe: 'orçamento-rótulo', texto: 'Orçamento' }),
    ]),
    criarElemento('h2', { classe: 'orçamento-título', texto: orçamento.título }),
    criarElemento('dl', { classe: 'orçamento-dados' }, [
      informação('Emitido por', orçamento.emissor.nome),
      informação('Contato', orçamento.emissor.contato),
      informação('Para', orçamento.cliente.nome),
      informação('Data', datas.emitidoEm),
      informação('Válido até', datas.válidoAté),
      informação('Prazo', orçamento.prazo),
    ]),
    criarElemento('div', { classe: 'tabela-rolável' }, [
      criarElemento('table', { classe: 'tabela orçamento-tabela' }, [
        criarElemento('thead', {}, [
          criarElemento('tr', {}, [
            criarElemento('th', { texto: 'Descrição', atributos: { scope: 'col' } }),
            criarElemento('th', { classe: 'número', texto: 'Quantidade', atributos: { scope: 'col' } }),
            criarElemento('th', { classe: 'número', texto: 'Preço unitário', atributos: { scope: 'col' } }),
            criarElemento('th', { classe: 'número', texto: 'Subtotal', atributos: { scope: 'col' } }),
          ]),
        ]),
        criarElemento('tbody', {}, linhas),
      ]),
    ]),
    criarElemento('dl', { classe: 'orçamento-totais' }, linhasDeTotal),
    orçamento.observações ? criarElemento('p', { classe: 'orçamento-observações', texto: orçamento.observações }) : null,
    criarElemento('p', { classe: 'orçamento-rodapé', texto: `Valores definidos por ${orçamento.emissor.nome}${marca ? `, com a ferramenta ${marca}` : ''}. Confira sempre com quem enviou.` }),
  ]);
}
