/**
 * Desenho do rodapé: uma bancada com as ferramentas do portal enfileiradas (martelo, calculadora,
 * lápis, régua, engrenagem com o visto, chave inglesa, lâmpada, caderno e rolo de pintura).
 *
 * SVG em linha para herdar as cores do tema pelo CSS (--rodapé-texto / --acento). Só `transform`
 * e `opacity` se movem: a engrenagem gira devagar, a lâmpada pulsa, as faíscas piscam e cada
 * ferramenta dá um pulinho quando o mouse passa. Com "reduzir movimento" tudo fica parado.
 */
// O mesmo contorno da engrenagem do logo (caixa 24x24, centro em 12,12).
const ENGRENAGEM = 'M10.27 4.5L10.66 2.49L13.34 2.49L13.73 4.5L16.08 5.47L17.78 4.33L19.67 6.22L18.53 7.92L19.5 10.27L21.51 10.66L21.51 13.34L19.5 13.73L18.53 16.08L19.67 17.78L17.78 19.67L16.08 18.53L13.73 19.5L13.34 21.51L10.66 21.51L10.27 19.5L7.92 18.53L6.22 19.67L4.33 17.78L5.47 16.08L4.5 13.73L2.49 13.34L2.49 10.66L4.5 10.27L5.47 7.92L4.33 6.22L6.22 4.33L7.92 5.47Z';

export function arteDoRodapé() {
  const réguaTraços = Array.from({ length: 8 }, (_, i) => `<path d="M458 ${28 + i * 8}h${i % 2 ? 6 : 10}"/>`).join('');
  return `<div class="rodapé__arte" aria-hidden="true">
  <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMax meet" focusable="false">
    <g class="rd-traço" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4">
      <path class="rd-chão" d="M20 90H1180"/>
      <path class="rd-chão rd-chão--pontos" d="M20 96h1160"/>

      <!-- martelo -->
      <g class="rd-item">
        <rect x="116" y="36" width="9" height="54" rx="3.5"/>
        <path class="rd-cor" d="M92 24h42a6 6 0 0 1 6 6v6a4 4 0 0 1-4 4H92a4 4 0 0 1-4-4v-8a6 6 0 0 1 4-4z"/>
        <path d="M92 24c-9 1-15 5-18 11"/>
      </g>

      <!-- calculadora -->
      <g class="rd-item">
        <rect x="222" y="30" width="58" height="60" rx="9"/>
        <rect class="rd-cor rd-cor--cheio" x="231" y="39" width="40" height="13" rx="3"/>
        <circle cx="238" cy="65" r="2.6"/><circle cx="251" cy="65" r="2.6"/><circle cx="264" cy="65" r="2.6"/>
        <circle cx="238" cy="78" r="2.6"/><circle cx="251" cy="78" r="2.6"/><circle class="rd-cor" cx="264" cy="78" r="2.6"/>
      </g>

      <!-- lápis encostado -->
      <g class="rd-item">
        <g transform="rotate(-13 360 90)">
          <rect x="351" y="20" width="18" height="52" rx="2.5"/>
          <path d="M351 72l9 18 9-18"/>
          <path d="M356 80.5h8"/>
          <rect class="rd-cor rd-cor--cheio" x="351" y="9" width="18" height="9" rx="3.5"/>
          <path d="M351 30h18"/>
        </g>
      </g>

      <!-- régua em pé -->
      <g class="rd-item">
        <rect x="458" y="20" width="26" height="70" rx="3.5"/>
        ${réguaTraços}
      </g>

      <!-- engrenagem com o visto (a mesma do logo) -->
      <g class="rd-item rd-item--grande">
        <g class="rd-gira" transform="translate(600 56) scale(2.9) translate(-12 -12)">
          <path vector-effect="non-scaling-stroke" d="${ENGRENAGEM}"/>
        </g>
        <path class="rd-cor" transform="translate(600 56) scale(2.9) translate(-12 -12)" vector-effect="non-scaling-stroke" stroke-width="3.2" d="M8.9 12.3l2.2 2.2 4.2-4.7"/>
      </g>

      <!-- chave inglesa -->
      <g class="rd-item">
        <g transform="rotate(17 745 90)">
          <rect x="738" y="38" width="14" height="52" rx="5.5"/>
          <path d="M731 36a15 15 0 1 1 28 0c0 3-2 5-4 6h-20c-2-1-4-3-4-6z"/>
          <path class="rd-cor" d="M739 18v13M751 18v13"/>
        </g>
      </g>

      <!-- lâmpada -->
      <g class="rd-item">
        <circle class="rd-brilho" cx="855" cy="46" r="30" stroke="none"/>
        <path d="M842 62c-8-6-12-14-12-22a25 25 0 0 1 50 0c0 8-4 16-12 22v8h-26z"/>
        <path d="M845 78h20M848 85h14"/>
        <path class="rd-cor" d="M849 52l6-9 6 9M855 43v-8"/>
      </g>

      <!-- caderno com tarefas -->
      <g class="rd-item">
        <rect x="944" y="26" width="44" height="64" rx="5"/>
        <path d="M952 26v64"/>
        <path class="rd-cor" d="M958 40l3 3 5-6"/><path d="M972 41h10"/>
        <path class="rd-cor" d="M958 54l3 3 5-6"/><path d="M972 55h10"/>
        <circle cx="962" cy="71" r="3"/><path d="M972 71h10"/>
      </g>

      <!-- rolo de pintura -->
      <g class="rd-item">
        <rect class="rd-cor rd-cor--cheio" x="1048" y="22" width="52" height="18" rx="6"/>
        <path d="M1100 31h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-40a4 4 0 0 0-4 4v6"/>
        <rect x="1067" y="58" width="9" height="32" rx="3.5"/>
      </g>

      <!-- faíscas -->
      <g class="rd-faíscas" stroke-width="2.2">
        <path class="rd-faísca" d="M180 20v8M176 24h8"/>
        <path class="rd-faísca" d="M668 18v8M664 22h8"/>
        <path class="rd-faísca" d="M912 24v8M908 28h8"/>
        <path class="rd-faísca" d="M1010 30v8M1006 34h8"/>
      </g>
    </g>
  </svg>
</div>`;
}
