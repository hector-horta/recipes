/**
 * Structured API error with HTTP status and optional error code.
 * Shared across all Wati ecosystem apps.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
