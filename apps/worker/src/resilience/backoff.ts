export function exponentialBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  random: () => number = Math.random,
): number {
  const capped = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  // Jitter de até 20% evita retries sincronizados (thundering herd).
  const withJitter = capped + random() * capped * 0.2;
  return Math.round(Math.min(maxMs, withJitter));
}
