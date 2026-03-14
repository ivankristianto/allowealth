import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('demo reset workflow', () => {
  it('passes the Cloudflare credentials required by the remote D1 reset path', () => {
    const source = readFileSync('.github/workflows/demo-reset.yml', 'utf8');

    expect(source).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(source).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(source).toContain('D1_DATABASE_ID: ${{ secrets.D1_DATABASE_ID }}');
  });
});
