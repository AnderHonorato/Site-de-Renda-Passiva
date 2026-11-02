# Continuidade do portal — 07/10/2026 — v1.2.0

Fonte: `documentação/plano-portal-principal.md` e decisões 24–36 de `ander-flow/docs/decisoes.md`. O `ander-flow/` permanece referência congelada. Os itens descrevem o portal da 4400. Código/testes e validação visual são registrados separadamente.

## Prioridades deste pedido

- [x] Gerador preservado; novas telas usam o modelo, cores, fontes e componentes existentes.
- [x] API na mesma origem, SQLite próprio/privado e ferramentas disponíveis com API indisponível.
- [x] Cadastro/@usuário, login, sessão HttpOnly, CSRF/Origin, scrypt, limites e revogação.
- [x] Perfil/preferências, trocar senha, recuperação local com token de uso único, exportar/excluir dados.
- [x] Admin só por script local; gestão de usuários, suspensão e liberação manual de Plus/Premium.
- [x] Mensagens de suporte e resposta do administrador.
- [x] Favoritos sincronizados, cota da conta e excedentes preservados neste aparelho.
- [x] Chat com aceite, salas global/categoria/ferramenta e conversas entre amigos aceitos.
- [x] Denúncias, limites, restrição de links para novas contas, silenciar/banir/remover e auditoria.
- [x] Perfil, amizades, bloqueios, avatares ilustrados, ícones de nível/tempo e texto seguro.
- [x] Uso registrado só após resultado concluído, sem valores/arquivos; recomendações de ferramentas usadas e evolução de nível.
- [x] Publicidade condicional preparada, blocos vazios recolhidos, consentimento e CSP com nonce.
- [x] Privacidade/cookies em português e inglês.
- [x] 65 ferramentas mantidas; 208 itens no catálogo, sem telas falsas para planejadas.
- [x] Testes completos em 07/10: 1.056/1.056 de código, 2/2 fluxos grandes da API e 51/51 de navegador aprovados; verificador estrutural sem problemas.
- [x] Conferência visual na porta 4400 atualizada em 07/10: cabeçalho logado com avatar/nome e menu flutuante, Entrar/Criar conta para visitante, Minha conta e Perfil em modal central amplo/compacto por dentro e chat flutuante restaurado; 390 px sem rolagem lateral.
- [x] Perfil v2: upload de foto, 15 avatares autorais, links sociais, ferramentas recomendadas visuais, plano clicável, data/tempo de comunidade e barra flutuante Salvar/Cancelar.
- [x] Evolução v2: níveis por interações + bônus de medalhas, 7 famílias de medalhas com 8 patamares, página explicativa e banners/molduras desbloqueados por nível; níveis 13–15 têm animações de maior impacto.
- [x] Chat v2: não lidas por sala e na bolha, lista com última mensagem/horário, resposta vinculada, Shift+Enter, formatação contextual, mini perfil no hover, mídia privada com prévia/player/progresso/download/denúncia e expiração em 48 h; chat público continua apenas texto.
- [ ] Anúncio real, aprovação AdSense, IDs do dono e CMP aplicável: nada foi ativado sem esses dados.

## Ondas seguintes do plano original

- [x] Trabalhos salvos com reabertura, renomear/apagar e cotas reais de Grátis/Plus aplicadas no servidor.
- [x] Cotas adicionais do Premium: limites ampliados de trabalhos e tamanho individual (v1.3.5).
- [x] Admin de ferramentas, textos com histórico, categorias, limites e regras de pontos, com rascunho/publicação e recuperação (v1.3.6).
- [x] Boas-vindas/novidades editáveis no admin, com português/inglês, imagem, ordem, publicação/retirada programadas e revisão para reaparecer só quando inédita; apresentação existente preservada.
- [x] Edição administrativa das regras de pontos e cotas, com validação no servidor (v1.3.6).
- [ ] Revisão visual adicional do modal de evolução.
- [ ] Tradução de todas as ferramentas; moldura/telas de conta já bilíngues.
- [ ] Processamento isolado no servidor, conversões avançadas e ferramentas planejadas (ondas 16/17).
- [ ] Domínio/HTTPS, contato responsável, SMTP/procedimento de recuperação, restauração de backup e produção.

Essas pendências já eram ondas separadas do plano do Claude e não estão concluídas nesta versão.

## Refinamento — 07/10/2026

- [x] Perfil completo, preferências e foto gravados juntos; erro conserva os campos e o tema atual do aparelho não é substituído pelo tema antigo do servidor.
- [x] Foto com recorte local, zoom/posição e prévias de perfil/chat; saída quadrada 512 × 512 e consulta sem cache de foto antiga.
- [x] Trabalhos, favoritos, suporte e planos como abas da conta, com saída/entrada lateral e rascunho preservado. Transição entre páginas de conta/perfil nos navegadores compatíveis.
- [x] Emblemas SVG próprios com família, metal, facetas, fitas, ornamentos e diferenciação por patamar; níveis mais altos recebem coroa e detalhes adicionais.
- [x] Celebração central de nível/medalha com feixes de luz, fila e registro no servidor por usuário/família/patamar. Repetição manual da animação disponível em Visual.
- [x] Sons locais e discretos para recebimento de notificação/mensagem, nível/conquista e abrir/fechar chat; mensagem própria não faz som de recebimento; controle para silenciar em Preferências.
- [x] `@honor`, conta mais recente criada em 07/10, colocada no nível 15 a pedido do dono; plano, credenciais, campos do perfil e atividades preservados. Backup privado antes da alteração.
- [x] Admin de publicidade pronto para IDs futuros; demonstração local rotulada, com posições em listas/resultado/rodapé, sem conexão com Google ou receita.
- [x] Conteúdo de uso das 65 ferramentas no HTML; metadados de compartilhamento, dados estruturados, sitemap e canonical condicionados a domínio HTTPS real. Roteiro de divulgação em `documentação/busca-e-publicidade-2026-10-07.md`.
- [x] 1.078/1.078 testes de código, 4/4 fluxos da API e 65/65 de navegador. Após o ajuste de Planos/prévia manual, 16/16 testes de conta/chat repetidos. Verificador: 116 páginas, 200 scripts, 208 entradas; sem problemas.
- [x] Porta 4400 responde no computador e no endereço LAN do mesmo computador; API e chat local ativos. Prévia de publicidade conferida no navegador real. Conta/perfil/recorte/animações conferidos em Chromium com dados de teste, incluindo larguras 320/390 e telas baixas.
- [ ] Conferência em outro dispositivo físico da rede e avaliação dos sons em alto-falantes reais.
- [ ] Referência Grok: Drive identificou `grok-workspace.zip`, mas bloqueou download por classificação de malware/spam; o conteúdo da animação não foi visualizado.

Não houve implantação em domínio público nem ativação de anúncios reais/campanhas pagas. Os arquivos privados de execução, bancos, backups e imagens de testes não entram na publicação.

## Continuação de 09/10/2026 após v1.3.7

- [x] Modal de nível, medalha e missão não corta descrições compridas em telas muito baixas; rolagem acessível sem trilho lateral visível e visual orgânico preservado.
- [x] Teste de navegador de 320 × 240 px acrescentado: 8/8 testes do arquivo de recompensas aprovados.
- [x] Gerador 131 saídas; suíte Node 1.130/1.130; verificador 130 páginas, 215 scripts, 208 itens, sem problemas.
- [ ] Tradução integral das ferramentas, desempenho e acessibilidade em aparelho físico, AdSense real e preparação de produção continuam pendentes.

Relatório: `portal/documentacao/ajuste-conquistas-telas-baixas-2026-10-09.md`.


## Continuação — indexação segura da prévia pública

- [x] URLs canônicas HTTPS e sitemap da prévia com caminho completo de subpasta.
- [x] Páginas de conta, administração e erros marcadas como noindex no pacote GitHub Pages; publicadas sem mudar interface.
- [x] Testes adicionados para URLs públicas e exclusão das telas privadas.
- [ ] Validar indexação real no Google Search Console; tradução integral e teste físico continuam pendentes.

- [x] Pipeline de publicação ampliado para executar toda a suíte de testes e verificação estrutural antes de publicar; qualquer falha bloqueia o deploy.
- [x] Teste de recuperação do servidor corrigido para aceitar o separador nativo de caminhos no Windows e no Linux.

- [x] Verificador de links de idioma aceita hreflang HTTPS do próprio sitemap, convertendo para caminhos locais e mantendo a conferência recíproca.


## Servidor de testes na nuvem — etapa inicial

- [x] Inicialização Node para nuvem separada de desenvolvimento, exigindo produção, domínio HTTPS e arquivo de banco absoluto.

- [x] Mantidos os 65 módulos locais, modelo visual e a prévia estática existente.

- [x] Teste automatizado de configuração de nuvem sem chat público e sem anúncios.

- [ ] Verificar domínio real, volume persistente e rotas da API após o primeiro deploy.

- [ ] Validar cadastro/recuperação, moderação e restauração antes de habilitar comunidade pública.

- [ ] Tradução integral somente após terminar as funcionalidades (decisão do proprietário).


## Rodada paralela de funcionalidades — 02/11/2026

- [x] Fluxo de caixa: saldo inicial, movimentos cronológicos, data de corte, previsão, primeiro saldo negativo e PDF/CSV/Excel.

- [x] Conversor de moedas: cotação informada pelo usuário, tarifa fixa, valores brutos/líquidos e aviso sem cotação ao vivo.

- [x] ROI, ROAS, CAC e LTV: fórmulas transparentes, distinção entre retorno simplificado e lucro e valores não calculáveis sem divisor.

- [x] Rateio de custos: pesos personalizados, empates determinísticos e centavos fechando exatamente com PDF/CSV/Excel.

- [x] Quatro módulos no montador visual existente e testes unitários específicos para cada novo cálculo.

- [ ] Ativar API na nuvem: Railway exige assinatura após encerramento do teste; sem contratação automática.

- [ ] Traduzir somente após concluir as funcionalidades, conforme decisão do proprietário.


## Continuação — 02/11/2026 — ferramentas de vendas

- [x] Pedido de venda: subtotal, desconto, frete, total, PDF A4 e planilha Excel; sem confundir com nota fiscal.

- [x] Follow-up: modelos locais, cinco objetivos, três tons e cópia sem envio automático.

- [x] Meta de faturamento: metas diária, semanal útil e por vendedor; estimativa de vendas e prazo esgotado.

- [x] Ticket médio e conversão: simulações relativas, limites de conversão e casos sem denominadores.

- [x] Mantidos módulos, marca, estilos, gerador e 208 itens do catálogo; 73 ferramentas prontas.

- [ ] Ficha de cliente com dados locais e exportação segura (próxima etapa separada).

- [ ] Backend persistente em nuvem e recuperação de senha por e-mail seguem pendentes; Railway pede plano.

- [ ] Tradução completa somente depois das funcionalidades, conforme decisão do proprietário.


## Ficha de cliente local — continuação 02/11/2026

- [x] Formulário de cadastro e edição com validação; listagem pesquisável por nome, contato, observação e histórico.
- [x] Exclusão individual com confirmação, máximo de 250 clientes e backup JSON com restauração substitutiva validada.
- [x] Exportação Excel com dados em células de texto, mantendo o estilo responsivo do portal.
- [x] Bloqueado o botão "Salvar trabalho" e o registro remoto de uso apenas para esta ferramenta, evitando envio de contatos à API.
- [x] Casos de teste sobre integridade de backup, dados duplicados, edição, limite, busca e exclusão.
- [ ] Traduzir ferramentas somente depois do restante do portal, conforme prioridade do proprietário.
- [ ] Hospedagem do backend em nuvem requer conta ativa, domínio e backup persistente (Railway expirado).
