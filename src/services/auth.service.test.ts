/**
 * Unit tests for AuthService
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  register,
  login,
  logout,
  validateSession,
  getUser,
  AuthError,
  AUTH_ERRORS,
} from './auth.service';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('AuthService', () => {
  // Clean up test database before each test
  beforeEach(async () => {
    // Delete test users created during tests
    await db.delete(users).where(eq(users.email, 'test@example.com'));
    await db.delete(users).where(eq(users.email, 'another@example.com'));
  });

  // Clean up after all tests
  afterEach(async () => {
    await db.delete(users).where(eq(users.email, 'test@example.com'));
    await db.delete(users).where(eq(users.email, 'another@example.com'));
  });

  describe('register', () => {
    it('should register a new user with valid input', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const name = 'Test User';

      const user = await register(email, password, name);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
    });

    it('should store password as hash', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const name = 'Test User';

      await register(email, password, name);

      // Verify password is hashed in database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.password_hash).toBeDefined();
      expect(dbUser?.password_hash).not.toBe(password);
    });

    it('should throw error for duplicate email', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const name = 'Test User';

      // Register first user
      await register(email, password, name);

      // Try to register same email again
      expect(register(email, 'AnotherPassword456!', 'Another User')).rejects.toThrow(
        'An account with this email already exists'
      );
    });

    it('should throw error for invalid email', async () => {
      expect(register('invalid-email', 'SecurePassword123!', 'Test User')).rejects.toThrow(
        'Valid email is required'
      );
    });

    it('should throw error for short password', async () => {
      expect(register('test@example.com', 'Short1!', 'Test User')).rejects.toThrow(
        'Password must be at least 12 characters'
      );
    });

    it('should throw error for empty name', async () => {
      expect(register('test@example.com', 'SecurePassword123!', '')).rejects.toThrow(
        'Name is required'
      );
    });

    it('should accept 12 character password with letters and numbers', async () => {
      const email = 'test@example.com';
      const password = 'Password123!';
      const name = 'Test User';

      const user = await register(email, password, name);

      expect(user).toBeDefined();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await register('test@example.com', 'SecurePassword123!', 'Test User');
    });

    it('should login with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';

      const result = await login(email, password);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.user.id).toBeDefined();
    });

    it('should throw error for incorrect password', async () => {
      expect(login('test@example.com', 'WrongPassword456!')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for non-existent email', async () => {
      expect(login('nonexistent@example.com', 'SecurePassword123!')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for invalid email format', async () => {
      expect(login('invalid-email', 'SecurePassword123!')).rejects.toThrow(
        'Valid email is required'
      );
    });

    it('should throw error for empty password', async () => {
      expect(login('test@example.com', '')).rejects.toThrow('Password is required');
    });

    it('should create session on successful login', async () => {
      const result = await login('test@example.com', 'SecurePassword123!');

      expect(result.session).toBeDefined();
      expect(result.session.id).toBeDefined();
      expect(result.session.userId).toBeDefined();
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('logout', () => {
    it('should invalidate session', async () => {
      // First login to create session
      await register('test@example.com', 'SecurePassword123!', 'Test User');
      const { session } = await login('test@example.com', 'SecurePassword123!');

      // Logout should not throw
      await logout(session.id);

      // Session should no longer be valid
      const validatedSession = await validateSession(session.id);
      expect(validatedSession).toBeNull();
    });

    it('should throw error for empty session ID', async () => {
      expect(logout('')).rejects.toThrow('No session provided');
    });

    it('should handle invalid session ID gracefully', async () => {
      // Should not throw even for invalid session
      await logout('invalid-session-id');
    });
  });

  describe('validateSession', () => {
    it('should validate valid session', async () => {
      await register('test@example.com', 'SecurePassword123!', 'Test User');
      const { session } = await login('test@example.com', 'SecurePassword123!');

      const validatedSession = await validateSession(session.id);

      expect(validatedSession).toBeDefined();
      expect(validatedSession?.id).toBe(session.id);
    });

    it('should return null for invalid session', async () => {
      const validatedSession = await validateSession('invalid-session-id');

      expect(validatedSession).toBeNull();
    });

    it('should return null for empty session ID', async () => {
      const validatedSession = await validateSession('');

      expect(validatedSession).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should get user from valid session', async () => {
      await register('test@example.com', 'SecurePassword123!', 'Test User');
      const { session } = await login('test@example.com', 'SecurePassword123!');

      const user = await getUser(session.id);

      expect(user).toBeDefined();
      expect(user?.id).toBeDefined();
    });

    it('should return null for invalid session', async () => {
      const user = await getUser('invalid-session-id');

      expect(user).toBeNull();
    });

    it('should return null for empty session ID', async () => {
      const user = await getUser('');

      expect(user).toBeNull();
    });

    it('should return null after logout', async () => {
      await register('test@example.com', 'SecurePassword123!', 'Test User');
      const { session } = await login('test@example.com', 'SecurePassword123!');

      await logout(session.id);

      const user = await getUser(session.id);
      expect(user).toBeNull();
    });
  });

  describe('Integration', () => {
    it('should complete full authentication flow', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const name = 'Test User';

      // Register
      const registeredUser = await register(email, password, name);
      expect(registeredUser).toBeDefined();

      // Login
      const { user: loggedInUser, session } = await login(email, password);
      expect(loggedInUser).toBeDefined();
      expect(session).toBeDefined();

      // Validate session
      const validatedSession = await validateSession(session.id);
      expect(validatedSession).toBeDefined();

      // Get user from session
      const userFromSession = await getUser(session.id);
      expect(userFromSession).toBeDefined();

      // Logout
      await logout(session.id);

      // Session should be invalid
      const invalidSession = await validateSession(session.id);
      expect(invalidSession).toBeNull();
    });
  });
});
