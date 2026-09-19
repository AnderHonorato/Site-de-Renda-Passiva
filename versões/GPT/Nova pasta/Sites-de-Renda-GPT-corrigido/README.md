# Portal Doce Ofício — 150 ferramentas

Projeto ativo: **um único site**, com 150 ferramentas reunidas em 15 categorias, navegação por categoria e busca. A implementação está em `portal/`, nesta cópia GPT. A referência visual é o material do Manus: composição editorial, fundo creme, tipografia expressiva, acentos terrosos e formas orgânicas.

**Estado em 15/09/2026:** implementação e revisão final em andamento. Este README não certifica aprovação dos testes, dos críticos ou da produção. As evidências efetivamente executadas devem constar no relatório final e nos pareceres da pasta `documentação/`.

## Pasta de trabalho

```text
C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\versões\GPT\Sites de Renda GPT
```

Trabalhar exclusivamente nessa cópia. As seis pastas de produtos, o prompt Claude e os documentos anteriores foram preservados como legado. O plano antigo de seis sites independentes foi substituído pelo portal único; declarações de testes nesses documentos são históricas e não validam o portal.

## Executar

Use Node.js com npm. Na raiz desta cópia:

```powershell
npm install
npm run dev
```

Abra `http://127.0.0.1:4480`. Os comandos da raiz encaminham para o portal:

```powershell
npm test
npm run build
npm run preview
```

A prévia do pacote usa `http://127.0.0.1:4481`. O pacote estático é gerado em `portal/publicacao/`. Use HTTP: abrir `index.html` por duplo clique não é o fluxo suportado para módulos e arquivos locais. Os servidores precisam continuar em execução para manter a prévia acessível.

## Organização

- `portal/scripts/catalogo.js`: reúne os três grupos de ferramentas.
- `portal/scripts/categorias.js`: nomes, cores e ícones das 15 categorias.
- `portal/scripts/ferramentas/`: implementações por ferramenta.
- `portal/testes/`: testes automatizados do portal.
- `portal/recursos/`: fontes, SVG, bibliotecas e imagem de abertura locais.
- `portal/configurações/publica.json`: identidade, endereço público e apoio.
- `documentação/catalogo-150-gpt.md`: catálogo extraído do código e suas metodologias.
- `documentação/guia-publicacao-gpt.md`: configuração e publicação estática.
- `prompt-mestre-orquestracao-codex.md`: especificação de continuação no Codex.
- `README-legado-seis-sites.md`: README anterior preservado.

## Privacidade e monetização

As ferramentas processam dados no navegador, sem cadastro ou API paga obrigatória. Arquivos enviados às ferramentas são processados localmente. Preferências e itens salvos usam o armazenamento do dispositivo conforme a interface; não há sincronização em nuvem. Uma cópia local não substitui backup do usuário.

O apoio Pix começa desligado, aguardando dados reais. **As ferramentas não carregam anúncios**, inclusive as que manipulam texto, PDF ou senhas. Os campos publicitários presentes na configuração não são um botão para ativar anúncios nelas. Monetização futura deve usar páginas editoriais isoladas, com conteúdo próprio e sem acesso aos dados das ferramentas; essa integração não está ativada.

O projeto inclui fontes e ícones SVG locais licenciados e uma imagem de abertura gerada para o portal. Não usa emojis como substitutos dos ícones do produto. Publicar, conectar anúncios e validar pagamentos reais são etapas distintas da implementação local.
