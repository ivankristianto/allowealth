import { afterEach, describe, expect, test } from 'bun:test';
import { getRuntimeTimeZone } from './date';
import {
  getWorkspaceMonth,
  getWorkspaceTimeZone,
  getWorkspaceToday,
} from './workspace-time.client';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

function setBodyTimezone(value: string | undefined) {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: { body: { dataset: value === undefined ? {} : { workspaceTimezone: value } } },
  });
}

afterEach(() => {
  if (originalDocument) {
    Object.defineProperty(globalThis, 'document', originalDocument);
  } else {
    delete (globalThis as { document?: unknown }).document;
  }
});

describe('workspace time on the client', () => {
  const justAfterJakartaMidnight = new Date('2026-11-01T00:30:00+07:00');

  test('uses the zone the server put on <body>', () => {
    setBodyTimezone('Asia/Jakarta');

    expect(getWorkspaceTimeZone()).toBe('Asia/Jakarta');
    expect(getWorkspaceToday(justAfterJakartaMidnight)).toBe('2026-11-01');
    expect(getWorkspaceMonth(justAfterJakartaMidnight)).toBe('2026-11');
  });

  test('falls back to the browser zone when the attribute is missing or invalid', () => {
    setBodyTimezone(undefined);
    expect(getWorkspaceTimeZone()).toBe(getRuntimeTimeZone());

    setBodyTimezone('Not/AZone');
    expect(getWorkspaceTimeZone()).toBe(getRuntimeTimeZone());
  });

  test('falls back to the runtime zone outside the browser', () => {
    expect(getWorkspaceTimeZone()).toBe(getRuntimeTimeZone());
  });
});
