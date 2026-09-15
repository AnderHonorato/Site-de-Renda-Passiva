# Como conectar o AdSense — Doce Ofício

Siga o guia completo em `../../documentação/como-conectar-o-adsense.md`. Neste site:

- Arquivo de configuração: `configurações/configuração-pública.json` (bloco `publicidade`).
- Posição reservada: `após-resultado` (depois do resultado de cada ferramenta). Um bloco `padrão` pode ser usado para todos os espaços.
- Páginas sem anúncio: Apoiar, orçamento compartilhado, página 404, contato, privacidade e termos.
- Prefixo de armazenamento deste site: `doce-ofício`.

Resumo:

1. Publicar com HTTPS e preencher `publicação.endereçoBase`.
2. Adicionar o domínio no AdSense e verificar a propriedade.
3. Colocar `ca-pub-…` e os blocos na configuração, ainda com `"ativa": false`.
4. Publicar o `ads.txt` na raiz do domínio.
5. Configurar a mensagem de privacidade (CMP) e marcar `"consentimentoConfigurado": true`.
6. Aplicar o perfil de CSP com anúncios na hospedagem.
7. Marcar `"ativa": true`, rodar `npm run construir`, publicar e validar aceitar, rejeitar e revogar.
8. Para desligar: `"ativa": false` e `npm run construir`.
