# Entrega local v1.1.0 — 06/10/2026

Continuidade do portal principal recebido do Claude (`e54af49`), com GPT-6 Sol no backend/frontend e GPT-6 Luna nos componentes menores. A implementação foi feita em worktree, antes de integrar a pasta que serve a porta 4400.

## Implementado

Login/cadastro, sessão HttpOnly, scrypt, CSRF/Origin, limites e revogação de sessões; perfil, amizades, bloqueios, favoritos sincronizados, suporte e administração de usuários/planos manuais. Chat com aceite explícito, salas públicas e conversas entre amigos, SSE, denúncias, silenciar/banir/remover e auditoria. Uso registrado depois de resultado concluído, sem valores/arquivos, recomendações e evolução de nível. Páginas de conta em português e inglês.

Publicidade condicional com API, consentimento, recolhimento de blocos vazios, nonce/CSP e ads.txt. Anúncios permanecem desligados até IDs/configuração reais. Conta, administração e páginas legais não recebem anúncios.

## Evidências

- Suíte completa: **1.053 testes aprovados**, zero falhas, cerca de 199 segundos.
- Integração multiusuário: **71 asserções**, teste aprovado, banco temporário. Inclui isolamento de conversas privadas, CSRF, tokens de uso único, revogação, moderação, favoritos e suporte.
- Proxy/indisponibilidade: **2 testes aprovados** depois da revisão de IP; cabeçalhos falsificados não mudam o IP no acesso direto.
- Gerador/verificador: **108 páginas, 189 scripts, 208 entradas de catálogo**, nenhum problema.
- SHA-256 dos seis estilos base (`núcleo`, `fontes`, `layout`, `componentes`, `movimento`, `páginas`): idênticos aos da fonte recebida.
- As **65 ferramentas prontas** continuam no catálogo. Nenhuma planejada virou tela falsa.

## Limites

Não houve validação visual das novas telas: a revisão automática do navegador continuou recusando o acesso por preferência salva, mesmo após autorização do usuário. As evidências acima são de código/API/estrutura, sem afirmar validação de navegação, dispositivo físico ou publicidade real.

Recuperação local grava instruções em pasta privada. SMTP, domínio/HTTPS, contato responsável, backup/restauração e AdSense/CMP reais ainda precisam de configuração para abertura pública. SQLite embutido é experimental no Node 22. Não houve deploy público nem envio ao GitHub.

O estado completo e as ondas restantes estão em `../CHECKLIST.md`. Comandos operacionais estão em `../portal/README.md`.
