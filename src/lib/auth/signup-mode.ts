import { getEnv } from '@/lib/env';

export const SIGNUP_MODES = {
  INVITE_ONLY: 'invite_only',
  PUBLIC: 'public',
} as const;

export type SignupMode = (typeof SIGNUP_MODES)[keyof typeof SIGNUP_MODES];

export function getSignupMode(): SignupMode {
  const signupMode = getEnv('SIGNUP_MODE');

  if (signupMode === SIGNUP_MODES.PUBLIC) {
    return SIGNUP_MODES.PUBLIC;
  }

  return SIGNUP_MODES.INVITE_ONLY;
}

export function isPublicSignupEnabled(): boolean {
  return getSignupMode() === SIGNUP_MODES.PUBLIC;
}
