import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Segurança (todas opcionais: sem valor, o controle roda em modo permissivo de dev).
  API_KEY: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  METRICS_PORT: z.coerce.number().int().positive().default(9464),
  METRICS_TOKEN: z.string().min(1).optional(),
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
