# Estado da execução

Atualizado em 14/09/2026 pelo orquestrador.

## Ambiente registrado

| Item | Valor observado |
|---|---|
| Orquestrador | Claude Code (aplicativo desktop, aba Code), modelo da sessão **Opus 5** (`claude-opus-5`). Opus 6 não confirmado; não utilizado. |
| Subagentes | Ferramenta `Agent` disponível, com escolha de modelo `sonnet` (Sonnet 5), `opus` (Opus 5) e `haiku` (Haiku 4.5). |
| Sistema | Windows 10 Pro 10.0.19045, PowerShell 5.1 e Git Bash |
| Node / npm / Git | v22.14.0 / 10.9.2 / 2.49.0 |
| GitHub CLI / `claude` no PATH | Ausentes |
| Navegador de teste | Painel de navegador Chromium do Claude Code |
| Repositório remoto | https://github.com/AnderHonorato/Site-de-Renda-Passiva — continha apenas o commit inicial com `README.md` |

## Estado encontrado na raiz

`prompt-mestre-orquestração-claude.md`, `leia-me-primeiro.md`, `documentação/dados-do-catálogo.mjs`, seis pastas de produto vazias, `modelo/` (modelo visual “Doce Ofício”, sistema de design Organic e arquivo compactado equivalente). Nada foi sobrescrito.

## Fases

| Fase | Situação | Responsável | Observações |
|---|---|---|---|
| A — Inventário e contrato | concluída | orquestrador | `arquitetura-e-contratos.md`, `decisão-sobre-cadastro-e-servidor.md` |
| B — Base comum | em andamento | orquestrador + especialista em interface | `compartilhado/` |
| C — Seis implementações | pendente | executores | ondas de até três |
| D — Integração | pendente | orquestrador | |
| E — Dois críticos | pendente | críticos | |
| F — Correção e aceite | pendente | orquestrador | |

## Registro de 15/09/2026

- Interrupção por limite de uso da conta às 00h: especialista em interface e assistente de documentação foram retomados. Interface concluída (CSS comum + 12 scripts + vitrine).
- A matriz de requisitos das seções 16–25 produzida pelo assistente de documentação (Haiku) continha requisitos inexistentes no prompt e foi descartada; será reescrita pelo orquestrador.
- O proprietário informou que o prompt foi atualizado, mas os arquivos da pasta são idênticos aos originais (hash SHA-256 igual ao de `modelo/uploads`). Segue valendo a versão 1.0.0.
- Novo insumo: `manus modelos/Doce Oficio Ferramentas` (página única com 9 ferramentas). Aproveitamento decidido:

| Ferramenta do exemplo | Destino | Observação |
|---|---|---|
| Preço de venda | Produto 1 | Fórmula do exemplo usa acréscimo sobre custo; mantida a margem sobre a venda exigida pelo prompt. |
| Preço por unidade | Produto 1 | Comparador de embalagens de ingredientes (g/kg, ml/L). |
| Custo do artesanato | Produto 3 | Integrado ao preço da peça. |
| Planejador de festa, Divisor de contas, Checklist personalizado | Produto 4 | Checklist vira lista de tarefas do evento. |
| Calculadora de tinta | Produto 5 | Distingue rendimento por demão e acabado. |
| Orçamento doméstico, Custo de combustível | Nenhum dos seis | Pertencem às categorias 14 e 15 do catálogo (sites futuros). Pendência registrada. |

  Padrões visuais do exemplo reaproveitados: bilhetes de papel no herói, faixa de confiança, busca e filtro por categoria no catálogo, faixa “como funciona” em três passos. Não reaproveitados: grade de cartões como estrutura principal, `innerHTML`, fontes do Google e cálculos sem validação.

## Registro de 15/09/2026 (continuação)

- Fatia de referência da confeitaria validada no navegador Chromium do painel (emulação 390×844 e 1280×800): layout sem rolagem lateral, navegação inferior, ação contextual, consentimento acima de ambas, fontes locais, fluxo calcular → salvar → Salvos. Caso de conferência R$ 80 / 50 un. / 30% → R$ 2,29 e R$ 114,50 confirmado na interface.
- Pix testado em cópia isolada (`scratchpad/teste-pix`, chave de exemplo do manual do Banco Central, não pagável): pré-seleção por `?valor=`, revisão, QR e Copia e Cola com campo 54 correto, invalidação ao mudar o valor, recusa de valor zero, sem anúncios.
- Novo requisito do proprietário: orçamentos com PDF no visual do site, planilha Excel e link compartilhável para o cliente. Implementado como componente comum `compartilhado/scripts/orçamento/` + `exportação/` (ZIP e .xlsx próprios) + página `orçamento-compartilhado`. O orçamento viaja no fragmento `#` (não chega ao servidor), com validação completa na abertura, limite contra bomba de descompressão e aviso de que os valores não são conferidos pelo site. 39 testes comuns passando; planilha aberta pelo descompactador do Windows com XML bem formado; página do cliente testada no navegador (texto hostil exibido como texto). Defeito encontrado e corrigido: troca de `#` na mesma aba não atualizava o orçamento.
- Primeira onda de executores (confeitaria, educação, artesanato; Sonnet 5) em andamento, retomada após novo limite de uso às 05h.

## Primeira onda concluída (15/09/2026)

| Produto | Executor | Resultado declarado | Conferência do orquestrador |
|---|---|---|---|
| 1. Confeitaria | Sonnet 5 | 9 ferramentas, 20 páginas, 49 testes | `gerar`, `testar` (49/49) e `verificar` limpos |
| 2. Educação | Sonnet 5 | 4 geradores, 15 páginas, 45 testes; segunda prioridade não feita | `gerar`, `testar` (45/45) e `verificar` limpos; navegador: geração, gabarito, PDF, caça-palavras acentuado |
| 3. Artesanato | Sonnet 5 | 8 ferramentas, 19 páginas, 30 testes | `gerar`, `testar` (30/30) e `verificar` limpos; navegador: custo do material, orçamento, PDF, planilha, link |

Defeitos encontrados pelo orquestrador no navegador e corrigidos:
- **Comum — `limparErrosDeCampo` removia do DOM as mensagens de erro fixas** (`<p id="…-erro">`), quebrando a geração da educação (`Cannot set properties of null`). Agora esconde e esvazia as fixas e remove só as dinâmicas.
- **Comum — orçamento sem marca** quando a página não informava; agora usa a marca da página.
- **Comum — compartilhamento sem saída quando a cópia falha**: agora abre janela com o link selecionado (`'manual'`).
- **Confeitaria — seletor de receita salva fora do formulário** desalinhava a grade no computador; executor orientado a corrigir.
- **Educação — modo sem acentos** mostra a lista com acentos e a grade sem: registrado para os críticos.

Segunda onda: festas, reforma e embalagens em andamento (retomadas após novo limite de uso às 10h30).

Validações adicionais do orquestrador:
- Confeitaria, fluxo conectado no navegador (390×844): exemplo de brigadeiro com preços em branco → custo consumido R$ 44,00, estoque R$ 27,00, embalagens inteiras R$ 71,00 → receita salva → Preço de venda preenchido (custo 44, rendimento 30) → R$ 2,10 com 30% (conferido: 44 ÷ 0,7 ÷ 30 = 2,0952). Sem erros no console.
- Pacotes (`npm run construir`): confeitaria 150 arquivos/849 KiB, educação 140/758 KiB, artesanato 142/806 KiB; nenhum arquivo indevido; `.htaccess` e manifesto presentes.
- Pacote servido por HTTP: caminho acentuado 200 (UTF-8), inexistente 404, `..%2f` 404, `.htaccess` 404, JavaScript com MIME correto, CSP estrita, `X-Frame-Options: DENY`, `nosniff`.
- Capturas de tela do painel falham quando a janela não está em primeiro plano; a inspeção visual detalhada fica com o crítico de experiência.
- **5. Reforma** (Sonnet 5): 8 ferramentas, 19 páginas, 39 testes. Conferência: `gerar`, `testar` (39/39) e `verificar` limpos; navegador: piso 20 m² + 10% ÷ 2,2 → 10 caixas; 22 ÷ 2,2 → 10 (sem caixa extra); tinta 40 m² × 2 demãos ÷ 10 m²/L → 8 L (3 galões de 3,6 L, sobra 2,8 L); rendimento acabado → 4 L; sem erros no console.
- **4. Festas** (Sonnet 5): 8 ferramentas, 19 páginas, 51 testes; fontes consultadas: iFood (carne e perda de osso) e Descorcha (bebidas); demais premissas marcadas como iniciais do site. Conferência: `gerar`, `testar` (51/51) e `verificar` limpos. Navegador: álcool correto (0 consumidores → 0; crianças nunca em álcool), zero convidados e álcool maior que adultos com mensagem, divisor R$ 300 ÷ 4 = R$ 75 e sem pagantes com mensagem. **Defeito grave encontrado:** custos das linhas e total 100× maiores (R$ 40/kg × ~2 kg exibido como R$ 8.000,00; total R$ 94.600,00). Também: resultado anterior permanece visível quando a validação falha. Devolvido ao executor para correção com teste do caminho da página. **Corrigido e reconferido:** causa era dupla conversão para centavos em `calcular-plano-de-consumo.js`; conversão extraída para `calcular-custo-de-compra.js` com testes (60/60). Navegador: 4 adultos, preços R$ 40 → carne 2 kg R$ 80,00, pão de alho 1 pacote R$ 40,00, total R$ 826,00 (igual à soma das linhas); rótulos por kg/pacote/litro; “Não incluído: 0 adultos consomem álcool”; resultado anterior some quando a validação falha. Pacote: 147 arquivos, 839 KiB, sem indevidos.
- Varredura estática de todos os scripts de página por troca entre reais e centavos (`formatarMoeda` com centavos, `formatarCentavos` com reais): nenhuma ocorrência fora das festas; todas as chamadas conferem.
- Reforma, orçamento no navegador: R$ 800 + R$ 500 → R$ 1.300,00, marca na faixa, aviso de estimativa, sem erros.
- **6. Embalagens** (Sonnet 5): 8 geradores, 19 páginas, 56 testes; geometria pura, SVG em mm, PDF 1:1 com calibração de 50 mm, divisão em folhas por recorte Liang-Barsky sem mudar a escala. Conferência: `gerar`, `testar` (56/56) e `verificar` limpos. Montagem física não realizada (declarado nas páginas). Navegador: tampa 102 × 102 mm (base 100, folga 1); SVG com `width="180mm"`, dobras tracejadas e texto hostil escapado; PDF gerado; caixa 900 × 600 × 300 mm → PDF de 87 páginas numeradas, escala 1:1 e calibração de 50 mm. Pacote: 165 arquivos, 879 KiB, sem indevidos. **Ajuste pedido:** avisar o número de folhas antes do download (a página não informava as 87 folhas). **Corrigido e reconferido:** a constante de área usada na tela tinha chaves diferentes das esperadas por `dividirMoldeEmFolhas`; nova função `contar-folhas-do-molde.js` com teste (59/59). Navegador: caixa pequena → “cabe em 2 folhas A4 (uma por peça)”; 900 × 600 × 300 mm → aviso “ocupa 87 folhas A4…” antes do download, igual às 87 páginas do PDF. Pacote refeito: 167 arquivos, 881 KiB, sem indevidos.
- Tarefa adicional da educação iniciada: correção da lista no modo sem acentos e ferramentas de segunda prioridade (bingo, papel quadriculado, flashcards, planejador de estudos).

## Fase D — integração concluída (15/09/2026)

- Educação, tarefa adicional (Sonnet 5): correção da lista no modo sem acentos (`CORACAO (coração)`) e quatro ferramentas extras (bingo, papel quadriculado, flashcards, planejador de estudos); 19 páginas, 81 testes.
- Bateria completa na raiz: **357/357 testes** (comum 39, confeitaria 49, educação 81, artesanato 30, festas 60, reforma 39, embalagens 59); `verificar` limpo nos seis (115 páginas, 651 scripts); seis pacotes gerados (806–905 KiB), sem arquivos indevidos.
- Fase E iniciada: crítico de segurança e correção (Opus 5, agente `critico-seguranca`) e crítico de experiência e desempenho (Opus 5, agente geral com navegador), independentes e em paralelo, conforme `briefing-dos-críticos.md`.

## Próximo passo

Concluir a base comum, integrar na fatia da confeitaria e distribuir os produtos.
