/** Pauta de reunião com duração total e PDF. */
import { montarFerramenta, texto, número, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { pdfDoResumo } from './auxiliares/resumo-de-custos.js';

export function organizarPauta(itens, inicioMinutos) {
  if (!Number.isSafeInteger(inicioMinutos) || inicioMinutos < 0 || inicioMinutos > 1439) {
    throw new ErroDeEntrada('Hora de início inválida.', 'inicio');
  }
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 50) {
    throw new ErroDeEntrada('Informe entre 1 e 50 assuntos.', 'assuntos');
  }
  let percorrido = 0;
  const linhaDoTempo = itens.map((item, indice) => {
    if (typeof item.assunto !== 'string' || !item.assunto.trim() || item.assunto.length > 120 ||
        typeof item.responsavel !== 'string' || !item.responsavel.trim() || item.responsavel.length > 100) {
      throw new ErroDeEntrada('Linha ' + (indice+1) + ': assunto e responsável são obrigatórios.', 'assuntos');
    }
    if (!Number.isSafeInteger(item.minutos) || item.minutos < 1 || item.minutos > 480) {
      throw new ErroDeEntrada('Linha ' + (indice+1) + ': duração inteira entre 1 e 480 minutos.', 'assuntos');
    }
    const inicio = inicioMinutos + percorrido;
    percorrido += item.minutos;
    if (percorrido > 1440) throw new ErroDeEntrada('A pauta ultrapassa 24 horas; reduza os tempos.', 'assuntos');
    return { ...item, inícioAbsoluto: inicio, términoAbsoluto: inicioMinutos + percorrido };
  });
  return { itens: linhaDoTempo, duracaoMinutos: percorrido, terminoAbsoluto: inicioMinutos + percorrido };
}

const hora = (minutos) => String(Math.floor(minutos / 60) % 24).padStart(2,'0') +
  ':' + String(minutos % 60).padStart(2,'0') + (minutos >= 1440 ? ' (+1 dia)' : '');

export function calcularPautaNaTela(dados) {
  const titulo = texto(dados, 'titulo', { rótulo: 'Assunto da reunião', máximo: 120 });
  const data = texto(dados, 'data', { rótulo: 'Data da reunião', máximo: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      Number.isNaN(Date.parse(data)) || new Date(data).toISOString().slice(0,10) !== data) {
    throw new ErroDeEntrada('Informe uma data real no formato AAAA-MM-DD.', 'data');
  }
  const inicio = texto(dados, 'inicio', { rótulo: 'Horário de início', máximo: 5 });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)) {
    throw new ErroDeEntrada('Horário no formato HH:MM.', 'inicio');
  }
  const linhas = String(dados.assuntos ?? '').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (linhas.length < 1 || linhas.length > 50) throw new ErroDeEntrada('Informe entre 1 e 50 assuntos.', 'assuntos');
  const itens = linhas.map((linha, i) => {
    const p=linha.split(';').map(s=>s.trim());
    if (p.length !== 3) throw new ErroDeEntrada('Linha '+(i+1)+': assunto; responsável; minutos.', 'assuntos');
    const minutos = paraNúmero(p[2]);
    return { assunto: p[0], responsavel: p[1], minutos };
  });
  const inicioMinutos = Number(inicio.slice(0,2))*60 + Number(inicio.slice(3,5));
  const r = organizarPauta(itens, inicioMinutos);
  const tabela = { cabeçalho: ['Início', 'Fim', 'Assunto', 'Responsável', 'Minutos'],
    linhas: r.itens.map(it => [hora(it.inícioAbsoluto),hora(it.términoAbsoluto),it.assunto,it.responsavel,String(it.minutos)]) };
  const observações = ['Horários são estimados sem intervalos, atrasos ou deslocamentos.',
    'A pauta não convida participantes nem registra eventos no calendário.'];
  return {
    valor: r.duracaoMinutos + ' minutos',
    resumo: titulo + ' · início ' + inicio + ' · término ' + hora(r.terminoAbsoluto) + '.',
    linhas: [['Data', data], ['Assuntos', String(r.itens.length)],
      ['Duração total', r.duracaoMinutos + ' minutos'], ['Término previsto', hora(r.terminoAbsoluto)]],
    tabela, observações,
    texto: ['Pauta: ' + titulo, 'Data: ' + data, tabela.cabeçalho.join('; '),
      ...tabela.linhas.map(l => l.join('; ')), ...observações].join('\n'),
    arquivos: [{ rótulo: 'Pauta em PDF', ícone: 'documento',
      gerar: () => baixar(pdfDoResumo({
        título: 'Pauta de reunião', subtítulo: titulo + ' · ' + data,
        destaque: ['Duração total',r.duracaoMinutos + ' minutos'],
        resultados: [['Início',inicio],['Término previsto',hora(r.terminoAbsoluto)]],
        dados: r.itens.map((it,i)=>[String(i+1)+'. '+it.assunto, hora(it.inícioAbsoluto)+' - '+hora(it.términoAbsoluto)+' · '+it.responsavel]),
        conta: observações,
      }),nomeDeArquivo('pauta-de-reuniao')+'.pdf','application/pdf') }],
  };
}

export default {
  instruções: {
    passos: [
      'Informe o assunto, a data e o horário de início da reunião.',
      'Escreva uma linha por item: assunto; responsável; duração em minutos.',
      'Confira os horários previstos e a soma da reunião.',
      'Baixe PDF ou exporte a tabela em CSV/Excel.',
    ],
    exemplo: { texto: 'Começando às 09:00, um tópico de 20 minutos e outro de 40 terminam às 10:00.' },
    limites: 'Até 50 assuntos, cada um com 1 a 480 minutos. A duração total não pode ultrapassar 24 horas. Os horários são estimativas sem intervalos automáticos.',
    perguntas: [
      { p: 'A ferramenta agenda a reunião?', r: 'Não. Ela cria um roteiro com horários estimados.' },
      { p: 'Posso salvar como planilha?', r: 'Sim. A tabela do resultado tem exportação em CSV e Excel.' },
    ],
  },
  montar(raiz,ferramenta) {
    montarFerramenta(raiz,ferramenta,{ rótuloDaAção:'Organizar pauta',
      campos: [
        {nome:'titulo',rótulo:'Assunto da reunião',padrão:'Reunião semanal da equipe'},
        {nome:'data',rótulo:'Data da reunião',tipo:'date',padrão:new Date().toLocaleDateString('sv-SE')},
        {nome:'inicio',rótulo:'Horário de início (HH:MM)',padrão:'09:00'},
        {nome:'assuntos',rótulo:'Assuntos, responsáveis e minutos',tipo:'área',linhas:6,
         padrão:'Resultados da semana; Gerência; 20\nPlanejamento; Equipe; 40',
         dica:'Uma linha por tópico: assunto; responsável; duração em minutos.'},
      ],calcular:calcularPautaNaTela});
  },
};
