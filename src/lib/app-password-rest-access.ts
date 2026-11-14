/**
 * Which REST routes an app password may call, and with which methods.
 * Deny by default: a route missing here returns 403 for Bearer app passwords.
 */

import type { AppPasswordScope } from '@/lib/mcp-app-password';

export type AppPasswordRestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AppPasswordRestRoute {
  /** OpenAPI-style template; `{id}` matches one ID segment. */
  path: string;
  methods: readonly AppPasswordRestMethod[];
}

export const APP_PASSWORD_REST_ROUTES: readonly AppPasswordRestRoute[] = [
  { path: '/api/openapi.json', methods: ['GET'] },

  { path: '/api/transactions', methods: ['GET', 'POST'] },
  { path: '/api/transactions/{id}', methods: ['GET', 'PUT', 'DELETE'] },
  { path: '/api/transactions/{id}/history', methods: ['GET'] },

  { path: '/api/budget/overview', methods: ['GET'] },
  { path: '/api/budget/history', methods: ['GET'] },
  { path: '/api/budget/category-trends', methods: ['GET'] },
  { path: '/api/budget/category/{id}/remaining', methods: ['GET'] },
  { path: '/api/budgets', methods: ['GET'] },
  { path: '/api/budgets/{id}', methods: ['GET'] },

  { path: '/api/recurring', methods: ['GET', 'POST'] },
  { path: '/api/recurring/{id}', methods: ['GET', 'PUT'] },
  { path: '/api/recurring/occurrences', methods: ['GET'] },
  { path: '/api/recurring/occurrences/{id}/confirm', methods: ['POST'] },
  { path: '/api/recurring/calendar', methods: ['GET'] },
  { path: '/api/recurring/forecast', methods: ['GET'] },
  { path: '/api/recurring/stats', methods: ['GET'] },

  { path: '/api/accounts', methods: ['GET'] },
  { path: '/api/accounts/{id}', methods: ['GET'] },
  { path: '/api/categories', methods: ['GET'] },
  { path: '/api/categories/{id}', methods: ['GET'] },
  { path: '/api/account-categories', methods: ['GET'] },
  { path: '/api/account-categories/{id}', methods: ['GET'] },
  { path: '/api/workspace/settings', methods: ['GET'] },

  { path: '/api/forecast', methods: ['GET'] },
  { path: '/api/reports', methods: ['GET'] },
  { path: '/api/reports/expenses', methods: ['GET'] },
  { path: '/api/reports/income', methods: ['GET'] },
  { path: '/api/reports/members', methods: ['GET'] },
  { path: '/api/reports/category-drilldown', methods: ['GET'] },
];

export type AppPasswordRestDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED' | 'APP_PASSWORD_SCOPE_INSUFFICIENT';
      message: string;
    };

// IDs are nanoid-style; anything else (encoded slashes, dots) cannot match a segment.
const ID_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Static routes that sit next to an `[id]` route. Astro routes these ahead of `[id]`, so an
 * `{id}` rule must not match them (`/api/transactions/{id}` must not open `/api/transactions/bulk`).
 */
const STATIC_SIBLING_SEGMENTS: ReadonlySet<string> = new Set([
  'bulk',
  'export',
  'import',
  'template',
  'closed',
  'transfer',
  'copy',
  'initialize',
  'icon-preview',
  'occurrences',
  'calendar',
  'forecast',
  'stats',
]);

const COMPILED_ROUTES = APP_PASSWORD_REST_ROUTES.map((route) => ({
  ...route,
  segments: route.path.split('/'),
}));

function matchesTemplate(templateSegments: readonly string[], pathSegments: string[]): boolean {
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every((templateSegment, index) => {
    const segment = pathSegments[index];
    if (templateSegment !== '{id}') return templateSegment === segment;
    return ID_SEGMENT.test(segment) && !STATIC_SIBLING_SEGMENTS.has(segment);
  });
}

export function authorizeAppPasswordRequest(
  method: string,
  pathname: string,
  scope: AppPasswordScope
): AppPasswordRestDecision {
  const upperMethod = method.toUpperCase();
  const effectiveMethod = upperMethod === 'HEAD' ? 'GET' : upperMethod;
  const pathSegments = (pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname).split('/');
  const route = COMPILED_ROUTES.find((candidate) =>
    matchesTemplate(candidate.segments, pathSegments)
  );

  if (!route || !(route.methods as readonly string[]).includes(effectiveMethod)) {
    return {
      allowed: false,
      code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED',
      message: `App passwords cannot use ${upperMethod} ${pathname}`,
    };
  }

  if (scope === 'read' && effectiveMethod !== 'GET') {
    return {
      allowed: false,
      code: 'APP_PASSWORD_SCOPE_INSUFFICIENT',
      message: 'This app password is read-only. Create a read-write app password to make changes.',
    };
  }

  return { allowed: true };
}
