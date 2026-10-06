/**
 * Preencher formulário em PDF: ler os campos AcroForm de um PDF e gravar os valores
 * (texto, caixas de marcar, botões de opção, listas), com a opção de achatar.
 *
 * "Achatar" transforma os campos preenchidos em conteúdo fixo da página: ninguém mais
 * edita, e os campos deixam de existir no arquivo. Sem achatar, o PDF continua preenchível.
 *
 * Formulários XFA (alguns documentos antigos de governo) não são suportados: lê-se só o
 * AcroForm. Sem DOM: a biblioteca pdf-lib entra por parâmetro, como nas outras ferramentas.
 */
import { carregarPdf, primeiroCaractereForaDaFonte, mensagemDeErroDoPdfÚnico, textoDePáginas } from './pdf-páginas.js';

export const LIMITE_DE_CAMPOS = 1000;
export const LIMITE_DO_VALOR = 10_000;

export function mensagemDeErroDeFormulário(erro, extras = {}) {
  const { campo = '', limite = 0, caractere = '', total = 0 } = extras;
  const mensagens = {
    sem_campos: `"${extras.nome ?? 'O arquivo'}" não tem campos de formulário para preencher. Só PDFs que já trazem campos (caixas de texto, de marcar, listas) funcionam aqui; `
      + 'esta ferramenta não cria campos nem escreve em qualquer lugar da página.',
    formulário_xfa: `"${extras.nome ?? 'O arquivo'}" é um formulário no formato XFA, que esta ferramenta não suporta. Abra o arquivo no leitor de PDF do fabricante do formulário ou peça uma versão em PDF comum.`,
    campos_demais: `O formulário tem ${total.toLocaleString('pt-BR')} campos. O limite é ${LIMITE_DE_CAMPOS.toLocaleString('pt-BR')}.`,
    valor_longo: `O campo "${campo}" aceita no máximo ${limite.toLocaleString('pt-BR')} caracteres.`,
    valor_caractere: `O campo "${campo}" tem o caractere "${caractere}", que a fonte do PDF não tem. Use letras, números e a pontuação comum.`,
    valor_inválido: `O valor do campo "${campo}" não é válido para esse tipo de campo.`,
    opção_inexistente: `O campo "${campo}" não tem a opção escolhida. Escolha uma da lista.`,
    campo_inexistente: `O PDF não tem o campo "${campo}".`,
    nada_para_preencher: 'Nenhum campo foi alterado. Preencha pelo menos um campo antes de gerar o PDF.',
    achatar_falhou: 'Não foi possível achatar os campos deste PDF. Gere o arquivo sem achatar.',
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/** @typedef {'texto'|'caixa'|'opções'|'lista'|'assinatura'|'botão'|'outro'} TipoDeCampo */

/** Tenta uma leitura que pode quebrar em PDF hostil; devolve o padrão se quebrar. */
function tentar(função, padrão) {
  try {
    return função();
  } catch {
    return padrão;
  }
}

/** Página (a partir de 1) de cada campo: acha o campo entre as anotações de cada página. */
function páginasDosCampos(documento, campos) {
  const porAnotação = new Map();
  tentar(() => documento.getPages().forEach((página, i) => {
    const anotações = página.node.Annots();
    if (!anotações) return;
    for (const ref of anotações.asArray()) {
      const dicionário = documento.context.lookup(ref);
      if (dicionário) porAnotação.set(dicionário, i + 1);
    }
  }), null);
  return campos.map((campo) => tentar(() => {
    for (const widget of campo.acroField.getWidgets()) {
      const página = porAnotação.get(widget.dict);
      if (página) return página;
    }
    return 0;
  }, 0));
}

/**
 * Descreve um campo para a tela.
 * @returns {{nome: string, tipo: TipoDeCampo, valor: any, opções: string[], multilinha: boolean, senha: boolean, tamanhoMáximo: number|null, somenteLeitura: boolean, obrigatório: boolean, múltipla: boolean, editável: boolean}}
 */
function descreverCampo(campo, b) {
  const base = {
    nome: campo.getName(),
    tipo: 'outro',
    valor: null,
    opções: [],
    multilinha: false,
    senha: false,
    tamanhoMáximo: null,
    somenteLeitura: tentar(() => campo.isReadOnly(), false),
    obrigatório: tentar(() => campo.isRequired(), false),
    múltipla: false,
    editável: false,
  };
  if (campo instanceof b.PDFTextField) {
    return {
      ...base,
      tipo: 'texto',
      valor: tentar(() => campo.getText() ?? '', ''),
      multilinha: tentar(() => campo.isMultiline(), false),
      senha: tentar(() => campo.isPassword(), false),
      tamanhoMáximo: tentar(() => campo.getMaxLength() ?? null, null),
    };
  }
  if (campo instanceof b.PDFCheckBox) return { ...base, tipo: 'caixa', valor: tentar(() => campo.isChecked(), false) };
  if (campo instanceof b.PDFRadioGroup) {
    return { ...base, tipo: 'opções', opções: tentar(() => campo.getOptions(), []), valor: tentar(() => campo.getSelected() ?? null, null) };
  }
  if (campo instanceof b.PDFDropdown) {
    return {
      ...base, tipo: 'lista', opções: tentar(() => campo.getOptions(), []), valor: tentar(() => campo.getSelected()[0] ?? null, null), editável: tentar(() => campo.isEditable(), false),
    };
  }
  if (campo instanceof b.PDFOptionList) {
    const múltipla = tentar(() => campo.isMultiselect(), false);
    const selecionadas = tentar(() => campo.getSelected(), []);
    return {
      ...base, tipo: 'lista', múltipla, opções: tentar(() => campo.getOptions(), []), valor: múltipla ? selecionadas : (selecionadas[0] ?? null),
    };
  }
  if (campo instanceof b.PDFSignature) return { ...base, tipo: 'assinatura' };
  if (campo instanceof b.PDFButton) return { ...base, tipo: 'botão' };
  return base;
}

function temXfa(documento, { PDFName }) {
  return tentar(() => {
    const acroForm = documento.catalog.lookup(PDFName.of('AcroForm'));
    return Boolean(acroForm?.has?.(PDFName.of('XFA')));
  }, false);
}

/**
 * Lê os campos do formulário.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{biblioteca: any}} opções
 * @returns {Promise<
 *   {ok: true, campos: ReturnType<typeof descreverCampo>[] & {página: number}[], páginas: number, avisos: string[], preenchíveis: number}
 *   | {ok: false, erro: string, extras: object}
 * >}
 */
export async function lerCamposDoFormulário(arquivo, { biblioteca }) {
  const aberto = await carregarPdf(arquivo, { biblioteca });
  if (!aberto.ok) return aberto;
  const { documento, páginas } = aberto;
  const xfa = temXfa(documento, biblioteca);

  let brutos;
  try {
    brutos = documento.getForm().getFields();
  } catch {
    brutos = [];
  }
  if (brutos.length === 0) return { ok: false, erro: xfa ? 'formulário_xfa' : 'sem_campos', extras: { nome: arquivo.nome } };
  if (brutos.length > LIMITE_DE_CAMPOS) return { ok: false, erro: 'campos_demais', extras: { nome: arquivo.nome, total: brutos.length } };

  const numeração = páginasDosCampos(documento, brutos);
  const campos = brutos.map((campo, i) => ({ ...descreverCampo(campo, biblioteca), página: numeração[i] }));

  const avisos = [];
  if (xfa) avisos.push('xfa');
  if (tentar(() => documento.catalog.lookup(biblioteca.PDFName.of('AcroForm'))?.has(biblioteca.PDFName.of('CO')), false)) avisos.push('calculado');
  if (tentar(() => brutos.some((c) => c instanceof biblioteca.PDFSignature && c.acroField.dict.has(biblioteca.PDFName.of('V'))), false)) avisos.push('assinado');
  const preenchíveis = campos.filter((c) => ['texto', 'caixa', 'opções', 'lista'].includes(c.tipo) && !c.somenteLeitura).length;
  return { ok: true, campos, páginas, avisos, preenchíveis };
}

const mesmoValor = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Preenche o formulário.
 *
 * `valores` mapeia o nome de cada campo (como em `lerCamposDoFormulário`) ao valor novo:
 * texto para campos de texto e listas, `true`/`false` para caixas, o nome da opção (ou
 * `null` para limpar) para botões de opção, e uma lista de opções para listas de várias
 * escolhas. Campos que não aparecem em `valores`, ou cujo valor não mudou, não são tocados.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   biblioteca: any, valores: Record<string, any>, achatar?: boolean,
 *   aoProgredir?: (p: {campo: number, total: number}) => void, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, alterados: string[], ignorados: string[], páginas: number, achatado: boolean, avisos: string[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function preencherFormulário(arquivo, { biblioteca, valores, achatar = false, aoProgredir, cancelado }) {
  const b = biblioteca;
  const aberto = await carregarPdf(arquivo, { biblioteca });
  if (!aberto.ok) return aberto;
  const { documento, páginas } = aberto;
  const xfa = temXfa(documento, b);

  let formulário;
  let campos;
  try {
    formulário = documento.getForm();
    campos = formulário.getFields();
  } catch {
    campos = [];
  }
  if (campos.length === 0) return { ok: false, erro: xfa ? 'formulário_xfa' : 'sem_campos', extras: { nome: arquivo.nome } };
  if (campos.length > LIMITE_DE_CAMPOS) return { ok: false, erro: 'campos_demais', extras: { nome: arquivo.nome, total: campos.length } };

  const porNome = new Map(campos.map((c) => [c.getName(), c]));
  for (const nome of Object.keys(valores ?? {})) {
    if (!porNome.has(nome)) return { ok: false, erro: 'campo_inexistente', extras: { campo: nome } };
  }

  // Valida tudo antes de gravar qualquer coisa: o arquivo nunca sai pela metade.
  const tarefas = [];
  const ignorados = [];
  for (const campo of campos) {
    const nome = campo.getName();
    if (!(nome in (valores ?? {}))) continue;
    const descrição = descreverCampo(campo, b);
    const novo = valores[nome];
    if (descrição.somenteLeitura || descrição.tipo === 'assinatura' || descrição.tipo === 'botão' || descrição.tipo === 'outro') {
      ignorados.push(nome);
      continue;
    }
    const agendar = (aplicar) => tarefas.push({ campo: nome, aplicar });
    const falha = (erro, mais = {}) => ({ ok: false, erro, extras: { campo: nome, ...mais } });
    if (descrição.tipo === 'texto') {
      if (typeof novo !== 'string') return falha('valor_inválido');
      const texto = novo.normalize('NFC');
      const limite = Math.min(LIMITE_DO_VALOR, descrição.tamanhoMáximo ?? LIMITE_DO_VALOR);
      if (texto.length > limite) return falha('valor_longo', { limite });
      const fora = primeiroCaractereForaDaFonte(texto);
      if (fora !== null) return falha('valor_caractere', { caractere: fora });
      if (!mesmoValor(texto, descrição.valor)) agendar(() => campo.setText(texto === '' ? undefined : texto));
    } else if (descrição.tipo === 'caixa') {
      if (typeof novo !== 'boolean') return falha('valor_inválido');
      if (novo !== descrição.valor) agendar(() => (novo ? campo.check() : campo.uncheck()));
    } else if (descrição.tipo === 'opções') {
      if (novo !== null && typeof novo !== 'string') return falha('valor_inválido');
      if (novo !== null && !descrição.opções.includes(novo)) return falha('opção_inexistente');
      if (novo !== descrição.valor) agendar(() => (novo === null ? campo.clear() : campo.select(novo)));
    } else if (descrição.múltipla) {
      if (!Array.isArray(novo) || novo.some((o) => typeof o !== 'string')) return falha('valor_inválido');
      if (novo.some((o) => !descrição.opções.includes(o))) return falha('opção_inexistente');
      const atual = [...descrição.valor].sort();
      if (!mesmoValor([...novo].sort(), atual)) agendar(() => (novo.length ? campo.select(novo) : campo.clear()));
    } else {
      if (novo !== null && typeof novo !== 'string') return falha('valor_inválido');
      if (novo !== null && !descrição.opções.includes(novo)) return falha('opção_inexistente');
      if (novo !== descrição.valor) agendar(() => (novo === null ? campo.clear() : campo.select(novo)));
    }
  }
  if (tarefas.length === 0) return { ok: false, erro: 'nada_para_preencher' };

  const alterados = [];
  for (const [i, tarefa] of tarefas.entries()) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    tarefa.aplicar();
    alterados.push(tarefa.campo);
    aoProgredir?.({ campo: i + 1, total: tarefas.length });
  }

  // Em formulário híbrido, o XFA mandaria nos leitores que o entendem; sem ele, valem os campos preenchidos.
  const avisos = [];
  if (xfa) {
    tentar(() => documento.catalog.lookup(b.PDFName.of('AcroForm')).delete(b.PDFName.of('XFA')), null);
    avisos.push('xfa_removido');
  }
  if (achatar) {
    try {
      formulário.updateFieldAppearances();
      formulário.flatten();
      // A pdf-lib apaga os campos, mas deixa nas páginas as referências a eles: limpa para o arquivo ficar sem restos.
      for (const página of documento.getPages()) {
        const anotações = página.node.Annots();
        if (!anotações) continue;
        const vivas = anotações.asArray().filter((ref) => documento.context.lookup(ref));
        if (vivas.length === 0) página.node.delete(b.PDFName.of('Annots'));
        else if (vivas.length !== anotações.size()) página.node.set(b.PDFName.of('Annots'), documento.context.obj(vivas));
      }
    } catch {
      return { ok: false, erro: 'achatar_falhou' };
    }
  }
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };
  const bytes = await documento.save();
  return { ok: true, bytes, alterados, ignorados, páginas, achatado: achatar, avisos };
}

export { textoDePáginas };
