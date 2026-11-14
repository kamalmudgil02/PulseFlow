import { z } from 'zod';

export const redisEnvSchema = z.object({
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type RedisEnv = z.infer<typeof redisEnvSchema>;
