import { z } from 'zod';
import { baseEnvSchema } from './base.js';

export const webEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3000),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
