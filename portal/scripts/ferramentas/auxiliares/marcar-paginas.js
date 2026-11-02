/**
 * Marcar páginas tocando nos números, no lugar das miniaturas.
 *
 * O portal não tem leitor de PDF para desenhar miniaturas (seria uma biblioteca nova, com
 * o próprio arquivo de trabalhador), então a escolha de páginas é feita por um campo de
 * texto ("1, 3-5, 9") e, como apoio, por esta fileira de botões numerados. Os dois andam
 * juntos: marcar um botão reescreve o campo, e digitar no campo acende os botões.
 *
 * A fileira fica dentro de um bloco recolhido, para o celular não ganhar uma tela de números
 * que ninguém pediu, e só aparece em PDFs de até `limiteDaGrade` páginas.
 */
import { escapar } from '../../núcleo/texto.js';
import { interpretarPáginas, condensarPáginas, páginas } from '../../cálculos/páginas-do-pdf.js';

/**
 * @param {{
 *   depoisDe: HTMLElement,
 *   entrada: HTMLInputElement,
 *   ordem?: 'digitada'|'crescente',
 *   limiteDaGrade?: number,
 * }} opções `depoisDe` é o elemento depois do qual o bloco entra (o campo de texto das páginas)
 * @returns {{definirTotal: (total: number) => void}}
 */
export function criarMarcadorDePáginas({ depoisDe, entrada, ordem = 'crescente', limiteDaGrade = 300 }) {
  const bloco = document.createElement('div');
  bloco.className = 'prosa t-2';
  bloco.hidden = true;
  depoisDe.after(bloco);

  let total = 0;
  /** Última lista boa (texto válido ou vazio); o texto pela metade ("3-") não apaga os botões. */
  let lista = [];
  let botões = [];

  function pintar() {
    const marcadas = new Set(lista);
    for (const botão of botões) botão.setAttribute('aria-pressed', String(marcadas.has(Number(botão.dataset.página))));
  }

  function lerDoTexto() {
    if (!entrada.value.trim()) { lista = []; return; }
    const lida = interpretarPáginas(entrada.value, total, { ordem });
    if (lida.ok) lista = lida.páginas;
  }

  /** Escreve a lista no campo e avisa quem escuta (o resultado antigo some, por exemplo). */
  function escrever(nova) {
    lista = nova;
    entrada.value = condensarPáginas(lista);
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    pintar();
  }

  function alternar(página) {
    if (lista.includes(página)) escrever(lista.filter((n) => n !== página));
    else escrever(ordem === 'crescente' ? [...lista, página].sort((a, b) => a - b) : [...lista, página]);
  }

  function desenhar() {
    const botõesDosNúmeros = Array.from({ length: total }, (_, i) => i + 1)
      .map((n) => `<button type="button" aria-pressed="false" aria-label="Página ${n}" data-página="${n}">${n}</button>`).join('');
    bloco.innerHTML = `<details>
      <summary>Marcar as páginas tocando nos números</summary>
      <p class="pequeno suave">Toque no número para marcar ou desmarcar. O campo acima acompanha, e o contrário também.</p>
      <div class="pílulas t-2" role="group" aria-label="${escapar(`Páginas do PDF (${páginas(total)})`)}">${botõesDosNúmeros}</div>
      <div class="ações t-2">
        <button type="button" class="botão botão--linha" data-atalho="ímpares">Ímpares</button>
        <button type="button" class="botão botão--linha" data-atalho="pares">Pares</button>
        <button type="button" class="botão botão--linha" data-atalho="limpar">Limpar marcação</button>
      </div>
    </details>`;
    const fileira = bloco.querySelector('.pílulas');
    // A fileira de pílulas do portal rola de lado; aqui os números precisam quebrar linha.
    // Atribuição pelo código não passa pela regra de "sem atributo style" (a política só barra o atributo).
    fileira.style.flexWrap = 'wrap';
    fileira.style.overflowX = 'visible';
    fileira.style.maskImage = 'none';
    fileira.style.webkitMaskImage = 'none';
    botões = [...fileira.querySelectorAll('button')];
    lerDoTexto();
    pintar();
  }

  bloco.addEventListener('click', (evento) => {
    const botão = evento.target.closest('button');
    if (!botão) return;
    if (botão.dataset.página) { alternar(Number(botão.dataset.página)); return; }
    const todas = Array.from({ length: total }, (_, i) => i + 1);
    if (botão.dataset.atalho === 'ímpares') escrever(todas.filter((n) => n % 2 === 1));
    if (botão.dataset.atalho === 'pares') escrever(todas.filter((n) => n % 2 === 0));
    if (botão.dataset.atalho === 'limpar') escrever([]);
  });

  // Digitar no campo acende os botões; só reage quando o texto é válido ou está vazio.
  entrada.addEventListener('input', () => {
    lerDoTexto();
    pintar();
  });
  entrada.form?.addEventListener('reset', () => { lista = []; pintar(); });

  let permitido = true;
  const cabe = () => total > 0 && total <= limiteDaGrade;

  return {
    definirTotal(novoTotal) {
      total = novoTotal;
      bloco.hidden = !(cabe() && permitido);
      if (!cabe()) { bloco.replaceChildren(); botões = []; lista = []; return; }
      desenhar();
    },
    /** Liga e desliga o bloco sem perder o desenho (a ferramenta de girar só usa o bloco no modo "páginas escolhidas"). */
    mostrar(visível) {
      permitido = visível;
      bloco.hidden = !(cabe() && permitido);
    },
  };
}
