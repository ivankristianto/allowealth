/**
 * Session Management Service
 *
 * Thin wrapper over Better Auth session data that normalizes raw sessions
 * into UI-friendly rows and enforces product rules (e.g. cannot revoke
 * the current session).
 */

import type { NormalizedSession } from '@/lib/auth/types';

/** Raw session shape from Better Auth / Drizzle query */
export interface RawSession {
  id: string;
  token: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class SessionManagementService {
  /**
   * Normalize raw sessions for the UI.
   * Current session is always first; the rest follow in original order.
   */
  static listForUser(sessions: RawSession[], currentToken: string): NormalizedSession[] {
    const normalized = sessions.map((s) => ({
      id: s.id,
      token: s.token,
      isCurrent: s.token === currentToken,
      deviceLabel: parseDeviceLabel(s.userAgent),
      ipAddress: s.ipAddress ?? 'Unknown IP',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    // Current session first
    return normalized.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return 0;
    });
  }

  /** Throw if the caller tries to revoke their own session. */
  static validateRevoke(tokenToRevoke: string, currentToken: string): void {
    if (tokenToRevoke === currentToken) {
      throw new Error('Cannot revoke the current session');
    }
  }
}

// ---------------------------------------------------------------------------
// User-agent parsing
// ---------------------------------------------------------------------------

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg(?:e|A)?\//, 'Edge'],
  [/OPR\/|Opera\//, 'Opera'],
  [/Chrome\//, 'Chrome'],
  [/Firefox\//, 'Firefox'],
  [/Safari\//, 'Safari'],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/CrOS/, 'ChromeOS'],
];

function parseDeviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';

  const browser = BROWSER_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? 'Unknown browser';
  const os = OS_PATTERNS.find(([re]) => re.test(userAgent))?.[1];

  return os ? `${browser} on ${os}` : browser;
}
