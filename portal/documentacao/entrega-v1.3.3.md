# Portal v1.3.3 — Perfil compacto e progresso dos emblemas

08/10/2026. Continuação de `ander-flow/v1`, a partir de `ddcd279` (v1.3.2). As mudanças ficam em `portal/`.

## Comportamento entregue

- Carteira do perfil com avatar/rank junto da identidade e ações, XP em faixa própria e conquistas em destaque abaixo. Estatísticas aparecem na primeira tela de computador na prévia com cinco destaques. O excesso de padding herdado do modal foi removido do perfil e da edição.
- Editor com foto/15 avatares, dados básicos, seis campos sociais e recomendações agrupados. Campos, visibilidade, upload, recorte e salvamento continuam disponíveis. Cadastro permanece com seu formulário próprio.
- Menu “Mais” do perfil de outra pessoa usa popover na camada superior, posicionado dentro da tela. Não sofre o recorte do fundo do cartão. Clique fora/Escape fecham; o estado acessível acompanha a abertura.
- Emblemas recebem aura animada na cor do patamar e progresso circular em volta. O valor é o percentual real até o próximo marco, limitado a 0–100; conquistas completas mostram 100%. A barra horizontal duplicada da coleção foi removida; descrição, contagem e oito marcos continuam disponíveis.
- Animações dos novos emblemas pausam fora da área visível e respeitam movimento reduzido. Família, material e desbloqueios continuam vindo dos dados existentes.
- Campo da busca limitado a 216px no computador e 176px no celular, ou menos se necessário para caber à esquerda da lupa. Sugestões têm a mesma largura, ancoradas na lupa junto ao sino. O nome completo permanece no título e no nome acessível de cada resultado.

## Validação

- 1104 testes unitários aprovados: `.execucao/testes-unitarios-v1.3.3.log`.
- 43 cenários Chromium aprovados: `.execucao/testes-visuais-final-v1.3.3.log`. Incluem busca curta com sugestões, perfil/coleção, posição clicável do menu, progresso de 55%, movimento reduzido, recorte, salvamento e manutenção de rascunhos/tema, notificações e isolamento de falhas.
- Mais um cenário integrado do editor aprovado, com 1366, 390 e 320px: `.execucao/teste-editor-integrado-v1.3.3.log`. Confere 12 entradas preservadas, 15 avatares, campos preenchidos, altura do formulário e ausência de rolagem lateral interna.
- Gerador: 121 saídas / 65 ferramentas prontas. Verificador: 120 páginas, 206 scripts, 208 entradas de catálogo, nenhum problema.
- Capturas renderizadas inspecionadas de perfil, edição e sugestões no computador/celular. São sessões isoladas com dados fictícios, não a sessão autenticada real do proprietário.
- HTTP 200 local, LAN e sessão da API; CSS/JS servidos na porta 4400 comparados com os arquivos editados e `Cache-Control: no-store` confirmado.

## Limites da conferência

Servidor local permanece em `http://127.0.0.1:4400/`; LAN `http://192.168.1.1:4400/`, conferida a partir deste computador. Outro aparelho físico não foi testado. Não houve alteração de backend, migração ou escrita de teste na conta real. Banco, fotos e arquivos privados permanecem fora do commit. A aba já aberta precisa ser recarregada para carregar o novo CSS/JS.
