/**
 * Console Email Provider
 *
 * Logs emails to console instead of sending them.
 * Used for development and when email is not configured.
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

export class ConsoleEmailProvider implements EmailProvider {
  name = 'console';

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, html } = options;

    console.warn('\n' + '='.repeat(60));
    console.warn('[EMAIL] Console Provider - Email would be sent:');
    console.warn('='.repeat(60));
    console.warn(`From: ${from.name} <${from.email}>`);
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn('-'.repeat(60));
    console.warn('Body (HTML):');
    // Strip HTML tags for console readability
    const textContent = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.warn(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
    console.warn('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

export const consoleProvider = new ConsoleEmailProvider();
