import * as v from 'valibot';
import {
  APP_PASSWORD_EXPIRY_OPTIONS,
  APP_PASSWORD_NAME_MAX_LENGTH,
  APP_PASSWORD_SCOPES,
  type AppPasswordScope,
} from '@/lib/mcp-app-password';
import { APP_PASSWORD_PRESETS } from '@/lib/app-password-access';
import { MAX_LIMIT_CATEGORY_IDS, type AppPasswordLimits } from '@/lib/app-password-limits';
import { PERMISSION_IDS, type Permission, type PermissionGrant } from '@/lib/permissions/registry';

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

// Strict, so a misspelled key cannot leave a token unlimited. The service checks category ids.
const limitsSchema = v.pipe(
  v.strictObject(
    {
      category_ids: v.optional(
        v.pipe(
          v.array(
            v.pipe(v.string('Category ids must be strings'), v.minLength(1), v.maxLength(64)),
            'category_ids must be a list'
          ),
          v.minLength(1, 'List at least one category, or leave category_ids out'),
          v.maxLength(MAX_LIMIT_CATEGORY_IDS, 'Too many categories')
        )
      ),
      own_transactions_only: v.optional(v.boolean('own_transactions_only must be true or false')),
    },
    'Limits take only category_ids and own_transactions_only'
  ),
  v.transform(({ category_ids, own_transactions_only }): AppPasswordLimits => ({
    ...(category_ids && { category_ids: [...new Set(category_ids)] }),
    ...(own_transactions_only && { own_transactions_only: true }),
  }))
);

const accessFields = {
  scope: v.optional(scopeSchema),
  permissions: v.optional(permissionsSchema),
  limits: v.optional(limitsSchema),
};

interface AccessInput {
  scope?: AppPasswordScope;
  permissions?: Permission[];
}

const BOTH_ACCESS_FIELDS = 'Send either scope or permissions, not both';

/** The grants to store: the scope's wildcard, the custom list deduped in registry order, or none. */
function toGrants({ scope, permissions }: AccessInput): PermissionGrant[] | undefined {
  if (scope !== undefined) return [...APP_PASSWORD_PRESETS[scope].grants];
  if (permissions === undefined) return undefined;
  const chosen = new Set<Permission>(permissions);
  return PERMISSION_IDS.filter((permission) => chosen.has(permission));
}

export const createAppPasswordSchema = v.pipe(
  v.object({
    name: nameSchema,
    expiry: v.picklist(APP_PASSWORD_EXPIRY_OPTIONS, 'Choose an expiry'),
    ...accessFields,
  }),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    const { name, expiry, scope, permissions, limits } = dataset.value;
    if (scope !== undefined && permissions !== undefined) {
      addIssue({ message: BOTH_ACCESS_FIELDS });
      return NEVER;
    }
    const grants = toGrants({ scope, permissions });
    if (!grants) {
      addIssue({ message: 'Send either scope or permissions' });
      return NEVER;
    }
    return { name, expiry, permissions: grants, limits: limits ?? {} };
  })
);

export const updateAppPasswordSchema = v.pipe(
  v.object({
    name: v.optional(nameSchema),
    ...accessFields,
  }),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    const { name, scope, permissions, limits } = dataset.value;
    if (scope !== undefined && permissions !== undefined) {
      addIssue({ message: BOTH_ACCESS_FIELDS });
      return NEVER;
    }
    const grants = toGrants({ scope, permissions });
    if (name === undefined && !grants && limits === undefined) {
      addIssue({ message: 'Send a name, a scope, permissions or limits' });
      return NEVER;
    }
    return {
      ...(name !== undefined && { name }),
      ...(grants && { permissions: grants }),
      ...(limits && { limits }),
    };
  })
);

export type CreateAppPasswordBody = v.InferOutput<typeof createAppPasswordSchema>;
export type UpdateAppPasswordBody = v.InferOutput<typeof updateAppPasswordSchema>;
