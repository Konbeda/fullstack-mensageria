import { describe, expect, it } from 'vitest';
import { Notification } from './notification.js';
import { InvalidStateTransitionError } from './errors.js';

const now = new Date('2026-09-17T00:00:00.000Z');

function queued(): Notification {
  return Notification.create({
    id: 'n-1',
    data: { channel: 'email', to: 'ana@example.com', subject: 'oi', body: 'corpo' },
    now,
  });
}

describe('Notification', () => {
  it('nasce em queued com zero tentativas', () => {
    const n = queued();
    expect(n.status).toBe('queued');
    expect(n.attempts).toBe(0);
  });

  it('segue o fluxo queued -> processing -> delivered', () => {
    const n = queued();
    n.markProcessing(now);
    n.markDelivered(now);
    expect(n.status).toBe('delivered');
  });

  it('permite retry: failed -> processing', () => {
    const n = queued();
    n.markProcessing(now);
    n.markFailed(now);
    n.markProcessing(now);
    expect(n.status).toBe('processing');
  });

  it('vai para dead_lettered a partir de failed', () => {
    const n = queued();
    n.markProcessing(now);
    n.markFailed(now);
    n.deadLetter(now);
    expect(n.status).toBe('dead_lettered');
  });

  it('rejeita transição inválida (queued -> delivered)', () => {
    const n = queued();
    expect(() => n.markDelivered(now)).toThrow(InvalidStateTransitionError);
  });

  it('é imutável a partir de estado terminal', () => {
    const n = queued();
    n.markProcessing(now);
    n.markDelivered(now);
    expect(() => n.markProcessing(now)).toThrow(InvalidStateTransitionError);
  });

  it('restore reconstrói o mesmo snapshot', () => {
    const snapshot = queued().toSnapshot();
    expect(Notification.restore(snapshot).toSnapshot()).toEqual(snapshot);
  });
});
