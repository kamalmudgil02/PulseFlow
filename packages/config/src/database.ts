import { z } from 'zod';

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
