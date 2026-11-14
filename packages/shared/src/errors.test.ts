import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createErrorContract, errorCodes } from './errors.js';

describe('createErrorContract', () => {
  it('returns a trimmed error contract', () => {
    const contract = createErrorContract(
      errorCodes.invalidConfiguration,
      '  Invalid environment. Check: DATABASE_URL  ',
    );

    assert.deepEqual(contract, {
      code: 'invalid_configuration',
      message: 'Invalid environment. Check: DATABASE_URL',
    });
  });

  it('rejects an empty message', () => {
    assert.throws(
      () => createErrorContract(errorCodes.invalidQueueName, '   '),
      /Error message must be between 1 and 200 characters/,
    );
  });
});
