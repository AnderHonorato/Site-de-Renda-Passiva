/** Consulta de CEP no navegador usando ViaCEP. Sem servidor local ou credenciais. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';

export function validarCep(entrada) {
  const valor = String(entrada ?? '').trim();
  if (!/^\\d{5}-?\\d{3}$/.test(valor)) throw new ErroDeEntrada('Informe 8 dígitos, com ou sem hífen.','cep');
  return valor.replace('-', '');
}

export async function consultarCep(entrada, { buscar = globalThis.fetch, sinal } = {}) {
  const cep = validarCep(entrada);
  let resposta;
  try {
    resposta = await buscar('https://viacep.com.br/ws/' + cep + '/json/', {
      signal: sinal ?? AbortSignal.timeout(10000), headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ErroDeEntrada('A consulta está indisponível. Verifique a internet e tente novamente.', 'cep');
  }
  if (!resposta?.ok) throw new ErroDeEntrada('O serviço de CEP não respondeu. Tente novamente.', 'cep');
  let dados;
  try { dados = await resposta.json(); }
  catch { throw new ErroDeEntrada('A resposta do serviço de CEP é inválida.', 'cep'); }
  if (dados?.erro === true) throw new ErroDeEntrada('CEP não encontrado. Confira os dígitos.', 'cep');
  if (!dados || dados.cep?.replace(/\\D/g, '') !== cep || !dados.localidade || !/^[A-Z]{2}$/.test(dados.uf ?? ''))
    throw new ErroDeEntrada('O serviço retornou um endereço incompleto ou incompatível.', 'cep');
  const limpar = (v) => String(v ?? '').slice(0, 160).trim();
  return {
    cep: cep.slice(0,5) + '-' + cep.slice(5),
    logradouro: limpar(dados.logradouro), complemento: limpar(dados.complemento),
    bairro: limpar(dados.bairro), cidade: limpar(dados.localidade),
    uf: limpar(dados.uf), ibge: limpar(dados.ibge), ddd: limpar(dados.ddd),
  };
}

export async function consultarCepNaTela(dados, opções) {
  const r = await consultarCep(texto(dados,'cep',{rótulo:'CEP',máximo:9}), opções);
  const linhas = [
    ['CEP',r.cep], ['Logradouro',r.logradouro || 'Não informado'],
    ['Bairro',r.bairro || 'Não informado'], ['Cidade',r.cidade],
    ['Estado',r.uf], ['Código IBGE',r.ibge || 'Não informado'],
    ['DDD',r.ddd || 'Não informado'],
  ];
  const observações = [
    'A consulta usa o serviço público ViaCEP diretamente do seu navegador; o CEP é enviado ao ViaCEP.',
    'O número e o complemento da residência não são fornecidos. Confirme o endereço antes de despachar.',
    'Endereços podem estar desatualizados. O resultado não confirma a existência de um imóvel.',
  ];
  return {
    valor: r.cep, resumo: [r.logradouro,r.bairro,r.cidade + ' / ' + r.uf].filter(Boolean).join(' · '),
    linhas, observações, texto: ['Consulta de CEP',...linhas.map(([k,v])=>k+': '+v),...observações].join('\\n'),
  };
}

export default {
  instruções: {
    passos: ['Digite os oito números do CEP.', 'Toque em Consultar endereço e confira os dados.', 'Copie o resultado para preencher seu cadastro ou etiqueta.'],
    exemplo: { texto: 'Exemplo público: 01001-000, Praça da Sé, São Paulo/SP. Digite outro CEP para pesquisar.' },
    limites: 'Requer internet. Consulta CEP exato, não pesquisa por nome de rua. O CEP é enviado ao ViaCEP, não ao servidor do portal.',
    perguntas: [{p:'Posso descobrir o número da casa?',r:'Não. CEPs identificam áreas ou logradouros; número e complemento devem ser informados pela pessoa.'}],
  },
  montar(raiz,ferramenta) {
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Consultar endereço',demorada:true,
      campos:[{nome:'cep',rótulo:'CEP',exemplo:'01001-000',padrão:'01001-000',
        dica:'Oito dígitos. Exemplo demonstrativo, não um endereço particular.'}],
      calcular:consultarCepNaTela,
    });
  },
};
