import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQueueName } from './queue-name.js';

describe('buildQueueName', () => {
  it('prefixes the platform namespace', () => {
    assert.equal(
      buildQueueName('production', 'email-delivery'),
      'pulseflow:production:email-delivery',
    );
  });

  it('rejects segments that could change the namespace', () => {
    const rejected = ['', 'Production', 'prod:extra', '../queue', '-email', 'email-'];

    for (const segment of rejected) {
      assert.throws(
        () => buildQueueName(segment, 'email'),
        /Invalid queue name segment: environment/,
      );
      assert.throws(
        () => buildQueueName('production', segment),
        /Invalid queue name segment: queueId/,
      );
    }
  });
});
