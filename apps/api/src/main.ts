import { loadEnv } from './config/env.js';
import { createContainer } from './composition-root.js';
import { buildServer } from './http/server.js';
import { startMetricsServer } from './metrics-server.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const container = await createContainer(env);
  const app = buildServer(container.deps, {
    logger: { level: env.LOG_LEVEL },
    metrics: container.metrics,
    ...(env.API_KEY ? { apiKey: env.API_KEY } : {}),
    ...(env.CORS_ORIGIN ? { corsOrigin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) } : {}),
    rateLimit: {
      redis: container.redis,
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
    },
  });

  // Métricas numa porta interna separada, fora da superfície pública da API.
  const metricsServer = startMetricsServer(env.METRICS_PORT, container.metrics, env.METRICS_TOKEN);

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, 'encerrando aplicação');
    metricsServer.close();
    void app
      .close()
      .then(() => container.dispose())
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        app.log.error({ err }, 'erro ao encerrar');
        process.exit(1);
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
