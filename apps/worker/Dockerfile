# Build: instala o workspace inteiro, compila e gera um pacote enxuto de produção.
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mensageria/worker build
RUN pnpm --filter @mensageria/worker deploy --prod /out

# Runtime: imagem limpa, sem toolchain nem código-fonte — só o necessário.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out /app
EXPOSE 3100
CMD ["node", "dist/main.js"]
