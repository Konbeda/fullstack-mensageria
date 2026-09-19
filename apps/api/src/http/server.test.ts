import { describe, expect, it } from 'vitest';
import type { AppDependencies } from './dependencies.js';
import { buildServer } from './server.js';

const snapshot = {
  id: '11111111-1111-1111-1111-111111111111',
  channel: 'email',
  to: 'ana@example.com',
  content: { subject: 's', body: 'b' },
  status: 'queued',
  attempts: 0,
  createdAt: new Date('2026-09-19T00:00:00.000Z'),
  updatedAt: new Date('2026-09-19T00:00:00.000Z'),
};

// Deps fake: o foco é a camada HTTP/segurança, sem infra real.
const deps = {
  enqueue: { execute: async () => ({ notification: snapshot, deduplicated: false }) },
  getNotification: { execute: async () => snapshot },
  listNotifications: { execute: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }) },
} as unknown as AppDependencies;

const emailPayload = { channel: 'email', to: 'ana@example.com', subject: 's', body: 'b' };

describe('buildServer — segurança', () => {
  it('aplica security headers (helmet)', async () => {
    const app = buildServer(deps);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    await app.close();
  });

  it('exige API key nos writes quando configurada (401 sem, 202 com)', async () => {
    const app = buildServer(deps, { apiKey: 'secret' });
    await app.ready();
    const sem = await app.inject({ method: 'POST', url: '/notifications', payload: emailPayload });
    const com = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: emailPayload,
      headers: { 'x-api-key': 'secret' },
    });
    expect(sem.statusCode).toBe(401);
    expect(com.statusCode).toBe(202);
    await app.close();
  });

  it('não exige API key nas leituras', async () => {
    const app = buildServer(deps, { apiKey: 'secret' });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/notifications' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
