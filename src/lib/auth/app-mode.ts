import { getEnv } from '@/lib/env';

export const APP_MODES = {
  APP_ONLY: 'app_only',
  FULL: 'full',
} as const;

export type AppMode = (typeof APP_MODES)[keyof typeof APP_MODES];

export function getAppMode(): AppMode {
  const appMode = getEnv('APP_MODE');

  if (appMode === APP_MODES.APP_ONLY) {
    return APP_MODES.APP_ONLY;
  }

  return APP_MODES.FULL;
}

export function isAppOnly(): boolean {
  return getAppMode() === APP_MODES.APP_ONLY;
}
