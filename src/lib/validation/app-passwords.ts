import * as v from 'valibot';
import {
  APP_PASSWORD_EXPIRY_OPTIONS,
  APP_PASSWORD_NAME_MAX_LENGTH,
  APP_PASSWORD_SCOPES,
  type AppPasswordScope,
} from '@/lib/mcp-app-password';
import {
  PERMISSION_IDS,
  SCOPE_PERMISSION_GRANTS,
  type Permission,
  type PermissionGrant,
} from '@/lib/permissions/registry';

const nameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, 'Name is required'),
  v.maxLength(APP_PASSWORD_NAME_MAX_LENGTH, 'Name is too long')
);

const scopeSchema = v.picklist(APP_PASSWORD_SCOPES, 'Choose read or read-write');

// The picklist holds registry ids only, so wildcards are refused here and reachable only via scope.
const permissionsSchema = v.pipe(
  v.array(
    v.picklist(PERMISSION_IDS, (issue) => `${String(issue.input)} is not a permission`),
    'Permissions must be a list'
  ),
  v.minLength(1, 'Choose at least one permission')
);

const accessFields = {
  scope: v.optional(scopeSchema),
  permissions: v.optional(permissionsSchema),
};

interface AccessInput {
  scope?: AppPasswordScope;
  permissions?: Permission[];
}

function hasBothAccessFields(input: AccessInput): boolean {
  return input.scope !== undefined && input.permissions !== undefined;
}

/** The grants to store: the scope's wildcard, or the custom list deduped in registry order. */
function toGrants(input: AccessInput): PermissionGrant[] | undefined {
  if (input.scope) return [...SCOPE_PERMISSION_GRANTS[input.scope]];
  if (!input.permissions) return undefined;
  const chosen = new Set<Permission>(input.permissions);
  return PERMISSION_IDS.filter((permission) => chosen.has(permission));
}

export const createAppPasswordSchema = v.pipe(
  v.object({
    name: nameSchema,
    expiry: v.picklist(APP_PASSWORD_EXPIRY_OPTIONS, 'Choose an expiry'),
    ...accessFields,
  }),
  v.check(
    (input) => input.scope !== undefined || input.permissions !== undefined,
    'Send either scope or permissions'
  ),
  v.check((input) => !hasBothAccessFields(input), 'Send either scope or permissions, not both'),
  v.transform(({ name, expiry, ...access }) => ({
    name,
    expiry,
    permissions: toGrants(access) as PermissionGrant[],
  }))
);

export const updateAppPasswordSchema = v.pipe(
  v.object({
    name: v.optional(nameSchema),
    ...accessFields,
  }),
  v.check((input) => !hasBothAccessFields(input), 'Send either scope or permissions, not both'),
  v.check(
    (input) =>
      input.name !== undefined || input.scope !== undefined || input.permissions !== undefined,
    'Send a name, a scope or permissions'
  ),
  v.transform(({ name, ...access }) => {
    const permissions = toGrants(access);
    return {
      ...(name !== undefined && { name }),
      ...(permissions && { permissions }),
    };
  })
);

export type CreateAppPasswordBody = v.InferOutput<typeof createAppPasswordSchema>;
export type UpdateAppPasswordBody = v.InferOutput<typeof updateAppPasswordSchema>;
