# Sites de Renda Passiva — seis ferramentas gratuitas

Seis sites estáticos, independentes e gratuitos, criados por **Anderson**. Tudo roda no navegador: não há cadastro nem banco de dados. Os sites estão preparados para apoio voluntário por Pix e anúncios do Google AdSense, ambos **desativados** até você preencher os dados reais.

| Pasta | Marca provisória | Porta local |
|---|---|---|
| `1. Ferramentas para confeitaria` | Doce Ofício | 4311 |
| `2. Atividades escolares para imprimir` | Folha Pronta | 4312 |
| `3. Ferramentas para crochê e artesanato` | Ponto e Preço | 4313 |
| `4. Planejamento de churrasco e festas` | Mesa Farta | 4314 |
| `5. Calculadoras de pintura e reforma` | Demão Certa | 4315 |
| `6. Moldes de caixas e embalagens` | Dobra & Cola | 4316 |

> **Situação:** em construção. A lista de conferência abaixo diz exatamente o que já está pronto e o que falta. Este arquivo será atualizado ao fim de cada etapa.

## Lista de conferência

Legenda: `[x]` feito e verificado · `[~]` em andamento · `[ ]` não feito.

### Base comum (vale para os seis sites)
- [x] Arquitetura estática documentada (`documentação/arquitetura-e-contratos.md`, `decisão-sobre-cadastro-e-servidor.md`)
- [x] Visual baseado no seu modelo (`modelo/`): fundo creme, Caprasimo, Figtree, logotipo em Caveat, espiral, botões em pílula, paleta própria por site e por página (contraste ≥ 4,5:1 verificado)
- [x] Navegação inferior de aplicativo no celular (Início, Ferramentas, Salvos, Apoiar, Mais) e cabeçalho completo no computador
- [x] Aviso de privacidade na primeira visita (aceitar, rejeitar, personalizar, revogar)
- [x] Apoio por Pix: 7 valores + valor livre, revisão, QR Code e Copia e Cola (CRC conferido com o manual do Banco Central; QR lido por leitor independente)
- [x] Anúncios AdSense preparados e desligados (só carregam com configuração completa e aceite)
- [x] Salvar no aparelho, página Salvos, exportar e importar cópia (com proteção contra arquivo malicioso)
- [x] Orçamentos: PDF com o visual do site, planilha Excel (.xlsx), impressão e link para o cliente ver valor e nome de quem gerou
- [x] Geração de PDF, fontes e ícones locais (sem serviços externos)
- [x] Ferramentas de desenvolvimento: gerar, servir, testar, verificar, construir pacote
- [x] 39 testes automáticos dos módulos comuns passando
- [x] Documentos: dados a preencher, convenções, licenças, segurança, guia do AdSense, exemplo Nginx

### Produtos
- [x] 1. Confeitaria — 9 ferramentas (custo da receita, preço de venda, ajuste de quantidade, lista de compras, orçamento com PDF/Excel/link, preço por unidade, conversor de formas, rendimento com perdas, ficha técnica); 49 testes; verificação limpa
- [x] 2. Atividades escolares — operações, tabuada, caça-palavras e caligrafia com prévia, impressão, PDF e gabarito separado; 45 testes; testado no navegador após correção de um defeito comum
- [ ] 2b. Atividades escolares, segunda prioridade — bingo, papel quadriculado, flashcards e planejador de estudos (não feitos)
- [x] 3. Crochê e artesanato — 8 ferramentas (custo do material, valor da hora, preço da peça, desconto, encomendas, orçamento com PDF/Excel/link, amostra de pontos, controle de materiais); 30 testes; testado no navegador
- [~] 4. Churrasco e festas — em construção
- [~] 5. Pintura e reforma — em construção
- [~] 6. Moldes de caixas e embalagens — em construção

### Validação e entrega
- [ ] Parecer do crítico de segurança e correção
- [ ] Parecer do crítico de experiência e desempenho
- [ ] Correções e reteste
- [ ] Relatório final do orquestrador
- [ ] Pacotes de publicação dos seis sites
- [ ] Commit e envio ao GitHub (aguarda sua autorização)

### Não incluído (decisão registrada)
- Orçamento doméstico e custo de combustível do exemplo do Manus: pertencem às categorias 14 e 15 do catálogo (sites futuros), fora dos seis produtos.

## Requisitos

- Node.js 20 ou mais recente (testado com 22.14) e npm.
- Nenhuma dependência paga. As dependências de desenvolvimento (fontes, ícones, QR e leitor de QR para testes) são gratuitas e têm versão fixada.

## Comandos

Na primeira vez, na raiz do projeto:

```bash
npm install
```

```bash
npm run preparar
```

```bash
npm run sincronizar
```

Gerar, testar e verificar os seis sites de uma vez:

```bash
npm run gerar
```

```bash
npm run testar
```

```bash
npm run verificar
```

Criar os pacotes publicáveis (pasta `publicação/` dentro de cada site):

```bash
npm run construir
```

Trabalhar em um site só (exemplo: confeitaria):

```bash
cd "1. Ferramentas para confeitaria"
```

```bash
npm run servir
```

Abra `http://127.0.0.1:4311/`. Para ver exatamente o pacote que será publicado:

```bash
npm run construir && npm run visualizar
```

As páginas usam módulos JavaScript: abra sempre por `http://`, não com dois cliques no arquivo.

## O que você precisa fazer

1. **Preencher os dados reais** em `N. …/configurações/configuração-pública.json` de cada site: portfólio, contato, endereço de publicação, chave Pix (recomendado: chave aleatória), nome e cidade do recebedor. Tabela completa em `documentação/dados-que-o-proprietário-precisa-preencher.md`.
2. **Conferir as marcas provisórias** e verificar se há conflito de marca ou domínio antes de publicar.
3. **Escolher domínio e hospedagem com HTTPS**. O ideal é um subdomínio por site; ver `documentação/proteções-e-limites-de-segurança.md`.
4. Rodar `npm run construir` e enviar a pasta `publicação/` de cada site para a hospedagem. O `.htaccess` gerado aplica os cabeçalhos de segurança no Apache; há exemplo para Nginx em `documentação/hospedagem/`.
5. **AdSense (opcional):** seguir `documentação/como-conectar-o-adsense.md` (conta, verificação, `ads.txt` na raiz do domínio, mensagem de privacidade/CMP e perfil de CSP com anúncios).
6. **Testar num celular de verdade** e **fazer um Pix de teste** com o seu banco, conferindo nome e valor.

## Estrutura

```text
compartilhado/          código comum (origem); copiado para cada site por "npm run sincronizar"
documentação/           contratos, decisões, segurança, guias e relatórios
N. Nome do site/        cada site é independente e pode ser publicado sozinho
  conteúdo/             textos das páginas (fonte)
  scripts/              JavaScript modular (uma função por arquivo)
  estilos/              CSS (comum + do site)
  configurações/        configuração pública, cores e ícones
  testes/               testes automáticos do site
  publicação/           pacote pronto para enviar (gerado)
modelo/                 modelo visual fornecido
manus modelos/          exemplo de ferramentas usado como referência
```

Licença: © 2026 Anderson, todos os direitos reservados. Componentes de terceiros mantêm suas licenças (`documentação/licenças-de-terceiros.md`).
