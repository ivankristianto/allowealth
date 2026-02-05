/**
 * AllocationBar Inline Script Tests
 *
 * Ensures inline scripts avoid TypeScript annotations in Astro <script> tags.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const allocationPath = fileURLToPath(new URL('./AllocationBar.astro', import.meta.url));
const allocationSource = readFileSync(allocationPath, 'utf-8');

describe('AllocationBar inline script', () => {
  it('should avoid TypeScript annotations in inline script', () => {
    expect(allocationSource).not.toContain(': MouseEvent');
    expect(allocationSource).not.toContain(' as HTMLElement');
  });
});
