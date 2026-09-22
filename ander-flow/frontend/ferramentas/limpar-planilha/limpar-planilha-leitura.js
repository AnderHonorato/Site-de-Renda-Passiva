// limpar-planilha-leitura.js — leitura de CSV/XLSX/XLS (etapa 1). O CSV é analisado com um
// analisador próprio (detecção de separador, aspas e quebra de linha dentro de aspas); XLSX/XLS
// usa a biblioteca SheetJS injetada por quem chama (no navegador, `/estatico/compartilhado/
// bibliotecas/xlsx.mjs`; nos testes, o pacote `xlsx` do node_modules). Sem DOM: `arquivo` só
// precisa responder a `.name`, `.size`, `.text()`/`.arrayBuffer()` (File/Blob do navegador e do Node).

export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB (docs/contratos.md §13.6)
const SEPARADORES_CANDIDATOS = [',', ';', '\t'];

/** Remove o BOM UTF-8 (U+FEFF) do início do texto, se houver. Função pura. */
export function removerBom(texto) {
  if (typeof texto !== 'string') return '';
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

function primeiraLinha(texto) {
  let dentroDeAspas = false;
  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (caractere === '"') dentroDeAspas = !dentroDeAspas;
    else if (caractere === '\n' && !dentroDeAspas) return texto.slice(0, indice);
  }
  return texto;
}

function contarForaDeAspas(texto, caractere) {
  let contagem = 0;
  let dentroDeAspas = false;
  for (const atual of texto) {
    if (atual === '"') dentroDeAspas = !dentroDeAspas;
    else if (atual === caractere && !dentroDeAspas) contagem += 1;
  }
  return contagem;
}

/** Detecta o separador (`,` `;` tab) pela linha de cabeçalho, ignorando ocorrências dentro de aspas. Função pura. */
export function detectarSeparador(texto) {
  const linha = primeiraLinha(texto);
  let melhor = ',';
  let melhorContagem = 0;
  for (const candidato of SEPARADORES_CANDIDATOS) {
    const contagem = contarForaDeAspas(linha, candidato);
    if (contagem > melhorContagem) {
      melhorContagem = contagem;
      melhor = candidato;
    }
  }
  return melhor;
}

/**
 * Analisador de CSV: separador configurável, aspas com escape `""`, quebra de linha (`\n` ou
 * `\r\n`) dentro de campo com aspas. Devolve linhas como arrays de strings (a primeira é o
 * cabeçalho). Linhas totalmente vazias ao final (por causa de quebra de linha final) são
 * descartadas. Função pura.
 */
export function analisarCsv(texto, separador = ',') {
  const linhas = [];
  let linhaAtual = [];
  let campoAtual = '';
  let dentroDeAspas = false;
  const bruto = typeof texto === 'string' ? texto : '';

  for (let indice = 0; indice < bruto.length; indice += 1) {
    const caractere = bruto[indice];

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (bruto[indice + 1] === '"') {
          campoAtual += '"';
          indice += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campoAtual += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === separador) {
      linhaAtual.push(campoAtual);
      campoAtual = '';
    } else if (caractere === '\r') {
      // ignorado; a quebra de linha real é tratada em '\n'
    } else if (caractere === '\n') {
      linhaAtual.push(campoAtual);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = '';
    } else {
      campoAtual += caractere;
    }
  }

  if (campoAtual !== '' || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    linhas.push(linhaAtual);
  }

  while (linhas.length > 0) {
    const ultima = linhas[linhas.length - 1];
    if (ultima.length === 1 && ultima[0] === '') linhas.pop();
    else break;
  }

  return linhas;
}

/** Junta cabeçalho + linhas de dados a partir do resultado de `analisarCsv`. Função pura. */
export function separarCabecalhoDasLinhas(linhasBrutas) {
  const [cabecalho = [], ...resto] = linhasBrutas;
  const numeroColunas = cabecalho.length;
  const linhas = resto.map((linha) => {
    const normalizada = linha.slice(0, numeroColunas);
    while (normalizada.length < numeroColunas) normalizada.push('');
    return normalizada;
  });
  return { cabecalho, linhas };
}

/** Analisa um texto de CSV completo (com ou sem BOM): detecta separador e devolve {cabecalho, linhas, separador}. Função pura. */
export function analisarTextoCsv(textoOriginal) {
  const texto = removerBom(textoOriginal ?? '');
  const separador = detectarSeparador(texto);
  const linhasBrutas = analisarCsv(texto, separador);
  const { cabecalho, linhas } = separarCabecalhoDasLinhas(linhasBrutas);
  return { cabecalho, linhas, separador };
}

/** Converte uma pasta de planilha (XLSX/XLS) lida pelo SheetJS em {cabecalho, linhas}. Função pura (recebe o módulo). */
export function converterPlanilhaXlsx(modulo, bytesArrayBuffer) {
  const livro = modulo.read(bytesArrayBuffer, { type: 'array' });
  const nomeAba = livro.SheetNames[0];
  const folha = livro.Sheets[nomeAba];
  const matriz = modulo.utils.sheet_to_json(folha, { header: 1, raw: false, defval: '' });
  const [cabecalhoBruto = [], ...resto] = matriz;
  const cabecalho = cabecalhoBruto.map((valor) => String(valor ?? ''));
  const linhas = resto.map((linha) => cabecalho.map((_, indice) => String(linha[indice] ?? '')));
  return { cabecalho, linhas };
}

function extensaoDoArquivo(nome) {
  const ponto = String(nome ?? '').lastIndexOf('.');
  return ponto === -1 ? '' : String(nome).slice(ponto).toLowerCase();
}

/**
 * Lê um arquivo (File/Blob com `.name`, `.size`, `.text()`, `.arrayBuffer()`) e devolve
 * `{ ok: true, cabecalho, linhas, separador, extensao, nomeArquivo }` ou
 * `{ ok: false, erro: '<codigo>' }`. Para XLSX/XLS é preciso passar `{ xlsx }` (o módulo SheetJS);
 * sem ele, arquivos XLSX/XLS devolvem `biblioteca_indisponivel`.
 */
export async function lerArquivo(arquivo, { xlsx } = {}) {
  if (!arquivo) return { ok: false, erro: 'arquivo_ausente' };
  if (typeof arquivo.size === 'number' && arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { ok: false, erro: 'arquivo_grande_demais' };
  }

  const nomeArquivo = arquivo.name ?? 'planilha';
  const extensao = extensaoDoArquivo(nomeArquivo);

  if (extensao === '.csv' || extensao === '.txt') {
    const texto = await arquivo.text();
    const { cabecalho, linhas, separador } = analisarTextoCsv(texto);
    if (cabecalho.length === 0) return { ok: false, erro: 'planilha_vazia' };
    return { ok: true, cabecalho, linhas, separador, extensao: '.csv', nomeArquivo };
  }

  if (extensao === '.xlsx' || extensao === '.xls') {
    if (!xlsx) return { ok: false, erro: 'biblioteca_indisponivel' };
    const bytes = await arquivo.arrayBuffer();
    const { cabecalho, linhas } = converterPlanilhaXlsx(xlsx, bytes);
    if (cabecalho.length === 0) return { ok: false, erro: 'planilha_vazia' };
    return { ok: true, cabecalho, linhas, separador: ',', extensao, nomeArquivo };
  }

  return { ok: false, erro: 'formato_nao_suportado' };
}
