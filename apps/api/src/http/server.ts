import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { AppDependencies } from './dependencies.js';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerNotificationRoutes } from './routes/notifications.js';

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
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

  registerErrorHandler(app);
  registerHealthRoutes(app);
  registerNotificationRoutes(app, deps);

  return app;
}
