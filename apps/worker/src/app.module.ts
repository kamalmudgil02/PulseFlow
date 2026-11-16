import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { QueueModule } from './queue/queue.module.js';

/**
 * Root application module.
 *
 * Imports the health module for liveness and readiness endpoints.
 * Imports the queue module for future BullMQ worker registration.
 */
@Module({
  imports: [HealthModule, QueueModule],
})
// NestJS module pattern: the class body is intentionally empty
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
