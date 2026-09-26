# UX Plus

Objetivo: reduzir a carga cognitiva para quem não é técnico.

### Regra de uma ferramenta
A tela deve responder, nesta ordem: **o que isso faz → o que eu envio → o que posso ajustar → prévia → processar → arquivo pronto → baixar**.

### Feedback
Toda ação relevante recebe estado visual: carregando, processando, sucesso ou erro. O processamento de arquivos usa uma duração mínima de 10 segundos para feedback consistente, sem alterar o resultado real.

### Editores
Recortar imagem/PDF deve ser visual. O usuário vê a área selecionada, arrasta handles ou move a seleção, confirma e recebe a prévia final. O botão de download só aparece depois da conferência.

### Descoberta
No desktop, o cabeçalho usa menu organizado por categorias. Em uma ferramenta, a lateral/rodapé apresenta similares. A home mostra vistos recentemente e atalhos.

### Movimento
Elementos entram suavemente quando aparecem durante o scroll. Respeitar `prefers-reduced-motion`.

### Conteúdo
Avisos são uma faixa horizontal que abre modal com detalhes. Banners pessoais são finos, retangulares, configuráveis e trocam a cada 30 segundos; hover pausa no desktop e toque/swipe funciona no celular.

### Limites
Login social precisa de OAuth real e segredo no servidor. O frontend não deve simular autenticação real com localStorage. Arquivos da conta precisam de storage persistente separado do banco.