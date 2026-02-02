# Email SMTP Integration Design

**Date:** 2026-02-02
**Status:** Approved
**Author:** Brainstorming session

## Overview

Integration with external email providers (SendGrid, Resend) for sending transactional emails including password resets, workspace invitations, and future notification features.

## Design Decisions

| Decision         | Choice                                | Rationale                                        |
| ---------------- | ------------------------------------- | ------------------------------------------------ |
| Provider support | Dropdown selection (SendGrid, Resend) | Simple, extensible for future providers          |
| Settings scope   | Workspace-level (workspace_meta)      | Matches existing patterns, supports multi-tenant |
| API key storage  | AES-256-GCM encrypted                 | Industry best practice for sensitive credentials |
| UI location      | New "Email" tab in Settings           | Clear separation, room to grow                   |
| Dev mode         | `EMAIL_MODE` env variable             | Explicit control, production safety              |
| Templates        | Builder pattern service               | Consistent branding, simple API                  |
| Test button      | Send to current user's email          | Immediate feedback, no extra input               |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Settings UI                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Email Tab                                            │   │
│  │ ┌──────────────┐ ┌──────────────────────────────┐   │   │
│  │ │ Provider ▼   │ │ API Key: ••••••••••••        │   │   │
│  │ └──────────────┘ └──────────────────────────────┘   │   │
│  │ ┌──────────────────────────────────────────────┐    │   │
│  │ │ Sender Name:  Expenses App                   │    │   │
│  │ │ Sender Email: noreply@example.com            │    │   │
│  │ └──────────────────────────────────────────────┘    │   │
│  │                          [Test] [Save]              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EmailService                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ sendgrid     │  │ resend       │  │ console      │      │
│  │ provider     │  │ provider     │  │ provider     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────┐       │
│  │            EmailTemplateService                  │       │
│  │  • passwordReset(url, expires)                  │       │
│  │  • workspaceInvitation(url, inviter, workspace) │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **EmailService** - Main entry point. Loads config from workspace_meta, decrypts API key, delegates to provider
2. **Providers** - SendGrid, Resend adapters with identical interface. Console provider for dev/fallback
3. **EmailTemplateService** - Builds consistent HTML emails with shared styling
4. **CryptoService** - AES-256-GCM encryption for API keys

## Data Model

### Workspace Meta Keys

| Key                    | Value Example                   | Description            |
| ---------------------- | ------------------------------- | ---------------------- |
| `email_provider`       | `"sendgrid"` or `"resend"`      | Selected provider      |
| `email_api_key`        | `"aes256gcm:iv:ciphertext:tag"` | Encrypted API key      |
| `email_sender_name`    | `"Expenses App"`                | Display name in emails |
| `email_sender_address` | `"noreply@example.com"`         | From address           |

### Encryption Format

The encrypted API key stored as a single string:

```
aes256gcm:<base64-iv>:<base64-ciphertext>:<base64-auth-tag>
```

### Environment Variables

```bash
# Required for API key encryption (32 bytes, base64 encoded)
EMAIL_ENCRYPTION_KEY=your-32-byte-key-base64-encoded

# Optional: Override email behavior
# "console" = log to console (dev mode)
# "real" = send via configured provider (default)
EMAIL_MODE=console
```

## Service Layer API

### EmailService Interface

```typescript
// Usage from anywhere in server-side code
import { emailService } from '@/services';

// Send password reset email
await emailService.sendPasswordReset(workspaceId, {
  to: 'user@example.com',
  resetUrl: 'https://app.example.com/reset-password?token=abc123',
  expiresIn: '1 hour',
});

// Send workspace invitation
await emailService.sendWorkspaceInvitation(workspaceId, {
  to: 'newuser@example.com',
  inviterName: 'John Doe',
  workspaceName: 'Family Budget',
  inviteUrl: 'https://app.example.com/register?token=xyz789',
  expiresIn: '7 days',
});

// Test email configuration
await emailService.sendTest(workspaceId, {
  to: 'admin@example.com',
  workspaceName: 'Family Budget',
});

// Check if email is configured
const isConfigured = await emailService.isConfigured(workspaceId);
```

### Provider Interface

```typescript
interface EmailProvider {
  send(options: {
    apiKey: string;
    from: { name: string; email: string };
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; error?: string }>;
}
```

### Error Handling

```typescript
// EmailServiceError with specific codes
throw new EmailServiceError(
  EmailErrorCode.NOT_CONFIGURED, // No email settings
  EmailErrorCode.INVALID_API_KEY, // Provider rejected key
  EmailErrorCode.SEND_FAILED, // Delivery failed
  EmailErrorCode.ENCRYPTION_ERROR // Key decrypt failed
);
```

## Email Templates

### Template Structure

All emails share a consistent wrapper:

```
┌─────────────────────────────────────────┐
│            [Workspace Name]             │  ← Header
├─────────────────────────────────────────┤
│                                         │
│         [Content Block]                 │  ← Varies per email type
│                                         │
├─────────────────────────────────────────┤
│  This email was sent from [App Name]    │  ← Footer
│  © [Current Year]                       │
└─────────────────────────────────────────┘
```

### Template Types

**Password Reset:**

```
Subject: Reset your password

Hi,

We received a request to reset your password.
Click the button below to set a new password:

        [ Reset Password ]

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email.
```

**Workspace Invitation:**

```
Subject: You've been invited to join [Workspace Name]

Hi,

[Inviter Name] has invited you to join [Workspace Name]
on Expenses App.

        [ Accept Invitation ]

This invitation expires in 7 days.
```

**Test Email:**

```
Subject: Test email from [Workspace Name]

Your email configuration is working correctly.

Provider: SendGrid
Sender: noreply@example.com
```

### Styling

- Clean, minimal design (works in all email clients)
- Responsive (mobile-friendly)
- No external images (inline CSS only)
- Primary button uses a safe blue (`#2563eb`) for broad client support

## Settings UI

### Email Tab Layout

Located in `/settings` page as a new tab alongside General, Members, Notifications, Data:

```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                    │
├─────────────────────────────────────────────────────────────┤
│ [General] [Members] [Email] [Notifications] [Data]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email Configuration                                        │
│  Configure email delivery for invitations and notifications │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Provider                                             │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Select a provider...                          ▼ │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │   • SendGrid                                        │   │
│  │   • Resend                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ API Key                                              │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ ••••••••••••••••••••••••••                    👁 │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Sender Name                                          │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Expenses App                                     │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Sender Email                                         │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ noreply@yourdomain.com                           │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│           [Send Test Email]              [Save Settings]    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ℹ  Not configured. Emails will be logged to console │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Behavior

- **Admin only** - Only workspace admins can view/edit email settings
- **API key visibility** - Hidden by default, toggle to reveal
- **Status indicator** - Shows current state (not configured / configured / error)
- **Test button** - Disabled until all fields are filled; sends to current user's email
- **Validation** - Email format validation on sender email field

## Integration Points

### Wiring Email to Existing Features

**1. Password Reset** (`src/services/password-reset.service.ts`)

```typescript
// Before (TODO placeholder)
console.log(`[DEV] Password reset token for ${email}: ${token}`);

// After
await emailService.sendPasswordReset(workspaceId, {
  to: email,
  resetUrl: `${baseUrl}/reset-password?token=${token}`,
  expiresIn: '1 hour',
});
```

**2. Workspace Invitations** (`src/services/workspace-invitation.service.ts`)

```typescript
// Add to create() method
await emailService.sendWorkspaceInvitation(workspaceId, {
  to: invitation.email,
  inviterName: inviter.name,
  workspaceName: workspace.name,
  inviteUrl: `${baseUrl}/register?token=${invitation.token}`,
  expiresIn: '7 days',
});

// Add to resend() method - same email, refreshed expiration
```

**3. Graceful Degradation**

When email is not configured:

- Log email details to console (for development)
- Return success (don't block the operation)
- Show info message in UI: "Email not configured - check console for link"

When email fails:

- Log the error
- Return the result to caller (let them decide how to handle)
- For invitations: still create the record (admin can copy link manually)

## File Structure

### New Files

```
src/
├── lib/
│   ├── crypto/
│   │   └── encryption.ts          # AES-256-GCM encrypt/decrypt
│   └── constants/
│       └── workspace-meta-keys.ts # Add email_* keys
│
├── services/
│   ├── email/
│   │   ├── email.service.ts       # Main EmailService class
│   │   ├── email-template.service.ts  # Template builder
│   │   ├── providers/
│   │   │   ├── index.ts           # Provider factory
│   │   │   ├── sendgrid.provider.ts
│   │   │   ├── resend.provider.ts
│   │   │   └── console.provider.ts
│   │   └── email-errors.ts        # Error codes & classes
│   └── index.ts                   # Export emailService singleton
│
├── pages/
│   ├── settings/
│   │   └── index.astro            # Add Email tab
│   └── api/
│       └── workspace/
│           └── email-settings.ts  # GET/PUT email config, POST test
│
└── scripts/
    └── generate-email-key.ts      # CLI to generate encryption key
```

### Modified Files

| File                                           | Change                                   |
| ---------------------------------------------- | ---------------------------------------- |
| `src/lib/constants/workspace-meta-keys.ts`     | Add `email_*` keys                       |
| `src/services/password-reset.service.ts`       | Wire email sending                       |
| `src/services/workspace-invitation.service.ts` | Wire email sending                       |
| `src/pages/settings/index.astro`               | Add Email tab UI                         |
| `.env.example`                                 | Add `EMAIL_ENCRYPTION_KEY`, `EMAIL_MODE` |

## Implementation Order

1. **Crypto utility** - encryption/decryption functions
2. **Email providers** - SendGrid, Resend, Console adapters
3. **Email template service** - HTML template builder
4. **Email service** - Main service with config loading
5. **API endpoint** - Settings CRUD + test endpoint
6. **Settings UI** - Email tab with form
7. **Wire to features** - Password reset, invitations
8. **CLI script** - Key generation helper
