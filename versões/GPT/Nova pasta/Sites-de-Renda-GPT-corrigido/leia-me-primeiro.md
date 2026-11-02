# Leia primeiro — continuação no Codex

O pedido atual é **um portal com todas as 150 ferramentas reunidas, selecionáveis e buscáveis**, seguindo o visual de referência do Manus. Não retomar o plano antigo de seis sites separados como entrega principal.

## Onde trabalhar

Abra no Codex apenas:

```text
C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\versões\GPT\Sites de Renda GPT
```

O código ativo fica em `portal/`. Preserve a pasta original, as outras versões e as seis pastas legadas desta cópia. Não copie novamente a raiz para dentro dela: isso pode incluir a própria pasta de versões recursivamente.

## Instrução para retomar

Envie na sessão com acesso aos arquivos:

> Leia integralmente `prompt-mestre-orquestracao-codex.md`, depois confira o estado real de `portal/` e os pareceres existentes em `documentação/`. Continue a implementação do portal único com 150 ferramentas, busca, categorias e visual Manus. Use os modelos herdados da sessão e agentes reais somente para subtarefas concretas previstas no prompt. Preserve a propriedade exclusiva de arquivos e execute duas críticas independentes antes do aceite. Corrija os achados e valide os fluxos reais, sem declarar conclusão apenas porque compilou. Trabalhe exclusivamente nesta cópia GPT.

Não é necessário trocar o modelo para seguir o prompt. Um texto não altera o modelo da sessão, e nomes comerciais ou IDs não devem ser inventados.

## Prévia e entrega

Na raiz, `npm install` prepara dependências; `npm run dev` abre o servidor em `http://127.0.0.1:4480`. Use `npm test`, `npm run build` e `npm run preview` para testes, pacote e prévia de produção em `http://127.0.0.1:4481`. O pacote publicável é `portal/publicacao/`.

Leia `documentação/guia-publicacao-gpt.md` antes de configurar domínio, contato ou Pix. Anúncios estão ausentes das ferramentas; uma futura monetização editorial exige implementação isolada. Não habilitar publicidade no portal de processamento de dados.

**Estado:** revisão final em andamento em 15/09/2026. Os documentos antigos descrevem seis produtos e resultados anteriores; consulte o README atual e as evidências específicas do portal. A configuração pública incompleta não deve impedir o desenvolvimento, mas tampouco pode ser descrita como produção validada.
