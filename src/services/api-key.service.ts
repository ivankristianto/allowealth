import { type IDatabase } from '@/db';
import { nanoid } from 'nanoid';
import { eq, and, isNull } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { getCacheManager, CacheKeys, CacheTags, simpleHash } from '@/lib/cache';

const KEY_PREFIX = 'aw_';
const KEY_LENGTH = 32;
const PBKDF2_CONFIG = {
  iterations: 100_000,
  saltLength: 16,
  hashLength: 32,
  algorithm: 'SHA-256',
} as const;
const HASH_PREFIX = '$pbkdf2-sha256$';
const DEFAULT_VALIDATE_CACHE_TTL_SECONDS = 300;

const legacyApiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id').notNull(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  last_used_at: integer('last_used_at', { mode: 'timestamp' }),
  expires_at: integer('expires_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
});

interface GenerateInput {
  workspace_id: string;
  user_id: string;
  name: string;
  expires_at?: Date;
}

interface GenerateResult {
  plainKey: string;
  apiKey: {
    id: string;
    name: string;
    key_prefix: string;
    created_at: Date;
    expires_at: Date | null;
  };
}

export interface ApiKeyContext {
  workspaceId: string;
  userId: string;
  apiKeyId: string;
}

interface ValidatedApiKeyRecord {
  auth: ApiKeyContext;
  expiresAt: Date | null;
}

interface CachedApiKeyEntry {
  auth: ApiKeyContext;
  expiresAt: string | null;
}

function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hashKey(key: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.algorithm,
    },
    keyMaterial,
    PBKDF2_CONFIG.hashLength * 8
  );
  return `${HASH_PREFIX}${PBKDF2_CONFIG.iterations}$${bufferToBase64(salt)}$${bufferToBase64(derivedBits)}`;
}

async function verifyKey(key: string, hash: string): Promise<boolean> {
  if (!hash.startsWith(HASH_PREFIX)) return false;
  const parts = hash.slice(HASH_PREFIX.length).split('$');
  if (parts.length !== 3) return false;

  const [iterationsStr, saltBase64, storedHashBase64] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  const salt = base64ToBuffer(saltBase64);
  const storedHash = base64ToBuffer(storedHashBase64);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: PBKDF2_CONFIG.algorithm,
    },
    keyMaterial,
    storedHash.length * 8
  );

  const derivedHash = new Uint8Array(derivedBits);
  if (derivedHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < derivedHash.length; i++) {
    result |= derivedHash[i] ^ storedHash[i];
  }
  return result === 0;
}

function generateRandomKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const maxUnbiased = 256 - (256 % chars.length); // 248 — largest multiple of 62 < 256
  let result = '';
  while (result.length < KEY_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
    for (let i = 0; i < bytes.length && result.length < KEY_LENGTH; i++) {
      if (bytes[i] < maxUnbiased) {
        result += chars[bytes[i] % chars.length];
      }
    }
  }
  return KEY_PREFIX + result;
}

export class ApiKeyService {
  constructor(private db: IDatabase) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const plainKey = generateRandomKey();
    const keyHash = await hashKey(plainKey);
    const id = nanoid();
    const keyPrefix = plainKey.slice(0, 8);

    const [apiKey] = await this.db
      .insert(legacyApiKeys)
      .values({
        id,
        workspace_id: input.workspace_id,
        user_id: input.user_id,
        name: input.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        expires_at: input.expires_at ?? null,
        created_at: new Date(),
      })
      .returning();

    return {
      plainKey,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        created_at: apiKey.created_at,
        expires_at: apiKey.expires_at,
      },
    };
  }

  private async validateRecord(key: string): Promise<ValidatedApiKeyRecord | null> {
    if (!key || !key.startsWith(KEY_PREFIX)) return null;

    const prefix = key.slice(0, 8);

    // Find non-revoked keys matching the prefix
    const candidates = await this.db
      .select({
        id: legacyApiKeys.id,
        workspace_id: legacyApiKeys.workspace_id,
        user_id: legacyApiKeys.user_id,
        key_hash: legacyApiKeys.key_hash,
        key_prefix: legacyApiKeys.key_prefix,
        expires_at: legacyApiKeys.expires_at,
      })
      .from(legacyApiKeys)
      .where(and(eq(legacyApiKeys.key_prefix, prefix), isNull(legacyApiKeys.deleted_at)));

    for (const candidate of candidates) {
      // Check expiration
      if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) {
        continue;
      }

      const valid = await verifyKey(key, candidate.key_hash);
      if (valid) {
        // Update last_used_at
        await this.db
          .update(legacyApiKeys)
          .set({ last_used_at: new Date() })
          .where(eq(legacyApiKeys.id, candidate.id));

        return {
          auth: {
            workspaceId: candidate.workspace_id,
            userId: candidate.user_id,
            apiKeyId: candidate.id,
          },
          expiresAt: candidate.expires_at ? new Date(candidate.expires_at) : null,
        };
      }
    }

    return null;
  }

  async getStatus(
    id: string
  ): Promise<{ deleted_at: Date | null; expires_at: Date | null } | null> {
    const rows = await this.db
      .select({
        deleted_at: legacyApiKeys.deleted_at,
        expires_at: legacyApiKeys.expires_at,
      })
      .from(legacyApiKeys)
      .where(eq(legacyApiKeys.id, id));

    return rows[0] ?? null;
  }

  async validate(key: string): Promise<ApiKeyContext | null> {
    const result = await this.validateRecord(key);
    return result?.auth ?? null;
  }

  async validateCached(
    key: string,
    ttlSeconds = DEFAULT_VALIDATE_CACHE_TTL_SECONDS
  ): Promise<ApiKeyContext | null> {
    if (!key || !key.startsWith(KEY_PREFIX)) return null;

    const keyHash = simpleHash(key);
    const keyPrefix = key.slice(0, 8);
    const cacheKey = CacheKeys.mcpToken(keyHash);
    const cache = getCacheManager();

    const cached = await cache.get<CachedApiKeyEntry>(cacheKey);
    if (cached) {
      const cachedExpiry = cached.expiresAt ? new Date(cached.expiresAt) : null;
      if (!cachedExpiry || cachedExpiry > new Date()) {
        return cached.auth;
      }
    }

    if (this.validate !== ApiKeyService.prototype.validate) {
      return this.validate(key);
    }

    const result = await this.validateRecord(key);
    if (!result) {
      return null;
    }

    const remainingTtlSeconds =
      result.expiresAt === null
        ? ttlSeconds
        : Math.max(0, Math.ceil((result.expiresAt.getTime() - Date.now()) / 1000));

    if (result.expiresAt !== null && remainingTtlSeconds <= 0) {
      return null;
    }

    await cache.set(
      cacheKey,
      {
        auth: result.auth,
        expiresAt: result.expiresAt?.toISOString() ?? null,
      },
      {
        ttl: result.expiresAt === null ? ttlSeconds : Math.min(ttlSeconds, remainingTtlSeconds),
        tags: [CacheTags.MCP_TOKENS, `apikey:${keyPrefix}`],
      }
    );

    return result.auth;
  }

  async revoke(id: string, workspaceId: string): Promise<boolean> {
    const [existing] = await this.db
      .select({
        id: legacyApiKeys.id,
        workspace_id: legacyApiKeys.workspace_id,
        key_prefix: legacyApiKeys.key_prefix,
      })
      .from(legacyApiKeys)
      .where(
        and(
          eq(legacyApiKeys.id, id),
          eq(legacyApiKeys.workspace_id, workspaceId),
          isNull(legacyApiKeys.deleted_at)
        )
      );

    if (!existing) return false;

    await this.db
      .update(legacyApiKeys)
      .set({ deleted_at: new Date() })
      .where(eq(legacyApiKeys.id, id));

    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.MCP_TOKENS, `apikey:${existing.key_prefix}`]);

    return true;
  }

  async list(
    workspaceId: string,
    userId?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      key_prefix: string;
      last_used_at: Date | null;
      created_at: Date;
      expires_at: Date | null;
    }>
  > {
    const whereClause = userId
      ? and(
          eq(legacyApiKeys.workspace_id, workspaceId),
          isNull(legacyApiKeys.deleted_at),
          eq(legacyApiKeys.user_id, userId)
        )
      : and(eq(legacyApiKeys.workspace_id, workspaceId), isNull(legacyApiKeys.deleted_at));

    const rows = await this.db
      .select({
        id: legacyApiKeys.id,
        name: legacyApiKeys.name,
        key_prefix: legacyApiKeys.key_prefix,
        last_used_at: legacyApiKeys.last_used_at,
        created_at: legacyApiKeys.created_at,
        expires_at: legacyApiKeys.expires_at,
      })
      .from(legacyApiKeys)
      .where(whereClause);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
      last_used_at: row.last_used_at,
      created_at: row.created_at,
      expires_at: row.expires_at,
    }));
  }
}
