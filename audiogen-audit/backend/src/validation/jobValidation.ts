export interface JobCreatePayload {
  userId?: unknown;
  text?: unknown;
  idempotencyKey?: unknown;
}

export function validateJobCreate(payload: JobCreatePayload): string | null {
  if (!payload.userId || typeof payload.userId !== 'string') {
    return 'userId is required and must be a string';
  }
  if (!payload.text || typeof payload.text !== 'string') {
    return 'text is required and must be a string';
  }
  if (payload.text.trim().length === 0) {
    return 'text cannot be empty or whitespace';
  }
  if (payload.text.length > 50_000) {
    return 'text exceeds maximum allowed length of 50,000 characters';
  }
  if (
    payload.idempotencyKey !== undefined &&
    typeof payload.idempotencyKey !== 'string'
  ) {
    return 'idempotencyKey must be a string when provided';
  }
  return null;
}
