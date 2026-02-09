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
    // Convert HTML to readable text, preserving link URLs
    const textContent = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 [ $1 ]')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.warn(textContent.substring(0, 1000) + (textContent.length > 1000 ? '...' : ''));
    console.warn('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

export const consoleProvider = new ConsoleEmailProvider();
