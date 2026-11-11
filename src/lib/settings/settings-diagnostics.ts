import type { AuthRole } from '@/lib/auth/types';
import type { DiagnosticsData } from '@/types/diagnostics';
import { createLogger } from '@/lib/logger';

const log = createLogger('settings');

export interface SettingsDiagnostics {
  canView: boolean;
  data: DiagnosticsData | null;
  error: string | null;
}

/** Same rule as /api/admin/diagnostics: server internals are for super_admins only. */
export function canViewServerDiagnostics(role: AuthRole): boolean {
  return role === 'super_admin';
}

/** Runs the DB probe and cache check only for roles allowed to see the result. */
export async function loadSettingsDiagnostics(
  role: AuthRole,
  load: () => Promise<DiagnosticsData>
): Promise<SettingsDiagnostics> {
  if (!canViewServerDiagnostics(role)) {
    return { canView: false, data: null, error: null };
  }

  try {
    return { canView: true, data: await load(), error: null };
  } catch (error) {
    log.error('Failed to fetch diagnostics', error);
    return {
      canView: true,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
