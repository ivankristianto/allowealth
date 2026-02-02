/**
 * Email Provider Types
 */

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  apiKey: string;
  from: {
    name: string;
    email: string;
  };
  to: string;
  subject: string;
  html: string;
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Email provider interface
 */
export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
