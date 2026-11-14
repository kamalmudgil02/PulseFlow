import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dependencyStatus,
  livenessReport,
  readinessReport,
} from './health.js';

describe('health reports', () => {
  it('reports the process as live without checking infrastructure', () => {
    assert.deepEqual(livenessReport(), { status: 'ok' });
  });

  it('is ready only when database and redis are both available', () => {
    assert.equal(
      readinessReport({
        database: dependencyStatus.ok,
        redis: dependencyStatus.ok,
      }).status,
      'ok',
    );

    assert.equal(
      readinessReport({
        database: dependencyStatus.error,
        redis: dependencyStatus.ok,
      }).status,
      'error',
    );
    assert.equal(
      readinessReport({
        database: dependencyStatus.ok,
        redis: dependencyStatus.error,
      }).status,
      'error',
    );
  });

  it('copies check results so later mutation does not change the report', () => {
    const checks = {
      database: dependencyStatus.ok,
      redis: dependencyStatus.ok,
    };
    const report = readinessReport(checks);

    checks.database = dependencyStatus.error;

    assert.equal(report.checks.database, 'ok');
  });
});
