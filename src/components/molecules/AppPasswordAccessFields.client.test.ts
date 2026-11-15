import { describe, expect, test } from 'bun:test';
import { readAccessFields } from './AppPasswordAccessFields.client';

function formData(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe('readAccessFields', () => {
  test('sends a preset as scope and ignores any checked permissions', () => {
    expect(readAccessFields(formData([['preset', 'read']]))).toEqual({ scope: 'read' });
    expect(
      readAccessFields(
        formData([
          ['preset', 'read-write'],
          ['permissions', 'accounts:read'],
        ])
      )
    ).toEqual({ scope: 'read-write' });
  });

  test('sends Custom as the checked permissions, never as a scope', () => {
    expect(
      readAccessFields(
        formData([
          ['preset', 'custom'],
          ['permissions', 'transactions:create'],
          ['permissions', 'accounts:read'],
        ])
      )
    ).toEqual({ permissions: ['transactions:create', 'accounts:read'] });
    expect(readAccessFields(formData([['preset', 'custom']]))).toEqual({ permissions: [] });
  });
});
