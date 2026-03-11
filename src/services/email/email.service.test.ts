import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmailServiceError, EmailErrorCode } from './email-errors';
import { EmailService } from './email.service';
import { setTestEnv } from '@/lib/env';

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

describe('EmailService', () => {
  beforeEach(() => {
    // Default to console mode for tests
    setTestEnv({
      EMAIL_MODE: 'console',
    });
  });

  afterEach(() => {
    setTestEnv(null);
  });

  describe('isConfigured', () => {
    it('should return true when all email env vars are set', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: 're_test_key',
        EMAIL_SENDER_NAME: 'Test App',
        EMAIL_SENDER_ADDRESS: 'test@example.com',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: '',
        EMAIL_SENDER_ADDRESS: 'test@example.com',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when sender address is missing', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: 're_test_key',
        EMAIL_SENDER_ADDRESS: '',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendPasswordReset({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendWorkspaceInvitation', () => {
    it('should send workspace invitation email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendWorkspaceInvitation({
        to: 'newuser@example.com',
        inviterName: 'John',
        workspaceName: 'Test Workspace',
        inviteUrl: 'https://example.com/signup?token=xyz',
        expiresIn: '7 days',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendEmailVerification({
        to: 'user@example.com',
        userName: 'Test User',
        verificationUrl: 'https://example.com/verify?token=abc',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendEmailChangeVerification', () => {
    it('should send email change verification email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendEmailChangeVerification({
        to: 'user@example.com',
        userName: 'Test User',
        newEmail: 'new@example.com',
        verificationUrl: 'https://example.com/verify?token=abc',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('graceful degradation', () => {
    it('should use console provider when env vars not configured', async () => {
      setTestEnv({
        NODE_ENV: 'development',
        EMAIL_MODE: 'real',
        // No provider/key/address set
      });

      const service = new EmailService();

      const result = await service.sendPasswordReset({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });

    it('rejects console fallback in production when email config is missing', async () => {
      setTestEnv({
        NODE_ENV: 'production',
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: '',
        EMAIL_API_KEY: '',
        EMAIL_SENDER_ADDRESS: '',
      });

      const service = new EmailService();

      await expect(
        service.sendPasswordReset({
          to: 'user@example.com',
          resetUrl: 'https://example.com/reset?token=abc',
          expiresIn: '1 hour',
        })
      ).rejects.toMatchObject({
        code: EmailErrorCode.NOT_CONFIGURED,
      });
    });

    it('rejects console mode in production for token-bearing emails', async () => {
      setTestEnv({
        NODE_ENV: 'production',
        EMAIL_MODE: 'console',
      });

      const service = new EmailService();

      await expect(
        service.sendEmailVerification({
          to: 'user@example.com',
          userName: 'Test User',
          verificationUrl: 'https://example.com/verify?token=abc',
        })
      ).rejects.toMatchObject({
        code: EmailErrorCode.NOT_CONFIGURED,
      });
    });
  });
});
