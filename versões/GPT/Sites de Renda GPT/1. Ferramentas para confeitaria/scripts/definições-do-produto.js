// Coleções que o Doce Ofício guarda no aparelho (página Salvos, exportação e importação).
import { validarPrecificaçãoSalva } from './validação/validar-precificação-salva.js';
import { validarRegistroDeReceita } from './validação/validar-registro-de-receita.js';

export const coleçõesLocais = [
  {
    chave: 'receitas',
    rótulo: 'Receitas',
    rótuloSingular: 'receita',
    páginaDeEdição: 'páginas/custo-da-receita.html',
    descrever: (registro) => `${registro.nome} — rende ${registro.rendimentoAproveitável} unidade${registro.rendimentoAproveitável === 1 ? '' : 's'}`,
    validar: validarRegistroDeReceita,
  },
  {
    chave: 'precificações',
    rótulo: 'Preços de venda',
    rótuloSingular: 'preço de venda',
    páginaDeEdição: 'páginas/preço-de-venda.html',
    descrever: (registro) => `${registro.nome} — ${registro.quantidade} unidade${registro.quantidade === 1 ? '' : 's'}, margem de ${String(registro.margemPercentual).replace('.', ',')}%`,
    validar: validarPrecificaçãoSalva,
  },
];
