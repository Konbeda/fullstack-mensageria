# fullstack-mensageria

Ecossistema **event-driven** de notificações multicanal (email/SMS/push), construído para demonstrar mensageria assíncrona, resiliência e Clean Architecture ponta a ponta em Node.js + TypeScript.

> Uma notificação entra pela API, é aceita numa fila e processada por workers que lidam com falhas reais de provedores externos: **retry com backoff**, **circuit breaker**, **idempotência** e **dead-letter queue** — tudo observável em um dashboard.

## Arquitetura

```
┌─────────┐   POST /notifications   ┌─────────┐   publish    ┌──────────┐   consume   ┌──────────┐
│   web   │ ──────────────────────▶ │   api   │ ───────────▶ │ RabbitMQ │ ──────────▶ │  worker  │
│  (SPA)  │ ◀── GET /notifications  │(Fastify)│              │ (queues) │             │(delivery)│
└─────────┘                         └────┬────┘              └────┬─────┘             └────┬─────┘
                                         │                        │ DLQ                    │
                                    ┌────▼────┐              ┌─────▼─────┐            ┌─────▼─────┐
                                    │ Postgres│              │  (dead)   │            │  MongoDB  │
                                    │  Redis  │              └───────────┘            │(delivery  │
                                    └─────────┘                                       │   log)    │
                                                                                      └───────────┘
```

- **`apps/api`** — Fastify. Valida, garante idempotência e publica o evento; responde com status codes REST corretos (`202`, `409`, `422`...).
- **`apps/worker`** — consome a fila e entrega via provedores, aplicando os padrões de resiliência.
- **`apps/web`** — SPA React que cria e acompanha notificações e inspeciona a DLQ.
- **`packages/core`** — domínio e casos de uso puros (Clean Architecture); infra entra por injeção de dependência (DIP/SOLID).
- **`packages/contracts`** — schemas Zod e tipos compartilhados entre os três apps.

## Stack

Node.js 24 · TypeScript · Fastify · React + Vite · RabbitMQ · PostgreSQL · MongoDB · Redis · Vitest · Playwright · Docker · OpenTelemetry/Prometheus/Grafana · pnpm workspaces.

## Requisitos

- Node.js `>= 22` (veja `.nvmrc`)
- pnpm `9` (`corepack enable` ou `npm i -g pnpm@9`)

## Comandos

```bash
pnpm install        # instala o workspace inteiro
pnpm typecheck      # checagem de tipos em todos os pacotes
pnpm test:unit      # testes unitários (rápidos, sem infra)
pnpm test           # todos os testes, incluindo integração (requer Docker)
pnpm lint           # ESLint (type-checked)
pnpm format         # Prettier
```

## Rodando a API localmente

```bash
docker compose -f infra/docker-compose.yml up -d   # sobe postgres, redis, rabbitmq, mongo
cp apps/api/.env.example apps/api/.env             # ajuste se necessário
pnpm --filter @mensageria/api migrate              # aplica as migrations
pnpm --filter @mensageria/api dev                  # sobe a API em http://localhost:3000
```

Exemplo de requisição:

```bash
curl -i -X POST http://localhost:3000/notifications \
  -H 'content-type: application/json' \
  -H 'idempotency-key: abc-123' \
  -d '{"channel":"email","to":"ana@example.com","subject":"Oi","body":"Olá!"}'
```

Respostas: `202` (enfileirada) · `200` (replay idempotente) · `422` (validação) · `404` (não encontrada).

## Rodando o worker (consumidor)

Em outro terminal, com a infra e as migrations já no ar:

```bash
cp apps/worker/.env.example apps/worker/.env
pnpm --filter @mensageria/worker dev
```

O worker consome a fila e entrega via provedores simulados, aplicando os padrões de resiliência:

- **Retry com backoff exponencial** — em falha transitória, a mensagem vai para uma fila de espera com TTL e reentra na fila de entrega.
- **Circuit breaker por canal** — após várias falhas seguidas, o breaker abre e para de chamar o provedor até esfriar (`half_open` → `closed`).
- **Idempotência no consumo** — entrega já concluída não é reenviada.
- **Dead-letter queue** — mensagens que esgotam as tentativas caem em `notifications.dlq` para inspeção/reprocesso.
- **Delivery log** — cada tentativa é registrada no MongoDB.

Para ver a resiliência em ação, suba com `PROVIDER_FAILURE_RATE=1` e acompanhe os retries até a DLQ.

## Observabilidade

Com o stack no ar (`pnpm infra:up`) e API/worker rodando:

- **Métricas Prometheus** — a API expõe `GET /metrics` (`:3000`) e o worker em `:3100/metrics`, com contadores de domínio (`notifications_enqueued_total`, `..._delivered_total`, `..._failed_total`, `..._dead_lettered_total`) e um histograma de latência de entrega.
- **Prometheus** coleta os dois alvos em `http://localhost:9090`.
- **Grafana** em `http://localhost:3001` (login anônimo) já vem com o dashboard **Mensageria — Visão Geral** provisionado: taxas de enfileiramento/entrega/falha, dead-letter acumulado e latência p95.
- **Logs estruturados** (pino) no worker, com correlação por `notificationId`/canal/tentativa.
- **Resiliência**: timeout em toda chamada ao provedor (`PROVIDER_TIMEOUT_MS`), além de retry, circuit breaker e DLQ; `GET /health` na API e no worker (readiness/liveness).

## Build & deploy

- **Imagens Docker** — cada app tem um Dockerfile multi-stage: `api`/`worker` compilam com tsup e rodam em `node:24-alpine` com só `dist` + deps de produção; `web` compila com Vite e é servido por `nginx` (que também faz proxy de `/api`).
  ```bash
  docker build -f apps/api/Dockerfile -t mensageria-api .
  docker build -f apps/worker/Dockerfile -t mensageria-worker .
  docker build -f apps/web/Dockerfile -t mensageria-web .
  ```
- **Kubernetes** (`infra/k8s`, via kustomize) — namespace, ConfigMap/Secret, infra e os três apps com **escala independente** (api ×2, worker ×3, web ×2), probes em `/health` e `initContainer` de migrations.
  ```bash
  kubectl apply -k infra/k8s
  ```
- **CI** (GitHub Actions) — lint, typecheck, testes unitários, integração (Testcontainers), e2e (Playwright) e build das três imagens.

## Roadmap

O projeto é construído em fatias verticais funcionando ponta a ponta. Fases: fundação → domínio → API produtora → worker resiliente → SPA → e2e Playwright → observabilidade → infra/k8s → orquestração de agentes de IA.
