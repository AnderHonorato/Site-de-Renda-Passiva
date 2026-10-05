/**
 * Página inicial: orquestra os blocos.
 *
 * Cada bloco (contagens, busca, listas, boas-vindas) é carregado por `import()` dentro de um
 * `isolarBloco`. Se um falhar, só ele mostra a mensagem com "Tentar de novo"; os outros seguem.
 */
import { isolarBloco, carregarBloco } from '../núcleo/isolar-bloco.js';

const aqui = (arquivo) => new URL(arquivo, import.meta.url).href;

/** Carrega o módulo do bloco e chama o `montar` dele. */
const bloco = (arquivo) => (tentativa) => carregarBloco(aqui(arquivo), tentativa).then((módulo) => módulo.montar());

isolarBloco('contagens', bloco('./início/contagens.js'));
isolarBloco('busca', bloco('./início/busca.js'), { alvo: document.getElementById('bloco-busca') });
isolarBloco('listas', bloco('./início/listas.js'), { alvo: document.getElementById('lista-prontas') });
isolarBloco('boas-vindas', bloco('./início/boas-vindas.js'));
