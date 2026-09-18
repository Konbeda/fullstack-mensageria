import { describe, expect, it } from 'vitest';
import { createMetrics } from './metrics.js';

describe('createMetrics', () => {
  it('registra os contadores de domínio e expõe o texto Prometheus', async () => {
    const metrics = createMetrics();
    metrics.enqueued.inc({ channel: 'email' });
    metrics.delivered.inc({ channel: 'email' });

    const text = await metrics.registry.metrics();
    expect(text).toContain('notifications_enqueued_total');
    expect(text).toContain('notifications_delivered_total');
    expect(text).toContain('notification_delivery_duration_seconds');
  });

  it('isola registries entre instâncias', () => {
    expect(createMetrics().registry).not.toBe(createMetrics().registry);
  });
});
