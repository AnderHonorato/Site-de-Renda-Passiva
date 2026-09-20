# Ferramentas do Ander — portal único de ferramentas

Um site só, com muitas ferramentas úteis. Tudo roda no navegador: sem cadastro, sem banco de dados e sem enviar seus arquivos para lugar nenhum. Criado por **Anderson**.

O portal fica em [`portal/`](portal/). As seis pastas numeradas na raiz são a versão anterior do projeto (seis sites separados): elas continuam funcionando e servem como origem da lógica já testada que está sendo trazida para o portal. **Elas não são mais o produto final.**

> **Situação:** 150 ferramentas no catálogo, **21 prontas para usar** e 129 planejadas. A lista de conferência abaixo diz exatamente o que está feito e o que falta. Nada aparece como pronto sem abrir, validar, calcular, tratar erro, exportar o que promete e ter teste automático.

## Lista de conferência

Legenda: `[x]` feito e verificado · `[~]` parcial · `[ ]` não feito.

### Fundação do portal
- [x] Auditoria do projeto antes de alterar (`documentação/auditoria-projeto.md`)
- [x] Checkpoint em Git e branch de trabalho (`portal/ferramentas-v2`)
- [x] Identidade visual própria: paleta com quatro níveis de superfície, tema claro e escuro, tipografia local
- [x] 50 ícones SVG autorais em grade única (sem biblioteca de terceiros, sem emoji na interface)
- [x] Divisórias onduladas e animações só onde dão retorno, respeitando `prefers-reduced-motion`
- [x] **Densidade corrigida**: linha de ferramenta de ~54 px no lugar do cartão de 210 px; primeira dobra com busca, categorias e acesso rápido sem rolar
- [x] Navegação inferior no celular e cabeçalho completo no computador
- [x] Catálogo de 150 ferramentas como fonte única de verdade (busca, menus, páginas, testes e documentação saem dele)
- [x] Busca por intenção: "preciso saber quanto cobrar" chega em Preço de venda
- [x] Favoritos, histórico recente e exportação/importação de cópia, tudo no próprio navegador
- [x] Páginas geradas a partir de um modelo único (`portal/ferramentas/gerar.mjs`)
- [x] Verificação estrutural automática: link quebrado, ícone inexistente, título repetido, módulo órfão, sobra de desenvolvimento
- [x] 51 testes automáticos passando
- [x] Sem atributo `style` e sem script embutido: o site passa em política de segurança estrita
- [x] PWA básico: manifesto, ícone e atalhos

### Ferramentas prontas (21)
- [x] **Dinheiro:** porcentagem, preço de venda, juros, parcelamento, divisão de contas, preço por unidade, número por extenso
- [x] **Vendas e documentos:** orçamento com PDF, planilha e link para o cliente; recibo em PDF com valor por extenso
- [x] **Cálculo e datas:** regra de três, conversor de unidades (8 grandezas), calculadora de datas, calculadora de horas
- [x] **Dados:** limpeza de planilha, CSV ↔ JSON
- [x] **Técnicas:** JSON (validar/formatar), Base64, QR Code, gerador de senhas, validador de CPF e CNPJ
- [x] **Outras:** sorteio (números, nomes e times)

### Documentação
- [x] Auditoria do projeto
- [x] Matriz das 150 ferramentas, gerada do catálogo (`documentação/catalogo-ferramentas.md`)
- [x] Registro de decisões com motivo e alternativas descartadas (`documentação/decisoes-projeto.md`)
- [x] "Como usar", exemplo real, limites e perguntas frequentes dentro de cada ferramenta pronta
- [x] Privacidade e termos escritos para o que o site realmente faz

### Validação e entrega
- [~] Parecer do crítico técnico e de segurança — em execução
- [~] Parecer do crítico de experiência e produto — em execução
- [ ] Correções dos pareceres e reteste
- [ ] Relatório final
- [ ] Envio ao GitHub (aguarda sua autorização)

### Ainda não feito (e por quê)
- [ ] **129 ferramentas planejadas.** Estão no catálogo com ficha completa. 28 delas têm a lógica pronta nos seis sites antigos e só precisam ser portadas; as outras serão escritas.
- [ ] **Conta, login e favoritos sincronizados.** Exige servidor e banco. O portal hoje é estático; o esqueleto falso de banco que existia foi removido em vez de mantido como enfeite.
- [ ] **Planos pagos e bloqueio de recursos.** Sem backend, qualquer bloqueio seria burlável pelo navegador — e o prompt proíbe fingir que funciona.
- [ ] **Painel administrativo, notificações, mensagens, banners e popup.** Dependem de conta e servidor.
- [ ] **Chat flutuante.** Depende de serviço externo com custo.
- [ ] **Aplicativo Android (APK).** O portal já é instalável como PWA; o empacotamento Android ainda não foi feito.
- [ ] **Ferramentas de PDF e imagem que exigem processamento pesado.** Estão marcadas no catálogo com o plano e o local de processamento corretos.

## Requisitos

- Node.js 20 ou mais recente (testado com 22.14) e npm.
- Nenhuma dependência paga. As de desenvolvimento (fontes, QR e leitor de QR para teste) são gratuitas e com versão fixada.

## Comandos

Na primeira vez, na raiz do projeto:

```bash
npm install
```

Entre na pasta do portal:

```bash
cd portal
```

Gerar as páginas a partir do catálogo:

```bash
npm run gerar
```

Rodar os testes automáticos:

```bash
npm run testar
```

Verificar a estrutura (links, módulos, títulos, sobras):

```bash
npm run verificar
```

Os três de uma vez:

```bash
npm run conferir
```

Abrir o site localmente em `http://127.0.0.1:4400/`:

```bash
npm run servir
```

Regerar a matriz de ferramentas da documentação:

```bash
node ferramentas/gerar-documentos.mjs
```

As páginas usam módulos JavaScript: abra sempre por `http://`, nunca com dois cliques no arquivo.

### Os seis sites antigos

Continuam funcionando com os comandos da raiz (`npm run gerar`, `testar`, `verificar`, `construir`). Eles não fazem parte do portal e não precisam ser publicados.

Para abrir um deles no navegador, entre na pasta e rode `npm run servir`. As portas são 4311 para confeitaria, 4312 para atividades escolares, 4313 para crochê e artesanato, 4314 para churrasco e festas, 4315 para pintura e reforma e 4316 para caixas e embalagens. O `npm run visualizar` serve a pasta `publicação/` nas portas 4321 a 4326, para conferir o pacote antes de enviar.

Só o portal está em `.claude/launch.json`, porque o painel de pré-visualização sobe todas as entradas do arquivo de uma vez e aceita no máximo cinco servidores.

## O que você precisa fazer

1. **Escolher o nome definitivo.** "Ferramentas do Ander" é provisório. Antes de publicar, confira se não há conflito de marca ou de domínio.
2. **Escolher domínio e hospedagem com HTTPS.** O portal é estático: qualquer hospedagem de arquivos serve, inclusive GitHub Pages. Publique o conteúdo de `portal/` na raiz do site.
3. **Preencher o endereço real** em `portal/ferramentas/gerar.mjs` (função `sitemap`, hoje com `https://exemplo.invalid/portal/`) e regerar.
4. **Preencher o contato** citado na página de privacidade, assim que houver um endereço de e-mail para isso.
5. **Testar num celular de verdade.** A verificação até aqui foi feita em emulação de 375 × 812 e 390 × 844, não em aparelho físico.
6. **Decidir sobre as 129 planejadas.** Elas podem ser implementadas em ondas; a ordem sugerida é começar pelas 28 que só precisam ser portadas dos seis sites antigos.
7. **Autorizar o envio ao GitHub.** Os commits estão no branch `portal/ferramentas-v2` e nada foi enviado ao repositório remoto.

## Estrutura

```text
portal/                  o site — é isto que se publica
  index.html             início (gerado)
  ferramentas.html       catálogo completo (gerado)
  f/<slug>/index.html    uma página por ferramenta pronta (gerado)
  dados/                 catálogo e categorias — fonte única de verdade
  scripts/
    núcleo/              montador, busca, armazenamento, ícones, interface
    cálculos/            funções puras e testáveis, sem interface
    ferramentas/         um módulo por ferramenta
    comum/               PDF, planilha, QR e formatação reaproveitados
    páginas/             comportamento de cada página
  estilos/               núcleo, layout, componentes e páginas
  ferramentas/           gerar, verificar, servir e gerar documentos
  testes/                testes automáticos
documentação/            auditoria, matriz, decisões, segurança e relatórios
N. Nome do site/         versão anterior: seis sites, origem da lógica a portar
compartilhado/           código comum dos seis sites antigos
modelo/                  modelo visual fornecido
manus modelos/           exemplo de ferramentas usado como referência
versões/                 versões históricas, sem edição
```

Licença: © 2026 Anderson, todos os direitos reservados. Componentes de terceiros mantêm suas licenças (`documentação/licenças-de-terceiros.md`).
