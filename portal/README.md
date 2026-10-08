# Portal — versão 1.3.2

O portal escolhido é o da porta **4400**. A identidade visual e as 65 ferramentas prontas foram preservadas. Conta e chat usam uma API separada, na mesma origem através do proxy do portal. O catálogo tem 208 itens; os planejados continuam identificados como planejados.

## Executar

Node 22.14 ou superior. A API não exige dependências npm. O SQLite embutido em Node 22 emite aviso de recurso experimental.

Na pasta `portal`:

```powershell
npm run gerar
npm run no-ar
```

Abra `http://127.0.0.1:4400/`. O comando inicia site e API, preservando arquivos e banco, e religa o conjunto se um deles cair. A API escuta só em `127.0.0.1:4870`; as páginas usam `/api/` na 4400. Ctrl+C encerra os dois processos. `npm run dev` inicia uma sessão simples de desenvolvimento; `npm run servir`, apenas o site; `npm run api`, apenas a API. O arquivo `.env`, quando existir, é lido por `dev` e `no-ar`.

O comando `dev` habilita o chat local. Em desenvolvimento, com a origem padrão da 4400 e o chat local habilitado, a API aceita também os endereços das interfaces deste computador na porta 4400. Em produção o chat fica desligado até `PORTAL_CHAT_PUBLICO=1`; exige as condições do checklist e responsável por moderação. Para domínio definitivo, configure `URL_PUBLICA` com a origem exata usada no navegador. Alterações de outra origem são recusadas.

## Conta e administração

Cadastro com e-mail, senha de 12–128 caracteres, @usuário único e declaração de idade. Login, saída, perfil, preferências, exportação e exclusão da conta usam banco próprio. Senhas e tokens de sessão não ficam em localStorage. As ferramentas locais funcionam quando a API cai.

Depois de criar sua conta, conceda a função de administrador **localmente**:

```powershell
npm run admin:criar -- seu-email@exemplo.com
```

Não há senha nem administrador de fábrica. O script concede a função a uma conta ativa existente. O menu da conta oferece moderação, usuários e suporte. Plus/Premium são liberados manualmente, sem preço ou cobrança automática. `/planos.html` descreve a disponibilidade atual.

## Recuperação e armazenamento

Em desenvolvimento, instruções de recuperação são gravadas em `servidor/.execucao/emails/`. O token fica no fragmento `#token`, expira em uma hora e tem uso único. A API não devolve links ou tokens.

Em produção não há SMTP integrado e a recuperação pública retorna indisponível. O operador autorizado pode gerar um link para uma conta existente:

```powershell
npm run admin:recuperar -- seu-email@exemplo.com
```

Esse comando exige `URL_PUBLICA` HTTPS. Entregue o link privadamente ao titular após verificar a identidade; não publique o arquivo de recuperação.

SQLite: `servidor/.execucao/portal.sqlite`, ou o caminho privado `PORTAL_BANCO`. Banco, WAL e e-mails não são publicados nem versionados. Os testes usam bancos temporários. Faça backup privado e teste sua restauração antes de abrir contas ao público. Sessões expiram, trocar/redefinir senha revoga sessões antigas e mensagens são retidas por até 90 dias.

## AdSense

Publicidade vem desligada e sem IDs. Exemplo de `.env` sem credenciais:

```dotenv
PORTAL_ADS_ATIVO=0
PORTAL_ADS_EDITOR=
PORTAL_ADS_RODAPE=
PORTAL_ADS_RESULTADO=
PORTAL_ADS_TESTE=1
```

O administrador pode configurar `/admin/publicidade/`, com validação do editor e dos blocos de resultado, lista e rodapé. A configuração salva no banco prevalece sobre as variáveis legadas. `Demonstração local` mostra cartões identificados para conferir posições e não carrega o Google nem gera receita; essa opção é recusada em produção. Em 07/10/2026 a prévia local foi habilitada a pedido do proprietário, que ainda não tem IDs.

Editor: `ca-pub-` mais 16 dígitos. Blocos: IDs reais de 6–20 dígitos. Sem configuração, consentimento, autorização da API ou preenchimento, os blocos reais não ocupam altura nem margem. Posições após o conteúdo de uso, na lista e acima do rodapé, longe dos controles. Conta, admin, autenticação, perfis, textos legais, erros, salvos, planos e estudos não recebem anúncios; Plus/Premium também não.

Use apenas blocos manuais no AdSense. Anúncios automáticos/âncoras/vinhetas não fazem parte do formato implementado. A escolha muda em `/cookies.html`. O servidor gera `ads.txt`; HTML autorizado recebe nonce novo e CSP própria. Sem publicidade, mantém a CSP original.

Fontes: [blocos vazios](https://support.google.com/adsense/answer/10762946?hl=en), [posicionamento](https://support.google.com/adsense/answer/1346295?hl=en), [CSP](https://support.google.com/adsense/answer/16283098?hl=en), [consentimento regional](https://support.google.com/adsense/answer/13554116?hl=en). IDs, aprovação, CMP aplicável e anúncio real ainda precisam de validação na conta do proprietário.

## Validar e publicar

```powershell
npm run conferir
npm run testar:api
npm run publicar
```

`publicar` prepara arquivos públicos; não faz deploy nem leva banco/API. Contas exigem os dois processos Node atrás de HTTPS. Hospedagem só estática não entrega login/chat. Quando ligar publicidade, mantenha o proxy Node para HTML com nonce; atualize o Nginx estático antigo antes do deploy.

O exemplo `../documentação/hospedagem/portal-v1.1.conf.exemplo` encaminha também SSE. Use `PORTAL_PROXY_CONFIAVEL=1` somente com proxy local que sobrescreve `X-Forwarded-For` com o IP real; isso permite limites por visitante. Requisições diretas não podem escolher seu IP por cabeçalho.

Estado: `../CHECKLIST.md` e `../documentação/plano-portal-principal.md`.

Auditoria atual do pedido original: [`documentacao/pendencias-prompt-original-2026-10-08.md`](documentacao/pendencias-prompt-original-2026-10-08.md). Ela distingue as funções entregues das lacunas da primeira fase, expansões posteriores e dependências de produção.

## Refinamento visual — 08/10/2026

A pesquisa fica imediatamente antes do sino no grupo direito do cabeçalho. Ao abrir, cresce apenas para a esquerda, até 240 px no computador e 176 px no celular, sem deslocar o sino. Notificações de conquistas usam colunas independentes para miniatura e texto; o cabeçalho do painel fica fora da lista rolável e não pode ser coberto pelos itens. Barras de rolagem usam cores do tema, com alternativa nativa em contraste forçado. O perfil apresenta rank, XP, estatísticas e coleção filtrável com oito marcos por conquista. Até cinco destaques podem ser escolhidos e ordenados; contas sem seleção conservam os três destaques automáticos anteriores. Conquistas recebidas persistem após remover favoritos/trabalhos. Links de notificação destacam a insígnia correspondente, inclusive na coleção. Os desenhos dos emblemas variam por família e os nove ranks têm símbolos próprios.

O chat segue a organização pública observada no SuperAnimes, dentro do tema do portal: salas à esquerda, conversa central, participantes à direita. Mensagens contínuas agrupam o autor e separadores marcam as datas; não há medalhas ou cartões no fluxo de mensagens. O painel de participantes mostra rank textual. Sem API de presença, a lista identifica pessoas das mensagens carregadas e não afirma que estão online. No celular, salas ficam em um painel recolhível. A denúncia de perfil continua em Mais no próprio perfil; a denúncia de mídia continua no visualizador.

O menu de categorias mede o espaço disponível e rola internamente em telas baixas. Ao passar para a navegação móvel, fecha o painel do cabeçalho. A publicidade é carregada como módulo opcional: sua falha não impede listas, consentimento nem a apresentação flutuante. Na página inicial, a apresentação aparece automaticamente na primeira visita após o consentimento e aguarda outros diálogos. A visualização é registrada ao abrir, por cookie por um ano e fallback local. Não exige botão manual e não se repete ao recarregar. Avisos publicados posteriormente conservam seu controle por revisão.

Evidências atualizadas desta versão: [relatório v1.3.2](documentacao/entrega-v1.3.2.md). São testes em Chromium com dados de teste; a inspeção da sessão real do proprietário e outro aparelho físico não estão confirmadas nesta rodada.

## Perfil e conquistas — 07/10/2026

Nome, biografia, redes sociais, preferências, visual e foto são gravados juntos por `PATCH /api/perfil`. Uma entrada inválida impede a atualização inteira. A tela conserva os campos quando há erro e mantém o tema usado no aparelho. Links sociais aceitam o @usuário ou a URL direta do perfil na plataforma correspondente.

A foto é recortada localmente em 512 × 512, com zoom, posição e prévias de perfil/chat. A consulta privada da imagem não usa cache para que uma alteração apareça após salvar. Trabalhos, favoritos e suporte ficam em abas com transição dentro da conta. Senhas e tokens não participam desse salvamento.

Conquistas pendentes são calculadas a partir da atividade real. O servidor registra o maior patamar já recebido em cada família; uma nova aba ou outro aparelho não repete a celebração. O modal tem feixes de luz e emblema central, com movimento reduzido quando solicitado pelo sistema. Sons discretos são sintetizados no aparelho após interação; podem ser desativados em Preferências. Mensagens próprias não fazem som de recebimento.

Para o teste solicitado, `@honor` recebeu o nível 15, último marco dos banners e molduras atuais. A progressão numérica continua acima disso. Não foram alterados plano, senha, dados do perfil nem atividades para inventar medalhas. O banco anterior está preservado em `.execucao/`, fora da publicação e do Git.

## Avisos prioritários e estabilidade — 07/10/2026

O administrador encontra **Avisos** no menu de administração da conta. A área cria até doze avisos ativos abaixo do cabeçalho, com textos em português e inglês, cores com contraste validado, imagem opcional PNG/JPEG/WebP de até 1 MiB, texto alternativo, link seguro, programação e ordem. Dois ou mais avisos formam um carrossel que pausa ao receber foco, ao passar o mouse, fora da tela, com a página oculta ou quando a pessoa prefere reduzir movimento. Sem avisos ativos, a região não ocupa espaço.

O cabeçalho, sessão, chat, busca e avisos são inicializados em blocos independentes. Se uma função falhar, ela mostra uma mensagem localizada e uma nova tentativa, sem trocar uma conta carregada por visitante ou interromper as ferramentas. Durante o carregamento são usados esqueletos no formato dos componentes. As ilustrações de categoria agora respeitam o orçamento de movimento no celular, revezam corretamente as vagas disponíveis e mostram a variante estática coerente quando não há vaga.

## Busca e divulgação

O gerador inclui instruções, exemplos, limites e perguntas reais no HTML das 65 ferramentas. Títulos, descrições, Open Graph e dados estruturados descrevem cada ferramenta. Canonical, hreflang absoluto e sitemap exigem um domínio HTTPS real em `URL_PUBLICA` ou `PORTAL_URL_SITE`; na prévia local o sitemap fica vazio e o robots impede indexação. `npm run gerar` lê `.env` quando existir.

O roteiro para Search Console, conteúdo e campanhas está em [busca e publicidade](../documentação/busca-e-publicidade-2026-10-07.md). A preparação técnica não representa indexação confirmada, aprovação de anúncios ou campanha paga ativa.
