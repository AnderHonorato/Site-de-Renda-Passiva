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

Segunda onda: festas, reforma e embalagens em andamento.

## Próximo passo

Concluir a base comum, integrar na fatia da confeitaria e distribuir os produtos.
