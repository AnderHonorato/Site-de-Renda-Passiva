# Portal v1.3.2 — 08/10/2026

Entrega local na branch `ander-flow/v1`, sobre `372e717` (v1.3.1). Site e API continuam na porta 4400 através do proxy local. Mudanças desta rodada estão dentro de `portal/`; arquivos originais e dados existentes foram preservados.

## Comportamento entregue

- Publicidade carregada dinamicamente, com consentimento independente. Bloquear o módulo dos anúncios não derruba as 65 ferramentas prontas, catálogo ou apresentação automática.
- Categorias limitadas à altura disponível, com rolagem interna e recálculo em resize/visualViewport. O painel fecha quando o cabeçalho passa para navegação móvel.
- Busca junto ao sino: campo cresce apenas para a esquerda (até 240 px no computador, 176 px no celular), sem deslocar os controles. Sugestões seguem acessíveis no teclado.
- Notificações com cabeçalho separado da lista rolável. Título e ação de marcar todas não são cobertos por texto ou emblemas. Rolagem comum em todos os componentes, nas cores do tema, respeitando contraste forçado.
- Apresentação automática na primeira visita da página inicial; cookie `visto_novidades` por um ano e fallback local gravados ao aparecer. Aguarda consentimento/outro diálogo, não exige botão manual e não repete ao recarregar sem concluir. Avisos posteriores mantêm revisão própria.
- Chat com salas à esquerda, conversa central e participantes à direita; agrupamento de mensagens contínuas, separadores por data, pesquisa de salas e painel móvel recolhível. Fluxo de mensagens sem insígnias extras. Participantes identificados pelas mensagens carregadas, sem presença online fictícia.
- Nove ranks com símbolos próprios e cinco subdivisões nas primeiras oito faixas, sobre a fórmula existente de pontos. Último rank a partir do nível 41. Página Níveis mostra a jornada e as regras reais de XP; celebração de nível usa o selo do rank.
- Coleção com filtros, progresso e oito marcos por família. Até cinco posições de honra escolhidas e ordenadas, persistidas na conta. Nenhuma seleção anterior conserva três destaques automáticos; seleção vazia é respeitada.
- Conquistas ganhas conservam o maior patamar mesmo após remover favorito/trabalho. Conquistas vistas em versões anteriores também são preservadas. Exportação da conta inclui conquistas e destaques. Validação da API recusa bloqueadas, desconhecidas, repetidas ou mais de cinco; exige sessão/CSRF e não aceita alteração de outro titular.

## Referência e captura

Ferramenta encontrada em `C:\Projetos\Andamento\2. Projeto-terceiros\1. extrator de sites inteiros\crawl4ai`: instalação existente Crawl4AI 0.9.3, CLI `.venv\Scripts\crwl.exe`. Sintaxe confirmada: `crwl crawl URL -o markdown -O ARQUIVO`.

A captura usou o runtime dessa instalação, com Crawl4AI em modo HTTP pelo script privado `.execucao/referencia-superanimes-2026-10-08/capturar_http.py`: cinco páginas públicas e 90 recursos únicos. Manifesto, HTML, JS/CSS e análise estão preservados nessa pasta privada. Páginas e recursos foram lidos para pesquisa; não foram incorporados à publicação do portal.

Fontes públicas: [perfil indicado](https://superanimes.com.br/perfil/a2f4478e-028f-48d0-85ed-f8d79b3af0d1), [chat](https://superanimes.com.br/_next/static/chunks/5516-fd810c5d048ab37a.js), [progressão](https://superanimes.com.br/_next/static/chunks/4909-81776857be27c235.js). Acesso público não revela a implementação privada das regras. Missões/eventos/ranking e presença do portal continuam pendentes; não se declara réplica integral funcional da referência.

## Verificação

- 1.104 testes unitários aprovados.
- Quatro suítes de integração da API aprovadas, incluindo persistência das cinco posições, ordem, entradas inválidas, CSRF, titularidade, exportação e remoção de favorito.
- Verificador: 120 páginas, 205 scripts, 208 entradas; nenhum problema. Pastas privadas iniciadas por ponto ficam fora da varredura de páginas públicas, como já ficam fora da publicação.
- 47 cenários Chromium aprovados na bateria conjunta desta rodada, registrada em `.execucao/testes-navegador-v1.3.2.log`: bloqueio de anúncios, primeira visita/cookie, diálogo pendente, categorias baixas, busca curta, rolagem de notificações clara/escura, níveis, perfil, chat, anexos/respostas, temas, movimento reduzido e 320/390 px. Após revisar as imagens, corrigida uma regra antiga `!important` que comprimia o perfil no celular; cenários de perfil/notificações afetados reconferidos.
- Capturas com dados simulados revisadas: chat no computador/celular/escuro, perfil e coleção. Não representam a sessão real do proprietário; conferência física em outro aparelho permanece pendente.

Antes do reinício da API, `VACUUM INTO` criou `.execucao/portal-antes-v1.3.2.sqlite`. Depois, hashes de contas (incluindo fotos), favoritos e trabalhos coincidiram com os anteriores. Os arquivos privados não entram no Git ou na publicação. HTTP local e no endereço LAN foram conferidos a partir deste computador.

Na conferência posterior, com o site permanecendo em uso, uma conta apresentou alterações somente em `pontos`, `pontos_dia` e `pontos_hoje`, campos atualizados pelos registros de atividade. Demais campos de conta/foto permaneceram idênticos, sem contas criadas/removidas; favoritos e trabalhos também continuaram idênticos. Essas alterações de atividade foram conservadas.

## Pendências mantidas

Importação XLSX e fluxo em etapas continuam incompletos; a biblioteca preparada está preservada em `.execucao/importacao-xlsx-preparo/`. Premium, administração de catálogo/conteúdo/pontos, abuso progressivo persistente e inglês das ferramentas permanecem no [inventário do prompt](pendencias-prompt-original-2026-10-08.md). Backup integral no Drive, domínio/HTTPS, SMTP e anúncios reais também não são concluídos por esta versão.
