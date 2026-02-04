import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
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
      EMAIL_ENCRYPTION_KEY: 'tDEmsRTMP7szCIbk9KWwzIOdkup1344oqOqQscCLRCY=',
    });
  });

  afterEach(() => {
    setTestEnv(null);
  });

  const createMockWorkspaceMetaService = (settings = {}) => ({
    getEmailSettings: mock(() =>
      Promise.resolve({
        provider: 'sendgrid',
        apiKey: 'aes256gcm:dGVzdA==:dGVzdA==:dGVzdA==',
        senderName: 'Test App',
        senderAddress: 'test@example.com',
        ...settings,
      })
    ),
    isEmailConfigured: mock(() => Promise.resolve(true)),
  });

  describe('isConfigured', () => {
    it('should return true when email is configured', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.isConfigured('workspace-1');

      expect(result).toBe(true);
      expect(mockMeta.isEmailConfigured).toHaveBeenCalledWith('workspace-1');
    });

    it('should return false when email is not configured', async () => {
      const mockMeta = {
        ...createMockWorkspaceMetaService(),
        isEmailConfigured: mock(() => Promise.resolve(false)),
      };
      const service = new EmailService(mockMeta as any);

      const result = await service.isConfigured('workspace-1');

      expect(result).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });

    it('should use console provider when EMAIL_MODE is console', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
      // In console mode, it should not call getEmailSettings for provider
    });
  });

  describe('sendWorkspaceInvitation', () => {
    it('should send workspace invitation email successfully', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendWorkspaceInvitation('workspace-1', {
        to: 'newuser@example.com',
        inviterName: 'John',
        workspaceName: 'Test Workspace',
        inviteUrl: 'https://example.com/register?token=xyz',
        expiresIn: '7 days',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendTest', () => {
    it('should send test email successfully', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendTest('workspace-1', {
        to: 'admin@example.com',
        workspaceName: 'Test Workspace',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('graceful degradation', () => {
    it('should use console provider when not configured', async () => {
      const mockMeta = {
        getEmailSettings: mock(() =>
          Promise.resolve({
            provider: null,
            apiKey: null,
            senderName: null,
            senderAddress: null,
          })
        ),
        isEmailConfigured: mock(() => Promise.resolve(false)),
      };
      const service = new EmailService(mockMeta as any);

      // Should not throw, should fall back to console
      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });
  });
});
