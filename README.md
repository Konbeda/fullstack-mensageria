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
pnpm test           # testes (Vitest)
pnpm lint           # ESLint (type-checked)
pnpm format         # Prettier
```

## Roadmap

O projeto é construído em fatias verticais funcionando ponta a ponta. Fases: fundação → domínio → API produtora → worker resiliente → SPA → e2e Playwright → observabilidade → infra/k8s → orquestração de agentes de IA.
