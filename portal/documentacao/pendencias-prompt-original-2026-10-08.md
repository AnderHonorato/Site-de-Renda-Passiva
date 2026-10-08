# Auditoria de continuidade — 08/10/2026 — v1.3.1

Comparação do super prompt anexado em `02fda86f-ec72-476d-b593-0f02eb85b7d3/Texto colado.txt`, do histórico do Claude anexado em `a090e02b-82f7-4771-a813-e2ec5df35490/Texto colado.txt` e do código do portal principal. As decisões posteriores em `../documentação/plano-portal-principal.md` prevalecem: manter o visual do portal atual, `ander-flow/` como referência congelada, planos manuais, API independente e continuidade na porta 4400.

## Núcleo entregue

- Início, busca, catálogo, recentes/favoritos locais, tema claro/escuro, navegação responsiva e estados de falha isolados. Fonte do cabeçalho em `ferramentas/modelo-de-página.mjs`; páginas regeneradas.
- 65 ferramentas funcionais entre 208 entradas do catálogo. As 143 planejadas têm ficha descritiva e não simulam processamento. O pedido da primeira fase exigia seis ferramentas, não as 208.
- Preço de venda, ponto de equilíbrio, margem de contribuição, juntar PDF e contador de texto disponíveis e testados. Limpar planilha disponível, com escopo parcial descrito abaixo.
- Cadastro, login, sessão, perfil, preferência de tema, foto recortada localmente, exportação/exclusão de conta, favoritos sincronizados e trabalhos reabríveis. API em `servidor/iniciar.mjs`, armazenamento privado em SQLite.
- Administração de usuários/planos manuais, suporte, chat/moderação, novidades, publicidade e banners prioritários (`admin/*`).
- Níveis/medalhas calculados da atividade, notificações persistentes, celebração em fila, sons opcionais, banners/molduras por nível e estados com movimento reduzido.
- Publicidade preparada com configuração e consentimento; prévia local rotulada, sem anúncios reais. SEO/conteúdo de uso e compartilhamento preparados para domínio real.

## Lacunas reais da especificação original

| Item | Estado e trabalho restante | Evidência atual |
|---|---|---|
| Limpar planilha / ferramenta em etapas | Parcial: recebe texto/CSV colado e exporta CSV/XLSX. Falta importar arquivo XLSX, selecionar aba, escolher colunas que definem duplicidade e a linha a preservar; fluxo enviar/configurar/revisar/exportar. | `scripts/ferramentas/limpar-planilha.js`, `scripts/cálculos/tabular.js` |
| Administração de catálogo e conteúdo | Falta painel/rotas de ferramentas, categorias, textos com histórico, configuração de limites e regras de pontos, logs/erros. As seis áreas administrativas atuais não cobrem tudo isso. | `admin/`, `servidor/iniciar.mjs`, `servidor/perfil.mjs` |
| Bloqueio progressivo de abuso | Parcial: janela de requisições em memória e resposta JSON 429/Retry-After. Faltam reincidência minutos→horas, persistência após reinício, consulta/desbloqueio no admin e páginas HTML 429/erro genérico nos dois idiomas. | `servidor/iniciar.mjs` (`limites`, `conferirLimite`) |
| Inglês completo | Parcial: moldura, catálogo, conta/admin e textos legais bilíngues; 65 páginas de ferramenta ainda só em português, com aviso honesto. Falta traduzir instruções, campos, resultados, validações e exemplos dessas ferramentas. | `ferramentas/gerar.mjs`, `dados/traduções/`, `scripts/ferramentas/`, ausência de `en/f/` |
| Testes e aceite final | Há testes de código/Chromium; falta aceitação do visual corrente pelo proprietário e conferência física em outro dispositivo da LAN, som e desempenho em aparelho real. | `testes/navegador/`, logs privados em `.execucao/` |

## Pedidos posteriores ainda parciais

- **Premium:** `servidor/servidor-planos.json` ainda declara Premium provisório, com as mesmas cotas do Plus (500 favoritos, 500 trabalhos, lote de 100). Falta implementar diferenciação útil; a escolha de uma proposta foi delegada ao agente pelo proprietário, não exige pedir os números novamente.
- **Recompensas da referência:** o perfil já tem progresso, três destaques automáticos e coleção. Falta escolha persistente e ordenação dos três emblemas destacados, filtros da coleção, explicação da próxima recompensa, missões/eventos e ranking com privacidade. A análise de referência cobriu páginas públicas de perfil e ranking; isso não é uma auditoria de funções privadas de todo o site.
- **Ferramentas posteriores:** conversões/serviço de arquivos e outras planejadas são ondas separadas; o contrato de processamento local das ferramentas atuais continua. Não tratar o serviço remoto como entregue.
- **Backup de C:\Projetos:** somente uma parte foi enviada ao Drive. Os manifestos e pontos de retomada foram preservados. Backup integral, ensaio de restauração e liberação de espaço não estão concluídos. O pedido de não apagar nada continua vigente.

## Dependências para produção

- Domínio e HTTPS, `URL_PUBLICA`, hospedagem dos processos e proxy/SSE, contato responsável e procedimento de operação.
- SMTP/entrega real de recuperação de senha: hoje existe fluxo local e procedimento administrativo; nenhum SMTP de produção integrado.
- IDs/aprovação de AdSense e consentimento aplicável; campanhas de divulgação e medição real ainda não executadas. Publicidade não gera receita na prévia.
- Sitemap/canonical/robots indexáveis condicionados ao domínio HTTPS real; a prévia local permanece não indexável.

Pagamento integrado não é lacuna desta fase: foi excluído em favor de liberação manual pelo administrador. A identidade visual literal do design antigo também foi superada pela decisão posterior de preservar a linguagem do portal atual.

## Evidência da rodada atual

- 1.103/1.103 testes unitários aprovados em 08/10.
- 24/24 cenários de conta, chat e notificações aprovados, incluindo tela baixa, 320/390 px, conquistas escondidas e ausência de sobreposição.
- 2/2 cenários adicionais de pesquisa ao lado do sino, expansão/fechamento e falha isolada aprovados.
- Verificador: 120 páginas, 202 scripts, 208 entradas; sem problemas.
- Capturas privadas de teste: `.execucao/perfil-organizado-2026-10-08.png` e `.execucao/notificacoes-colunas-2026-10-08.png`. Dados simulados; não representam uma conta real do proprietário.

## Ordem de continuidade

1. Completar a importação XLSX e a ferramenta em etapas.
2. Diferenciar Premium e organizar a escolha de conquistas do perfil.
3. Administração do catálogo/conteúdo/pontos e proteção progressiva persistente.
4. Inglês das ferramentas e nova validação de desempenho/acessibilidade.
5. Preparar produção e validar domínio, e-mail, anúncios e backup/restauração.
