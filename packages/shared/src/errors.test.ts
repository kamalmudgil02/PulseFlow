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

  it('accepts a valid message at minimum boundary length of 1 character', () => {
    const contract = createErrorContract(errorCodes.invalidQueueName, 'x');

    assert.deepEqual(contract, {
      code: 'invalid_queue_name',
      message: 'x',
    });
  });

  it('accepts a valid message at maximum boundary length of 200 characters', () => {
    const message = 'a'.repeat(200);
    const contract = createErrorContract(
      errorCodes.invalidConfiguration,
      message,
    );

    assert.equal(contract.message.length, 200);
    assert.equal(contract.code, 'invalid_configuration');
  });

  it('rejects an empty message', () => {
    assert.throws(
      () => createErrorContract(errorCodes.invalidQueueName, ''),
      /Error message must be between 1 and 200 characters/,
    );
  });

  it('rejects a whitespace-only message', () => {
    assert.throws(
      () => createErrorContract(errorCodes.invalidQueueName, '   '),
      /Error message must be between 1 and 200 characters/,
    );
  });

  it('rejects a message exceeding 200 characters', () => {
    const message = 'a'.repeat(201);
    assert.throws(
      () => createErrorContract(errorCodes.invalidConfiguration, message),
      /Error message must be between 1 and 200 characters/,
    );
  });
});
