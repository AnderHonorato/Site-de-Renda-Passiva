/** Meus salvos: favoritos, histórico e cópia de segurança. */
import { ferramentas, ferramentaPorSlug } from '../../dados/catálogo.js';
import { desenharLista, ligarLista } from '../núcleo/lista.js';
import { lerFavoritos, lerRecentes, limparRecentes } from '../núcleo/preferências.js';
import { exportarTudo, importarTudo, armazenamentoAtivo } from '../núcleo/armazenamento.js';
import { baixar } from '../núcleo/exportar.js';
import { avisar } from '../núcleo/interface.js';
import { t } from '../núcleo/idioma.js';

const listaFavoritos = document.getElementById('lista-favoritos');
const listaRecentes = document.getElementById('lista-recentes');

function porSlugs(slugs) {
  return slugs.map((s) => ferramentaPorSlug[s]).filter(Boolean);
}

function desenharTudo() {
  desenharLista(listaFavoritos, porSlugs(lerFavoritos()), {
    vazio: armazenamentoAtivo
      ? t('salvos.nenhumFavorito')
      : t('salvos.armazenamentoBloqueado'),
  });
  desenharLista(listaRecentes, porSlugs(lerRecentes()), {
    vazio: t('salvos.nenhumaRecente'),
  });
}

desenharTudo();
ligarLista(listaFavoritos, ferramentas, desenharTudo);
ligarLista(listaRecentes, ferramentas, desenharTudo);

document.getElementById('limpar-recentes')?.addEventListener('click', () => {
  limparRecentes();
  desenharTudo();
  avisar(t('salvos.históricoLimpo'));
});

document.getElementById('exportar-cópia')?.addEventListener('click', () => {
  const cópia = exportarTudo();
  const data = new Date().toISOString().slice(0, 10);
  baixar(JSON.stringify(cópia, null, 2), `ferramentas-do-ander-${data}.json`, 'application/json');
  avisar(t('salvos.cópiaBaixada'));
});

document.getElementById('importar-cópia')?.addEventListener('change', async (evento) => {
  const entrada = evento.target;
  const arquivo = entrada instanceof HTMLInputElement ? entrada.files?.[0] : null;
  if (!arquivo) return;
  // Limite de tamanho: uma cópia legítima tem alguns kilobytes.
  if (arquivo.size > 512 * 1024) {
    avisar(t('salvos.arquivoGrande'));
    entrada.value = '';
    return;
  }
  try {
    const { importadas, ignoradas } = importarTudo(JSON.parse(await arquivo.text()));
    desenharTudo();
    avisar(t('salvos.importados', { importadas, ignoradas: ignoradas ? t('salvos.ignorados', { ignoradas }) : '' }));
  } catch (erro) {
    avisar(erro instanceof Error ? erro.message : t('salvos.nãoLeu'));
  } finally {
    entrada.value = '';
  }
});
