// Coleções que o Ponto e Preço guarda no aparelho (página Salvos, exportação e importação).
import { validarEstoqueDeMaterialSalvo } from './validação/validar-estoque-de-material-salvo.js';
import { validarMaterialSalvo } from './validação/validar-material-salvo.js';
import { validarPeçaSalva } from './validação/validar-peça-salva.js';

const rótuloDaUnidade = (unidade) => ({ g: 'g', kg: 'kg', cm: 'cm', m: 'm', un: 'un.' })[unidade] ?? unidade;

export const coleçõesLocais = [
  {
    chave: 'materiais',
    rótulo: 'Custos de material',
    rótuloSingular: 'custo de material',
    páginaDeEdição: 'páginas/custo-do-material.html',
    descrever: (registro) => `${registro.nome} — ${registro.consumo}${rótuloDaUnidade(registro.unidadeConsumo)} de ${registro.quantidadeComprada}${rótuloDaUnidade(registro.unidadeComprada)}`,
    validar: validarMaterialSalvo,
  },
  {
    chave: 'peças',
    rótulo: 'Preços de peça',
    rótuloSingular: 'preço de peça',
    páginaDeEdição: 'páginas/preço-da-peça.html',
    descrever: (registro) => `${registro.nome} — ${registro.perfil}, conjunto de ${registro.quantidadeDoConjunto}`,
    validar: validarPeçaSalva,
  },
  {
    chave: 'estoqueDeMateriais',
    rótulo: 'Controle de materiais',
    rótuloSingular: 'controle de material',
    páginaDeEdição: 'páginas/controle-de-materiais.html',
    descrever: (registro) => `${registro.nome} — saldo inicial ${registro.saldoInicial}${rótuloDaUnidade(registro.unidade)}`,
    validar: validarEstoqueDeMaterialSalvo,
  },
];
