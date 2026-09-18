import {
  ChannelSchema,
  CreateNotificationSchema,
  NotificationStatusSchema,
} from '@mensageria/contracts';
import { NotificationNotFoundError } from '@mensageria/core';
import type { Metrics } from '@mensageria/observability';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDependencies } from '../dependencies.js';
import { presentNotification } from '../presenter.js';

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  status: NotificationStatusSchema.optional(),
  channel: ChannelSchema.optional(),
});

export function registerNotificationRoutes(
  app: FastifyInstance,
  deps: AppDependencies,
  metrics?: Metrics,
): void {
  app.get('/notifications', async (request, reply) => {
    const parsed = ListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: 'ValidationError' });
    }
    const { page, pageSize, status, channel } = parsed.data;
    const filter = { ...(status ? { status } : {}), ...(channel ? { channel } : {}) };
    const result = await deps.listNotifications.execute({
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
    });
    return reply.send({
      items: result.items.map(presentNotification),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  });

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

    if (!result.deduplicated) metrics?.enqueued.inc({ channel: result.notification.channel });

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
