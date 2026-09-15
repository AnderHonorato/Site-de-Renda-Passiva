# Briefing dos críticos (Fase E)

Dois críticos independentes (Opus 5), com contextos próprios, examinam o resultado **integrado** dos seis sites. Cada um termina o próprio parecer **antes** de ler o do outro. Nenhum crítico é autor do código auditado.

## Regras comuns

- **Não editar** código de produção (pastas dos produtos, `compartilhado/`). Evidências, scripts de teste e capturas ficam em `revisão/<crítico>/` na raiz do projeto.
- Não aprovar com base no relatório dos executores nem do orquestrador: reproduzir.
- Cada achado: identificador (`S-01`, `E-01`…), gravidade (crítica, alta, média, baixa), produto e arquivo/página, passo de reprodução, resultado observado, resultado esperado, consequência.
- Distinguir o que foi validado em emulação de navegador, o que depende de aparelho físico, de banco real (Pix) e de AdSense aprovado.
- Não criar subagentes, não fazer commits, não publicar nada, não acessar serviços externos além de documentação oficial.

## Ambiente

- Na raiz: `npm run gerar`, `npm run testar`, `npm run verificar`, `npm run construir`.
- Servidores locais (127.0.0.1): confeitaria 4311, educação 4312, artesanato 4313, festas 4314, reforma 4315, embalagens 4316; pacote publicado `npm run visualizar` na porta +10.
- Configurações de Pix e AdSense estão vazias por decisão (dados do proprietário). Para testar o Pix, crie uma cópia em `revisão/` com a chave de exemplo do Manual do Banco Central (`123e4567-e12b-12d1-a456-426655440000`, não pagável); nunca altere `configurações/` dos produtos.

## Crítico de segurança e correção — foco

1. Recalcular de forma independente os casos de conferência de cada produto (seções 10–15 do prompt) e procurar erros de fórmula, arredondamento, unidade e ponto flutuante.
2. Entradas hostis: HTML/script em todos os campos de texto, números extremos, negativos, zero, vazio, notação exponencial.
3. Importação de cópia maliciosa, link de orçamento adulterado ou gigante, exportações (PDF, SVG, CSV, XLSX).
4. Pix: origem da chave, campos EMV, CRC, valor exibido = QR = texto, ausência de falsa confirmação.
5. Consentimento e publicidade: nada carregado sem configuração e aceite; revogação.
6. Pacote publicado: arquivos indevidos, segredos, referências externas, `.htaccess`, CSP.
7. Parecer em `documentação/parecer-crítico-segurança-e-correção.md`.

## Crítico de experiência e desempenho — foco

1. Navegador nas larguras 320, 360, 390, 768, 1024 e 1440 e em paisagem curta: navegação inferior, destino ativo, ação contextual ao alcance, ausência de rolagem lateral, sobreposição entre consentimento, faixa de apoio, mensagens e diálogos.
2. Teclado e foco no computador, Escape nos diálogos, rótulos e mensagens de erro junto aos campos, `prefers-reduced-motion`.
3. Estados vazio, erro, sucesso e indisponível em cada ferramenta.
4. Impressão e PDF: sem navegação, anúncios, apoio ou gabarito misturado; moldes em escala real.
5. Clareza e honestidade dos textos (sem promessas, depoimentos ou números inventados); coerência visual com `modelo/Modelo de Site.dc.html`.
6. Desempenho do pacote: tamanho, número de requisições por página, carregamento sob demanda, ausência de saltos de layout.
7. Parecer em `documentação/parecer-crítico-experiência-e-desempenho.md`.
