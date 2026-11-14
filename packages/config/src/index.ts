import { createErrorContract, errorCodes } from '@pulseflow/shared';
import type { ZodType } from 'zod';

import { apiEnvSchema, type ApiEnv } from './api.js';
import { webEnvSchema, type WebEnv } from './web.js';
import { workerEnvSchema, type WorkerEnv } from './worker.js';

export {
  baseEnvSchema,
  logLevels,
  nodeEnvironments,
  type BaseEnv,
  type LogLevel,
  type NodeEnvironment,
} from './base.js';
export { databaseEnvSchema, type DatabaseEnv } from './database.js';
export { redisEnvSchema, type RedisEnv } from './redis.js';
export { webEnvSchema, type WebEnv } from './web.js';
export { apiEnvSchema, type ApiEnv } from './api.js';
export { workerEnvSchema, type WorkerEnv } from './worker.js';

const maxErrorMessageLength = 200;

function parseEnvironment<T>(
  schema: ZodType<T>,
  targetLabel: string,
  rawEnv: unknown,
): T {
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
      })
      .join('; ');

    const fullMessage = `Invalid ${targetLabel} environment: ${errorDetails}`;
    const truncatedMessage =
      fullMessage.length > maxErrorMessageLength
        ? `${fullMessage.slice(0, maxErrorMessageLength - 3)}...`
        : fullMessage;

    throw new Error(
      createErrorContract(errorCodes.invalidConfiguration, truncatedMessage)
        .message,
    );
  }

  return result.data;
}

export function validateWebEnv(env: unknown = process.env): WebEnv {
  return parseEnvironment(webEnvSchema, 'Web', env);
}

export function validateApiEnv(env: unknown = process.env): ApiEnv {
  return parseEnvironment(apiEnvSchema, 'API', env);
}

export function validateWorkerEnv(env: unknown = process.env): WorkerEnv {
  return parseEnvironment(workerEnvSchema, 'Worker', env);
}
