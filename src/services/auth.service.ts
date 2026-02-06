/**
 * Authentication Service
 *
 * Provides high-level authentication operations including user registration,
 * login, logout, session validation, and user retrieval.
 *
 * Error codes:
 * - USER_EXISTS: Email already registered
 * - INVALID_CREDENTIALS: Email or password incorrect
 * - INVALID_INPUT: Input validation failed
 * - DATABASE_ERROR: Database operation failed
 */

import { auth, type User, type Session } from '@/lib/auth/lucia';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { db, type IDatabase, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');
import { eq } from 'drizzle-orm';

// Get the correct schema for the current database dialect
const schema = getActiveSchema();
import { nanoid } from 'nanoid';
import { EmailVerificationService } from './email-verification.service';

/**
 * Error codes for authentication operations
 */
export const AUTH_ERRORS = {
  USER_EXISTS: 'USER_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_INPUT: 'INVALID_INPUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  WORKSPACE_INACTIVE: 'WORKSPACE_INACTIVE',
} as const;

/**
 * Auth error class
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Input validation result
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * - Minimum 12 characters
 * - At least one letter
 * - At least one number or special character
 */
function validatePassword(password: string): boolean {
  if (password.length < 12) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasLetter && hasNumberOrSpecial;
}

/**
 * Validate registration input
 */
function validateRegistrationInput(
  email: string,
  password: string,
  name: string
): ValidationResult {
  const errors: string[] = [];

  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!password || !validatePassword(password)) {
    errors.push(
      'Password must be at least 12 characters with letters and numbers/special characters'
    );
  }

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate login input
 */
function validateLoginInput(email: string, password: string): ValidationResult {
  const errors: string[] = [];

  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Register a new user
 *
 * Creates a new workspace and makes the user an admin of that workspace.
 *
 * @param email - User email address
 * @param password - User password (will be hashed)
 * @param name - User display name
 * @returns Promise resolving to the created user
 * @throws {AuthError} If email already exists or input is invalid
 */
export async function register(email: string, password: string, name: string): Promise<User> {
  // Validate input
  const validation = validateRegistrationInput(email, password, name);
  if (!validation.valid) {
    throw new AuthError(AUTH_ERRORS.INVALID_INPUT, validation.errors!.join(', '));
  }

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    if (existingUser) {
      throw new AuthError(AUTH_ERRORS.USER_EXISTS, 'An account with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique IDs
    const workspaceId = nanoid();
    const userId = nanoid();

    const newUser = await db.transaction(async (tx: IDatabase) => {
      // Create workspace as INACTIVE (activated after email verification)
      await tx
        .insert(schema.workspaces)
        .values({
          id: workspaceId,
          name: `${name.trim()}'s Workspace`,
          status: 'inactive',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Create user (emailVerifiedAt = null by default)
      const [createdUser] = await tx
        .insert(schema.users)
        .values({
          id: userId,
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          name: name.trim(),
          role: 'admin',
        })
        .returning();

      if (!createdUser) {
        throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to create user');
      }

      // NOTE: Asset category seeding deferred until email verification
      // (handled in verify-email endpoint)

      return createdUser;
    });

    if (!newUser) {
      throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to create user');
    }

    // Send verification email (non-blocking - don't fail registration if email fails)
    try {
      const emailVerificationService = new EmailVerificationService(db);
      await emailVerificationService.sendVerificationEmail(newUser.id);
    } catch (emailError) {
      log.error('Failed to send verification email', { userId: newUser.id, error: emailError });
    }

    log.info('User registered (unverified)', {
      userId: newUser.id,
      email: newUser.email,
      workspaceId,
    });

    // Return user in Lucia format
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      attributes: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    } as User & { attributes: any };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Database operation failed');
  }
}

/**
 * Register a new user with an invitation
 *
 * Adds the user to an existing workspace with the specified role.
 * Does NOT create a new workspace or default asset categories (those belong to workspace creator).
 *
 * @param email - User email address
 * @param password - User password (will be hashed)
 * @param name - User display name
 * @param workspaceId - ID of the workspace to join
 * @param role - Role in the workspace ('admin' or 'member')
 * @returns Promise resolving to the created user
 * @throws {AuthError} If email already exists or input is invalid
 */
export async function registerWithInvitation(
  email: string,
  password: string,
  name: string,
  workspaceId: string,
  role: 'admin' | 'member'
): Promise<User> {
  // Validate input
  const validation = validateRegistrationInput(email, password, name);
  if (!validation.valid) {
    throw new AuthError(AUTH_ERRORS.INVALID_INPUT, validation.errors!.join(', '));
  }

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    if (existingUser) {
      throw new AuthError(AUTH_ERRORS.USER_EXISTS, 'An account with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique user ID
    const userId = nanoid();

    // Create user in the invited workspace (no new workspace creation)
    const [newUser] = await db
      .insert(schema.users)
      .values({
        id: userId,
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name.trim(),
        role: role,
      })
      .returning();

    if (!newUser) {
      throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to create user');
    }

    // Send verification email (non-blocking - don't fail registration if email fails)
    try {
      const emailVerificationService = new EmailVerificationService(db);
      await emailVerificationService.sendVerificationEmail(newUser.id);
    } catch (emailError) {
      log.error('Failed to send verification email for invited user', {
        userId: newUser.id,
        error: emailError,
      });
    }

    log.info('User registered via invitation (unverified)', {
      userId: newUser.id,
      email: newUser.email,
      workspaceId,
    });

    // Return user in Lucia format
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      attributes: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    } as User & { attributes: any };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Database operation failed');
  }
}

/**
 * Login a user
 *
 * @param email - User email address
 * @param password - User password
 * @returns Promise resolving to { user, session, isDeleted }
 * @throws {AuthError} If credentials are invalid
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: User; session: Session; isDeleted: boolean }> {
  // Validate input
  const validation = validateLoginInput(email, password);
  if (!validation.valid) {
    throw new AuthError(AUTH_ERRORS.INVALID_INPUT, validation.errors!.join(', '));
  }

  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check if email is verified
    if (!user.email_verified_at) {
      log.warn('Login attempt with unverified email', { email });
      const err = new AuthError(AUTH_ERRORS.EMAIL_NOT_VERIFIED, 'Email not verified');
      (err as any).email = user.email;
      throw err;
    }

    // Check if workspace is active
    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, user.workspace_id),
    });

    if (!workspace || workspace.status !== 'active') {
      log.warn('Login attempt with inactive workspace', {
        email,
        workspaceId: user.workspace_id,
      });
      throw new AuthError(AUTH_ERRORS.WORKSPACE_INACTIVE, 'Workspace inactive');
    }

    // Check if user has been soft-deleted
    const isDeleted = user.deleted_at !== null;

    // Create session using Lucia
    // Note: Lucia's createSession expects (userId, attributes)
    // The adapter should handle inserting the session into the database
    const session = await auth.createSession(user.id, {});

    // Return user in Lucia format with workspace context
    const luciaUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      workspaceId: user.workspace_id,
      role: user.role as 'admin' | 'member',
      deletedAt: user.deleted_at,
    };

    return {
      user: luciaUser,
      session,
      isDeleted,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    // Log full error details for diagnosis (postgres.js errors have code, severity, detail)
    const errObj = error as Record<string, unknown>;
    const details = [
      errObj.message,
      errObj.code && `code=${errObj.code}`,
      errObj.severity && `severity=${errObj.severity}`,
      errObj.detail && `detail=${errObj.detail}`,
      errObj.hint && `hint=${errObj.hint}`,
      errObj.cause && `cause=${errObj.cause}`,
    ]
      .filter(Boolean)
      .join(' | ');
    log.error('DB error details:', details);
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, `Database operation failed: ${details}`);
  }
}

/**
 * Logout a user
 *
 * @param sessionId - Session ID to invalidate
 * @returns Promise resolving when session is invalidated
 * @throws {AuthError} If session not found or database error occurs
 */
export async function logout(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new AuthError(AUTH_ERRORS.NOT_AUTHENTICATED, 'No session provided');
  }

  try {
    await auth.invalidateSession(sessionId);
  } catch (error) {
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to invalidate session');
  }
}

/**
 * Validate a session
 *
 * @param sessionId - Session ID to validate
 * @returns Promise resolving to session if valid, null otherwise
 */
export async function validateSession(sessionId: string): Promise<Session | null> {
  if (!sessionId) {
    return null;
  }

  try {
    const { session } = await auth.validateSession(sessionId);
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from session
 *
 * @param sessionId - Session ID
 * @returns Promise resolving to user if found, null otherwise
 */
export async function getUser(sessionId: string): Promise<User | null> {
  if (!sessionId) {
    return null;
  }

  try {
    const { user, session } = await auth.validateSession(sessionId);

    if (!session || !user) {
      return null;
    }

    // Cast to our custom User type (Lucia's getUserAttributes returns these properties)
    return user as unknown as User;
  } catch (error) {
    return null;
  }
}
