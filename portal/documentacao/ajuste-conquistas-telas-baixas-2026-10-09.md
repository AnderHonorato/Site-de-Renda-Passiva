# Continuação do portal — 09/10/2026

Origem: conversa do Codex `01a10122-04ce-7e80-8fa8-2bd0c103e66b`, branch `ander-flow/v1`, HEAD inicial `2ad7a89`. Esta correção é pontual e preserva a identidade visual, o banco, o cadastro, os processos de outros projetos e a cópia de `versões/GPT`.

## Entrega desta etapa

- O diálogo de evolução e conquistas deixa de cortar texto extenso em telas muito baixas ou com ampliação de fonte: o conteúdo excedente permite rolagem interna e o botão permanece acessível.
- A barra lateral não aparece visualmente; foi mantido o contorno orgânico, os feixes de luz, a animação do emblema e o comportamento de movimento reduzido.
- Regressão de navegador acrescentada em `testes/navegador/recompensas.teste.mjs` com janela de 320 × 240 px e título longo.
- A página principal continua acessível no servidor local na porta 4400; nada foi publicado no domínio público.

## Validações

- Teste específico de navegador: 8/8 aprovados (desktop, 390 px, 320 px e tela muito baixa).
- Gerador: 131 saídas, incluindo 65 páginas funcionais e catálogo de 208 itens.
- Suíte completa Node: **1.130/1.130 testes aprovados**.
- Verificador: **130 páginas, 215 scripts e 208 entradas** conferidos, sem problemas.
- Inspeção física em outro aparelho, aceite visual do proprietário, anúncios reais e produção: não realizados nesta etapa.

## Próximo trabalho

Tradução funcional das ferramentas para inglês, acessibilidade de todos os formulários, medição de desempenho no celular físico, validação de backup/restauração e preparação do domínio/HTTPS, sem atribuir conclusão a itens que continuam pendentes.
