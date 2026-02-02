import { describe, it, expect } from 'bun:test';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  const templateService = new EmailTemplateService();

  describe('passwordReset', () => {
    it('should generate password reset email with correct subject', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.subject).toBe('Reset your password');
    });

    it('should include reset URL in HTML', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.html).toContain('https://example.com/reset?token=abc');
    });

    it('should include expiration time', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.html).toContain('1 hour');
    });
  });

  describe('workspaceInvitation', () => {
    it('should generate invitation email with correct subject', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.subject).toBe("You've been invited to join Family Budget");
    });

    it('should include inviter name', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.html).toContain('John Doe');
    });

    it('should include workspace name', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.html).toContain('Family Budget');
    });
  });

  describe('test', () => {
    it('should generate test email', () => {
      const result = templateService.test({
        workspaceName: 'My Workspace',
        provider: 'sendgrid',
        senderEmail: 'noreply@example.com',
      });

      expect(result.subject).toBe('Test email from My Workspace');
      expect(result.html).toContain('working correctly');
      expect(result.html).toContain('sendgrid');
    });
  });

  describe('footer', () => {
    it('should include current year in footer', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      const currentYear = new Date().getFullYear().toString();
      expect(result.html).toContain(currentYear);
    });
  });
});
