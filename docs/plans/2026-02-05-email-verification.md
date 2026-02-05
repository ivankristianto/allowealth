# Email Verification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement mandatory email verification for all user registrations with workspace activation

**Architecture:** Add email_verification_tokens table, modify users and workspaces tables for verification tracking. Create EmailVerificationService for token management. Update AuthService registration/login flows to require verification. Add UI for resend functionality with dual rate limiting.

**Tech Stack:** Drizzle ORM (SQLite + PostgreSQL), Lucia Auth, existing EmailService, nanoid for tokens

---

## Task 1: Database Schema - SQLite

**Files:**

- Create: `src/db/schema/sqlite/email-verification-tokens.ts`
- Modify: `src/db/schema/sqlite/users.ts`
- Modify: `src/db/schema/sqlite/workspaces.ts`
- Modify: `src/db/schema/sqlite/index.ts`

**Step 1: Create email verification tokens schema**

Create `src/db/schema/sqlite/email-verification-tokens.ts`:

```typescript
/**
 * Email Verification Tokens Schema (SQLite)
 *
 * Stores email verification tokens for user registration.
 * Tokens expire after 24 hours and are deleted after successful verification.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';
import { users } from './users';

export const emailVerificationTokens = sqliteTable('email_verification_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token')
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(64)),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
```

**Step 2: Add email_verified_at to users table**

In `src/db/schema/sqlite/users.ts`, add after the `role` field:

```typescript
emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
```

**Step 3: Add status to workspaces table**

In `src/db/schema/sqlite/workspaces.ts`, add after the `name` field:

```typescript
status: text('status', { enum: ['active', 'inactive'] })
  .notNull()
  .default('active'),
```

**Step 4: Export new schema in index**

In `src/db/schema/sqlite/index.ts`, add to exports:

```typescript
export * from './email-verification-tokens';
```

**Step 5: Commit schema changes**

```bash
git add src/db/schema/sqlite/email-verification-tokens.ts src/db/schema/sqlite/users.ts src/db/schema/sqlite/workspaces.ts src/db/schema/sqlite/index.ts
git commit -m "feat(db): add email verification schema for SQLite

- Add email_verification_tokens table with 24h expiration
- Add email_verified_at to users table
- Add status (active/inactive) to workspaces table"
```

---

## Task 2: Database Schema - PostgreSQL

**Files:**

- Create: `src/db/schema/postgresql/email-verification-tokens.ts`
- Modify: `src/db/schema/postgresql/users.ts`
- Modify: `src/db/schema/postgresql/workspaces.ts`
- Modify: `src/db/schema/postgresql/index.ts`

**Step 1: Create email verification tokens schema**

Create `src/db/schema/postgresql/email-verification-tokens.ts`:

```typescript
/**
 * Email Verification Tokens Schema (PostgreSQL)
 *
 * Stores email verification tokens for user registration.
 * Tokens expire after 24 hours and are deleted after successful verification.
 */

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { users } from './users';

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token')
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(64)),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}).enableRLS();

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
```

**Step 2: Add email_verified_at to users table**

In `src/db/schema/postgresql/users.ts`, add after the `role` field:

```typescript
emailVerifiedAt: timestamp('email_verified_at'),
```

**Step 3: Add status to workspaces table**

In `src/db/schema/postgresql/workspaces.ts`, add after the `name` field:

```typescript
status: text('status', { enum: ['active', 'inactive'] })
  .notNull()
  .default('active'),
```

**Step 4: Export new schema in index**

In `src/db/schema/postgresql/index.ts`, add to exports:

```typescript
export * from './email-verification-tokens';
```

**Step 5: Commit schema changes**

```bash
git add src/db/schema/postgresql/email-verification-tokens.ts src/db/schema/postgresql/users.ts src/db/schema/postgresql/workspaces.ts src/db/schema/postgresql/index.ts
git commit -m "feat(db): add email verification schema for PostgreSQL

- Add email_verification_tokens table with RLS enabled
- Add email_verified_at to users table
- Add status (active/inactive) to workspaces table"
```

---

## Task 3: Generate Database Migrations

**Files:**

- Generate: `drizzle/sqlite/[timestamp]_add_email_verification.sql`
- Generate: `drizzle/postgresql/[timestamp]_add_email_verification.sql`

**Step 1: Generate SQLite migration**

Run: `bun run db:generate`
Expected: Creates migration file in `drizzle/sqlite/`

**Step 2: Generate PostgreSQL migration**

Run: `bun run db:generate:prod`
Expected: Creates migration file in `drizzle/postgresql/`

**Step 3: Review generated migrations**

Check that both migrations contain:

- CREATE TABLE email_verification_tokens
- ALTER TABLE users ADD COLUMN email_verified_at
- ALTER TABLE workspaces ADD COLUMN status
- CREATE INDEX statements for token, user_id, expires_at

**Step 4: Apply SQLite migration locally**

Run: `bun run db:migrate`
Expected: Migration applied successfully

**Step 5: Commit migrations**

```bash
git add drizzle/
git commit -m "feat(db): generate email verification migrations

- SQLite and PostgreSQL migrations for email_verification_tokens
- Add email_verified_at to users
- Add status to workspaces"
```

---

## Task 4: Email Verification Service - Core Logic

**Files:**

- Create: `src/services/email-verification.service.ts`
- Test: `src/services/email-verification.service.test.ts`

**Step 1: Write failing test for createVerificationToken**

Create `src/services/email-verification.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { EmailVerificationService } from './email-verification.service';
import { db } from '@/db';
import { getActiveSchema } from '@/db';
import { nanoid } from 'nanoid';

const schema = getActiveSchema();

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let testUserId: string;

  beforeEach(async () => {
    service = new EmailVerificationService(db);

    // Create test user
    testUserId = nanoid();
    await db.insert(schema.users).values({
      id: testUserId,
      email: `test-${nanoid()}@example.com`,
      passwordHash: 'hash',
      name: 'Test User',
      workspaceId: nanoid(),
      role: 'admin',
    });
  });

  it('should create verification token with 24h expiration', async () => {
    const token = await service.createVerificationToken(testUserId);

    expect(token).toBeTruthy();
    expect(token.length).toBe(64);

    // Verify token in database
    const dbToken = await db
      .select()
      .from(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.userId, testUserId))
      .limit(1);

    expect(dbToken.length).toBe(1);
    expect(dbToken[0].token).toBe(token);

    // Check expiration is ~24 hours from now
    const expiresIn = dbToken[0].expiresAt.getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(23 * 60 * 60 * 1000); // > 23 hours
    expect(expiresIn).toBeLessThan(25 * 60 * 60 * 1000); // < 25 hours
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL with "module not found"

**Step 3: Write minimal EmailVerificationService**

Create `src/services/email-verification.service.ts`:

```typescript
/**
 * Email Verification Service
 *
 * Manages email verification tokens for user registration.
 * Tokens expire after 24 hours and are single-use.
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { eq, and, lt } from 'drizzle-orm';
import { EmailService } from './email';

const log = createLogger('email-verification');

export class EmailVerificationService {
  private schema = getActiveSchema();

  constructor(private db: IDatabase) {}

  /**
   * Create verification token for user and send email
   * @param userId - User ID to create token for
   * @returns Generated token string
   */
  async createVerificationToken(userId: string): Promise<string> {
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.db.insert(this.schema.emailVerificationTokens).values({
      userId,
      token,
      expiresAt,
    });

    log.info('Created verification token for user', { userId });
    return token;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email-verification.service.ts src/services/email-verification.service.test.ts
git commit -m "feat(auth): add EmailVerificationService with token creation

- Create verification tokens with 24h expiration
- 64-char nanoid tokens for security
- Add unit tests for token creation"
```

---

## Task 5: Email Verification Service - Verify Email

**Files:**

- Modify: `src/services/email-verification.service.ts`
- Modify: `src/services/email-verification.service.test.ts`

**Step 1: Write failing test for verifyEmail**

Add to `src/services/email-verification.service.test.ts`:

```typescript
it('should verify email and mark user as verified', async () => {
  const token = await service.createVerificationToken(testUserId);

  const result = await service.verifyEmail(token);

  expect(result.success).toBe(true);
  expect(result.user).toBeTruthy();
  expect(result.user?.id).toBe(testUserId);

  // Check user is marked as verified
  const user = await db.select().from(schema.users).where(eq(schema.users.id, testUserId)).limit(1);

  expect(user[0].emailVerifiedAt).toBeTruthy();
});

it('should return error for invalid token', async () => {
  const result = await service.verifyEmail('invalid-token');

  expect(result.success).toBe(false);
  expect(result.error).toBe('INVALID_TOKEN');
});

it('should return error for expired token', async () => {
  const expiredToken = nanoid(64);
  const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

  await db.insert(schema.emailVerificationTokens).values({
    userId: testUserId,
    token: expiredToken,
    expiresAt: pastTime,
  });

  const result = await service.verifyEmail(expiredToken);

  expect(result.success).toBe(false);
  expect(result.error).toBe('TOKEN_EXPIRED');
});

it('should be idempotent for already verified users', async () => {
  const token = await service.createVerificationToken(testUserId);

  // Verify once
  await service.verifyEmail(token);

  // Create new token and verify again
  const token2 = await service.createVerificationToken(testUserId);
  const result = await service.verifyEmail(token2);

  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: FAIL with "verifyEmail is not a function"

**Step 3: Implement verifyEmail method**

Add to `src/services/email-verification.service.ts`:

```typescript
export type VerifyEmailResult =
  | { success: true; user: any }
  | { success: false; error: string; email?: string };

/**
 * Verify email using token
 * @param token - Verification token from email
 * @returns Result with user or error
 */
async verifyEmail(token: string): Promise<VerifyEmailResult> {
  // Look up token
  const tokenRecord = await this.db
    .select()
    .from(this.schema.emailVerificationTokens)
    .where(eq(this.schema.emailVerificationTokens.token, token))
    .limit(1);

  if (tokenRecord.length === 0) {
    log.warn('Invalid verification token attempted');
    return { success: false, error: 'INVALID_TOKEN' };
  }

  const { userId, expiresAt } = tokenRecord[0];

  // Check expiration
  if (expiresAt < new Date()) {
    log.warn('Expired verification token attempted', { userId });

    // Get user email for resend functionality
    const user = await this.db
      .select({ email: this.schema.users.email })
      .from(this.schema.users)
      .where(eq(this.schema.users.id, userId))
      .limit(1);

    return {
      success: false,
      error: 'TOKEN_EXPIRED',
      email: user[0]?.email,
    };
  }

  // Get user
  const users = await this.db
    .select()
    .from(this.schema.users)
    .where(eq(this.schema.users.id, userId))
    .limit(1);

  if (users.length === 0) {
    log.error('User not found for verification token', { userId });
    return { success: false, error: 'USER_NOT_FOUND' };
  }

  const user = users[0];

  // Check if already verified (idempotent)
  if (user.emailVerifiedAt) {
    log.info('User already verified', { userId });
    return { success: true, user };
  }

  // Mark user as verified
  await this.db
    .update(this.schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(this.schema.users.id, userId));

  // Delete all verification tokens for this user
  await this.db
    .delete(this.schema.emailVerificationTokens)
    .where(eq(this.schema.emailVerificationTokens.userId, userId));

  log.info('Email verified successfully', { userId });

  const verifiedUser = { ...user, emailVerifiedAt: new Date() };
  return { success: true, user: verifiedUser };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/email-verification.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/email-verification.service.ts src/services/email-verification.service.test.ts
git commit -m "feat(auth): add email verification logic

- Verify tokens with expiration check
- Mark users as verified on success
- Delete tokens after verification
- Handle invalid/expired tokens
- Idempotent verification"
```

---

## Task 6: Workspace Service - Activation

**Files:**

- Modify: `src/services/workspace.service.ts`
- Modify: `src/services/workspace.service.test.ts`

**Step 1: Write failing test for activateWorkspace**

Add to `src/services/workspace.service.test.ts`:

```typescript
it('should activate workspace', async () => {
  const workspaceId = nanoid();
  const userId = nanoid();

  // Create inactive workspace
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: 'Test Workspace',
    status: 'inactive',
  });

  await service.activateWorkspace(workspaceId);

  // Verify status changed
  const workspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  expect(workspace[0].status).toBe('active');
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/workspace.service.test.ts`
Expected: FAIL with "activateWorkspace is not a function"

**Step 3: Implement activateWorkspace method**

Add to `src/services/workspace.service.ts`:

```typescript
/**
 * Activate workspace after owner email verification
 * @param workspaceId - Workspace ID to activate
 */
async activateWorkspace(workspaceId: string): Promise<void> {
  await this.db
    .update(this.schema.workspaces)
    .set({ status: 'active' })
    .where(eq(this.schema.workspaces.id, workspaceId));

  log.info('Workspace activated', { workspaceId });
}

/**
 * Check if workspace is active
 * @param workspaceId - Workspace ID to check
 * @returns True if active, false otherwise
 */
async isWorkspaceActive(workspaceId: string): Promise<boolean> {
  const workspace = await this.db
    .select({ status: this.schema.workspaces.status })
    .from(this.schema.workspaces)
    .where(eq(this.schema.workspaces.id, workspaceId))
    .limit(1);

  return workspace.length > 0 && workspace[0].status === 'active';
}
```

**Step 4: Update createWorkspace to set status**

In `src/services/workspace.service.ts`, modify the `createWorkspace` method to accept status parameter:

```typescript
async createWorkspace(name: string, ownerId: string, status: 'active' | 'inactive' = 'inactive'): Promise<Workspace> {
  const workspaceId = nanoid();

  const [workspace] = await this.db
    .insert(this.schema.workspaces)
    .values({
      id: workspaceId,
      name,
      status, // Add this line
    })
    .returning();

  log.info('Workspace created', { workspaceId, name, status });

  return workspace;
}
```

**Step 5: Run test to verify it passes**

Run: `bun test src/services/workspace.service.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/workspace.service.ts src/services/workspace.service.test.ts
git commit -m "feat(workspace): add workspace activation logic

- Add activateWorkspace method
- Add isWorkspaceActive check
- Update createWorkspace to accept status parameter"
```

---

## Task 7: Email Verification Service - Send Email

**Files:**

- Modify: `src/services/email-verification.service.ts`
- Create: `src/services/email/templates/verify-email.ts`

**Step 1: Create email template**

Create `src/services/email/templates/verify-email.ts`:

```typescript
/**
 * Email verification templates
 */

export interface VerificationEmailParams {
  userName: string;
  verificationUrl: string;
  workspaceName?: string;
  inviterName?: string;
}

export function getVerificationEmailHtml(params: VerificationEmailParams): string {
  const { userName, verificationUrl, workspaceName, inviterName } = params;

  const greeting =
    workspaceName && inviterName
      ? `You've been invited to join "${workspaceName}" by ${inviterName}.`
      : 'Thanks for signing up!';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9f9f9; padding: 30px; border-radius: 8px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">Verify Your Email</h1>

    <p>Hi ${userName},</p>

    <p>${greeting}</p>

    <p>Please verify your email address to activate your account.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Verify Email
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">Or copy this link: <br>${verificationUrl}</p>

    <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>

    <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #999; font-size: 12px;">Need help? Contact support@example.com</p>
  </div>
</body>
</html>
  `.trim();
}

export function getVerificationEmailText(params: VerificationEmailParams): string {
  const { userName, verificationUrl, workspaceName, inviterName } = params;

  const greeting =
    workspaceName && inviterName
      ? `You've been invited to join "${workspaceName}" by ${inviterName}.`
      : 'Thanks for signing up!';

  return `
Hi ${userName},

${greeting}

Please verify your email address to activate your account.

Verify your email: ${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
Need help? Contact support@example.com
  `.trim();
}
```

**Step 2: Add sendVerificationEmail method**

Add to `src/services/email-verification.service.ts`:

```typescript
import { getVerificationEmailHtml, getVerificationEmailText } from './email/templates/verify-email';

/**
 * Send verification email to user
 * @param userId - User ID
 * @param workspaceName - Optional workspace name for invited users
 * @param inviterName - Optional inviter name for invited users
 */
async sendVerificationEmail(
  userId: string,
  workspaceName?: string,
  inviterName?: string
): Promise<void> {
  const token = await this.createVerificationToken(userId);

  // Get user details
  const users = await this.db
    .select({ email: this.schema.users.email, name: this.schema.users.name })
    .from(this.schema.users)
    .where(eq(this.schema.users.id, userId))
    .limit(1);

  if (users.length === 0) {
    throw new Error('User not found');
  }

  const { email, name } = users[0];

  // Build verification URL
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:4321';
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  // Get email templates
  const emailHtml = getVerificationEmailHtml({
    userName: name,
    verificationUrl,
    workspaceName,
    inviterName,
  });

  const emailText = getVerificationEmailText({
    userName: name,
    verificationUrl,
    workspaceName,
    inviterName,
  });

  // Send email
  const emailService = new EmailService();
  await emailService.sendEmail({
    to: email,
    subject: 'Verify your email',
    html: emailHtml,
    text: emailText,
  });

  log.info('Verification email sent', { userId, email });
}
```

**Step 3: Commit**

```bash
git add src/services/email-verification.service.ts src/services/email/templates/verify-email.ts
git commit -m "feat(auth): add verification email sending

- Create HTML and plain text email templates
- Support both standard and invitation flows
- Send emails via existing EmailService"
```

---

## Task 8: Auth Service - Update Registration

**Files:**

- Modify: `src/services/auth.service.ts`
- Modify: `src/services/auth.service.test.ts`

**Step 1: Write failing test for unverified user creation**

Add to `src/services/auth.service.test.ts`:

```typescript
it('should create unverified user during registration', async () => {
  const email = `test-${nanoid()}@example.com`;
  const result = await service.register(email, 'Password123!', 'Test User');

  expect(result.userId).toBeTruthy();

  // Verify user is unverified
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, result.userId))
    .limit(1);

  expect(user[0].emailVerifiedAt).toBeNull();
});

it('should create inactive workspace during registration', async () => {
  const email = `test-${nanoid()}@example.com`;
  const result = await service.register(email, 'Password123!', 'Test User');

  // Get user's workspace
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, result.userId))
    .limit(1);

  const workspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, user[0].workspaceId))
    .limit(1);

  expect(workspace[0].status).toBe('inactive');
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/auth.service.test.ts`
Expected: FAIL because current implementation doesn't set status

**Step 3: Update register method**

In `src/services/auth.service.ts`, update the `register` method:

```typescript
import { EmailVerificationService } from './email-verification.service';

async register(
  email: string,
  password: string,
  name: string,
  workspaceName?: string
): Promise<{ userId: string }> {
  // ... existing validation ...

  // Create workspace (INACTIVE until email verified)
  const workspace = await workspaceService.createWorkspace(
    workspaceName || `${name}'s Workspace`,
    userId,
    'inactive' // NEW: Set workspace as inactive
  );

  // ... existing user creation ...
  // NOTE: User is created with emailVerifiedAt = null by default

  // Send verification email
  const emailVerificationService = new EmailVerificationService(this.db);
  await emailVerificationService.sendVerificationEmail(userId);

  // DON'T seed default categories yet - will happen after verification

  log.info('User registered (unverified)', { userId, email, workspaceId: workspace.id });

  return { userId };
}
```

**Step 4: Update registerWithInvitation method**

Update the `registerWithInvitation` method:

```typescript
async registerWithInvitation(
  email: string,
  password: string,
  name: string,
  workspaceId: string,
  role: 'admin' | 'member'
): Promise<{ userId: string }> {
  // ... existing validation and user creation ...
  // NOTE: User is created with emailVerifiedAt = null by default

  // Send verification email (with workspace context)
  const emailVerificationService = new EmailVerificationService(this.db);

  // Get workspace and inviter details
  const workspace = await this.db
    .select({ name: this.schema.workspaces.name })
    .from(this.schema.workspaces)
    .where(eq(this.schema.workspaces.id, workspaceId))
    .limit(1);

  await emailVerificationService.sendVerificationEmail(
    userId,
    workspace[0]?.name,
    'Admin' // TODO: Get actual inviter name
  );

  // DON'T seed default categories (invited users don't get them)

  log.info('User registered via invitation (unverified)', { userId, email, workspaceId });

  return { userId };
}
```

**Step 5: Run test to verify it passes**

Run: `bun test src/services/auth.service.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/auth.service.ts src/services/auth.service.test.ts
git commit -m "feat(auth): update registration to create unverified users

- Create inactive workspaces for new registrations
- Send verification emails immediately
- Defer asset category seeding until verification
- Support invitation context in verification emails"
```

---

## Task 9: Auth Service - Update Login

**Files:**

- Modify: `src/services/auth.service.ts`
- Modify: `src/services/auth.service.test.ts`

**Step 1: Write failing test for blocking unverified users**

Add to `src/services/auth.service.test.ts`:

```typescript
it('should block login for unverified users', async () => {
  const email = `test-${nanoid()}@example.com`;
  await service.register(email, 'Password123!', 'Test User');

  const result = await service.login(email, 'Password123!');

  expect(result.error).toBe('Email not verified');
  expect(result.code).toBe('EMAIL_NOT_VERIFIED');
  expect(result.email).toBe(email);
});

it('should block login for inactive workspaces', async () => {
  // Create verified user in inactive workspace
  const userId = nanoid();
  const workspaceId = nanoid();
  const email = `test-${nanoid()}@example.com`;

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: 'Test Workspace',
    status: 'inactive',
  });

  await db.insert(schema.users).values({
    id: userId,
    email,
    passwordHash: await hashPassword('Password123!'),
    name: 'Test User',
    workspaceId,
    role: 'admin',
    emailVerifiedAt: new Date(),
  });

  const result = await service.login(email, 'Password123!');

  expect(result.error).toBe('Workspace inactive');
  expect(result.code).toBe('WORKSPACE_INACTIVE');
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/auth.service.test.ts`
Expected: FAIL because login doesn't check verification yet

**Step 3: Update login method**

In `src/services/auth.service.ts`, update the `login` method:

```typescript
async login(
  email: string,
  password: string
): Promise<
  | { user: User; session: Session }
  | { error: string; code: string; email?: string }
> {
  // ... existing credential validation ...

  // NEW: Check if email is verified
  if (!user.emailVerifiedAt) {
    log.warn('Login attempt with unverified email', { email });
    return {
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    };
  }

  // NEW: Check if workspace is active
  const workspace = await this.db
    .select({ status: this.schema.workspaces.status })
    .from(this.schema.workspaces)
    .where(eq(this.schema.workspaces.id, user.workspaceId))
    .limit(1);

  if (workspace.length === 0 || workspace[0].status !== 'active') {
    log.warn('Login attempt with inactive workspace', { email, workspaceId: user.workspaceId });
    return {
      error: 'Workspace inactive',
      code: 'WORKSPACE_INACTIVE',
    };
  }

  // ... existing session creation ...
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/auth.service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/auth.service.ts src/services/auth.service.test.ts
git commit -m "feat(auth): block login for unverified users and inactive workspaces

- Check email_verified_at before login
- Check workspace status before login
- Return clear error codes for client handling"
```

---

## Task 10: Email Verification API Endpoint

**Files:**

- Create: `src/pages/api/auth/verify-email.ts`

**Step 1: Create verify-email endpoint**

Create `src/pages/api/auth/verify-email.ts`:

```typescript
/**
 * Email Verification Endpoint
 *
 * GET /api/auth/verify-email?token={token}
 *
 * Verifies email using token and redirects to login with status.
 */

import type { APIRoute } from 'astro';
import { db } from '@/db';
import { EmailVerificationService } from '@/services/email-verification.service';
import { WorkspaceService } from '@/services/workspace.service';
import { AssetCategoryService } from '@/services/asset-category.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:verify-email');

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    log.warn('Verification attempt without token');
    return redirect('/login?error=invalid_token', 302);
  }

  const emailVerificationService = new EmailVerificationService(db);
  const result = await emailVerificationService.verifyEmail(token);

  if (!result.success) {
    if (result.error === 'TOKEN_EXPIRED') {
      log.warn('Expired token verification attempt');
      const emailParam = result.email ? `&email=${encodeURIComponent(result.email)}` : '';
      return redirect(`/login?error=expired_token${emailParam}`, 302);
    }

    if (result.error === 'INVALID_TOKEN') {
      log.warn('Invalid token verification attempt');
      return redirect('/login?error=invalid_token', 302);
    }

    log.error('Email verification failed', { error: result.error });
    return redirect('/login?error=verification_failed', 302);
  }

  const user = result.user;

  // If user is workspace owner (admin role), activate workspace and seed categories
  if (user.role === 'admin') {
    const workspaceService = new WorkspaceService(db);
    await workspaceService.activateWorkspace(user.workspaceId);

    const assetCategoryService = new AssetCategoryService(db);
    await assetCategoryService.seedDefaultCategories(user.workspaceId);

    log.info('Workspace activated and categories seeded', {
      userId: user.id,
      workspaceId: user.workspaceId,
    });
  }

  log.info('Email verified successfully', { userId: user.id });
  return redirect('/login?verified=true', 302);
};
```

**Step 2: Commit**

```bash
git add src/pages/api/auth/verify-email.ts
git commit -m "feat(auth): add email verification API endpoint

- Verify tokens and mark users as verified
- Activate workspaces for admins
- Seed asset categories for admins
- Redirect to login with status parameters"
```

---

## Task 11: Resend Verification API Endpoint

**Files:**

- Create: `src/pages/api/auth/resend-verification.ts`
- Create: `src/lib/rate-limiter.ts`

**Step 1: Create rate limiter utility**

Create `src/lib/rate-limiter.ts`:

```typescript
/**
 * Simple in-memory rate limiter
 *
 * Tracks request counts per key with expiration.
 * Not suitable for distributed systems (use Redis for production).
 */

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if request is within rate limit
 * @param key - Unique key (e.g., "resend:ip:127.0.0.1")
 * @param limit - Max requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns True if allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (v.expiresAt < now) {
        store.delete(k);
      }
    }
  }

  if (!entry || entry.expiresAt < now) {
    // First request or expired
    store.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return true;
  }

  if (entry.count >= limit) {
    // Rate limited
    return false;
  }

  // Increment count
  entry.count++;
  return true;
}
```

**Step 2: Create resend verification endpoint**

Create `src/pages/api/auth/resend-verification.ts`:

```typescript
/**
 * Resend Verification Email Endpoint
 *
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * Rate limits:
 * - 10 requests per hour per IP
 * - 3 requests per hour per email
 */

import type { APIRoute } from 'astro';
import { db } from '@/db';
import { getActiveSchema } from '@/db';
import { EmailVerificationService } from '@/services/email-verification.service';
import { checkRateLimit } from '@/lib/rate-limiter';
import { createLogger } from '@/lib/logger';
import { eq } from 'drizzle-orm';

const log = createLogger('api:resend-verification');
const schema = getActiveSchema();

export const POST: APIRoute = async ({ request }) => {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting: 10 per hour per IP
  const ipKey = `resend_verification:ip:${clientIP}`;
  if (!checkRateLimit(ipKey, 10, 3600)) {
    log.warn('IP rate limit exceeded', { ip: clientIP });
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting: 3 per hour per email
  const emailKey = `resend_verification:email:${email.toLowerCase()}`;
  if (!checkRateLimit(emailKey, 3, 3600)) {
    log.warn('Email rate limit exceeded', { email });
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up user (don't reveal if user exists)
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  if (users.length === 0) {
    // Don't reveal user doesn't exist
    log.info('Resend attempt for non-existent user', { email });
    return new Response(
      JSON.stringify({
        message: 'If your email is unverified, check your inbox',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const user = users[0];

  // Check if already verified
  if (user.emailVerifiedAt) {
    log.info('Resend attempt for already verified user', { email });
    return new Response(
      JSON.stringify({
        message: 'If your email is unverified, check your inbox',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Send new verification email
  const emailVerificationService = new EmailVerificationService(db);
  await emailVerificationService.sendVerificationEmail(user.id);

  log.info('Verification email resent', { email });

  return new Response(
    JSON.stringify({
      message: 'If your email is unverified, check your inbox',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
```

**Step 3: Commit**

```bash
git add src/pages/api/auth/resend-verification.ts src/lib/rate-limiter.ts
git commit -m "feat(auth): add resend verification endpoint with rate limiting

- Dual rate limiting (10/IP, 3/email per hour)
- Generic responses to prevent user enumeration
- Simple in-memory rate limiter"
```

---

## Task 12: Update Login Page UI

**Files:**

- Modify: `src/pages/login.astro`
- Create: `src/pages/login.client.ts`

**Step 1: Add URL parameter handling to login page**

Add to `src/pages/login.astro` in the script section:

```typescript
// Check for URL parameters
const url = new URL(Astro.request.url);
const registered = url.searchParams.get('registered');
const verified = url.searchParams.get('verified');
const error = url.searchParams.get('error');
const email = url.searchParams.get('email');

let bannerMessage = '';
let bannerType: 'info' | 'success' | 'error' = 'info';

if (registered === 'true') {
  bannerMessage = 'Check your email to verify your account before logging in';
  bannerType = 'info';
} else if (verified === 'true') {
  bannerMessage = 'Email verified! You can now log in';
  bannerType = 'success';
} else if (error === 'invalid_token') {
  bannerMessage = 'Invalid verification link. Request a new one below.';
  bannerType = 'error';
} else if (error === 'expired_token') {
  bannerMessage = `Verification link expired. <button class="btn btn-link p-0 h-auto min-h-0 text-error-content" data-resend-email="${email || ''}">Resend verification email</button>`;
  bannerType = 'error';
}
```

**Step 2: Add banner to login page**

In the HTML section of `src/pages/login.astro`, add after the main heading:

```astro
{
  bannerMessage && (
    <div
      class={`alert ${bannerType === 'success' ? 'alert-success' : bannerType === 'error' ? 'alert-error' : 'alert-info'} mb-6`}
      set:html={bannerMessage}
    />
  )
}

<div id="login-error" class="alert alert-error mb-6 hidden"></div>
```

**Step 3: Create client-side script for resend**

Create `src/pages/login.client.ts`:

```typescript
/**
 * Login page client-side interactions
 */

import { addToast } from '@/lib/stores/toastStore';

// Handle resend verification email
document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;

  if (target.matches('[data-resend-email]')) {
    e.preventDefault();
    const email = target.dataset.resendEmail;

    if (!email) return;

    target.classList.add('loading');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Verification email sent! Check your inbox', 'success');
      } else {
        addToast(data.error || 'Failed to send email', 'error');
      }
    } catch (error) {
      addToast('Failed to send email. Please try again.', 'error');
    } finally {
      target.classList.remove('loading');
    }
  }
});

// Handle login form submission with verification check
const loginForm = document.querySelector<HTMLFormElement>('form');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(loginForm);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const loginError = document.getElementById('login-error');
  if (loginError) {
    loginError.classList.add('hidden');
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      window.location.href = '/dashboard';
    } else if (data.code === 'EMAIL_NOT_VERIFIED') {
      // Show error with resend button
      if (loginError) {
        loginError.innerHTML = `
          Please verify your email to log in.
          <button class="btn btn-link p-0 h-auto min-h-0 text-error-content ml-2" data-resend-email="${data.email || email}">
            Resend verification email
          </button>
        `;
        loginError.classList.remove('hidden');
      }
    } else {
      if (loginError) {
        loginError.textContent = data.error || 'Login failed';
        loginError.classList.remove('hidden');
      }
    }
  } catch (error) {
    if (loginError) {
      loginError.textContent = 'An error occurred. Please try again.';
      loginError.classList.remove('hidden');
    }
  }
});
```

**Step 4: Import client script in login page**

Add to `src/pages/login.astro`:

```astro
<script src="./login.client.ts"></script>
```

**Step 5: Commit**

```bash
git add src/pages/login.astro src/pages/login.client.ts
git commit -m "feat(auth): add verification handling to login page

- Show banners for registration, verification, errors
- Add resend verification button for blocked users
- Handle EMAIL_NOT_VERIFIED error code
- Add loading states for resend button"
```

---

## Task 13: Update Signup Page UI

**Files:**

- Modify: `src/pages/signup.astro`
- Modify: `src/pages/signup.client.ts` (if exists, or create)

**Step 1: Update signup success handling**

In signup client script (create if needed), update the success handler:

```typescript
// After successful signup response
if (response.status === 201) {
  // Show success message
  const successDiv = document.createElement('div');
  successDiv.className = 'alert alert-success mb-6';
  successDiv.textContent = 'Account created! Check your email to verify your account.';

  const form = document.querySelector('form');
  form?.parentElement?.insertBefore(successDiv, form);

  // Redirect after 3 seconds
  setTimeout(() => {
    window.location.href = '/login?registered=true';
  }, 3000);
}
```

**Step 2: Commit**

```bash
git add src/pages/signup.astro src/pages/signup.client.ts
git commit -m "feat(auth): update signup page with verification message

- Show success message after registration
- Inform users to check email
- Auto-redirect to login after 3 seconds"
```

---

## Task 14: Backfill Script for Existing Users

**Files:**

- Create: `scripts/backfill-email-verification.ts`

**Step 1: Create backfill script**

Create `scripts/backfill-email-verification.ts`:

```typescript
/**
 * Backfill Script: Mark Existing Users as Verified
 *
 * Run this ONCE after deploying the email verification feature.
 * Marks all existing users as verified and all workspaces as active.
 *
 * Usage: bun run scripts/backfill-email-verification.ts
 */

import { db, getActiveSchema } from '@/db';
import { eq, isNull } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('backfill');
const schema = getActiveSchema();

async function backfillEmailVerification() {
  log.info('Starting email verification backfill...');

  // Mark all unverified users as verified (set to created_at)
  const users = await db.select().from(schema.users).where(isNull(schema.users.emailVerifiedAt));

  log.info(`Found ${users.length} unverified users`);

  for (const user of users) {
    await db
      .update(schema.users)
      .set({ emailVerifiedAt: user.createdAt })
      .where(eq(schema.users.id, user.id));

    log.info(`Verified user ${user.id} (${user.email})`);
  }

  // Mark all workspaces as active
  const workspaces = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.status, 'inactive'));

  log.info(`Found ${workspaces.length} inactive workspaces`);

  for (const workspace of workspaces) {
    await db
      .update(schema.workspaces)
      .set({ status: 'active' })
      .where(eq(schema.workspaces.id, workspace.id));

    log.info(`Activated workspace ${workspace.id} (${workspace.name})`);
  }

  log.info('Backfill complete!');
  log.info(`Verified ${users.length} users, activated ${workspaces.length} workspaces`);
}

backfillEmailVerification()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error('Backfill failed', { error });
    process.exit(1);
  });
```

**Step 2: Add npm script**

Add to `package.json` scripts:

```json
"backfill:email-verification": "bun run scripts/backfill-email-verification.ts"
```

**Step 3: Commit**

```bash
git add scripts/backfill-email-verification.ts package.json
git commit -m "feat(db): add backfill script for email verification

- Mark all existing users as verified
- Activate all existing workspaces
- Run once after deploying feature"
```

---

## Task 15: Update OpenAPI Documentation

**Files:**

- Modify: `openapi/paths/auth.yml`
- Create: `openapi/schemas/ResendVerificationRequest.yml`

**Step 1: Add verify-email endpoint**

In `openapi/paths/auth.yml`, add:

```yaml
/auth/verify-email:
  get:
    summary: Verify email address
    description: Verify user email using token sent via email. Redirects to login page with status.
    tags:
      - Authentication
    parameters:
      - in: query
        name: token
        required: true
        schema:
          type: string
        description: 64-character verification token from email
    responses:
      '302':
        description: Redirect to login page
        headers:
          Location:
            schema:
              type: string
            examples:
              success:
                value: /login?verified=true
              invalid:
                value: /login?error=invalid_token
              expired:
                value: /login?error=expired_token&email=user@example.com
```

**Step 2: Add resend-verification endpoint**

In `openapi/paths/auth.yml`, add:

```yaml
/auth/resend-verification:
  post:
    summary: Resend verification email
    description: Resend email verification link. Rate limited to 3 per email and 10 per IP per hour.
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../schemas/ResendVerificationRequest.yml'
    responses:
      '200':
        description: Generic success message (doesn't reveal if email exists)
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                  example: If your email is unverified, check your inbox
      '429':
        description: Rate limit exceeded
        content:
          application/json:
            schema:
              $ref: '../responses/common.yml#/RateLimitError'
```

**Step 3: Create ResendVerificationRequest schema**

Create `openapi/schemas/ResendVerificationRequest.yml`:

```yaml
type: object
required:
  - email
properties:
  email:
    type: string
    format: email
    description: Email address to resend verification to
    example: user@example.com
```

**Step 4: Update signup endpoint documentation**

In `openapi/paths/auth.yml`, update `/auth/signup` response to mention verification:

```yaml
responses:
  '201':
    description: User registered successfully. Verification email sent.
    content:
      application/json:
        schema:
          type: object
          properties:
            message:
              type: string
              example: Check your email to verify your account
```

**Step 5: Update login endpoint documentation**

In `openapi/paths/auth.yml`, add new error responses to `/auth/login`:

```yaml
'403':
  description: Email not verified or workspace inactive
  content:
    application/json:
      schema:
        oneOf:
          - type: object
            properties:
              error:
                type: string
                example: Email not verified
              code:
                type: string
                example: EMAIL_NOT_VERIFIED
              email:
                type: string
                example: user@example.com
          - type: object
            properties:
              error:
                type: string
                example: Workspace inactive
              code:
                type: string
                example: WORKSPACE_INACTIVE
```

**Step 6: Commit**

```bash
git add openapi/
git commit -m "docs(api): add email verification endpoints to OpenAPI

- Document verify-email GET endpoint
- Document resend-verification POST endpoint
- Update signup and login responses
- Add new error codes for verification"
```

---

## Task 16: E2E Test - Standard Registration Flow

**Files:**

- Create: `tests/e2e/email-verification.spec.ts`

**Step 1: Write E2E test for standard registration**

Create `tests/e2e/email-verification.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Email Verification', () => {
  test('standard registration flow requires verification', async ({ page }) => {
    const email = `test-${nanoid()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';

    // Step 1: Register
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="name"]', name);
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('.alert-success')).toContainText(
      'Check your email to verify your account'
    );

    // Should redirect to login
    await page.waitForURL('/login?registered=true');
    await expect(page.locator('.alert-info')).toContainText(
      'Check your email to verify your account before logging in'
    );

    // Step 2: Try to login without verification
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should show error with resend button
    await expect(page.locator('#login-error')).toContainText('Please verify your email to log in');
    await expect(page.locator('[data-resend-email]')).toBeVisible();

    // Step 3: Get verification token from database
    // (In real test, would check email or mock email service)
    // For now, verify that token was created
    // TODO: Add email service mock and verification flow
  });

  test('resend verification email works', async ({ page }) => {
    const email = `test-${nanoid()}@example.com`;
    const password = 'Password123!';

    // Register user
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    await page.waitForURL('/login?registered=true');

    // Try to login (will fail)
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Click resend button
    const resendButton = page.locator('[data-resend-email]');
    await resendButton.click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText('Verification email sent');
  });
});
```

**Step 2: Run E2E test**

Run: `bun run test:e2e tests/e2e/email-verification.spec.ts`
Expected: PASS (or identify missing pieces)

**Step 3: Commit**

```bash
git add tests/e2e/email-verification.spec.ts
git commit -m "test(e2e): add email verification flow tests

- Test standard registration blocks login
- Test resend verification email
- TODO: Add email service mock for full flow"
```

---

## Task 17: Update COMMANDS.md

**Files:**

- Modify: `COMMANDS.md`

**Step 1: Document new commands**

Add to `COMMANDS.md`:

````markdown
### Email Verification

```bash
# Backfill existing users as verified (run once after deployment)
bun run backfill:email-verification
```
````

Marks all existing users' emails as verified and activates all workspaces.
Run this once after deploying the email verification feature.

````

**Step 2: Commit**

```bash
git add COMMANDS.md
git commit -m "docs: add email verification commands to COMMANDS.md"
````

---

## Task 18: Quality Gates & Final Checks

**Files:**

- All modified files

**Step 1: Run linter**

Run: `bun run lint:fix`
Expected: No errors

**Step 2: Run stylelint**

Run: `bun run stylelint:fix`
Expected: No errors

**Step 3: Run formatter**

Run: `bun run format:fix`
Expected: All files formatted

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No type errors

**Step 5: Run all unit tests**

Run: `bun test`
Expected: All tests pass

**Step 6: Run E2E tests**

Run: `bun run test:e2e`
Expected: All tests pass

**Step 7: Final commit if any fixes needed**

```bash
git add .
git commit -m "chore: fix linting and type errors"
```

---

## Deployment Checklist

**Phase 1: Database Migration**

- [ ] Run `bun run db:migrate` locally (SQLite)
- [ ] Run `bun run db:migrate:prod` on staging (PostgreSQL)
- [ ] Run `bun run backfill:email-verification` on staging
- [ ] Verify data integrity on staging

**Phase 2: Deploy to Production**

- [ ] Run `bun run db:migrate:prod` on production
- [ ] Run `bun run backfill:email-verification` on production
- [ ] Deploy application code
- [ ] Monitor logs for errors

**Phase 3: Verification**

- [ ] Create test account and verify email flow works
- [ ] Test resend verification email
- [ ] Test rate limiting
- [ ] Monitor email delivery rates

---

## Success Criteria

✅ All new users must verify email before login
✅ Existing users can log in immediately (backfilled as verified)
✅ Workspace activation tied to owner email verification
✅ Invited users don't affect workspace status
✅ Resend functionality works with rate limits
✅ All tests pass (unit + E2E)
✅ No type errors
✅ OpenAPI documentation updated
