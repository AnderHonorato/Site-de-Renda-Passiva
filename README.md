# Ferramentas do Ander — portal v1.1.0

O produto atual está em `portal/`, na porta **4400**: 208 ferramentas no catálogo, 65 prontas. As pastas antigas e `ander-flow/` permanecem como referência. O portal mantém sua identidade visual e o processamento local das ferramentas. Conta opcional, favoritos sincronizados, suporte, chat e moderação agora usam uma API e um SQLite próprios.

## Iniciar

Node 22.14 ou superior. Dentro de `portal`:

```powershell
npm run gerar
npm run dev
```

Abra `http://127.0.0.1:4400/`. A API fica em loopback na 4870; o site encaminha `/api/` na mesma origem. O comando habilita o chat em desenvolvimento. Anúncios vêm desligados; sem anúncio preenchido, nenhum espaço é reservado.

Após criar sua conta, o administrador é concedido por comando local: `npm run admin:criar -- seu-email@exemplo.com`. Não há administrador ou senha de fábrica. As contas e os arquivos das ferramentas antigas não foram importados nem substituídos.

## Estado e instruções

- [Checklist atual](CHECKLIST.md): concluído, testado e pendente.
- [Entrega v1.1.0](documentação/entrega-portal-v1.1.0.md): evidências e limites da validação.
- [Operação do portal](portal/README.md): login, recuperação, banco, anúncios e comandos.
- [Plano original](documentação/plano-portal-principal.md): ondas restantes do pedido ao Claude.
- [Decisões anteriores](ander-flow/docs/decisoes.md): continuidade do produto.
- [Histórico de versões](documentação/histórico-de-versões.md).

## Conferir

```powershell
cd portal
npm run conferir
npm run testar:api
```

`npm run publicar` gera o pacote estático, sem fazer deploy e sem copiar banco/API. Login e chat exigem os processos Node, HTTPS e configuração operacional para abertura pública. AdSense real depende dos IDs e aprovação do proprietário e do consentimento regional aplicável. Recuperação de senha em produção ainda usa procedimento local, pois não há SMTP integrado.

As 143 ferramentas planejadas, trabalhos salvos, administração completa de conteúdo e processamento avançado seguem no checklist. Não estão marcados como concluídos.
