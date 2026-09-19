# Decisão sobre cadastro e servidor

Data: 14/09/2026. Decisão: **nenhum dos seis produtos possui backend de aplicação**. A seção 18 do prompt mestre fica registrada como **não aplicável: não há backend de aplicação**. Não foram criados login, chat ou feedback simulados.

| Projeto | Decisão | Justificativa |
|---|---|---|
| 1. Ferramentas para confeitaria | Estático, sem cadastro | Custos, preço, escala, lista de compras e orçamento são cálculos locais; receitas ficam no `localStorage` do aparelho, com exportação/importação de cópia em arquivo. |
| 2. Atividades escolares para imprimir | Estático, sem cadastro | Geradores de matemática, tabuada, caça-palavras e caligrafia rodam no navegador; PDF é montado localmente. Nenhum dado de aluno sai do aparelho. |
| 3. Ferramentas para crochê e artesanato | Estático, sem cadastro | Fichas de peças e materiais ficam no aparelho; cálculos de preço, hora e fio são locais. |
| 4. Planejamento de churrasco e festas | Estático, sem cadastro | Quantidades, orçamento e divisão de despesas são locais; eventos salvos no aparelho. |
| 5. Calculadoras de pintura e reforma | Estático, sem cadastro | Áreas, tinta, piso e rodapé são cálculos locais com preços informados pelo usuário. |
| 6. Moldes de caixas e embalagens | Estático, sem cadastro | Moldes SVG/PDF são gerados no navegador; nenhum arquivo é enviado a servidor. |

Itens que **não** acionam backend: servidor HTTP de arquivos (Apache/Nginx), cabeçalhos de segurança, servidor local de desenvolvimento, etapa local de geração de páginas, Pix estático (o BR Code é montado no navegador a partir da configuração pública) e o script do AdSense (fornecedor externo carregado somente após consentimento, não usado como backend).

Consequências: não há contas, recuperação de acesso, painel administrativo, chat ou feedback flutuante. Contato com o criador usa o endereço público configurado. Se uma função futura exigir persistência compartilhada, a seção 18 inteira passa a ser obrigatória antes da implementação.
