import { Injectable } from '@nestjs/common';
import {
  livenessReport,
  readinessReport,
  dependencyStatus,
} from '@pulseflow/shared';
import type {
  LivenessReport,
  ReadinessReport,
  InfrastructureChecks,
} from '@pulseflow/shared';
import { PostgresService } from '../infrastructure/postgres/postgres.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';

/**
 * Health check service.
 *
 * Implements liveness and readiness logic using @pulseflow/shared health report contracts.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Liveness check.
   *
   * Reports that the process is running without checking infrastructure dependencies.
   *
   * @returns Liveness health report
   */
  getLiveness(): LivenessReport {
    return livenessReport();
  }

  /**
   * Readiness check.
   *
   * Concurrently checks PostgreSQL and Redis connectivity with bounded timeouts.
   * Both dependencies must be healthy for the overall status to be healthy.
   *
   * Uses Promise.allSettled to ensure both checks complete independently.
   *
   * @returns Readiness health report
   */
  async getReadiness(): Promise<ReadinessReport> {
    const [postgresResult, redisResult] = await Promise.allSettled([
      this.postgresService.checkHealth(),
      this.redisService.checkHealth(),
    ]);

    const postgresHealthy =
      postgresResult.status === 'fulfilled' && postgresResult.value === true;
    const redisHealthy =
      redisResult.status === 'fulfilled' && redisResult.value === true;

    const checks: InfrastructureChecks = {
      database: postgresHealthy ? dependencyStatus.ok : dependencyStatus.error,
      redis: redisHealthy ? dependencyStatus.ok : dependencyStatus.error,
    };

    return readinessReport(checks);
  }
}
