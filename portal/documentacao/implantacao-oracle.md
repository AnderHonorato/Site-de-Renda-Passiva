# Implantar Sites ADS na Oracle Cloud Always Free

Limites e regras oficiais conferidos em **13 nov. 2026**.

Guia para uma VM Linux em Always Free, com SQLite em disco persistente, HTTPS
terminado no host e a app servida pelo domínio na mesma origem. Não cria recursos
ao ser lido. O backend completo continua sem hospedagem; a prévia no GitHub Pages já está publicada.

## Limites e regras de cobrança

- Always Free A1 dá 1.500 OCPU-horas e 9.000 GB-horas por mês, equivalentes a
  **2 OCPU e 12 GB RAM** durante o mês. Crie uma VM `VM.Standard.A1.Flex` com
  esses limites na *home region* da tenancy e confira que aparece como
  **Always Free-eligible** antes de confirmar. Oracle pode exibir “out of host
  capacity”; a capacidade da home region não é garantida.
- Há **200 GB totais de Block Volume Always Free**, compartilhados entre discos
  de boot e volumes anexos. O boot volume tem tamanho mínimo documentado de
  47 GB. Para esta app, o volume de boot basta para persistir `/data`; um disco
  anexo é opcional.
- Oracle pede cartão de crédito/débito para verificar identidade e pode fazer
  uma autorização temporária. Os US$300 promocionais duram até 30 dias e são
  distintos de Always Free. **Não faça upgrade para Pay As You Go** e não crie
  recursos pagos. Sem upgrade, ao acabar o trial continuam apenas recursos
  Always Free; recursos pagos de trial podem ser removidos.
- A política oficial permite reclamar VMs Always Free que, durante 7 dias,
  fiquem abaixo de 20% de CPU P95 e 20% de rede; para A1, também abaixo de 20%
  de memória. Contas sem atividade por 30 dias ou mais podem ser suspensas ou
  encerradas. Uma app pequena e de pouco tráfego pode entrar na regra: a VM
  Always Free não é garantia de disponibilidade nem de retenção contra reclaim.
- Só use imagens, formas, discos e outros recursos exibidos como elegíveis para
  Always Free. Não dependa de um domínio fornecido por Oracle: HTTPS com domínio
  próprio requer nome DNS sob seu controle, e um domínio pode ter custo externo.

Referências oficiais: [FAQ/Free Tier](https://www.oracle.com/cloud/free/faq/),
[recursos Always Free e regra de reclaim](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
[compute Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Compute.htm).

## 1. Criar VM elegível

1. Crie uma conta em [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
   O cadastro exige cartão para verificação. Guarde a *home region* escolhida.
2. Não clique em **Upgrade**, **Upgrade to Pay As You Go** ou opção equivalente.
   Ignore os US$300 para este deploy; não crie recursos pagos usando o trial.
3. Em **Compute → Instances → Create instance**, selecione uma imagem Ubuntu
   Linux ARM suportada (por exemplo, Ubuntu 22.04 ARM), a forma flexível
   `VM.Standard.A1.Flex`, **2 OCPU e 12 GB**, e boot volume de **50 GB**.
   Confirme o rótulo Always Free antes de criar.
4. Associe sua chave SSH pública e atribua um IPv4 público à VM. Configure uma
   regra de entrada no NSG/security list da VCN para SSH (`22/tcp`, de preferência
   só do seu IP) e HTTP/HTTPS (`80/tcp`, `443/tcp`, da internet). Não abra a
   porta `8080` ao público.
5. No DNS do domínio, crie um registro A apontando o host escolhido para o IPv4
   público da VM. Espere o DNS resolver antes de solicitar certificado TLS.

## 2. Instalar Docker e compilar a imagem atual

Conecte-se via SSH à VM e instale Docker Engine de acordo com o guia oficial
para Ubuntu ARM: [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
Depois clone a branch indicada e construa usando `portal/` como contexto; o
Dockerfile é multiarch Node 22 e roda os passos de build definidos nele.

```sh
sudo git clone --branch ander-flow/v1 --single-branch \
  https://github.com/AnderHonorato/Site-de-Renda-Passiva.git \
  /opt/Site-de-Renda-Passiva
cd /opt/Site-de-Renda-Passiva/portal
sudo docker build -t sites-ads:ander-flow-v1 .
```

Confira que a branch clonada corresponde à versão que pretende publicar antes
de expor o serviço.

## 3. Persistir o SQLite no host

O Dockerfile executa como `node:node`; a imagem oficial Node usa UID/GID 1000.
Crie `/srv/sites-ads/data` no disco persistente da VM e conceda escrita ao
usuário do contêiner. O bind mount mantém o banco fora da camada descartável da
imagem e dos contêineres:

```sh
sudo install -d -o 1000 -g 1000 -m 0700 /srv/sites-ads/data
sudo install -d -m 0700 /srv/sites-ads/backups
```

Crie um arquivo de ambiente protegido no host, substituindo o exemplo pelo
domínio DNS real:

```sh
sudo sh -c 'umask 077; cat > /etc/sites-ads.env <<EOF
URL_PUBLICA=https://sites.example.com
PORTAL_BANCO=/data/portal.sqlite
EOF'
```

Inicie a imagem com a porta 8080 publicada **somente em loopback** e com o bind
mount solicitado:

```sh
sudo docker run -d --name sites-ads --restart unless-stopped \
  --env-file /etc/sites-ads.env \
  --publish 127.0.0.1:8080:8080 \
  --volume /srv/sites-ads/data:/data \
  sites-ads:ander-flow-v1
```

`PORT=8080`, Node em produção, API na porta interna `4870` (loopback no
contêiner), chat e anúncios desativados já vêm no Dockerfile. O serviço do site
na porta `8080` encaminha `/api/*` à API dentro do próprio contêiner. Não
publique a porta `4870` nem exponha `8080` diretamente na VCN.

## 4. HTTPS na mesma origem

Instale [Caddy para Ubuntu](https://caddyserver.com/docs/install) no host. Ele
termina TLS em `80/443` e encaminha o domínio inteiro à aplicação na porta
loopback `8080`. Em `/etc/caddy/Caddyfile`, use:

```caddyfile
sites.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
```

Substitua `sites.example.com` pelo mesmo host usado em `URL_PUBLICA`. Verifique
que DNS A resolve para a VM, as regras da VCN e o firewall local permitem `80`
e `443`, e então recarregue Caddy (`sudo systemctl reload caddy`). Caddy obtém e
renova automaticamente um certificado público quando o DNS e as portas estão
corretos. Site e API então ficam na mesma origem HTTPS; o host não expõe a porta
8080 para a internet.

## 5. Verificação e operação

1. Confira os logs (`sudo docker logs sites-ads`) e abra
   `https://sites.example.com/api/saude`: resposta esperada `200` com
   `{"estado":"ok"}`.
2. Com dados fictícios, verifique a página inicial, cadastro/login, cookie
   Secure, CSRF e fluxos Premium. Reinicie a VM ou contêiner e confira que o
   banco segue disponível em `/srv/sites-ads/data/portal.sqlite`.
3. Faça cópias consistentes regulares do SQLite, criptografe e envie-as para
   armazenamento privado fora da VM. O repositório inclui um utilitário que
   lê o banco em uso incluindo transações WAL; dentro do contêiner, um exemplo
   de chamada é:

   ```sh
   sudo docker exec sites-ads node scripts-admin/backup-banco.mjs \
     /data/portal.sqlite /tmp/portal-backup.sqlite
   sudo docker cp sites-ads:/tmp/portal-backup.sqlite \
     /srv/sites-ads/backups/portal-backup-2026-11-13.sqlite
   ```

   O comando grava uma cópia local; não agenda, criptografa nem envia o backup.
   Remova a cópia de `/tmp` do contêiner depois de baixá-la. Planeje e ensaie a
   recuperação antes de guardar dados reais.
4. Monitore o estado da VM e alertas da tenancy. Pouco tráfego/CPU pode fazer
   com que Oracle classifique uma A1 como ociosa segundo os limiares acima e
   reclame a VM. Reclaim pode remover a instância; preserve backups fora dela.
   Não use o serviço para dados reais sem avaliar esse risco, definir retenção e
   confirmar um procedimento de restauração.
5. Não habilite cobrança Premium, chat, anúncios ou cadastro de clientes reais:
   integração de e-mail, controles operacionais e recuperação de senha não estão
   prontos. A configuração não ativa essas funções.

Este guia só documenta o procedimento. Não foi feito cadastro, upgrade, deploy
ou criação de infraestrutura; o backend completo continua sem hospedagem.
