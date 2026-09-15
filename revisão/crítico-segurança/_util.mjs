// Utilitários dos testes de evidência do crítico de segurança e correção.
// Não fazem parte do código de produção. Importam as funções puras diretamente dos produtos.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PRODUTOS = {
  0: 'compartilhado',
  1: '1. Ferramentas para confeitaria',
  2: '2. Atividades escolares para imprimir',
  3: '3. Ferramentas para crochê e artesanato',
  4: '4. Planejamento de churrasco e festas',
  5: '5. Calculadoras de pintura e reforma',
  6: '6. Moldes de caixas e embalagens',
};

export function caminho(produto, relativo) {
  return path.join(RAIZ, PRODUTOS[produto], relativo);
}

export function importar(produto, relativo) {
  return import(pathToFileURL(caminho(produto, relativo)).href);
}

// localStorage falso (Map), para testar armazenamento e importação sem navegador.
export function criarLocalStorageFalso() {
  const mapa = new Map();
  return {
    getItem: (chave) => (mapa.has(chave) ? mapa.get(chave) : null),
    setItem: (chave, valor) => mapa.set(chave, String(valor)),
    removeItem: (chave) => mapa.delete(chave),
    key: (índice) => [...mapa.keys()][índice] ?? null,
    get length() {
      return mapa.size;
    },
    mapa,
  };
}

// Teto exato de A/B com inteiros BigInt positivos.
export function tetoExato(numerador, denominador) {
  return (numerador + denominador - 1n) / denominador;
}
