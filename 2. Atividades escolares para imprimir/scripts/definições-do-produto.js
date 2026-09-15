// Coleções que o Folha Pronta guarda no aparelho (página Salvos, exportação e importação).
import { validarCaçaPalavrasSalvo } from './validação/validar-caça-palavras-salvo.js';
import { validarCaligrafiaSalva } from './validação/validar-caligrafia-salva.js';
import { validarOperaçõesSalvas } from './validação/validar-operações-salvas.js';
import { validarTabuadaSalva } from './validação/validar-tabuada-salva.js';

export const coleçõesLocais = [
  {
    chave: 'operações-matemáticas',
    rótulo: 'Operações matemáticas',
    rótuloSingular: 'atividade de operações',
    páginaDeEdição: 'páginas/operações-matemáticas.html',
    descrever: (registro) => `${registro.nome} — ${registro.quantidade} questões (${registro.operadores.join(' ')})`,
    validar: validarOperaçõesSalvas,
  },
  {
    chave: 'tabuada',
    rótulo: 'Tabuadas',
    rótuloSingular: 'tabuada',
    páginaDeEdição: 'páginas/tabuada.html',
    descrever: (registro) => `${registro.nome} — fatores ${registro.fatores.join(', ')}`,
    validar: validarTabuadaSalva,
  },
  {
    chave: 'caça-palavras',
    rótulo: 'Caça-palavras',
    rótuloSingular: 'caça-palavras',
    páginaDeEdição: 'páginas/caça-palavras.html',
    descrever: (registro) => `${registro.nome} — ${registro.palavras.length} palavra${registro.palavras.length === 1 ? '' : 's'}, grade ${registro.linhas}×${registro.colunas}`,
    validar: validarCaçaPalavrasSalvo,
  },
  {
    chave: 'caligrafia',
    rótulo: 'Folhas de caligrafia',
    rótuloSingular: 'folha de caligrafia',
    páginaDeEdição: 'páginas/caligrafia.html',
    descrever: (registro) => `${registro.nome} — “${registro.texto}”, ${registro.quantidadeDeLinhas} linhas`,
    validar: validarCaligrafiaSalva,
  },
];
