/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Users Seeder
 */

import { db } from '@/db';
import { account as authAccounts, user as authUsers, users, userMeta } from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_SUPER_ADMIN } from '../config';

export interface SeededUsers {
  adminUserId: string;
  memberUserId: string;
}

async function createSeededCredentialIdentity(
  userId: string,
  email: string,
  name: string,
  role: 'admin' | 'member' | 'super_admin',
  workspaceId: string | null,
  password: string,
  now: Date
): Promise<void> {
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    workspace_id: workspaceId,
    email,
    password_hash: passwordHash,
    name,
    role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  await db.insert(authUsers).values({
    id: userId,
    email,
    name,
    emailVerified: true,
    image: null,
    twoFactorEnabled: false,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(authAccounts).values({
    id: `credential-${userId}`,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Seed users and user settings
 */
export async function seedUsers(workspaceId: string): Promise<SeededUsers> {
  console.log('👤 Seeding users...');

  const now = new Date();

  // Create admin user
  const adminUserId = nanoid();
  await createSeededCredentialIdentity(
    adminUserId,
    DEMO_ADMIN.email,
    DEMO_ADMIN.name,
    DEMO_ADMIN.role,
    workspaceId,
    DEMO_ADMIN.password,
    now
  );

  // Insert admin user meta values (without currency - it's workspace-scoped only)
  await db.insert(userMeta).values([
    {
      meta_id: nanoid(),
      user_id: adminUserId,
      meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
    {
      meta_id: nanoid(),
      user_id: adminUserId,
      meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Create member user
  const memberUserId = nanoid();
  await createSeededCredentialIdentity(
    memberUserId,
    DEMO_MEMBER.email,
    DEMO_MEMBER.name,
    DEMO_MEMBER.role,
    workspaceId,
    DEMO_MEMBER.password,
    now
  );

  // Insert member user meta values (without currency - it's workspace-scoped only)
  await db.insert(userMeta).values([
    {
      meta_id: nanoid(),
      user_id: memberUserId,
      meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
    {
      meta_id: nanoid(),
      user_id: memberUserId,
      meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Create super admin user (no workspace)
  const superAdminUserId = nanoid();
  await createSeededCredentialIdentity(
    superAdminUserId,
    DEMO_SUPER_ADMIN.email,
    DEMO_SUPER_ADMIN.name,
    DEMO_SUPER_ADMIN.role,
    null,
    DEMO_SUPER_ADMIN.password,
    now
  );

  console.log(`✓ Created admin user: ${DEMO_ADMIN.email}`);
  console.log(`✓ Created member user: ${DEMO_MEMBER.email}`);
  console.log(`✓ Created super admin user: ${DEMO_SUPER_ADMIN.email}`);
  return { adminUserId, memberUserId };
}
