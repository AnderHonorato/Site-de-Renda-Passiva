# Opções de hospedagem gratuita para Sites ADS

Resumo consultado em 13 de novembro de 2026. A app precisa de Node 22, API e site na
mesma origem HTTPS, arquivo SQLite em armazenamento persistente e espaço para
dois worker threads com limite de heap de 128 MB cada.

| Provedor | SQLite persistente | HTTPS e disponibilidade | Cartão/cobrança | Veredito |
| --- | --- | --- | --- | --- |
| [Blitz.cloud Free](implantacao-blitz.md) | Sim, `/data` como pasta mantida; sem backup automático no Free | HTTPS incluído; dorme após 15 min sem visita humana; chamadas de API não acordam. Brasil e demais regiões fora UE/EEE/UK/Suíça: Free só por 7 dias. | Sem cartão nem cobrança automática | Melhor para teste curto/gratuito no Brasil; não serve como API permanente. |
| [Northflank Sandbox](implantacao-northflank.md) | Sim, volume persistente em `/data`; disco é tarifado por GiB | Pricing anuncia always-on; uma réplica no volume Single Read/Write. Sandbox é declarado inadequado para produção. | Pricing atual anuncia até US$20/mês de recursos e “No card needed”; docs de billing ainda exigem forma de pagamento. Franquia não é hard cap confirmado. | Boa experiência técnica em teste se o fluxo atual confirmar elegibilidade, mas não há certeza documental sobre cartão/cobrança acima do saldo. |
| [Oracle Cloud Always Free](implantacao-oracle.md) | Sim, volume de boot ou Block Volume; 200 GB totais de storage em quota gratuita | VM sempre ligada; HTTPS precisa DNS, proxy reverso e certificado configurados pelo operador. VMs ociosas podem ser reclamadas. | Cartão exigido para verificação; não fazer upgrade para Pay As You Go e usar só recursos marcados Always Free para evitar cobrança. | Melhor candidato a VM persistente e com folga de memória, com mais administração e risco de reclaim por ociosidade. |
| [Railway Free](implantacao-railway.md) | Sim, um volume de até 0,5 GB; RAM até 0,5 GB | HTTPS incluído; Serverless pode dormir após inatividade | Plano Free custa US$0 e inclui US$1 mensal em recursos. Hobby custa US$5/mês. O plano da conta conectada não foi confirmado. | Pode atender testes com baixo consumo; US$1 não garante um mês inteiro de API ativa. Não criar recursos em conta paga para cumprir um pedido de hospedagem grátis. |
| [Koyeb Free](https://www.koyeb.com/docs/reference/instances) | Não: Free Instance não admite volumes | 512 MB/0,1 vCPU e escala a zero após 1 h sem tráfego | FAQ exige cartão e informa validação por autorização de US$29; ao inscrever-se pode selecionar Pro | Não atende SQLite persistente nem preferência sem cartão. |
| [Render Free](https://render.com/docs/free) | Não: filesystem é efêmero; disco custa US$0,25/GB/mês e só pode ser conectado a serviço pago | 512 MB; dorme após 15 min sem tráfego | Plano free não oferece disco persistente. Free Postgres expira após 30 dias. | Não atende SQLite persistente sem custo; Postgres requer migração de banco e expira no Free. |

## Escolha sugerida

Para demonstração breve no Brasil, Blitz oferece cadastro simples sem cartão,
mas o limite de sete dias e o sono da API tornam essa opção inadequada para uso
contínuo. Para operação pública, a opção técnica mais robusta entre as avaliadas
é uma VM Oracle Always Free com armazenamento persistente, publicada com TLS
por um proxy reverso; a VM pode ser reclamada se ficar subutilizada e exige
manutenção/backup pelo operador. Consulte [o guia de implantação Oracle](implantacao-oracle.md).

Northflank é uma alternativa gerenciada interessante para teste, mas antes de
criar recursos confirme no próprio onboarding se o cartão é exigido e se o
volume consome a franquia Sandbox. O limite de US$20/mês não foi documentado
como hard cap. Nenhuma destas opções equivale a uma garantia de produção,
backup remoto e recuperação já operacional.

Os dois worker threads são limitações de heap por thread; não representam o
RSS total do serviço. Mesmo com 512 MB ou mais de RAM, conferir o uso agregado
do processo, V8, bibliotecas e concorrência antes de considerar uma capacidade
adequada.

A prévia estática do GitHub Pages está publicada; o **backend completo continua
sem hospedagem**. Nenhuma conta, serviço ou recurso foi criado durante esta pesquisa.

Fontes de preços e termos: [Blitz](https://blitz.cloud/pricing/),
[Northflank](https://northflank.com/pricing) e [billing](https://northflank.com/docs/v1/application/billing/pricing-on-northflank),
[Oracle Free Tier](https://www.oracle.com/cloud/free/faq/) e [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
[Koyeb](https://www.koyeb.com/docs/reference/instances), [Render](https://render.com/pricing)
e [Railway](https://docs.railway.com/pricing/plans).
