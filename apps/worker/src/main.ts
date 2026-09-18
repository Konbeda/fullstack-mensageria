import { loadEnv } from './config/env.js';
import { startWorker } from './composition-root.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const worker = await startWorker(env);
  console.log('worker consumindo a fila de entregas');

  const shutdown = (signal: string): void => {
    console.log(`encerrando worker (${signal})`);
    void worker
      .dispose()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        console.error('erro ao encerrar', err);
        process.exit(1);
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
