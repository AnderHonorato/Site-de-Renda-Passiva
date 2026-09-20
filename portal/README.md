# Portal de Ferramentas — pasta do site

Esta pasta **é o site**. Publicar o portal é publicar o conteúdo daqui na raiz do domínio.

A documentação do projeto inteiro está no [README da raiz](../README.md), com a lista de conferência e o que ainda falta. Este arquivo cobre só o que importa para mexer nesta pasta.

## Comandos

Gerar o HTML a partir do catálogo:

```bash
npm run gerar
```

Rodar os testes automáticos:

```bash
npm run testar
```

Verificar a estrutura (links, módulos órfãos, títulos repetidos, sobras de desenvolvimento):

```bash
npm run verificar
```

Os três de uma vez:

```bash
npm run conferir
```

Abrir o site em `http://127.0.0.1:4400/`:

```bash
npm run servir
```

Regerar a matriz de ferramentas da documentação:

```bash
node ferramentas/gerar-documentos.mjs
```

Não há dependências: `npm install` não baixa nada. As páginas usam módulos JavaScript, então abra sempre por `http://`, nunca com dois cliques no arquivo.

## Como adicionar uma ferramenta

1. **Registre no catálogo**, em `dados/catálogo/<arquivo da categoria>.js`, com `status: 'planejada'`. O catálogo é a fonte de verdade: nada aparece na interface sem estar nele.
2. **Escreva o cálculo puro** em `scripts/cálculos/`, sem tocar em DOM. É o que os testes exercitam.
3. **Escreva o módulo da ferramenta** em `scripts/ferramentas/<slug>.js`, exportando `{ instruções, montar(raiz, ferramenta) }`. Use `montarFerramenta` de `scripts/núcleo/montador.js`: ele entrega validação, erro no campo certo, estado de carregamento, tratamento de exceção e os botões de exportação.
4. **Escreva os testes** em `testes/`.
5. **Troque o status para `'pronta'`** e rode `npm run conferir`.

O status só vira `'pronta'` quando a ferramenta abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste. `verificar.mjs` recusa ferramenta pronta sem módulo e módulo sem entrada no catálogo.

## Regras que o código precisa respeitar

- **Nada de atributo `style` nem `<script>` embutido no HTML.** O site é servido com política de segurança estrita; os dois são bloqueados. Espaçamento pontual usa as classes utilitárias de `estilos/componentes.css`.
- **Dinheiro circula em centavos inteiros** dentro dos cálculos. A conversão fica só em `emCentavos` / `emReais`.
- **Datas são data civil**, sem hora e sem fuso. Use os auxiliares de `scripts/cálculos/tempo.js`.
- **Toda recusa de regra de negócio precisa chegar ao usuário.** Use `comCampo(campo, () => ...)` para que a mensagem apareça no campo culpado em vez de no console.
- **Texto de terceiro nunca entra em `innerHTML` sem `escapar()`.**
- **CSV exportado passa por `neutralizarFórmula`**, senão a planilha executa o conteúdo ao abrir.

## Estrutura

```text
index.html, ferramentas.html, …   páginas geradas — não edite à mão
f/<slug>/index.html               uma página por ferramenta pronta — gerada
dados/                            catálogo e categorias (fonte de verdade)
scripts/
  núcleo/                         montador, busca, armazenamento, ícones, listas
  cálculos/                       funções puras, sem DOM, cobertas por teste
  ferramentas/                    um módulo por ferramenta
    auxiliares/                   apoio de ferramenta, sem entrada no catálogo
  comum/                          PDF, planilha, QR e formatação reaproveitados
  páginas/                        comportamento de cada página
estilos/                          núcleo, fontes, layout, componentes, páginas
ferramentas/                      gerar, verificar, servir, gerar documentos
testes/                           testes automáticos
```
