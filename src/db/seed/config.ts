/**
 * Seeder Configuration
 *
 * Demo users and seeder flags
 */

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

export const DEMO_SUPER_ADMIN = {
  email: 'superadmin@example.com',
  password: 'demo123456789', // Must be at least 12 chars
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
