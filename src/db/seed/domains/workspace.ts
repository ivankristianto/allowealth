/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Workspace Seeder
 */

import { db } from '@/db';
import { workspaces, workspaceMeta } from '@/db/schema';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';
import { nanoid } from 'nanoid';
import { SEEDER_CONFIG } from '../config';

/**
 * Seed workspace first (required for users)
 */
export async function seedWorkspace(): Promise<string> {
  console.log('🏢 Seeding workspace...');

  const workspaceId = nanoid();
  const now = new Date();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: 'Demo Family',
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  // Seed default workspace meta values (upsert-safe)
  const workspaceMetaEntries = [
    {
      key: WORKSPACE_META_KEYS.CURRENCY,
      value: SEEDER_CONFIG.PRIMARY_CURRENCY,
    },
    { key: 'secondary_currency', value: SEEDER_CONFIG.SECONDARY_CURRENCY },
    {
      key: WORKSPACE_META_KEYS.WEEK_START,
      value: WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START],
    },
    // Keep demo workspace onboarding-complete for E2E and local demos.
    {
      key: WORKSPACE_META_KEYS.MONTHLY_INCOME,
      value: JSON.stringify({ [SEEDER_CONFIG.PRIMARY_CURRENCY]: '30000000' }),
    },
  ] as const;

  for (const entry of workspaceMetaEntries) {
    await db
      .insert(workspaceMeta)
      .values({
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: entry.key,
        meta_value: entry.value,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [workspaceMeta.workspace_id, workspaceMeta.meta_key],
        set: {
          meta_value: entry.value,
          updated_at: now,
        },
      });
  }

  console.log(`✓ Created workspace: Demo Family`);
  console.log(`✓ Seeded default workspace meta values`);
  return workspaceId;
}
