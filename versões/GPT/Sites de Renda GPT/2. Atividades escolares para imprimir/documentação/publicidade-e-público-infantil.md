# Publicidade e público infantil — Folha Pronta

Este documento avalia o tratamento de publicidade do produto 2 (Folha Pronta) para um
conteúdo que, embora preparado por adultos, pode ser manuseado ou visto por crianças
(a folha impressa vai para a mão de uma criança; o PDF pode ser aberto num aparelho
compartilhado). Complementa `documentação/decisão-sobre-cadastro-e-servidor.md` e a
seção 10 de `documentação/arquitetura-e-contratos.md` (publicidade e consentimento),
sem substituí-los.

## 1. Quem é o usuário do site

O Folha Pronta é uma ferramenta de **preparação de material**, não uma atividade
infantil interativa. Quem usa o formulário, escolhe as opções, clica em "Gerar",
"Baixar PDF" ou "Imprimir" e eventualmente vê um anúncio ou um pedido de apoio é o
adulto responsável (professor, responsável, monitor) — nunca a criança, que só entra
em contato com o **resultado impresso ou em PDF**, sem nenhum código, anúncio ou
formulário do site.

## 2. Onde a publicidade pode e não pode aparecer

| Superfície | Publicidade permitida? |
|---|---|
| Formulário de cada gerador (início, ferramentas, operações-matemáticas, tabuada, caça-palavras, caligrafia) | Sim, no máximo um `.espaço-publicitário` por ferramenta, sempre depois do resultado e antes das premissas (regra já herdada do contrato comum). |
| Páginas institucionais (metodologia, sobre, apoiar) | Sim, seguindo a mesma regra. |
| `.área-de-impressão` (prévia que vira a folha impressa) | **Não.** Nenhum bloco de anúncio, nenhum texto de apoio, nenhuma marca d'água comercial. |
| PDF gerado (`gerar-pdf-de-*.js`) | **Não.** Os geradores de PDF deste produto não desenham nenhum anúncio, link de apoio ou marca além do rodapé técnico (semente, quando aplicável). |
| Gabarito (tela, impressão ou PDF) | **Não**, pelas mesmas razões do item acima — o gabarito é conteúdo, não interface do site. |

Essa separação já está implementada no código: `podeCarregarAnúncios` (comum) nunca é
chamado dentro de `.área-de-impressão`, e os quatro geradores de PDF
(`scripts/geração/gerar-pdf-de-operações.js`, `gerar-pdf-de-tabuada.js`,
`gerar-pdf-de-caça-palavras.js`, `gerar-pdf-de-caligrafia.js`) não importam nenhum
módulo de publicidade nem desenham texto de apoio — eles só recebem os dados já
calculados e desenham a folha.

## 3. Recomendação de configuração no AdSense

Antes de ativar `publicidade.ativa` em `configurações/configuração-pública.json` para
este produto específico, o responsável pela publicação deve:

1. **Marcar o conteúdo do site como direcionado a crianças ("tag for child-directed
   treatment")** nas configurações de anúncios do Google (ou, no mínimo, configurar o
   tratamento por página/bloco se o Google oferecer granularidade), já que uma parcela
   relevante do material impresso final é destinada a crianças em idade escolar. Isso
   ativa as restrições do Google para tráfego direcionado a crianças (sem anúncios
   personalizados baseados em interesse, sem certas categorias de anúncio).
2. **Revisar as políticas do Google para sites voltados a famílias/crianças** (Google
   Publisher Policies e Family Policies) antes de ativar qualquer bloco de anúncio,
   e não apenas confiar num aviso de "somente adultos" no rodapé — esse aviso **não
   substitui** a configuração real de tratamento infantil, que é a exigência deste
   item do prompt-mestre (seção 11: "não contornar isso com um aviso 'somente
   adultos'").
3. Manter o consentimento de publicidade **desativado por padrão** (já é o
   comportamento herdado do módulo comum de consentimento) e nunca carregar anúncios
   antes da escolha do adulto que está no formulário.
4. Revisar periodicamente os blocos de anúncio ativos (`configurações.publicidade.blocos`)
   para confirmar que nenhum deles usa formatos enganosos (anúncios que imitam botões
   do site, como "Baixar", "Gerar" ou "Continuar") — isso é proibido em qualquer um
   dos seis produtos, mas é especialmente sensível aqui pelo público final da folha.

## 4. O que este documento não cobre

Esta nota trata apenas do produto 2. Não determina a política de publicidade dos
demais produtos, não é um parecer jurídico e não substitui a leitura das políticas
vigentes do Google Ads/AdSense e, se aplicável, da legislação de proteção de dados de
crianças (no Brasil, a LGPD trata dados de crianças e adolescentes com regras
específicas de consentimento). Antes de ativar publicidade neste produto, o
responsável deve reconfirmar essas políticas na fonte oficial, pois elas mudam com o
tempo.
