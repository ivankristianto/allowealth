import { type IDatabase, getActiveSchema } from '@/db';
import { nanoid } from 'nanoid';
import { eq, and, isNull } from 'drizzle-orm';

const KEY_PREFIX = 'aw_';
const KEY_LENGTH = 32;
const PBKDF2_CONFIG = {
  iterations: 100_000,
  saltLength: 16,
  hashLength: 32,
  algorithm: 'SHA-256',
} as const;
const HASH_PREFIX = '$pbkdf2-sha256$';

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
  private get schema() {
    return getActiveSchema();
  }

  constructor(private db: IDatabase) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const plainKey = generateRandomKey();
    const keyHash = await hashKey(plainKey);
    const id = nanoid();
    const keyPrefix = plainKey.slice(0, 8);

    const [apiKey] = await this.db
      .insert(this.schema.apiKeys)
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

  async validate(key: string): Promise<ApiKeyContext | null> {
    if (!key || !key.startsWith(KEY_PREFIX)) return null;

    const prefix = key.slice(0, 8);

    // Find non-revoked keys matching the prefix
    const candidates = await this.db.query.apiKeys.findMany({
      where: and(
        eq(this.schema.apiKeys.key_prefix, prefix),
        isNull(this.schema.apiKeys.deleted_at)
      ),
    });

    for (const candidate of candidates) {
      // Check expiration
      if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) {
        continue;
      }

      const valid = await verifyKey(key, candidate.key_hash);
      if (valid) {
        // Update last_used_at
        await this.db
          .update(this.schema.apiKeys)
          .set({ last_used_at: new Date() })
          .where(eq(this.schema.apiKeys.id, candidate.id));

        return {
          workspaceId: candidate.workspace_id,
          userId: candidate.user_id,
          apiKeyId: candidate.id,
        };
      }
    }

    return null;
  }

  async revoke(id: string, workspaceId: string): Promise<boolean> {
    const existing = await this.db.query.apiKeys.findFirst({
      where: and(
        eq(this.schema.apiKeys.id, id),
        eq(this.schema.apiKeys.workspace_id, workspaceId),
        isNull(this.schema.apiKeys.deleted_at)
      ),
    });
    if (!existing) return false;

    await this.db
      .update(this.schema.apiKeys)
      .set({ deleted_at: new Date() })
      .where(eq(this.schema.apiKeys.id, id));
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
    const conditions = [
      eq(this.schema.apiKeys.workspace_id, workspaceId),
      isNull(this.schema.apiKeys.deleted_at),
    ];
    if (userId) {
      conditions.push(eq(this.schema.apiKeys.user_id, userId));
    }
    const rows = await this.db.query.apiKeys.findMany({
      where: and(...conditions),
    });
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
