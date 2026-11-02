// Sincronizado de compartilhado/scripts/configuração/validar-configuração.js — edite a origem e rode "npm run sincronizar" na raiz.
// Valida e normaliza a configuração pública do produto. Função pura (navegador e Node).
// Nunca ativa um recurso com dado ausente: apoio e publicidade ficam indisponíveis
// e o problema é listado para o relatório de configuração.
import { normalizarTextoPix } from '../apoio/normalizar-texto-pix.js';
import { validarChavePix } from '../apoio/validar-chave-pix.js';
import { validarUrlExterna } from '../validação/validar-url-externa.js';

const VALORES_OBRIGATÓRIOS_EM_CENTAVOS = [100, 500, 1000, 2000, 3000, 5000, 10000];

function objeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
}

function texto(valor, limite = 200) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

export function validarConfiguração(dados) {
  const problemas = [];
  const entrada = objeto(dados);
  const site = objeto(entrada.site);
  const criador = objeto(entrada.criador);
  const publicação = objeto(entrada.publicação);
  const privacidade = objeto(entrada.privacidade);
  const publicidade = objeto(entrada.publicidade);
  const apoio = objeto(entrada.apoio);

  const marca = texto(site.marca, 60);
  if (!marca) problemas.push({ campo: 'site.marca', mensagem: 'Nome do site ausente.' });
  const prefixo = texto(site.prefixoDeArmazenamento, 40);
  if (!/^[\p{Ll}\p{N}-]{2,40}$/u.test(prefixo)) problemas.push({ campo: 'site.prefixoDeArmazenamento', mensagem: 'Prefixo de armazenamento ausente ou inválido.' });

  const portfólio = texto(criador.portfólio, 300);
  const contato = texto(criador.contato, 300);
  const portfólioVálido = validarUrlExterna(portfólio);
  const contatoVálido = validarUrlExterna(contato);
  if (!portfólio) problemas.push({ campo: 'criador.portfólio', mensagem: 'Portfólio não configurado: o link não aparece no rodapé.', pendênciaDePublicação: true });
  else if (!portfólioVálido) problemas.push({ campo: 'criador.portfólio', mensagem: 'Portfólio deve ser um endereço https:// válido.' });
  if (!contato) problemas.push({ campo: 'criador.contato', mensagem: 'Contato público não configurado: o link não aparece.', pendênciaDePublicação: true });
  else if (!contatoVálido) problemas.push({ campo: 'criador.contato', mensagem: 'Contato deve ser https:// ou mailto: válido.' });

  const endereçoBase = texto(publicação.endereçoBase, 300);
  let endereçoBaseVálido = null;
  if (endereçoBase) {
    const url = validarUrlExterna(endereçoBase);
    if (url && url.startsWith('https://')) endereçoBaseVálido = url.endsWith('/') ? url : `${url}/`;
    else problemas.push({ campo: 'publicação.endereçoBase', mensagem: 'Endereço base deve começar com https://.' });
  } else {
    problemas.push({ campo: 'publicação.endereçoBase', mensagem: 'Endereço de publicação não configurado: sem canonical e sem sitemap.', pendênciaDePublicação: true });
  }

  const validade = Number(privacidade.validadeDoConsentimentoEmDias);
  const contatoDePrivacidade = texto(privacidade.contatoDePrivacidade, 300);
  const contatoDePrivacidadeVálido = validarUrlExterna(contatoDePrivacidade) ?? contatoVálido;
  if (!contatoDePrivacidadeVálido) problemas.push({ campo: 'privacidade.contatoDePrivacidade', mensagem: 'Canal para solicitações de privacidade não configurado.', pendênciaDePublicação: true });

  const identificadorDoPublicador = texto(publicidade.identificadorDoPublicador, 40);
  const blocos = {};
  for (const [nome, valor] of Object.entries(objeto(publicidade.blocos))) {
    if (/^[\p{L}\p{N}-]{1,40}$/u.test(nome) && /^\d{6,20}$/.test(String(valor))) blocos[nome] = String(valor);
  }
  const publicidadeAtiva = publicidade.ativa === true;
  const publicidadeCompleta =
    /^ca-pub-\d{16}$/.test(identificadorDoPublicador) && Object.keys(blocos).length > 0 && publicidade.consentimentoConfigurado === true;
  if (publicidadeAtiva && !publicidadeCompleta) {
    problemas.push({ campo: 'publicidade', mensagem: 'Publicidade marcada como ativa, mas faltam identificador ca-pub, blocos ou consentimento configurado. Mantida desativada.' });
  }

  const chave = validarChavePix(apoio.chavePix);
  const nomeDoRecebedor = normalizarTextoPix(apoio.nomeDoRecebedor);
  const cidadeDoRecebedor = normalizarTextoPix(apoio.cidadeDoRecebedor);
  const apoioAtivo = apoio.ativo === true;
  const faltasDoApoio = [];
  if (!chave.válida) faltasDoApoio.push(`chave Pix (${chave.erro})`);
  if (!nomeDoRecebedor || nomeDoRecebedor.length > 25) faltasDoApoio.push('nome do recebedor (1 a 25 caracteres)');
  if (!cidadeDoRecebedor || cidadeDoRecebedor.length > 15) faltasDoApoio.push('cidade do recebedor (1 a 15 caracteres)');
  if (!apoioAtivo) problemas.push({ campo: 'apoio', mensagem: 'Apoio por Pix desativado até o proprietário informar chave, nome e cidade.', pendênciaDePublicação: true });
  else if (faltasDoApoio.length) problemas.push({ campo: 'apoio', mensagem: `Apoio marcado como ativo, mas falta: ${faltasDoApoio.join('; ')}. Mantido indisponível.` });

  const configuração = {
    versãoDoEsquema: 1,
    site: {
      marca: marca || 'Site',
      marcaDestaque: texto(site.marcaDestaque, 40),
      descrição: texto(site.descrição, 300),
      prefixoDeArmazenamento: prefixo || 'site',
      versão: texto(site.versão, 20) || '1.0.0',
    },
    criador: { nome: texto(criador.nome, 60) || 'Anderson', portfólioVálido, contatoVálido },
    publicação: { endereçoBaseVálido },
    privacidade: {
      versãoDaPolítica: texto(privacidade.versãoDaPolítica, 20) || '2026-09-14',
      validadeDoConsentimentoEmDias: Number.isInteger(validade) && validade >= 1 && validade <= 395 ? validade : 180,
      contatoDePrivacidadeVálido,
      modoDeConsentimento: 'autoral',
    },
    publicidade: {
      ativa: publicidadeAtiva && publicidadeCompleta,
      identificadorDoPublicador,
      blocos,
      consentimentoConfigurado: publicidade.consentimentoConfigurado === true,
      cmp: publicidade.cmp === 'google' ? 'google' : 'nenhuma',
    },
    apoio: {
      ativo: apoioAtivo && faltasDoApoio.length === 0,
      chavePix: chave.válida ? chave.chaveNormalizada : '',
      tipoDeChave: chave.válida ? chave.tipo : '',
      nomeDoRecebedor,
      cidadeDoRecebedor,
      valoresSugeridosEmCentavos: VALORES_OBRIGATÓRIOS_EM_CENTAVOS,
    },
  };

  return {
    configuração,
    problemas,
    apoioDisponível: configuração.apoio.ativo,
    publicidadeDisponível: configuração.publicidade.ativa,
  };
}
