/** Modelo local e portátil da ficha de clientes. Não depende de conta nem de API. */
import { achatar } from '../núcleo/texto.js';

export const LIMITE_CLIENTES = 250;
export const VERSAO_BACKUP = 1;
const ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export class ErroFicha extends Error {
  constructor(mensagem, campo = 'nome') {
    super(mensagem);
    this.name = 'ErroFicha';
    this.campo = campo;
  }
}

const campos = Object.freeze({
  nome: 120,
  contato: 180,
  historico: 1200,
  observacoes: 1200,
});

export function validarCamposFicha(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroFicha('Informe os dados do cliente.');
  }
  const ficha = {};
  for (const [campo, limite] of Object.entries(campos)) {
    if (dados[campo] !== undefined && typeof dados[campo] !== 'string') {
      throw new ErroFicha('O campo deve conter texto.', campo);
    }
    const valor = String(dados[campo] ?? '').trim();
    if (valor.length > limite) {
      throw new ErroFicha('Máximo de ' + limite + ' caracteres.', campo);
    }
    ficha[campo] = valor;
  }
  if (ficha.nome.length < 2) throw new ErroFicha('O nome precisa ter pelo menos 2 caracteres.', 'nome');
  return ficha;
}

export function validarListaFichas(lista) {
  if (!Array.isArray(lista) || lista.length > LIMITE_CLIENTES) {
    throw new ErroFicha('O cadastro deve ser uma lista de até ' + LIMITE_CLIENTES + ' clientes.');
  }
  const ids = new Set();
  return lista.map((bruto) => {
    const ficha = validarCamposFicha(bruto);
    if (typeof bruto.id !== 'string' || !ID.test(bruto.id) || ids.has(bruto.id.toLowerCase())) {
      throw new ErroFicha('Existe identificador de cliente inválido ou repetido.');
    }
    ids.add(bruto.id.toLowerCase());
    for (const chave of ['criadoEm', 'atualizadoEm']) {
      if (typeof bruto[chave] !== 'string' || !DATA.test(bruto[chave])
        || !Number.isFinite(Date.parse(bruto[chave]))) {
        throw new ErroFicha('O backup contém datas inválidas.');
      }
    }
    if (Date.parse(bruto.atualizadoEm) < Date.parse(bruto.criadoEm)) {
      throw new ErroFicha('O backup contém atualização anterior ao cadastro.');
    }
    return { id: bruto.id, ...ficha, criadoEm: bruto.criadoEm, atualizadoEm: bruto.atualizadoEm };
  });
}

export function guardarFicha(lista, dados, { id = null, agora = new Date().toISOString(), novoId = () => crypto.randomUUID() } = {}) {
  const originais = validarListaFichas(lista);
  const ficha = validarCamposFicha(dados);
  if (!DATA.test(agora) || !Number.isFinite(Date.parse(agora))) throw new ErroFicha('Data de atualização inválida.');
  if (id) {
    const índice = originais.findIndex((item) => item.id === id);
    if (índice < 0) throw new ErroFicha('Cliente não encontrado para edição.');
    const novos = [...originais];
    novos[índice] = { ...originais[índice], ...ficha, atualizadoEm: agora };
    return { clientes: novos, cliente: novos[índice], editado: true };
  }
  if (originais.length >= LIMITE_CLIENTES) {
    throw new ErroFicha('Limite de ' + LIMITE_CLIENTES + ' clientes. Exporte antes de excluir antigos.');
  }
  const identificador = novoId();
  if (typeof identificador !== 'string' || !ID.test(identificador)
    || originais.some((item) => item.id.toLowerCase() === identificador.toLowerCase())) {
    throw new ErroFicha('Não foi possível criar um identificador seguro.');
  }
  const cliente = { id: identificador, ...ficha, criadoEm: agora, atualizadoEm: agora };
  return { clientes: [...originais, cliente], cliente, editado: false };
}

export function apagarFicha(lista, id) {
  const originais = validarListaFichas(lista);
  if (!originais.some((item) => item.id === id)) throw new ErroFicha('Cliente não encontrado.');
  return originais.filter((item) => item.id !== id);
}

export function pesquisarFichas(lista, termo = '') {
  const registros = validarListaFichas(lista);
  const busca = achatar(termo);
  return registros
    .filter((item) => !busca || achatar([
      item.nome, item.contato, item.historico, item.observacoes,
    ].join(' ')).includes(busca))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id));
}

export function criarBackupFicha(lista, agora = new Date().toISOString()) {
  if (!DATA.test(agora) || !Number.isFinite(Date.parse(agora))) throw new ErroFicha('Data inválida.');
  return { versao: VERSAO_BACKUP, geradoEm: agora, clientes: validarListaFichas(lista) };
}

export function importarBackupFicha(conteudo) {
  if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)
    || conteudo.versao !== VERSAO_BACKUP || !Array.isArray(conteudo.clientes)
    || typeof conteudo.geradoEm !== 'string' || !DATA.test(conteudo.geradoEm)
    || !Number.isFinite(Date.parse(conteudo.geradoEm))) {
    throw new ErroFicha('Arquivo inválido: use um backup JSON criado pela Ficha de cliente.');
  }
  // Nunca aceitar propriedades extras do arquivo como configuração local.
  return validarListaFichas(conteudo.clientes);
}
