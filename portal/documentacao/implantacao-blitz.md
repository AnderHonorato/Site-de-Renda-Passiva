# Implantar Sites ADS no blitz.cloud Free

Preços, elegibilidade regional e limites verificados em **13 nov. 2026**.

Este guia descreve uma implantação de teste. O plano Free não mantém a API
sempre acordada; não o trate como serviço de produção ou endpoint de webhooks.

## Regras do plano Free

- Cadastro sem cartão; 5 apps, 512 MB de memória reservada compartilhada e
  10 GB de armazenamento compartilhado. A imagem Docker com pasta mantida
  reserva 1 GB.
- A gratuidade sem prazo aplica-se a contas da UE, EEE, Reino Unido e Suíça.
  **No Brasil e em outras regiões, o Free dura 7 dias**; depois as apps pausam
  até contratar Pro. Não há cobrança automática, mas a hospedagem deixa de
  funcionar.
- Uma app web sem visita humana por 15 minutos dorme e acorda na próxima visita
  feita por uma pessoa no navegador. Chamadas de API, uptime monitors, scripts
  e webhooks não a acordam: recebem resposta de app adormecida. Uma app que
  ninguém visita por 7 dias é pausada até ser iniciada pelo painel.
- `/data` pode sobreviver a reinícios se for marcado como pasta mantida (*kept
  folder*). No Free, arquivos mantidos não têm cópia de segurança automática.
- HTTPS e subdomínio `*.prod.page` são fornecidos. Domínio próprio e apps
  sempre acordadas exigem plano pago.

Fontes: [preços](https://blitz.cloud/pricing/),
[limites e suspensão](https://blitz.cloud/docs/limits/),
[arquivos persistentes e backups](https://blitz.cloud/docs/settings-and-files/).

## Importação do GitHub

1. Abra [dashboard.blitz.cloud](https://dashboard.blitz.cloud) e crie conta
   Free. No Brasil, considere a limitação de 7 dias acima.
2. Escolha **Host something new → My own code** e conecte o GitHub ou informe
   `https://github.com/AnderHonorato/Site-de-Renda-Passiva`.
3. Em **Advanced settings**, escolha branch `ander-flow/v1`, pasta `portal`,
   Dockerfile `Dockerfile` e porta `8080`.
4. Nomeie a app `sites-ads`. Mantenha o `CMD` do Dockerfile.
5. Antes de iniciar, marque `/data` como pasta persistente nas configurações de
   arquivos. Ela é necessária para o SQLite e reserva armazenamento do plano.
6. Após o deploy, copie o domínio HTTPS real da app e defina
   `URL_PUBLICA=https://<dominio-real>` no Environment, sem barra final. Reinicie
   depois de salvar.
7. O Dockerfile define `NODE_ENV=production`, `PORT=8080`,
   `PORTAL_BANCO=/data/portal.sqlite` e desativa chat/anúncios.
8. Verifique manualmente `GET https://<dominio-real>/api/saude` (200,
   `{"estado":"ok"}`), página inicial, sessão Secure e CSRF com dados fictícios.
   Depois de reiniciar a app, confirme que o banco ainda está presente.

## Cuidados

- O processo recusa iniciar sem volume persistente Linux em `/data`. Não declare
  `VOLUME /data` anônimo no Dockerfile: selecione a pasta mantida no painel.
- SQLite é arquivo local. Mantenha cópia privada externa e ensaie restauração;
  a pasta do plano Free não tem backup automático.
- O proxy de API e o site ficam na mesma origem HTTPS. Ainda assim, o sono faz
  a API indisponível para chamadas de máquina quando não há visita recente.
- Sem integração de entrega de e-mail e sem operação de backup/recuperação pronta,
  não habilite cobranças nem cadastre dados reais de clientes.
- Este guia não criou conta ou app. O backend completo continua sem hospedagem.

Outras instruções: [deploy GitHub](https://blitz.cloud/docs/deploy-from-github/),
[termos](https://blitz.cloud/terms/).
