# Flower, notificações e atualizações — novembro de 2026

A Flower mantém o processamento de conversas online no servidor configurado. Este lote amplia a orientação local e as interações, sem acrescentar serviços externos nem guardar mensagens no armazenamento do navegador.

- Avatar laranja, reação ao toque no celular e ao teclado, olhares espontâneos durante repouso. Ao digitar, o olhar acompanha a posição do cursor, inclusive após selecionar texto; durante uma resposta, acompanha o trecho que está surgindo.
- Respostas reveladas progressivamente por grafemas, preservando emojis e acentos. Existe “Mostrar resposta completa”; movimento reduzido, fechamento do chat e aba oculta concluem a apresentação imediatamente. A animação dura no máximo seis segundos e não altera o conteúdo da resposta.
- Ajuda local com 79 respostas curadas em 12 assuntos. Perguntas de continuidade mantêm o assunto da conversa e os botões abrem páginas reais. As fichas atuais do catálogo também permitem orientação sobre as ferramentas prontas, entradas e saídas. A Flower não executa ferramentas nem lê arquivos ou dados da conta.
- Convite ao lado do botão minimizado: primeira tentativa após três segundos, com espera quando há outro diálogo aberto. Novos convites têm intervalo mínimo de três minutos e limite de três por aba. Dispensar adia por vinte minutos. Essas preferências ficam em sessionStorage; a conversa continua somente em memória. Timers e observadores são encerrados ao sair da página e suspensos enquanto a aba estiver oculta.
- O sino reúne marcar como lidas, limpar, ativar/desativar e abrir atualizações em ícones no cabeçalho. Os ícones mantêm nomes acessíveis e áreas de toque de 44 px; o texto de rodapé foi retirado.
- Atualizações exibem destaques e ilustrações locais, além de ferramentas relacionadas verificadas contra o catálogo. Novos textos do administrador que citam nomes completos de ferramentas prontas recebem atalhos automaticamente. Posts genéricos continuam legíveis sem conteúdo decorativo vazio. O CTA da Flower abre o chat existente.
- A capa visitante mostra “Login/cadastro” com destaque discreto; contas logadas e páginas internas mantêm suas ações. O menu de preferências usa uma engrenagem e o rótulo “Tema e idioma”.

## Manutenção

As respostas curadas ficam em `scripts/núcleo/flower-conhecimento.js`; `flower-catalogo.js` consulta as fichas prontas do catálogo. IDs de respostas e tópicos permitem ramificações explícitas. Conteúdos de chat e CMS entram no DOM como texto. Links são locais à raiz do portal, inclusive quando publicado em subpasta no GitHub Pages. Perguntas desconhecidas continuam exigindo IA online.

`flower-movimento.js`, `flower-digitacao.js` e `flower-convite.js` isolam as interações. Nenhuma permissão de microfone ou câmera é solicitada: “responder” aqui é apresentar texto no chat.

## Validação

Testes Node cobrem intenções, contexto, limites, disponibilidade, links e proteção de dados privados. Testes Chromium exercitam toque real simulado, cursor, texto incremental, pular, movimento reduzido, convite com relógio controlado, diálogos, reconexão, teclado virtual e temas. A interface é conferida em 320, 390, 768 e 1280 px. Isso não substitui verificação em um Android físico.


## Ajuste de 16/11

O cabeçalho da Flower mostra apenas nome, avatar e fechar. Foram retirados os rótulos de conexão, o botão de reconexão e a identificação de origem sob as respostas. A conexão é verificada em segundo plano quando necessário.

O olhar durante a edição tem deslocamento vertical suficiente para ficar abaixo do centro do rosto, acompanha o cursor e permanece no campo enquanto ele tem foco. O corpo usa um movimento discreto sem giro nesse estado. O olhar é atualizado após mudanças de tamanho da janela visual do teclado e preservado quando a página fica no histórico do navegador.
