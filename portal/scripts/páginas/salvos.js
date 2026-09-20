/** Meus salvos: favoritos, histórico e cópia de segurança. */
import { ferramentas, ferramentaPorSlug } from '../../dados/catálogo.js';
import { desenharLista, ligarLista } from '../núcleo/lista.js';
import { lerFavoritos, lerRecentes, limparRecentes } from '../núcleo/preferências.js';
import { exportarTudo, importarTudo, armazenamentoAtivo } from '../núcleo/armazenamento.js';
import { baixar } from '../núcleo/exportar.js';
import { avisar } from '../núcleo/interface.js';

const listaFavoritos = document.getElementById('lista-favoritos');
const listaRecentes = document.getElementById('lista-recentes');

function porSlugs(slugs) {
  return slugs.map((s) => ferramentaPorSlug[s]).filter(Boolean);
}

function desenharTudo() {
  desenharLista(listaFavoritos, porSlugs(lerFavoritos()), {
    vazio: armazenamentoAtivo
      ? 'Nenhum favorito ainda. Use o marcador ao lado do nome de qualquer ferramenta.'
      : 'Este navegador está bloqueando o armazenamento local, então favoritos não podem ser guardados.',
  });
  desenharLista(listaRecentes, porSlugs(lerRecentes()), {
    vazio: 'Nenhuma ferramenta aberta ainda neste navegador.',
  });
}

desenharTudo();
ligarLista(listaFavoritos, ferramentas, desenharTudo);
ligarLista(listaRecentes, ferramentas, desenharTudo);

document.getElementById('limpar-recentes')?.addEventListener('click', () => {
  limparRecentes();
  desenharTudo();
  avisar('Histórico limpo.');
});

document.getElementById('exportar-cópia')?.addEventListener('click', () => {
  const cópia = exportarTudo();
  const data = new Date().toISOString().slice(0, 10);
  baixar(JSON.stringify(cópia, null, 2), `ferramentas-do-ander-${data}.json`, 'application/json');
  avisar('Cópia baixada.');
});

document.getElementById('importar-cópia')?.addEventListener('change', async (evento) => {
  const entrada = evento.target;
  const arquivo = entrada instanceof HTMLInputElement ? entrada.files?.[0] : null;
  if (!arquivo) return;
  // Limite de tamanho: uma cópia legítima tem alguns kilobytes.
  if (arquivo.size > 512 * 1024) {
    avisar('Arquivo grande demais para ser uma cópia do portal.');
    entrada.value = '';
    return;
  }
  try {
    const { importadas, ignoradas } = importarTudo(JSON.parse(await arquivo.text()));
    desenharTudo();
    avisar(`${importadas} item(ns) importado(s)${ignoradas ? `, ${ignoradas} ignorado(s)` : ''}.`);
  } catch (erro) {
    avisar(erro instanceof Error ? erro.message : 'Não foi possível ler o arquivo.');
  } finally {
    entrada.value = '';
  }
});
