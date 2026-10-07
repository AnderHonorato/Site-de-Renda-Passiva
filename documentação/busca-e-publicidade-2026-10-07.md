# Busca e publicidade do Portal — 07/10/2026

AdSense monetiza visitas com anúncios de terceiros. Google Ads divulga o próprio portal e exige orçamento de campanha. Os dois caminhos estão separados: a implementação prepara a monetização; este roteiro prepara a divulgação, sem criar despesas.

## O que entrou no código

As 65 ferramentas prontas têm conteúdo de uso presente no HTML, além do formulário: passos, exemplos, limites e perguntas. Título/descrição e os dados WebApplication/Breadcrumb representam a ferramenta existente. O gerador também entrega Open Graph para compartilhamento e Twitter Card. Não há preenchimento de palavras ocultas nem promessa de funções planejadas.

O Google recomenda conteúdo útil e descritivo e informa que `meta keywords` não serve para ranqueamento. Fonte: [guia de SEO do Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Publicação e busca orgânica

1. Definir o domínio público HTTPS real em `URL_PUBLICA` e executar `npm run gerar`, `npm run verificar` e o fluxo normal de publicação.
2. Conferir o sitemap no domínio: os URLs devem apontar para páginas públicas prontas. Contas, perfis e administração permanecem privados.
3. Verificar a propriedade no Search Console e enviar `/sitemap.xml`. A inclusão depende do Google; sitemap não garante posições.
4. Acompanhar consultas, impressões, cliques e páginas realmente usadas. Melhorar as instruções das páginas que já atraem buscas.
5. Compartilhar links diretos das ferramentas com exemplos de uso, incluindo resultado e limitações, em conteúdos próprios. Usar títulos naturais e coerentes com a função.

## Primeiros grupos de divulgação

São sugestões de intenção, sem volume ou custo inventado. Validar no Planejador de palavras-chave antes de uma campanha. As páginas estão implementadas e são destinos específicos.

| Grupo | Termos iniciais | Página |
| --- | --- | --- |
| PDF | juntar PDF online, unir arquivos PDF, dividir PDF | `/f/juntar-pdf/`, `/f/dividir-pdf/` |
| Porcentagem | calculadora de porcentagem, calcular desconto, aumento percentual | `/f/porcentagem/` |
| Pequenos negócios | calcular preço de venda, calcular custo de receita, orçamento online | `/f/preco-de-venda/`, `/f/custo-de-receita/`, `/f/orcamento/` |
| Texto | contar caracteres, contar palavras, remover linhas duplicadas | `/f/contador-de-texto/`, `/f/remover-linhas-duplicadas-de-texto/` |

Exemplo de anúncio para o primeiro grupo: “Junte seus PDFs no navegador” / “Organize os arquivos e baixe o resultado. Veja os limites antes de começar.” O destino deve ser a ferramenta que cumpre essa promessa. Evitar anunciar o catálogo de 208 itens como se todos já funcionassem; são 65 ferramentas prontas.

Organizar cada grupo com termos relacionados e a página correspondente, conforme [orientação do Google Ads](https://support.google.com/google-ads/answer/6238826?hl=en). O [Planejador](https://support.google.com/google-ads/answer/6325025) permite pesquisar demanda e estimativas; definir país, idioma, orçamento e medição depois de ter dados e aprovação do proprietário. Há potencial para comparar tráfego orgânico e pago, mas não existe previsão de receita nesta versão.

## AdSense pronto para configurar

`/admin/publicidade/` recebe o editor `ca-pub-` seguido de 16 dígitos e os IDs de blocos reais. A prévia local mostra dois pontos nas listas e um no rodapé, e as ferramentas têm posição depois do conteúdo de uso. Ela é identificada como demonstração e não gera receita.

Para ativação real: obter aprovação e IDs, informar os blocos manuais, manter `Demonstração local` desligada, conferir consentimento e preencher os testes do proprietário. Uma conta Plus/Premium, páginas de conta/admin ou a categoria estudos não recebem anúncios. Um bloco vazio é recolhido. O [código de unidade do AdSense](https://support.google.com/adsense/answer/9274019?hl=en) depende dos identificadores reais do proprietário.

O portal não paga campanhas, não conecta Analytics nem envia arquivos das ferramentas para serviços de publicidade. Métricas externas e conversões só devem ser integradas em uma etapa específica, com finalidade e consentimento definidos.
