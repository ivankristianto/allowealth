/**
 * Forecast Utilities
 *
 * Main export file for forecast calculation utilities and types.
 *
 * IMPORTANT: Types are exported separately to prevent bundling
 * calculation code (which includes Decimal.js) into client bundles.
 * Client-side code should only import types, never calculation functions.
 *
 * @TODO P1 - Architecture: Consider separating into two entry points to enforce type-only imports:
 * - /lib/forecast/types.ts (safe for client imports)
 * - /lib/forecast/index.ts (server-only, includes calculations with Decimal.js)
 * This would make it impossible to accidentally import Decimal.js client-side.
 * Current pattern works but relies on developer discipline.
 */

// Export types only (no runtime code bundled to client)
export type * from './types';

// Export calculation functions (server-side only - do not import in client code)
// ⚠️ WARNING: Do NOT import calculation functions in client-side code (.client.ts, <script> tags)
// They include Decimal.js which adds 32 kB to the client bundle
export * from './calculations';
