# Como conectar o Google AdSense (guia consolidado)

Os seis sites já têm espaços de anúncio e carregador prontos, **desativados**. Nada de publicidade é carregado enquanto a configuração estiver incompleta ou o visitante não aceitar os opcionais. Este guia não garante aprovação, receita, RPM ou prazo. Os nomes de menus do AdSense mudam com frequência: confira-os na sua conta e nas páginas oficiais citadas.

Referências oficiais: elegibilidade (https://support.google.com/adsense/answer/9724?hl=pt-BR), ads.txt (https://support.google.com/adsense/answer/12171612?hl=pt-BR), CSP (https://support.google.com/adsense/answer/16283098?hl=en), CMP nas regiões aplicáveis (https://support.google.com/adsense/answer/14893312?hl=en), TCF (https://support.google.com/adsense/answer/9804260?hl=en), público por idade (https://support.google.com/adsense/answer/3248194?hl=en).

## 1. Publicar primeiro

Publique o site em domínio ou subdomínio seu, com HTTPS e conteúdo final (ferramentas, metodologia, sobre, contato, privacidade, termos). Preencha `publicação.endereçoBase`, `criador.contato` e `privacidade.contatoDePrivacidade` e rode `npm run construir`.

## 2. Adicionar o site no AdSense

Crie ou acesse a conta e adicione o site conforme as regras atuais de domínio e subdomínio. Seis subpastas do mesmo domínio **não** equivalem a seis cadastros: o AdSense trabalha com o domínio. Se quiser relatórios e aprovação separados, publique cada produto em subdomínio próprio e siga as regras de subdomínio da conta.

## 3. Copiar os identificadores

- Identificador do publicador: `ca-pub-` + 16 dígitos.
- Crie blocos de anúncio responsivos e copie o número de cada bloco.

Em `configurações/configuração-pública.json` do produto:

```json
"publicidade": {
  "ativa": false,
  "identificadorDoPublicador": "ca-pub-0000000000000000",
  "blocos": { "após-resultado": "0000000000" },
  "consentimentoConfigurado": false,
  "cmp": "google"
}
```

`após-resultado` é o espaço reservado depois do resultado de cada ferramenta. Um bloco `padrão` vale para espaços sem bloco próprio.

## 4. Verificar a propriedade

Use o método oferecido pela conta. Site conectado ou verificado **não** é site aprovado.

## 5. ads.txt

Copie a linha fornecida pela conta para um arquivo `ads.txt` na **raiz do domínio** (`https://seudominio/ads.txt`), não dentro da pasta de um produto. Se os seis produtos estiverem no mesmo domínio, um único `ads.txt` central atende a todos. Para subdomínios, siga a regra oficial de ads.txt para subdomínios.

## 6. Privacidade e consentimento

- Configure a mensagem de privacidade (CMP certificada do Google) para as regiões exigidas (EEE, Reino Unido e Suíça) na área de privacidade e mensagens da conta. Um banner autoral não substitui a CMP certificada.
- O site usa consentimento em duas camadas: o aviso autoral é pré-requisito para carregar o código do Google; nas regiões com TCF, a mensagem do Google decide a personalização. A recusa autoral nunca é sobreposta, e a recusa da CMP não é contornada.
- Depois de publicar a mensagem, marque `"consentimentoConfigurado": true`.
- **Atividades escolares (produto 2):** leia `2. Atividades escolares para imprimir/documentação/publicidade-e-público-infantil.md` e configure o tratamento de conteúdo direcionado a crianças conforme a política oficial antes de ativar.

## 7. Políticas e pagamentos

Confira políticas do programa, aprovação do site, dados de pagamento e verificações da conta. Essas etapas são do proprietário.

## 8. Ativar

1. Revise a CSP (`proteções-e-limites-de-segurança.md`): o perfil estrito atual bloqueia o AdSense de propósito. Aplique o perfil com anúncios na hospedagem.
2. Marque `"ativa": true` e rode `npm run construir`.
3. Valide no site publicado: sem escolha, nada carrega; após “Aceitar opcionais”, um único script do AdSense carrega; após “Rejeitar”, nada carrega; revogar recarrega a página sem anúncios; o console não mostra violação de CSP.
4. Não clique nos próprios anúncios nem gere tráfego artificial.

## 9. Desativar ou reverter

Marque `"ativa": false` e rode `npm run construir`. As ferramentas continuam funcionando; os espaços somem sem deixar buracos. Volte a CSP ao perfil sem anúncios.
