import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Metrics } from '@mensageria/observability';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type Redis from 'ioredis';
import type { AppDependencies } from './dependencies.js';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerNotificationRoutes } from './routes/notifications.js';

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
  metrics?: Metrics;
  corsOrigin?: string[] | boolean;
  apiKey?: string;
  rateLimit?: { redis?: Redis; max: number; timeWindow: number };
}

export function buildServer(
  deps: AppDependencies,
  options: BuildServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });

  void app.register(helmet);
  void app.register(cors, { origin: options.corsOrigin ?? true });
  if (options.rateLimit) {
    void app.register(rateLimit, {
      max: options.rateLimit.max,
      timeWindow: options.rateLimit.timeWindow,
      ...(options.rateLimit.redis ? { redis: options.rateLimit.redis } : {}),
    });
  }

  // Autenticação por API key nos writes (fail-closed quando a chave está configurada).
  if (options.apiKey) {
    app.addHook('onRequest', async (request, reply) => {
      if (request.method !== 'POST') return;
      if (request.headers['x-api-key'] !== options.apiKey) {
        await reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  }

  registerErrorHandler(app);
  registerHealthRoutes(app);
  registerNotificationRoutes(app, deps, options.metrics);

  return app;
}
