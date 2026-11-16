import 'reflect-metadata';
import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { validateWorkerEnv } from '@pulseflow/config';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the NestJS Worker application.
 *
 * Configuration:
 * - Loads environment variables from repository root .env file
 * - Validates environment using @pulseflow/config Worker schema
 * - Enables graceful shutdown hooks
 * - Listens on hardcoded port 4001 for health endpoints
 *
 * Follows Phase 3 Step 4 approved bootstrap pattern with explicit dotenv loading.
 */
async function bootstrap(): Promise<void> {
  // Load environment variables from repository root
  // import.meta.dirname resolves to apps/worker/dist/ after compilation
  // Repository root is three directories up: ../../..
  const monorepoRoot = path.resolve(import.meta.dirname, '../../../');
  dotenv.config({ path: path.join(monorepoRoot, '.env') });

  // Validate environment using @pulseflow/config
  const env = validateWorkerEnv();

  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Enable graceful shutdown hooks for onApplicationShutdown lifecycle
  app.enableShutdownHooks();

  // Start listening on hardcoded port 4001
  const port = 4001;
  await app.listen(port);

  console.log(`🚀 Worker application is running on http://localhost:${port}`);
  console.log(`📊 Health endpoints:`);
  console.log(`   - Liveness:  http://localhost:${port}/health/live`);
  console.log(`   - Readiness: http://localhost:${port}/health/ready`);
  console.log(`⚙️  Worker concurrency: ${env.WORKER_CONCURRENCY}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Worker application:', error);
  process.exit(1);
});
