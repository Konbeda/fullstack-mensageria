import type { Metrics } from '@mensageria/observability';
import type { FastifyInstance } from 'fastify';

export function registerMetricsRoutes(app: FastifyInstance, metrics: Metrics): void {
  app.get('/metrics', async (_request, reply) => {
    reply.header('content-type', metrics.registry.contentType);
    return reply.send(await metrics.registry.metrics());
  });
}
