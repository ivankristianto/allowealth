/**
 * SendGrid Email Provider
 *
 * Sends emails via SendGrid's v3 Mail Send API.
 * @see https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

export class SendGridEmailProvider implements EmailProvider {
  name = 'sendgrid';

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { apiKey, from, to, subject, html } = options;

    try {
      const response = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
            },
          ],
          from: {
            email: from.email,
            name: from.name,
          },
          subject,
          content: [
            {
              type: 'text/html',
              value: html,
            },
          ],
        }),
      });

      // SendGrid returns 202 for successful queuing
      if (response.status === 202) {
        const messageId = response.headers.get('X-Message-Id') || undefined;
        return {
          success: true,
          messageId,
        };
      }

      // Handle errors
      let errorMessage = `SendGrid returned status ${response.status}`;

      try {
        const errorBody = await response.json();
        if (errorBody.errors && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.map((e: { message: string }) => e.message).join(', ');
        }
      } catch {
        // Ignore JSON parse errors
      }

      // Check for auth errors specifically
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Invalid API key',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const sendgridProvider = new SendGridEmailProvider();
