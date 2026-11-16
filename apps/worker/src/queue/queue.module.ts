import { Module } from '@nestjs/common';

/**
 * Queue module.
 *
 * Placeholder for future BullMQ worker registration and job processor implementation.
 *
 * This module establishes the BullMQ integration boundary but does not instantiate
 * Worker instances or create additional Redis connections in this scaffold.
 *
 * Future implementation will:
 * - Create BullMQ-compatible Redis connection (maxRetriesPerRequest: null)
 * - Instantiate BullMQ Worker instances
 * - Register job processor handlers
 * - Configure worker concurrency from WORKER_CONCURRENCY environment variable
 * - Use buildQueueName(environment, queueId) from @pulseflow/shared
 */
@Module({
  providers: [],
})
// NestJS module pattern: the class body is intentionally empty
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class QueueModule {}
