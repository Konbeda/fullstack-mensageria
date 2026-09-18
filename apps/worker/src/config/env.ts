import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  MONGO_URL: z.string().url(),
  MONGO_DB: z.string().default('mensageria'),
  HEALTH_PORT: z.coerce.number().int().positive().default(3100),
  PREFETCH: z.coerce.number().int().positive().default(10),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RETRY_BASE_MS: z.coerce.number().int().positive().default(1000),
  RETRY_MAX_MS: z.coerce.number().int().positive().default(60_000),
  CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(5),
  CIRCUIT_RESET_MS: z.coerce.number().int().positive().default(15_000),
  PROVIDER_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`configuração de ambiente inválida: ${issues}`);
  }
  return parsed.data;
}
