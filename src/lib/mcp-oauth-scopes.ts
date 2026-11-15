/**
 * OAuth scopes for MCP clients: one `allowealth:<permission>` scope per registry permission, how
 * granted scopes map to permissions, and what the consent page offers. No DB imports.
 */

import { PERMISSION_GROUPS } from '@/lib/app-password-access';
import { PERMISSIONS, PERMISSION_IDS, type Permission } from '@/lib/permissions/registry';

const PERMISSION_SCOPE_PREFIX = 'allowealth:';

export type PermissionScope = `allowealth:${Permission}`;

export function toPermissionScope(permission: Permission): PermissionScope {
  return `${PERMISSION_SCOPE_PREFIX}${permission}`;
}

export const PERMISSION_OAUTH_SCOPES: readonly PermissionScope[] =
  PERMISSION_IDS.map(toPermissionScope);

function isPermissionScope(scope: string): boolean {
  return scope.startsWith(PERMISSION_SCOPE_PREFIX);
}

/** Reads a token's `scopes` column, which the Better Auth adapter stores as JSON text on SQLite. */
export function parseStoredScopes(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((scope): scope is string => typeof scope === 'string')
      : [];
  } catch {
    return [];
  }
}

/** A token holds exactly its `allowealth:` scopes, in registry order; unknown ones grant nothing. */
export function oauthPermissionsFromScopes(scopes: readonly string[]): Permission[] {
  const granted = new Set(scopes);
  return PERMISSION_IDS.filter((permission) => granted.has(toPermissionScope(permission)));
}

/** The labels the connected apps list shows for a token's granted scopes. */
export function describeOAuthPermissions(scopes: readonly string[]): string[] {
  const granted = new Set<string>(oauthPermissionsFromScopes(scopes));
  const labels = PERMISSIONS.filter((permission) => granted.has(permission.id)).map(
    (permission) => permission.label
  );
  return labels.length > 0 ? labels : ['No permissions'];
}

interface ScopeChoice {
  scope: string;
  label: string;
  description: string;
}

const REQUIRED_SCOPE_TEXT: Readonly<Record<string, Omit<ScopeChoice, 'scope'>>> = {
  openid: {
    label: 'Confirm your account',
    description: 'Tells the app which Allowealth account approved it.',
  },
  mcp: {
    label: 'Connect through MCP',
    description: 'Lets the app call the Allowealth tools its permissions allow.',
  },
  profile: { label: 'See your name', description: 'Your name and profile picture.' },
  email: { label: 'See your email address', description: 'The email you sign in with.' },
  offline_access: {
    label: 'Stay connected',
    description: 'Keeps access after the first access token expires.',
  },
};

export interface ConsentScopeChoices {
  /** Shown but not untickable. */
  required: ScopeChoice[];
  /** Requested permission scopes, grouped as the app password picker groups them. */
  groups: Array<{ label: string; permissions: ScopeChoice[] }>;
}

export function getConsentScopeChoices(requested: readonly string[]): ConsentScopeChoices {
  const requestedSet = new Set(requested);
  const required = requested
    .filter((scope) => !isPermissionScope(scope))
    .map((scope) => ({
      scope,
      ...(Object.hasOwn(REQUIRED_SCOPE_TEXT, scope)
        ? REQUIRED_SCOPE_TEXT[scope]
        : { label: scope, description: '' }),
    }));
  const groups = PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    permissions: group.permissions
      .filter((permission) => requestedSet.has(toPermissionScope(permission.id)))
      .map((permission) => ({
        scope: toPermissionScope(permission.id),
        label: permission.label,
        description: permission.description,
      })),
  })).filter((group) => group.permissions.length > 0);

  return { required, groups };
}

/** Grants every requested non-permission scope plus the ticked permission scopes that were requested. */
export function resolveConsentScopes(
  requested: readonly string[],
  ticked: readonly string[]
): string[] {
  const tickedSet = new Set(ticked);
  return requested.filter((scope) => !isPermissionScope(scope) || tickedSet.has(scope));
}
