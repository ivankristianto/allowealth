/**
 * Email Service Module
 */

export { EmailService } from './email.service';
export type {
  SendPasswordResetOptions,
  SendWorkspaceInvitationOptions,
  SendEmailVerificationOptions,
} from './email.service';

export { EmailTemplateService, emailTemplateService } from './email-template.service';
export type {
  EmailTemplate,
  EmailVerificationOptions,
  PasswordResetOptions,
  WorkspaceInvitationOptions,
} from './email-template.service';

export { EmailServiceError, EmailErrorCode } from './email-errors';

export { getEmailProvider, consoleProvider, sendgridProvider, resendProvider } from './providers';
export type { EmailProvider, SendEmailOptions, SendEmailResult } from './providers';
