# F195 — Tradutor de texto local

## Entrega
O módulo `portal/scripts/ferramentas/traduzir-texto.js` oferece texto editável (até 10.000 caracteres), idiomas PT/EN/ES, verificação explícita da Translator API do navegador, solicitação de pacote local, progresso do download, cancelamento, cópia e exportação TXT. Não envia o texto a servidores do projeto e não finge traduzir se o recurso não estiver disponível.

## Limitações reais
O recurso depende da implementação de `Translator` pelo navegador, disponibilidade do par de idiomas e eventual download de modelos. Não equivale a um tradutor universal offline. Revisar traduções técnicas. O catálogo permanece com status planejada até validar a integração de interface e execução E2E em navegador compatível.

## Validação
`node --test portal/testes/traduzir-texto.test.mjs` e `node --check portal/scripts/ferramentas/traduzir-texto.js`. Workflow Ubuntu em `.github/workflows/validar-ferramentas-194-195.yml`. Conferir status Actions antes de declarar concluída.

## Próximas etapas
Verificar roteamento do carregador de módulos para F195, adicionar teste real de navegador com Translator API compatível, completar fallback legítimo baseado em modelo local quando viável e atualizar status apenas após E2E. Não expor tokens nem serviços externos sem consentimento.
