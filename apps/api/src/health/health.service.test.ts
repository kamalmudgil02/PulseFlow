import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dependencyStatus } from '@pulseflow/shared';
import { HealthService } from './health.service.js';
import type { PostgresService } from '../infrastructure/postgres/postgres.service.js';
import type { RedisService } from '../infrastructure/redis/redis.service.js';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

// Mock infrastructure services
class MockPostgresService implements Pick<
  PostgresService,
  'checkHealth' | 'onApplicationShutdown' | 'getPool'
> {
  constructor(private healthy: boolean) {}
  async checkHealth(): Promise<boolean> {
    return this.healthy;
  }
  async onApplicationShutdown(): Promise<void> {}
  getPool(): Pool {
    return {} as Pool;
  }
}

class MockRedisService implements Pick<
  RedisService,
  'checkHealth' | 'onApplicationShutdown' | 'getClient'
> {
  constructor(private healthy: boolean) {}
  async checkHealth(): Promise<boolean> {
    return this.healthy;
  }
  async onApplicationShutdown(): Promise<void> {}
  getClient(): Redis {
    return {} as Redis;
  }
}

describe('HealthService', () => {
  it('returns liveness report without checking dependencies', () => {
    const postgresService = new MockPostgresService(false);
    const redisService = new MockRedisService(false);
    const healthService = new HealthService(
      postgresService as unknown as PostgresService,
      redisService as unknown as RedisService,
    );

    const report = healthService.getLiveness();

    assert.equal(report.status, dependencyStatus.ok);
  });

  it('returns healthy readiness when both PostgreSQL and Redis are available', async () => {
    const postgresService = new MockPostgresService(true);
    const redisService = new MockRedisService(true);
    const healthService = new HealthService(
      postgresService as unknown as PostgresService,
      redisService as unknown as RedisService,
    );

    const report = await healthService.getReadiness();

    assert.equal(report.status, dependencyStatus.ok);
    assert.equal(report.checks.database, dependencyStatus.ok);
    assert.equal(report.checks.redis, dependencyStatus.ok);
  });

  it('returns error status when PostgreSQL is unavailable', async () => {
    const postgresService = new MockPostgresService(false);
    const redisService = new MockRedisService(true);
    const healthService = new HealthService(
      postgresService as unknown as PostgresService,
      redisService as unknown as RedisService,
    );

    const report = await healthService.getReadiness();

    assert.equal(report.status, dependencyStatus.error);
    assert.equal(report.checks.database, dependencyStatus.error);
    assert.equal(report.checks.redis, dependencyStatus.ok);
  });

  it('returns error status when Redis is unavailable', async () => {
    const postgresService = new MockPostgresService(true);
    const redisService = new MockRedisService(false);
    const healthService = new HealthService(
      postgresService as unknown as PostgresService,
      redisService as unknown as RedisService,
    );

    const report = await healthService.getReadiness();

    assert.equal(report.status, dependencyStatus.error);
    assert.equal(report.checks.database, dependencyStatus.ok);
    assert.equal(report.checks.redis, dependencyStatus.error);
  });

  it('returns error status when both dependencies are unavailable', async () => {
    const postgresService = new MockPostgresService(false);
    const redisService = new MockRedisService(false);
    const healthService = new HealthService(
      postgresService as unknown as PostgresService,
      redisService as unknown as RedisService,
    );

    const report = await healthService.getReadiness();

    assert.equal(report.status, dependencyStatus.error);
    assert.equal(report.checks.database, dependencyStatus.error);
    assert.equal(report.checks.redis, dependencyStatus.error);
  });
});
