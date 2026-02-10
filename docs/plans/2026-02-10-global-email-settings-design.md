# Global Email Settings

## Problem

Email settings are stored per-workspace in `workspace_meta`. When a new user signs up and creates a workspace, they need to verify their email — but email settings don't exist yet for their workspace. The verification email falls back to console logging and never arrives. Chicken-and-egg problem.

## Solution

Move email configuration from per-workspace DB storage to global environment variables. Email is an instance-level concern, not a workspace-level one.

## Design Decisions

- **Global only** — no per-workspace override
- **Environment variables** — consistent with existing `EMAIL_MODE`, no DB needed
- **Use `getEnv()`** from `src/lib/env.ts` — works across Bun, Cloudflare Workers, tests
- **Resend as default provider**
- **Remove Email tab** from workspace settings entirely
- **Keep encryption module** (`src/lib/crypto/encryption.ts`) for future use
- **No database migration** — old `workspace_meta` email rows become inert

## New Environment Variables

```bash
# .env / .env.example
EMAIL_MODE=console              # existing: "console" | "real"
EMAIL_PROVIDER=resend           # NEW: "resend" | "sendgrid"
EMAIL_API_KEY=re_xxxxx          # NEW: plain text (no DB encryption needed)
EMAIL_SENDER_NAME=Expenses App  # NEW: display name
EMAIL_SENDER_ADDRESS=noreply@example.com  # NEW: sender email
```

## Cloudflare Workers (wrangler.toml)

Non-secret vars in `[vars]`:

```toml
EMAIL_PROVIDER = "resend"
EMAIL_SENDER_NAME = "Expenses App"
EMAIL_SENDER_ADDRESS = "noreply@allowealth.io"
EMAIL_MODE = "real"
```

Secret via CLI:

```bash
wrangler secret put EMAIL_API_KEY
```

## Changes

### Modify

1. **`src/services/email/email.service.ts`**
   - Replace `workspaceMetaService.getEmailSettings(workspaceId)` with `getEnv()` calls
   - Remove decryption step
   - Remove `workspaceMetaService` dependency
   - `isConfigured()` becomes a simple env var check

2. **`src/services/workspace-meta.service.ts`**
   - Remove all email-related methods: `getEmailSettings`, `isEmailConfigured`, `setEmailProvider`, `setEmailApiKey`, `setEmailSenderName`, `setEmailSenderAddress`, `clearEmailSettings`

3. **`src/pages/settings/index.astro`**
   - Remove the Email tab entirely (form, test button, status indicator)

4. **`.env.example`**
   - Add `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_SENDER_NAME`, `EMAIL_SENDER_ADDRESS`
   - Remove `EMAIL_ENCRYPTION_KEY`

5. **`wrangler.toml`**
   - Add email vars to `[vars]` section
   - Add `EMAIL_API_KEY` to secrets comments

6. **`src/lib/constants/workspace-meta-keys.ts`**
   - Remove the 4 `EMAIL_*` meta key constants

7. **Email trigger services** (minor — remove workspaceId from email config lookups if passed):
   - `src/services/email-verification.service.ts`
   - `src/services/password-reset.service.ts`
   - `src/services/workspace-invitation.service.ts`

### Delete

1. **`src/pages/api/workspace/email-settings.ts`** — all 4 endpoints (GET/PUT/POST/DELETE)

### Keep Unchanged

- `workspace_meta` table/schema — may store other settings
- `src/lib/crypto/encryption.ts` — keep for future use
- `scripts/generate-email-key.ts` — keep for future use
- Email providers (`sendgrid.provider.ts`, `resend.provider.ts`, `console.provider.ts`)
- Email templates (`email-template.service.ts`)
- `EMAIL_MODE` env var

## Email Service Core Change

```typescript
import { getEnv } from '@/lib/env';

private getEmailConfig(): EmailConfig {
  return {
    provider: getEnv('EMAIL_PROVIDER') || 'resend',
    apiKey: getEnv('EMAIL_API_KEY') || '',
    senderName: getEnv('EMAIL_SENDER_NAME') || 'Expenses App',
    senderAddress: getEnv('EMAIL_SENDER_ADDRESS') || '',
  };
}
```

## Migration for Existing Deployments

1. Add new env vars to `.env` / Cloudflare Workers
2. `EMAIL_ENCRYPTION_KEY` can be removed (no harm if left)
3. Old email rows in `workspace_meta` are inert — no cleanup needed
4. No database migration required
