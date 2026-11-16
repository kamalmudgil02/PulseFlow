import { Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Redis connection service.
 *
 * Provides Redis connectivity for health checks and future queue operations.
 * Connection parameters are loaded from environment configuration.
 *
 * Redis configuration follows Phase 3 Revision 4 approved bounded resource settings:
 * - connectTimeout: 3000ms
 * - commandTimeout: 3000ms
 * - maxRetriesPerRequest: 1
 * - lazyConnect: true
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private client: Redis;

  constructor() {
    const redisUrl = process.env['REDIS_URL'];

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    this.client = new Redis(redisUrl, {
      connectTimeout: 3000,
      commandTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  /**
   * Check Redis connectivity.
   *
   * Executes PING with bounded timeout as specified in Phase 3 Revision 4.
   *
   * @returns true if Redis is reachable, false otherwise
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Ensure connection is established if lazyConnect was used
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get the underlying ioredis client for future application operations.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Graceful shutdown: close the Redis connection.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }
}
