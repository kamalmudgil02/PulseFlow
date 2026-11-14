import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateApiEnv, validateWebEnv, validateWorkerEnv } from './index.js';

describe('@pulseflow/config environment validation', () => {
  const validWebEnv = {
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    PORT: '3000',
    NEXT_PUBLIC_APP_URL: 'https://app.pulseflow.dev',
    NEXT_PUBLIC_API_URL: 'https://api.pulseflow.dev',
  };

  const validApiEnv = {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    PORT: '4000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/pulseflow',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'super-secret-jwt-key-that-is-at-least-32-chars-long!',
    CORS_ORIGIN: 'https://app.pulseflow.dev',
  };

  const validWorkerEnv = {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/pulseflow',
    REDIS_URL: 'redis://localhost:6379',
    WORKER_CONCURRENCY: '16',
  };

  describe('Web environment', () => {
    it('validates a valid Web environment without database or redis configuration', () => {
      const parsed = validateWebEnv(validWebEnv);

      assert.equal(parsed.NODE_ENV, 'production');
      assert.equal(parsed.LOG_LEVEL, 'warn');
      assert.equal(parsed.PORT, 3000);
      assert.equal(parsed.NEXT_PUBLIC_APP_URL, 'https://app.pulseflow.dev');
      assert.equal(parsed.NEXT_PUBLIC_API_URL, 'https://api.pulseflow.dev');
      assert.equal('DATABASE_URL' in parsed, false);
      assert.equal('REDIS_URL' in parsed, false);
    });

    it('applies default PORT and base settings when omitted', () => {
      const parsed = validateWebEnv({
        NEXT_PUBLIC_APP_URL: 'https://app.pulseflow.dev',
        NEXT_PUBLIC_API_URL: 'https://api.pulseflow.dev',
      });

      assert.equal(parsed.NODE_ENV, 'development');
      assert.equal(parsed.LOG_LEVEL, 'info');
      assert.equal(parsed.PORT, 3000);
    });

    it('fails when required public URLs are missing', () => {
      assert.throws(
        () => validateWebEnv({ PORT: '3000' }),
        /Invalid Web environment.*NEXT_PUBLIC_APP_URL/,
      );
    });

    it('fails when public URLs are malformed', () => {
      assert.throws(
        () =>
          validateWebEnv({
            ...validWebEnv,
            NEXT_PUBLIC_APP_URL: 'not-a-valid-url',
          }),
        /Invalid Web environment.*NEXT_PUBLIC_APP_URL/,
      );
    });
  });

  describe('API environment', () => {
    it('validates a complete valid API environment', () => {
      const parsed = validateApiEnv(validApiEnv);

      assert.equal(parsed.PORT, 4000);
      assert.equal(
        parsed.DATABASE_URL,
        'postgresql://user:pass@localhost:5432/pulseflow',
      );
      assert.equal(parsed.REDIS_URL, 'redis://localhost:6379');
      assert.equal(
        parsed.JWT_SECRET,
        'super-secret-jwt-key-that-is-at-least-32-chars-long!',
      );
      assert.equal(parsed.CORS_ORIGIN, 'https://app.pulseflow.dev');
      assert.equal(parsed.DATABASE_POOL_MIN, 2);
      assert.equal(parsed.DATABASE_POOL_MAX, 10);
    });

    it('fails when DATABASE_URL is missing', () => {
      const withoutDb: Record<string, unknown> = { ...validApiEnv };
      delete withoutDb.DATABASE_URL;
      assert.throws(
        () => validateApiEnv(withoutDb),
        /Invalid API environment.*DATABASE_URL/,
      );
    });

    it('fails when REDIS_URL is missing', () => {
      const withoutRedis: Record<string, unknown> = { ...validApiEnv };
      delete withoutRedis.REDIS_URL;
      assert.throws(
        () => validateApiEnv(withoutRedis),
        /Invalid API environment.*REDIS_URL/,
      );
    });

    it('fails when JWT_SECRET is shorter than 32 characters', () => {
      assert.throws(
        () =>
          validateApiEnv({
            ...validApiEnv,
            JWT_SECRET: 'too-short',
          }),
        /Invalid API environment.*JWT_SECRET/,
      );
    });

    it('fails when PORT is invalid', () => {
      assert.throws(
        () =>
          validateApiEnv({
            ...validApiEnv,
            PORT: '-1',
          }),
        /Invalid API environment.*PORT/,
      );
    });
  });

  describe('Worker environment', () => {
    it('validates a complete valid Worker environment', () => {
      const parsed = validateWorkerEnv(validWorkerEnv);

      assert.equal(parsed.WORKER_CONCURRENCY, 16);
      assert.equal(
        parsed.DATABASE_URL,
        'postgresql://user:pass@localhost:5432/pulseflow',
      );
      assert.equal(parsed.REDIS_URL, 'redis://localhost:6379');
      assert.equal('PORT' in parsed, false);
    });

    it('fails when DATABASE_URL is missing', () => {
      const withoutDb: Record<string, unknown> = { ...validWorkerEnv };
      delete withoutDb.DATABASE_URL;
      assert.throws(
        () => validateWorkerEnv(withoutDb),
        /Invalid Worker environment.*DATABASE_URL/,
      );
    });

    it('fails when REDIS_URL is missing', () => {
      const withoutRedis: Record<string, unknown> = { ...validWorkerEnv };
      delete withoutRedis.REDIS_URL;
      assert.throws(
        () => validateWorkerEnv(withoutRedis),
        /Invalid Worker environment.*REDIS_URL/,
      );
    });

    it('fails when WORKER_CONCURRENCY is non-positive or invalid', () => {
      assert.throws(
        () =>
          validateWorkerEnv({
            ...validWorkerEnv,
            WORKER_CONCURRENCY: '0',
          }),
        /Invalid Worker environment.*WORKER_CONCURRENCY/,
      );

      assert.throws(
        () =>
          validateWorkerEnv({
            ...validWorkerEnv,
            WORKER_CONCURRENCY: '-5',
          }),
        /Invalid Worker environment.*WORKER_CONCURRENCY/,
      );
    });

    it('does not require PORT for Worker application', () => {
      const withoutPort = { ...validWorkerEnv };
      const parsed = validateWorkerEnv(withoutPort);
      assert.equal('PORT' in parsed, false);
    });
  });

  describe('General constraints and secret protection', () => {
    it('fails when NODE_ENV is invalid', () => {
      assert.throws(
        () =>
          validateWebEnv({
            ...validWebEnv,
            NODE_ENV: 'invalid-env',
          }),
        /Invalid Web environment.*NODE_ENV/,
      );
    });

    it('fails when LOG_LEVEL is invalid', () => {
      assert.throws(
        () =>
          validateApiEnv({
            ...validApiEnv,
            LOG_LEVEL: 'verbose-not-allowed',
          }),
        /Invalid API environment.*LOG_LEVEL/,
      );
    });

    it('does not disclose supplied secret values in validation error messages', () => {
      const leakedSecret = 'my-super-secret-token-12345';

      try {
        validateApiEnv({
          ...validApiEnv,
          JWT_SECRET: leakedSecret, // fails because it is < 32 characters
        });
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error instanceof Error);
        assert.equal(error.message.includes(leakedSecret), false);
        assert.match(error.message, /JWT_SECRET/);
      }
    });
  });
});
