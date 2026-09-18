# Build: gera os arquivos estáticos da SPA (Vite). VITE_API_URL é embutido no bundle.
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
ARG VITE_API_URL=/api
COPY . .
RUN pnpm install --frozen-lockfile
RUN echo "VITE_API_URL=$VITE_API_URL" > apps/web/.env.production
RUN pnpm --filter @mensageria/web build

# Runtime: nginx serve os estáticos e faz proxy de /api — zero Node em produção.
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
