/**
 * Email Service
 *
 * Main entry point for sending emails. Handles configuration loading,
 * provider selection, and graceful degradation.
 */

import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('email');
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
 * Email verification options
 */
export interface SendEmailVerificationOptions {
  to: string;
  userName: string;
  verificationUrl: string;
}

/**
 * Email configuration from environment variables
 */
interface EmailConfig {
  provider: string;
  apiKey: string;
  senderName: string;
  senderAddress: string;
}

/**
 * Email Service
 *
 * Provides methods for sending transactional emails with automatic
 * provider selection and graceful fallback to console logging.
 *
 * Configuration is read from environment variables (global, not per-workspace).
 */
export class EmailService {
  /**
   * Get email configuration from environment variables
   */
  private getEmailConfig(): EmailConfig {
    return {
      provider: getEnv('EMAIL_PROVIDER') || 'resend',
      apiKey: getEnv('EMAIL_API_KEY') || '',
      senderName: getEnv('EMAIL_SENDER_NAME') || 'Expenses App',
      senderAddress: getEnv('EMAIL_SENDER_ADDRESS') || '',
    };
  }

  /**
   * Check if email is configured globally
   */
  isConfigured(): boolean {
    const config = this.getEmailConfig();
    return !!(config.provider && config.apiKey && config.senderAddress);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(options: SendPasswordResetOptions): Promise<SendEmailResult> {
    const { to, resetUrl, expiresIn } = options;
    const template = emailTemplateService.passwordReset({ resetUrl, expiresIn });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a workspace invitation email
   */
  async sendWorkspaceInvitation(options: SendWorkspaceInvitationOptions): Promise<SendEmailResult> {
    const { to, inviterName, workspaceName, inviteUrl, expiresIn } = options;
    const template = emailTemplateService.workspaceInvitation({
      inviterName,
      workspaceName,
      inviteUrl,
      expiresIn,
    });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send an email verification email
   */
  async sendEmailVerification(options: SendEmailVerificationOptions): Promise<SendEmailResult> {
    const { to, userName, verificationUrl } = options;
    const template = emailTemplateService.emailVerification({ verificationUrl, userName });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Internal send method with provider selection and fallback
   */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendEmailResult> {
    const { to, subject, html } = options;

    // Check if we're in console mode (development)
    if (getEnv('EMAIL_MODE') === 'console') {
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Console Mode', email: 'console@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get email configuration from env vars
    const config = this.getEmailConfig();

    // If not configured, fall back to console
    if (!config.provider || !config.apiKey || !config.senderAddress) {
      log.warn('not configured, falling back to console provider');
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Not Configured', email: 'notconfigured@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get provider
    let provider: EmailProvider;
    try {
      provider = getEmailProvider(config.provider);
    } catch (error) {
      log.error('invalid provider:', config.provider);
      throw new EmailServiceError(
        EmailErrorCode.INVALID_PROVIDER,
        `Invalid email provider: ${config.provider}`,
        400
      );
    }

    // Send email
    const result = await provider.send({
      apiKey: config.apiKey,
      from: {
        name: config.senderName,
        email: config.senderAddress,
      },
      to,
      subject,
      html,
    });

    // Log failures
    if (!result.success) {
      log.error('send failed:', result.error);

      // Check for API key errors
      if (result.error?.toLowerCase().includes('api key')) {
        throw new EmailServiceError(EmailErrorCode.INVALID_API_KEY, result.error, 401);
      }

      throw new EmailServiceError(EmailErrorCode.SEND_FAILED, result.error || 'Send failed', 500);
    }

    return result;
  }
}
