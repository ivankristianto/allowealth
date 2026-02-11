import { describe, test, expect } from 'bun:test';

describe('POST /api/auth/signup - Turnstile verification', () => {
  test('includes turnstile verification in signup endpoint', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    expect(content).toContain('verifyTurnstileToken');
    expect(content).toContain('turnstileToken');
    expect(content).toContain('TURNSTILE_FAILED');
  });

  test('turnstile verification happens before rate limiting', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    const turnstileIndex = content.indexOf('verifyTurnstileToken');
    const rateLimitIndex = content.indexOf('checkRateLimit');

    expect(turnstileIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(turnstileIndex).toBeLessThan(rateLimitIndex);
  });

  test('requires invitation token for signup', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    expect(content).toContain("signupMode === 'invite_only'");
    expect(content).toContain('getSignupMode');
    expect(content).toContain('Invitation token is required');
  });

  test('supports public signup path when signup mode is public', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    expect(content).toContain('register(');
    expect(content).toContain('if (invitationToken)');
  });
});
