/**
 * O que um QR Code carrega: tipo, campos e sinais de alerta (F186).
 *
 * Função pura, sem DOM e sem rede. NADA aqui abre, busca ou segue um endereço: a análise olha só o
 * texto do código. Isso é proposital, porque ler um QR é seguro e abrir o que ele diz é que pode não ser.
 *
 * Os sinais de alerta são heurísticas conhecidas de golpe com QR Code ("quishing"): endereço escondido
 * atrás de encurtador, usuário antes do @, nome de banco em domínio alheio, letras que imitam outras
 * (punycode), endereço numérico, http sem criptografia. A ausência de sinais NUNCA vira "seguro": o texto
 * da tela diz isso com todas as letras.
 */

export const LIMITE_DO_CONTEÚDO = 5000;

/** `dica` é orientação, não alerta: não muda o nível geral do código. */
/** @typedef {'perigo'|'atenção'|'dica'} NívelDeAviso */
/** @typedef {{nível: NívelDeAviso, texto: string}} Aviso */

const ENCURTADORES = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'ow.ly', 'buff.ly',
  't.ly', 'lnkd.in', 'tiny.cc', 'bl.ink', 'rebrand.ly', 'v.gd', 'qrco.de', 'qr.link', 'l.ead.me', 'linktr.ee',
]);

/** Nome de marca muito imitado em golpe → domínios que de fato pertencem a ela. */
const MARCAS = [
  ['paypal', ['paypal.com', 'paypal.me']],
  ['google', ['google.com', 'google.com.br', 'goo.gl', 'googleapis.com', 'gstatic.com', 'withgoogle.com']],
  ['apple', ['apple.com', 'icloud.com']],
  ['microsoft', ['microsoft.com', 'live.com', 'office.com', 'microsoftonline.com']],
  ['amazon', ['amazon.com', 'amazon.com.br', 'amazonaws.com']],
  ['netflix', ['netflix.com']],
  ['facebook', ['facebook.com', 'fb.com']],
  ['instagram', ['instagram.com']],
  ['whatsapp', ['whatsapp.com', 'wa.me']],
  ['nubank', ['nubank.com.br', 'nu.com.br']],
  ['itau', ['itau.com.br', 'itau.com']],
  ['bradesco', ['bradesco.com.br', 'bradesco.com']],
  ['santander', ['santander.com.br', 'santander.com']],
  ['mercadopago', ['mercadopago.com.br', 'mercadopago.com']],
  ['mercadolivre', ['mercadolivre.com.br', 'mercadolivre.com']],
  ['picpay', ['picpay.com']],
  ['sicredi', ['sicredi.com.br']],
  ['sicoob', ['sicoob.com.br']],
  ['correios', ['correios.com.br']],
  ['gov.br', ['gov.br']],
];

const EXTENSÕES_EXECUTÁVEIS = new Set(['apk', 'exe', 'msi', 'bat', 'cmd', 'scr', 'jar', 'ps1', 'vbs', 'dmg', 'pkg', 'lnk', 'hta']);
const ESQUEMAS_PERIGOSOS = new Set(['javascript', 'data', 'vbscript', 'file', 'blob', 'about']);
const TERMINAÇÕES_QUE_IMITAM_ARQUIVO = new Set(['zip', 'mov']);
const SEGUNDO_NÍVEL = new Set(['com', 'org', 'net', 'gov', 'edu', 'co', 'ac', 'mil', 'ind', 'eco']);

/** Caracteres invisíveis ou de controle e os que invertem o sentido do texto (esconder o fim do endereço). */
const CARACTERES_ESTRANHOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]/;

/* ------------------------------------------------------------------ punycode (RFC 3492) */

const BASE = 36;
const T_MÍN = 1;
const T_MÁX = 26;
const SKEW = 38;
const DAMP = 700;

function adaptar(delta, quantidade, primeira) {
  let k = 0;
  let d = primeira ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / quantidade);
  for (; d > ((BASE - T_MÍN) * T_MÁX) >> 1; k += BASE) d = Math.floor(d / (BASE - T_MÍN));
  return Math.floor(k + ((BASE - T_MÍN + 1) * d) / (d + SKEW));
}

/**
 * Decodifica um rótulo punycode ("xn--…") para o texto Unicode que a pessoa veria no navegador.
 * Devolve null se o rótulo não for punycode válido.
 * @param {string} rótulo
 * @returns {string|null}
 */
export function punycodeParaUnicode(rótulo) {
  if (!/^xn--/i.test(rótulo)) return null;
  const entrada = rótulo.slice(4);
  const últimoHífen = entrada.lastIndexOf('-');
  const saída = [];
  for (let i = 0; i < Math.max(0, últimoHífen); i += 1) {
    if (entrada.charCodeAt(i) >= 0x80) return null;
    saída.push(entrada.charCodeAt(i));
  }
  let n = 128;
  let delta = 0;
  let viés = 72;
  for (let índice = últimoHífen > 0 ? últimoHífen + 1 : 0; índice < entrada.length;) {
    const antes = delta;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (índice >= entrada.length) return null;
      const c = entrada.charCodeAt(índice);
      índice += 1;
      const dígito = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : BASE;
      if (dígito >= BASE) return null;
      delta += dígito * w;
      const t = k <= viés ? T_MÍN : k >= viés + T_MÁX ? T_MÁX : k - viés;
      if (dígito < t) break;
      w *= BASE - t;
    }
    const fora = saída.length + 1;
    viés = adaptar(delta - antes, fora, antes === 0);
    n += Math.floor(delta / fora);
    delta %= fora;
    if (n > 0x10FFFF) return null;
    saída.splice(delta, 0, n);
    delta += 1;
  }
  try {
    return String.fromCodePoint(...saída);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ endereço (URL) */

const ÉIPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Domínio "de verdade" do endereço: com.br e afins têm três partes. */
export function domínioRegistrável(host) {
  const partes = host.split('.').filter(Boolean);
  if (partes.length <= 2) return partes.join('.');
  const tld = partes[partes.length - 1];
  const segundo = partes[partes.length - 2];
  if (tld.length === 2 && SEGUNDO_NÍVEL.has(segundo)) return partes.slice(-3).join('.');
  return partes.slice(-2).join('.');
}

function ipPrivado(host) {
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host.startsWith('[')) return /^\[(::1|fe80:|fc|fd)/i.test(host);
  if (!ÉIPV4.test(host)) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254) || a === 0;
}

/**
 * Sinais de alerta de um endereço da web. Não acessa o endereço.
 * @param {string} texto o endereço completo, com http:// ou https://
 * @returns {{host: string, hostLegível: string, domínio: string, avisos: Aviso[]} | null} null se não for um endereço válido
 */
export function avaliarEndereço(texto) {
  let url;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  /** @type {Aviso[]} */
  const avisos = [];
  const host = url.hostname.toLowerCase();
  const rótulos = host.split('.');
  const unicode = rótulos.map((r) => punycodeParaUnicode(r) ?? r).join('.');
  const domínio = domínioRegistrável(host);

  if (url.username || url.password) {
    avisos.push({
      nível: 'perigo',
      texto: `O endereço traz um usuário ou senha antes do "@". É um truque comum para parecer que o site é outro: o site real é "${host}".`,
    });
  }
  if (url.protocol === 'http:') {
    avisos.push({ nível: 'atenção', texto: 'O endereço usa http, sem criptografia. O que você digitar nesse site pode ser lido por terceiros.' });
  }
  if (ÉIPV4.test(host) || host.startsWith('[')) {
    avisos.push({ nível: 'atenção', texto: 'O endereço é numérico (IP) em vez de um nome de site. Sites legítimos de empresas quase nunca fazem isso.' });
  }
  if (ipPrivado(host)) {
    avisos.push({ nível: 'atenção', texto: 'O endereço aponta para a rede local (seu roteador ou um aparelho interno), não para a internet.' });
  }
  if (unicode !== host) {
    avisos.push({
      nível: 'atenção',
      texto: `O endereço usa letras internacionais (punycode). Escrito por extenso é "${unicode}", e o navegador pode mostrar um nome que imita outro site.`,
    });
  }
  if (ENCURTADORES.has(host) || ENCURTADORES.has(domínio)) {
    avisos.push({ nível: 'atenção', texto: `"${domínio}" é um encurtador de links: o destino verdadeiro fica escondido até abrir.` });
  }
  const terminação = rótulos[rótulos.length - 1];
  if (TERMINAÇÕES_QUE_IMITAM_ARQUIVO.has(terminação)) {
    avisos.push({ nível: 'atenção', texto: `A terminação ".${terminação}" é de site, mas também parece nome de arquivo, o que é usado para enganar.` });
  }
  if (rótulos.length >= 5) {
    avisos.push({ nível: 'atenção', texto: 'O endereço tem muitos níveis antes do domínio. O que importa é o final (antes da primeira barra), e ele pode estar escondido no meio.' });
  }
  if (url.port) {
    avisos.push({ nível: 'atenção', texto: `O endereço usa a porta ${url.port}, fora do comum para um site de empresa.` });
  }
  for (const [termo, domínios] of MARCAS) {
    if (!host.includes(termo)) continue;
    if (domínios.some((d) => host === d || host.endsWith(`.${d}`))) continue;
    avisos.push({
      nível: 'atenção',
      texto: `O endereço cita "${termo}", mas o domínio dele é "${domínio}", não o da empresa. Confira se é mesmo o site oficial.`,
    });
    break;
  }
  const arquivo = decodeURIComponentSeguro(url.pathname).split('/').pop().toLowerCase();
  const extensão = arquivo.includes('.') ? arquivo.split('.').pop() : '';
  if (EXTENSÕES_EXECUTÁVEIS.has(extensão)) {
    avisos.push({ nível: 'atenção', texto: `O link baixa um arquivo executável (.${extensão}). Instale programas só de fontes oficiais.` });
  }
  if (CARACTERES_ESTRANHOS.test(texto) || CARACTERES_ESTRANHOS.test(decodeURIComponentSeguro(texto))) {
    avisos.push({ nível: 'perigo', texto: 'O endereço tem caracteres invisíveis ou que invertem a direção do texto, usados para esconder o endereço verdadeiro.' });
  }
  return { host, hostLegível: unicode, domínio, avisos };
}

function decodeURIComponentSeguro(texto) {
  try {
    return decodeURIComponent(texto);
  } catch {
    return texto;
  }
}

/* ------------------------------------------------------------------ Wi-Fi, Pix, contato */

/** Separa "chave:valor;chave:valor;;" respeitando a barra invertida (\; \: \\ \, \"). */
function lerCamposComEscape(texto) {
  const campos = {};
  let chave = '';
  let valor = '';
  let lendoValor = false;
  const fechar = () => {
    if (chave) campos[chave.toUpperCase()] = valor;
    chave = '';
    valor = '';
    lendoValor = false;
  };
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === '\\' && i + 1 < texto.length) {
      i += 1;
      if (lendoValor) valor += texto[i]; else chave += texto[i];
    } else if (c === ';') {
      fechar();
    } else if (c === ':' && !lendoValor) {
      lendoValor = true;
    } else if (lendoValor) {
      valor += c;
    } else {
      chave += c;
    }
  }
  fechar();
  return campos;
}

/**
 * Lê um código de rede Wi-Fi ("WIFI:T:WPA;S:rede;P:senha;;").
 * @param {string} texto
 */
export function lerWifi(texto) {
  const campos = lerCamposComEscape(texto.replace(/^WIFI:/i, ''));
  const tipo = (campos.T ?? '').toUpperCase();
  const aberta = tipo === 'NOPASS' || tipo === '' && !campos.P;
  return {
    rede: campos.S ?? '',
    segurança: aberta ? 'sem senha' : (tipo === 'SAE' ? 'WPA3' : tipo || 'WPA'),
    senha: campos.P ?? '',
    oculta: /^(true|1)$/i.test(campos.H ?? ''),
    aberta,
    fraca: tipo === 'WEP',
  };
}

/** CRC-16/CCITT-FALSE, o do BR Code do Pix (polinômio 0x1021, início 0xFFFF). */
export function crc16(texto) {
  let crc = 0xFFFF;
  for (let i = 0; i < texto.length; i += 1) {
    crc ^= (texto.charCodeAt(i) & 0xFF) << 8;
    for (let b = 0; b < 8; b += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Lê uma sequência TLV (2 dígitos de tag, 2 de tamanho, valor). Devolve null se estiver quebrada. */
function lerTlv(texto) {
  const campos = new Map();
  let i = 0;
  while (i < texto.length) {
    if (i + 4 > texto.length) return null;
    const tag = texto.slice(i, i + 2);
    const tamanho = Number(texto.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(tamanho) || !/^\d{2}$/.test(texto.slice(i + 2, i + 4))) return null;
    if (i + 4 + tamanho > texto.length) return null;
    if (!campos.has(tag)) campos.set(tag, texto.slice(i + 4, i + 4 + tamanho));
    i += 4 + tamanho;
  }
  return campos;
}

/**
 * Lê um "Pix copia e cola" (BR Code, padrão EMV). Devolve null se não for um BR Code legível.
 * @param {string} texto
 */
export function lerPix(texto) {
  if (!/^000201/.test(texto)) return null;
  const campos = lerTlv(texto);
  if (!campos) return null;
  let conta = null;
  for (let tag = 26; tag <= 51; tag += 1) {
    const valor = campos.get(String(tag).padStart(2, '0'));
    if (!valor) continue;
    const sub = lerTlv(valor);
    if (sub && /br\.gov\.bcb\.pix/i.test(sub.get('00') ?? '')) { conta = sub; break; }
  }
  if (!conta) return null;
  const crcInformado = campos.get('63');
  const posição = texto.lastIndexOf('6304');
  const crcConfere = posição >= 0 && crcInformado !== undefined
    && crc16(texto.slice(0, posição + 4)) === crcInformado.toUpperCase();
  const valorBruto = campos.get('54');
  const adicional = campos.get('62') ? lerTlv(campos.get('62')) : null;
  return {
    chave: conta.get('01') ?? '',
    urlDaCobrança: conta.get('25') ?? '',
    valor: valorBruto && /^\d+(\.\d{1,2})?$/.test(valorBruto) ? Number(valorBruto) : null,
    recebedor: campos.get('59') ?? '',
    cidade: campos.get('60') ?? '',
    identificador: adicional?.get('05') ?? '',
    crcConfere,
  };
}

/** Lê vCard ou MECARD: devolve nome, telefones, e-mails e demais campos úteis. */
function lerContato(texto) {
  const telefones = [];
  const emails = [];
  const outros = [];
  let nome = '';
  if (/^MECARD:/i.test(texto)) {
    const bruto = texto.replace(/^MECARD:/i, '');
    // MECARD repete TEL e EMAIL; por isso lê pares em vez de um objeto.
    for (const parte of bruto.split(/(?<!\\);/)) {
      const [chave, ...resto] = parte.split(':');
      const valor = resto.join(':').replace(/\\(.)/g, '$1');
      if (!chave || !valor) continue;
      const k = chave.toUpperCase();
      if (k === 'N') nome = valor.split(',').reverse().join(' ').trim();
      else if (k === 'TEL') telefones.push(valor);
      else if (k === 'EMAIL') emails.push(valor);
      else if (k === 'URL' || k === 'ORG' || k === 'ADR') outros.push([k, valor]);
    }
    return { nome, telefones, emails, outros };
  }
  for (const linha of texto.split(/\r?\n/)) {
    const separador = linha.indexOf(':');
    if (separador < 1) continue;
    const campo = linha.slice(0, separador).split(';')[0].toUpperCase();
    const valor = linha.slice(separador + 1).trim();
    if (!valor) continue;
    if (campo === 'FN') nome = valor;
    else if (campo === 'N' && !nome) nome = valor.split(';').filter(Boolean).reverse().join(' ');
    else if (campo === 'TEL') telefones.push(valor);
    else if (campo === 'EMAIL') emails.push(valor);
    else if (['ORG', 'URL', 'TITLE'].includes(campo)) outros.push([campo, valor]);
  }
  return { nome, telefones, emails, outros };
}

/* ------------------------------------------------------------------ classificação */

/**
 * Troca caracteres invisíveis, de controle e de inversão de direção por uma marca legível (‹U+202E›),
 * para a pessoa VER o que está escondido no conteúdo, e para o texto copiado não carregar o truque junto.
 * Quebras de linha e tabulações comuns ficam como estão.
 * @param {string} texto
 * @returns {string}
 */
export function tornarVisíveis(texto) {
  return String(texto ?? '').replace(new RegExp(CARACTERES_ESTRANHOS.source, 'g'), (c) => `‹U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}›`);
}

/** Corta texto longo para caber numa linha de resultado. */
export function resumirTexto(texto, máximo = 60) {
  const limpo = String(texto).replace(/\s+/g, ' ').trim();
  return limpo.length > máximo ? `${limpo.slice(0, máximo - 1)}…` : limpo;
}

const reais = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Classifica e descreve o conteúdo de um QR Code.
 * @param {string} bruto texto decodificado do código
 * @returns {{
 *   tipo: string, rótulo: string, detalhes: [string, string][], avisos: Aviso[],
 *   nível: 'perigo'|'atenção'|'sem-sinais', endereço: string|null, truncado: boolean
 * }}
 */
export function analisarConteúdo(bruto) {
  const completo = String(bruto ?? '');
  const truncado = completo.length > LIMITE_DO_CONTEÚDO;
  const texto = (truncado ? completo.slice(0, LIMITE_DO_CONTEÚDO) : completo).trim();
  /** @type {Aviso[]} */
  const avisos = [];
  /** @type {[string, string][]} */
  const detalhes = [];
  let tipo = 'texto';
  let rótulo = 'Texto';
  let endereço = null;

  if (CARACTERES_ESTRANHOS.test(texto) && !/^https?:/i.test(texto)) {
    avisos.push({ nível: 'atenção', texto: 'O conteúdo tem caracteres invisíveis ou de controle. Copie e cole com cuidado.' });
  }

  if (!texto) {
    return { tipo: 'vazio', rótulo: 'Sem conteúdo', detalhes, avisos, nível: 'sem-sinais', endereço: null, truncado };
  }

  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(texto)?.[1]?.toLowerCase() ?? '';

  if (/^WIFI:/i.test(texto)) {
    const w = lerWifi(texto);
    tipo = 'wifi';
    rótulo = 'Rede Wi-Fi';
    detalhes.push(['Rede', resumirTexto(w.rede || '(sem nome)', 40)], ['Segurança', w.segurança]);
    if (w.senha) detalhes.push(['Senha', 'informada no código (veja o conteúdo abaixo)']);
    if (w.oculta) detalhes.push(['Rede oculta', 'sim']);
    avisos.push({ nível: 'dica', texto: 'Ler o código não conecta o aparelho: quem conecta é você, ao escolher. Só entre em redes que você conhece.' });
    if (w.aberta) avisos.push({ nível: 'atenção', texto: 'A rede não tem senha: qualquer pessoa por perto pode estar nela e o tráfego não é protegido.' });
    if (w.fraca) avisos.push({ nível: 'atenção', texto: 'A segurança WEP é antiga e quebra em minutos. Prefira redes WPA2 ou WPA3.' });
  } else if (/^000201/.test(texto) && /br\.gov\.bcb\.pix/i.test(texto) && !lerPix(texto)) {
    // É um Pix pelo começo, mas a estrutura não fecha: cortado ou editado. Pagar um código assim é arriscado.
    tipo = 'pix-defeituoso';
    rótulo = 'Pix com defeito';
    avisos.push({ nível: 'perigo', texto: 'O código parece um Pix, mas está incompleto ou alterado e não dá para conferir o recebedor. Não pague com ele.' });
  } else if (/^000201/.test(texto) && lerPix(texto)) {
    const p = lerPix(texto);
    tipo = 'pix';
    rótulo = p.urlDaCobrança ? 'Pix (cobrança por link)' : 'Pix copia e cola';
    if (p.recebedor) detalhes.push(['Recebedor', resumirTexto(p.recebedor, 40)]);
    if (p.cidade) detalhes.push(['Cidade', resumirTexto(p.cidade, 30)]);
    if (p.chave) detalhes.push(['Chave Pix', resumirTexto(p.chave, 50)]);
    if (p.urlDaCobrança) detalhes.push(['Endereço da cobrança', resumirTexto(p.urlDaCobrança, 50)]);
    detalhes.push(['Valor', p.valor === null ? 'em aberto (você digita ao pagar)' : reais(p.valor)]);
    if (p.identificador && p.identificador !== '***') detalhes.push(['Identificador', resumirTexto(p.identificador, 30)]);
    avisos.push({ nível: 'dica', texto: 'Antes de pagar, confira se o nome do recebedor e o valor no aplicativo do seu banco são os esperados. Pix não tem como ser desfeito sozinho.' });
    if (!p.crcConfere) avisos.push({ nível: 'perigo', texto: 'O código de verificação (CRC) do Pix não confere: o código foi alterado ou está incompleto. Não pague.' });
  } else if (/^BEGIN:VCARD/i.test(texto) || /^MECARD:/i.test(texto)) {
    const c = lerContato(texto);
    tipo = 'contato';
    rótulo = 'Contato';
    detalhes.push(['Nome', resumirTexto(c.nome || '(sem nome)', 40)]);
    for (const t of c.telefones.slice(0, 3)) detalhes.push(['Telefone', resumirTexto(t, 30)]);
    for (const e of c.emails.slice(0, 3)) detalhes.push(['E-mail', resumirTexto(e, 40)]);
    for (const [k, v] of c.outros.slice(0, 3)) detalhes.push([k === 'ORG' ? 'Empresa' : k === 'TITLE' ? 'Cargo' : k === 'ADR' ? 'Endereço' : 'Site', resumirTexto(v, 40)]);
  } else if (/^BEGIN:(VCALENDAR|VEVENT)/i.test(texto)) {
    tipo = 'evento';
    rótulo = 'Evento de agenda';
    for (const [campo, nome] of [['SUMMARY', 'Título'], ['DTSTART', 'Início'], ['DTEND', 'Fim'], ['LOCATION', 'Local']]) {
      const linha = new RegExp(`^${campo}[^:\\r\\n]*:(.*)$`, 'im').exec(texto);
      if (linha?.[1].trim()) detalhes.push([nome, resumirTexto(linha[1].trim(), 50)]);
    }
  } else if (esquema === 'mailto') {
    tipo = 'email';
    rótulo = 'E-mail';
    const destino = texto.slice(7).split('?')[0];
    detalhes.push(['Para', resumirTexto(decodeURIComponentSeguro(destino), 50)]);
    const assunto = /[?&]subject=([^&]*)/i.exec(texto)?.[1];
    if (assunto) detalhes.push(['Assunto', resumirTexto(decodeURIComponentSeguro(assunto), 50)]);
  } else if (esquema === 'tel') {
    tipo = 'telefone';
    rótulo = 'Telefone';
    detalhes.push(['Número', resumirTexto(texto.slice(4), 30)]);
    avisos.push({ nível: 'dica', texto: 'Ligar para números desconhecidos pode custar caro (números de tarifa especial). Confira o número antes de discar.' });
  } else if (esquema === 'sms' || esquema === 'smsto') {
    tipo = 'sms';
    rótulo = 'Mensagem de texto (SMS)';
    const [número, ...corpo] = texto.slice(esquema.length + 1).split(':');
    detalhes.push(['Para', resumirTexto(número, 30)]);
    if (corpo.length) detalhes.push(['Mensagem', resumirTexto(corpo.join(':'), 60)]);
    avisos.push({ nível: 'dica', texto: 'Enviar SMS pode custar dinheiro (serviços por assinatura). Confira número e mensagem antes de enviar.' });
  } else if (esquema === 'geo') {
    tipo = 'localização';
    rótulo = 'Localização';
    detalhes.push(['Coordenadas', resumirTexto(texto.slice(4).split('?')[0], 40)]);
  } else if (esquema === 'http' || esquema === 'https') {
    const análise = avaliarEndereço(texto);
    if (análise) {
      tipo = 'link';
      rótulo = 'Link';
      endereço = new URL(texto).href;
      detalhes.push(['Site (domínio)', resumirTexto(análise.hostLegível, 50)]);
      if (análise.hostLegível !== análise.host) detalhes.push(['Como o navegador vê', resumirTexto(análise.host, 50)]);
      detalhes.push(['Conexão', esquema === 'https' ? 'https (criptografada)' : 'http (sem criptografia)']);
      avisos.push(...análise.avisos);
    } else {
      avisos.push({ nível: 'atenção', texto: 'Parece um link, mas não é um endereço válido.' });
    }
  } else if (ESQUEMAS_PERIGOSOS.has(esquema)) {
    tipo = 'esquema-perigoso';
    rótulo = `Código que executa ações (${esquema}:)`;
    avisos.push({ nível: 'perigo', texto: `O código usa "${esquema}:", que pode rodar comandos ou mostrar conteúdo falso em vez de abrir um site. Não abra.` });
  } else if (esquema === 'otpauth' || esquema === 'otpauth-migration') {
    tipo = 'autenticador';
    rótulo = 'Chave de autenticação em duas etapas';
    avisos.push({ nível: 'dica', texto: 'Este código contém a chave secreta do seu segundo fator. Importe só no aplicativo autenticador de confiança e não compartilhe a imagem.' });
  } else if (esquema && texto.length > esquema.length + 1 && /^[a-z][a-z0-9+.-]*:\/\//i.test(texto)) {
    tipo = 'aplicativo';
    rótulo = `Link para aplicativo (${esquema}://)`;
    detalhes.push(['Esquema', `${esquema}://`]);
    avisos.push({ nível: 'atenção', texto: 'O código chama um aplicativo do aparelho, não um site. Só abra se você reconhece o aplicativo e o motivo.' });
  } else if (/^(www\.)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(texto)) {
    tipo = 'link-sem-esquema';
    rótulo = 'Texto que parece um endereço';
    const análise = avaliarEndereço(`https://${texto}`);
    if (análise) {
      detalhes.push(['Site (domínio)', resumirTexto(análise.hostLegível, 50)]);
      avisos.push({ nível: 'dica', texto: 'O código não diz se é http ou https. O navegador escolherá por você.' });
      avisos.push(...análise.avisos.filter((a) => !/usa http,/.test(a.texto)));
    }
  } else {
    detalhes.push(['Tamanho', `${texto.length} ${texto.length === 1 ? 'caractere' : 'caracteres'}`]);
  }

  if (truncado) {
    avisos.push({ nível: 'atenção', texto: `O conteúdo tem mais de ${LIMITE_DO_CONTEÚDO} caracteres e foi cortado aqui.` });
  }

  const nível = avisos.some((a) => a.nível === 'perigo') ? 'perigo' : avisos.some((a) => a.nível === 'atenção') ? 'atenção' : 'sem-sinais';
  return { tipo, rótulo, detalhes, avisos, nível, endereço, truncado };
}
