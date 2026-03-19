import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('mobile blur performance policy', () => {
  test('keeps persistent surfaces free of disallowed blur', () => {
    const header = read('src/components/layouts/Header.astro');
    const mobileNavigation = read('src/components/layouts/MobileNavigation.astro');
    const mobileCommandCenter = read('src/components/layouts/MobileCommandCenter.astro');

    expect(header).not.toMatch(/backdrop-blur-(xl|2xl|3xl)/);
    expect(mobileNavigation).not.toMatch(/backdrop-blur-(xl|2xl|3xl)/);
    expect(mobileCommandCenter).not.toMatch(/backdrop-blur-(xl|2xl|3xl)/);
    expect(mobileCommandCenter).not.toMatch(/\bblur-\[(\d{3,})px\]/);
    expect(mobileCommandCenter).not.toMatch(/\bblur-(?:lg|xl|2xl|3xl)\b/);
  });

  test('keeps allowed transient overlays within the small blur policy', () => {
    const drawer = read('src/components/molecules/Drawer.astro');
    const modal = read('src/components/molecules/Modal.astro');
    const categoryDrillDownModal = read('src/components/organisms/CategoryDrillDownModal.astro');

    expect(drawer).toContain('backdrop-blur-sm');
    expect(modal).toContain('backdrop-blur-md');
    expect(categoryDrillDownModal).toContain('backdrop-blur-sm');
  });

  test('documents a repeatable blur audit command', () => {
    const designSystem = read('.claude/rules/frontend/design-system.md');

    expect(designSystem).toContain('## CSS Blur Performance (iOS Safari)');
    expect(designSystem).toContain('### Verification');
    expect(designSystem).toContain('grep -r "backdrop-blur\\|blur-" src/');
  });
});
