/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { nanoid } from 'nanoid';
import { db } from '@/db';
import { passkey } from '@/db/schema';

export async function seedPasskeys(adminUserId: string, memberUserId: string): Promise<void> {
  console.log('🔐 Seeding passkeys...');

  const now = new Date();

  await db.insert(passkey).values([
    {
      id: nanoid(),
      name: 'Dad MacBook Touch ID',
      publicKey: 'demo-passkey-public-key-admin',
      userId: adminUserId,
      credentialID: 'demo-passkey-credential-admin',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: true,
      transports: 'internal',
      aaguid: 'demo-aaguid-admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: 'Mom iPhone Face ID',
      publicKey: 'demo-passkey-public-key-member',
      userId: memberUserId,
      credentialID: 'demo-passkey-credential-member',
      counter: 0,
      deviceType: 'multiDevice',
      backedUp: true,
      transports: 'internal',
      aaguid: 'demo-aaguid-member',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created 2 demo passkeys');
}
