import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import type { Metrics } from '@mensageria/observability';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { AppDependencies } from './dependencies.js';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMetricsRoutes } from './routes/metrics.js';
import { registerNotificationRoutes } from './routes/notifications.js';

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
  metrics?: Metrics;
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

  void app.register(cors, { origin: true });
  registerErrorHandler(app);
  registerHealthRoutes(app);
  if (options.metrics) registerMetricsRoutes(app, options.metrics);
  registerNotificationRoutes(app, deps, options.metrics);

  return app;
}
