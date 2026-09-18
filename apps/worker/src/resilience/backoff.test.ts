import { describe, expect, it } from 'vitest';
import { exponentialBackoff } from './backoff.js';

describe('exponentialBackoff', () => {
  it('cresce exponencialmente a partir da base (sem jitter)', () => {
    const noJitter = () => 0;
    expect(exponentialBackoff(1, 1000, 60_000, noJitter)).toBe(1000);
    expect(exponentialBackoff(2, 1000, 60_000, noJitter)).toBe(2000);
    expect(exponentialBackoff(3, 1000, 60_000, noJitter)).toBe(4000);
  });

  it('respeita o teto máximo', () => {
    expect(exponentialBackoff(20, 1000, 60_000, () => 1)).toBeLessThanOrEqual(60_000);
  });

  it('adiciona jitter dentro do limite de 20%', () => {
    const value = exponentialBackoff(2, 1000, 60_000, () => 1);
    expect(value).toBeGreaterThanOrEqual(2000);
    expect(value).toBeLessThanOrEqual(2400);
  });
});
