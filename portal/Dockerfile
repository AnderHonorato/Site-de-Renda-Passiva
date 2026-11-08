# Build context: portal/
FROM node:22.16.0-bookworm-slim AS build
WORKDIR /app/portal
COPY . .
RUN npm ci --ignore-scripts \
 && npm install --no-save --no-package-lock --ignore-scripts prettier@3.9.10 sql-formatter@15.9.0 esbuild@0.25.12 mermaid@11.17.2 \
 && npm run montar:formatadores \
 && npm run montar:diagramas \
 && npm run gerar \
 && npm run testar \
 && npm run verificar

FROM node:22.16.0-bookworm-slim
ENV NODE_ENV=production PORT=8080 PORTAL_API_PORTA=4870 PORTAL_CHAT_LOCAL=0 PORTAL_CHAT_PUBLICO=0 PORTAL_ADS_ATIVO=0 PORTAL_ADS_TESTE=0
WORKDIR /app/portal
COPY --from=build --chown=node:node /app/portal /app/portal
RUN rm -rf node_modules .execucao servidor/.execucao \
 && mkdir -p /data \
 && chown node:node /data
USER node:node
EXPOSE 8080
CMD ["node","ferramentas/iniciar-nuvem.mjs"]
