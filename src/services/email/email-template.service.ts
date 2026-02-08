/**
 * Email Template Service
 *
 * Generates consistent HTML email templates with shared styling.
 */

/**
 * Email template result
 */
export interface EmailTemplate {
  subject: string;
  html: string;
}

/**
 * Password reset template options
 */
export interface PasswordResetOptions {
  resetUrl: string;
  expiresIn: string;
}

/**
 * Workspace invitation template options
 */
export interface WorkspaceInvitationOptions {
  inviteUrl: string;
  inviterName: string;
  workspaceName: string;
  expiresIn: string;
}

/**
 * Email verification template options
 */
export interface EmailVerificationOptions {
  verificationUrl: string;
  userName: string;
}

/**
 * Test email template options
 */
export interface TestEmailOptions {
  workspaceName: string;
  provider: string;
  senderEmail: string;
}

/**
 * Email Template Service
 */
/** Escape HTML special characters to prevent injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitize email subject — strip CR/LF to prevent header injection */
function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n]+/g, ' ').trim();
}

export class EmailTemplateService {
  private readonly primaryColor = '#2563eb';
  private readonly appName = 'Expenses App';

  /**
   * Generate wrapper HTML with consistent styling
   */
  private wrap(content: string): string {
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                This email was sent from ${this.appName}<br>
                &copy; ${year}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
  }

  /**
   * Generate a primary button
   */
  private button(text: string, url: string): string {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${this.primaryColor}; border-radius: 8px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`.trim();
  }

  /**
   * Generate email verification template
   */
  emailVerification(options: EmailVerificationOptions): EmailTemplate {
    const { verificationUrl, userName } = options;

    const content = `
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
  Verify your email
</h1>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
  Hi ${escapeHtml(userName)}, thanks for signing up! Please verify your email address to activate your account.
</p>
${this.button('Verify Email', verificationUrl)}
<p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
  This link expires in 24 hours.
</p>
<p style="margin: 0; font-size: 13px; color: #71717a;">
  If you didn't create an account, you can safely ignore this email.
</p>
`.trim();

    return {
      subject: 'Verify your email',
      html: this.wrap(content),
    };
  }

  /**
   * Generate password reset email template
   */
  passwordReset(options: PasswordResetOptions): EmailTemplate {
    const { resetUrl, expiresIn } = options;

    const content = `
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
  Reset your password
</h1>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
  We received a request to reset your password. Click the button below to set a new password:
</p>
${this.button('Reset Password', resetUrl)}
<p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
  This link expires in ${expiresIn}.
</p>
<p style="margin: 0; font-size: 13px; color: #71717a;">
  If you didn't request this, you can safely ignore this email.
</p>
`.trim();

    return {
      subject: 'Reset your password',
      html: this.wrap(content),
    };
  }

  /**
   * Generate workspace invitation email template
   */
  workspaceInvitation(options: WorkspaceInvitationOptions): EmailTemplate {
    const { inviteUrl, inviterName, workspaceName, expiresIn } = options;

    const content = `
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
  You're invited!
</h1>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
  <strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(workspaceName)}</strong> on ${this.appName}.
</p>
${this.button('Accept Invitation', inviteUrl)}
<p style="margin: 0; font-size: 13px; color: #71717a;">
  This invitation expires in ${expiresIn}.
</p>
`.trim();

    return {
      subject: `You've been invited to join ${sanitizeSubject(workspaceName)}`,
      html: this.wrap(content),
    };
  }

  /**
   * Generate test email template
   */
  test(options: TestEmailOptions): EmailTemplate {
    const { workspaceName, provider, senderEmail } = options;

    const content = `
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
  Email Configuration Test
</h1>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
  Your email configuration is working correctly.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f4f4f5; border-radius: 8px; padding: 16px; width: 100%;">
  <tr>
    <td style="padding: 8px 16px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
        <strong style="color: #3f3f46;">Provider:</strong> ${escapeHtml(provider)}
      </p>
      <p style="margin: 0; font-size: 13px; color: #71717a;">
        <strong style="color: #3f3f46;">Sender:</strong> ${escapeHtml(senderEmail)}
      </p>
    </td>
  </tr>
</table>
<p style="margin: 0; font-size: 13px; color: #71717a;">
  Emails from ${escapeHtml(workspaceName)} will be sent using this configuration.
</p>
`.trim();

    return {
      subject: `Test email from ${sanitizeSubject(workspaceName)}`,
      html: this.wrap(content),
    };
  }
}

export const emailTemplateService = new EmailTemplateService();
