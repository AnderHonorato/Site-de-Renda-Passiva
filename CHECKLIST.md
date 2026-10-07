# Continuidade do portal — 06/10/2026 — v1.1.0

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
- [x] Testes completos em 07/10: 1.056/1.056 de código, 2/2 fluxos grandes da API e 50/50 de navegador aprovados; verificador estrutural sem problemas.
- [x] Conferência visual na porta 4400 atualizada em 07/10: cabeçalho logado com avatar/nome e menu flutuante, Entrar/Criar conta para visitante, conta/login/perfil em drawer direito compacto e chat alto/estreito; 390 px sem rolagem lateral.
- [x] Perfil v2: upload de foto, 15 avatares autorais, links sociais, ferramentas recomendadas visuais, plano clicável, data/tempo de comunidade e barra flutuante Salvar/Cancelar.
- [x] Evolução v2: níveis por interações + bônus de medalhas, 7 famílias de medalhas com 8 patamares, página explicativa e banners/molduras desbloqueados por nível; níveis 13–15 têm animações de maior impacto.
- [x] Chat v2: não lidas por sala e na bolha, lista com última mensagem/horário, resposta vinculada, Shift+Enter, formatação contextual, mini perfil no hover, mídia privada com prévia/player/progresso/download/denúncia e expiração em 48 h; chat público continua apenas texto.
- [ ] Anúncio real, aprovação AdSense, IDs do dono e CMP aplicável: nada foi ativado sem esses dados.

## Ondas seguintes do plano original

- [x] Trabalhos salvos com reabertura, renomear/apagar e cotas reais de Grátis/Plus aplicadas no servidor.
- [ ] Cotas adicionais finais do Premium; até a definição, Premium herda explicitamente as cotas do Plus.
- [ ] Admin de ferramentas, textos com histórico, categorias, limites e regras de pontos.
- [ ] Boas-vindas/novidades editáveis; apresentação existente permanece.
- [ ] Edição administrativa das regras de pontos e revisão visual do modal de evolução.
- [ ] Tradução de todas as ferramentas; moldura/telas de conta já bilíngues.
- [ ] Processamento isolado no servidor, conversões avançadas e ferramentas planejadas (ondas 16/17).
- [ ] Domínio/HTTPS, contato responsável, SMTP/procedimento de recuperação, restauração de backup e produção.

Essas pendências já eram ondas separadas do plano do Claude e não estão concluídas nesta versão.
