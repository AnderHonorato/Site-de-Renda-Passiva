# Portal v1.3.5 — Premium, missões, eventos e ranking

09/10/2026. Continuação de `ander-flow/v1` a partir de `2c5f04a` (v1.3.4), somente em `portal/`. Conclui o segundo item da ordem de continuidade. Mantém os planos liberados manualmente, a API independente, os cálculos locais e a linguagem visual vigente.

## Planos e trabalhos

| Plano | Favoritos sincronizados | Trabalhos salvos | Dados por trabalho | Espaço total para trabalhos |
|---|---:|---:|---:|---:|
| Grátis | 10 | 3 | 20 KiB | 60 KiB |
| Plus | 500 | 500 | 64 KiB | 8 MiB |
| Premium | 500 | 2.000 | 512 KiB | 32 MiB |

As cotas de favoritos de Plus/Premium permanecem iguais: já comportam as 208 entradas atuais. O valor adicional do Premium está no arquivo de projetos e na reabertura de listas/planilhas maiores. A configuração deixou de ser provisória; página de planos, conta e API usam a mesma fonte `servidor/servidor-planos.json`. Plus/Premium continuam sem anúncios conforme a política existente. Não há checkout, cobrança ou alteração automática de planos reais.

O tamanho corresponde ao JSON UTF-8 dos campos salvos; não corresponde ao arquivo original importado. Importação, processamento e downloads locais continuam sujeitos aos limites de cada ferramenta. A capacidade nominal de lote foi preservada (3/100/100); esta entrega não amplia lotes de PDF nem implementa serviço remoto. Nenhum plano compra vantagem em XP.

A API aplica limite por trabalho, quantidade e armazenamento total, revalidando a sessão/plano e o trabalho atual após ler o corpo da requisição. Reduzir o plano não apaga trabalhos existentes: leitura, reabertura e renomeação permanecem possíveis. Reduzir o conteúdo também é permitido quando o armazenamento total já excede a nova cota; aumentar exige espaço disponível e respeita o limite por trabalho.

A lista retorna até 50 trabalhos por página, com título, ferramenta e datas. Não transfere todas as planilhas junto com a listagem. O conteúdo completo é buscado na reabertura. O resumo mostra quantidade e espaço usado; foi corrigida uma declaração de variável posterior à inicialização assíncrona que podia impedir a listagem de carregar.

## Missões e eventos

- Missão diária: concluir resultados em **duas ferramentas distintas**, receber **5 XP** uma vez no dia.
- Missão semanal: concluir resultados em **cinco ferramentas distintas**, receber **15 XP** uma vez na semana.
- Dias usam UTC; semanas começam na segunda-feira. O painel informa essa regra. Atividade anterior à atualização não é creditada retroativamente.
- Repetir o mesmo slug não aumenta o progresso da missão no período. Somente ferramentas prontas são registradas. O registro de uso habitual contém o slug, sem os campos dos cálculos; por processamento ser local, não comprova a correção do resultado e pode ser acionado diretamente por cliente autenticado. Proteção progressiva persistente contra abuso permanece na próxima etapa.
- Resgate confirmado pelo servidor, com transação e chave única por usuário/período/evento. Repetição ou tentativas simultâneas não pagam duas vezes; XP enviado pelo cliente é ignorado.
- Administradores têm `admin/eventos/` e equivalente inglês: criar, editar, agendar e pausar, com título/descrição nos dois idiomas, datas, meta e XP. Meta de 1–30 ferramentas, prêmio de 1–50 XP, intervalo máximo de 90 dias e até 20 eventos publicados atuais/futuros. Alterações concorrentes exigem a versão atual. Auditoria registra as alterações. Pausar preserva resgates; editar um evento não permite ganhá-lo novamente.
- Os registros de ferramentas/dias, preferências e resgates entram na exportação da conta e são removidos por cascata na exclusão solicitada pelo titular. Eventos administrativos não são apagados junto com uma conta.

O perfil próprio recebe uma seção recolhida por padrão, **Missões, eventos e ranking**, com cartões compactos e progresso circular. A seção carrega quando aberta; falha exibe mensagem e botão de tentar novamente sem retirar o perfil. Uma recompensa recebida abre a celebração central com o visual, luzes e sons opcionais existentes. A celebração da missão só é enfileirada quando o servidor confirma um novo resgate.

Resgates aparecem nas notificações. Clicar abre o perfil na seção de missões e destaca brevemente o recebimento correspondente no histórico recente. Isso não repete a celebração nem coloca medalhas na tela de cadastro. Histórico e notificações apresentam os últimos 30 resgates; o registro de unicidade continua completo. Níveis e medalhas anteriores mantêm suas regras e animações. Movimento reduzido é respeitado; título de 100 caracteres e botão de continuar cabem em janela de 320 × 360 px.

## Ranking e privacidade

Participação começa desativada e pode ser retirada a qualquer momento. O ranking é consultável somente com sessão e mostra até 50 participantes: @usuário, avatar, posição e XP de atividade + missões. Não retorna e-mail, nome civil, idade, foto, dados salvos ou identificadores privados. Usa o saldo base, sem bônus calculados de medalhas; essa diferença é explicada no painel. Empates têm a mesma posição. Contas suspensas/banidas e bloqueios entre os envolvidos ficam fora da consulta. Presença online é outra função e continua pendente.

## Validação e operação

- `npm run conferir`: **1.125/1.125** testes unitários; 123 saídas geradas, 65 ferramentas prontas. Verificador: 122 páginas, 212 scripts e 208 entradas, sem problemas. Log privado `.execucao/conferencia-v1.3.5.log`.
- `npm run testar:api`: **5/5** cenários com API e SQLite isolados. Cobrem autorização/CSRF, resgate simultâneo, eventos/versionamento, ranking opcional/privacidade, exportação/exclusão, tamanhos UTF-8, cotas, preservação após redução de plano, redução de dados acima da cota e paginação até 2.000 trabalhos. Log `.execucao/api-v1.3.5.log`.
- **42 cenários distintos de navegador**: 35 regressões de perfil/chat/notificações/planilhas e sete cenários de planos/missões/eventos/ranking. A execução conjunta inicial passou 41/41; a suíte específica foi repetida com o novo cenário de planos, 7/7. Logs `.execucao/navegador-final-v1.3.5.log` e `.execucao/recompensas-navegador-v1.3.5.log`. Um botão longo da página inglesa foi encurtado após o teste de 320 px revelar transbordamento.
- Capturas renderizadas inspecionadas em sessões de teste: `.execucao/missoes-{1280-light,390-light,320-dark}-v1.3.5.png`, `.execucao/missao-celebracao-{1280,390,320}-v1.3.5.png` e `.execucao/planos-{1280,320}-v1.3.5.png`. Dados fictícios e API simulada no navegador; não representam a conta real do proprietário. Som e desempenho físico ainda requerem conferência em aparelho real.
- Antes da ativação, SQLite copiado de forma consistente por `VACUUM INTO`, com `quick_check=ok`. Cópia privada em `servidor/.execucao/backup-v1.3.5-1791532894982.sqlite`. Comparação por hash de todas as linhas das **23 tabelas existentes** antes/depois: nenhuma alterada, inclusive contas, fotos, mensagens e trabalhos. Foram acrescentadas quatro tabelas de recompensas. As duas contas existentes permanecem preservadas. Evidência `.execucao/integridade-resultado-v1.3.5.json`; valores privados não são publicados.
- Servidor local `http://127.0.0.1:4400/`, escutando em `0.0.0.0:4400`; API em `127.0.0.1:4870`. HTTP local e LAN `http://192.168.1.1:4400/` conferidos deste computador: início, planos, perfil e eventos respondem 200; missões sem sessão respondem 401; API pública retorna as novas cotas. CSS/módulos servidos iguais ao disco por hash, sem cache. Evidência `.execucao/http-v1.3.5.json`.

Não houve publicação externa, compra real, teste físico em outro dispositivo nem alteração do plano das contas reais. Próximo item: administração de catálogo/conteúdo/pontos e bloqueio progressivo persistente. Inglês das ferramentas, produção, AdSense real, SMTP e conclusão do backup de `C:\Projetos` permanecem no inventário de pendências.
