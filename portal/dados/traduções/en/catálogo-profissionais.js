import { especificacoes } from '../../profissionais.js';

export default Object.freeze(Object.fromEntries(especificacoes.map(s => [s.id, {
  nome: s.nomeEn,
  resumo: `${s.nomeEn}. Import files and export full reports.`,
  tags: [s.nomeEn, 'professional analysis', s.plano, 'file upload', s.dominio],
  intenções: ['Run ' + s.nomeEn.toLowerCase() + ' with uploaded data.'],
}])));
