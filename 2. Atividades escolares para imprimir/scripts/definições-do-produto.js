// Coleções que o Folha Pronta guarda no aparelho (página Salvos, exportação e importação).
import { validarCaçaPalavrasSalvo } from './validação/validar-caça-palavras-salvo.js';
import { validarCaligrafiaSalva } from './validação/validar-caligrafia-salva.js';
import { validarOperaçõesSalvas } from './validação/validar-operações-salvas.js';
import { validarTabuadaSalva } from './validação/validar-tabuada-salva.js';
import { validarBingoSalvo } from './validação/validar-bingo-salvo.js';
import { validarPapelQuadriculadoSalvo } from './validação/validar-papel-quadriculado-salvo.js';
import { validarFlashcardsSalvo } from './validação/validar-flashcards-salvo.js';
import { validarPlanejadorDeEstudosSalvo } from './validação/validar-planejador-de-estudos-salvo.js';

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
  {
    chave: 'bingo-de-números',
    rótulo: 'Bingos de números',
    rótuloSingular: 'bingo de números',
    páginaDeEdição: 'páginas/bingo-de-números.html',
    descrever: (registro) => `${registro.nome} — ${registro.quantidadeDeCartelas} cartela(s) ${registro.tamanhoDaGrade}×${registro.tamanhoDaGrade}, de ${registro.intervaloMínimo} a ${registro.intervaloMáximo}`,
    validar: validarBingoSalvo,
  },
  {
    chave: 'papel-quadriculado',
    rótulo: 'Papéis quadriculados',
    rótuloSingular: 'papel quadriculado',
    páginaDeEdição: 'páginas/papel-quadriculado.html',
    descrever: (registro) => `${registro.nome} — quadrícula ${registro.tamanhoDaQuadrículaMm} mm`,
    validar: validarPapelQuadriculadoSalvo,
  },
  {
    chave: 'flashcards',
    rótulo: 'Flashcards',
    rótuloSingular: 'jogo de flashcards',
    páginaDeEdição: 'páginas/flashcards.html',
    descrever: (registro) => `${registro.nome} — ${registro.pares.length} par(es)`,
    validar: validarFlashcardsSalvo,
  },
  {
    chave: 'planejador-de-estudos',
    rótulo: 'Planejadores de estudos',
    rótuloSingular: 'planejador de estudos',
    páginaDeEdição: 'páginas/planejador-de-estudos.html',
    descrever: (registro) => `${registro.nome} — ${registro.disciplinas.length} disciplina(s)`,
    validar: validarPlanejadorDeEstudosSalvo,
  },
];
