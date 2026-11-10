/**
 * Seeder Configuration
 *
 * Demo users and seeder flags
 */

// Every seeded account uses this domain. The wipe guard treats any other address as real data.
export const SEED_EMAIL_DOMAIN = 'example.com';

export const DEMO_ADMIN = {
  email: 'demo@example.com',
  password: 'demo123456789', // Must be at least 12 chars
  name: 'Dad',
  role: 'admin' as const,
};

export const DEMO_MEMBER = {
  email: 'member@example.com',
  password: 'demo123456789', // Must be at least 12 chars
  name: 'Mom',
  role: 'member' as const,
};

// No fixed password: the seeder generates one per run behind --with-super-admin.
export const DEMO_SUPER_ADMIN = {
  email: 'superadmin@example.com',
  name: 'Super Admin',
  role: 'super_admin' as const,
};

// Snapshot growth rate
export const SNAPSHOT_GROWTH_RATE = 0.05; // 5% growth per month for snapshots

// Global seeder configuration
export const SEEDER_CONFIG = {
  PRIMARY_CURRENCY: 'IDR',
  SECONDARY_CURRENCY: 'USD',
};

export function setSeederConfig(config: Partial<typeof SEEDER_CONFIG>) {
  Object.assign(SEEDER_CONFIG, config);
}
