import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const dockerfile = readFileSync('Dockerfile', 'utf8');

describe('Dockerfile runtime user setup', () => {
  it('uses the built-in bun user instead of addgroup/adduser', () => {
    expect(dockerfile).toContain('FROM oven/bun:1-slim AS runtime');
    expect(dockerfile).toContain('USER bun');
    expect(dockerfile).toContain('COPY --from=build --chown=bun:bun /app/dist ./dist');
    expect(dockerfile).toContain('RUN mkdir -p /data && chown bun:bun /data');
    expect(dockerfile).not.toContain('addgroup --system');
    expect(dockerfile).not.toContain('adduser --system');
    expect(dockerfile).not.toContain('USER allowealth');
  });
});
