import { describe, test, expect } from 'bun:test';

describe('CSP directives for Turnstile', () => {
  test('production CSP includes challenges.cloudflare.com in script-src', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain('challenges.cloudflare.com');
  });

  test('CSP includes frame-src for Turnstile iframes', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain('frame-src');
  });

  test('CSP includes connect-src for Turnstile API', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain("'connect-src'");
    expect(content).toContain('challenges.cloudflare.com');
  });

  test('production CSP does not allow unsafe-eval', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');
    const prodBlock = content.match(/const CSP_DIRECTIVES_PROD[\s\S]*?as const;/);
    expect(prodBlock).not.toBeNull();
    if (prodBlock) {
      expect(prodBlock[0]).not.toContain('unsafe-eval');
    }
  });
});
