import { Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';

const { Pool } = pg;

/**
 * PostgreSQL connection pool service.
 *
 * Provides database connectivity for health checks and future application queries.
 * Connection parameters are loaded from environment configuration.
 *
 * Pool configuration follows Phase 3 Revision 4 approved bounded resource settings:
 * - max: 3 connections
 * - connectionTimeoutMillis: 3000ms
 * - statement_timeout: 3000ms
 * - query_timeout: 3000ms
 * - idleTimeoutMillis: 10000ms
 */
@Injectable()
export class PostgresService implements OnApplicationShutdown {
  private pool: pg.Pool;

  constructor() {
    const databaseUrl = process.env['DATABASE_URL'];

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 3,
      connectionTimeoutMillis: 3000,
      statement_timeout: 3000,
      query_timeout: 3000,
      idleTimeoutMillis: 10000,
    });
  }

  /**
   * Check database connectivity.
   *
   * Executes SELECT 1 with bounded timeout as specified in Phase 3 Revision 4.
   *
   * @returns true if database is reachable, false otherwise
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the underlying pg.Pool instance for future application queries.
   */
  getPool(): pg.Pool {
    return this.pool;
  }

  /**
   * Graceful shutdown: close the connection pool.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
