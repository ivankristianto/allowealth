/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Users Seeder
 */

import { db } from '@/db';
import { users, userMeta } from '@/db/schema';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_SUPER_ADMIN } from '../config';

export interface SeededUsers {
  adminUserId: string;
  memberUserId: string;
}

/**
 * Seed users and user settings
 */
export async function seedUsers(workspaceId: string): Promise<SeededUsers> {
  console.log('👤 Seeding users...');

  const now = new Date();

  // Create admin user
  const adminUserId = nanoid();
  const adminPasswordHash = await hashPassword(DEMO_ADMIN.password);

  await db.insert(users).values({
    id: adminUserId,
    workspace_id: workspaceId,
    email: DEMO_ADMIN.email,
    password_hash: adminPasswordHash,
    name: DEMO_ADMIN.name,
    role: DEMO_ADMIN.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

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
  const memberPasswordHash = await hashPassword(DEMO_MEMBER.password);

  await db.insert(users).values({
    id: memberUserId,
    workspace_id: workspaceId,
    email: DEMO_MEMBER.email,
    password_hash: memberPasswordHash,
    name: DEMO_MEMBER.name,
    role: DEMO_MEMBER.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

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
  const superAdminPasswordHash = await hashPassword(DEMO_SUPER_ADMIN.password);

  await db.insert(users).values({
    id: superAdminUserId,
    workspace_id: null,
    email: DEMO_SUPER_ADMIN.email,
    password_hash: superAdminPasswordHash,
    name: DEMO_SUPER_ADMIN.name,
    role: DEMO_SUPER_ADMIN.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  console.log(`✓ Created admin user: ${DEMO_ADMIN.email}`);
  console.log(`✓ Created member user: ${DEMO_MEMBER.email}`);
  console.log(`✓ Created super admin user: ${DEMO_SUPER_ADMIN.email}`);
  return { adminUserId, memberUserId };
}
