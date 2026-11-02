# Dados que o proprietário precisa preencher

Nenhum destes dados foi inventado. Enquanto estiverem vazios, o recurso correspondente fica **desativado de forma segura** e as ferramentas continuam funcionando. Não há backend, portanto **não existe nenhum dado privado** (senha, segredo de sessão, banco) a fornecer.

Cada produto tem o seu arquivo: `N. Nome do produto/configurações/configuração-pública.json`. Tudo nele é **público** (vai para o navegador de qualquer visitante). Depois de preencher, rode `npm run construir` na pasta do produto (ou `npm run construir` na raiz para os seis).

## Campos públicos

| Campo | Finalidade | Arquivo | Efeito quando ausente ou inválido |
|---|---|---|---|
| `site.marca`, `site.marcaDestaque` | Nome exibido e parte colorida do logotipo | configuração de cada produto | Usa a marca provisória (Doce Ofício, Folha Pronta, Ponto e Preço, Mesa Farta, Demão Certa, Dobra & Cola). Verifique conflitos de marca e domínio antes de publicar. |
| `criador.portfólio` | Link “Portfólio” no rodapé | idem | Link não aparece. Aceita somente `https://`. |
| `criador.contato` | Link “Contato” no rodapé e na página Contato | idem | A página Contato informa que o canal ainda está sendo configurado. Aceita `https://` ou `mailto:`. |
| `publicação.endereçoBase` | Endereço final do site (ex.: `https://seudominio.com.br/confeitaria/`), usado em canonical, sitemap e página 404 | idem | Sem `<link rel="canonical">` e sem `sitemap.xml`; `.htaccess` supõe o site na raiz do domínio. |
| `privacidade.contatoDePrivacidade` | Canal para pedidos da LGPD citado na política | idem | A política aponta para o contato geral; se ele também faltar, informa que o canal será publicado. |
| `privacidade.versãoDaPolítica` | Versão exibida e comparada ao consentimento salvo | idem | Padrão `2026-09-14`. Mudar a versão pede nova escolha a todos os visitantes. |
| `apoio.ativo` | Liga o apoio por Pix | idem | `false`: a página Apoiar explica que o apoio ainda não está disponível e nenhum código é gerado. |
| `apoio.chavePix` | Chave Pix que recebe o apoio | idem | Apoio indisponível. Aceita CPF, CNPJ, telefone `+55DDDNÚMERO`, e-mail ou chave aleatória. **Recomendado: chave aleatória**, para não expor telefone ou CPF. A chave fica visível a qualquer visitante. |
| `apoio.nomeDoRecebedor` | Nome no QR Code (até 25 caracteres, acentos removidos automaticamente) | idem | Apoio indisponível. |
| `apoio.cidadeDoRecebedor` | Cidade no QR Code (até 15 caracteres) | idem | Apoio indisponível. |
| `publicidade.ativa` | Liga os anúncios | idem | `false`: nenhum código de publicidade é carregado. |
| `publicidade.identificadorDoPublicador` | `ca-pub-` + 16 dígitos, da conta AdSense | idem | Anúncios permanecem desativados. |
| `publicidade.blocos` | Identificadores numéricos dos blocos, por posição (ex.: `{ "após-resultado": "1234567890" }`) | idem | Espaços de anúncio são removidos da página. |
| `publicidade.consentimentoConfigurado` | Confirma que a mensagem de privacidade/CMP da conta foi configurada | idem | Anúncios permanecem desativados. |
| `publicidade.cmp` | `nenhuma` ou `google` (mensagem de privacidade do Google para EEE, Reino Unido e Suíça) | idem | `nenhuma`. |
| Linha do `ads.txt` | Autorização de venda do inventário | arquivo `ads.txt` na **raiz do domínio** (não na pasta do produto) | Anúncios podem ter receita limitada. Veja `como-conectar-o-adsense.md`. |
| Domínio e hospedagem | Publicação com HTTPS | fora do projeto | Sem publicação. Nenhuma compra foi feita. |

## Exemplo de preenchimento (valores fictícios, não use)

```json
{
  "criador": { "nome": "Anderson", "portfólio": "https://SEU-PORTFOLIO.exemplo", "contato": "mailto:SEU-EMAIL@exemplo.com" },
  "publicação": { "endereçoBase": "https://SEU-DOMINIO.exemplo/confeitaria/" },
  "apoio": { "ativo": true, "chavePix": "SUA-CHAVE-ALEATÓRIA", "nomeDoRecebedor": "Seu Nome", "cidadeDoRecebedor": "Sua Cidade" }
}
```

A validação recusa endereços `javascript:`, `http:` sem TLS, chaves Pix com formato inválido, nomes longos demais e identificadores de anúncio fora do padrão. Os problemas aparecem ao rodar `npm run gerar` ou `npm run construir`.
