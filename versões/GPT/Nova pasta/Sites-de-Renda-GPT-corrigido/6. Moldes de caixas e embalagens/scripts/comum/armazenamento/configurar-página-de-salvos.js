// Sincronizado de compartilhado/scripts/armazenamento/configurar-página-de-salvos.js — edite a origem e rode "npm run sincronizar" na raiz.
// Página Salvos: lista os itens locais de cada coleção do produto com ações de abrir,
// duplicar e excluir, e oferece exportar, importar e apagar a cópia local.
import { confirmarAção } from '../interface/confirmar-ação.js';
import { criarElemento } from '../interface/criar-elemento.js';
import { exibirMensagem } from '../interface/exibir-mensagem.js';
import { obterRaiz } from '../interface/obter-raiz.js';
import { baixarArquivo } from './baixar-arquivo.js';
import { criarArmazenamento } from './criar-armazenamento.js';
import { duplicarRegistroLocal } from './duplicar-registro-local.js';
import { excluirRegistroLocal } from './excluir-registro-local.js';
import { exportarCópiaLocal } from './exportar-cópia-local.js';
import { importarCópiaLocal } from './importar-cópia-local.js';
import { listarRegistrosLocais } from './listar-registros-locais.js';

const TAMANHO_MÁXIMO_DE_IMPORTAÇÃO = 2_000_000;
const formatadorDeData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function descreverComSegurança(coleção, registro) {
  try {
    const texto = coleção.descrever(registro);
    return typeof texto === 'string' && texto.trim() ? texto : `${coleção.rótuloSingular ?? 'item'} sem nome`;
  } catch {
    return `${coleção.rótuloSingular ?? 'item'} sem nome`;
  }
}

function dataLegível(texto) {
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? '' : formatadorDeData.format(data);
}

export function configurarPáginaDeSalvos(coleçõesLocais) {
  const contêiner = document.querySelector('[data-salvos-coleções]');
  if (!contêiner) return;
  const armazenamento = criarArmazenamento();
  const raiz = obterRaiz();

  if (!armazenamento.disponível) {
    document.querySelector('[data-salvos-indisponível]').hidden = false;
    for (const botão of document.querySelectorAll('[data-exportar-cópia], [data-importar-cópia], [data-apagar-dados-locais]')) botão.disabled = true;
    return;
  }

  function renderizar() {
    const seções = coleçõesLocais.map((coleção) => {
      const registros = listarRegistrosLocais(coleção.chave, { armazenamento });
      const títuloId = `salvos-${coleção.chave}`;
      const conteúdo = registros.length
        ? criarElemento(
            'ul',
            { classe: 'lista-de-salvos-itens' },
            registros.map((registro) =>
              criarElemento('li', { classe: 'item-salvo' }, [
                criarElemento('div', { classe: 'item-salvo-texto' }, [
                  criarElemento('p', { classe: 'item-salvo-título', texto: descreverComSegurança(coleção, registro) }),
                  criarElemento('p', { classe: 'campo-ajuda', texto: `Atualizado em ${dataLegível(registro.atualizadoEm)}` }),
                ]),
                criarElemento('div', { classe: 'item-salvo-ações' }, [
                  criarElemento('a', { classe: 'botão botão-secundário', texto: 'Abrir', atributos: { href: `${raiz}${coleção.páginaDeEdição}?registro=${encodeURIComponent(registro.id)}` } }),
                  criarElemento('button', { classe: 'botão botão-fantasma', texto: 'Duplicar', atributos: { type: 'button' }, dados: { ação: 'duplicar', coleção: coleção.chave, id: registro.id } }),
                  criarElemento('button', { classe: 'botão botão-fantasma', texto: 'Excluir', atributos: { type: 'button' }, dados: { ação: 'excluir', coleção: coleção.chave, id: registro.id } }),
                ]),
              ]),
            ),
          )
        : criarElemento('div', { classe: 'estado-vazio' }, [
            criarElemento('p', { texto: `Nenhum item em “${coleção.rótulo}” ainda.` }),
            criarElemento('a', { classe: 'botão botão-secundário', texto: 'Abrir a ferramenta', atributos: { href: `${raiz}${coleção.páginaDeEdição}` } }),
          ]);
      return criarElemento('section', { classe: 'salvos-coleção', atributos: { 'aria-labelledby': títuloId } }, [
        criarElemento('h2', { texto: `${coleção.rótulo} (${registros.length})`, atributos: { id: títuloId } }),
        conteúdo,
      ]);
    });
    contêiner.replaceChildren(...seções);
  }

  contêiner.addEventListener('click', async (evento) => {
    const botão = evento.target.closest('button[data-ação]');
    if (!botão) return;
    const coleção = coleçõesLocais.find((item) => item.chave === botão.dataset.coleção);
    if (!coleção) return;
    if (botão.dataset.ação === 'duplicar') {
      const resultado = duplicarRegistroLocal(coleção.chave, botão.dataset.id, { armazenamento });
      exibirMensagem(resultado.salvo ? 'Cópia criada.' : resultado.erro, { tipo: resultado.salvo ? 'sucesso' : 'erro' });
      renderizar();
      return;
    }
    const confirmado = await confirmarAção({ título: 'Excluir item?', mensagem: 'O item será apagado deste aparelho. Esta ação não pode ser desfeita.', confirmar: 'Excluir', perigosa: true });
    if (!confirmado) return;
    const excluído = excluirRegistroLocal(coleção.chave, botão.dataset.id, { armazenamento });
    exibirMensagem(excluído ? 'Item excluído.' : 'O item não foi encontrado.', { tipo: excluído ? 'sucesso' : 'erro' });
    renderizar();
  });

  document.querySelector('[data-exportar-cópia]')?.addEventListener('click', () => {
    const cópia = exportarCópiaLocal(coleçõesLocais, { armazenamento });
    const data = new Date().toISOString().slice(0, 10);
    baixarArquivo(`${armazenamento.prefixo}-cópia-${data}.json`, JSON.stringify(cópia, null, 2));
    exibirMensagem('Cópia de segurança gerada.', { tipo: 'sucesso' });
  });

  const seletorDeArquivo = document.querySelector('[data-arquivo-de-cópia]');
  document.querySelector('[data-importar-cópia]')?.addEventListener('click', () => seletorDeArquivo?.click());
  seletorDeArquivo?.addEventListener('change', async () => {
    const [arquivo] = seletorDeArquivo.files ?? [];
    seletorDeArquivo.value = '';
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MÁXIMO_DE_IMPORTAÇÃO) {
      exibirMensagem('O arquivo é grande demais para ser uma cópia deste site.', { tipo: 'erro' });
      return;
    }
    const resultado = importarCópiaLocal(await arquivo.text(), { coleçõesLocais, armazenamento });
    if (!resultado.válido) {
      exibirMensagem(resultado.erro, { tipo: 'erro' });
      return;
    }
    const ignorados = resultado.rejeitados ? ` ${resultado.rejeitados} item(ns) com formato inválido foram ignorados.` : '';
    exibirMensagem(`${resultado.importados} item(ns) importados.${ignorados}`, { tipo: 'sucesso' });
    renderizar();
  });

  document.querySelector('[data-apagar-dados-locais]')?.addEventListener('click', async () => {
    const confirmado = await confirmarAção({
      título: 'Apagar todos os itens salvos?',
      mensagem: 'Todos os itens salvos neste aparelho serão apagados. Exporte uma cópia antes, se quiser guardá-los. Sua escolha de privacidade não é alterada.',
      confirmar: 'Apagar tudo',
      perigosa: true,
    });
    if (!confirmado) return;
    for (const coleção of coleçõesLocais) armazenamento.remover(`coleção:${coleção.chave}`);
    exibirMensagem('Itens salvos apagados deste aparelho.', { tipo: 'sucesso' });
    renderizar();
  });

  renderizar();
}
