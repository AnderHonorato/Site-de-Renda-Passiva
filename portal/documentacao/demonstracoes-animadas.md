# Demonstrações animadas das ferramentas pagas

As 140 ferramentas pagas prontas apresentam uma animação de 15 segundos nas
cenas **Dados → Análise → Resultado**. O botão de reprodução de cada card abre
o exemplo em diálogo, sem sair do catálogo. A página da ferramenta mostra a
mesma apresentação antes da caixa de acesso.

São 139 amostras calculadas durante a geração do site e uma ilustração de fluxo
para o redimensionador de imagens. A ilustração não inventa pixels processados,
dimensões ou redução de tamanho. Todas as amostras usam dados fictícios.

`ferramentas/dados-demonstracoes.mjs` e `ferramentas/demos/legadas.mjs` são
privados do build. O HTML recebe somente trechos pequenos de entrada e saída,
em um `template` com JSON escapado. Nenhum motor privado ou endpoint de análise
é carregado para reproduzir uma demonstração. Os bloqueios de conta/plano e as
validações da API continuam responsáveis pelo processamento de arquivos reais.

O Canvas reutiliza o relógio, o papel e a mola da apresentação inicial. Cada
quadro depende do tempo, para permitir pausa, repetição e seleção das cenas.
Controles, indicadores, tabelas e método também existem em HTML acessível.
Sem JavaScript/Canvas permanece o resultado estático; movimento reduzido abre
direto no resultado, com cenas acessíveis por botões e teclado.

Há uma instância na página e, no máximo, uma no diálogo. O DPR é limitado a 2;
um canvas de 900 × 563 CSS px ocupa aproximadamente 8 MiB, e um de 320 × 400
ocupa aproximadamente 2 MiB. O relógio pausa fora da tela/aba e termina após
uma reprodução. A lista não mantém 140 animações ou baixa os dados de todas:
carrega a amostra do card ao abri-lo e conserva no máximo dez em memória.

Os testes conferem cobertura, limites, finitude e cálculos independentes de
OLS/DCF, além da ausência de chamadas de análise, navegação do diálogo, pausa,
seleção de cena, teclado, movimento reduzido e apresentação móvel/desktop.
