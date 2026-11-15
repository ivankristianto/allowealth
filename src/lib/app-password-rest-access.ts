/**
 * Which REST routes an app password may call, and with which methods.
 * Deny by default: a route missing here returns 403 for Bearer app passwords.
 */

import type { AppPasswordScope } from '@/lib/mcp-app-password';
import type { Permission } from '@/lib/permissions/registry';

export type AppPasswordRestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Marks a route that carries no workspace data, such as the OpenAPI document. */
export const ANY_VALID_TOKEN = 'any-valid-token';

export type AppPasswordRestPermission = Permission | typeof ANY_VALID_TOKEN;

export type AppPasswordRestPermissionMap = Readonly<
  Partial<Record<AppPasswordRestMethod, AppPasswordRestPermission>>
>;

export interface AppPasswordRestRoute {
  /** OpenAPI-style template; `{id}` matches one ID segment. */
  path: string;
  methods: readonly AppPasswordRestMethod[];
  permissions: AppPasswordRestPermissionMap;
}

// Methods come from the permission map, so an allowed method cannot lack a permission.
function rule(path: string, permissions: AppPasswordRestPermissionMap): AppPasswordRestRoute {
  return { path, methods: Object.keys(permissions) as AppPasswordRestMethod[], permissions };
}

export const APP_PASSWORD_REST_ROUTES: readonly AppPasswordRestRoute[] = [
  rule('/api/openapi.json', { GET: ANY_VALID_TOKEN }),

  rule('/api/transactions', { GET: 'transactions:read', POST: 'transactions:create' }),
  rule('/api/transactions/{id}', {
    GET: 'transactions:read',
    PUT: 'transactions:update',
    DELETE: 'transactions:delete',
  }),
  rule('/api/transactions/{id}/history', { GET: 'transactions:read' }),

  rule('/api/budget/overview', { GET: 'budgets:read' }),
  rule('/api/budget/history', { GET: 'budgets:read' }),
  rule('/api/budget/category-trends', { GET: 'budgets:read' }),
  rule('/api/budget/category/{id}/remaining', { GET: 'budgets:read' }),
  rule('/api/budgets', { GET: 'budgets:read' }),
  rule('/api/budgets/{id}', { GET: 'budgets:read' }),

  rule('/api/recurring', { GET: 'recurring:read', POST: 'recurring:write' }),
  rule('/api/recurring/{id}', { GET: 'recurring:read', PUT: 'recurring:write' }),
  rule('/api/recurring/occurrences', { GET: 'recurring:read' }),
  rule('/api/recurring/occurrences/{id}/confirm', { POST: 'recurring:confirm' }),
  rule('/api/recurring/calendar', { GET: 'recurring:read' }),
  rule('/api/recurring/forecast', { GET: 'recurring:read' }),
  rule('/api/recurring/stats', { GET: 'recurring:read' }),

  rule('/api/accounts', { GET: 'accounts:read' }),
  rule('/api/accounts/{id}', { GET: 'accounts:read' }),
  rule('/api/categories', { GET: 'categories:read' }),
  rule('/api/categories/{id}', { GET: 'categories:read' }),
  rule('/api/account-categories', { GET: 'categories:read' }),
  rule('/api/account-categories/{id}', { GET: 'categories:read' }),
  rule('/api/workspace/settings', { GET: 'settings:read' }),

  rule('/api/forecast', { GET: 'forecast:read' }),
  rule('/api/reports', { GET: 'reports:read' }),
  rule('/api/reports/expenses', { GET: 'reports:read' }),
  rule('/api/reports/income', { GET: 'reports:read' }),
  rule('/api/reports/members', { GET: 'reports:read' }),
  rule('/api/reports/category-drilldown', { GET: 'reports:read' }),
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
