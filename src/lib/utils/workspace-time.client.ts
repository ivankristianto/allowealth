import {
  getCurrentDateISO,
  getCurrentMonthISO,
  getRuntimeTimeZone,
  normalizeTimeZone,
} from './date';

/** The workspace zone from `<body data-workspace-timezone>`, else the browser's zone. */
export function getWorkspaceTimeZone(): string {
  const fromBody =
    typeof document === 'undefined' ? undefined : document.body?.dataset.workspaceTimezone;
  return normalizeTimeZone(fromBody) ?? getRuntimeTimeZone();
}

/** Today (YYYY-MM-DD) in the workspace zone. */
export function getWorkspaceToday(now: Date = new Date()): string {
  return getCurrentDateISO(getWorkspaceTimeZone(), now);
}

/** The current month (YYYY-MM) in the workspace zone. */
export function getWorkspaceMonth(now: Date = new Date()): string {
  return getCurrentMonthISO(getWorkspaceTimeZone(), now);
}
