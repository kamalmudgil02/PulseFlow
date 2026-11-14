import { z } from 'zod';
import { baseEnvSchema } from './base.js';
import { databaseEnvSchema } from './database.js';
import { redisEnvSchema } from './redis.js';

export const workerEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .extend({
    WORKER_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive('WORKER_CONCURRENCY must be a positive integer')
      .default(10),
  });

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
