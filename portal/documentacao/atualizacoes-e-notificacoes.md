# Blog de atualizações e central de notificações

O histórico público fica em `atualizacoes.html` e `en/atualizacoes.html`. Cada publicação tem categoria, versão, data e endereço próprio com `#slug`. Os posts iniciais já são escritos no HTML para leitura sem JavaScript; o navegador consulta o feed para receber as publicações atuais.

## Publicar na hospedagem atual, sem custo

O GitHub Pages publica páginas e arquivos estáticos. O painel `admin/atualizacoes/` reconhece a ausência da API e oferece um editor local, identificado como tal. Ele permite preparar, revisar e exportar publicações sem enviar dados nem alterar o site.

1. Abra `admin/atualizacoes/`, escolha **Nova atualização** e preencha título, resumo, conteúdo, categoria, versão e data. Inglês é opcional, mas deve ser preenchido por inteiro quando usado.
2. Confira a prévia. **Salvar rascunho** mantém o texto no aparelho. **Preparar para publicação**, no modo local, inclui o item no arquivo a exportar.
3. Use **Exportar JSON do blog**. O arquivo contém as publicações existentes e as alterações preparadas; rascunhos ficam fora. Nada foi publicado ainda.
4. Use **Editar fonte no GitHub** para substituir `portal/dados/atualizacoes.json` pelo JSON exportado, no branch `ander-flow/v1`, e salvar a alteração. O fluxo de publicação verifica e gera as páginas públicas.

Alterações locais e exclusões são preservadas no navegador. Exportar não é uma cópia dos rascunhos: é a fonte pública do blog. Os textos publicados ficam acessíveis a todos.

## Quando o portal roda com a API

O mesmo painel usa a sessão administrativa existente. Salvar, publicar, agendar e remover gravam no SQLite; o feed público exclui rascunhos e datas futuras. A revisão de cada item evita sobrescrever uma edição concorrente. Escritas exigem administrador, origem permitida e CSRF válido, e ficam na auditoria.

O feed público é `GET /api/atualizacoes`; o administrativo usa `/api/admin/atualizacoes`. A fonte estática só é usada quando a API não pode fornecer um feed válido. Uma resposta válida com lista vazia é respeitada, sem ressuscitar posts removidos. O seed do banco roda uma única vez, inclusive se todas as publicações forem apagadas depois.

Nenhuma API Node/SQLite foi hospedada nesta entrega. A descoberta das contas conectadas não confirmou um servidor gratuito compatível: o serviço antigo do Railway está removido e sem volume; o plano Free do AppDeploy usa outra arquitetura de autenticação e persistência. Não houve contratação nem alteração desses serviços.

## Sininho

- Uma notificação abre detalhes dentro do painel abaixo do sino. A navegação só acontece no botão **Ir para página**.
- **Marcar todas como lidas** zera a contagem sem apagar o histórico.
- **Limpar todas** oculta os itens atuais; publicações novas continuam podendo aparecer.
- **Desativar notificações** desliga contador e som e deixa de acrescentar novos itens enquanto a preferência estiver desligada. O controle para reativar continua disponível.
- Leituras, itens limpos e a preferência ficam no aparelho e se sincronizam entre abas da mesma origem. Não são preferências de conta entre dispositivos.

Todos os textos editoriais são renderizados como texto, sem executar HTML. Links das notificações aceitam somente a origem do portal. O painel funciona por teclado, retorna o foco e respeita movimento reduzido.

## Verificação

Os testes cobrem validação e persistência do CMS, exclusão sem reseed, revisão concorrente, autorização/CSRF, fallback estático, criação e publicação pelo navegador, detalhes do sino e preferências entre abas. A publicação inclui as duas páginas públicas, os painéis e o JSON e mantém o código do servidor fora do pacote estático.

Validação do lote: 1.814 testes de código, nove cenários de API e 32 cenários de navegador do conjunto de publicação. As 14 verificações específicas de publicação e servidor também passaram. A verificação de integridade encontrou 322 páginas, 448 scripts e 353 entradas no catálogo, com 252 ferramentas prontas.

A checagem em tela pequena identificou um problema compartilhado: dicas de campo que desapareciam ao perder o foco deslocavam o botão durante o clique. As dicas agora mantêm sua posição no formulário; o teste de metadados verifica o envio depois da edição e a recusa de salvar enquanto a leitura do arquivo ainda está pendente. O feed usa o adaptador da API para funcionar também no pacote estático sem solicitar um servidor inexistente.
