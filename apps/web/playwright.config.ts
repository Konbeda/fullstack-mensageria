import { defineConfig, devices } from '@playwright/test';

const DATABASE_URL = 'postgres://mensageria:mensageria@localhost:5432/mensageria';
const REDIS_URL = 'redis://localhost:6379';
const RABBITMQ_URL = 'amqp://mensageria:mensageria@localhost:5672';
const MONGO_URL = 'mongodb://localhost:27017';
const API_URL = 'http://127.0.0.1:3000';
const WEB_URL = 'http://127.0.0.1:5173';

// Sobe API + worker + SPA contra a infra local (pnpm infra:up antes de rodar).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: WEB_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @mensageria/api exec tsx src/main.ts',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL,
        REDIS_URL,
        RABBITMQ_URL,
        PORT: '3000',
        HOST: '127.0.0.1',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: 'pnpm --filter @mensageria/worker exec tsx src/main.ts',
      url: 'http://127.0.0.1:3100/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL,
        RABBITMQ_URL,
        MONGO_URL,
        MONGO_DB: 'mensageria',
        HEALTH_PORT: '3100',
        PROVIDER_FAILURE_RATE: '0',
        MAX_ATTEMPTS: '2',
        RETRY_BASE_MS: '300',
        RETRY_MAX_MS: '600',
      },
    },
    {
      command: 'pnpm --filter @mensageria/web exec vite --port 5173 --host 127.0.0.1',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
