import { describe, expect, it } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker.js';

function failing(): Promise<never> {
  return Promise.reject(new Error('falha'));
}

describe('CircuitBreaker', () => {
  it('abre após atingir o limite de falhas', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 1000, now: () => 0 });

    for (let i = 0; i < 3; i += 1) {
      await expect(cb.execute(failing)).rejects.toThrow('falha');
    }

    expect(cb.currentState).toBe('open');
    await expect(cb.execute(() => Promise.resolve('x'))).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('vai para half_open após o cooldown e fecha em caso de sucesso', async () => {
    let clock = 0;
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 1000, now: () => clock });

    await expect(cb.execute(failing)).rejects.toThrow();
    expect(cb.currentState).toBe('open');

    clock = 1000;
    expect(cb.currentState).toBe('half_open');
    await expect(cb.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(cb.currentState).toBe('closed');
  });

  it('reabre se a sondagem em half_open falhar', async () => {
    let clock = 0;
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 1000, now: () => clock });

    await expect(cb.execute(failing)).rejects.toThrow();
    clock = 1000;
    await expect(cb.execute(failing)).rejects.toThrow('falha');
    expect(cb.currentState).toBe('open');
  });

  it('zera o contador de falhas após um sucesso', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetMs: 1000, now: () => 0 });

    await expect(cb.execute(failing)).rejects.toThrow();
    await expect(cb.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    await expect(cb.execute(failing)).rejects.toThrow();
    expect(cb.currentState).toBe('closed');
  });
});
