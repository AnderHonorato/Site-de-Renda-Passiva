# Auditoria de continuidade — 08/10/2026 — v1.3.2

Comparação do super prompt anexado em `02fda86f-ec72-476d-b593-0f02eb85b7d3/Texto colado.txt`, do histórico do Claude anexado em `a090e02b-82f7-4771-a813-e2ec5df35490/Texto colado.txt` e do código do portal principal. As decisões posteriores em `../documentação/plano-portal-principal.md` prevalecem: manter o visual do portal atual, `ander-flow/` como referência congelada, planos manuais, API independente e continuidade na porta 4400.

## Núcleo entregue

- Início, busca, catálogo, recentes/favoritos locais, tema claro/escuro, navegação responsiva e estados de falha isolados. Fonte do cabeçalho em `ferramentas/modelo-de-página.mjs`; páginas regeneradas.
- 65 ferramentas funcionais entre 208 entradas do catálogo. As 143 planejadas têm ficha descritiva e não simulam processamento. O pedido da primeira fase exigia seis ferramentas, não as 208.
- Preço de venda, ponto de equilíbrio, margem de contribuição, juntar PDF e contador de texto disponíveis e testados. Limpar planilha completado em etapas na v1.3.4, com os limites de importação documentados na entrega.
- Cadastro, login, sessão, perfil, preferência de tema, foto recortada localmente, exportação/exclusão de conta, favoritos sincronizados e trabalhos reabríveis. API em `servidor/iniciar.mjs`, armazenamento privado em SQLite.
- Administração de usuários/planos manuais, suporte, chat/moderação, novidades, publicidade e banners prioritários (`admin/*`).
- Níveis/medalhas calculados da atividade, notificações persistentes, celebração em fila, sons opcionais, banners/molduras por nível e estados com movimento reduzido.
- Publicidade preparada com configuração e consentimento; prévia local rotulada, sem anúncios reais. SEO/conteúdo de uso e compartilhamento preparados para domínio real.

## Lacunas reais da especificação original

| Item | Estado e trabalho restante | Evidência atual |
|---|---|---|
| Limpar planilha / ferramenta em etapas | Entregue na v1.3.4: importa XLSX/CSV/TSV, seleciona aba, compara duplicatas pelas colunas escolhidas, preserva primeira ou última ocorrência e oferece carregar/configurar/revisar/baixar. Importa valores salvos; não recalcula fórmulas nem preserva estilos. | [entrega-v1.3.4.md](entrega-v1.3.4.md), `scripts/ferramentas/limpar-planilha.js`, `scripts/cálculos/importar-planilha.js` |
| Administração de catálogo e conteúdo | Falta painel/rotas de ferramentas, categorias, textos com histórico, configuração de limites e regras de pontos, logs/erros. As seis áreas administrativas atuais não cobrem tudo isso. | `admin/`, `servidor/iniciar.mjs`, `servidor/perfil.mjs` |
| Bloqueio progressivo de abuso | Parcial: janela de requisições em memória e resposta JSON 429/Retry-After. Faltam reincidência minutos→horas, persistência após reinício, consulta/desbloqueio no admin e páginas HTML 429/erro genérico nos dois idiomas. | `servidor/iniciar.mjs` (`limites`, `conferirLimite`) |
| Inglês completo | Parcial: moldura, catálogo, conta/admin e textos legais bilíngues; 65 páginas de ferramenta ainda só em português, com aviso honesto. Falta traduzir instruções, campos, resultados, validações e exemplos dessas ferramentas. | `ferramentas/gerar.mjs`, `dados/traduções/`, `scripts/ferramentas/`, ausência de `en/f/` |
| Testes e aceite final | Há testes de código/Chromium; falta aceitação do visual corrente pelo proprietário e conferência física em outro dispositivo da LAN, som e desempenho em aparelho real. | `testes/navegador/`, logs privados em `.execucao/` |

## Pedidos posteriores ainda parciais

- **Premium:** diferenciação implementada na v1.3.5: 2.000 trabalhos, 512 KiB por trabalho e 32 MiB totais, contra 500/64 KiB/8 MiB do Plus. Favoritos e capacidade nominal de lote preservados. Planos, conta e API usam a mesma configuração; liberação permanece manual. Detalhes em [entrega-v1.3.5.md](entrega-v1.3.5.md).
- **Recompensas da referência:** entregues escolha persistente e ordenação de até cinco destaques, filtros da coleção, oito marcos por família, conquistas permanentes, nove ranks distintos e XP faltante para o próximo rank. A v1.3.5 acrescenta missões diária/semanal, eventos administráveis, celebrações/notificações e ranking opcional autenticado com bloqueios. O chat tem salas/conversa/participantes, agrupamento de mensagens e datas, preservando o tema do portal. Presença online exige API própria e continua pendente. A referência foi capturada com a instalação existente do Crawl4AI: cinco páginas e 90 recursos públicos. Isso não revela regras privadas nem constitui cópia integral funcional do backend.
- **Ferramentas posteriores:** conversões/serviço de arquivos e outras planejadas são ondas separadas; o contrato de processamento local das ferramentas atuais continua. Não tratar o serviço remoto como entregue.
- **Backup de C:\Projetos:** somente uma parte foi enviada ao Drive. Os manifestos e pontos de retomada foram preservados. Backup integral, ensaio de restauração e liberação de espaço não estão concluídos. O pedido de não apagar nada continua vigente.

## Dependências para produção

- Domínio e HTTPS, `URL_PUBLICA`, hospedagem dos processos e proxy/SSE, contato responsável e procedimento de operação.
- SMTP/entrega real de recuperação de senha: hoje existe fluxo local e procedimento administrativo; nenhum SMTP de produção integrado.
- IDs/aprovação de AdSense e consentimento aplicável; campanhas de divulgação e medição real ainda não executadas. Publicidade não gera receita na prévia.
- Sitemap/canonical/robots indexáveis condicionados ao domínio HTTPS real; a prévia local permanece não indexável.

Pagamento integrado não é lacuna desta fase: foi excluído em favor de liberação manual pelo administrador. A identidade visual literal do design antigo também foi superada pela decisão posterior de preservar a linguagem do portal atual.

## Evidência da v1.3.1

- 1.103/1.103 testes unitários aprovados em 08/10.
- 24/24 cenários de conta, chat e notificações aprovados, incluindo tela baixa, 320/390 px, conquistas escondidas e ausência de sobreposição.
- 2/2 cenários adicionais de pesquisa ao lado do sino, expansão/fechamento e falha isolada aprovados.
- Verificador: 120 páginas, 202 scripts, 208 entradas; sem problemas.
- Capturas privadas de teste: `.execucao/perfil-organizado-2026-10-08.png` e `.execucao/notificacoes-colunas-2026-10-08.png`. Dados simulados; não representam uma conta real do proprietário.

## Continuação v1.3.2

Correções urgentes entregues: falha opcional dos anúncios deixa de interromper lista e apresentação; menu de categorias cabe na altura disponível; notificações têm topo separado da rolagem; busca curta cresce para a esquerda junto ao sino; rolagem segue o tema. A apresentação é automática na primeira visita da página inicial e grava o cookie ao aparecer. Dados existentes foram comparados antes/depois do reinício da API, com cópia SQLite consistente preservada. Evidência atual em [entrega-v1.3.2.md](entrega-v1.3.2.md).

## Ordem de continuidade

1. **Concluído na v1.3.4:** importação XLSX e ferramenta em etapas.
2. **Concluído na v1.3.5:** diferenciar Premium e implementar missões/eventos/ranking de recompensas.
3. Administração do catálogo/conteúdo/pontos e proteção progressiva persistente.
4. Inglês das ferramentas e nova validação de desempenho/acessibilidade.
5. Preparar produção e validar domínio, e-mail, anúncios e backup/restauração.

## Continuação v1.3.4 — 09/10/2026

Importação de planilhas e fluxo em quatro etapas concluídos. A leitura XLSX ocorre em trabalhador local; abas, chaves por coluna, primeira/última ocorrência, reabertura e arquivos completos foram conferidos. 1.116 testes unitários, oito cenários da ferramenta e uma regressão do conversor aprovados. Limites e evidências em [entrega-v1.3.4.md](entrega-v1.3.4.md).

## Continuação v1.3.5 — 09/10/2026

Premium diferenciado por quantidade e armazenamento; trabalhos listados em páginas leves. Missões/eventos/ranking integrados ao perfil próprio, com resgates únicos no servidor, notificações e celebração coerente com o tema. Administração bilíngue de eventos e participação opcional no ranking. 1.125 testes unitários, cinco cenários da API e 42 cenários distintos de navegador aprovados; banco real copiado e 23 tabelas existentes preservadas na ativação. Evidências e limites em [entrega-v1.3.5.md](entrega-v1.3.5.md). A próxima etapa é administração de catálogo/conteúdo/pontos e proteção progressiva persistente.
