# Guia de configuração e publicação — portal GPT

Atualizado em 15/09/2026. **Revisão final em andamento.** Este documento explica o procedimento; não afirma que houve publicação, aprovação publicitária ou validação de pagamento.

## 1. Projeto e pacote corretos

Execute na cópia `versões/GPT/Sites de Renda GPT`. O produto é `portal/`; as seis pastas de sites são legado. Não envie a raiz inteira para a hospedagem.

```powershell
npm install
npm test
npm run build
npm run preview
```

A prévia de produção deve usar `http://127.0.0.1:4481`. Desenvolvimento: `npm run dev`, em `http://127.0.0.1:4480`. Confirme no terminal o endereço efetivamente informado e não encerre outro serviço para liberar uma porta sem verificar sua origem.

O build gera `portal/publicacao/` e um manifesto de arquivos em `portal/manifesto-publicacao.json`. Testes aprovados precisam de registro real da execução. Antes de publicar, confira o relatório final e os dois pareceres; um pacote gerado não prova que os fluxos funcionaram em navegador.

## 2. Configuração pública

Edite **`portal/configurações/publica.json`** antes de reconstruir o pacote. Todo conteúdo desse arquivo pode ser lido por visitantes; nunca coloque senhas ou tokens nele.

| Campo | Preenchimento e comportamento |
|---|---|
| `criador.nome` | Nome público do criador; atualmente Anderson. |
| `criador.portfolio` | URL real do portfólio; vazio enquanto não informado. |
| `criador.contato` | Contato público aceito pela interface; conferir o link renderizado antes de publicar. |
| `publicacao.enderecoBase` | Endereço HTTPS público real, somente quando definido. A ausência mantém a geração de robots com desindexação. |
| `apoio.ativo` | `false` até conferir os dados reais e o fluxo de Pix. |
| `apoio.chave` | Chave pública de recebimento escolhida pelo proprietário. |
| `apoio.nome` | Nome do recebedor conforme o fluxo Pix. |
| `apoio.cidade` | Cidade do recebedor. |
| `publicidade.ativa` | Manter `false`. Não habilita publicidade nas ferramentas. |
| `publicidade.publicador`, `publicidade.bloco`, `publicidade.cmpConfigurada` | Campos reservados; não constituem integração publicitária ativa ou pronta. |

Os nomes acima correspondem ao esquema atual do portal e diferem dos exemplos antigos do prompt Claude. Após qualquer edição, reconstrua e valide a prévia. Não editar apenas o arquivo compilado e perder a mudança no próximo build.

## 3. Conferência do pacote

Abra a prévia e confira busca com acentos, seleção de categorias, abertura das ferramentas, resultados e downloads. Exercite pelo menos uma ferramenta com PDF, uma com imagem, texto, senhas, cálculos, calendário e temporizador. Verifique favoritos/salvos após recarregar e a exclusão de dados locais. Use ferramentas do navegador para inspecionar console e rede.

Confira que fontes, SVG, imagem de abertura e bibliotecas carregam do próprio site. O uso de ferramentas não deve enviar entradas ou resultados a terceiros. Confirme larguras pequenas, teclado e navegação inferior. Inspecione os arquivos gerados, incluindo escala de moldes e acentos de texto, quando aplicável.

O pacote não deve conter `.git`, `node_modules`, testes, segredos, bancos, documentos particulares ou pastas legadas. O manifesto serve para identificar arquivos; não fornece proteção contra cópia do frontend nem substitui auditoria de segurança.

## 4. Hospedagem estática

A publicação externa depende da autorização específica do proprietário e de destino definido. Quando autorizada, copie **o conteúdo de `portal/publicacao/`** para a raiz pública destinada ao portal, preservando nomes, acentos e capitalização dos caminhos. Não copie `portal/` inteiro.

Use HTTPS. O servidor deve servir `.js` e `.mjs` como JavaScript, `.json` como JSON, `.woff2` como fonte e os formatos de imagem/PDF com seus tipos corretos. A configuração Apache `.htaccess` é gerada no pacote; confirme que a hospedagem permite suas diretivas. Se houver Nginx ou outro servidor, aplique configuração equivalente no servidor. A existência do arquivo não comprova que os cabeçalhos foram aplicados.

Confirme na resposta HTTP `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options`. A política deve preservar recursos locais, processamento de arquivos e trabalhadores das bibliotecas sem liberar scripts remotos arbitrários. Não enfraquecer a política para incluir anúncios nas ferramentas.

O fluxo principal usa a entrada do portal. Teste acesso inicial, navegação, recarregamento e uma URL inexistente. Para hospedagem em subpasta, faça validação específica dos caminhos e downloads antes de declarar suporte. `robots.txt` desindexa quando não há endereço configurado, mas não torna arquivos privados. Não publicar informações privadas mesmo com desindexação.

## 5. Pix voluntário

Preencha chave, nome e cidade reais, reconstrua o pacote e confira os dados apresentados. Valide valores sugeridos e livre, centavos, valor do QR, conteúdo Copia e Cola e leitura por decodificador independente. Só depois habilite apoio conforme a configuração e o fluxo validado.

Validação com aplicativo bancário deve conferir o destinatário antes de qualquer pagamento; não é necessário transferir dinheiro para testar o código. Não afirmar pagamento confirmado após copiar o Pix. Publicar a chave torna esse dado público; use a chave de recebimento escolhida pelo proprietário.

## 6. Monetização editorial futura

**Não há anúncios nas ferramentas.** Texto, PDF, imagem e senha podem conter dados sensíveis; scripts publicitários não devem executar no mesmo contexto que os processa. Alterar um booleano não constitui autorização nem implementação de monetização.

Uma etapa futura deve criar páginas editoriais com conteúdo próprio e isolamento de documentos/contextos em relação às ferramentas. Separar apenas visualmente ou mudar o fragmento da URL não cria esse isolamento. O projeto deverá definir armazenamento, política de segurança e navegação para que anúncios não tenham acesso a entradas e resultados.

Antes de qualquer ativação, verificar a documentação oficial vigente do provedor, elegibilidade, domínio, identificação do publicador, `ads.txt`, consentimento aplicável e regras de conteúdo/público. Esses passos dependem de implementação e configuração futuras. Os guias antigos de AdSense pertencem ao legado de seis sites e não autorizam ativar seus scripts no portal atual.

A recusa de publicidade nunca deve bloquear ferramentas; impressões e downloads ficam sem anúncios. Não clicar em anúncios reais para testes nem garantir aprovação ou receita. Manter os campos atuais desligados enquanto essa etapa não existir e não tiver sido validada.

## 7. Após a publicação autorizada

Verifique o endereço público e repita os fluxos principais no pacote hospedado. Registre domínio, data, versão, cabeçalhos observados e limites dos testes. Prévia local, build, publicação e validação em produção são estados diferentes.

Para atualizar, guarde o pacote anterior fora da área pública, reconstrua a partir do código e substitua os arquivos de forma consistente. Em caso de falha, restaure a versão anterior completa e confirme a interface. Não misture bibliotecas ou scripts de versões diferentes. Dados locais do visitante ficam no navegador dele e não são restaurados por substituir arquivos da hospedagem.
