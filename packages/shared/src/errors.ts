export const errorCodes = {
  invalidConfiguration: 'invalid_configuration',
  invalidQueueName: 'invalid_queue_name',
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export type ErrorContract = {
  readonly code: ErrorCode;
  readonly message: string;
};

const maxErrorMessageLength = 200;

export function createErrorContract(
  code: ErrorCode,
  message: string,
): ErrorContract {
  const normalized = message.trim();

  if (normalized.length === 0 || normalized.length > maxErrorMessageLength) {
    throw new Error('Error message must be between 1 and 200 characters');
  }

  return {
    code,
    message: normalized,
  };
}
