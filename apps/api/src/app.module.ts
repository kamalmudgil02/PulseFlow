import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';

/**
 * Root application module.
 *
 * Imports the health module for liveness and readiness endpoints.
 * Future domain modules will be registered here.
 */
@Module({
  imports: [HealthModule],
})
// NestJS module pattern: the class body is intentionally empty
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
