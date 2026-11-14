import { z } from 'zod';
import { baseEnvSchema } from './base.js';
import { databaseEnvSchema } from './database.js';
import { redisEnvSchema } from './redis.js';

export const apiEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .extend({
    PORT: z.coerce.number().int().positive().default(4000),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters for security'),
    CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN must not be empty'),
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;
