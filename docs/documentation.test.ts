/**
 * Documentation Completeness Tests
 *
 * Tests to verify that icon migration documentation is complete and accurate.
 *
 * @fileoverview Tests for documentation files related to icon migration
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Icon Migration Documentation', () => {
  const docsDir = join(process.cwd(), 'docs');
  const designSystemDir = join(process.cwd(), 'design-system');

  describe('design-system/START.md', () => {
    const startPath = join(designSystemDir, 'START.md');
    const content = readFileSync(startPath, 'utf-8');

    test('should mention Lucide icons in Core Rules', () => {
      expect(content).toContain('@lucide/astro');
    });

    test('should show Lucide icon import examples', () => {
      expect(content).toMatch(/import.*from '@lucide\/astro'/);
    });

    test('should have icon usage examples', () => {
      expect(content).toContain('<Plus');
    });

    test('should warn against custom icons', () => {
      expect(content).toContain('❌ Custom icons');
    });

    test('should not use deprecated icons', () => {
      // Verify non-deprecated icons are used
      expect(content).not.toContain('AlertCircle');
      expect(content).not.toContain('AlertTriangle');
      expect(content).not.toContain('AlertOctagon');
      expect(content).not.toContain('XCircle');
    });
  });

  describe('design-system/04-accessibility.md', () => {
    const accessibilityPath = join(designSystemDir, '04-accessibility.md');
    const content = readFileSync(accessibilityPath, 'utf-8');

    test('should not use deprecated icons', () => {
      // Verify non-deprecated icons are used in accessibility examples
      expect(content).not.toContain('AlertCircle');
      expect(content).not.toContain('AlertTriangle');
      expect(content).not.toContain('XCircle');
    });

    test('should include aria-hidden on decorative icons', () => {
      // Icons with adjacent text should have aria-hidden
      expect(content).toContain('aria-hidden="true"');
    });
  });

  describe('design-system/02-components.md', () => {
    const componentsPath = join(designSystemDir, '02-components.md');
    const content = readFileSync(componentsPath, 'utf-8');

    test('should have Icon section with Lucide guidance', () => {
      expect(content).toContain('### Icon (`@lucide/astro`)');
    });

    test('should document icon sizing standards table', () => {
      expect(content).toContain('**Icon Sizing Standards:**');
      expect(content).toContain('Size (px)');
    });

    test('should document class-based sizing for inline SVGs', () => {
      expect(content).toContain('**Class-based sizing');
      expect(content).toContain('h-4 w-4');
      expect(content).toContain('size={16}');
    });

    test('should list common icons with correct Lucide names', () => {
      expect(content).toContain('TriangleAlert'); // Non-deprecated
      expect(content).toContain('CircleX');
      expect(content).toContain('CircleCheck');
    });

    test('should include icon accessibility patterns', () => {
      expect(content).toContain('**Icon accessibility patterns:**');
      expect(content).toContain('aria-hidden="true"');
      expect(content).toContain('aria-label');
    });

    test('should document standard icon classes', () => {
      expect(content).toContain('**Standard icon classes:**');
      expect(content).toContain('stroke-current');
      expect(content).toContain('shrink-0');
    });

    test('should reference migration guide', () => {
      expect(content).toContain('Migration note');
      expect(content).toContain('docs/icon-migration-guide.md');
    });
  });

  describe('docs/icon-migration-guide.md', () => {
    const guidePath = join(docsDir, 'icon-migration-guide.md');
    const content = readFileSync(guidePath, 'utf-8');

    test('should have proper file header with version and date', () => {
      expect(content).toContain('# Icon Migration Guide');
      expect(content).toContain('**Version:**');
      expect(content).toContain('**Last Updated:**');
    });

    test('should document size conversion from Icon.astro props', () => {
      expect(content).toContain('## Size Conversion');
      expect(content).toContain('### From Icon.astro Props');
      expect(content).toMatch(/\| `xs`.*\| `size=\{12\}`/);
      expect(content).toMatch(/\| `sm`.*\| `size=\{16\}`/);
      expect(content).toMatch(/\| `md`.*\| `size=\{20\}`/);
      expect(content).toMatch(/\| `lg`.*\| `size=\{24\}`/);
      expect(content).toMatch(/\| `xl`.*\| `size=\{32\}`/);
    });

    test('should document size conversion from inline SVG classes', () => {
      expect(content).toContain('### From Inline SVG Classes');
      expect(content).toMatch(/\| `h-3 w-3`.*\| `size=\{12\}`/);
      expect(content).toMatch(/\| `h-4 w-4`.*\| `size=\{16\}`/);
      expect(content).toMatch(/\| `h-5 w-5`.*\| `size=\{20\}`/);
      expect(content).toMatch(/\| `h-6 w-6`.*\| `size=\{24\}`/);
      expect(content).toMatch(/\| `h-8 w-8`.*\| `size=\{32\}`/);
    });

    test('should have comprehensive icon name mapping table', () => {
      expect(content).toContain('## Icon Name Mapping');
      expect(content).toContain('| Old Icon Name');
      expect(content).toContain('| Lucide Icon');
      expect(content).toContain('| Import');

      // Verify key mappings
      expect(content).toContain('`arrow-left`');
      expect(content).toContain('`ArrowLeft`');
      expect(content).toContain('`warning`');
      expect(content).toContain('`TriangleAlert`');
      expect(content).toContain('`alert`');
    });

    test('should document migration patterns with before/after examples', () => {
      expect(content).toContain('## Migration Patterns');
      expect(content).toContain('### Before: Icon Component');
      expect(content).toContain('### After: Lucide Icons');
      expect(content).toContain("import Icon from '../atoms/Icon.astro'");
    });

    test('should document common usage patterns', () => {
      expect(content).toContain('## Common Patterns');
      expect(content).toContain('### Button with Icon');
      expect(content).toContain('### Icon-Only Button');
      expect(content).toContain('### Status Message with Icon');
      expect(content).toContain('### Password Toggle');
      expect(content).toContain('### Navigation Icons');
    });

    test('should include accessibility guidelines', () => {
      expect(content).toContain('## Accessibility Guidelines');
      expect(content).toContain('### When to Use `aria-hidden`');
      expect(content).toContain('Decorative icon');
      expect(content).toContain('Icon with text');
      expect(content).toContain('Icon-only button');
    });

    test('should document standard icon classes table', () => {
      expect(content).toContain('### Standard Icon Classes');
      expect(content).toContain('| Purpose');
      expect(content).toContain('| Classes');
      expect(content).toContain('stroke-current');
      expect(content).toContain('shrink-0');
    });

    test('should include client-side SVG usage guidance', () => {
      expect(content).toContain('## Client-Side SVG Usage');
      expect(content).toContain('createElementNS');
      expect(content).toContain('## Common Lucide Icon Paths');
    });

    test('should provide migration checklist', () => {
      expect(content).toContain('## Migration Checklist');
      expect(content).toContain('- [ ] Replace `import Icon from');
      expect(content).toContain('- [ ] Convert size props');
      expect(content).toContain('- [ ] Add `aria-hidden="true"`');
    });

    test('should include resources section', () => {
      expect(content).toContain('## Resources');
      expect(content).toContain('lucide.dev');
    });

    test('should include migration summary', () => {
      expect(content).toContain('## Migration Summary');
      expect(content).toContain('completed in 2026-01-21');
      expect(content).toContain('44 files migrated');
      expect(content).toContain('Icon.astro component deleted');
    });

    test('should use non-deprecated icon names', () => {
      // Should use TriangleAlert instead of AlertTriangle
      expect(content).toContain('TriangleAlert');
      // Should mention deprecation replacements
      expect(content).toContain('non-deprecated equivalents');
    });
  });

  describe('Documentation consistency', () => {
    test('START.md and 02-components.md should both reference Lucide', () => {
      const startPath = join(designSystemDir, 'START.md');
      const componentsPath = join(designSystemDir, '02-components.md');

      const startContent = readFileSync(startPath, 'utf-8');
      const componentsContent = readFileSync(componentsPath, 'utf-8');

      expect(startContent).toContain('@lucide/astro');
      expect(componentsContent).toContain('@lucide/astro');
    });

    test('icon sizing should be consistent across docs', () => {
      const guidePath = join(docsDir, 'icon-migration-guide.md');
      const componentsPath = join(designSystemDir, '02-components.md');

      const guideContent = readFileSync(guidePath, 'utf-8');
      const componentsContent = readFileSync(componentsPath, 'utf-8');

      // Both should document the same size values (guide uses inline code, components uses table)
      expect(guideContent).toContain('size={12}');
      expect(guideContent).toContain('size={16}');
      expect(guideContent).toContain('size={20}');
      expect(guideContent).toContain('size={24}');
      expect(guideContent).toContain('size={32}');

      // Components docs use table format with just numbers (12, 16, 20, 24, 32)
      expect(componentsContent).toContain('| 12');
      expect(componentsContent).toContain('| 16');
      expect(componentsContent).toContain('| 20');
      expect(componentsContent).toContain('| 24');
      expect(componentsContent).toContain('| 32');
    });
  });
});
