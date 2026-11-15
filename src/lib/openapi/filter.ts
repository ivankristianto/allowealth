import {
  APP_PASSWORD_REST_ROUTES,
  missingPermission,
  requiredPermission,
} from '@/lib/app-password-rest-access';
import type { Permission } from '@/lib/permissions/registry';

type PathItem = Record<string, unknown>;

const OPERATION_KEYS: ReadonlySet<string> = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

function mayCall(path: string, operationKey: string, permissions: readonly Permission[]): boolean {
  const rule = APP_PASSWORD_REST_ROUTES.find((candidate) => candidate.path === path);
  const required = rule && requiredPermission(rule, operationKey);
  return required !== undefined && missingPermission(required, permissions) === null;
}

/** A copy keeping only the operations a token with `permissions` may call; the input is not mutated. */
export function filterOpenApiForAppPassword<T extends { paths: Record<string, PathItem> }>(
  document: T,
  permissions: readonly Permission[]
): T {
  const paths = Object.entries(document.paths).flatMap(([path, item]) => {
    const kept = Object.entries(item).filter(
      ([key]) => !OPERATION_KEYS.has(key) || mayCall(path, key, permissions)
    );
    return kept.some(([key]) => OPERATION_KEYS.has(key)) ? [[path, Object.fromEntries(kept)]] : [];
  });
  return { ...document, paths: Object.fromEntries(paths) };
}
