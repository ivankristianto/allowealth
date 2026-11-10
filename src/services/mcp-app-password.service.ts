import { DrizzleQueryError, and, count, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db as defaultDb, getActiveSchema, type Database } from '@/db';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import {
  MAX_APP_PASSWORDS_PER_USER,
  expiryOptionToDays,
  generateAppPasswordToken,
  getAppPasswordHint,
  isAppPasswordToken,
  type AppPasswordExpiryOption,
  type AppPasswordScope,
} from '@/lib/mcp-app-password';
import type { McpAuthContext } from '@/lib/mcp-auth';

const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

/** Drizzle errors embed bound params (the token hash) in their message; keep only the cause. */
async function withoutQueryParams<T>(action: string, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const source = error instanceof DrizzleQueryError ? error.cause : error;
    throw new Error(
      `${action} failed: ${source instanceof Error ? source.message : 'database error'}`
    );
  }
}

export interface AppPasswordSummary {
  id: string;
  name: string;
  tokenHint: string;
  scope: AppPasswordScope;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
}

export interface CreateAppPasswordInput {
  userId: string;
  name: string;
  scope: AppPasswordScope;
  expiry: AppPasswordExpiryOption;
}

export type AppPasswordErrorCode = 'LIMIT_REACHED' | 'NO_WORKSPACE';

export class AppPasswordError extends Error {
  constructor(
    message: string,
    readonly code: AppPasswordErrorCode
  ) {
    super(message);
    this.name = 'AppPasswordError';
  }
}

export class McpAppPasswordService {
  private get schema() {
    return getActiveSchema();
  }

  constructor(
    private database: Database = defaultDb,
    private now: () => Date = () => new Date()
  ) {}

  /** Returns the raw token once; only its hash is stored. */
  async create(
    input: CreateAppPasswordInput
  ): Promise<{ token: string; appPassword: AppPasswordSummary }> {
    const { mcpAppPasswords, users } = this.schema;

    const owner = await this.database.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { workspace_id: true, deleted_at: true },
    });
    if (!owner?.workspace_id || owner.deleted_at) {
      throw new AppPasswordError('App passwords need an active workspace', 'NO_WORKSPACE');
    }

    const [{ total }] = await this.database
      .select({ total: count() })
      .from(mcpAppPasswords)
      .where(eq(mcpAppPasswords.user_id, input.userId));
    if (total >= MAX_APP_PASSWORDS_PER_USER) {
      throw new AppPasswordError(
        `You can have at most ${MAX_APP_PASSWORDS_PER_USER} app passwords. Revoke one first.`,
        'LIMIT_REACHED'
      );
    }

    const token = generateAppPasswordToken();
    const createdAt = this.now();
    const days = expiryOptionToDays(input.expiry);
    const row = {
      id: `pat_${nanoid(16)}`,
      user_id: input.userId,
      workspace_id: owner.workspace_id,
      name: input.name,
      token_hash: await hashOAuthToken(token),
      token_hint: getAppPasswordHint(token),
      scope: input.scope,
      expires_at: days === null ? null : new Date(createdAt.getTime() + days * DAY_MS),
      last_used_at: null,
      created_at: createdAt,
    };

    await withoutQueryParams('Saving the app password', async () => {
      await this.database.insert(mcpAppPasswords).values(row);
    });

    return { token, appPassword: this.toSummary(row) };
  }

  async listForUser(userId: string): Promise<AppPasswordSummary[]> {
    const { mcpAppPasswords } = this.schema;
    const rows = await this.database
      .select()
      .from(mcpAppPasswords)
      .where(eq(mcpAppPasswords.user_id, userId))
      .orderBy(desc(mcpAppPasswords.created_at));

    return rows.map((row) => this.toSummary(row));
  }

  /** Deletes the row; returns null when it does not exist or belongs to someone else. */
  async revoke(userId: string, id: string): Promise<{ id: string; name: string } | null> {
    const { mcpAppPasswords } = this.schema;
    const deleted = await this.database
      .delete(mcpAppPasswords)
      .where(and(eq(mcpAppPasswords.id, id), eq(mcpAppPasswords.user_id, userId)))
      .returning({ id: mcpAppPasswords.id, name: mcpAppPasswords.name });

    return deleted[0] ?? null;
  }

  async verify(token: string): Promise<McpAuthContext | null> {
    if (!isAppPasswordToken(token)) return null;

    const { mcpAppPasswords, users } = this.schema;
    const tokenHash = await hashOAuthToken(token);
    const [record] = await withoutQueryParams('Checking the app password', () =>
      this.database
        .select({
          id: mcpAppPasswords.id,
          userId: mcpAppPasswords.user_id,
          workspaceId: mcpAppPasswords.workspace_id,
          scope: mcpAppPasswords.scope,
          expiresAt: mcpAppPasswords.expires_at,
          lastUsedAt: mcpAppPasswords.last_used_at,
          userWorkspaceId: users.workspace_id,
          userDeletedAt: users.deleted_at,
        })
        .from(mcpAppPasswords)
        .innerJoin(users, eq(users.id, mcpAppPasswords.user_id))
        .where(eq(mcpAppPasswords.token_hash, tokenHash))
        .limit(1)
    );

    if (!record) return null;

    const now = this.now();
    if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) return null;
    if (record.userDeletedAt) return null;
    // A user moved to another workspace, or a super admin without one, loses access.
    if (!record.userWorkspaceId || record.userWorkspaceId !== record.workspaceId) return null;

    if (
      !record.lastUsedAt ||
      now.getTime() - record.lastUsedAt.getTime() >= LAST_USED_WRITE_INTERVAL_MS
    ) {
      await this.database
        .update(mcpAppPasswords)
        .set({ last_used_at: now })
        .where(eq(mcpAppPasswords.id, record.id));
    }

    return {
      workspaceId: record.workspaceId,
      userId: record.userId,
      tokenId: record.id,
      scope: record.scope,
    };
  }

  private toSummary(row: {
    id: string;
    name: string;
    token_hint: string;
    scope: AppPasswordScope;
    created_at: Date;
    last_used_at: Date | null;
    expires_at: Date | null;
  }): AppPasswordSummary {
    return {
      id: row.id,
      name: row.name,
      tokenHint: row.token_hint,
      scope: row.scope,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isExpired: row.expires_at !== null && row.expires_at.getTime() <= this.now().getTime(),
    };
  }
}

export const mcpAppPasswordService = new McpAppPasswordService();
