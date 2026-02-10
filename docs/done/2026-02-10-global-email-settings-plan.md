# Global Email Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move email configuration from per-workspace DB storage to global environment variables, fixing the chicken-and-egg problem where new signups can't receive verification emails.

**Architecture:** EmailService drops its WorkspaceMetaService dependency and reads config from `getEnv()`. The Email tab, API endpoints, and workspace-meta email methods are removed. Provider/sender config moves to `.env` and `wrangler.toml`.

**Tech Stack:** TypeScript, Astro, `getEnv()` from `src/lib/env.ts`, `bun:test`

**Design doc:** `docs/plans/2026-02-10-global-email-settings-design.md`

---

### Task 1: Rewrite EmailService to use env vars

**Files:**

- Modify: `src/services/email/email.service.ts`

**Step 1: Write the new EmailService**

Replace the entire `EmailService` class. Key changes:

- Remove `WorkspaceMetaService` constructor dependency
- Remove `decrypt` import
- Add `getEmailConfig()` private method using `getEnv()`
- Remove `workspaceId` parameter from all public methods
- Remove `isConfigured(workspaceId)` method — replace with `isConfigured()` (no args)
- Remove `sendTest` method (no UI to trigger it from)
- Simplify `send()` to use env-based config instead of DB lookup + decryption

```typescript
/**
 * Email Service
 *
 * Main entry point for sending emails. Handles configuration loading,
 * provider selection, and graceful degradation.
 */

import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('email');
import {
  getEmailProvider,
  consoleProvider,
  type SendEmailResult,
  type EmailProvider,
} from './providers';
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
 * Email verification options
 */
export interface SendEmailVerificationOptions {
  to: string;
  userName: string;
  verificationUrl: string;
}

/**
 * Email configuration from environment variables
 */
interface EmailConfig {
  provider: string;
  apiKey: string;
  senderName: string;
  senderAddress: string;
}

/**
 * Email Service
 *
 * Provides methods for sending transactional emails with automatic
 * provider selection and graceful fallback to console logging.
 *
 * Configuration is read from environment variables (global, not per-workspace).
 */
export class EmailService {
  /**
   * Get email configuration from environment variables
   */
  private getEmailConfig(): EmailConfig {
    return {
      provider: getEnv('EMAIL_PROVIDER') || 'resend',
      apiKey: getEnv('EMAIL_API_KEY') || '',
      senderName: getEnv('EMAIL_SENDER_NAME') || 'Expenses App',
      senderAddress: getEnv('EMAIL_SENDER_ADDRESS') || '',
    };
  }

  /**
   * Check if email is configured globally
   */
  isConfigured(): boolean {
    const config = this.getEmailConfig();
    return !!(config.provider && config.apiKey && config.senderAddress);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(options: SendPasswordResetOptions): Promise<SendEmailResult> {
    const { to, resetUrl, expiresIn } = options;
    const template = emailTemplateService.passwordReset({ resetUrl, expiresIn });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send a workspace invitation email
   */
  async sendWorkspaceInvitation(options: SendWorkspaceInvitationOptions): Promise<SendEmailResult> {
    const { to, inviterName, workspaceName, inviteUrl, expiresIn } = options;
    const template = emailTemplateService.workspaceInvitation({
      inviterName,
      workspaceName,
      inviteUrl,
      expiresIn,
    });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Send an email verification email
   */
  async sendEmailVerification(options: SendEmailVerificationOptions): Promise<SendEmailResult> {
    const { to, userName, verificationUrl } = options;
    const template = emailTemplateService.emailVerification({ verificationUrl, userName });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Internal send method with provider selection and fallback
   */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendEmailResult> {
    const { to, subject, html } = options;

    // Check if we're in console mode (development)
    if (getEnv('EMAIL_MODE') === 'console') {
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Console Mode', email: 'console@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get email configuration from env vars
    const config = this.getEmailConfig();

    // If not configured, fall back to console
    if (!config.provider || !config.apiKey || !config.senderAddress) {
      log.warn('not configured, falling back to console provider');
      return consoleProvider.send({
        apiKey: '',
        from: { name: 'Not Configured', email: 'notconfigured@localhost' },
        to,
        subject,
        html,
      });
    }

    // Get provider
    let provider: EmailProvider;
    try {
      provider = getEmailProvider(config.provider);
    } catch (error) {
      log.error('invalid provider:', config.provider);
      throw new EmailServiceError(
        EmailErrorCode.INVALID_PROVIDER,
        `Invalid email provider: ${config.provider}`,
        400
      );
    }

    // Send email
    const result = await provider.send({
      apiKey: config.apiKey,
      from: {
        name: config.senderName,
        email: config.senderAddress,
      },
      to,
      subject,
      html,
    });

    // Log failures
    if (!result.success) {
      log.error('send failed:', result.error);

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

**Step 2: Run typecheck to see cascading errors**

Run: `bun run typecheck 2>&1 | head -50`
Expected: Errors in callers that still pass `workspaceId` to email methods and instantiate `EmailService(workspaceMetaService)`.

---

### Task 2: Update EmailService callers

**Files:**

- Modify: `src/services/index.ts`
- Modify: `src/services/email-verification.service.ts`
- Modify: `src/services/password-reset.service.ts`
- Modify: `src/services/workspace-invitation.service.ts`
- Modify: `src/services/email/index.ts`

**Step 1: Update services/index.ts**

Change `emailService` instantiation — no longer needs `workspaceMetaService`:

```typescript
// Before:
export const emailService = new EmailService(workspaceMetaService);

// After:
export const emailService = new EmailService();
```

**Step 2: Update email-verification.service.ts:93**

Remove `workspaceId` from `sendEmailVerification` call:

```typescript
// Before:
await this.emailSvc.sendEmailVerification(user.workspace_id, {

// After:
await this.emailSvc.sendEmailVerification({
```

**Step 3: Update password-reset.service.ts:154**

Remove `workspaceId` from `sendPasswordReset` call:

```typescript
// Before:
await emailService.sendPasswordReset(user.workspace_id, {

// After:
await emailService.sendPasswordReset({
```

**Step 4: Update workspace-invitation.service.ts:390**

Remove `workspaceId` from `sendWorkspaceInvitation` call:

```typescript
// Before:
await emailService.sendWorkspaceInvitation(invitation.workspace_id, {

// After:
await emailService.sendWorkspaceInvitation({
```

**Step 5: Remove SendTestOptions from email/index.ts**

Remove the `SendTestOptions` export since `sendTest` method no longer exists:

```typescript
// Remove this line:
export type { SendTestOptions } from './email.service';
// (SendTestOptions no longer exists)
```

The updated exports should be:

```typescript
export type {
  SendPasswordResetOptions,
  SendWorkspaceInvitationOptions,
  SendEmailVerificationOptions,
} from './email.service';
```

**Step 6: Run typecheck**

Run: `bun run typecheck 2>&1 | head -50`
Expected: Errors only in files we haven't touched yet (settings page, API endpoint, workspace-meta-keys).

---

### Task 3: Remove email-related code from workspace-meta

**Files:**

- Modify: `src/lib/constants/workspace-meta-keys.ts`
- Modify: `src/services/workspace-meta.service.ts`

**Step 1: Clean workspace-meta-keys.ts**

Remove from `WORKSPACE_META_KEYS`:

```typescript
// Remove these 4 lines:
EMAIL_PROVIDER: 'email_provider',
EMAIL_API_KEY: 'email_api_key',
EMAIL_SENDER_NAME: 'email_sender_name',
EMAIL_SENDER_ADDRESS: 'email_sender_address',
```

Remove from `WORKSPACE_META_DEFAULTS`:

```typescript
// Remove these 4 lines:
[WORKSPACE_META_KEYS.EMAIL_PROVIDER]: '',
[WORKSPACE_META_KEYS.EMAIL_API_KEY]: '',
[WORKSPACE_META_KEYS.EMAIL_SENDER_NAME]: '',
[WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS]: '',
```

Remove `EMAIL_PROVIDERS`, `EmailProvider`, `isValidEmailProvider`, and `EmailSettings`:

```typescript
// Delete these entirely:
export const EMAIL_PROVIDERS = ['sendgrid', 'resend'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
export function isValidEmailProvider(value: string): value is EmailProvider { ... }
export interface EmailSettings { ... }
```

**Step 2: Clean workspace-meta.service.ts**

Remove imports that no longer exist:

```typescript
// Remove from imports:
EMAIL_PROVIDERS,
isValidEmailProvider,
type EmailSettings,
```

Remove the 4 email validation cases from `validateMetaValue()`:

```typescript
// Remove cases for:
// WORKSPACE_META_KEYS.EMAIL_PROVIDER
// WORKSPACE_META_KEYS.EMAIL_API_KEY
// WORKSPACE_META_KEYS.EMAIL_SENDER_NAME
// WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS
```

Remove the entire "Email settings methods" section (lines 437-530):

- `getEmailSettings()`
- `isEmailConfigured()`
- `setEmailProvider()`
- `setEmailApiKey()`
- `setEmailSenderName()`
- `setEmailSenderAddress()`
- `clearEmailSettings()`

**Step 3: Run typecheck**

Run: `bun run typecheck 2>&1 | head -50`
Expected: Errors only in the settings page and email-settings API (which we'll delete/modify next).

---

### Task 4: Remove email settings UI and API

**Files:**

- Delete: `src/pages/api/workspace/email-settings.ts`
- Modify: `src/pages/settings/index.astro`

**Step 1: Delete the email-settings API endpoint**

```bash
rm src/pages/api/workspace/email-settings.ts
```

**Step 2: Remove email tab from settings page**

In `src/pages/settings/index.astro`:

a. Remove unused imports from frontmatter:

```typescript
// Remove 'Mail' from lucide imports (only if not used elsewhere in the file)
// Remove 'Save' only if the general save button uses a different reference
// Keep 'Mail' if used in pending invitations section (it IS used there, so keep it)
```

b. Remove the email settings data fetch (lines 119-143):

```typescript
// Delete entire block:
// Initialize email settings
let emailSettings = { ... };
// Fetch email settings (admin only)
if (isAdmin) { ... }
```

c. Remove the email tab from `navItems` (line 148):

```typescript
// Remove:
{ id: 'email', label: 'Email', icon: Mail },
```

d. Remove the entire Email panel section (lines 523-698):

```html
<!-- Delete entire section: -->
{/* Email Panel */}
<section id="settings-panel-email" ...>...</section>
```

e. Remove the email settings client-side JS (lines 989-1089):

```typescript
// Delete entire block:
// ==================== EMAIL SETTINGS ====================
// ... through end of test email handler
```

**Step 3: Run typecheck**

Run: `bun run typecheck 2>&1 | head -50`
Expected: Clean — no errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: move email config from workspace DB to env vars

Fixes chicken-and-egg: new signups couldn't receive verification emails
because email settings didn't exist yet for their new workspace.

- EmailService reads from getEnv() instead of workspace_meta DB
- Remove Email tab from workspace settings page
- Remove /api/workspace/email-settings endpoints
- Remove email methods from WorkspaceMetaService
- Remove EMAIL_* constants from workspace-meta-keys"
```

---

### Task 5: Update email service tests

**Files:**

- Modify: `src/services/email/email.service.test.ts`

**Step 1: Rewrite tests for env-based EmailService**

The tests no longer need a mock `WorkspaceMetaService`. Instead, use `setTestEnv()` to control email config:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmailServiceError, EmailErrorCode } from './email-errors';
import { EmailService } from './email.service';
import { setTestEnv } from '@/lib/env';

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
  beforeEach(() => {
    // Default to console mode for tests
    setTestEnv({
      EMAIL_MODE: 'console',
    });
  });

  afterEach(() => {
    setTestEnv(null);
  });

  describe('isConfigured', () => {
    it('should return true when all email env vars are set', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: 're_test_key',
        EMAIL_SENDER_NAME: 'Test App',
        EMAIL_SENDER_ADDRESS: 'test@example.com',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_SENDER_ADDRESS: 'test@example.com',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when sender address is missing', () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: 're_test_key',
      });

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendPasswordReset({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendWorkspaceInvitation', () => {
    it('should send workspace invitation email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendWorkspaceInvitation({
        to: 'newuser@example.com',
        inviterName: 'John',
        workspaceName: 'Test Workspace',
        inviteUrl: 'https://example.com/signup?token=xyz',
        expiresIn: '7 days',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email via console in dev mode', async () => {
      const service = new EmailService();

      const result = await service.sendEmailVerification({
        to: 'user@example.com',
        userName: 'Test User',
        verificationUrl: 'https://example.com/verify?token=abc',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('graceful degradation', () => {
    it('should use console provider when env vars not configured', async () => {
      setTestEnv({
        EMAIL_MODE: 'real',
        // No provider/key/address set
      });

      const service = new EmailService();

      const result = await service.sendPasswordReset({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      });

      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/services/email/email.service.test.ts`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/services/email/email.service.test.ts && git commit -m "test: update email service tests for env-based config"
```

---

### Task 6: Remove ENCRYPTION_ERROR from email errors

**Files:**

- Modify: `src/services/email/email-errors.ts`

**Step 1: Remove ENCRYPTION_ERROR enum value**

Since the email service no longer decrypts anything, remove the unused error code:

```typescript
// Remove this line:
ENCRYPTION_ERROR = 'EMAIL_ENCRYPTION_ERROR',
```

**Step 2: Check no code references ENCRYPTION_ERROR**

Run: `grep -r "ENCRYPTION_ERROR" src/ --include="*.ts"`
Expected: No matches (the only usage was in the old email.service.ts `send()` method).

**Step 3: Run typecheck and tests**

Run: `bun run typecheck && bun test src/services/email/`
Expected: Clean.

**Step 4: Commit**

```bash
git add src/services/email/email-errors.ts && git commit -m "refactor: remove unused ENCRYPTION_ERROR from email error codes"
```

---

### Task 7: Update environment config files

**Files:**

- Modify: `.env.example`
- Modify: `wrangler.toml`

**Step 1: Update .env.example**

Replace the email configuration section:

```bash
# Before:
# Email Configuration
# Generate key with: bun run cli:generate-email-key
EMAIL_ENCRYPTION_KEY=your-32-byte-key-base64-encoded

# Email mode (optional)
# "console" = log emails to console (for development)
# "real" = send via configured provider (default for production)
EMAIL_MODE=console

# After:
# Email Configuration
# "console" = log emails to console (for development)
# "real" = send via configured provider (default for production)
EMAIL_MODE=console

# Email provider: "resend" | "sendgrid"
EMAIL_PROVIDER=resend

# API key from your email provider dashboard (plain text)
EMAIL_API_KEY=

# Sender display name and verified email address
EMAIL_SENDER_NAME=Expenses App
EMAIL_SENDER_ADDRESS=
```

**Step 2: Update wrangler.toml**

Add email vars to `[vars]` section:

```toml
[vars]
NODE_ENV = "production"
PUBLIC_URL = "https://allowealth.io"
CACHE_DRIVER = "upstash"
PERF_DEBUG = "true"
LOG_LEVEL = "warn"
EMAIL_MODE = "real"
EMAIL_PROVIDER = "resend"
EMAIL_SENDER_NAME = "Expenses App"
EMAIL_SENDER_ADDRESS = "noreply@allowealth.io"
```

Update the secrets comment:

```toml
# Secrets (set via CLI, not committed):
# wrangler secret put DATABASE_URL
# wrangler secret put EMAIL_API_KEY
```

**Step 3: Commit**

```bash
git add .env.example wrangler.toml && git commit -m "config: add email env vars to .env.example and wrangler.toml"
```

---

### Task 8: Final verification

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass cleanly.

**Step 2: Run all tests**

```bash
bun test
```

Expected: All pass.

**Step 3: Run build**

```bash
bun run build
```

Expected: Clean build.

**Step 4: Final commit if any formatting changes**

```bash
git status
# If any formatting changes from lint:fix/format:fix:
git add -A && git commit -m "style: apply formatting fixes"
```
