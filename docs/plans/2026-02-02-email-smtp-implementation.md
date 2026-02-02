# Email SMTP Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate email sending via SendGrid/Resend for password resets and workspace invitations.

**Architecture:** Workspace-level email configuration stored encrypted in workspace_meta. EmailService abstracts provider details with a clean API. Console fallback for development.

**Tech Stack:** Bun runtime, AES-256-GCM encryption, SendGrid/Resend HTTP APIs, Astro API routes, DaisyUI components.

---

## Task 1: Add Email Error Codes and Service Error Class

**Files:**

- Modify: `src/services/service-errors.ts`

**Step 1: Write the failing test**

Create `src/services/email/email.service.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { EmailServiceError, EmailErrorCode } from './email-errors';

describe('EmailServiceError', () => {
  it('should create error with correct code and message', () => {
    const error = new EmailServiceError(EmailErrorCode.NOT_CONFIGURED, 'Email is not configured');

    expect(error.code).toBe(EmailErrorCode.NOT_CONFIGURED);
    expect(error.message).toBe('Email is not configured');
    expect(error.name).toBe('EmailServiceError');
    expect(error.statusCode).toBe(400);
  });

  it('should support custom status codes', () => {
    const error = new EmailServiceError(EmailErrorCode.SEND_FAILED, 'Failed to send email', 503);

    expect(error.statusCode).toBe(503);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/email/email.service.test.ts`
Expected: FAIL with "Cannot find module './email-errors'"

**Step 3: Write minimal implementation**

Create `src/services/email/email-errors.ts`:

```typescript
/**
 * Email Service Error Codes
 */
export enum EmailErrorCode {
  NOT_CONFIGURED = 'EMAIL_NOT_CONFIGURED',
  INVALID_API_KEY = 'EMAIL_INVALID_API_KEY',
  SEND_FAILED = 'EMAIL_SEND_FAILED',
  ENCRYPTION_ERROR = 'EMAIL_ENCRYPTION_ERROR',
  INVALID_PROVIDER = 'EMAIL_INVALID_PROVIDER',
}

/**
 * Email Service Error
 */
export class EmailServiceError extends Error {
  constructor(
    public code: EmailErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/email/email.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email/email-errors.ts src/services/email/email.service.test.ts
git commit -m "$(cat <<'EOF'
feat(email): add EmailServiceError and error codes

Foundation for email service error handling with specific codes
for configuration, API key, sending, and encryption errors.
EOF
)"
```

---

## Task 2: Create Encryption Utility

**Files:**

- Create: `src/lib/crypto/encryption.ts`
- Create: `src/lib/crypto/encryption.test.ts`

**Step 1: Write the failing test**

Create `src/lib/crypto/encryption.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { encrypt, decrypt, generateEncryptionKey } from './encryption';

describe('Encryption', () => {
  const originalEnv = process.env.EMAIL_ENCRYPTION_KEY;

  beforeAll(() => {
    // Set a test encryption key (32 bytes base64 encoded)
    process.env.EMAIL_ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE=';
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.EMAIL_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.EMAIL_ENCRYPTION_KEY;
    }
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-api-key-12345';

      const encrypted = encrypt(plaintext);
      expect(encrypted).toStartWith('aes256gcm:');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same-text';

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'API密钥🔐测试';

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'tampereddata';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 32-byte base64 encoded key', () => {
      const key = generateEncryptionKey();

      // Base64 of 32 bytes = 44 characters (with padding)
      expect(key.length).toBe(44);

      // Should be valid base64
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/crypto/encryption.test.ts`
Expected: FAIL with "Cannot find module './encryption'"

**Step 3: Write minimal implementation**

Create `src/lib/crypto/encryption.ts`:

```typescript
/**
 * AES-256-GCM Encryption Utility
 *
 * Uses Web Crypto API for encryption/decryption of sensitive data.
 * Encrypted format: aes256gcm:<base64-iv>:<base64-ciphertext>:<base64-tag>
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Get the encryption key from environment variable
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = process.env.EMAIL_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(keyBase64, 'base64');

  if (key.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded');
  }

  return new Uint8Array(key);
}

/**
 * Import the key for Web Crypto API
 */
async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: aes256gcm:<iv>:<ciphertext>:<tag>
 */
export function encrypt(plaintext: string): string {
  const keyBytes = getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Use synchronous encryption via Node.js crypto
  const nodeCrypto = require('crypto');
  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(keyBytes), Buffer.from(iv), {
    authTagLength: TAG_LENGTH / 8,
  });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivBase64 = Buffer.from(iv).toString('base64');
  const ciphertextBase64 = encrypted.toString('base64');
  const tagBase64 = authTag.toString('base64');

  return `aes256gcm:${ivBase64}:${ciphertextBase64}:${tagBase64}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 *
 * @param encrypted - Encrypted string in format: aes256gcm:<iv>:<ciphertext>:<tag>
 * @returns Decrypted plaintext string
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');

  if (parts.length !== 4 || parts[0] !== 'aes256gcm') {
    throw new Error('Invalid encrypted format. Expected: aes256gcm:<iv>:<ciphertext>:<tag>');
  }

  const [, ivBase64, ciphertextBase64, tagBase64] = parts;
  const keyBytes = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');
  const authTag = Buffer.from(tagBase64, 'base64');

  // Use synchronous decryption via Node.js crypto
  const nodeCrypto = require('crypto');
  const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(keyBytes), iv, {
    authTagLength: TAG_LENGTH / 8,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a new 32-byte encryption key (base64 encoded)
 *
 * @returns Base64 encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(key).toString('base64');
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/crypto/encryption.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/crypto/encryption.ts src/lib/crypto/encryption.test.ts
git commit -m "$(cat <<'EOF'
feat(crypto): add AES-256-GCM encryption utility

Provides encrypt/decrypt functions for API key storage and
generateEncryptionKey helper for initial setup.
EOF
)"
```

---

## Task 3: Add Email Workspace Meta Keys

**Files:**

- Modify: `src/lib/constants/workspace-meta-keys.ts`

**Step 1: Read existing file for context**

File already read above. Current keys: CURRENCY, WEEK_START, COMPACT_NUMBERS.

**Step 2: Add email keys**

Edit `src/lib/constants/workspace-meta-keys.ts`:

```typescript
/**
 * Workspace Meta Keys Constants
 *
 * Defines the allowlist of workspace meta keys, their types, and defaults.
 * Workspace-level settings that apply to all members of a workspace.
 */

/**
 * Allowed workspace meta keys - only these keys can be stored in workspace_meta
 */
export const WORKSPACE_META_KEYS = {
  CURRENCY: 'currency',
  WEEK_START: 'week_start',
  COMPACT_NUMBERS: 'compact_numbers',
  // Email configuration
  EMAIL_PROVIDER: 'email_provider',
  EMAIL_API_KEY: 'email_api_key',
  EMAIL_SENDER_NAME: 'email_sender_name',
  EMAIL_SENDER_ADDRESS: 'email_sender_address',
} as const;

/**
 * Type for valid workspace meta key values
 */
export type WorkspaceMetaKey = (typeof WORKSPACE_META_KEYS)[keyof typeof WORKSPACE_META_KEYS];

/**
 * Default values for each workspace meta key (stored as strings in database)
 * Note: Email keys have no defaults (unconfigured state)
 */
export const WORKSPACE_META_DEFAULTS: Record<WorkspaceMetaKey, string> = {
  [WORKSPACE_META_KEYS.CURRENCY]: 'IDR',
  [WORKSPACE_META_KEYS.WEEK_START]: 'monday',
  [WORKSPACE_META_KEYS.COMPACT_NUMBERS]: 'true',
  [WORKSPACE_META_KEYS.EMAIL_PROVIDER]: '',
  [WORKSPACE_META_KEYS.EMAIL_API_KEY]: '',
  [WORKSPACE_META_KEYS.EMAIL_SENDER_NAME]: '',
  [WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS]: '',
};

/**
 * Array of all valid workspace meta keys for validation
 */
export const ALLOWED_WORKSPACE_META_KEYS = Object.values(WORKSPACE_META_KEYS);

/**
 * Check if a string is a valid workspace meta key
 */
export function isValidWorkspaceMetaKey(key: string): key is WorkspaceMetaKey {
  return ALLOWED_WORKSPACE_META_KEYS.includes(key as WorkspaceMetaKey);
}

/**
 * Supported week start values
 */
export const WEEK_START_VALUES = ['monday', 'sunday'] as const;
export type WeekStart = (typeof WEEK_START_VALUES)[number];

/**
 * Supported email providers
 */
export const EMAIL_PROVIDERS = ['sendgrid', 'resend'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

/**
 * Check if a string is a valid email provider
 */
export function isValidEmailProvider(value: string): value is EmailProvider {
  return EMAIL_PROVIDERS.includes(value as EmailProvider);
}

/**
 * Type-safe workspace settings derived from meta values
 */
export interface WorkspaceSettings {
  currency: string;
  weekStart: WeekStart;
  compactNumbers: boolean;
}

/**
 * Default workspace settings
 */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: 'IDR',
  weekStart: 'monday',
  compactNumbers: true,
};

/**
 * Email configuration settings
 */
export interface EmailSettings {
  provider: EmailProvider | null;
  apiKey: string | null; // Encrypted
  senderName: string | null;
  senderAddress: string | null;
}
```

**Step 3: Run typecheck to verify**

Run: `bun run typecheck`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add src/lib/constants/workspace-meta-keys.ts
git commit -m "$(cat <<'EOF'
feat(email): add email configuration meta keys

Adds EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_SENDER_NAME, and
EMAIL_SENDER_ADDRESS workspace meta keys for email settings.
EOF
)"
```

---

## Task 4: Update WorkspaceMetaService for Email Keys

**Files:**

- Modify: `src/services/workspace-meta.service.ts`

**Step 1: Add validation for email meta keys**

Add validation logic to `validateMetaValue` function in `src/services/workspace-meta.service.ts`:

Add these cases to the switch statement:

```typescript
    case WORKSPACE_META_KEYS.EMAIL_PROVIDER:
      // Empty string is allowed (unconfigured)
      if (value && !isValidEmailProvider(value)) {
        throw new Error(
          `Invalid email provider. Must be one of: ${EMAIL_PROVIDERS.join(', ')}`
        );
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_API_KEY:
      // Empty string or encrypted format
      if (value && !value.startsWith('aes256gcm:')) {
        throw new Error('API key must be encrypted');
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_SENDER_NAME:
      // Allow empty or any non-empty string up to 100 chars
      if (value && value.length > 100) {
        throw new Error('Sender name too long (max 100 characters)');
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS:
      // Empty string is allowed, but if provided must be valid email
      if (value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Invalid sender email address');
        }
      }
      break;
```

Add import at the top:

```typescript
import {
  WORKSPACE_META_KEYS,
  type WorkspaceMetaKey,
  type WorkspaceSettings,
  type WeekStart,
  WORKSPACE_META_DEFAULTS,
  WEEK_START_VALUES,
  DEFAULT_WORKSPACE_SETTINGS,
  isValidWorkspaceMetaKey,
  EMAIL_PROVIDERS,
  isValidEmailProvider,
  type EmailSettings,
} from '@/lib/constants/workspace-meta-keys';
```

**Step 2: Add type-safe email settings methods**

Add these methods to `WorkspaceMetaService` class:

```typescript
  // ============================================================================
  // Email settings methods
  // ============================================================================

  /**
   * Get email configuration for workspace
   *
   * @param workspaceId - Workspace ID
   * @returns EmailSettings object (null values indicate unconfigured)
   */
  async getEmailSettings(workspaceId: string): Promise<EmailSettings> {
    const metaAll = await this.getAll(workspaceId);

    const provider = metaAll[WORKSPACE_META_KEYS.EMAIL_PROVIDER];
    const apiKey = metaAll[WORKSPACE_META_KEYS.EMAIL_API_KEY];
    const senderName = metaAll[WORKSPACE_META_KEYS.EMAIL_SENDER_NAME];
    const senderAddress = metaAll[WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS];

    return {
      provider: provider && isValidEmailProvider(provider) ? provider : null,
      apiKey: apiKey || null,
      senderName: senderName || null,
      senderAddress: senderAddress || null,
    };
  }

  /**
   * Check if email is fully configured
   *
   * @param workspaceId - Workspace ID
   * @returns true if all email settings are present
   */
  async isEmailConfigured(workspaceId: string): Promise<boolean> {
    const settings = await this.getEmailSettings(workspaceId);
    return !!(
      settings.provider &&
      settings.apiKey &&
      settings.senderName &&
      settings.senderAddress
    );
  }

  /**
   * Set email provider
   *
   * @param workspaceId - Workspace ID
   * @param provider - Email provider ('sendgrid' or 'resend')
   */
  async setEmailProvider(workspaceId: string, provider: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_PROVIDER, provider);
  }

  /**
   * Set encrypted email API key
   *
   * @param workspaceId - Workspace ID
   * @param encryptedApiKey - Already encrypted API key (aes256gcm:...)
   */
  async setEmailApiKey(workspaceId: string, encryptedApiKey: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_API_KEY, encryptedApiKey);
  }

  /**
   * Set email sender name
   *
   * @param workspaceId - Workspace ID
   * @param name - Display name for sender
   */
  async setEmailSenderName(workspaceId: string, name: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_NAME, name);
  }

  /**
   * Set email sender address
   *
   * @param workspaceId - Workspace ID
   * @param address - Email address for sender
   */
  async setEmailSenderAddress(workspaceId: string, address: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS, address);
  }

  /**
   * Clear all email settings (reset to unconfigured)
   *
   * @param workspaceId - Workspace ID
   */
  async clearEmailSettings(workspaceId: string): Promise<void> {
    // Set empty strings (not delete, to ensure consistent state)
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_PROVIDER, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_API_KEY, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_NAME, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS, '');
  }
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/workspace-meta.service.ts
git commit -m "$(cat <<'EOF'
feat(email): add email settings methods to WorkspaceMetaService

Adds getEmailSettings, isEmailConfigured, and setters for
email provider, API key, sender name, and sender address.
EOF
)"
```

---

## Task 5: Create Email Providers

**Files:**

- Create: `src/services/email/providers/types.ts`
- Create: `src/services/email/providers/console.provider.ts`
- Create: `src/services/email/providers/sendgrid.provider.ts`
- Create: `src/services/email/providers/resend.provider.ts`
- Create: `src/services/email/providers/index.ts`

**Step 1: Write the types file**

Create `src/services/email/providers/types.ts`:

```typescript
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
```

**Step 2: Create console provider**

Create `src/services/email/providers/console.provider.ts`:

```typescript
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
```

**Step 3: Create SendGrid provider**

Create `src/services/email/providers/sendgrid.provider.ts`:

```typescript
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
```

**Step 4: Create Resend provider**

Create `src/services/email/providers/resend.provider.ts`:

```typescript
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
```

**Step 5: Create provider factory**

Create `src/services/email/providers/index.ts`:

```typescript
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
```

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/email/providers/
git commit -m "$(cat <<'EOF'
feat(email): add email providers (SendGrid, Resend, Console)

Implements provider interface with SendGrid, Resend, and Console
providers. Console provider logs to stdout for development.
EOF
)"
```

---

## Task 6: Create Email Template Service

**Files:**

- Create: `src/services/email/email-template.service.ts`
- Create: `src/services/email/email-template.service.test.ts`

**Step 1: Write the failing test**

Create `src/services/email/email-template.service.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  const templateService = new EmailTemplateService();

  describe('passwordReset', () => {
    it('should generate password reset email with correct subject', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.subject).toBe('Reset your password');
    });

    it('should include reset URL in HTML', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.html).toContain('https://example.com/reset?token=abc');
    });

    it('should include expiration time', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.html).toContain('1 hour');
    });
  });

  describe('workspaceInvitation', () => {
    it('should generate invitation email with correct subject', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.subject).toBe("You've been invited to join Family Budget");
    });

    it('should include inviter name', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.html).toContain('John Doe');
    });

    it('should include workspace name', () => {
      const result = templateService.workspaceInvitation({
        inviteUrl: 'https://example.com/register?token=xyz',
        inviterName: 'John Doe',
        workspaceName: 'Family Budget',
        expiresIn: '7 days',
      });

      expect(result.html).toContain('Family Budget');
    });
  });

  describe('test', () => {
    it('should generate test email', () => {
      const result = templateService.test({
        workspaceName: 'My Workspace',
        provider: 'sendgrid',
        senderEmail: 'noreply@example.com',
      });

      expect(result.subject).toBe('Test email from My Workspace');
      expect(result.html).toContain('working correctly');
      expect(result.html).toContain('sendgrid');
    });
  });

  describe('footer', () => {
    it('should include current year in footer', () => {
      const result = templateService.passwordReset({
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      const currentYear = new Date().getFullYear().toString();
      expect(result.html).toContain(currentYear);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/email/email-template.service.test.ts`
Expected: FAIL with "Cannot find module './email-template.service'"

**Step 3: Write minimal implementation**

Create `src/services/email/email-template.service.ts`:

```typescript
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
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
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
  <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on ${this.appName}.
</p>
${this.button('Accept Invitation', inviteUrl)}
<p style="margin: 0; font-size: 13px; color: #71717a;">
  This invitation expires in ${expiresIn}.
</p>
`.trim();

    return {
      subject: `You've been invited to join ${workspaceName}`,
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
        <strong style="color: #3f3f46;">Provider:</strong> ${provider}
      </p>
      <p style="margin: 0; font-size: 13px; color: #71717a;">
        <strong style="color: #3f3f46;">Sender:</strong> ${senderEmail}
      </p>
    </td>
  </tr>
</table>
<p style="margin: 0; font-size: 13px; color: #71717a;">
  Emails from ${workspaceName} will be sent using this configuration.
</p>
`.trim();

    return {
      subject: `Test email from ${workspaceName}`,
      html: this.wrap(content),
    };
  }
}

export const emailTemplateService = new EmailTemplateService();
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/email/email-template.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email/email-template.service.ts src/services/email/email-template.service.test.ts
git commit -m "$(cat <<'EOF'
feat(email): add EmailTemplateService for HTML email templates

Provides passwordReset, workspaceInvitation, and test templates
with consistent styling and responsive design.
EOF
)"
```

---

## Task 7: Create Main Email Service

**Files:**

- Create: `src/services/email/email.service.ts`
- Update: `src/services/email/email.service.test.ts`

**Step 1: Add more tests to existing test file**

Update `src/services/email/email.service.test.ts`:

```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { EmailServiceError, EmailErrorCode } from './email-errors';
import { EmailService } from './email.service';

describe('EmailServiceError', () => {
  it('should create error with correct code and message', () => {
    const error = new EmailServiceError(EmailErrorCode.NOT_CONFIGURED, 'Email is not configured');

    expect(error.code).toBe(EmailErrorCode.NOT_CONFIGURED);
    expect(error.message).toBe('Email is not configured');
    expect(error.name).toBe('EmailServiceError');
    expect(error.statusCode).toBe(400);
  });

  it('should support custom status codes', () => {
    const error = new EmailServiceError(EmailErrorCode.SEND_FAILED, 'Failed to send email', 503);

    expect(error.statusCode).toBe(503);
  });
});

describe('EmailService', () => {
  const originalEnv = process.env.EMAIL_MODE;

  beforeEach(() => {
    // Default to console mode for tests
    process.env.EMAIL_MODE = 'console';
    process.env.EMAIL_ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE=';
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.EMAIL_MODE = originalEnv;
    } else {
      delete process.env.EMAIL_MODE;
    }
  });

  const createMockWorkspaceMetaService = (settings = {}) => ({
    getEmailSettings: mock(() =>
      Promise.resolve({
        provider: 'sendgrid',
        apiKey: 'aes256gcm:dGVzdA==:dGVzdA==:dGVzdA==',
        senderName: 'Test App',
        senderAddress: 'test@example.com',
        ...settings,
      })
    ),
    isEmailConfigured: mock(() => Promise.resolve(true)),
  });

  describe('isConfigured', () => {
    it('should return true when email is configured', async () => {
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.isConfigured('workspace-1');

      expect(result).toBe(true);
      expect(mockMeta.isEmailConfigured).toHaveBeenCalledWith('workspace-1');
    });

    it('should return false when email is not configured', async () => {
      const mockMeta = {
        ...createMockWorkspaceMetaService(),
        isEmailConfigured: mock(() => Promise.resolve(false)),
      };
      const service = new EmailService(mockMeta as any);

      const result = await service.isConfigured('workspace-1');

      expect(result).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      process.env.EMAIL_MODE = 'console'; // Force console mode
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });

    it('should use console provider when EMAIL_MODE is console', async () => {
      process.env.EMAIL_MODE = 'console';
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
      // In console mode, it should not call getEmailSettings for provider
    });
  });

  describe('sendWorkspaceInvitation', () => {
    it('should send workspace invitation email successfully', async () => {
      process.env.EMAIL_MODE = 'console';
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendWorkspaceInvitation('workspace-1', {
        to: 'newuser@example.com',
        inviterName: 'John',
        workspaceName: 'Test Workspace',
        inviteUrl: 'https://example.com/register?token=xyz',
        expiresIn: '7 days',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendTest', () => {
    it('should send test email successfully', async () => {
      process.env.EMAIL_MODE = 'console';
      const mockMeta = createMockWorkspaceMetaService();
      const service = new EmailService(mockMeta as any);

      const result = await service.sendTest('workspace-1', {
        to: 'admin@example.com',
        workspaceName: 'Test Workspace',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('graceful degradation', () => {
    it('should use console provider when not configured', async () => {
      const mockMeta = {
        getEmailSettings: mock(() =>
          Promise.resolve({
            provider: null,
            apiKey: null,
            senderName: null,
            senderAddress: null,
          })
        ),
        isEmailConfigured: mock(() => Promise.resolve(false)),
      };
      const service = new EmailService(mockMeta as any);

      // Should not throw, should fall back to console
      const result = await service.sendPasswordReset('workspace-1', {
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/email/email.service.test.ts`
Expected: FAIL with "Cannot find module './email.service'"

**Step 3: Write the EmailService**

Create `src/services/email/email.service.ts`:

```typescript
/**
 * Email Service
 *
 * Main entry point for sending emails. Handles configuration loading,
 * provider selection, and graceful degradation.
 */

import type { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { decrypt } from '@/lib/crypto/encryption';
import { getEmailProvider, consoleProvider, type SendEmailResult } from './providers';
import { emailTemplateService } from './email-template.service';
import { EmailServiceError, EmailErrorCode } from './email-errors';

/**
 * Password reset email options
 */
export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  expiresIn: string;
}

/**
 * Workspace invitation email options
 */
export interface SendWorkspaceInvitationOptions {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  expiresIn: string;
}

/**
 * Test email options
 */
export interface SendTestOptions {
  to: string;
  workspaceName: string;
}

/**
 * Email Service
 *
 * Provides methods for sending transactional emails with automatic
 * provider selection and graceful fallback to console logging.
 */
export class EmailService {
  constructor(private workspaceMetaService: WorkspaceMetaService) {}

  /**
   * Check if email is configured for a workspace
   */
  async isConfigured(workspaceId: string): Promise<boolean> {
    return this.workspaceMetaService.isEmailConfigured(workspaceId);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(
    workspaceId: string,
    options: SendPasswordResetOptions
  ): Promise<SendEmailResult> {
    const { to, resetUrl, expiresIn } = options;
    const template = emailTemplateService.passwordReset({ resetUrl, expiresIn });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a workspace invitation email
   */
  async sendWorkspaceInvitation(
    workspaceId: string,
    options: SendWorkspaceInvitationOptions
  ): Promise<SendEmailResult> {
    const { to, inviterName, workspaceName, inviteUrl, expiresIn } = options;
    const template = emailTemplateService.workspaceInvitation({
      inviterName,
      workspaceName,
      inviteUrl,
      expiresIn,
    });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a test email
   */
  async sendTest(workspaceId: string, options: SendTestOptions): Promise<SendEmailResult> {
    const { to, workspaceName } = options;

    // Get email settings for test email content
    const settings = await this.workspaceMetaService.getEmailSettings(workspaceId);

    const template = emailTemplateService.test({
      workspaceName,
      provider: settings.provider || 'console',
      senderEmail: settings.senderAddress || 'not configured',
    });

    return this.send(workspaceId, {
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Internal send method with provider selection and fallback
   */
  private async send(
    workspaceId: string,
    options: { to: string; subject: string; html: string }
  ): Promise<SendEmailResult> {
    const { to, subject, html } = options;

    // Check if we're in console mode (development)
    if (process.env.EMAIL_MODE === 'console') {
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Console Mode', email: 'console@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get email configuration
    const settings = await this.workspaceMetaService.getEmailSettings(workspaceId);

    // If not configured, fall back to console
    if (!settings.provider || !settings.apiKey || !settings.senderAddress) {
      console.warn('[Email] Not configured, falling back to console provider');
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Not Configured', email: 'noconfigured@localhost' },
        to,
        subject,
        html,
      });
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = decrypt(settings.apiKey);
    } catch (error) {
      console.error('[Email] Failed to decrypt API key:', error);
      throw new EmailServiceError(
        EmailErrorCode.ENCRYPTION_ERROR,
        'Failed to decrypt email API key',
        500
      );
    }

    // Get provider
    let provider;
    try {
      provider = getEmailProvider(settings.provider);
    } catch (error) {
      console.error('[Email] Invalid provider:', settings.provider);
      throw new EmailServiceError(
        EmailErrorCode.INVALID_PROVIDER,
        `Invalid email provider: ${settings.provider}`,
        400
      );
    }

    // Send email
    const result = await provider.send({
      apiKey,
      from: {
        name: settings.senderName || 'Expenses App',
        email: settings.senderAddress,
      },
      to,
      subject,
      html,
    });

    // Log failures
    if (!result.success) {
      console.error('[Email] Send failed:', result.error);

      // Check for API key errors
      if (result.error?.toLowerCase().includes('api key')) {
        throw new EmailServiceError(EmailErrorCode.INVALID_API_KEY, result.error, 401);
      }

      throw new EmailServiceError(EmailErrorCode.SEND_FAILED, result.error || 'Send failed', 500);
    }

    return result;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/email/email.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email/email.service.ts src/services/email/email.service.test.ts
git commit -m "$(cat <<'EOF'
feat(email): add EmailService with provider selection and fallback

Main email service that loads configuration from workspace_meta,
decrypts API keys, and sends via configured provider with console
fallback for development.
EOF
)"
```

---

## Task 8: Export Email Service from Services Index

**Files:**

- Modify: `src/services/index.ts`
- Create: `src/services/email/index.ts`

**Step 1: Create email module index**

Create `src/services/email/index.ts`:

```typescript
/**
 * Email Service Module
 */

export { EmailService } from './email.service';
export type {
  SendPasswordResetOptions,
  SendWorkspaceInvitationOptions,
  SendTestOptions,
} from './email.service';

export { EmailTemplateService, emailTemplateService } from './email-template.service';
export type {
  EmailTemplate,
  PasswordResetOptions,
  WorkspaceInvitationOptions,
  TestEmailOptions,
} from './email-template.service';

export { EmailServiceError, EmailErrorCode } from './email-errors';

export { getEmailProvider, consoleProvider, sendgridProvider, resendProvider } from './providers';
export type { EmailProvider, SendEmailOptions, SendEmailResult } from './providers';
```

**Step 2: Update services index**

Add to `src/services/index.ts`:

```typescript
// Import email service
import { EmailService } from './email';

// Add to re-exports section
export * from './email';

// Add singleton at the bottom with other singletons
export const emailService = new EmailService(workspaceMetaService);
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/email/index.ts src/services/index.ts
git commit -m "$(cat <<'EOF'
feat(email): export emailService singleton from services index

Makes email service available via standard import pattern:
import { emailService } from '@/services';
EOF
)"
```

---

## Task 9: Create Email Settings API Endpoint

**Files:**

- Create: `src/pages/api/workspace/email-settings.ts`

**Step 1: Write the API endpoint**

Create `src/pages/api/workspace/email-settings.ts`:

```typescript
import type { APIRoute } from 'astro';
import { workspaceMetaService, workspaceService, emailService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { WorkspaceMetaServiceError, WorkspaceServiceError } from '@/services/service-errors';
import { EmailServiceError } from '@/services/email';
import { z } from 'zod';
import { encrypt } from '@/lib/crypto/encryption';

/**
 * Schema for PUT request body - email settings update
 */
const updateEmailSettingsSchema = z.object({
  provider: z.enum(['sendgrid', 'resend']).optional(),
  apiKey: z.string().optional(),
  senderName: z.string().min(1).max(100).optional(),
  senderAddress: z.string().email().optional(),
});

/**
 * Schema for POST request body - test email
 */
const testEmailSchema = z.object({
  // No body required - sends to current user's email
});

/**
 * GET /api/workspace/email-settings
 *
 * Retrieves email configuration for the workspace.
 * Returns provider and sender info, but NOT the API key (for security).
 * Admin only.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    const settings = await workspaceMetaService.getEmailSettings(auth.workspaceId);
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);

    return successResponse({
      provider: settings.provider,
      senderName: settings.senderName,
      senderAddress: settings.senderAddress,
      hasApiKey: !!settings.apiKey,
      isConfigured,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching email settings', error);
    return errorResponse('Failed to fetch email settings', 500);
  }
};

/**
 * PUT /api/workspace/email-settings
 *
 * Updates email configuration for the workspace.
 * Admin only.
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    const validation = await validateBody(context.request, updateEmailSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { provider, apiKey, senderName, senderAddress } = validation.data;

    // Update individual settings
    if (provider !== undefined) {
      await workspaceMetaService.setEmailProvider(auth.workspaceId, provider);
    }
    if (apiKey !== undefined) {
      // Encrypt the API key before storing
      const encryptedApiKey = encrypt(apiKey);
      await workspaceMetaService.setEmailApiKey(auth.workspaceId, encryptedApiKey);
    }
    if (senderName !== undefined) {
      await workspaceMetaService.setEmailSenderName(auth.workspaceId, senderName);
    }
    if (senderAddress !== undefined) {
      await workspaceMetaService.setEmailSenderAddress(auth.workspaceId, senderAddress);
    }

    // Get updated settings
    const settings = await workspaceMetaService.getEmailSettings(auth.workspaceId);
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);

    return successResponse({
      provider: settings.provider,
      senderName: settings.senderName,
      senderAddress: settings.senderAddress,
      hasApiKey: !!settings.apiKey,
      isConfigured,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating email settings', error);
    return errorResponse('Failed to update email settings', 500);
  }
};

/**
 * POST /api/workspace/email-settings
 *
 * Sends a test email to the current user.
 * Admin only.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    // Check if email is configured
    const isConfigured = await workspaceMetaService.isEmailConfigured(auth.workspaceId);
    if (!isConfigured) {
      return errorResponse(
        'Email is not configured. Please save your settings first.',
        400,
        'EMAIL_NOT_CONFIGURED'
      );
    }

    // Get workspace name for email
    const workspace = await workspaceService.findById(auth.workspaceId);
    const workspaceName = workspace?.name || 'Your Workspace';

    // Send test email to current user
    const result = await emailService.sendTest(auth.workspaceId, {
      to: auth.user.email,
      workspaceName,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send test email', 500, 'EMAIL_SEND_FAILED');
    }

    return successResponse({
      message: `Test email sent to ${auth.user.email}`,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof EmailServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    if (error instanceof WorkspaceMetaServiceError || error instanceof WorkspaceServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error sending test email', error);
    return errorResponse('Failed to send test email', 500);
  }
};

/**
 * DELETE /api/workspace/email-settings
 *
 * Clears all email configuration for the workspace.
 * Admin only.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Admin only
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    await workspaceMetaService.clearEmailSettings(auth.workspaceId);

    return successResponse({
      message: 'Email settings cleared',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error clearing email settings', error);
    return errorResponse('Failed to clear email settings', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/workspace/email-settings.ts
git commit -m "$(cat <<'EOF'
feat(api): add email settings CRUD and test endpoint

GET /api/workspace/email-settings - retrieve config
PUT /api/workspace/email-settings - update config
POST /api/workspace/email-settings - send test email
DELETE /api/workspace/email-settings - clear config
EOF
)"
```

---

## Task 10: Add Email Tab to Settings UI

**Files:**

- Modify: `src/pages/settings/index.astro`

**Step 1: Add Email to navItems**

In the frontmatter section, update `navItems`:

```typescript
import { Mail } from '@lucide/astro'; // Add to imports

const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
] as const;
```

**Step 2: Fetch email settings in frontmatter**

Add after fetching invitations:

```typescript
// Initialize email settings
let emailSettings = {
  provider: null as string | null,
  senderName: null as string | null,
  senderAddress: null as string | null,
  hasApiKey: false,
  isConfigured: false,
};

// Fetch email settings (admin only)
if (isAdmin) {
  try {
    const emailResponse = await fetch(new URL('/api/workspace/email-settings', Astro.url), {
      headers: {
        Cookie: Astro.request.headers.get('Cookie') || '',
      },
    });

    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      if (emailResult.success) {
        emailSettings = emailResult.data;
      }
    }
  } catch (error) {
    console.error('Failed to fetch email settings:', error);
  }
}
```

**Step 3: Add Email panel HTML**

Add after the Notifications panel section (before Data panel):

```astro
{/* Email Panel */}
<section
  id="settings-panel-email"
  data-settings-panel
  data-tab="email"
  role="tabpanel"
  aria-labelledby="settings-tab-email"
  class="hidden"
>
  <div class="flex flex-col gap-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold text-base-content">Email Configuration</h2>
      <p class="text-sm text-base-content/60">
        Configure email delivery for invitations and notifications.
      </p>
    </header>
    <div class="divider my-0"></div>

    {
      isAdmin ? (
        <form id="email-settings-form" class="flex flex-col gap-5">
          {/* Provider Select */}
          <div class="form-control">
            <Label htmlFor="email-provider">Email Provider</Label>
            <select
              id="email-provider"
              name="provider"
              class="select select-bordered w-full h-14 py-4 pl-6 pr-10 text-base font-bold bg-base-200 rounded-full border-0 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2"
            >
              <option value="" selected={!emailSettings.provider}>
                Select a provider...
              </option>
              <option value="sendgrid" selected={emailSettings.provider === 'sendgrid'}>
                SendGrid
              </option>
              <option value="resend" selected={emailSettings.provider === 'resend'}>
                Resend
              </option>
            </select>
          </div>

          {/* API Key */}
          <div class="form-control">
            <Label htmlFor="email-api-key">API Key</Label>
            <div class="relative">
              <input
                type="password"
                id="email-api-key"
                name="apiKey"
                class="input input-bordered w-full h-14 py-4 px-6 pr-12 text-base font-bold bg-base-200 rounded-full border-0 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2"
                placeholder={emailSettings.hasApiKey ? '••••••••••••' : 'Enter your API key'}
              />
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                data-toggle-password
                aria-label="Toggle password visibility"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  data-show-icon
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 hidden"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  data-hide-icon
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
            </div>
            <p class="text-xs text-base-content/50 mt-2 ml-4">
              {emailSettings.hasApiKey
                ? 'API key is configured. Leave blank to keep current key.'
                : 'Get your API key from SendGrid or Resend dashboard.'}
            </p>
          </div>

          {/* Sender Name */}
          <div class="form-control">
            <Label htmlFor="email-sender-name">Sender Name</Label>
            <input
              type="text"
              id="email-sender-name"
              name="senderName"
              value={emailSettings.senderName || ''}
              class="input input-bordered w-full h-14 py-4 px-6 text-base font-bold bg-base-200 rounded-full border-0 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2"
              placeholder="Expenses App"
            />
          </div>

          {/* Sender Email */}
          <div class="form-control">
            <Label htmlFor="email-sender-address">Sender Email</Label>
            <input
              type="email"
              id="email-sender-address"
              name="senderAddress"
              value={emailSettings.senderAddress || ''}
              class="input input-bordered w-full h-14 py-4 px-6 text-base font-bold bg-base-200 rounded-full border-0 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2"
              placeholder="noreply@yourdomain.com"
            />
            <p class="text-xs text-base-content/50 mt-2 ml-4">
              This address must be verified with your email provider.
            </p>
          </div>

          {/* Action Buttons */}
          <div class="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4">
            <button
              type="button"
              id="test-email-btn"
              class="btn btn-ghost h-14 rounded-full gap-2"
              disabled={!emailSettings.isConfigured}
            >
              <Mail size={18} class="stroke-current" aria-hidden="true" />
              Send Test Email
            </button>
            <button
              type="button"
              id="save-email-btn"
              class="btn btn-accent h-14 rounded-full gap-2 font-bold shadow-sm"
            >
              <Save size={18} class="stroke-current" aria-hidden="true" />
              Save Email Settings
            </button>
          </div>

          {/* Status Indicator */}
          <div class={`alert ${emailSettings.isConfigured ? 'alert-success' : 'alert-info'}`}>
            <span>
              {emailSettings.isConfigured
                ? `✓ Email configured with ${emailSettings.provider}`
                : 'ℹ Email not configured. Emails will be logged to console.'}
            </span>
          </div>
        </form>
      ) : (
        <div class="text-center py-8">
          <p class="text-base-content/60">Only workspace admins can configure email settings.</p>
        </div>
      )
    }
  </div>
</section>
```

**Step 4: Add email settings JavaScript**

Add to the inline `<script>` section:

```typescript
// ==================== EMAIL SETTINGS ====================
const emailForm = document.getElementById('email-settings-form') as HTMLFormElement | null;
const saveEmailBtn = document.getElementById('save-email-btn') as HTMLButtonElement | null;
const testEmailBtn = document.getElementById('test-email-btn') as HTMLButtonElement | null;

// Password visibility toggle
const togglePasswordBtn = document.querySelector('[data-toggle-password]');
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const input = document.getElementById('email-api-key') as HTMLInputElement;
    const showIcon = togglePasswordBtn.querySelector('[data-show-icon]');
    const hideIcon = togglePasswordBtn.querySelector('[data-hide-icon]');

    if (input.type === 'password') {
      input.type = 'text';
      showIcon?.classList.add('hidden');
      hideIcon?.classList.remove('hidden');
    } else {
      input.type = 'password';
      showIcon?.classList.remove('hidden');
      hideIcon?.classList.add('hidden');
    }
  });
}

// Save email settings
if (saveEmailBtn && emailForm) {
  saveEmailBtn.addEventListener('click', async () => {
    setButtonLoading(saveEmailBtn, true);

    try {
      const formData = new FormData(emailForm);

      const payload: Record<string, unknown> = {};

      const provider = formData.get('provider');
      const apiKey = formData.get('apiKey');
      const senderName = formData.get('senderName');
      const senderAddress = formData.get('senderAddress');

      if (provider) payload.provider = provider;
      if (apiKey) payload.apiKey = apiKey; // Only send if changed
      if (senderName) payload.senderName = senderName;
      if (senderAddress) payload.senderAddress = senderAddress;

      const response = await fetch('/api/workspace/email-settings', {
        method: 'PUT',
        headers: getCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addToast('Email settings saved!', 'success');
        // Refresh page to update status
        setTimeout(() => window.location.reload(), 1000);
      } else {
        addToast(result.error?.message || 'Failed to save email settings', 'error');
      }
    } catch (error) {
      console.error('Email settings error:', error);
      addToast('An error occurred. Please try again.', 'error');
    } finally {
      setButtonLoading(saveEmailBtn, false);
    }
  });
}

// Test email
if (testEmailBtn) {
  testEmailBtn.addEventListener('click', async () => {
    setButtonLoading(testEmailBtn, true);

    try {
      const response = await fetch('/api/workspace/email-settings', {
        method: 'POST',
        headers: getCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addToast(result.data.message || 'Test email sent!', 'success');
      } else {
        addToast(result.error?.message || 'Failed to send test email', 'error');
      }
    } catch (error) {
      console.error('Test email error:', error);
      addToast('An error occurred. Please try again.', 'error');
    } finally {
      setButtonLoading(testEmailBtn, false);
    }
  });
}
```

**Step 5: Run typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/settings/index.astro
git commit -m "$(cat <<'EOF'
feat(ui): add Email tab to settings page

Admin-only email configuration UI with provider dropdown,
API key input with visibility toggle, sender fields,
test button, and status indicator.
EOF
)"
```

---

## Task 11: Wire Email to Password Reset

**Files:**

- Modify: `src/services/password-reset.service.ts`

**Step 1: Update password reset to send email**

Import email service and update `requestPasswordReset` function:

```typescript
import { emailService } from '@/services';

// Get base URL from environment or use default
function getBaseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.PUBLIC_API_URL?.replace('/api', '') ||
    'http://localhost:4321'
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  // ... existing validation code ...

  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      console.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate secure token
    const token = nanoid(64);
    const tokenId = nanoid();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.user_id, user.id));

    // Create new reset token
    await db.insert(passwordResetTokens).values({
      id: tokenId,
      token,
      user_id: user.id,
      expires_at: expiresAt,
    });

    // Send email via email service
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await emailService.sendPasswordReset(user.workspace_id, {
        to: email,
        resetUrl,
        expiresIn: '1 hour',
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      // (console fallback will have already logged it)
      console.error('[Password Reset] Email sending failed:', emailError);
    }
  } catch (error) {
    console.error('[ERROR] Password reset request failed:', error);
  }
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/password-reset.service.ts
git commit -m "$(cat <<'EOF'
feat(email): wire email sending to password reset flow

Sends password reset emails via EmailService with graceful
fallback to console logging if email is not configured.
EOF
)"
```

---

## Task 12: Wire Email to Workspace Invitations

**Files:**

- Modify: `src/services/workspace-invitation.service.ts`

**Step 1: Update invitation service to send emails**

Import email service and update `create` and `resend` methods:

```typescript
import { emailService } from '@/services';

// Get base URL from environment or use default
function getBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || process.env.PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4321';
}

// Update create method - add email sending after creating invitation:
async create(input: CreateInvitationInput): Promise<WorkspaceInvitation> {
  // ... existing validation and insertion code ...

  const [invitation] = await this.db
    .insert(workspaceInvitations)
    .values({
      // ... existing values ...
    })
    .returning();

  // Send invitation email
  try {
    // Get workspace and inviter details for email
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(workspaces.id, validated.workspaceId),
    });

    const inviter = await this.db.query.users.findFirst({
      where: eq(users.id, validated.invitedByUserId),
    });

    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;

    await emailService.sendWorkspaceInvitation(validated.workspaceId, {
      to: validated.email,
      inviterName: inviter?.name || 'A team member',
      workspaceName: workspace?.name || 'your workspace',
      inviteUrl,
      expiresIn: '7 days',
    });
  } catch (emailError) {
    // Log email error but don't fail the invitation creation
    console.error('[Invitation] Email sending failed:', emailError);
  }

  return invitation;
}

// Update resend method - add email sending after extending expiration:
async resend(id: string): Promise<void> {
  // ... existing validation code ...

  // Extend expiration
  const newExpiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

  await this.db
    .update(workspaceInvitations)
    .set({
      expires_at: newExpiresAt,
    })
    .where(eq(workspaceInvitations.id, id));

  // Resend invitation email
  try {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(workspaces.id, invitation.workspace_id),
    });

    const inviter = await this.db.query.users.findFirst({
      where: eq(users.id, invitation.invited_by_user_id),
    });

    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;

    await emailService.sendWorkspaceInvitation(invitation.workspace_id, {
      to: invitation.email,
      inviterName: inviter?.name || 'A team member',
      workspaceName: workspace?.name || 'your workspace',
      inviteUrl,
      expiresIn: '7 days',
    });
  } catch (emailError) {
    console.error('[Invitation] Resend email failed:', emailError);
  }
}
```

Add users import at top:

```typescript
import { workspaceInvitations, workspaces, users, type IDatabase } from '@/db';
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/workspace-invitation.service.ts
git commit -m "$(cat <<'EOF'
feat(email): wire email sending to workspace invitations

Sends invitation emails when creating or resending invitations
via EmailService with graceful fallback to console logging.
EOF
)"
```

---

## Task 13: Create Key Generation Script

**Files:**

- Create: `src/scripts/generate-email-key.ts`
- Modify: `package.json`

**Step 1: Create the script**

Create `src/scripts/generate-email-key.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Generate Email Encryption Key
 *
 * Generates a secure 32-byte encryption key for email API key storage.
 * Add the output to your .env file.
 *
 * Usage: bun run cli:generate-email-key
 */

import { generateEncryptionKey } from '@/lib/crypto/encryption';

console.log('\n🔐 Email Encryption Key Generator\n');
console.log('Add the following line to your .env file:\n');

const key = generateEncryptionKey();
console.log(`EMAIL_ENCRYPTION_KEY=${key}`);

console.log('\n⚠️  Keep this key secure! If lost, encrypted API keys cannot be recovered.\n');
```

**Step 2: Add script to package.json**

Add to scripts section:

```json
"cli:generate-email-key": "bun run src/scripts/generate-email-key.ts"
```

**Step 3: Run the script to verify**

Run: `bun run cli:generate-email-key`
Expected: Outputs a key like `EMAIL_ENCRYPTION_KEY=...`

**Step 4: Commit**

```bash
git add src/scripts/generate-email-key.ts package.json
git commit -m "$(cat <<'EOF'
feat(cli): add email encryption key generator script

Run 'bun run cli:generate-email-key' to generate a secure
32-byte encryption key for EMAIL_ENCRYPTION_KEY env var.
EOF
)"
```

---

## Task 14: Update Environment Example

**Files:**

- Modify: `.env.example`

**Step 1: Add email environment variables**

Add to `.env.example`:

```bash
# Email Configuration
# Generate key with: bun run cli:generate-email-key
EMAIL_ENCRYPTION_KEY=your-32-byte-key-base64-encoded

# Email mode (optional)
# "console" = log emails to console (for development)
# "real" = send via configured provider (default for production)
EMAIL_MODE=console
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
docs: add email env vars to .env.example

Documents EMAIL_ENCRYPTION_KEY and EMAIL_MODE environment
variables required for email integration.
EOF
)"
```

---

## Task 15: Run All Tests and Quality Gates

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 3: Final commit if any formatting changes**

```bash
git add -A
git status
# If changes, commit:
git commit -m "chore: fix formatting from quality gates"
```

---

## Summary

This plan implements email SMTP integration in 15 tasks:

1. **Error handling** - EmailServiceError and error codes
2. **Encryption** - AES-256-GCM utility for API key storage
3. **Meta keys** - Workspace meta keys for email config
4. **Meta service** - Email settings methods
5. **Providers** - Console, SendGrid, Resend adapters
6. **Templates** - HTML email template service
7. **Email service** - Main service with provider selection
8. **Export** - Service singleton from index
9. **API endpoint** - CRUD and test endpoint
10. **Settings UI** - Email tab in settings page
11. **Password reset** - Wire email sending
12. **Invitations** - Wire email sending
13. **Key generator** - CLI script for encryption key
14. **Env example** - Document env variables
15. **Quality gates** - Run all tests and linting

Each task is ~5 minutes with TDD approach and frequent commits.
