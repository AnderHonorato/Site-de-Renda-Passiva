/**
 * Texto para fala: lê um texto em voz alta com a voz do aparelho (Web Speech API), no navegador.
 *
 * Não gera arquivo de áudio: a API só toca o som, não entrega o áudio. Gerar arquivo exigiria um servidor
 * com voz sintética própria, o que fica fora desta ferramenta.
 */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { mostrarErro, limparErros } from '../núcleo/interface.js';
import { ícone } from '../núcleo/ícones.js';
import { criarExecucaoVisual, resolverDuracaoApresentacao } from '../núcleo/execucao-visual.js';
import { formatarDuração } from '../cálculos/textos.js';
import {
  LIMITE_DE_CARACTERES, VELOCIDADES, TONS, PALAVRAS_POR_MINUTO, TAMANHO_DO_TRECHO,
  conferirTexto, prepararLeitura, listarVozes, rotularVoz, explicarFaltaDeVozes, acharVoz, lerEscala,
  estimarSegundos, criarLeitor,
} from '../cálculos/texto-para-fala.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const comVírgula = (valor) => String(valor).replace('.', ',');
const resumir = (texto, máximo = 50) => (texto.length > máximo ? `${texto.slice(0, máximo - 1)}…` : texto);

/** Texto do exemplo de "Como usar" (conferido no teste da ferramenta). */
export const TEXTO_DE_EXEMPLO = 'Bom dia, pessoal. A reunião de hoje começa às dez horas, na sala dois.\n\nTragam o relatório do mês.';

/**
 * Inicia a leitura e monta o que a tela mostra. Recebe o sintetizador e as vozes por parâmetro, para os
 * testes conferirem tudo no Node, sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 * @param {{
 *   sintetizador: any, criarFala: (texto: string) => any, vozes: any[],
 *   aoMudar?: (situação: any) => void,
 * }} ambiente
 */
export function iniciarLeitura(dados, { sintetizador, criarFala, vozes, aoMudar }) {
  const erroDoTexto = conferirTexto(dados.texto);
  if (erroDoTexto) throw new ErroDeEntrada(erroDoTexto, 'texto');

  const filtros = { todosOsIdiomas: dados.todosOsIdiomas === 'sim', sóDoAparelho: dados.sóDoAparelho !== 'não' };
  const disponíveis = listarVozes(vozes, filtros);
  if (!disponíveis.length) throw new ErroDeEntrada(explicarFaltaDeVozes(vozes, filtros), 'voz');
  const voz = acharVoz(disponíveis, dados.voz);
  const velocidade = lerEscala(dados.velocidade, { mín: 0.5, máx: 2, padrão: 1 });
  const tom = lerEscala(dados.tom, { mín: 0.5, máx: 1.5, padrão: 1 });

  const leitura = prepararLeitura(dados.texto);
  const leitor = criarLeitor({ sintetizador, criarFala, trechos: leitura.trechos, voz, velocidade, tom, aoMudar });
  leitor.iniciar();

  const duração = estimarSegundos(leitura.palavras, velocidade);
  const observações = [
    'O som sai do seu aparelho e o texto não é enviado para este site. Não é gerado arquivo de áudio: a leitura só toca na hora.',
  ];
  if (!voz.localService) {
    observações.push('Esta voz é de rede: o navegador pode enviar o texto ao fornecedor da voz para transformá-lo em áudio. Para manter tudo no aparelho, escolha uma voz "no aparelho".');
  }
  if (duração > 0) observações.push(`A duração é uma estimativa (${PALAVRAS_POR_MINUTO} palavras por minuto em velocidade normal); cada voz tem o seu ritmo.`);

  return {
    leitor,
    saída: {
      valor: 'Lendo em voz alta',
      rotuloEstado: 'Leitura iniciada',
      resumo: `${leitura.parágrafos.length === 1 ? '1 parágrafo' : `${número(leitura.parágrafos.length)} parágrafos`}, ${número(leitura.palavras)} palavras. Use os botões abaixo para pausar, parar ou pular de parágrafo.`,
      linhas: [
        ['Voz', voz.name],
        ['Onde a voz roda', voz.localService ? 'no aparelho' : 'na rede (o texto pode sair do aparelho)'],
        ['Idioma da voz', voz.lang.replace(/_/g, '-')],
        ['Velocidade', `${comVírgula(velocidade)}×`],
        ['Tom', comVírgula(tom)],
        ['Parágrafos', número(leitura.parágrafos.length)],
        ['Palavras', número(leitura.palavras)],
        ['Caracteres', número(leitura.caracteres)],
        ['Duração estimada', formatarDuração(duração)],
      ],
      observações,
      texto: leitura.parágrafos.join('\n\n'),
    },
    leitura,
  };
}

export default {
  instruções: {
    passos: [
      'Escreva ou cole o texto (até 30.000 caracteres).',
      'Escolha a voz, a velocidade e o tom. A lista mostra as vozes em português do seu aparelho; as marcadas "de rede" podem enviar o texto ao fornecedor da voz, por isso começam desligadas.',
      'Toque em "Ler em voz alta". Use "Pausar", "Parar" e os botões de parágrafo para controlar a leitura.',
      'Para guardar o texto, use "Copiar". A ferramenta não cria arquivo de áudio.',
    ],
    exemplo: {
      texto: `Colando o recado "${TEXTO_DE_EXEMPLO.replace('\n\n', '" e, depois de uma linha em branco, "')}", a ferramenta separa 2 parágrafos e 19 palavras e lê o primeiro, depois o segundo. `
        + 'Em velocidade normal a estimativa é de 8 segundos; a 2× cai para 4. "Parágrafo seguinte" pula direto para "Tragam o relatório do mês."',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. O texto é lido em trechos de até ${TAMANHO_DO_TRECHO} caracteres, sem cortar palavra, porque alguns navegadores interrompem falas longas. `
      + 'As vozes e a qualidade dependem do aparelho e do navegador; nenhuma voz é baixada por esta página. '
      + 'Não gera arquivo de áudio nem baixa MP3: isso exigiria um servidor com voz sintética própria. '
      + 'Em alguns celulares o botão de pausa só interrompe, e continuar recomeça o trecho. '
      + 'Algumas vozes (por exemplo as "de rede" do Chrome) enviam o texto ao fornecedor da voz; por isso a lista mostra de onde cada voz vem e só usa vozes do aparelho por padrão. '
      + 'O texto fica só na memória desta página.',
    perguntas: [
      { p: 'Não aparece nenhuma voz em português. O que faço?', r: 'A lista vem do seu aparelho. No Windows, instale uma voz em Configurações > Hora e idioma > Fala; no Android, em Configurações > Idioma > Saída de texto para fala; no iPhone, em Ajustes > Acessibilidade > Conteúdo Falado > Vozes. Depois recarregue a página.' },
      { p: 'Posso baixar o áudio?', r: 'Não. O navegador só toca a voz, sem entregar o arquivo. Para gravar, use a gravação de tela com som do próprio aparelho.' },
      { p: 'O texto sai do meu aparelho?', r: 'Não sai desta página, e as vozes do aparelho também não enviam nada. Só as vozes marcadas "de rede" podem enviar o texto ao fornecedor da voz, e por isso ficam desligadas até você pedir.' },
      { p: 'A leitura parou no meio. Por quê?', r: 'Alguns navegadores interrompem a fala quando a aba fica em segundo plano ou a tela apaga. Volte à página e toque em "Ler em voz alta" de novo.' },
    ],
  },

  montar(raiz, ferramenta) {
    const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const sintetizador = suportado ? window.speechSynthesis : null;
    let leitor = null;
    let atualizarSituação = () => {};
    let progressoDaLeitura = null;
    let estadoVisualAtual = null;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Ler em voz alta',
      progressoExterno: true,
      campos: [
        { nome: 'texto', rótulo: 'Texto para ler', tipo: 'área', linhas: 8, exemplo: TEXTO_DE_EXEMPLO, dica: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. Cada linha vira um parágrafo.` },
        { nome: 'voz', rótulo: 'Voz', tipo: 'seleção', padrão: '', opções: [{ valor: '', rótulo: 'Carregando as vozes…' }], dica: 'Carregando as vozes do aparelho…' },
        { nome: 'velocidade', rótulo: 'Velocidade', tipo: 'seleção', padrão: '1', opções: VELOCIDADES },
        { nome: 'tom', rótulo: 'Tom da voz', tipo: 'seleção', padrão: '1', opções: TONS },
        { nome: 'sóDoAparelho', rótulo: 'Só vozes do aparelho (o texto não sai daqui)', tipo: 'caixa', padrão: true },
        { nome: 'todosOsIdiomas', rótulo: 'Mostrar vozes de outros idiomas', tipo: 'caixa', padrão: false },
      ],

      calcular(dados) {
        if (!suportado) {
          throw new ErroDeEntrada('Este navegador não tem leitura em voz alta (Web Speech API). Tente o Chrome, o Edge ou o Safari atualizados.', 'texto');
        }
        leitor?.parar();
        const { leitor: novo, saída } = iniciarLeitura(dados, {
          sintetizador,
          criarFala: (texto) => new window.SpeechSynthesisUtterance(texto),
          vozes: sintetizador.getVoices(),
          aoMudar: (situação) => atualizarSituação(situação),
        });
        leitor = novo;
        return saída;
      },

      aoResultado(elemento) {
        if (leitor) atualizarSituação(leitor.situação);
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        const campoVoz = elemento.querySelector('#campo-voz');
        const dicaDaVoz = elemento.querySelector('#campo-voz-dica');
        const caixaDoAparelho = elemento.querySelector('#campo-sóDoAparelho');
        const caixaDeIdiomas = elemento.querySelector('#campo-todosOsIdiomas');
        const áreaDoTexto = elemento.querySelector('#campo-texto');
        const botãoDeLer = formulário.querySelector('button[type="submit"]');
        const campoDaVoz = campoVoz.closest('.campo');

        // Controles da leitura: só aparecem enquanto há leitura.
        const controles = document.createElement('div');
        controles.className = 'ações t-2';
        controles.hidden = true;
        controles.setAttribute('role', 'group');
        controles.setAttribute('aria-label', 'Controles da leitura');
        const criarBotão = (rótulo, nomeDoÍcone) => {
          const botão = document.createElement('button');
          botão.type = 'button';
          botão.className = 'botão botão--linha';
          botão.innerHTML = `${ícone(nomeDoÍcone)}<span>${rótulo}</span>`;
          return botão;
        };
        const botãoPausar = criarBotão('Pausar', 'relógio');
        const botãoParar = criarBotão('Parar', 'fechar');
        const botãoAnterior = criarBotão('Parágrafo anterior', 'voltar');
        const botãoSeguinte = criarBotão('Parágrafo seguinte', 'seta');
        controles.append(botãoPausar, botãoParar, botãoAnterior, botãoSeguinte);

        const progressoNaTela = document.createElement('div');
        progressoNaTela.className = 'progresso t-2';
        progressoDaLeitura = criarExecucaoVisual(progressoNaTela, {
          titulo: 'Leitura em voz alta', tipo: 'voz', compacta: true,
          duracaoMinimaMs: resolverDuracaoApresentacao({ tipo: 'voz' }),
        });

        const situaçãoNaTela = document.createElement('p');
        situaçãoNaTela.className = 'pequeno t-2';
        situaçãoNaTela.id = 'situação-da-leitura';
        situaçãoNaTela.setAttribute('role', 'status');
        situaçãoNaTela.hidden = true;
        formulário.after(progressoNaTela, controles, situaçãoNaTela);

        const rótuloDoPausar = (texto) => { botãoPausar.querySelector('span').textContent = texto; };
        let parágrafos = [];

        atualizarSituação = (s) => {
          const ativo = s.estado === 'lendo' || s.estado === 'pausado';
          controles.hidden = !ativo;
          situaçãoNaTela.hidden = s.estado === 'parado';
          rótuloDoPausar(s.estado === 'pausado' ? 'Continuar' : 'Pausar');
          botãoDeLer.disabled = false;
          const trecho = parágrafos[s.parágrafo] ? `: “${resumir(parágrafos[s.parágrafo])}”` : '';
          const mensagemLendo = `Lendo o parágrafo ${s.parágrafo + 1} de ${s.totalDeParágrafos}${trecho}`;
          if (s.estado === 'lendo') situaçãoNaTela.textContent = mensagemLendo;
          else if (s.estado === 'pausado') situaçãoNaTela.textContent = `Pausado no parágrafo ${s.parágrafo + 1} de ${s.totalDeParágrafos}.`;
          else if (s.estado === 'fim') situaçãoNaTela.textContent = 'Leitura concluída.';
          else if (s.estado === 'parado') situaçãoNaTela.textContent = 'Leitura interrompida.';
          else if (s.estado === 'erro') {
            situaçãoNaTela.textContent = s.mensagem;
            mostrarErro(campoDaVoz, s.mensagem);
          }

          const estadoDoBadge = {
            lendo: ['Lendo', 'processando'],
            pausado: ['Pausada', 'pausado'],
            fim: ['Concluída', 'concluído'],
            parado: ['Interrompida', 'cancelado'],
            erro: ['Erro', 'erro'],
          }[s.estado];
          const badge = elemento.querySelector('#resultado [data-estado-resultado]');
          if (estadoDoBadge && badge) {
            badge.textContent = estadoDoBadge[0];
            badge.dataset.estadoResultado = estadoDoBadge[1];
          }

          if (s.estado === 'lendo' && estadoVisualAtual === 'lendo') {
            progressoDaLeitura?.andar(undefined, mensagemLendo);
          } else if (s.estado !== estadoVisualAtual) {
            estadoVisualAtual = s.estado;
            if (s.estado === 'lendo') progressoDaLeitura?.iniciar(mensagemLendo);
            else if (s.estado === 'pausado') progressoDaLeitura?.esconder();
            else if (s.estado === 'fim') progressoDaLeitura?.concluir('Leitura concluída.');
            else if (s.estado === 'parado') progressoDaLeitura?.cancelar('Leitura interrompida.');
            else if (s.estado === 'erro') progressoDaLeitura?.falhar(s.mensagem || 'A leitura falhou.');
          }
          botãoAnterior.disabled = s.parágrafo === 0 && !ativo;
          botãoSeguinte.disabled = s.parágrafo >= s.totalDeParágrafos - 1;
        };

        botãoPausar.addEventListener('click', () => {
          if (!leitor) return;
          if (leitor.situação.estado === 'pausado') leitor.continuar(); else leitor.pausar();
        });
        botãoParar.addEventListener('click', () => { leitor?.parar(); });
        botãoAnterior.addEventListener('click', () => { leitor?.mover(-1); });
        botãoSeguinte.addEventListener('click', () => { leitor?.mover(1); });

        // Guarda os parágrafos da leitura em andamento para mostrar o trecho atual.
        áreaDoTexto.addEventListener('input', () => { parágrafos = prepararLeitura(áreaDoTexto.value).parágrafos; });
        formulário.addEventListener('submit', () => { parágrafos = prepararLeitura(áreaDoTexto.value).parágrafos; }, { capture: true });
        formulário.addEventListener('reset', () => {
          leitor?.parar();
          controles.hidden = true;
          situaçãoNaTela.hidden = true;
          progressoDaLeitura?.esconder();
          estadoVisualAtual = 'parado';
        });
        // Sair da página (ou recarregar) não deixa a voz falando sozinha.
        window.addEventListener('pagehide', () => { sintetizador?.cancel(); });

        if (!suportado) {
          botãoDeLer.disabled = true;
          campoVoz.disabled = true;
          dicaDaVoz.textContent = 'Este navegador não tem leitura em voz alta (Web Speech API). Tente o Chrome, o Edge ou o Safari atualizados.';
          mostrarErro(campoDaVoz, 'Leitura em voz alta indisponível neste navegador.');
          return;
        }

        /** Preenche a lista de vozes conforme os filtros; mantém a escolha anterior quando ainda existe. */
        let esperou = false;
        function desenharVozes() {
          const todas = sintetizador.getVoices();
          const filtros = { todosOsIdiomas: caixaDeIdiomas.checked, sóDoAparelho: caixaDoAparelho.checked };
          const lista = listarVozes(todas, filtros);
          const anterior = campoVoz.value;
          campoVoz.replaceChildren(...lista.map((voz) => {
            const opção = document.createElement('option');
            opção.value = voz.voiceURI;
            opção.textContent = rotularVoz(voz);
            return opção;
          }));
          if (lista.some((v) => v.voiceURI === anterior)) campoVoz.value = anterior;
          limparErros(formulário);
          if (lista.length) {
            dicaDaVoz.textContent = `${lista.length === 1 ? '1 voz disponível' : `${lista.length} vozes disponíveis`}${lista.some((v) => !v.localService) ? '. As "de rede" podem enviar o texto ao fornecedor da voz.' : '.'}`;
          } else if (todas.length === 0 && !esperou) {
            dicaDaVoz.textContent = 'Carregando as vozes do aparelho…';
            const opção = document.createElement('option');
            opção.value = '';
            opção.textContent = 'Carregando as vozes…';
            campoVoz.replaceChildren(opção);
          } else {
            const opção = document.createElement('option');
            opção.value = '';
            opção.textContent = 'Nenhuma voz disponível';
            campoVoz.replaceChildren(opção);
            dicaDaVoz.textContent = explicarFaltaDeVozes(todas, filtros);
          }
        }
        sintetizador.addEventListener?.('voiceschanged', desenharVozes);
        caixaDoAparelho.addEventListener('change', desenharVozes);
        caixaDeIdiomas.addEventListener('change', desenharVozes);
        desenharVozes();
        // Alguns navegadores só entregam as vozes depois; se nada chegar em 2 s, explica a falta.
        setTimeout(() => { esperou = true; desenharVozes(); }, 2000);
      },
    });
  },
};
