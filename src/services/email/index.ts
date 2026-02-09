/**
 * Email Service Module
 */

export { EmailService } from './email.service';
export type {
  SendPasswordResetOptions,
  SendWorkspaceInvitationOptions,
  SendEmailVerificationOptions,
  SendTestOptions,
} from './email.service';

export { EmailTemplateService, emailTemplateService } from './email-template.service';
export type {
  EmailTemplate,
  EmailVerificationOptions,
  PasswordResetOptions,
  WorkspaceInvitationOptions,
  TestEmailOptions,
} from './email-template.service';

export { EmailServiceError, EmailErrorCode } from './email-errors';

export { getEmailProvider, consoleProvider, sendgridProvider, resendProvider } from './providers';
export type { EmailProvider, SendEmailOptions, SendEmailResult } from './providers';
