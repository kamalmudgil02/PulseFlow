import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { PostgresService } from '../infrastructure/postgres/postgres.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';

/**
 * Health check module.
 *
 * Provides liveness and readiness endpoints with PostgreSQL and Redis connectivity checks.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService, PostgresService, RedisService],
})
// NestJS module pattern: the class body is intentionally empty
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HealthModule {}
