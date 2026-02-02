/**
 * Email Service Error Codes
 */
export enum EmailErrorCode {
  NOT_CONFIGURED = 'EMAIL_NOT_CONFIGURED',
  INVALID_API_KEY = 'EMAIL_INVALID_API_KEY',
  SEND_FAILED = 'EMAIL_SEND_FAILED',
  ENCRYPTION_ERROR = 'EMAIL_ENCRYPTION_ERROR',
  INVALID_PROVIDER = 'EMAIL_INVALID_PROVIDER',
}

/**
 * Email Service Error
 */
export class EmailServiceError extends Error {
  constructor(
    public code: EmailErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}
