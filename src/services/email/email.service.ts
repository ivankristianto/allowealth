/**
 * Email Service
 *
 * Main entry point for sending emails. Handles configuration loading,
 * provider selection, and graceful degradation.
 */

import type { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { decrypt } from '@/lib/crypto/encryption';
import {
  getEmailProvider,
  consoleProvider,
  type SendEmailResult,
  type EmailProvider,
} from './providers';
import { emailTemplateService } from './email-template.service';
import { EmailServiceError, EmailErrorCode } from './email-errors';

/**
 * Password reset email options
 */
export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  expiresIn: string;
}

/**
 * Workspace invitation email options
 */
export interface SendWorkspaceInvitationOptions {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  expiresIn: string;
}

/**
 * Test email options
 */
export interface SendTestOptions {
  to: string;
  workspaceName: string;
}

/**
 * Email Service
 *
 * Provides methods for sending transactional emails with automatic
 * provider selection and graceful fallback to console logging.
 */
export class EmailService {
  constructor(private workspaceMetaService: WorkspaceMetaService) {}

  /**
   * Check if email is configured for a workspace
   */
  async isConfigured(workspaceId: string): Promise<boolean> {
    return this.workspaceMetaService.isEmailConfigured(workspaceId);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(
    workspaceId: string,
    options: SendPasswordResetOptions
  ): Promise<SendEmailResult> {
    const { to, resetUrl, expiresIn } = options;
    const template = emailTemplateService.passwordReset({ resetUrl, expiresIn });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a workspace invitation email
   */
  async sendWorkspaceInvitation(
    workspaceId: string,
    options: SendWorkspaceInvitationOptions
  ): Promise<SendEmailResult> {
    const { to, inviterName, workspaceName, inviteUrl, expiresIn } = options;
    const template = emailTemplateService.workspaceInvitation({
      inviterName,
      workspaceName,
      inviteUrl,
      expiresIn,
    });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a test email
   */
  async sendTest(workspaceId: string, options: SendTestOptions): Promise<SendEmailResult> {
    const { to, workspaceName } = options;

    // Get email settings for test email content
    const settings = await this.workspaceMetaService.getEmailSettings(workspaceId);

    const template = emailTemplateService.test({
      workspaceName,
      provider: settings.provider || 'console',
      senderEmail: settings.senderAddress || 'not configured',
    });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Internal send method with provider selection and fallback
   */
  private async send(
    workspaceId: string,
    options: { to: string; subject: string; html: string }
  ): Promise<SendEmailResult> {
    const { to, subject, html } = options;

    // Check if we're in console mode (development)
    if (process.env.EMAIL_MODE === 'console') {
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Console Mode', email: 'console@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get email configuration
    const settings = await this.workspaceMetaService.getEmailSettings(workspaceId);

    // If not configured, fall back to console
    if (!settings.provider || !settings.apiKey || !settings.senderAddress) {
      console.warn('[Email] Not configured, falling back to console provider');
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Not Configured', email: 'notconfigured@localhost' },
        to,
        subject,
        html,
      });
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = decrypt(settings.apiKey);
    } catch (error) {
      console.error('[Email] Failed to decrypt API key:', error);
      throw new EmailServiceError(
        EmailErrorCode.ENCRYPTION_ERROR,
        'Failed to decrypt email API key',
        500
      );
    }

    // Get provider
    let provider: EmailProvider;
    try {
      provider = getEmailProvider(settings.provider);
    } catch (error) {
      console.error('[Email] Invalid provider:', settings.provider);
      throw new EmailServiceError(
        EmailErrorCode.INVALID_PROVIDER,
        `Invalid email provider: ${settings.provider}`,
        400
      );
    }

    // Send email
    const result = await provider.send({
      apiKey,
      from: {
        name: settings.senderName || 'Expenses App',
        email: settings.senderAddress,
      },
      to,
      subject,
      html,
    });

    // Log failures
    if (!result.success) {
      console.error('[Email] Send failed:', result.error);

      // Check for API key errors
      if (result.error?.toLowerCase().includes('api key')) {
        throw new EmailServiceError(EmailErrorCode.INVALID_API_KEY, result.error, 401);
      }

      throw new EmailServiceError(EmailErrorCode.SEND_FAILED, result.error || 'Send failed', 500);
    }

    return result;
  }
}
