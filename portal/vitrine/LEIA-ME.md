# Vitrine animada do portal

Animação de 15 segundos em loop, desenhada em `<canvas>` a partir de código. Não é um vídeo: fica nítida em qualquer tela, pesa uma fração de um MP4 e se adapta a 16:9 (computador) e 9:16 (celular).

Já está ligada em `portal/index.html`, logo abaixo do topo da página.

## Peso no site

| Recurso | Tamanho |
|---|---|
| JavaScript (4 módulos usados pelo site) | ~66 KB, ~19 KB com gzip |
| Fonte (Inter variável, um arquivo) | ~48 KB |
| CSS | ~3 KB |
| MP4 equivalente, para comparação | ~6 MB |

Tudo é carregado só quando a vitrine chega a 400 px da área visível.

## Comportamento

- Começa a tocar quando aparece na tela e pausa quando sai dela, quando a aba fica oculta ou quando a pessoa usa o botão de pausa.
- Com "reduzir movimento" ativo no sistema, mostra apenas o quadro final, parado, e esconde o botão.
- Sem JavaScript, mostra a capa estática de `imagens/`.
- A altura é reservada pelo `aspect-ratio`, então a página não pula enquanto carrega.
- A densidade de pixels vai até 2×, o que basta para telas retina sem pesar em celulares 3×.

## Usar em outra página

```html
<link rel="stylesheet" href="/portal/vitrine/vitrine.css">
<script type="module" src="/portal/vitrine/vitrine.js"></script>

<section class="vitrine" data-vitrine data-idioma="pt-BR" aria-label="Apresentação animada do portal">
  <canvas class="vitrine__tela"></canvas>
  <button class="vitrine__controle" type="button" data-vitrine-controle aria-label="Pausar animação"></button>
</section>
```

`data-idioma="en"` troca todos os textos para inglês.

## Arquivos

| Arquivo | Função |
|---|---|
| `vitrine.js` | Entrada: carrega as fontes e monta cada `[data-vitrine]` da página |
| `vitrine-motor.js` | Relógio, encaixe do canvas, pausa, curvas de animação e utilidades de desenho |
| `vitrine-cenas.js` | As cinco cenas; cada quadro é uma função do tempo |
| `vitrine-textos.js` | Textos em PT-BR e inglês |
| `vitrine.css` | Estilos do bloco e do botão |
| `vitrine.html` + `vitrine-pagina.js` | Página de prévia e renderização |
| `fontes/`, `imagens/` | Fontes locais (licença OFL em `fontes/licencas/`) e capas para quem não tem JavaScript |
| `ferramentas/` | Geração de vídeo e da trilha sonora; não é usada pelo site |

## Alterar

- **Textos:** `vitrine-textos.js`. Cada chave precisa existir nos dois idiomas.
- **Cores:** `cores` e `categorias`, no topo de `vitrine-motor.js`.
- **Tempo das cenas:** o roteiro está no comentário do topo de `vitrine-cenas.js`. Os instantes estão em segundos dentro de cada função `cena…`.
- **Preço da calculadora:** `preçoFinal` em `vitrine-textos.js`. O custo é 42 e a margem 40%, seguindo a mesma fórmula da ferramenta real: preço = custo ÷ (1 − margem).

## Prévia

Com o portal rodando (`npm run dev`), abra `/portal/vitrine/vitrine.html`.

| Parâmetro | Efeito |
|---|---|
| `?formato=retrato` | Prévia em 9:16 |
| `?idioma=en` | Textos em inglês |
| `?t=8.5` | Congela no instante indicado |

## Gerar vídeo (opcional, para redes sociais)

Precisa de `ffmpeg` no PATH e do Playwright:

```bash
cd portal
npm i -D playwright
npx playwright install chromium
npm run vitrine:video
```

Saída em `portal/vitrine/midia/` (ignorada pelo Git):

- MP4 1920×1080 e 1080×1920, 30 fps, com trilha sonora sintetizada
- Capa PNG de cada formato

Opções: `npm run vitrine:video -- --formato retrato --idioma en --fps 60`.
