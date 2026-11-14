import { z } from 'zod';

export const nodeEnvironments = [
  'development',
  'test',
  'staging',
  'production',
] as const;

export type NodeEnvironment = (typeof nodeEnvironments)[number];

export const logLevels = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
] as const;

export type LogLevel = (typeof logLevels)[number];

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(nodeEnvironments).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
