/** Consulta pública de CNPJ via BrasilAPI; nenhum dado é enviado ao servidor do portal. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';

export function validarCnpj(entrada) {
  const bruto = String(entrada ?? '').trim();
  if (!/^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/.test(bruto))
    throw new ErroDeEntrada('Informe um CNPJ com 14 dígitos, com ou sem pontuação.', 'cnpj');
  const cnpj = bruto.replace(/\D/g, '');
  if (/^(\d)\1{13}$/.test(cnpj)) throw new ErroDeEntrada('CNPJ inválido.', 'cnpj');
  const digito = (tamanho) => {
    let soma = 0, peso = tamanho === 12 ? 5 : 6;
    for (let i = 0; i < tamanho; i++) { soma += Number(cnpj[i]) * peso; peso = peso === 2 ? 9 : peso - 1; }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  if (Number(cnpj[12]) !== digito(12) || Number(cnpj[13]) !== digito(13))
    throw new ErroDeEntrada('Os dígitos verificadores do CNPJ não conferem.', 'cnpj');
  return cnpj;
}

export async function consultarCnpj(entrada, { buscar = globalThis.fetch, sinal } = {}) {
  const cnpj = validarCnpj(entrada);
  let resposta;
  try {
    resposta = await buscar('https://brasilapi.com.br/api/cnpj/v1/' + cnpj, {
      signal: sinal ?? AbortSignal.timeout(12000), headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ErroDeEntrada('Não foi possível consultar a base pública. Verifique a conexão e tente novamente.', 'cnpj');
  }
  if (resposta?.status === 404) throw new ErroDeEntrada('CNPJ não encontrado na base consultada.', 'cnpj');
  if (!resposta?.ok) throw new ErroDeEntrada('Consulta indisponível ou temporariamente limitada. Tente mais tarde.', 'cnpj');
  let dados;
  try { dados = await resposta.json(); }
  catch { throw new ErroDeEntrada('A resposta recebida não é um JSON válido.', 'cnpj'); }
  if (!dados || String(dados.cnpj ?? '').replace(/\D/g, '') !== cnpj)
    throw new ErroDeEntrada('A base retornou dados incompatíveis com o CNPJ informado.', 'cnpj');
  const limpar = v => String(v ?? '').trim().slice(0, 200);
  const endereço = [dados.descricao_tipo_de_logradouro, dados.logradouro, dados.numero, dados.complemento,
    dados.bairro, dados.municipio, dados.uf, dados.cep].map(limpar).filter(Boolean).join(', ');
  return {
    cnpj, razaoSocial: limpar(dados.razao_social), fantasia: limpar(dados.nome_fantasia),
    situacao: limpar(dados.descricao_situacao_cadastral), abertura: limpar(dados.data_inicio_atividade),
    atividade: limpar(dados.cnae_fiscal_descricao), porte: limpar(dados.porte), endereco: endereço,
  };
}

export async function consultarCnpjNaTela(dados, opções) {
  const r = await consultarCnpj(texto(dados, 'cnpj', { rótulo: 'CNPJ', máximo: 18 }), opções);
  const linhas = [
    ['CNPJ', r.cnpj], ['Razão social', r.razaoSocial], ['Nome fantasia', r.fantasia || 'Não informado'],
    ['Situação cadastral', r.situacao || 'Não informada'], ['Início da atividade', r.abertura || 'Não informado'],
    ['Atividade principal', r.atividade || 'Não informada'], ['Porte', r.porte || 'Não informado'],
    ['Endereço', r.endereco || 'Não informado'],
  ];
  const observações = [
    'Consulta pública pela BrasilAPI, diretamente no navegador. O CNPJ informado é enviado à BrasilAPI.',
    'Os dados podem estar desatualizados; confirme a situação no comprovante oficial da Receita Federal.',
    'Uma situação cadastral ativa não garante idoneidade comercial nem ausência de dívidas.',
  ];
  return {
    valor: r.cnpj, resumo: [r.razaoSocial, r.situacao].filter(Boolean).join(' · '),
    linhas, observações, texto: [...linhas.map(([chave, valor]) => chave + ': ' + valor), ...observações].join('\n'),
  };
}

export default {
  instruções: {
    passos: ['Informe um CNPJ válido.', 'Consulte os dados públicos disponíveis.', 'Confira os dados na Receita Federal antes de decidir negociar.'],
    exemplo: { texto: 'Exemplo: 00.000.000/0001-91 (CNPJ de demonstração; disponibilidade depende da base).' },
    limites: 'Requer internet e disponibilidade da BrasilAPI. A consulta não comprova regularidade fiscal nem reputação comercial.',
    perguntas: [{ p: 'Esta consulta substitui a Receita Federal?', r: 'Não. Para comprovação oficial, consulte o comprovante de inscrição e situação cadastral da Receita Federal.' }],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Consultar empresa', demorada: true,
      campos: [{ nome: 'cnpj', rótulo: 'CNPJ', exemplo: '00.000.000/0001-91', padrão: '' }],
      calcular: consultarCnpjNaTela,
    });
  },
};
