import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { dependencyStatus } from '@pulseflow/shared';
import { HealthService } from './health.service.js';

/**
 * Health check endpoints.
 *
 * Provides liveness and readiness probes following Kubernetes health check patterns.
 *
 * GET /health/live  - Liveness check (process is running, no dependency checks)
 * GET /health/ready - Readiness check (PostgreSQL and Redis connectivity)
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness probe.
   *
   * Returns HTTP 200 if the process is running.
   * Does not check PostgreSQL or Redis connectivity as specified in Phase 3 Step 4.
   *
   * @returns Liveness report
   */
  @Get('live')
  async getLiveness(@Res() res: Response): Promise<void> {
    const report = this.healthService.getLiveness();

    res.status(HttpStatus.OK).json(report);
  }

  /**
   * Readiness probe.
   *
   * Returns HTTP 200 if both PostgreSQL and Redis are healthy.
   * Returns HTTP 503 if either dependency is unavailable.
   *
   * Checks run concurrently with bounded timeouts as specified in Phase 3 Revision 4.
   *
   * @returns Readiness report
   */
  @Get('ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    const report = await this.healthService.getReadiness();

    const statusCode =
      report.status === dependencyStatus.ok
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(report);
  }
}
