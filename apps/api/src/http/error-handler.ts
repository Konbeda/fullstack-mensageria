import { DomainError, NotificationNotFoundError } from '@mensageria/core';
import type { FastifyInstance } from 'fastify';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof NotificationNotFoundError) {
      return reply.code(404).send({ error: 'NotFound', message: error.message });
    }
    if (error instanceof DomainError) {
      return reply.code(409).send({ error: 'Conflict', message: error.message });
    }
    request.log.error({ err: error }, 'erro não tratado');
    return reply.code(500).send({ error: 'InternalServerError' });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: 'NotFound', message: 'rota não encontrada' });
  });
}
