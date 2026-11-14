import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQueueName } from './queue-name.js';

describe('buildQueueName', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('prefixes the platform namespace for a canonical environment and queueId', () => {
    assert.equal(
      buildQueueName('production', validUuid),
      `pulseflow:production:${validUuid}`,
    );
  });

  it('supports hyphenated canonical environment names', () => {
    assert.equal(
      buildQueueName('prod-us-east-1', validUuid),
      `pulseflow:prod-us-east-1:${validUuid}`,
    );
    assert.equal(
      buildQueueName('staging-eu', validUuid),
      `pulseflow:staging-eu:${validUuid}`,
    );
  });

  it('rejects invalid, uppercase, whitespace-padded, or delimiter-injected environments', () => {
    const invalidEnvironments = [
      '',
      ' ',
      'Production',
      'DEVELOPMENT',
      ' prod',
      'prod ',
      ' prod ',
      'prod:extra',
      'prod/extra',
      'prod.extra',
      '-production',
      'production-',
      'prod--extra',
      'a'.repeat(64),
    ];

    for (const env of invalidEnvironments) {
      assert.throws(
        () => buildQueueName(env, validUuid),
        /Invalid queue name segment: environment/,
      );
    }
  });

  it('rejects customer-provided queue names as queue IDs', () => {
    const customerQueueNames = [
      'default',
      'email-delivery',
      'high-priority',
      'jobs',
      'queue_123',
    ];

    for (const name of customerQueueNames) {
      assert.throws(
        () => buildQueueName('production', name),
        /Invalid queue name segment: queueId/,
      );
    }
  });

  it('rejects non-canonical, uppercase, whitespace-padded, or malformed UUIDs', () => {
    const invalidUuids = [
      '',
      ' ',
      '123E4567-E89B-12D3-A456-426614174000',
      '123e4567-e89b-12D3-a456-426614174000',
      ` ${validUuid}`,
      `${validUuid} `,
      ` ${validUuid} `,
      `${validUuid}:extra`,
      `${validUuid}/extra`,
      '123e4567e89b12d3a456426614174000',
      '123e4567-e89b-12d3-a456',
      `${validUuid}1`,
      'g23e4567-e89b-12d3-a456-426614174000',
    ];

    for (const id of invalidUuids) {
      assert.throws(
        () => buildQueueName('production', id),
        /Invalid queue name segment: queueId/,
      );
    }
  });
});
