import { createErrorContract, errorCodes } from './errors.js';

const queueNamespace = 'pulseflow';
const segmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxSegmentLength = 63;

export function buildQueueName(environment: string, queueId: string): string {
  assertSegment(environment, 'environment');
  assertSegment(queueId, 'queueId');
  return `${queueNamespace}:${environment}:${queueId}`;
}

function assertSegment(value: string, label: 'environment' | 'queueId'): void {
  if (value.length > maxSegmentLength || !segmentPattern.test(value)) {
    throw new Error(
      createErrorContract(
        errorCodes.invalidQueueName,
        `Invalid queue name segment: ${label}`,
      ).message,
    );
  }
}
