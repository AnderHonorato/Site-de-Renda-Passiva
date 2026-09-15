// Coleções que a Demão Certa guarda no aparelho (página Salvos, exportação e importação).
import { validarCômodoSalvo } from './validação/validar-cômodo-salvo.js';
import { validarCálculoDeTintaSalvo } from './validação/validar-cálculo-de-tinta-salvo.js';
import { validarPisoSalvo } from './validação/validar-piso-salvo.js';
import { validarRodapéSalvo } from './validação/validar-rodapé-salvo.js';

const formatarM2 = (valor) => `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`;

export const coleçõesLocais = [
  {
    chave: 'cômodos',
    rótulo: 'Áreas de paredes salvas',
    rótuloSingular: 'área de paredes',
    páginaDeEdição: 'páginas/área-de-paredes.html',
    descrever: (registro) => `${registro.nome} — ${registro.superfícies.length} superfície(s)`,
    validar: validarCômodoSalvo,
  },
  {
    chave: 'cálculosDeTinta',
    rótulo: 'Cálculos de tinta salvos',
    rótuloSingular: 'cálculo de tinta',
    páginaDeEdição: 'páginas/quantidade-de-tinta.html',
    descrever: (registro) => `${registro.nome} — ${formatarM2(registro.área)}, ${registro.demãos} demão(s)`,
    validar: validarCálculoDeTintaSalvo,
  },
  {
    chave: 'cálculosDePiso',
    rótulo: 'Cálculos de piso salvos',
    rótuloSingular: 'cálculo de piso',
    páginaDeEdição: 'páginas/piso-por-caixa.html',
    descrever: (registro) => `${registro.nome} — ${formatarM2(registro.área)}`,
    validar: validarPisoSalvo,
  },
  {
    chave: 'cálculosDeRodapé',
    rótulo: 'Cálculos de rodapé salvos',
    rótuloSingular: 'cálculo de rodapé',
    páginaDeEdição: 'páginas/rodapé.html',
    descrever: (registro) => `${registro.nome} — ${registro.lados.length} lado(s)`,
    validar: validarRodapéSalvo,
  },
];
