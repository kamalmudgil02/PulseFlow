import 'reflect-metadata';
import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { validateApiEnv } from '@pulseflow/config';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the NestJS API application.
 *
 * Configuration:
 * - Loads environment variables from repository root .env file
 * - Validates environment using @pulseflow/config API schema
 * - Enables graceful shutdown hooks
 * - Listens on PORT from environment (default 3000)
 *
 * Follows Phase 3 Step 3 approved bootstrap pattern with explicit dotenv loading.
 */
async function bootstrap(): Promise<void> {
  // Load environment variables from repository root
  // import.meta.dirname resolves to apps/api/dist/ after compilation
  // Repository root is three directories up: ../../..
  const monorepoRoot = path.resolve(import.meta.dirname, '../../../');
  dotenv.config({ path: path.join(monorepoRoot, '.env') });

  // Validate environment using @pulseflow/config
  const env = validateApiEnv();

  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Enable graceful shutdown hooks for onApplicationShutdown lifecycle
  app.enableShutdownHooks();

  // Start listening
  const port = env.PORT;
  await app.listen(port);

  console.log(`🚀 API application is running on http://localhost:${port}`);
  console.log(`📊 Health endpoints:`);
  console.log(`   - Liveness:  http://localhost:${port}/health/live`);
  console.log(`   - Readiness: http://localhost:${port}/health/ready`);
}

bootstrap().catch((error) => {
  console.error('Failed to start API application:', error);
  process.exit(1);
});
