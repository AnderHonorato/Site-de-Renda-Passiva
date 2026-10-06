/** Organizar PDF: reordena, gira, duplica, apaga e insere páginas em branco numa lista, tudo no navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso, mostrarErro, limparErros, avisar } from '../núcleo/interface.js';
import { escapar } from '../núcleo/texto.js';
import { ícone } from '../núcleo/ícones.js';
import {
  listaOriginal, moverItem, girarItem, duplicarItem, removerItem, inserirBranca, inverterOrdem, resumoDaLista,
  descreverPágina, tamanhoDaBranca, medirPáginas, organizarPdf,
  LIMITE_DE_PÁGINAS_DA_LISTA, LIMITE_DE_ITENS, LIMITE_DO_HISTÓRICO,
} from '../cálculos/organizar-pdf.js';
import {
  páginas, formatarTamanho, mensagemDeErro, nomeBase, folga, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/páginas-do-pdf.js';
import { prepararEscolhaDePdf, carregarBiblioteca, ERRO_DA_BIBLIOTECA } from './auxiliares/escolher-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Seta para cima: a mesma seta para baixo do conjunto do portal, girada. */
const SETA_PARA_CIMA = ícone('seta-baixo')
  .replace('focusable="false">', 'focusable="false"><g transform="rotate(180 12 12)">')
  .replace('</svg>', '</g></svg>');

const RÓTULO_DO_GIRO = { 90: 'girada 90° à direita', 180: 'girada 180°', 270: 'girada 90° à esquerda' };

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor. Cada página vira uma linha da lista, com número, formato e orientação.',
      'Arrume a lista: use as setas para subir e descer, o botão de giro para virar a página, a cópia para duplicar, o mais para inserir uma página em branco depois dela e a lixeira para tirar. Para levar uma página longe, use "Mover o item da posição".',
      'Se errar, "Desfazer" volta um passo e "Restaurar ordem original" volta ao começo. "Inverter a ordem" vira a lista de trás para frente.',
      'Toque em "Gerar PDF organizado" e baixe o arquivo. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um escaneamento de 5 páginas saiu com a folha 2 sobrando, a página 3 de lado e a capa no fim. Na lista: tire a linha da página 2 (lixeira), '
        + 'gire a página 3 à direita e leve a capa para o começo (posição 5 para a posição 1). O PDF novo sai com 4 páginas, na ordem 5, 1, 3 (girada) e 4.',
    },
    limites: `Um PDF por vez, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e até ${número(LIMITE_DE_PÁGINAS_DA_LISTA)} páginas; a lista aceita até ${número(LIMITE_DE_ITENS)} linhas, contando cópias e páginas em branco. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser editado. '
      + 'Não há miniaturas nem arrastar páginas: o portal não tem um leitor de PDF para desenhá-las, então cada página aparece como uma linha com o número, o formato (A4, Carta...) e a orientação, e a ordem muda pelos botões. '
      + 'O giro é somado ao que a página já tinha. A página em branco copia o tamanho da página anterior (ou o da seguinte, se vier no começo). '
      + 'O PDF novo é montado do zero com as páginas da lista, sem recompressão: marcadores (sumário) e campos de formulário do original podem não ser mantidos, e links entre páginas podem deixar de funcionar. '
      + 'A montagem usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu arquivo é enviado para algum servidor?',
        r: 'Não. A biblioteca que monta o PDF é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'Por que não vejo a imagem de cada página?',
        r: 'Para mostrar miniaturas seria preciso um leitor de PDF dentro da página, e o portal ainda não tem um. Por isso a lista descreve cada página pelo número original, formato e orientação. Se precisar ver o conteúdo, abra o PDF no leitor do aparelho ao lado.',
      },
      {
        p: 'Posso juntar páginas de outro PDF?',
        r: 'Aqui, só reorganizar o arquivo escolhido. Para juntar PDFs, use "Juntar PDF" primeiro e organize o resultado.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'Ele não pode ser aberto aqui sem a senha. Abra no leitor de PDF, salve uma cópia sem proteção e use essa cópia.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    /** @type {import('../cálculos/organizar-pdf.js').Item[]} */
    let itens = [];
    let histórico = [];
    let medidas = [];
    /** Ligada em aoMontar: trava a lista, a barra e os campos de mover durante a gravação. */
    let travarEdição = () => {};

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar PDF organizado',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${número(LIMITE_DE_PÁGINAS_DA_LISTA)} páginas. Ele não sai do seu aparelho.`,
        },
        {
          nome: 'de', rótulo: 'Mover o item da posição', tipo: 'número', exemplo: '5',
          dica: 'Posição na lista, como aparece à esquerda de cada linha.',
        },
        {
          nome: 'para', rótulo: 'para a posição', tipo: 'número', exemplo: '1',
        },
      ],

      async calcular() {
        const pdf = escolha.atual();
        if (!pdf) throw new ErroDeEntrada(mensagemDeErro('sem_arquivo'), 'arquivo');
        if (itens.length === 0) {
          throw new Error('A lista está vazia. Use "Desfazer" ou "Restaurar ordem original" e deixe pelo menos uma página.');
        }

        escolha.travar(true);
        travarEdição(true);
        try {
          progresso.andar(10, 'Montando o PDF novo…');
          await folga();
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DA_BIBLIOTECA);
          }
          const r = await organizarPdf(pdf, itens, { biblioteca });
          if (!r.ok) throw new Error(r.mensagem);
          progresso.andar(90, 'Gravando o arquivo…');
          await folga();

          const resumo = resumoDaLista(itens, pdf.total);
          const observações = ['O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.'];
          if (!resumo.alterada) observações.push('Você não mudou nada na lista: o PDF novo tem as mesmas páginas, na mesma ordem.');
          return {
            valor: `PDF pronto: ${páginas(r.páginas)}`,
            resumo: `${páginas(pdf.total)} no original e ${páginas(r.páginas)} no PDF novo · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Páginas no original', número(pdf.total)],
              ['Páginas no PDF novo', número(r.páginas)],
              ['Páginas do original que ficaram de fora', número(resumo.removidas)],
              ['Páginas giradas', número(resumo.giradas)],
              ['Páginas copiadas (repetidas)', número(resumo.cópias)],
              ['Páginas em branco inseridas', número(resumo.brancas)],
              ['Tamanho do PDF novo', formatarTamanho(r.bytes.length)],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${nomeBase(pdf.nome)}-organizado`) }],
            observações,
          };
        } finally {
          escolha.travar(false);
          travarEdição(false);
        }
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        const resultado = elemento.querySelector('#resultado');
        const campoDe = elemento.querySelector('#campo-de');
        const campoPara = elemento.querySelector('#campo-para');
        campoDe.inputMode = 'numeric';
        campoPara.inputMode = 'numeric';

        const caixaDeMover = elemento.querySelector('.campos');
        const ações = formulário.querySelector('.ações');

        const barra = document.createElement('div');
        barra.className = 'ações t-2';
        barra.setAttribute('role', 'group');
        barra.setAttribute('aria-label', 'Ações da lista de páginas');
        barra.innerHTML = [
          ['mover', 'seta', 'Mover'],
          ['desfazer', 'atualizar', 'Desfazer'],
          ['inverter', 'filtro', 'Inverter a ordem'],
          ['branca-no-início', 'mais', 'Página em branco no início'],
          ['restaurar', 'fechar', 'Restaurar ordem original'],
        ].map(([ação, símbolo, texto]) => `<button type="button" class="botão botão--linha" data-barra="${ação}">${ícone(símbolo)}${texto}</button>`).join('');

        const resumoDaTela = document.createElement('p');
        resumoDaTela.className = 'pequeno t-2';
        const anúncio = document.createElement('p');
        anúncio.className = 'pequeno suave t-1';
        anúncio.setAttribute('role', 'status');
        anúncio.setAttribute('aria-live', 'polite');

        const lista = document.createElement('div');
        lista.className = 'lista-ferramentas t-2';
        lista.setAttribute('role', 'list');
        lista.setAttribute('aria-label', 'Páginas do PDF, na ordem do arquivo novo');

        // Tudo da edição fica escondido até haver um PDF escolhido.
        const painel = document.createElement('div');
        painel.hidden = true;
        painel.append(barra, resumoDaTela, anúncio, lista);
        caixaDeMover.hidden = true;
        ações.before(painel);
        const botãoDesfazer = barra.querySelector('[data-barra="desfazer"]');

        /** Durante a gravação a lista não pode mudar. */
        travarEdição = (travado) => {
          lista.inert = travado;
          barra.inert = travado;
          caixaDeMover.inert = travado;
        };

        const anunciar = (texto) => { anúncio.textContent = texto; };

        function desenhar() {
          painel.hidden = !escolha.atual();
          caixaDeMover.hidden = !escolha.atual();
          botãoDesfazer.disabled = histórico.length === 0;
          if (!escolha.atual()) { lista.replaceChildren(); return; }

          const resumo = resumoDaLista(itens, escolha.atual().total);
          const partes = [`${páginas(resumo.páginas)} na lista`];
          if (resumo.giradas) partes.push(`${número(resumo.giradas)} ${resumo.giradas === 1 ? 'girada' : 'giradas'}`);
          if (resumo.brancas) partes.push(`${número(resumo.brancas)} em branco`);
          if (resumo.cópias) partes.push(`${número(resumo.cópias)} ${resumo.cópias === 1 ? 'cópia' : 'cópias'}`);
          if (resumo.removidas) partes.push(`${número(resumo.removidas)} ${resumo.removidas === 1 ? 'página do original ficou' : 'páginas do original ficaram'} de fora`);
          resumoDaTela.textContent = itens.length ? partes.join(' · ') : 'A lista está vazia. Use "Desfazer" ou "Restaurar ordem original".';

          const vistas = new Set();
          lista.innerHTML = itens.map((item, i) => {
            const rótuloDoItem = item.tipo === 'branca' ? 'página em branco' : `página ${item.origem + 1}`;
            const completo = escapar(`posição ${i + 1}, ${rótuloDoItem}`);
            const botão = (ação, conteúdo, rótulo, desligado = false) => `<button type="button" class="ícone-botão${desligado ? ' campo--inativo' : ''}"`
              + ` data-ação="${ação}" data-índice="${i}" aria-label="${rótulo}: ${completo}" title="${rótulo}"${desligado ? ' disabled' : ''}>${conteúdo}</button>`;

            let título;
            let detalhe;
            const etiquetas = [];
            if (item.tipo === 'branca') {
              título = 'Página em branco';
              const [l, a] = tamanhoDaBranca(itens, i, medidas);
              detalhe = descreverPágina(l, a);
              etiquetas.push('<span class="etiqueta etiqueta--info">nova</span>');
            } else {
              const m = medidas[item.origem];
              título = `Página ${item.origem + 1} do original`;
              detalhe = descreverPágina(m.largura, m.altura, m.rotação + item.giro);
              if (item.giro) etiquetas.push(`<span class="etiqueta etiqueta--atenção">${RÓTULO_DO_GIRO[item.giro]}</span>`);
              if (vistas.has(item.origem)) etiquetas.push('<span class="etiqueta etiqueta--info">cópia</span>');
              vistas.add(item.origem);
            }
            return `<div class="ferramenta-linha" role="listitem">
              <span class="ferramenta-linha__ícone">${ícone('documento')}</span>
              <span class="ferramenta-linha__texto">
                <span class="ferramenta-linha__nome">${i + 1}. ${escapar(título)}${etiquetas.join('')}</span>
                <span class="ferramenta-linha__resumo">${escapar(detalhe)}</span>
              </span>
              <span class="ferramenta-linha__fim" data-botões>
                ${botão('subir', SETA_PARA_CIMA, 'Subir', i === 0)}
                ${botão('descer', ícone('seta-baixo'), 'Descer', i === itens.length - 1)}
                ${item.tipo === 'branca' ? '' : botão('girar', ícone('atualizar'), 'Girar 90° à direita')}
                ${item.tipo === 'branca' ? '' : botão('duplicar', ícone('copiar'), 'Duplicar')}
                ${botão('branca', ícone('mais'), 'Inserir página em branco depois')}
                ${botão('remover', ícone('lixeira'), 'Remover')}
              </span>
            </div>`;
          }).join('');

          // Seis botões de 36 px não cabem ao lado do texto em 320 px: a fileira de botões passa para
          // a linha de baixo, ocupando a largura toda. Atribuição pelo código, porque a política de
          // segurança do site só barra o ATRIBUTO style escrito no HTML.
          for (const fim of lista.querySelectorAll('[data-botões]')) {
            fim.style.gridColumn = '1 / -1';
            fim.style.flexWrap = 'wrap';
          }
        }

        /** Troca a lista guardando a anterior para "Desfazer". `nova === null`: passou do limite. */
        function aplicar(nova, aviso) {
          if (nova === null) { avisar(`A lista chegou ao limite de ${número(LIMITE_DE_ITENS)} páginas.`); return false; }
          if (nova === itens) return false;
          histórico.push(itens);
          if (histórico.length > LIMITE_DO_HISTÓRICO) histórico.shift();
          itens = nova;
          resultado.hidden = true;
          if (aviso) anunciar(aviso);
          desenhar();
          return true;
        }

        function focarEm(ação, índice) {
          const alvo = lista.querySelector(`[data-ação="${ação}"][data-índice="${índice}"]:not([disabled])`);
          (alvo ?? lista.querySelector(`[data-índice="${índice}"]:not([disabled])`) ?? barra.querySelector('button:not([disabled])'))?.focus();
        }

        lista.addEventListener('click', (evento) => {
          const botão = evento.target.closest('button[data-ação]');
          if (!botão || botão.disabled) return;
          const i = Number(botão.dataset.índice);
          const ação = botão.dataset.ação;
          const item = itens[i];
          const nome = item.tipo === 'branca' ? 'A página em branco' : `A página ${item.origem + 1}`;
          if (ação === 'subir' || ação === 'descer') {
            const destino = i + (ação === 'subir' ? -1 : 1);
            aplicar(moverItem(itens, i, destino), `${nome} foi para a posição ${destino + 1}.`);
            focarEm(ação, destino);
          } else if (ação === 'girar') {
            aplicar(girarItem(itens, i, 90), `${nome} girou 90° à direita.`);
            focarEm('girar', i);
          } else if (ação === 'duplicar') {
            if (aplicar(duplicarItem(itens, i), `${nome} foi copiada para a posição ${i + 2}.`)) focarEm('duplicar', i);
          } else if (ação === 'branca') {
            if (aplicar(inserirBranca(itens, i + 1), `Uma página em branco entrou na posição ${i + 2}.`)) focarEm('branca', i);
          } else if (ação === 'remover') {
            aplicar(removerItem(itens, i), `${nome} saiu da lista.`);
            focarEm('remover', Math.min(i, itens.length - 1));
          }
        });

        function moverPelosCampos() {
          limparErros(formulário);
          const lerPosição = (campo, nome) => {
            const texto = campo.value.trim();
            const valor = Number(texto);
            if (!/^\d+$/.test(texto) || valor < 1 || valor > itens.length) {
              mostrarErro(campo.closest('.campo'), itens.length
                ? `Informe ${nome} entre 1 e ${número(itens.length)}.` : 'A lista está vazia.');
              return null;
            }
            return valor - 1;
          };
          const de = lerPosição(campoDe, 'a posição de origem');
          if (de === null) return;
          const para = lerPosição(campoPara, 'a posição de destino');
          if (para === null) return;
          if (de === para) { mostrarErro(campoPara.closest('.campo'), 'O item já está nessa posição.'); return; }
          aplicar(moverItem(itens, de, para), `O item da posição ${de + 1} foi para a posição ${para + 1}.`);
        }
        for (const campo of [campoDe, campoPara]) {
          // Enter nestes campos move o item; só o botão "Gerar PDF organizado" grava o arquivo.
          campo.addEventListener('keydown', (evento) => {
            if (evento.key !== 'Enter') return;
            evento.preventDefault();
            moverPelosCampos();
          });
        }

        barra.addEventListener('click', (evento) => {
          const botão = evento.target.closest('button[data-barra]');
          if (!botão || botão.disabled) return;
          const ação = botão.dataset.barra;
          if (ação === 'mover') moverPelosCampos();
          else if (ação === 'desfazer') {
            itens = histórico.pop() ?? itens;
            resultado.hidden = true;
            anunciar('Último passo desfeito.');
            desenhar();
          } else if (ação === 'inverter') aplicar(inverterOrdem(itens), 'A ordem da lista foi invertida.');
          else if (ação === 'branca-no-início') aplicar(inserirBranca(itens, 0), 'Uma página em branco entrou no início.');
          else if (ação === 'restaurar') {
            aplicar(listaOriginal(escolha.atual().total), 'A lista voltou à ordem original.');
          }
        });

        escolha = prepararEscolhaDePdf(elemento, {
          limiteDePáginas: LIMITE_DE_PÁGINAS_DA_LISTA,
          aoMudar(pdf) {
            resultado.hidden = true;
            limparErros(formulário);
            histórico = [];
            anunciar('');
            campoDe.value = '';
            campoPara.value = '';
            if (!pdf) { itens = []; medidas = []; desenhar(); return; }
            medidas = medirPáginas(pdf.documento);
            itens = listaOriginal(pdf.total);
            desenhar();
          },
        });
        desenhar();
      },
    });
  },
};
