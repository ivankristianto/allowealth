import { describe, it, expect } from 'bun:test';
import { SessionManagementService } from './session-management.service';

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    token: 'tok-1',
    userId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    expiresAt: new Date('2026-04-01'),
    ...overrides,
  };
}

describe('SessionManagementService', () => {
  describe('listForUser', () => {
    it('returns the current session first', () => {
      const sessions = [
        makeSession({ id: 'sess-1', token: 'tok-1' }),
        makeSession({ id: 'sess-2', token: 'tok-2' }),
        makeSession({ id: 'sess-3', token: 'tok-3' }),
      ];

      const result = SessionManagementService.listForUser(sessions, 'tok-2');
      expect(result[0].id).toBe('sess-2');
      expect(result[0].isCurrent).toBe(true);
    });

    it('marks non-current sessions as not current', () => {
      const sessions = [
        makeSession({ id: 'sess-1', token: 'tok-1' }),
        makeSession({ id: 'sess-2', token: 'tok-2' }),
      ];

      const result = SessionManagementService.listForUser(sessions, 'tok-1');
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });

    it('maps missing userAgent to "Unknown device"', () => {
      const sessions = [makeSession({ userAgent: null })];
      const result = SessionManagementService.listForUser(sessions, 'tok-1');
      expect(result[0].deviceLabel).toBe('Unknown device');
    });

    it('maps missing ipAddress to "Unknown IP"', () => {
      const sessions = [makeSession({ ipAddress: null })];
      const result = SessionManagementService.listForUser(sessions, 'tok-1');
      expect(result[0].ipAddress).toBe('Unknown IP');
    });

    it('parses userAgent into a device label', () => {
      const sessions = [
        makeSession({
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }),
      ];
      const result = SessionManagementService.listForUser(sessions, 'tok-1');
      expect(result[0].deviceLabel).toBe('Chrome on macOS');
    });
  });

  describe('revokeSession', () => {
    it('rejects revoking the current session', () => {
      expect(() => SessionManagementService.validateRevoke('tok-current', 'tok-current')).toThrow(
        'Cannot revoke the current session'
      );
    });

    it('allows revoking a different session', () => {
      expect(() =>
        SessionManagementService.validateRevoke('tok-other', 'tok-current')
      ).not.toThrow();
    });
  });

  describe('revokeOtherSessions', () => {
    it('identifies tokens to revoke (excludes current)', () => {
      const sessions = [
        makeSession({ id: 'sess-1', token: 'tok-1' }),
        makeSession({ id: 'sess-2', token: 'tok-2' }),
        makeSession({ id: 'sess-3', token: 'tok-3' }),
      ];

      const tokensToRevoke = SessionManagementService.getOtherTokens(sessions, 'tok-2');
      expect(tokensToRevoke).toEqual(['tok-1', 'tok-3']);
    });
  });
});
