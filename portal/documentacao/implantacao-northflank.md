# Implantar Sites ADS no Northflank Sandbox

Preços e documentação oficial verificados em **13 nov. 2026**.

Este guia descreve uma implantação de avaliação. O próprio Northflank diz que
Sandbox é para experimentar/hobby e não deve ser usado em produção.

## Antes de criar recursos

A página atual de [preços](https://northflank.com/pricing) anuncia Sandbox
gratuito, “No card needed”, dois serviços, dois jobs, um banco, até **US$20/mês
em recursos** no Northflank Cloud e serviços sempre ligados. Já a
[documentação oficial de billing](https://northflank.com/docs/v1/application/billing/pricing-on-northflank)
diz que todo usuário precisa adicionar método de pagamento para criar recursos.
As páginas oficiais divergem; confira a tela atual de cadastro antes de
continuar. Este guia não inicia o fluxo nem cria uma conta.

A franquia não é um hard cap anunciado. Recursos podem ser cobrados acima do
valor incluído se houver forma de pagamento. A tabela de preços lista compute
por segundo e volume persistente por **US$0,11657/GiB/mês**; confira o uso real,
incluindo build, armazenamento, tráfego e logs, antes de deixar um recurso
ativo. A franquia parece cobrir os recursos faturáveis do próprio Northflank
Cloud, mas a documentação não detalha de forma explícita a contabilização do
disco no saldo. Não associe um cluster BYOC: o provedor de nuvem cobrará a
infraestrutura à parte.

## Configuração de avaliação

1. Acesse [app.northflank.com](https://app.northflank.com/) e conecte o GitHub.
2. Se o onboarding confirmar o Sandbox e os termos de pagamento forem aceitáveis,
   crie um projeto `sites-ads-sandbox`.
3. **Create new → Service → Combined**; nome `sites-ads-premium`.
4. Repositório `AnderHonorato/Site-de-Renda-Passiva`, branch `ander-flow/v1`.
5. Build: Dockerfile `portal/Dockerfile`; **Build context `/portal`**.
6. Configure serviço web com HTTP público na porta `8080`; use HTTPS e hostname
   fornecidos pelo provedor. Mantenha uma réplica.
7. Anexe um volume persistente em `/data`, modo **Single Read/Write**. Esse modo
   restringe a uma instância e interrompe o serviço durante certas trocas de
   versão. Confira o preço e os limites exibidos no projeto antes de criar o
   volume.
8. O Dockerfile já define `PORT=8080`, `PORTAL_BANCO=/data/portal.sqlite`,
   `NODE_ENV=production` e desativa chat/anúncios. `iniciar-nuvem.mjs` tenta
   descobrir `URL_PUBLICA` via `NF_HOSTS` quando houver exatamente um hostname
   `.code.run`; se não descobrir, informe `URL_PUBLICA` como origem HTTPS exata,
   sem caminho ou barra final.
9. Verifique manualmente `GET /api/saude` (200, `{"estado":"ok"}`), página
   inicial, sessão Secure e CSRF com dados fictícios. Reinicie o serviço e
   confirme que o SQLite em `/data` persiste.

## Restrições

- A aplicação recusa iniciar se `/data` não estiver em montagem persistente e
  gravável pelo usuário `node` do contêiner.
- Site e API são servidos na mesma origem HTTPS; a API interna escuta em loopback
  dentro do contêiner.
- Sandbox é para avaliação, não uma garantia de serviço de produção. Não trate a
  franquia mensal como limite rígido de cobrança.
- Cobrança Premium, backup remoto/restauração ensaiada e recuperação de senha por
  e-mail não estão prontos. Não cadastrar clientes reais.
- Este documento não criou conta ou serviço. O backend completo continua sem hospedagem.

Documentação oficial: [build/deploy](https://northflank.com/docs/v1/application/getting-started/build-and-deploy-your-code),
[volumes](https://northflank.com/docs/v1/application/databases-and-persistence/add-a-volume),
[preços](https://northflank.com/pricing),
[billing](https://northflank.com/docs/v1/application/billing/pricing-on-northflank).
