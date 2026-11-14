import { createErrorContract, errorCodes } from './errors.js';

const queueNamespace = 'pulseflow';
const environmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxEnvironmentLength = 63;
const canonicalUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function buildQueueName(environment: string, queueId: string): string {
  assertCanonicalEnvironment(environment);
  assertCanonicalQueueId(queueId);

  return `${queueNamespace}:${environment}:${queueId}`;
}

function assertCanonicalEnvironment(environment: string): void {
  if (
    typeof environment !== 'string' ||
    environment.length === 0 ||
    environment.length > maxEnvironmentLength ||
    !environmentPattern.test(environment)
  ) {
    throw new Error(
      createErrorContract(
        errorCodes.invalidQueueName,
        'Invalid queue name segment: environment',
      ).message,
    );
  }
}

function assertCanonicalQueueId(queueId: string): void {
  if (typeof queueId !== 'string' || !canonicalUuidPattern.test(queueId)) {
    throw new Error(
      createErrorContract(
        errorCodes.invalidQueueName,
        'Invalid queue name segment: queueId',
      ).message,
    );
  }
}
