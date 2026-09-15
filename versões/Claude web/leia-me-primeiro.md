# Como usar o prompt mestre no Claude

Preparado em 14/09/2026. Este pacote contém o prompt de implementação e a organização das seis pastas de projeto. Os sites ainda não foram implementados nesta etapa.

## Arquivo principal

Abra `prompt-mestre-orquestração-claude.md`. Ele é autossuficiente: contém os seis produtos, arquitetura, equipe, dois críticos independentes, validação final, interface, mobile, Pix, anúncios e segurança.

O destino de execução é:

```text
C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)
```

## Iniciar no Claude Code

Use Claude Code com acesso a esta pasta, terminal, navegador e subagentes reais. Um chat comum sem ferramentas de arquivos e execução não consegue cumprir a implementação apenas recebendo esse texto.

Se o Claude Code já estiver instalado e autenticado, abra o terminal PowerShell e execute:

```powershell
Set-Location -LiteralPath 'C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)'
claude --model claude-opus-5
```

Na sessão aberta, envie:

```text
Leia integralmente o arquivo prompt-mestre-orquestração-claude.md nesta pasta e execute a especificação completa. Use agentes reais para as partes independentes, dois críticos distintos e validação final do orquestrador. Entregue os seis projetos funcionais no celular e no computador, com navegação inferior no celular, seguindo os limites de custo, segurança e publicação do documento. Comece pela verificação do ambiente e prossiga com a implementação.
```

O comando acima usa Opus 5 porque foi o modelo Opus confirmado na [documentação oficial consultada](https://platform.claude.com/docs/en/models/overview). Você mencionou também Opus 6: se ele estiver disponível oficialmente na sua conta no momento de executar, selecione o identificador real correspondente. Não basta escrever um nome de modelo dentro do prompt para mudar a sessão.

O prompt prevê Sonnet 5 nos executores e Haiku 4.5 em tarefas simples; os críticos usam Opus disponível. O executor deve verificar permissões, modelos e limites reais da conta. Trabalho dos agentes consome a assinatura ou os créditos do Claude; a restrição de custo de hospedagem diz respeito à operação dos sites.

## Subagentes ou Agent Teams

Subagentes coordenados pelo orquestrador são suficientes para esta especificação. Eles possuem contexto próprio e retornam entregas ao agente principal. O prompt manda criar suas definições locais quando necessário.

Agent Teams é opcional e experimental, segundo a [documentação do Claude Code](https://code.claude.com/docs/en/agent-teams). Se optar por esse modo e a versão instalada o suportar, a documentação indica habilitar a variável abaixo antes de abrir uma nova sessão interativa:

```powershell
$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1'
claude --model claude-opus-5
```

Não é necessário habilitar esse recurso para usar subagentes. As instruções acima não foram executadas por este pacote e não alteraram sua configuração do Claude.

## Decisões incluídas

- Seis sites independentes: confeitaria, atividades escolares, artesanato, festas, reforma e embalagens.
- Código autoral e arquivos em português brasileiro, com acentos, funções separadas e exceções apenas para exigências técnicas.
- Interface orgânica, cores diferentes por site/página, animações leves, menu inferior de aplicativo no celular e navegação própria no PC.
- Arquitetura inicial sem backend e sem cadastro, porque as funções definidas podem rodar no navegador.
- Se algum projeto realmente precisar de backend: cadastro/login, administração de todos os usuários, moderação, chat principal e feedback flutuante passam a ser obrigatórios.
- Primeira visita com consentimento de cookies/opcionais; aceitar, rejeitar, personalizar e revogar, sem bloquear ferramentas.
- Apoio voluntário somente Pix: R$ 1, R$ 5, R$ 10, R$ 20, R$ 30, R$ 50, R$ 100 e valor livre, com QR e Copia e Cola.
- AdSense preparado e inicialmente desativado, com guia para o proprietário conectar a conta, configurar CMP, ads.txt e validar a publicação.
- Segurança e proteção de autoria sem prometer esconder completamente código que chega ao navegador.
- Dois pareceres independentes, correções e relatório final com evidências. Testes não são garantia de ausência absoluta de defeitos.

## Informações que você fornecerá para a publicação

Portfólio e contato reais; domínio/URL de cada site; chave Pix, nome e cidade do recebedor; identificador AdSense e blocos; configuração de consentimento. Esses dados não foram inventados. O desenvolvimento pode avançar com as integrações desativadas.

Credenciais privadas só serão necessárias se houver backend de aplicação e não devem ser inseridas em configuração pública. O Pix estático não exige senha bancária nem permite confirmar pagamento automaticamente.

Não é necessário pagar agora por domínio, API, serviço de banco, imagem, fonte ou plugin. Usar domínio/subdomínio já disponível evita custo adicional de registro; a hospedagem precisa comportar os arquivos e o tráfego. Ativação das integrações e publicação real são etapas distintas da criação dos arquivos.
