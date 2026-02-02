/**
 * Email Provider Factory
 */

import type { EmailProvider } from './types';
import { consoleProvider } from './console.provider';
import { sendgridProvider } from './sendgrid.provider';
import { resendProvider } from './resend.provider';

export type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

/**
 * Get email provider by name
 *
 * @param name - Provider name ('sendgrid', 'resend', 'console')
 * @returns Email provider instance
 * @throws Error if provider not found
 */
export function getEmailProvider(name: string): EmailProvider {
  switch (name) {
    case 'sendgrid':
      return sendgridProvider;
    case 'resend':
      return resendProvider;
    case 'console':
      return consoleProvider;
    default:
      throw new Error(`Unknown email provider: ${name}`);
  }
}

export { consoleProvider, sendgridProvider, resendProvider };
