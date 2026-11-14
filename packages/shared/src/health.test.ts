import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dependencyStatus,
  livenessReport,
  readinessReport,
  type InfrastructureChecks,
} from './health.js';

describe('health reports', () => {
  it('reports the process as live without checking infrastructure', () => {
    assert.deepEqual(livenessReport(), { status: 'ok' });
  });

  it('reports ready when database and redis are both available', () => {
    const checks: InfrastructureChecks = {
      database: dependencyStatus.ok,
      redis: dependencyStatus.ok,
    };
    const report = readinessReport(checks);

    assert.equal(report.status, 'ok');
    assert.deepEqual(report.checks, {
      database: 'ok',
      redis: 'ok',
    });
  });

  it('reports error when database is failing but redis is healthy', () => {
    const checks: InfrastructureChecks = {
      database: dependencyStatus.error,
      redis: dependencyStatus.ok,
    };
    const report = readinessReport(checks);

    assert.equal(report.status, 'error');
    assert.deepEqual(report.checks, {
      database: 'error',
      redis: 'ok',
    });
  });

  it('reports error when redis is failing but database is healthy', () => {
    const checks: InfrastructureChecks = {
      database: dependencyStatus.ok,
      redis: dependencyStatus.error,
    };
    const report = readinessReport(checks);

    assert.equal(report.status, 'error');
    assert.deepEqual(report.checks, {
      database: 'ok',
      redis: 'error',
    });
  });

  it('reports error when both database and redis are failing', () => {
    const checks: InfrastructureChecks = {
      database: dependencyStatus.error,
      redis: dependencyStatus.error,
    };
    const report = readinessReport(checks);

    assert.equal(report.status, 'error');
    assert.deepEqual(report.checks, {
      database: 'error',
      redis: 'error',
    });
  });

  it('copies check results so later caller mutation does not change the report', () => {
    const checks: InfrastructureChecks = {
      database: dependencyStatus.ok,
      redis: dependencyStatus.ok,
    };
    const report = readinessReport(checks);

    checks.database = dependencyStatus.error;

    assert.equal(report.checks.database, 'ok');
  });
});
