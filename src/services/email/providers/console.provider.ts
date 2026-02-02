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

    console.log('\n' + '='.repeat(60));
    console.log('[EMAIL] Console Provider - Email would be sent:');
    console.log('='.repeat(60));
    console.log(`From: ${from.name} <${from.email}>`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(60));
    console.log('Body (HTML):');
    // Strip HTML tags for console readability
    const textContent = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

export const consoleProvider = new ConsoleEmailProvider();
