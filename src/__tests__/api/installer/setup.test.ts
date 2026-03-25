import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { installerSetupSchema } from '@/pages/api/installer/setup';

/**
 * Test the validation schema for the installer setup endpoint.
 * Integration testing of the full endpoint (DB inserts) is covered by E2E tests.
 */

describe('installer setup validation', () => {
  test('accepts valid input', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'My Workspace',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'securepassword123',
    });
    expect(result.success).toBe(true);
  });

  test('rejects empty workspace name', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: '',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid email', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'Workspace',
      name: 'Admin',
      email: 'not-an-email',
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects short password', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'Workspace',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing fields', () => {
    const result = v.safeParse(installerSetupSchema, {});
    expect(result.success).toBe(false);
  });
});
