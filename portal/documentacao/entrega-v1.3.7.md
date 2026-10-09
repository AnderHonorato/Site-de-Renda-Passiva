# Portal v1.3.7 — refinamento do editor e revisão de continuidade

09/10/2026, branch `ander-flow/v1`, a partir de `56d1859` (v1.3.6). Alterações restritas a `portal/`; arquivos privados de execução, banco, fotos, credenciais e materiais de referência ficam fora do commit.

## Mudanças

- Quando o filtro do catálogo não encontra itens, o editor limpa os campos, desativa a edição e mostra uma mensagem em PT/EN. Ao limpar o filtro, volta a carregar o item válido. A busca não libera a edição quando há publicação pendente.
- Histórico de revisões e auditoria mostram descrições em PT/EN, datas locais e linhas que acomodam o conteúdo em telas estreitas. Datas `CURRENT_TIMESTAMP` do SQLite são interpretadas em UTC antes da apresentação local.
- Revisões indicam a versão e oferecem restauração acessível pelo teclado. O histórico vazio explica quando os primeiros registros aparecem.
- Corrigida uma quebra de linha extra do gerador nas páginas institucionais e atualizada a auditoria de pendências para refletir o que a v1.3.6 entregou.

## Verificação

- `npm run conferir`: **1.130/1.130** testes aprovados; verificador sem problemas em **130 páginas, 215 scripts e 208 entradas**. Gerador produziu 131 saídas, com 65 ferramentas prontas.
- `npm run testar:api`: **6/6** fluxos isolados aprovados, incluindo publicação real em cópia temporária, regras de XP/cotas, permissões, bloqueios, recuperação e erros HTML.
- Regressão de navegador: **38/38** cenários aprovados, cobrindo perfil, chat, notificações, recompensas e administração. Após a última proteção de publicação pendente, o arquivo editorial foi repetido com **5/5** cenários aprovados. São **39 cenários distintos**; a repetição não é contada como cobertura adicional.
- Capturas do editor e do histórico inspecionadas em 1280 px claro PT, 390 px claro PT e 320 px escuro EN. São contextos Chromium isolados com respostas simuladas, sem uso da sessão real do proprietário. Não constituem aceite do proprietário nem teste físico em outro aparelho.
- Servidor local e endereço da LAN responderam à home, às telas administrativas em PT/EN, às páginas de erro e às regras públicas. Endpoint editorial sem sessão retornou 401. Hashes dos scripts e CSS servidos coincidiram com os arquivos no disco.
- Banco ativo e backup consistente da v1.3.6: `PRAGMA quick_check=ok`. **As 27 tabelas anteriores permanecem idênticas pelo conteúdo**, com duas contas preservadas; cinco tabelas novas pertencem à administração editorial e proteção de tráfego. Esta versão não altera esquema ou dados e não exige reiniciar a API.

Evidências privadas: `.execucao/conferencia-v1.3.7.log`, `.execucao/api-v1.3.7.log`, `.execucao/navegador-v1.3.7.log`, `.execucao/editorial-final-v1.3.7.log`, `.execucao/http-v1.3.7.json` e `.execucao/integridade-resultado-v1.3.7.json`. Backup preservado em `servidor/.execucao/backup-v1.3.6-20261009-061447.sqlite`.

## Acesso e limites

Prévia no computador: `http://127.0.0.1:4400/`. Prévia da LAN: `http://192.168.1.1:4400/`, conferida neste computador. Administração em `/admin/editorial/` e `/admin/operacao/`, com conta administrativa; versões inglesas sob `/en/`.

O editor cobre metadados de ferramentas/categorias existentes, quatro textos públicos, regras de XP e cotas de conta. Cadastro de novas ferramentas/categorias, edição de fórmulas/campos, tradução integral das 65 ferramentas e limiares de tráfego continuam fora desse painel. Desempenho em aparelho físico, validação de som, aceite visual, SMTP, domínio/HTTPS, anúncios reais, publicação externa e backup integral de `C:\Projetos` permanecem pendentes. Estado consolidado em [pendencias-prompt-original-2026-10-08.md](pendencias-prompt-original-2026-10-08.md).
