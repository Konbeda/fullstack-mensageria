export type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitOpenError extends Error {
  constructor() {
    super('circuit breaker aberto');
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetMs: number;
  now?: () => number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? (() => Date.now());
  }

  get currentState(): CircuitState {
    return this.resolveState();
  }

  // Após o cooldown, um breaker aberto passa a permitir uma tentativa de sondagem.
  private resolveState(): CircuitState {
    if (this.state === 'open' && this.now() - this.openedAt >= this.options.resetMs) {
      return 'half_open';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.resolveState();
    if (state === 'open') throw new CircuitOpenError();
    this.state = state;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    if (this.state === 'half_open') {
      this.open();
      return;
    }
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) this.open();
  }

  private open(): void {
    this.state = 'open';
    this.openedAt = this.now();
  }
}

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly factory: () => CircuitBreaker) {}

  for(key: string): CircuitBreaker {
    const existing = this.breakers.get(key);
    if (existing) return existing;
    const created = this.factory();
    this.breakers.set(key, created);
    return created;
  }
}
