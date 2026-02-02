/**
 * Resend Email Provider
 *
 * Sends emails via Resend's API.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

const RESEND_API_URL = 'https://api.resend.com/emails';

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { apiKey, from, to, subject, html } = options;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${from.name} <${from.email}>`,
          to: [to],
          subject,
          html,
        }),
      });

      const result = await response.json();

      if (response.ok && result.id) {
        return {
          success: true,
          messageId: result.id,
        };
      }

      // Handle errors
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Invalid API key',
        };
      }

      return {
        success: false,
        error: result.message || result.error || `Resend returned status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const resendProvider = new ResendEmailProvider();
