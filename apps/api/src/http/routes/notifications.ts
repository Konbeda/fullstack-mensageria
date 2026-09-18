import { CreateNotificationSchema } from '@mensageria/contracts';
import { NotificationNotFoundError } from '@mensageria/core';
import type { FastifyInstance } from 'fastify';
import type { AppDependencies } from '../dependencies.js';
import { presentNotification } from '../presenter.js';

export function registerNotificationRoutes(app: FastifyInstance, deps: AppDependencies): void {
  app.post('/notifications', async (request, reply) => {
    const parsed = CreateNotificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({
        error: 'ValidationError',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const header = request.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(header) ? header[0] : header;

    const result = await deps.enqueue.execute({
      data: parsed.data,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    reply.header('Location', `/notifications/${result.notification.id}`);
    // 202: enfileirada agora; 200: replay idempotente da mesma requisição.
    return reply
      .code(result.deduplicated ? 200 : 202)
      .send(presentNotification(result.notification));
  });

  app.get<{ Params: { id: string } }>('/notifications/:id', async (request, reply) => {
    const snapshot = await deps.getNotification.execute(request.params.id);
    if (!snapshot) throw new NotificationNotFoundError(request.params.id);
    return reply.send(presentNotification(snapshot));
  });
}
