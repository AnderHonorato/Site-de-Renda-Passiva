// Monta o BR Code (Pix Copia e Cola) estático com valor, conforme o Manual de
// Padrões para Iniciação do Pix do Banco Central. Lança erro se algum dado for inválido:
// nunca gera um código parcial.

import { calcularCrcPix } from './calcular-crc-pix.js';
import { montarCampoEmv } from './montar-campo-emv.js';
import { normalizarTextoPix } from './normalizar-texto-pix.js';
import { validarChavePix } from './validar-chave-pix.js';
import { validarValorPix } from './validar-valor-pix.js';

export const LIMITE_NOME_DO_RECEBEDOR = 25;
export const LIMITE_CIDADE_DO_RECEBEDOR = 15;

function formatarValorEmv(centavos) {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

export function gerarPayloadPix({ chave, nome, cidade, centavos, identificador = '***' }) {
  const chaveVerificada = validarChavePix(chave);
  if (!chaveVerificada.válida) throw new Error(chaveVerificada.erro);

  if (!Number.isSafeInteger(centavos)) throw new Error('O valor deve ser informado em centavos inteiros.');
  const valorVerificado = validarValorPix(centavos);
  if (!valorVerificado.válido) throw new Error(valorVerificado.erro);

  const nomeNormalizado = normalizarTextoPix(nome);
  const cidadeNormalizada = normalizarTextoPix(cidade);
  if (!nomeNormalizado) throw new Error('O nome do recebedor não foi informado.');
  if (nomeNormalizado.length > LIMITE_NOME_DO_RECEBEDOR) throw new Error(`O nome do recebedor deve ter até ${LIMITE_NOME_DO_RECEBEDOR} caracteres.`);
  if (!cidadeNormalizada) throw new Error('A cidade do recebedor não foi informada.');
  if (cidadeNormalizada.length > LIMITE_CIDADE_DO_RECEBEDOR) throw new Error(`A cidade do recebedor deve ter até ${LIMITE_CIDADE_DO_RECEBEDOR} caracteres.`);
  if (!/^[A-Za-z0-9*]{1,25}$/.test(identificador)) throw new Error('Identificador da transação inválido.');

  const contaDoRecebedor = montarCampoEmv('00', 'br.gov.bcb.pix') + montarCampoEmv('01', chaveVerificada.chaveNormalizada);
  const semCrc =
    montarCampoEmv('00', '01') +
    montarCampoEmv('26', contaDoRecebedor) +
    montarCampoEmv('52', '0000') +
    montarCampoEmv('53', '986') +
    montarCampoEmv('54', formatarValorEmv(valorVerificado.centavos)) +
    montarCampoEmv('58', 'BR') +
    montarCampoEmv('59', nomeNormalizado) +
    montarCampoEmv('60', cidadeNormalizada) +
    montarCampoEmv('62', montarCampoEmv('05', identificador)) +
    '6304';
  return semCrc + calcularCrcPix(semCrc);
}
