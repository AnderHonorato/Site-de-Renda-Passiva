// Coleções que o Dobra & Cola guarda no aparelho (página Salvos, exportação e importação).
// Cada gerador de molde tem a sua própria coleção — todas fazem parte do mesmo conceito de
// "moldes salvos", mas precisam de páginas de edição diferentes ao reabrir com ?registro=.
import { validarAproveitamentoSalvo } from './validação/validar-aproveitamento-salvo.js';
import { validarCaixaComTampaSalva } from './validação/validar-caixa-com-tampa-salva.js';
import { validarCaixaRetangularSalva } from './validação/validar-caixa-retangular-salva.js';
import { validarCintaSalva } from './validação/validar-cinta-salva.js';
import { validarDivisóriasSalvas } from './validação/validar-divisórias-salvas.js';
import { validarEnvelopeSalvo } from './validação/validar-envelope-salvo.js';
import { validarEtiquetasSalvas } from './validação/validar-etiquetas-salvas.js';
import { validarSacoDePapelSalvo } from './validação/validar-saco-de-papel-salvo.js';

export const coleçõesLocais = [
  {
    chave: 'caixa-retangular',
    rótulo: 'Caixas retangulares',
    rótuloSingular: 'caixa retangular',
    páginaDeEdição: 'páginas/caixa-retangular.html',
    descrever: (registro) => `${registro.nome} — ${registro.comprimentoInternoMm}×${registro.larguraInternoMm}×${registro.alturaInternoMm} mm (interno)`,
    validar: validarCaixaRetangularSalva,
  },
  {
    chave: 'caixa-com-tampa',
    rótulo: 'Caixas com tampa',
    rótuloSingular: 'caixa com tampa',
    páginaDeEdição: 'páginas/caixa-com-tampa.html',
    descrever: (registro) => `${registro.nome} — base ${registro.comprimentoInternoMm}×${registro.larguraInternoMm} mm, folga ${registro.folgaMm} mm`,
    validar: validarCaixaComTampaSalva,
  },
  {
    chave: 'envelope',
    rótulo: 'Envelopes',
    rótuloSingular: 'envelope',
    páginaDeEdição: 'páginas/envelope.html',
    descrever: (registro) => `${registro.nome} — para conteúdo de ${registro.larguraDoConteúdoMm}×${registro.alturaDoConteúdoMm} mm`,
    validar: validarEnvelopeSalvo,
  },
  {
    chave: 'etiquetas',
    rótulo: 'Folhas de etiquetas',
    rótuloSingular: 'folha de etiquetas',
    páginaDeEdição: 'páginas/etiquetas.html',
    descrever: (registro) => `${registro.nome} — etiquetas de ${registro.larguraDaEtiquetaMm}×${registro.alturaDaEtiquetaMm} mm`,
    validar: validarEtiquetasSalvas,
  },
  {
    chave: 'cinta',
    rótulo: 'Cintas para embalagem',
    rótuloSingular: 'cinta',
    páginaDeEdição: 'páginas/cinta-para-embalagem.html',
    descrever: (registro) => `${registro.nome} — perímetro ${registro.perímetroMm} mm + sobreposição ${registro.sobreposiçãoMm} mm`,
    validar: validarCintaSalva,
  },
  {
    chave: 'divisórias',
    rótulo: 'Divisórias de caixa',
    rótuloSingular: 'grade de divisórias',
    páginaDeEdição: 'páginas/divisórias-de-caixa.html',
    descrever: (registro) => `${registro.nome} — grade ${registro.linhas}×${registro.colunas}`,
    validar: validarDivisóriasSalvas,
  },
  {
    chave: 'saco-de-papel',
    rótulo: 'Sacos de papel',
    rótuloSingular: 'saco de papel',
    páginaDeEdição: 'páginas/saco-de-papel.html',
    descrever: (registro) => `${registro.nome} — ${registro.larguraMm}×${registro.profundidadeMm}×${registro.alturaMm} mm`,
    validar: validarSacoDePapelSalvo,
  },
  {
    chave: 'aproveitamento-de-folha',
    rótulo: 'Aproveitamentos de folha',
    rótuloSingular: 'aproveitamento de folha',
    páginaDeEdição: 'páginas/aproveitamento-de-folha.html',
    descrever: (registro) => `${registro.nome} — peça ${registro.larguraDaPeçaMm}×${registro.alturaDaPeçaMm} mm`,
    validar: validarAproveitamentoSalvo,
  },
];
