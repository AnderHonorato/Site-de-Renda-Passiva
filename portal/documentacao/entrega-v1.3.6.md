# Portal v1.3.6 — editor administrativo e proteção de tráfego

09/10/2026. Continuação da thread do Codex `01a10122-04ce-7e80-8fa8-2bd0c103e66b`, partindo do commit `6407939`, na branch `ander-flow/v1`. Implementação e verificação concluídas com Remote Desktop Commander, sem alterações nos outros seis produtos de referência.

## Funcionalidades

- Administração em `/admin/editorial/` e `/en/admin/editorial/`: alteração de nomes, resumos e categorias existentes nos dois idiomas, textos institucionais permitidos, pontos de atividade, recompensas e cotas dos planos.
- Edições ficam em rascunho, com controle de versões, histórico de revisões, restauração e publicação explícita. O gerador escreve cada página por arquivo temporário e renomeação, sem apagar antes os diretórios públicos. Há recuperação de publicação interrompida e tentativa de restauração em caso de falha.
- Administração em `/admin/operacao/` e correspondente inglês: consulta de bloqueios, erros resumidos e auditoria; liberação manual com conferência da versão do bloqueio.
- Proteção progressiva de tráfego persistida em SQLite, com reincidência e expiração. Identificadores técnicos de bloqueio usam HMAC; o intervalo curto entre mensagens no chat permanece separado de infrações persistentes.
- Páginas 429 e de erro em português e inglês. O painel preserva a aparência e o controle de acesso existentes.

## Correções desta retomada

- Corrigido conflito entre `elements.item` e o método nativo `HTMLFormControlsCollection.item`: o campo `item` agora é obtido por `namedItem('item')`. Antes disso, a interface podia aparecer aberta sem carregar corretamente o editor.
- Acrescentada mensagem específica de acesso negado para contas não administrativas, em português e inglês.

## Validação

- `npm run conferir`: **1.130/1.130** testes de código; geradas **131 saídas**, com 65 ferramentas prontas e catálogo de 208; verificador passou em 130 páginas, 214 scripts e 208 entradas.
- `npm run testar:api`: **6/6** fluxos isolados aprovados.
- `testes/navegador/editorial-operacao.teste.mjs`: **4/4** cenários aprovados (1280 px claro PT, 390 px claro PT, 320 px escuro EN e falha/permissão).
- `git diff --check`: sem problemas.
- Backup SQLite consistente com `VACUUM INTO` e `PRAGMA quick_check=ok`, privado em `servidor/.execucao/backup-v1.3.6-20261009-061447.sqlite`. Supervisor do site reiniciou a API; a home, as telas do editor e operação, regras de pontos e planos responderam 200. Editorial sem sessão respondeu 401. Banco ativo confirmou `quick_check=ok`; contagens de usuários, sessões, mensagens e trabalhos iguais às do backup na conferência.
- Logs privados de teste: `.execucao/api-v136.log` e `.execucao/navegador-v136.log`. Nenhum deploy público ou ativação de anúncios foi realizado.

## Pendências preservadas

O editor altera nomes e resumos dos itens existentes e os textos `inicio.titulo`, `inicio.descricao`, `ajuda.introducao` e `planos.introducao`. Não cadastra ferramentas/categorias novas nem modifica slugs, fórmulas ou campos de cálculo. As regras de XP valem para ações futuras, sem recalcular saldo anterior; cotas de favoritos, trabalhos e armazenamento podem ser publicadas, enquanto capacidade de lote e marcos de nível permanecem definidos no código. O painel de erros mostra somente data, método e código genérico, sem pilha, endereço IP ou conteúdo da requisição. Janelas comuns de requisições ficam em memória; persistem os bloqueios e suas reincidências. Publicar exige acesso de escrita à pasta do portal e execução de Node no servidor.

- Ferramentas planejadas, tradução completa de cada ferramenta, processamento remoto avançado, revisão visual adicional do modal de evolução e testes em dispositivo físico.
- SMTP, domínio/HTTPS e implantação operacional, restauração de backup em ambiente separado, aprovação/IDs reais do AdSense e consentimento de anúncios aplicável.
- Os materiais fora de `portal/` permanecem intocados. Arquivos de execução privados, contas, bancos, capturas e modelos não devem entrar no commit ou pacote público.
