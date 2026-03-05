import { describe, expect, it } from 'bun:test';
import { partitionActionsForViewport } from './action-hierarchy';

describe('partitionActionsForViewport', () => {
  it('keeps up to 2 secondary actions on mobile and overflows the rest', () => {
    const result = partitionActionsForViewport(
      [
        { id: 'categories', label: 'Categories' },
        { id: 'import', label: 'Import' },
        { id: 'export', label: 'Export' },
      ],
      'mobile'
    );

    expect(result.visible.map((a) => a.id)).toEqual(['categories', 'import']);
    expect(result.overflow.map((a) => a.id)).toEqual(['export']);
  });

  it('keeps up to 3 secondary actions on desktop and overflows the rest', () => {
    const result = partitionActionsForViewport(
      [
        { id: 'categories', label: 'Categories' },
        { id: 'import', label: 'Import' },
        { id: 'export', label: 'Export' },
        { id: 'copy', label: 'Copy' },
      ],
      'desktop'
    );

    expect(result.visible.map((a) => a.id)).toEqual(['categories', 'import', 'export']);
    expect(result.overflow.map((a) => a.id)).toEqual(['copy']);
  });

  it('returns all actions as visible when under the cap', () => {
    const result = partitionActionsForViewport(
      [{ id: 'categories', label: 'Categories' }],
      'mobile'
    );

    expect(result.visible.map((a) => a.id)).toEqual(['categories']);
    expect(result.overflow).toEqual([]);
  });

  it('returns empty arrays for empty input', () => {
    const result = partitionActionsForViewport([], 'desktop');

    expect(result.visible).toEqual([]);
    expect(result.overflow).toEqual([]);
  });
});
