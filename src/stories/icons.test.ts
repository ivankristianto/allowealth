/**
 * Shared Icons Tests
 * ==================
 * Unit tests for shared storybook icon definitions
 */

import { describe, it, expect } from 'bun:test';
import { chevronLeftIcon, chevronRightIcon, chevronDownIcon } from './icons';

describe('Shared Icons - chevronLeftIcon', () => {
  it('should be a valid SVG string', () => {
    expect(chevronLeftIcon).toContain('<svg');
    expect(chevronLeftIcon).toContain('</svg>');
  });

  it('should have aria-hidden for accessibility', () => {
    expect(chevronLeftIcon).toContain('aria-hidden="true"');
  });

  it('should have correct dimensions (18x18)', () => {
    expect(chevronLeftIcon).toContain('width="18"');
    expect(chevronLeftIcon).toContain('height="18"');
  });

  it('should have stroke-current class for theming', () => {
    expect(chevronLeftIcon).toContain('class="stroke-current"');
  });
});

describe('Shared Icons - chevronRightIcon', () => {
  it('should be a valid SVG string', () => {
    expect(chevronRightIcon).toContain('<svg');
    expect(chevronRightIcon).toContain('</svg>');
  });

  it('should have aria-hidden for accessibility', () => {
    expect(chevronRightIcon).toContain('aria-hidden="true"');
  });

  it('should have correct dimensions (18x18)', () => {
    expect(chevronRightIcon).toContain('width="18"');
    expect(chevronRightIcon).toContain('height="18"');
  });

  it('should have stroke-current class for theming', () => {
    expect(chevronRightIcon).toContain('class="stroke-current"');
  });
});

describe('Shared Icons - chevronDownIcon', () => {
  it('should be a valid SVG string', () => {
    expect(chevronDownIcon).toContain('<svg');
    expect(chevronDownIcon).toContain('</svg>');
  });

  it('should have aria-hidden for accessibility', () => {
    expect(chevronDownIcon).toContain('aria-hidden="true"');
  });

  it('should have correct dimensions (14x14)', () => {
    expect(chevronDownIcon).toContain('width="14"');
    expect(chevronDownIcon).toContain('height="14"');
  });

  it('should have stroke-current class for theming', () => {
    expect(chevronDownIcon).toContain('stroke-current');
  });
});

describe('Shared Icons - icon consistency', () => {
  it('should all be Lucide-style icons', () => {
    // All icons use viewBox="0 0 24 24" (Lucide standard)
    expect(chevronLeftIcon).toContain('viewBox="0 0 24 24"');
    expect(chevronRightIcon).toContain('viewBox="0 0 24 24"');
    expect(chevronDownIcon).toContain('viewBox="0 0 24 24"');
  });

  it('should all have consistent stroke properties', () => {
    const icons = [chevronLeftIcon, chevronRightIcon, chevronDownIcon];
    icons.forEach((icon) => {
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('stroke-width="2"');
      expect(icon).toContain('stroke-linecap="round"');
      expect(icon).toContain('stroke-linejoin="round"');
    });
  });

  it('should have no fill (stroke-only icons)', () => {
    const icons = [chevronLeftIcon, chevronRightIcon, chevronDownIcon];
    icons.forEach((icon) => {
      expect(icon).toContain('fill="none"');
    });
  });
});
