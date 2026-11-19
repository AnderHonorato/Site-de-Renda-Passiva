# Build context: portal/
FROM node:22.16.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app/portal
COPY . .
RUN npm ci --ignore-scripts \
 && npm install --no-save --no-package-lock --ignore-scripts prettier@3.9.10 sql-formatter@15.9.0 esbuild@0.25.12 mermaid@11.17.2 @ffmpeg/ffmpeg@0.12.15 @ffmpeg/core@0.12.10 tesseract.js@6.0.1 tesseract.js-core@6.1.2 @tesseract.js-data/por@1.0.0 @tesseract.js-data/eng@1.0.0 @tesseract.js-data/spa@1.0.0 \
 && npm run montar:formatadores \
 && npm run montar:diagramas \
 && npm run montar:midias \
 && npm run montar:ocr \
 && npm run gerar \
 && npm run testar \
 && npm run verificar

FROM node:22.16.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080 PORTAL_BANCO=/data/portal.sqlite PORTAL_IA_CHAVE_MESTRA_FILE=/data/flower-master.key PORTAL_API_PORTA=4870 PORTAL_CHAT_LOCAL=0 PORTAL_CHAT_PUBLICO=0 PORTAL_ADS_ATIVO=0 PORTAL_ADS_TESTE=0
WORKDIR /app/portal
COPY --from=build --chown=node:node /app/portal /app/portal
RUN rm -rf node_modules .execucao servidor/.execucao \
 && mkdir -p /data \
 && chown node:node /data
# blitz.cloud: adicionar /data como kept folder no painel; NÃO usar VOLUME anônimo.
USER node:node
EXPOSE 8080
CMD ["node","ferramentas/iniciar-nuvem.mjs"]
