import { describe, it, expect } from 'bun:test';
import { EmailServiceError, EmailErrorCode } from './email-errors';

describe('EmailServiceError', () => {
  it('should create error with correct code and message', () => {
    const error = new EmailServiceError(EmailErrorCode.NOT_CONFIGURED, 'Email is not configured');

    expect(error.code).toBe(EmailErrorCode.NOT_CONFIGURED);
    expect(error.message).toBe('Email is not configured');
    expect(error.name).toBe('EmailServiceError');
    expect(error.statusCode).toBe(400);
  });

  it('should support custom status codes', () => {
    const error = new EmailServiceError(EmailErrorCode.SEND_FAILED, 'Failed to send email', 503);

    expect(error.statusCode).toBe(503);
  });
});
