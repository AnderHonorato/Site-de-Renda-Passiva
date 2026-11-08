# Implantar Sites ADS no blitz.cloud (gratuito)

## Importação do GitHub
1. Abra https://dashboard.blitz.cloud e crie conta Free (sem cartão).
2. Escolha um identificador de conta e clique em **Host something new → My own code**.
3. Conecte o GitHub ou cole https://github.com/AnderHonorato/Site-de-Renda-Passiva.
4. Em Advanced settings: **branch ander-flow/v1**, **Folder to build portal**,
   **Dockerfile Dockerfile** (dentro dessa pasta) e **port 8080**.
5. Nome do app: **sites-ads**. Não modificar o CMD da imagem.
6. Nas configurações avançadas de arquivos, marque **/data como kept folder**
   (armazenamento persistente). É obrigatório e reserva parte dos 10 GB gratuitos.
7. No painel do app, veja o domínio REAL designado (como
   sites-ads.SUA-CONTA.prod.page). Em Environment, defina
   **URL_PUBLICA=https://DOMINIO-REAL** sem barra final. Reinicie o app
   após aplicar o valor.
8. A imagem já define NODE_ENV=production, PORT=8080,
   PORTAL_BANCO=/data/portal.sqlite e desliga chat e publicidade.
9. Teste GET https://DOMINIO-REAL/api/saude: resposta 200
   {"estado":"ok"}. Depois teste home, conta, cookies Secure,
   CSRF e API Premium com dados fictícios.

## Cuidados e limites
- A aplicação recusa iniciar sem volume Linux separado da camada efêmera.
- **Não declarar VOLUME /data no Dockerfile**: volumes anônimos podem sumir
  com o contêiner e não garantem persistência. Selecione kept folder no painel.
- Banco SQLite é um arquivo local; não é PostgreSQL gerenciado. Use uma réplica.
- No Free, pastas persistem entre reinícios, mas não recebem backup externo
  automático. Configure e teste rotina privada de backup antes de dados reais.
- Até 5 apps, 512 MB de RAM reservada e 10 GB de armazenamento na conta;
  limites podem mudar. App dorme após 15 minutos sem visitantes.
- O provedor pode suspender apps inativos; verifique as condições atuais.
- Sem domínio personalizado grátis, sem assinatura/cobrança Premium ativa.
- Não habilitar anúncios, chat público ou registros de clientes reais até
  preparar recuperação de senhas, backups e restauração operacional.
- Este arquivo não cria conta ou aplicativo no provedor e não gera gastos.

Docs oficiais:
https://blitz.cloud/docs/deploy-from-github/
https://blitz.cloud/docs/settings-and-files/
https://blitz.cloud/docs/limits/
https://blitz.cloud/terms/
