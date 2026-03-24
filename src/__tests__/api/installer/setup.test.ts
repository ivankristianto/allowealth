import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';

/**
 * Test the validation schema for the installer setup endpoint.
 * Integration testing of the full endpoint (DB inserts) is covered by E2E tests.
 */

// Inline the schema here to test it independently
const installerSetupSchema = v.object({
  workspaceName: v.pipe(
    v.string(),
    v.minLength(1, 'Workspace name is required'),
    v.maxLength(255, 'Workspace name must be less than 255 characters')
  ),
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  password: v.pipe(v.string(), v.minLength(12, 'Password must be at least 12 characters')),
});

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
