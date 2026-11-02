# Prompt mestre de execução no Codex — portal com 150 ferramentas

Versão 2.0, 15/09/2026. Esta é a especificação atual de trabalho. Substitui o plano Claude de seis sites independentes para esta cópia. Leia integralmente e execute sobre o estado real, sem recomeçar trabalho já válido.

## 1. Missão e fronteira absoluta

Continue e conclua **um único portal público com 150 ferramentas**, distribuídas em 15 categorias com 10 ferramentas cada. O visitante deve encontrar ferramentas pela busca ou selecionar a categoria e abrir a ferramenta no mesmo site. Não entregar apenas catálogo, telas de demonstração ou 150 nomes que levem ao mesmo cálculo.

A única raiz autorizada para escrita é:

```text
C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\versões\GPT\Sites de Renda GPT
```

O produto ativo está em `portal/`. As seis pastas antigas são legado preservado; não voltar a desenvolvê-las como produtos principais. Não escrever na pasta original, em outras versões, no repositório pai, em bancos, caches, configurações ou processos de outros projetos. Nunca copiar a própria árvore `versões/` recursivamente para dentro desta cópia. Verifique os caminhos absolutos antes de mover ou remover arquivos.

O usuário já autorizou implementação, dependências locais necessárias, correções e validação nesta cópia. Prossiga em escolhas rotineiras sem pedir aprovação repetida. Não publicar externamente, comprar serviços, cadastrar contas, enviar mensagens, fazer pagamentos ou transferir dados a terceiros como efeito implícito desse trabalho. Prepare o pacote e as instruções até o ponto em que uma publicação autorizada seja concreta e revisável.

## 2. Leitura conforme o estado encontrado

Primeiro leia as instruções locais aplicáveis e `README.md`, `portal/CONTRATO.md`, `portal/package.json`, o catálogo e os pareceres existentes. Confira o estado de Git sem adotar o repositório pai como se fosse desta cópia. Consulte os registros de execução para identificar o que já foi feito; documentos do legado não são evidência de validação do portal.

Inspecione a referência Manus disponível na cópia e o código atual antes de propor arquitetura ou alterar o visual. Leia módulos relacionados à tarefa, contratos e testes relevantes. Não desperdice execução lendo todas as bibliotecas empacotadas ou reescrevendo módulos funcionais. Se houver arquivo local ausente, confirme no inventário e registre a limitação, sem inventar seu conteúdo.

A arquitetura vigente é estática: HTML, CSS, módulos JavaScript e recursos locais. Mantenha processamento no navegador, sem login, banco, API paga ou backend oculto. Não introduzir framework ou servidor de aplicação apenas para gerar PDF, QR, imagens ou guardar preferências. Se encontrar dependência desnecessária, documente e remova somente após verificar usos reais.

## 3. Modelo e agentes reais

Use o modelo herdado da sessão para o orquestrador e para os subagentes. Não invente IDs, não prometa usar um modelo diferente e não interrompa a tarefa para pedir troca de modelo. Registre os recursos efetivamente disponíveis; quando o modelo não estiver exposto, informe essa limitação em vez de adivinhar.

Este prompt pede delegação real para subtarefas concretas independentes e **duas críticas independentes**. Respeite os limites reais de concorrência. Cada delegação deve conter objetivo delimitado, caminho absoluto permitido, arquivos exclusivos, contratos, critérios de aceite, dependências e evidências esperadas. Um arquivo tem apenas um escritor por vez. Não delegar uma tarefa apenas para encenar trabalho de equipe; o orquestrador precisa ter trabalho útil próprio enquanto ela ocorre.

Papéis em ondas, sem exigir todos simultaneamente:

- Orquestrador: contratos, recursos e dependências comuns, integração, interface principal, revisão e evidências finais.
- Executores por grupo de ferramentas: cálculos/geração, validação, metodologia e testes apenas em arquivos atribuídos.
- Documentação: prompt, catálogo e guia coerentes com o código; não certifica testes alheios sem evidência.
- Crítico de correção e segurança: instância distinta dos autores auditados; lê o código integrado e reproduz cálculos, entradas inválidas, armazenamento, SVG, downloads, Pix e limites de arquivos.
- Crítico de experiência e desempenho: outra instância, independente da primeira; examina o portal integrado, navegação, descoberta, uso real em navegador, impressão, acessibilidade e carregamento.

Cada crítico produz o primeiro parecer antes de ler o do outro. Não simular independência com troca de papel numa mesma resposta. A primeira revisão não deve alterar código de produção. Achados precisam de arquivo, reprodução, consequência e gravidade. O orquestrador integra correções e retesta os caminhos afetados. Se o ambiente não permitir agentes reais, faça o trabalho possível e declare a revisão independente pendente; não afirme que ocorreu.

## 4. Escopo funcional e catálogo

Categorias obrigatórias, cada uma com exatamente dez ferramentas:

1. Confeitaria.
2. Educação.
3. Artesanato.
4. Festas.
5. Reforma.
6. Embalagens.
7. Texto e escrita.
8. Imagens.
9. PDF e documentos.
10. Datas e tempo.
11. Matemática e medidas.
12. Vendas e negócios.
13. Ferramentas digitais.
14. Casa e economia.
15. Viagens e deslocamentos.

A lista implementada é definida em `portal/scripts/catalogo.js` e nos módulos por ferramenta. `documentação/catalogo-150-gpt.md` deve ser regenerado dessas definições, trazendo título, identificador e metodologia. Preserve o conteúdo útil dos 120 itens do catálogo de referência e as duas adições úteis por categoria; não inflar contagem por variantes numéricas ou nomes repetidos.

Cada ferramenta deve fornecer título, descrição, categoria, identificador único, campos rotulados, exemplos úteis, execução real, resultado legível e metodologia específica. Exportação ou impressão deve produzir conteúdo utilizável quando fizer parte da função. Ferramentas de imagens e PDFs precisam processar arquivos reais no navegador; não basta retornar nome, tamanho ou mensagem de sucesso.

Respeite o contrato existente de entradas e saídas. Valide vazio, número não finito, limites, unidades incompatíveis, datas inexistentes, arquivos incorretos e cenários impossíveis. Números brasileiros com vírgula devem funcionar. Explique arredondamentos, estimativas e limites perto do resultado. Não apresentar estimativa como recomendação profissional ou promessa de ganho.

Exemplos independentes para conferência: custo R$ 80 com margem sobre venda de 30% equivale a R$ 114,2857 antes de arredondamento; 25 g de novelo de 100 g a R$ 20 custam R$ 5; piso 20 m² com 10% de recorte e caixa de 2,2 m² pede dez caixas. Margem e acréscimo sobre custo são diferentes. Volume e massa não são intercambiáveis sem densidade; a mesma regra vale para peso e metragem de fio.

Material escolar deve ter respostas e gabaritos coerentes. Molde deve preservar medidas e informar escala e calibração; não reduzir silenciosamente para caber no papel. Operações de calendário devem declarar a convenção relevante. Geradores de senha devem usar aleatoriedade criptográfica e não salvar o resultado automaticamente. Arquivos muito grandes precisam de limites e erros claros, evitando travar a aba.

## 5. Descoberta, interface e visual Manus

Faça a página inicial, busca, categorias, favoritos/salvos, detalhes da ferramenta, apoio e informações institucionais funcionarem como partes de um portal consistente. A busca deve lidar com maiúsculas/minúsculas e acentos, ter mensagem de nenhum resultado e permitir limpar filtros. Categoria, busca e navegação precisam preservar estado previsível.

Siga a direção visual de referência: fundo creme, composição editorial, tipografia expressiva, cores terrosas e suaves, bordas curvas, formas orgânicas e hierarquia clara. Evite painel administrativo genérico, neon, efeitos futuristas e cartões indistintos em toda a página. Preserve a referência sem copiar textos ou ativos protegidos sem licença.

Use fontes locais e ícones SVG próprios ou de biblioteca licenciada local, com estilo consistente. Não usar emoji, símbolos Unicode ou ícones de sistema como substitutos do desenho da interface. A imagem de abertura gerada pertence aos recursos do portal; novas imagens só devem ser criadas quando ajudarem a função ou a compreensão. Não é necessário produzir 150 fotografias decorativas. Conserve as licenças das fontes, ícones e bibliotecas.

No celular, navegação inferior clara e até cinco destinos reais, áreas de toque de pelo menos 44 pixels CSS, campos legíveis, safe area, ação acessível e nenhum painel cobrindo a navegação. No computador, cabeçalho adequado e largura de leitura controlada. Teste 320, 360, 390, 768, 1024 e 1440 pixels, incluindo paisagem curta. Distinguir emulação de aparelho físico.

Teclado, foco visível, rótulos, ordem de títulos e mensagens devem funcionar. Diálogos personalizados precisam de foco inicial, Escape e retorno de foco; não usar `alert`, `confirm` ou `prompt` para o fluxo do produto. Respeite movimento reduzido e evite animações que bloqueiem digitação. Estabeleça estados vazios, erro, carregamento e sucesso sem mensagens falsas de progresso.

## 6. Privacidade, conteúdo sensível e monetização

As ferramentas processam localmente texto, documentos, imagens, dados financeiros informados e senhas. **Nenhum script publicitário, analytics, pixel ou conteúdo remoto deve carregar no contexto das ferramentas.** Isso continua verdadeiro mesmo que alguém edite campos publicitários em `portal/configurações/publica.json`.

A publicidade futura deve ficar em páginas editoriais separadas, com conteúdo próprio e isolamento efetivo dos dados de ferramentas. Não considerar uma rota de hash no mesmo documento como isolamento suficiente. Planeje documentos/contextos separados, política de segurança adequada e nenhum acesso a entradas, resultados, armazenamento ou URLs sensíveis. Essa monetização não está ativada: não anunciar “AdSense pronto” nem aprovação, receita ou integração completa.

Preferências de privacidade devem descrever somente armazenamento e finalidades reais. Rejeição não bloqueia ferramentas. Permita revisar a escolha e apagar dados locais. Não salvar automaticamente senhas, arquivos ou documentos pessoais; quando houver salvamento solicitado, explique seu alcance e valide importação/exportação sem executar conteúdo. Não incluir entradas do visitante em URL pública ou logs.

O apoio é voluntário e desligado por padrão. Ao configurar Pix, valide campos, valores e centavos, confirme recebedor e valor antes de copiar e gerar QR. Teste CRC e decodificação com leitor independente sem transferir dinheiro. Copiar um código não confirma pagamento. Dados ausentes devem manter o fluxo indisponível com orientação clara, sem recebedor inventado.

## 7. Segurança e organização do código

Separe HTML, CSS, configuração, implementação, testes e recursos. Funções com lógica relevante devem ter responsabilidade clara e arquivos adequados; não duplicar implementações de forma a dificultar correção. Preserve APIs e nomes técnicos oficiais. Textos autorais devem estar em português brasileiro correto; convenções já usadas em rotas e identificadores podem permanecer para compatibilidade, sem renomeação indiscriminada.

Renderize entradas como texto. SVG gerado deve escapar dados do usuário; não aceitar SVG arbitrário ativo como se fosse seguro. Valide formatos, tamanho e quantidade de arquivos; libere URLs temporárias e recursos. Bibliotecas de PDF/QR ficam locais e carregam quando necessárias. Revise dependências sem atualizar majoritárias cegamente.

O pacote público não inclui segredos, `.git`, testes, dependências de desenvolvimento ou arquivos de visitantes. Confira tipos MIME, rotas inexistentes, política de segurança e referências relativas. Minificação e hashes não impedem clonagem: frontend pode ser copiado. Não bloquear seleção, botão direito ou acessibilidade para simular proteção.

## 8. Execução, publicação e dados pendentes

Na raiz, os comandos de trabalho são `npm run dev`, `npm test`, `npm run build` e `npm run preview`. Desenvolvimento usa 4480; prévia de produção usa 4481. Confirme portas antes de iniciar e não encerre processos de outros projetos. Use HTTP/HTTPS, não `file://`.

O build gera `portal/publicacao/`. Esse é o pacote do portal, independente das seis pastas legadas e da pasta original. Valide a cópia publicável em HTTP antes da entrega. O endereço público, contato, portfólio e Pix ficam em `portal/configurações/publica.json`, com campos ausentes seguros. Não colocar credenciais nesse arquivo público.

Documente hospedagem na raiz de domínio e caminhos relativos; só alegar suporte a subpasta após testar. Não garantir aplicação de cabeçalhos porque um arquivo de exemplo foi criado. Verifique-os na hospedagem real quando houver publicação autorizada. Preserve desindexação de ambiente sem domínio configurado, sem afirmar que robots.txt protege dados privados.

## 9. Fases de continuação e critérios de aceite

1. Inventariar estado e lacunas; conferir referências e o catálogo real.
2. Estabilizar contratos, busca, interface comum e uma execução funcional completa.
3. Implementar/reparar ferramentas por grupos com autoria exclusiva de arquivos.
4. Integrar e conferir exatamente 150 IDs únicos e dez itens por categoria.
5. Testar lógica com exemplos independentes e entradas inválidas; conferir arquivos exportados.
6. Abrir o portal real em navegador, executar ferramentas de cada classe, busca, filtros, favoritos, salvamento, restauração, downloads e impressão. Inspecionar rede e console.
7. Executar dois pareceres independentes; corrigir achados e retestar proporcionalmente.
8. Construir e servir o pacote final; conferir independência, documentação e pendências de configuração.

Não considerar concluído porque compila ou porque 150 execuções não lançaram exceção. Testes devem conferir resultado, cálculo, conteúdo dos arquivos e comportamento. Diferencie testes de unidade, integração, navegador, dispositivo físico, impressão/montagem real, pagamento e produção. Se navegador adicional ou aparelho físico não estiver disponível, diga exatamente o que faltou; não converter ausência de evidência em aprovação.

Registre comandos e resultados efetivos, ambiente e limitações no relatório final. Documente problemas conhecidos com próximo passo. Corrija qualquer erro conhecido em função obrigatória, cálculo, segurança, navegação ou build antes de declarar conclusão. Dados públicos ainda não fornecidos podem continuar como pendência de configuração; defeitos de implementação não.

## 10. Entregáveis e comunicação

Entregue código em `portal/`, catálogo de 150 ferramentas com metodologias, pacote publicável, guia de publicação, README atual, dois pareceres críticos separados e relatório final com evidências. Atualize estado de execução para permitir retomada sem refazer trabalho. Preserve os documentos Claude como histórico claramente identificado.

Na resposta final, informe em português o que foi implementado e validado, o caminho da cópia, endereço local se estiver ativo e o que aguarda configuração ou teste externo. Diferencie “implementado”, “testado”, “preparado”, “publicado” e “validado em produção”. Não atribua atividades a agentes inexistentes nem publique números de testes sem execução registrada.

## Referência de elaboração

A orientação oficial de prompting consultada para a adaptação é [Prompting — OpenAI Learn](https://learn.chatgpt.com/docs/prompting). Ela é referência de comunicação de instruções, não comprovação de modelos disponíveis, garantias de resultado ou aprovação de arquitetura. A especificação do produto e seus critérios são os definidos acima pelo pedido e pelo projeto.

**Comece agora pelo estado real da cópia e prossiga até a implementação e as validações autorizadas estarem concluídas.**
