# Email Change Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to change their email via a verify-first flow using existing `user_meta` and `email_verification_tokens` tables.

**Architecture:** Extend `EmailVerificationService` with email change methods. Modify `PUT /api/user/profile` to trigger verification when email changes instead of updating directly. Reuse `GET /api/auth/verify-email` with branching logic based on `pending_email` in `user_meta`.

**Tech Stack:** Astro 5, Drizzle ORM, Lucia Auth, Zod, DaisyUI v5, bun:test

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

### Task 3: Extend EmailVerificationService with email change methods

**Files:**

- Modify: `src/services/email-verification.service.ts`
- Test: `src/services/email-verification.service.test.ts`

**Step 1: Write failing tests for requestEmailChange**

Add to `src/services/email-verification.service.test.ts`:

```typescript
import { userMeta } from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';

// Add inside the main describe block, after existing tests:

describe('requestEmailChange', () => {
  it('should store pending email in user_meta and create verification token', async () => {
    // First verify the user (required for email change)
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

    // Create another user with the target email
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
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL — `requestEmailChange` does not exist

**Step 3: Write failing tests for verifyEmail email change branch**

Add to test file:

```typescript
describe('verifyEmail - email change', () => {
  it('should update user email when pending_email exists', async () => {
    // Set user as verified
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

    // Create verification token
    const token = await service.createVerificationToken(testUserId);

    const result = await service.verifyEmail(token);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('changed@example.com');
    }

    // Verify user email was updated in DB
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    expect(updatedUser!.email).toBe('changed@example.com');

    // Verify pending_email was cleaned up
    const meta = await db.query.userMeta.findFirst({
      where: and(
        eq(userMeta.user_id, testUserId),
        eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });
    expect(meta).toBeUndefined();
  });
});
```

**Step 4: Run tests to verify they fail**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL — email not updated (existing verifyEmail doesn't check pending_email)

**Step 5: Write failing test for getPendingEmailChange**

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

**Step 6: Implement requestEmailChange**

In `src/services/email-verification.service.ts`, add imports and method:

Add imports at top:

```typescript
import { UserServiceError, ServiceErrorCode } from './service-errors';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { nanoid } from 'nanoid';
import { getLinkedOAuthAccounts } from './auth.service';
```

Add constructor parameter for `UserMetaService`:

```typescript
import type { UserMetaService } from './user-meta.service';

// Update constructor:
constructor(
  private db: IDatabase,
  private emailSvc?: EmailService,
  private userMetaSvc?: UserMetaService
) {
```

Add methods to `EmailVerificationService`:

```typescript
async requestEmailChange(userId: string, newEmail: string): Promise<void> {
  const normalizedEmail = newEmail.toLowerCase();

  // Check user exists
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
    // Direct insert for when service is not injected (e.g., tests)
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

  // Create verification token
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

async getPendingEmailChange(userId: string): Promise<string | null> {
  if (this.userMetaSvc) {
    const value = await this.userMetaSvc.getUserMeta(userId, USER_META_KEYS.PENDING_EMAIL);
    return value && value.length > 0 ? value : null;
  }

  // Direct query fallback
  const meta = await this.db.query.userMeta.findFirst({
    where: and(
      eq(this.schema.userMeta.user_id, userId),
      eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
    ),
  });

  return meta?.meta_value && meta.meta_value.length > 0 ? meta.meta_value : null;
}
```

Import `and` at the top: add `and` to the existing import from `drizzle-orm`.

**Step 7: Modify verifyEmail to branch on pending_email**

In the `verifyEmail` method, after fetching the user and checking they're not deleted (around line 148-149), replace the "already verified" check and the verification logic with:

```typescript
// Check for pending email change
const pendingEmail = await this.getPendingEmailChange(userId);

if (pendingEmail) {
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
  return { success: true, user: updatedUser };
}

// Original signup verification flow (no pending email)
// Check if already verified (idempotent)
if (user.email_verified_at) {
  log.info('User already verified', { userId });
  await this.db
    .delete(this.schema.emailVerificationTokens)
    .where(eq(this.schema.emailVerificationTokens.user_id, userId));
  return { success: true, user };
}

// Mark user as verified
const verifiedAt = new Date();
await this.db
  .update(this.schema.users)
  .set({ email_verified_at: verifiedAt })
  .where(eq(this.schema.users.id, userId));

// Delete all verification tokens for this user
await this.db
  .delete(this.schema.emailVerificationTokens)
  .where(eq(this.schema.emailVerificationTokens.user_id, userId));

log.info('Email verified successfully', { userId });

const verifiedUser = { ...user, email_verified_at: verifiedAt };
return { success: true, user: verifiedUser };
```

**Step 8: Update singleton in services/index.ts**

In `src/services/index.ts`, update the `emailVerificationService` instantiation to pass `userMetaService`:

```typescript
export const emailVerificationService = new EmailVerificationService(
  db,
  emailService,
  userMetaService
);
```

**Step 9: Run tests**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: PASS

**Step 10: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 11: Commit**

```bash
git add src/services/email-verification.service.ts src/services/email-verification.service.test.ts src/services/index.ts
git commit -m "feat(auth): add email change request and verification to EmailVerificationService"
```

---

### Task 4: Modify UserService.updateProfile to skip direct email update

**Files:**

- Modify: `src/services/user.service.ts`

**Step 1: Remove email update from updateProfile**

In `UserService.updateProfile()`, change the `.set()` call to only update `name` (not `email`):

```typescript
// Update user (name only - email changes go through verification)
await this.db
  .update(this.schema.users)
  .set({
    name: validated.name.trim(),
    updated_at: new Date(),
  })
  .where(eq(this.schema.users.id, userId));
```

Keep the email uniqueness check — it's still needed so the API can return 409 before starting the verification flow. But move the check into a separate method the API route can call:

Actually, the email check should remain in the API route (Task 5), not in `updateProfile`. Remove the email-related logic from `updateProfile` entirely:

```typescript
async updateProfile(userId: string, input: { name: string }) {
  // Validate name
  const nameSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  });
  const validated = nameSchema.parse(input);

  // Check if user exists
  const user = await this.db.query.users.findFirst({
    where: eq(this.schema.users.id, userId),
  });

  if (!user) {
    throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
  }

  // Update user name only
  await this.db
    .update(this.schema.users)
    .set({
      name: validated.name.trim(),
      updated_at: new Date(),
    })
    .where(eq(this.schema.users.id, userId));

  // Return updated user
  const updatedUser = await this.db.query.users.findFirst({
    where: eq(this.schema.users.id, userId),
  });

  return updatedUser!;
}
```

Also remove `updateProfileSchema` export since it's no longer used (the API route uses its own schema). Keep the `UpdateProfileInput` type but update it to `{ name: string }`.

Wait — the `updateProfileSchema` is imported in the profile API route. Let's keep the schema but remove the `email` field. Actually, the API route uses its own `updateFullProfileSchema`, not `updateProfileSchema`. Check if `updateProfileSchema` is imported anywhere else. If only used in user.service.ts, simplify inline. If used in tests, update them.

**Step 2: Run typecheck to check for import usages**

Run: `bun run typecheck`
Check for any errors related to `updateProfileSchema` or `UpdateProfileInput`.

**Step 3: Fix any type errors**

If any consumers reference the old `email` parameter of `updateProfile()`, update them.

**Step 4: Run tests**

Run: `bun test src/services/user.service.test.ts` (if exists)
Expected: PASS

**Step 5: Run full typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/user.service.ts
git commit -m "refactor(user): remove direct email update from updateProfile"
```

---

### Task 5: Modify profile API to handle email change

**Files:**

- Modify: `src/pages/api/user/profile.ts`

**Step 1: Update GET handler to include pendingEmail**

Modify `GET` handler to check for pending email:

```typescript
import { userService, userMetaService, emailVerificationService } from '@/services';

// In GET handler, after getting settings:
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

**Step 2: Update PUT handler for email change flow**

Replace the PUT handler body:

```typescript
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateFullProfileSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, email, phone, bio } = validation.data;

    // Update user table (name only - email goes through verification)
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

    // Handle email change
    let pendingEmail: string | undefined;
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail !== user.email.toLowerCase()) {
      // Email changed — trigger verification flow
      await emailVerificationService.requestEmailChange(auth.userId, normalizedEmail);
      pendingEmail = normalizedEmail;
    } else {
      // Check if there's already a pending change (email was changed back to current)
      const existingPending = await emailVerificationService.getPendingEmailChange(auth.userId);
      if (existingPending) {
        // User changed email back to current — cancel pending change
        await userMetaService.deleteUserMeta(auth.userId, 'pending_email');
        // Also clean up any verification tokens
        // (tokens will expire naturally, but deleting is cleaner)
      }
    }

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

Add `emailVerificationService` to imports from `@/services`.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/user/profile.ts
git commit -m "feat(api): handle email change verification in profile PUT endpoint"
```

---

### Task 6: Modify verify-email endpoint for email change branch

**Files:**

- Modify: `src/pages/api/auth/verify-email.ts`

**Step 1: Add session invalidation for email change**

After the service's `verifyEmail()` call, check if the result indicates an email change happened (the user's email differs from what we'd expect for signup verification). The simplest approach: check if a `pendingEmail` was consumed by checking the result.

Since `verifyEmail` in the service already handles the branching, we need the API route to:

1. Invalidate all sessions when email was changed
2. Redirect differently for email change vs signup

Add a way to detect email change: check if the user had `pending_email` _before_ calling verifyEmail. Or, better, extend the `VerifyEmailResult` type.

Update `VerifyEmailResult` in `email-verification.service.ts`:

```typescript
export type VerifyEmailResult =
  | { success: true; user: UserRecord; emailChanged?: boolean }
  | { success: false; error: string; email?: string };
```

In the email change branch of `verifyEmail`, set `emailChanged: true`:

```typescript
return { success: true, user: updatedUser, emailChanged: true };
```

**Step 2: Update verify-email API route**

In `src/pages/api/auth/verify-email.ts`, after `result.success`:

```typescript
import { auth } from '@/lib/auth/lucia';
import { invalidateUserSessions } from '@/lib/auth/session-cache';

// After const user = result.user:
if (result.emailChanged) {
  // Invalidate all sessions (DB + cache) to force re-login with new email
  await auth.deleteUserSessions(user.id);
  await invalidateUserSessions(user.id);

  log.info('Email changed, all sessions invalidated', { userId: user.id });
  return redirect('/login?email-changed=true', 302);
}
```

**Step 3: Update login.astro to handle email-changed query param**

In `src/pages/login.astro`, add to the frontmatter:

```typescript
const emailChanged = url.searchParams.get('email-changed');
```

Add to the banner logic:

```typescript
} else if (emailChanged === 'true') {
  bannerMessage = 'Email changed successfully! Please sign in with your new email.';
  bannerType = 'success';
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email-verification.service.ts src/pages/api/auth/verify-email.ts src/pages/login.astro
git commit -m "feat(auth): add email change branch to verify-email endpoint with session invalidation"
```

---

### Task 7: Update profile UI for pending email state

**Files:**

- Modify: `src/components/organisms/ManageAccountForms.astro`
- Modify: `src/pages/profile.astro`

**Step 1: Pass pendingEmail to ManageAccountForms**

In `src/pages/profile.astro`, fetch pending email:

```typescript
import { emailVerificationService } from '@/services';

const pendingEmail = await emailVerificationService.getPendingEmailChange(user.id);
```

Pass to component:

```astro
<ManageAccountForms user={user} pendingEmail={pendingEmail} />
```

**Step 2: Update ManageAccountForms Props and render**

In `src/components/organisms/ManageAccountForms.astro`:

Update Props interface:

```typescript
export interface Props {
  user: UserType;
  pendingEmail?: string | null;
}

const { user, pendingEmail } = Astro.props;
```

Add a pending email indicator below the email input (inside the `<div class="form-control">` that contains the email field):

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Pending verification: <strong>{pendingEmail}</strong>
        </span>
      </div>
    )
  }
</div>
```

**Step 3: Update client-side script for email change response**

In `src/pages/profile.astro`, modify the profile form submit handler to check for `pendingEmail` in the response:

```typescript
if (!response.ok || !result.success) {
  addToast(result.error?.message || 'Failed to update profile.', 'error');
  return;
}

// Check if email change was triggered
if (result.data?.pendingEmail) {
  addToast(result.data.message || `Verification email sent to ${result.data.pendingEmail}`, 'info');
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
git commit -m "feat(ui): show pending email verification state on profile page"
```

---

### Task 8: Run quality gates and final verification

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
3. Profile page shows "Pending verification: newemail@example.com"
4. Check console for email template output (if EMAIL_MODE=console)
5. Change email back to original — pending indicator disappears

**Step 8: Final commit (if quality gates made changes)**

```bash
git add -A
git commit -m "chore: apply quality gate fixes"
```
