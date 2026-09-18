import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // Compila os pacotes do workspace (TS) para dentro do bundle...
  noExternal: [/@mensageria\//],
  // ...mas mantém as libs de terceiros externas (resolvidas do node_modules em runtime).
  external: [
    'fastify',
    '@fastify/cors',
    'zod',
    'pg',
    'kysely',
    'ioredis',
    'amqplib',
    'mongodb',
    'pino',
    'prom-client',
  ],
});
