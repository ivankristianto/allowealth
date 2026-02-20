# Email Change Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to change their email via a verify-first flow using existing `user_meta` and `email_verification_tokens` tables.

**Architecture:** Extend `EmailVerificationService` with email change methods. Modify `PUT /api/user/profile` to trigger verification when email changes (fail-fast, before other profile updates). Reuse `GET /api/auth/verify-email` with branching logic based on `pending_email` in `user_meta`. Re-check email uniqueness at verification time to prevent race conditions.

**Tech Stack:** Astro 5, Drizzle ORM, Lucia Auth, Zod, DaisyUI v5, bun:test

**Implementation order note:** Workflow rules mandate UI -> Service -> API. This plan follows Service -> UI -> API because the UI renders `pendingEmail` from service calls in SSR — the service must exist first. UI is placed before API endpoint changes so the visual state is validated early.

---

### Task 1: Add PENDING_EMAIL to user meta keys

**Files:**

- Modify: `src/lib/constants/user-meta-keys.ts`

**Step 1: Add the PENDING_EMAIL key constant**

In `src/lib/constants/user-meta-keys.ts`, add `PENDING_EMAIL` to `USER_META_KEYS`:

```typescript
export const USER_META_KEYS = {
  SHOW_CONVERTED_TOTALS: 'show_converted_totals',
  SHOW_INDIVIDUAL_CURRENCIES: 'show_individual_currencies',
  PHONE: 'phone',
  BIO: 'bio',
  PENDING_EMAIL: 'pending_email',
} as const;
```

**Step 2: Add the validation schema for PENDING_EMAIL**

In the `META_VALUE_SCHEMAS` record, add:

```typescript
[USER_META_KEYS.PENDING_EMAIL]: z.string().email('Invalid email format').max(255, 'Email must be at most 255 characters'),
```

**Step 3: Add default value**

In `META_DEFAULTS`, add:

```typescript
[USER_META_KEYS.PENDING_EMAIL]: '',
```

**Step 4: Update the metaKeySchema enum**

Add `USER_META_KEYS.PENDING_EMAIL` to the `z.enum()` array in `metaKeySchema`.

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no errors)

**Step 6: Commit**

```bash
git add src/lib/constants/user-meta-keys.ts
git commit -m "feat(auth): add PENDING_EMAIL user meta key for email change flow"
```

---

### Task 2: Add email change verification template

**Files:**

- Modify: `src/services/email/email-template.service.ts`
- Modify: `src/services/email/email.service.ts`

**Step 1: Add EmailChangeVerificationOptions interface**

In `src/services/email/email-template.service.ts`, add after `EmailVerificationOptions`:

```typescript
export interface EmailChangeVerificationOptions {
  verificationUrl: string;
  userName: string;
  newEmail: string;
}
```

**Step 2: Add emailChangeVerification template method**

In `EmailTemplateService` class, add method:

```typescript
emailChangeVerification(options: EmailChangeVerificationOptions): EmailTemplate {
  const { verificationUrl, userName, newEmail } = options;

  const content = `
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
  Confirm your new email
</h1>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
  Hi ${escapeHtml(userName)}, you requested to change your email address to <strong>${escapeHtml(newEmail)}</strong>. Click the button below to confirm this change.
</p>
${this.button('Confirm Email Change', verificationUrl)}
<p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
  This link expires in 24 hours.
</p>
<p style="margin: 0; font-size: 13px; color: #71717a;">
  If you didn't request this change, you can safely ignore this email. Your current email will remain unchanged.
</p>
`.trim();

  return {
    subject: sanitizeSubject('Confirm your new email address'),
    html: this.wrap(content),
  };
}
```

**Step 3: Add SendEmailChangeVerificationOptions to email service**

In `src/services/email/email.service.ts`, add interface:

```typescript
export interface SendEmailChangeVerificationOptions {
  to: string;
  userName: string;
  newEmail: string;
  verificationUrl: string;
}
```

**Step 4: Add sendEmailChangeVerification method**

In `EmailService` class, add:

```typescript
async sendEmailChangeVerification(options: SendEmailChangeVerificationOptions): Promise<SendEmailResult> {
  const { to, userName, newEmail, verificationUrl } = options;
  const template = emailTemplateService.emailChangeVerification({ verificationUrl, userName, newEmail });

  return this.send({
    to,
    subject: template.subject,
    html: template.html,
  });
}
```

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/email/email-template.service.ts src/services/email/email.service.ts
git commit -m "feat(email): add email change verification template and send method"
```

---

### Task 3: Extend EmailVerificationService with email change methods (TDD)

**Files:**

- Modify: `src/services/email-verification.service.ts`
- Modify: `src/services/index.ts`
- Test: `src/services/email-verification.service.test.ts`

**Step 1: Write failing tests for requestEmailChange**

Add to `src/services/email-verification.service.test.ts`:

```typescript
import { userMeta } from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { and } from 'drizzle-orm';

// Add inside the main describe block, after existing tests:

describe('requestEmailChange', () => {
  it('should store pending email in user_meta and create verification token', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    await service.requestEmailChange(testUserId, 'newemail@example.com');

    // Check pending_email in user_meta
    const meta = await db.query.userMeta.findFirst({
      where: and(
        eq(userMeta.user_id, testUserId),
        eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });
    expect(meta).toBeTruthy();
    expect(meta!.meta_value).toBe('newemail@example.com');

    // Check verification token created
    const token = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.user_id, testUserId),
    });
    expect(token).toBeTruthy();
  });

  it('should throw if new email is already taken', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    const otherUserId = nanoid();
    await db.insert(users).values({
      id: otherUserId,
      email: 'taken@example.com',
      password_hash: await hashPassword('TestPassword123!'),
      name: 'Other User',
      workspace_id: testWorkspaceId,
      role: 'member',
    });

    expect(service.requestEmailChange(testUserId, 'taken@example.com')).rejects.toThrow(
      'Email already exists'
    );

    // Cleanup
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  it('should no-op when new email equals current email', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    const user = await db.query.users.findFirst({ where: eq(users.id, testUserId) });
    await service.requestEmailChange(testUserId, user!.email);

    // No pending_email should be set
    const meta = await db.query.userMeta.findFirst({
      where: and(
        eq(userMeta.user_id, testUserId),
        eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });
    expect(meta).toBeUndefined();
  });

  it('should overwrite pending change when requesting again', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    await service.requestEmailChange(testUserId, 'first@example.com');
    await service.requestEmailChange(testUserId, 'second@example.com');

    const meta = await db.query.userMeta.findFirst({
      where: and(
        eq(userMeta.user_id, testUserId),
        eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });
    expect(meta!.meta_value).toBe('second@example.com');

    // Only one token should exist (old deleted by token factory)
    const tokens = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.user_id, testUserId));
    expect(tokens.length).toBe(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL — `requestEmailChange` does not exist

**Step 3: Write failing tests for getPendingEmailChange**

```typescript
describe('getPendingEmailChange', () => {
  it('should return pending email when set', async () => {
    await db.insert(userMeta).values({
      meta_id: nanoid(),
      user_id: testUserId,
      meta_key: USER_META_KEYS.PENDING_EMAIL,
      meta_value: 'pending@example.com',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.getPendingEmailChange(testUserId);
    expect(result).toBe('pending@example.com');
  });

  it('should return null when no pending change', async () => {
    const result = await service.getPendingEmailChange(testUserId);
    expect(result).toBeNull();
  });
});
```

**Step 4: Write failing tests for verifyEmail email change branch**

```typescript
describe('verifyEmail - email change', () => {
  it('should update user email when pending_email exists', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    // Store pending email in user_meta
    await db.insert(userMeta).values({
      meta_id: nanoid(),
      user_id: testUserId,
      meta_key: USER_META_KEYS.PENDING_EMAIL,
      meta_value: 'changed@example.com',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const token = await service.createVerificationToken(testUserId);
    const result = await service.verifyEmail(token);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('changed@example.com');
      expect(result.emailChanged).toBe(true);
    }

    // Verify user email was updated in DB
    const updatedUser = await db.query.users.findFirst({ where: eq(users.id, testUserId) });
    expect(updatedUser!.email).toBe('changed@example.com');

    // Verify pending_email was cleaned up
    const meta = await db.query.userMeta.findFirst({
      where: and(
        eq(userMeta.user_id, testUserId),
        eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });
    expect(meta).toBeUndefined();

    // Verify tokens were cleaned up
    const tokens = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.user_id, testUserId));
    expect(tokens.length).toBe(0);
  });

  it('should fail gracefully if pending email was claimed by another user', async () => {
    await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

    // Store pending email
    await db.insert(userMeta).values({
      meta_id: nanoid(),
      user_id: testUserId,
      meta_key: USER_META_KEYS.PENDING_EMAIL,
      meta_value: 'race@example.com',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const token = await service.createVerificationToken(testUserId);

    // Simulate race: another user claims the email
    const otherUserId = nanoid();
    await db.insert(users).values({
      id: otherUserId,
      email: 'race@example.com',
      password_hash: await hashPassword('TestPassword123!'),
      name: 'Race User',
      workspace_id: testWorkspaceId,
      role: 'member',
    });

    const result = await service.verifyEmail(token);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('EMAIL_ALREADY_EXISTS');
    }

    // Cleanup
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  it('should not set emailChanged for regular signup verification', async () => {
    // User is NOT verified yet (signup flow)
    const token = await service.createVerificationToken(testUserId);
    const result = await service.verifyEmail(token);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.emailChanged).toBeUndefined();
    }
  });
});
```

**Step 5: Run tests to verify they fail**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL

**Step 6: Update VerifyEmailResult type**

In `src/services/email-verification.service.ts`, update the result type:

```typescript
export type VerifyEmailResult =
  | { success: true; user: UserRecord; emailChanged?: boolean }
  | { success: false; error: string; email?: string };
```

**Step 7: Add imports and update constructor**

Add imports at top of `src/services/email-verification.service.ts`:

```typescript
import { and } from 'drizzle-orm'; // add 'and' to existing drizzle-orm import
import { UserServiceError, ServiceErrorCode } from './service-errors';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { nanoid } from 'nanoid';
import { getLinkedOAuthAccounts } from './auth.service';
import type { UserMetaService } from './user-meta.service';
```

Update constructor to accept `UserMetaService`:

```typescript
constructor(
  private db: IDatabase,
  private emailSvc?: EmailService,
  private userMetaSvc?: UserMetaService
) {
```

**Step 8: Implement requestEmailChange**

Add method to `EmailVerificationService`:

```typescript
async requestEmailChange(userId: string, newEmail: string): Promise<void> {
  const normalizedEmail = newEmail.toLowerCase();

  const user = await this.db.query.users.findFirst({
    where: eq(this.schema.users.id, userId),
  });

  if (!user) {
    throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
  }

  // If same as current, nothing to do
  if (normalizedEmail === user.email.toLowerCase()) {
    return;
  }

  // Check if email is already taken
  const existingUser = await this.db.query.users.findFirst({
    where: eq(this.schema.users.email, normalizedEmail),
  });

  if (existingUser) {
    throw new UserServiceError(
      ServiceErrorCode.EMAIL_ALREADY_EXISTS,
      'Email already exists',
      409
    );
  }

  // Store pending email in user_meta (upsert)
  if (this.userMetaSvc) {
    await this.userMetaSvc.setUserMeta(userId, USER_META_KEYS.PENDING_EMAIL, normalizedEmail);
  } else {
    await this.db
      .insert(this.schema.userMeta)
      .values({
        meta_id: nanoid(),
        user_id: userId,
        meta_key: USER_META_KEYS.PENDING_EMAIL,
        meta_value: normalizedEmail,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [this.schema.userMeta.user_id, this.schema.userMeta.meta_key],
        set: {
          meta_value: normalizedEmail,
          updated_at: new Date(),
        },
      });
  }

  // Create verification token (token factory deletes old tokens in a transaction)
  const token = await this.createVerificationToken(userId);

  // Send verification email to the NEW email
  if (this.emailSvc) {
    const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    await this.emailSvc.sendEmailChangeVerification({
      to: normalizedEmail,
      userName: user.name,
      newEmail: normalizedEmail,
      verificationUrl,
    });
  }

  // Unlink all OAuth accounts
  try {
    const oauthAccounts = await getLinkedOAuthAccounts(userId);
    for (const account of oauthAccounts) {
      await this.db
        .delete(this.schema.oauthAccounts)
        .where(eq(this.schema.oauthAccounts.id, account.id));
    }
    if (oauthAccounts.length > 0) {
      log.info('Unlinked OAuth accounts for email change', { userId, count: oauthAccounts.length });
    }
  } catch {
    log.warn('Failed to unlink OAuth accounts', { userId });
  }

  log.info('Email change requested', { userId, newEmail: normalizedEmail });
}
```

**Step 9: Implement getPendingEmailChange**

```typescript
async getPendingEmailChange(userId: string): Promise<string | null> {
  if (this.userMetaSvc) {
    try {
      const value = await this.userMetaSvc.getUserMeta(userId, USER_META_KEYS.PENDING_EMAIL);
      return value && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  const meta = await this.db.query.userMeta.findFirst({
    where: and(
      eq(this.schema.userMeta.user_id, userId),
      eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
    ),
  });

  return meta?.meta_value && meta.meta_value.length > 0 ? meta.meta_value : null;
}
```

**Step 10: Modify verifyEmail to branch on pending_email with race-condition check**

In the `verifyEmail` method, after the soft-delete check (line ~149), replace the remaining logic with:

```typescript
// Check for pending email change
const pendingEmail = await this.getPendingEmailChange(userId);

if (pendingEmail) {
  // Race condition check: re-verify email is still available
  const emailTaken = await this.db.query.users.findFirst({
    where: eq(this.schema.users.email, pendingEmail),
  });

  if (emailTaken) {
    // Email was claimed by another user between request and verification
    log.warn('Pending email claimed by another user', { userId, pendingEmail });

    // Clean up pending state
    await this.db
      .delete(this.schema.userMeta)
      .where(
        and(
          eq(this.schema.userMeta.user_id, userId),
          eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        )
      );
    await this.db
      .delete(this.schema.emailVerificationTokens)
      .where(eq(this.schema.emailVerificationTokens.user_id, userId));

    return { success: false, error: 'EMAIL_ALREADY_EXISTS' };
  }

  // Email change flow
  const verifiedAt = new Date();
  await this.db
    .update(this.schema.users)
    .set({
      email: pendingEmail,
      email_verified_at: verifiedAt,
      updated_at: new Date(),
    })
    .where(eq(this.schema.users.id, userId));

  // Clean up pending_email from user_meta
  await this.db
    .delete(this.schema.userMeta)
    .where(
      and(
        eq(this.schema.userMeta.user_id, userId),
        eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      )
    );

  // Delete all verification tokens for this user
  await this.db
    .delete(this.schema.emailVerificationTokens)
    .where(eq(this.schema.emailVerificationTokens.user_id, userId));

  log.info('Email changed via verification', { userId, newEmail: pendingEmail });

  const updatedUser = { ...user, email: pendingEmail, email_verified_at: verifiedAt };
  return { success: true, user: updatedUser, emailChanged: true };
}

// Original signup verification flow (no pending email)
if (user.email_verified_at) {
  log.info('User already verified', { userId });
  await this.db
    .delete(this.schema.emailVerificationTokens)
    .where(eq(this.schema.emailVerificationTokens.user_id, userId));
  return { success: true, user };
}

const verifiedAt = new Date();
await this.db
  .update(this.schema.users)
  .set({ email_verified_at: verifiedAt })
  .where(eq(this.schema.users.id, userId));

await this.db
  .delete(this.schema.emailVerificationTokens)
  .where(eq(this.schema.emailVerificationTokens.user_id, userId));

log.info('Email verified successfully', { userId });

const verifiedUser = { ...user, email_verified_at: verifiedAt };
return { success: true, user: verifiedUser };
```

**Step 11: Update singleton in services/index.ts**

In `src/services/index.ts`, update the `emailVerificationService` instantiation:

```typescript
export const emailVerificationService = new EmailVerificationService(
  db,
  emailService,
  userMetaService
);
```

**Step 12: Add cleanup to test afterEach**

In the test file's `cleanupTestData()` function, add:

```typescript
if (testUserId) {
  await db.delete(userMeta).where(eq(userMeta.user_id, testUserId));
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.user_id, testUserId));
}
```

Import `userMeta` from `@/db/schema`.

**Step 13: Run tests**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: PASS

**Step 14: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 15: Commit**

```bash
git add src/services/email-verification.service.ts src/services/email-verification.service.test.ts src/services/index.ts
git commit -m "feat(auth): add email change request and verification to EmailVerificationService

- requestEmailChange: stores pending_email, creates token, sends email, unlinks OAuth
- getPendingEmailChange: returns pending email or null
- verifyEmail: branches on pending_email with race-condition re-check
- Tests cover: request, overwrite, duplicate email, race condition, cleanup"
```

---

### Task 4: Modify UserService.updateProfile to skip direct email update

**Files:**

- Modify: `src/services/user.service.ts`

**Step 1: Remove email update from updateProfile**

In `UserService.updateProfile()`, remove the email uniqueness check and email update. The method now only updates `name`:

```typescript
async updateProfile(userId: string, input: { name: string }) {
  const nameSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  });
  const validated = nameSchema.parse(input);

  const user = await this.db.query.users.findFirst({
    where: eq(this.schema.users.id, userId),
  });

  if (!user) {
    throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
  }

  await this.db
    .update(this.schema.users)
    .set({
      name: validated.name.trim(),
      updated_at: new Date(),
    })
    .where(eq(this.schema.users.id, userId));

  const updatedUser = await this.db.query.users.findFirst({
    where: eq(this.schema.users.id, userId),
  });

  return updatedUser!;
}
```

**Step 2: Check for usages of old updateProfileSchema and UpdateProfileInput**

Run: `grep -r "updateProfileSchema\|UpdateProfileInput" src/ --include="*.ts" --include="*.astro"`

If `updateProfileSchema` is only used within `user.service.ts`, remove it. If referenced elsewhere, update callers. The API route uses its own `updateFullProfileSchema` so it should not be affected.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (fix any import errors from removed exports)

**Step 4: Run user service tests**

Run: `bun test src/services/user.service.test.ts` (if exists)
Expected: PASS (update tests if they test email update through updateProfile)

**Step 5: Commit**

```bash
git add src/services/user.service.ts
git commit -m "refactor(user): remove direct email update from updateProfile

Email changes now go through EmailVerificationService.requestEmailChange()
instead of being updated directly in updateProfile()."
```

---

### Task 5: Update profile UI for pending email state and OAuth warning

**Files:**

- Modify: `src/components/organisms/ManageAccountForms.astro`
- Modify: `src/pages/profile.astro`

**Step 1: Pass pendingEmail and hasOAuth to ManageAccountForms**

In `src/pages/profile.astro` frontmatter, add:

```typescript
import { emailVerificationService } from '@/services';
import { getLinkedOAuthAccounts } from '@/services/auth.service';

const pendingEmail = await emailVerificationService.getPendingEmailChange(user.id);
const oauthAccounts = await getLinkedOAuthAccounts(user.id);
const hasLinkedOAuth = oauthAccounts.length > 0;
```

Pass to component:

```astro
<ManageAccountForms user={user} pendingEmail={pendingEmail} hasLinkedOAuth={hasLinkedOAuth} />
```

**Step 2: Update ManageAccountForms Props and render**

In `src/components/organisms/ManageAccountForms.astro`:

Update Props and imports:

```typescript
import { Info, AlertTriangle } from '@lucide/astro';

export interface Props {
  user: UserType;
  pendingEmail?: string | null;
  hasLinkedOAuth?: boolean;
}

const { user, pendingEmail, hasLinkedOAuth } = Astro.props;
```

Add pending email indicator below the email input field. Replace the email `<div class="form-control">` block:

```astro
<div class="form-control">
  <Label htmlFor="email" required>Email Address</Label>
  <Input
    type="email"
    id="email"
    name="email"
    placeholder="your@email.com"
    value={displayEmail}
    pattern={patterns.email.html}
    title={patterns.email.title}
    required
    className="rounded-full py-4 px-6 h-14 text-base font-bold border border-base-300"
  />
  {
    pendingEmail && (
      <div class="mt-2 flex items-center gap-2 text-sm text-info">
        <Info size={16} class="shrink-0" />
        <span>
          Pending verification: <strong>{pendingEmail}</strong>
        </span>
      </div>
    )
  }
  {
    hasLinkedOAuth && (
      <div
        class="mt-2 flex items-center gap-2 text-sm text-warning"
        id="oauth-warning"
        style="display: none;"
      >
        <AlertTriangle size={16} class="shrink-0" />
        <span>Changing your email will unlink all connected OAuth accounts (e.g., Google).</span>
      </div>
    )
  }
</div>
```

Add `data-current-email` attribute to the email input for client-side comparison:

```astro
<Input ...existing props... data-current-email={displayEmail} />
```

**Step 3: Update client-side script for email change response and OAuth warning**

In `src/pages/profile.astro`, update the script section:

```typescript
// After existing const declarations, add:
const oauthWarning = document.getElementById('oauth-warning');

// Show/hide OAuth warning when email changes
if (profileEmailInput && oauthWarning) {
  profileEmailInput.addEventListener('input', () => {
    const currentEmail = profileEmailInput.dataset.currentEmail || '';
    const isChanged = profileEmailInput.value.toLowerCase() !== currentEmail.toLowerCase();
    oauthWarning.style.display = isChanged ? 'flex' : 'none';
  });
}

// In the submit handler, replace the success toast with:
if (!response.ok || !result.success) {
  addToast(result.error?.message || 'Failed to update profile.', 'error');
  return;
}

// Check if email change was triggered
if (result.data?.pendingEmail) {
  addToast(result.data.message || `Verification email sent to ${result.data.pendingEmail}`, 'info');
  // Reload to show pending badge from SSR
  window.location.reload();
} else {
  addToast('Profile updated successfully!', 'success');
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/organisms/ManageAccountForms.astro src/pages/profile.astro
git commit -m "feat(ui): show pending email badge and OAuth warning on profile page

- Pending verification indicator using Lucide Info icon
- OAuth unlink warning shown when email field changes
- Client-side toast for email change response with page reload"
```

---

### Task 6: Modify profile API to handle email change (fail-fast)

**Files:**

- Modify: `src/pages/api/user/profile.ts`

**Step 1: Update GET handler to include pendingEmail**

Add `emailVerificationService` to imports:

```typescript
import { userService, userMetaService, emailVerificationService } from '@/services';
```

In GET handler, after getting settings, add pending email:

```typescript
const pendingEmail = await emailVerificationService.getPendingEmailChange(auth.userId);

return successResponse({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: settings.phone,
  bio: settings.bio,
  ...(pendingEmail && { pendingEmail }),
});
```

**Step 2: Update PUT handler with fail-fast email change**

Replace the PUT handler. Key change: **email change runs FIRST** (fail-fast), before other profile updates. If email change fails (409 duplicate), no profile changes are persisted:

```typescript
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateFullProfileSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, email, phone, bio } = validation.data;

    // Get current user for email comparison
    const currentUser = await userService.getById(auth.userId);
    if (!currentUser) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // FAIL-FAST: Handle email change FIRST (before other updates)
    // If this throws (e.g., 409 duplicate), no profile changes are made
    let pendingEmail: string | undefined;
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail !== currentUser.email.toLowerCase()) {
      await emailVerificationService.requestEmailChange(auth.userId, normalizedEmail);
      pendingEmail = normalizedEmail;
    } else {
      // Check if user changed email back to current while a change was pending
      const existingPending = await emailVerificationService.getPendingEmailChange(auth.userId);
      if (existingPending) {
        // Cancel pending change: clear meta AND delete stale tokens
        await userMetaService.deleteUserMeta(auth.userId, 'pending_email');
        // Token factory's createToken already deleted old tokens if a new request was made,
        // but for cancellation we need to explicitly clean up
        const { getActiveSchema } = await import('@/db');
        const { db } = await import('@/db');
        const schema = getActiveSchema();
        await db
          .delete(schema.emailVerificationTokens)
          .where(eq(schema.emailVerificationTokens.user_id, auth.userId));
      }
    }

    // Now safe to update other profile fields
    const user = await userService.updateProfile(auth.userId, { name });

    // Update meta values (phone, bio)
    const metaPromises: Promise<void>[] = [];
    if (phone !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'phone', phone));
    }
    if (bio !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'bio', bio));
    }
    await Promise.all(metaPromises);

    // Get updated settings
    const settings = await userMetaService.getUserSettings(auth.userId);

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: settings.phone,
      bio: settings.bio,
      ...(pendingEmail && { pendingEmail }),
      ...(pendingEmail && { message: `Verification email sent to ${pendingEmail}` }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error updating user profile', error);
    return errorResponse('Failed to update profile', 500);
  }
};
```

Note: The `eq` import is needed — add `import { eq } from 'drizzle-orm';` to existing imports.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/user/profile.ts
git commit -m "feat(api): handle email change verification in profile PUT with fail-fast ordering

- Email change runs before other profile updates (no partial writes)
- Cancel pending change clears both meta and stale tokens
- GET includes pendingEmail in response"
```

---

### Task 7: Modify verify-email endpoint for email change branch

**Files:**

- Modify: `src/pages/api/auth/verify-email.ts`
- Modify: `src/pages/login.astro`

**Step 1: Add session invalidation and email-changed redirect**

In `src/pages/api/auth/verify-email.ts`, add imports:

```typescript
import { auth } from '@/lib/auth/lucia';
import { invalidateUserSessions } from '@/lib/auth/session-cache';
```

After `const user = result.user;`, add email change handling before the existing admin workspace activation:

```typescript
// Handle email change — invalidate sessions and redirect
if (result.emailChanged) {
  await auth.deleteUserSessions(user.id);
  await invalidateUserSessions(user.id);

  log.info('Email changed, all sessions invalidated', { userId: user.id });
  return redirect('/login?email-changed=true', 302);
}
```

Also add handling for the `EMAIL_ALREADY_EXISTS` error in the failure branch:

```typescript
if (error === 'EMAIL_ALREADY_EXISTS') {
  log.warn('Email change failed - email claimed by another user');
  return redirect('/login?error=email_taken', 302);
}
```

**Step 2: Update login.astro for email-changed and email_taken**

In `src/pages/login.astro` frontmatter, add:

```typescript
const emailChanged = url.searchParams.get('email-changed');
```

Add to `errorMessages`:

```typescript
email_taken: 'Email change failed — the email is now used by another account.',
```

Add to the banner logic (after the `expired_token` check):

```typescript
} else if (emailChanged === 'true') {
  bannerMessage = 'Email changed successfully! Please sign in with your new email.';
  bannerType = 'success';
}
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/auth/verify-email.ts src/pages/login.astro
git commit -m "feat(auth): add email change branch to verify-email with session invalidation

- Invalidates all DB sessions and cache on email change
- Redirects to /login?email-changed=true on success
- Handles EMAIL_ALREADY_EXISTS race condition with error redirect
- Login page shows success/error banners for email change"
```

---

### Task 8: Update OpenAPI documentation

**Files:**

- Modify: OpenAPI spec files for user profile endpoints

**Step 1: Find existing OpenAPI files**

Run: `find src/ openapi/ docs/ -name "*.yaml" -o -name "*.yml" | grep -i openapi` or check `openapi/` directory.

**Step 2: Update profile GET response schema**

Add `pendingEmail` optional string field to the GET `/api/user/profile` response:

```yaml
pendingEmail:
  type: string
  format: email
  description: 'Email address pending verification (only present when a change is in progress)'
```

**Step 3: Update profile PUT response schema**

Add `pendingEmail` and `message` optional fields to PUT response:

```yaml
pendingEmail:
  type: string
  format: email
  description: 'New email pending verification'
message:
  type: string
  description: 'Human-readable message about the email change'
```

**Step 4: Document new error codes**

Add `EMAIL_ALREADY_EXISTS` (409) error response to PUT endpoint documentation.

**Step 5: Commit**

```bash
git add openapi/
git commit -m "docs(openapi): update profile endpoints for email change verification"
```

---

### Task 9: Quality gates and final verification

**Files:** None (verification only)

**Step 1: Run lint**

Run: `bun run lint:fix`
Expected: PASS

**Step 2: Run stylelint**

Run: `bun run stylelint:fix`
Expected: PASS

**Step 3: Run format**

Run: `bun run format:fix`
Expected: PASS

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Run all tests**

Run: `bun run test`
Expected: PASS

**Step 6: Run build**

Run: `bun run build`
Expected: PASS

**Step 7: Manual verification**

Start dev server: `bun run dev`

Verify in browser:

1. Go to `/profile` — email field visible, no pending indicator
2. Change email to a new address, submit — toast shows "Verification email sent to..."
3. Profile page reloads showing "Pending verification: newemail@example.com"
4. Check console for email template output (if EMAIL_MODE=console)
5. Change email back to original — pending indicator disappears, tokens cleaned up
6. If user has linked OAuth, changing email shows warning about unlinking
7. Verify that submitting a duplicate email returns 409 with no other profile changes
8. Click verification link — redirects to login with success banner

**Step 8: Final commit (if quality gates made changes)**

```bash
git add -A
git commit -m "chore: apply quality gate fixes"
```
