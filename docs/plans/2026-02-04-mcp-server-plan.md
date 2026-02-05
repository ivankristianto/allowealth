# MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that lets AI assistants log expenses/income and query budget/asset stats via stdio transport, authenticated with API keys.

**Architecture:** Standalone `mcp-server/` package at repo root that imports existing services (`TransactionService`, `BudgetService`, `AssetService`, `DashboardService`) and the shared DB layer directly. API key authentication with PBKDF2 hashing. Fuzzy name matching for categories and assets.

**Tech Stack:** `@modelcontextprotocol/sdk` (MCP protocol), `bun:test` (testing), existing Drizzle ORM + SQLite/PostgreSQL, existing PBKDF2 password hashing utilities.

**Design doc:** `docs/plans/2026-02-04-mcp-server-design.md`

---

## Task 1: Add `api_keys` Schema (SQLite + PostgreSQL)

**Files:**

- Create: `src/db/schema/sqlite/api-keys.ts`
- Create: `src/db/schema/postgresql/api-keys.ts`
- Modify: `src/db/schema/sqlite/index.ts`
- Modify: `src/db/schema/postgresql/index.ts`
- Modify: `src/db/schema/sqlite/relations.ts`
- Modify: `src/db/schema/postgresql/relations.ts`

**Step 1: Create SQLite schema file**

Create `src/db/schema/sqlite/api-keys.ts`:

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key_hash: text('key_hash').notNull(),
    key_prefix: text('key_prefix').notNull(),
    last_used_at: integer('last_used_at', { mode: 'timestamp' }),
    expires_at: integer('expires_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('api_keys_workspace_id_idx').on(table.workspace_id),
    index('api_keys_key_prefix_idx').on(table.key_prefix),
  ]
);
```

**Step 2: Create PostgreSQL schema file**

Create `src/db/schema/postgresql/api-keys.ts`:

```typescript
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key_hash: text('key_hash').notNull(),
    key_prefix: text('key_prefix').notNull(),
    last_used_at: timestamp('last_used_at'),
    expires_at: timestamp('expires_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => [
    index('api_keys_workspace_id_idx').on(table.workspace_id),
    index('api_keys_key_prefix_idx').on(table.key_prefix),
  ]
);
```

**Step 3: Export from both index files**

Add to `src/db/schema/sqlite/index.ts` (before the relations export):

```typescript
export * from './api-keys';
```

Add to `src/db/schema/postgresql/index.ts` (before the relations export):

```typescript
export * from './api-keys';
```

**Step 4: Add relations in both relations files**

Add to both `src/db/schema/sqlite/relations.ts` and `src/db/schema/postgresql/relations.ts`:

```typescript
import { apiKeys } from './api-keys';

// API keys relations
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [apiKeys.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [apiKeys.user_id],
    references: [users.id],
  }),
}));
```

Also add `apiKeys: many(apiKeys)` to the existing `workspacesRelations` and `usersRelations`.

**Step 5: Push schema to dev DB**

Run: `bun run db:push`
Expected: Schema updated with new `api_keys` table.

**Step 6: Commit**

```bash
git add src/db/schema/sqlite/api-keys.ts src/db/schema/postgresql/api-keys.ts \
  src/db/schema/sqlite/index.ts src/db/schema/postgresql/index.ts \
  src/db/schema/sqlite/relations.ts src/db/schema/postgresql/relations.ts
git commit -m "feat(mcp): add api_keys schema for SQLite and PostgreSQL"
```

---

## Task 2: API Key Service

**Files:**

- Create: `src/services/api-key.service.ts`
- Test: `src/services/api-key.service.test.ts`
- Reference: `src/lib/auth/password.ts` (reuse PBKDF2 hashing approach)
- Reference: `src/services/test-helpers/mocks.ts` (mock DB pattern)

**Step 1: Write the failing test**

Create `src/services/api-key.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ApiKeyService } from './api-key.service';
import { createMockDatabase, resetMockDatabase } from './test-helpers/mocks';

describe('ApiKeyService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let service: ApiKeyService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ApiKeyService(mockDb);
    resetMockDatabase(mockDb);
  });

  describe('generate', () => {
    it('should return a key starting with aw_ and store the hash', async () => {
      const mockApiKey = {
        id: 'test-id',
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test Key',
        key_hash: 'hashed',
        key_prefix: 'aw_test1',
        last_used_at: null,
        expires_at: null,
        created_at: new Date(),
        deleted_at: null,
      };

      (mockDb.insert as any).mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockApiKey])),
        })),
      });

      const result = await service.generate({
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test Key',
      });

      expect(result.plainKey).toStartWith('aw_');
      expect(result.plainKey.length).toBe(35); // 'aw_' + 32 chars
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.key_prefix).toStartWith('aw_');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return user context for a valid key', async () => {
      const mockApiKey = {
        id: 'key-1',
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test',
        key_hash: '', // Will be set dynamically
        key_prefix: 'aw_abc12',
        last_used_at: null,
        expires_at: null,
        created_at: new Date(),
        deleted_at: null,
      };

      // First generate a key to get a valid hash
      (mockDb.insert as any).mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockApiKey])),
        })),
      });

      const generated = await service.generate({
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test',
      });

      // Now mock findMany to return the key with correct hash
      (mockDb.query.apiKeys as any) = {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() =>
          Promise.resolve([
            {
              ...mockApiKey,
              key_hash: generated.apiKey.key_hash,
            },
          ])
        ),
      };

      // Mock update for last_used_at
      (mockDb.update as any).mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await service.validate(generated.plainKey);

      expect(result).not.toBeNull();
      expect(result!.workspaceId).toBe('ws-1');
      expect(result!.userId).toBe('user-1');
    });

    it('should return null for an invalid key', async () => {
      (mockDb.query.apiKeys as any) = {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      };

      const result = await service.validate('aw_invalidkey12345678901234567890');
      expect(result).toBeNull();
    });

    it('should return null for a key without aw_ prefix', async () => {
      const result = await service.validate('invalidprefix');
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/api-key.service.test.ts`
Expected: FAIL — module `./api-key.service` not found.

**Step 3: Write the implementation**

Create `src/services/api-key.service.ts`:

```typescript
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
    key_hash: string;
    created_at: Date;
    expires_at: Date | null;
  };
}

interface ApiKeyContext {
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
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  let result = '';
  for (let i = 0; i < KEY_LENGTH; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return KEY_PREFIX + result;
}

export class ApiKeyService {
  private schema = getActiveSchema();

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
        key_hash: apiKey.key_hash,
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
    await this.db
      .update(this.schema.apiKeys)
      .set({ deleted_at: new Date() })
      .where(
        and(eq(this.schema.apiKeys.id, id), eq(this.schema.apiKeys.workspace_id, workspaceId))
      );
    return true;
  }

  async list(workspaceId: string): Promise<any[]> {
    return this.db.query.apiKeys.findMany({
      where: and(
        eq(this.schema.apiKeys.workspace_id, workspaceId),
        isNull(this.schema.apiKeys.deleted_at)
      ),
    });
  }
}
```

**Step 4: Add `apiKeys` to mock database**

Modify `src/services/test-helpers/mocks.ts` — add to the `query` object:

```typescript
apiKeys: {
  findFirst: mock(() => Promise.resolve(undefined)),
  findMany: mock(() => Promise.resolve([])),
},
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/services/api-key.service.test.ts`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add src/services/api-key.service.ts src/services/api-key.service.test.ts \
  src/services/test-helpers/mocks.ts
git commit -m "feat(mcp): add ApiKeyService with generate, validate, revoke"
```

---

## Task 3: CLI Command for API Key Generation

**Files:**

- Create: `src/cli/create-api-key.ts`
- Modify: `package.json` (add script)
- Reference: `src/cli/create-workspace.ts` (CLI pattern)

**Step 1: Create the CLI script**

Create `src/cli/create-api-key.ts`:

```typescript
/* eslint-disable no-console -- Console output is intentional for CLI */

import { db } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';

interface Options {
  workspaceId?: string;
  userId?: string;
  name?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--workspace-id':
      case '-w':
        options.workspaceId = args[++i];
        break;
      case '--user-id':
      case '-u':
        options.userId = args[++i];
        break;
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Usage: bun run cli:create-api-key -- [options]

Options:
  --workspace-id, -w <id>   Workspace ID (required)
  --user-id, -u <id>        User ID (required)
  --name, -n <name>         Key name, e.g. "Claude Desktop" (required)
  --help, -h                Show this help message

Examples:
  bun run cli:create-api-key -- --workspace-id ws_abc --user-id user_123 --name "Claude Desktop"
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.workspaceId || !options.userId || !options.name) {
    console.error('Error: --workspace-id, --user-id, and --name are required');
    printHelp();
    process.exit(1);
  }

  const service = new ApiKeyService(db);

  try {
    const result = await service.generate({
      workspace_id: options.workspaceId,
      user_id: options.userId,
      name: options.name,
    });

    console.log('');
    console.log('API Key Created');
    console.log('==================');
    console.log('');
    console.log(`Name:    ${options.name}`);
    console.log(`Prefix:  ${result.apiKey.key_prefix}...`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Your API key (shown ONCE, save it now):');
    console.log('');
    console.log(`  ${result.plainKey}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Use it in your MCP client config:');
    console.log('');
    console.log('  {');
    console.log('    "mcpServers": {');
    console.log('      "allowealth": {');
    console.log('        "command": "bun",');
    console.log('        "args": ["run", "/path/to/allowealth/mcp-server/src/index.ts"],');
    console.log('        "env": {');
    console.log(`          "ALLOWEALTH_API_KEY": "${result.plainKey}"`);
    console.log('        }');
    console.log('      }');
    console.log('    }');
    console.log('  }');
    console.log('');
  } catch (error) {
    console.error('Failed to create API key:', error);
    process.exit(1);
  }
}

main();
```

**Step 2: Add script to package.json**

Add these entries to the `scripts` section:

```json
"cli:create-api-key": "bun run src/cli/create-api-key.ts",
"cli:create-api-key:prod": "bun --env-file=.env.production run src/cli/create-api-key.ts"
```

**Step 3: Manual test**

Run: `bun run cli:create-api-key -- --help`
Expected: Help message displayed.

Run: `bun run cli:create-api-key -- --workspace-id <your-workspace-id> --user-id <your-user-id> --name "Test Key"`
Expected: API key printed. Use `bun run cli:list-workspaces` to get a workspace ID first.

**Step 4: Commit**

```bash
git add src/cli/create-api-key.ts package.json
git commit -m "feat(mcp): add CLI command for API key generation"
```

---

## Task 4: Fuzzy Matching Utility

**Files:**

- Create: `mcp-server/src/utils/fuzzy-match.ts`
- Test: `mcp-server/src/utils/fuzzy-match.test.ts`

**Step 1: Create the mcp-server directory structure**

```bash
mkdir -p mcp-server/src/utils mcp-server/src/tools
```

**Step 2: Write the failing test**

Create `mcp-server/src/utils/fuzzy-match.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  const options = ['Food & Drinks', 'Transport', 'Shopping', 'Entertainment', 'Salary'];

  it('should match exactly (case-insensitive)', () => {
    expect(fuzzyMatch('food & drinks', options)).toBe('Food & Drinks');
    expect(fuzzyMatch('TRANSPORT', options)).toBe('Transport');
  });

  it('should match by substring', () => {
    expect(fuzzyMatch('food', options)).toBe('Food & Drinks');
    expect(fuzzyMatch('enter', options)).toBe('Entertainment');
  });

  it('should match with typos via Levenshtein distance', () => {
    expect(fuzzyMatch('Transprt', options)).toBe('Transport');
    expect(fuzzyMatch('Shoping', options)).toBe('Shopping');
  });

  it('should return null for no match', () => {
    expect(fuzzyMatch('xyz', options)).toBeNull();
    expect(fuzzyMatch('', options)).toBeNull();
  });

  it('should return null for empty options', () => {
    expect(fuzzyMatch('food', [])).toBeNull();
  });

  it('should prefer exact match over substring', () => {
    const opts = ['Cash', 'Cash IDR', 'Petty Cash'];
    expect(fuzzyMatch('Cash', opts)).toBe('Cash');
  });

  it('should prefer substring over Levenshtein', () => {
    const opts = ['BCA Digital', 'BCA'];
    expect(fuzzyMatch('BCA', opts)).toBe('BCA');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `bun test mcp-server/src/utils/fuzzy-match.test.ts`
Expected: FAIL — module not found.

**Step 4: Write the implementation**

Create `mcp-server/src/utils/fuzzy-match.ts`:

```typescript
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Fuzzy match a query against a list of options.
 *
 * Priority: exact match > substring match > Levenshtein distance.
 * Returns the best match or null if no good match found.
 */
export function fuzzyMatch(query: string, options: string[], maxDistance = 3): string | null {
  if (!query || options.length === 0) return null;

  const queryLower = query.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  const exactMatch = options.find((opt) => opt.toLowerCase() === queryLower);
  if (exactMatch) return exactMatch;

  // 2. Exact substring — prefer shorter options (more specific)
  const substringMatches = options.filter((opt) => opt.toLowerCase().includes(queryLower));
  if (substringMatches.length > 0) {
    return substringMatches.sort((a, b) => a.length - b.length)[0];
  }

  // 3. Levenshtein distance
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(queryLower, option.toLowerCase());
    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test mcp-server/src/utils/fuzzy-match.test.ts`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add mcp-server/src/utils/fuzzy-match.ts mcp-server/src/utils/fuzzy-match.test.ts
git commit -m "feat(mcp): add fuzzy string matching utility"
```

---

## Task 5: MCP Server Scaffolding (package.json, tsconfig, entry point, auth)

**Files:**

- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/src/auth.ts`
- Create: `mcp-server/src/context.ts`
- Create: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/package.json`**

```json
{
  "name": "allowealth-mcp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1"
  }
}
```

**Step 2: Install dependencies**

Run: `cd mcp-server && bun install && cd ..`

**Step 3: Create `mcp-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["../src/*"]
    },
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create `mcp-server/src/auth.ts`**

This module authenticates the API key on server startup and caches the result.

```typescript
import { db } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';

export interface AuthContext {
  workspaceId: string;
  userId: string;
  apiKeyId: string;
}

let cachedContext: AuthContext | null = null;

/**
 * Authenticate the API key from environment and cache the result.
 * Called once on server startup.
 */
export async function authenticate(): Promise<AuthContext> {
  if (cachedContext) return cachedContext;

  const apiKey = process.env.ALLOWEALTH_API_KEY;
  if (!apiKey) {
    throw new Error('ALLOWEALTH_API_KEY environment variable is required');
  }

  const service = new ApiKeyService(db);
  const result = await service.validate(apiKey);

  if (!result) {
    throw new Error('Invalid API key. Check ALLOWEALTH_API_KEY.');
  }

  cachedContext = result;
  return cachedContext;
}

/**
 * Get the cached auth context. Must call authenticate() first.
 */
export function getAuthContext(): AuthContext {
  if (!cachedContext) {
    throw new Error('Not authenticated. Call authenticate() first.');
  }
  return cachedContext;
}
```

**Step 5: Create `mcp-server/src/context.ts`**

Provides initialized service instances for tools to use.

```typescript
import { db } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AssetService } from '@/services/asset.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';

export const transactionService = new TransactionService(db);
export const budgetService = new BudgetService(db);
export const assetService = new AssetService(db);
export const dashboardService = new DashboardService(db);
export const categoryService = new CategoryService(db);
```

**Step 6: Create `mcp-server/src/index.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { authenticate } from './auth.js';
import { registerTools, handleToolCall } from './tools/index.js';

const server = new Server(
  { name: 'allowealth', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: registerTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(request.params.name, request.params.arguments ?? {});
});

async function main(): Promise<void> {
  // Authenticate API key on startup
  const context = await authenticate();
  console.error(`Allowealth MCP server started (workspace: ${context.workspaceId})`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
```

**Step 7: Create tools index stub**

Create `mcp-server/src/tools/index.ts`:

```typescript
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export function registerTools(): Tool[] {
  return [];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return {
    isError: true,
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
  };
}
```

**Step 8: Commit**

```bash
git add mcp-server/
git commit -m "feat(mcp): scaffold MCP server with auth and stdio transport"
```

---

## Task 6: Implement Read Tools (list_categories, list_assets, list_transactions)

**Files:**

- Create: `mcp-server/src/tools/transactions.ts`
- Create: `mcp-server/src/tools/assets.ts`
- Modify: `mcp-server/src/tools/index.ts`
- Test: `mcp-server/src/tools/transactions.test.ts`
- Test: `mcp-server/src/tools/assets.test.ts`

**Step 1: Write list_categories and list_assets test**

Create `mcp-server/src/tools/assets.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { listCategoriesSchema, listAssetsSchema } from './assets';

describe('tool schemas', () => {
  it('should validate list_categories input', () => {
    expect(() => listCategoriesSchema.parse({})).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'expense' })).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'invalid' })).toThrow();
  });

  it('should validate list_assets input', () => {
    expect(() => listAssetsSchema.parse({})).not.toThrow();
  });
});
```

**Step 2: Implement the tools**

Create `mcp-server/src/tools/assets.ts`:

```typescript
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { categoryService, assetService } from '../context.js';

export const listCategoriesSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
});

export const listAssetsSchema = z.object({});

export const tools: Tool[] = [
  {
    name: 'list_categories',
    description:
      'List all active budget categories. Call this to see valid category names before adding transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['expense', 'income'],
          description: 'Filter by category type',
        },
      },
    },
  },
  {
    name: 'list_assets',
    description:
      'List all active assets (bank accounts, e-wallets, cash, etc.) with current balances.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleListCategories(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = listCategoriesSchema.parse(args);

  const categories = await categoryService.findAll(workspaceId, {
    type: input.type,
    activeOnly: true,
  });

  const result = categories.map((c: any) => ({
    name: c.name,
    type: c.type,
    icon: c.icon,
  }));

  return {
    content: [{ type: 'text', text: JSON.stringify({ categories: result }, null, 2) }],
  };
}

export async function handleListAssets(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  listAssetsSchema.parse(args);

  const assets = await assetService.findAll(workspaceId);

  const result = assets
    .filter((a: any) => !a.deleted_at)
    .map((a: any) => ({
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: a.balance,
    }));

  return {
    content: [{ type: 'text', text: JSON.stringify({ assets: result }, null, 2) }],
  };
}
```

**Step 3: Implement list_transactions**

Create `mcp-server/src/tools/transactions.ts`:

```typescript
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { transactionService } from '../context.js';
import { fuzzyMatch } from '../utils/fuzzy-match.js';
import { categoryService, assetService } from '../context.js';

export const listTransactionsSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const addTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['IDR', 'USD']),
  category_name: z.string(),
  asset_name: z.string(),
  date: z.string().optional(),
  description: z.string().optional(),
});

export const listTransactionsTool: Tool = {
  name: 'list_transactions',
  description: 'List recent transactions with optional filters. Returns up to 50 transactions.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['expense', 'income', 'transfer'],
        description: 'Filter by transaction type',
      },
      start_date: {
        type: 'string',
        description: 'Start date filter (YYYY-MM-DD)',
      },
      end_date: {
        type: 'string',
        description: 'End date filter (YYYY-MM-DD)',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 20, max: 50)',
      },
    },
  },
};

export const addExpenseTool: Tool = {
  name: 'add_expense',
  description:
    'Create an expense transaction. Use list_categories and list_assets first if you are unsure of the exact names. Category and asset names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      asset_name: { type: 'string', description: 'Asset/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'asset_name'],
  },
};

export const addIncomeTool: Tool = {
  name: 'add_income',
  description:
    'Create an income transaction. Use list_categories and list_assets first if you are unsure of the exact names. Category and asset names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      asset_name: { type: 'string', description: 'Asset/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'asset_name'],
  },
};

export async function handleListTransactions(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = listTransactionsSchema.parse(args);

  const filters: any = {
    workspace_id: workspaceId,
    type: input.type,
    limit: input.limit,
  };

  if (input.start_date) filters.start_date = new Date(input.start_date);
  if (input.end_date) filters.end_date = new Date(input.end_date);

  const transactions = await transactionService.findAll(filters);
  const count = await transactionService.count(filters);

  const result = transactions.map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    category: t.category?.name ?? null,
    asset: t.asset?.name ?? null,
    date:
      t.transaction_date instanceof Date
        ? t.transaction_date.toISOString().split('T')[0]
        : String(t.transaction_date).split('T')[0],
    description: t.description,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ transactions: result, total_count: count }, null, 2),
      },
    ],
  };
}

async function resolveCategory(name: string, type: 'expense' | 'income', workspaceId: string) {
  const categories = await categoryService.findAll(workspaceId, {
    type,
    activeOnly: true,
  });
  const names = categories.map((c: any) => c.name);
  const match = fuzzyMatch(name, names);

  if (!match) {
    return { error: `No matching ${type} category for "${name}"`, available: names };
  }

  const category = categories.find((c: any) => c.name === match);
  return { category };
}

async function resolveAsset(name: string, workspaceId: string) {
  const assets = await assetService.findAll(workspaceId);
  const activeAssets = assets.filter((a: any) => !a.deleted_at);
  const names = activeAssets.map((a: any) => a.name);
  const match = fuzzyMatch(name, names);

  if (!match) {
    return { error: `No matching asset for "${name}"`, available: names };
  }

  const asset = activeAssets.find((a: any) => a.name === match);
  return { asset };
}

export async function handleAddTransaction(
  args: Record<string, unknown>,
  type: 'expense' | 'income'
) {
  const { workspaceId, userId } = getAuthContext();
  const input = addTransactionSchema.parse(args);

  // Resolve category
  const categoryResult = await resolveCategory(input.category_name, type, workspaceId);
  if ('error' in categoryResult) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: categoryResult.error,
            available_categories: categoryResult.available,
          }),
        },
      ],
    };
  }

  // Resolve asset
  const assetResult = await resolveAsset(input.asset_name, workspaceId);
  if ('error' in assetResult) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: assetResult.error,
            available_assets: assetResult.available,
          }),
        },
      ],
    };
  }

  const transactionDate = input.date ? new Date(input.date) : new Date();

  const transaction = await transactionService.create({
    workspace_id: workspaceId,
    created_by_user_id: userId,
    type,
    amount: String(input.amount),
    currency: input.currency,
    category_id: categoryResult.category.id,
    asset_id: assetResult.asset.id,
    transaction_date: transactionDate,
    description: input.description ?? null,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            category: categoryResult.category.name,
            asset: assetResult.asset.name,
            date: transactionDate.toISOString().split('T')[0],
            description: transaction.description,
          },
          null,
          2
        ),
      },
    ],
  };
}
```

**Step 4: Run tests**

Run: `bun test mcp-server/src/tools/assets.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add mcp-server/src/tools/
git commit -m "feat(mcp): implement transaction and asset tools (list + add)"
```

---

## Task 7: Implement Budget and Dashboard Tools

**Files:**

- Create: `mcp-server/src/tools/budget.ts`
- Create: `mcp-server/src/tools/dashboard.ts`
- Modify: `mcp-server/src/tools/index.ts` (wire everything together)

**Step 1: Implement budget tool**

Create `mcp-server/src/tools/budget.ts`:

```typescript
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { budgetService } from '../context.js';

export const budgetSummarySchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2100).optional(),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
});

export const tool: Tool = {
  name: 'get_budget_summary',
  description:
    'Get budget overview for a month. Shows total budget, total spent, remaining, and per-category breakdown with status (ok/warning/exceeded). Defaults to current month.',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month number (1-12). Defaults to current month.' },
      year: { type: 'number', description: 'Year. Defaults to current year.' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency. Defaults to IDR.' },
    },
  },
};

export async function handleGetBudgetSummary(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = budgetSummarySchema.parse(args);

  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const overview = await budgetService.getMonthlyOverview(workspaceId, year, month, input.currency);

  const result = {
    month,
    year,
    currency: input.currency,
    total_budget: overview.total_budget,
    total_spent: overview.total_spent,
    total_remaining: overview.total_balance,
    categories: overview.categories.map((c: any) => ({
      name: c.category_name,
      budget: c.budget_amount,
      spent: c.spent_amount,
      remaining: c.balance,
      status: c.status,
      percent_used: c.percentage_used,
    })),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

**Step 2: Implement dashboard tool**

Create `mcp-server/src/tools/dashboard.ts`:

```typescript
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { dashboardService, assetService } from '../context.js';

export const dashboardSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2100).optional(),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
});

export const assetSummarySchema = z.object({
  currency: z.enum(['IDR', 'USD']).optional(),
});

export const dashboardTool: Tool = {
  name: 'get_dashboard',
  description:
    'Get a combined financial snapshot: total assets, monthly income/expenses, budget health, top spending categories, and recent transactions.',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
      year: { type: 'number', description: 'Year. Defaults to current year.' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency. Defaults to IDR.' },
    },
  },
};

export const assetSummaryTool: Tool = {
  name: 'get_asset_summary',
  description: 'Get asset totals grouped by currency and by asset type.',
  inputSchema: {
    type: 'object',
    properties: {
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Filter by currency' },
    },
  },
};

export async function handleGetDashboard(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = dashboardSchema.parse(args);

  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const data = await dashboardService.getDashboardData(workspaceId, month, year, input.currency);

  const result = {
    month,
    year,
    currency: input.currency,
    total_assets: data.totalAssets?.total ?? '0',
    monthly_income: data.monthlyIncome?.total ?? '0',
    monthly_expenses: data.monthlySpent?.total ?? '0',
    budget_health: {
      total_budget: data.budgetHealth?.total_budget ?? '0',
      total_spent: data.budgetHealth?.total_spent ?? '0',
      percent_used: data.budgetHealth?.percentage_used ?? 0,
      categories_warning: data.budgetHealth?.categories_warning ?? 0,
      categories_exceeded: data.budgetHealth?.categories_exceeded ?? 0,
    },
    top_expenses: (data.topCategoryExpenses ?? []).map((c: any) => ({
      category: c.category_name,
      amount: c.total,
    })),
    recent_transactions: (data.recentTransactions ?? []).slice(0, 5).map((t: any) => ({
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      category: t.category?.name ?? null,
      date:
        t.transaction_date instanceof Date
          ? t.transaction_date.toISOString().split('T')[0]
          : String(t.transaction_date).split('T')[0],
    })),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleGetAssetSummary(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = assetSummarySchema.parse(args);

  const [byCurrency, byType] = await Promise.all([
    assetService.getTotalByCurrency(workspaceId),
    assetService.getTotalByType(workspaceId),
  ]);

  const result = {
    by_currency: byCurrency
      .filter((c: any) => !input.currency || c.currency === input.currency)
      .map((c: any) => ({
        currency: c.currency,
        total: c.total,
        count: c.count,
      })),
    by_type: byType
      .filter((t: any) => !input.currency || t.currency === input.currency)
      .map((t: any) => ({
        type: t.type,
        currency: t.currency,
        total: t.total,
        count: t.count,
      })),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

**Step 3: Wire all tools in `mcp-server/src/tools/index.ts`**

Replace the stub with the full implementation:

```typescript
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { tools as assetTools, handleListCategories, handleListAssets } from './assets.js';
import {
  listTransactionsTool,
  addExpenseTool,
  addIncomeTool,
  handleListTransactions,
  handleAddTransaction,
} from './transactions.js';
import { tool as budgetTool, handleGetBudgetSummary } from './budget.js';
import {
  dashboardTool,
  assetSummaryTool,
  handleGetDashboard,
  handleGetAssetSummary,
} from './dashboard.js';

export function registerTools(): Tool[] {
  return [
    ...assetTools,
    listTransactionsTool,
    addExpenseTool,
    addIncomeTool,
    budgetTool,
    dashboardTool,
    assetSummaryTool,
  ];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'list_categories':
        return await handleListCategories(args);
      case 'list_assets':
        return await handleListAssets(args);
      case 'list_transactions':
        return await handleListTransactions(args);
      case 'add_expense':
        return await handleAddTransaction(args, 'expense');
      case 'add_income':
        return await handleAddTransaction(args, 'income');
      case 'get_budget_summary':
        return await handleGetBudgetSummary(args);
      case 'get_dashboard':
        return await handleGetDashboard(args);
      case 'get_asset_summary':
        return await handleGetAssetSummary(args);
      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${message}` }],
    };
  }
}
```

**Step 4: Commit**

```bash
git add mcp-server/src/tools/
git commit -m "feat(mcp): implement all 8 MCP tools (budget, dashboard, assets, transactions)"
```

---

## Task 8: Integration Test & Manual Verification

**Files:**

- Modify: `package.json` (add mcp-server scripts)

**Step 1: Add scripts to root `package.json`**

```json
"mcp:start": "bun run mcp-server/src/index.ts",
"mcp:start:prod": "bun --env-file=.env.production run mcp-server/src/index.ts"
```

**Step 2: Generate an API key for testing**

Run: `bun run cli:list-workspaces` to find your workspace and user IDs.

Run: `bun run cli:create-api-key -- --workspace-id <ws-id> --user-id <user-id> --name "Test"`

Save the output key.

**Step 3: Test the MCP server starts**

Run: `ALLOWEALTH_API_KEY=aw_<your-key> bun run mcp:start`

Expected: `Allowealth MCP server started (workspace: <ws-id>)` printed to stderr, then server waits for stdio input.

Press Ctrl+C to stop.

**Step 4: Test with Claude Desktop or Claude Code**

Add to your MCP client config (e.g., `~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "allowealth": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/allowealth/mcp-server/src/index.ts"],
      "env": {
        "ALLOWEALTH_API_KEY": "aw_<your-key>"
      }
    }
  }
}
```

Test these tool calls:

1. `list_categories` — should return your categories
2. `list_assets` — should return your assets
3. `get_budget_summary` — should return current month budget
4. `get_dashboard` — should return combined snapshot
5. `add_expense` with a test amount — should create a transaction

**Step 5: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass.

**Step 6: Final commit**

```bash
git add package.json
git commit -m "feat(mcp): add start scripts and finalize MCP server integration"
```

---

## Summary

| Task | Description                                         | Estimated Size |
| ---- | --------------------------------------------------- | -------------- |
| 1    | `api_keys` schema (SQLite + PostgreSQL)             | Small          |
| 2    | `ApiKeyService` (generate, validate, revoke)        | Medium         |
| 3    | CLI command `create-api-key`                        | Small          |
| 4    | Fuzzy matching utility                              | Small          |
| 5    | MCP server scaffolding (package, auth, entry point) | Medium         |
| 6    | Transaction + asset tools (list + add)              | Large          |
| 7    | Budget + dashboard tools                            | Medium         |
| 8    | Integration test & manual verification              | Small          |

**Total: 8 tasks, ~50 steps.**

Each task is independently committable and testable. The order ensures no forward dependencies — each task builds on the previous one.

---

---

# Phase 2: HTTP Transport Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add HTTP transport to the MCP server so it can run on Cloudflare Workers via the main Astro app at `/api/mcp`, while keeping the existing stdio transport working.

**Architecture:** Refactor tool handlers to accept a `ToolContext` parameter (dependency injection) instead of importing module-level singletons. Add a single Astro API route that handles MCP JSON-RPC messages over HTTP POST, authenticating via `Authorization: Bearer` header with cached PBKDF2 validation using the existing CacheManager.

**Tech Stack:** Existing Astro API routes, existing CacheManager (Upstash/Memory), existing service layer, MCP JSON-RPC 2.0 protocol.

**Design doc:** `docs/plans/2026-02-04-mcp-server-design.md` (HTTP Transport Design section)

---

## Task 9: Define ToolContext Interface

**Files:**

- Create: `mcp-server/src/tools/types.ts`

**Step 1: Create the ToolContext type file**

Create `mcp-server/src/tools/types.ts`:

```typescript
import type { TransactionService } from '@/services/transaction.service';
import type { BudgetService } from '@/services/budget.service';
import type { AssetService } from '@/services/asset.service';
import type { DashboardService } from '@/services/dashboard.service';
import type { CategoryService } from '@/services/category.service';

export interface ToolContext {
  auth: {
    workspaceId: string;
    userId: string;
    apiKeyId: string;
  };
  services: {
    transaction: TransactionService;
    budget: BudgetService;
    asset: AssetService;
    dashboard: DashboardService;
    category: CategoryService;
  };
}
```

**Step 2: Commit**

```bash
git add mcp-server/src/tools/types.ts
git commit -m "feat(mcp): add ToolContext interface for dependency injection"
```

---

## Task 10: Refactor Tool Handlers to Accept ToolContext

**Files:**

- Modify: `mcp-server/src/tools/assets.ts`
- Modify: `mcp-server/src/tools/budget.ts`
- Modify: `mcp-server/src/tools/dashboard.ts`
- Modify: `mcp-server/src/tools/transactions.ts`
- Modify: `mcp-server/src/tools/index.ts`

This is a mechanical refactor: add `ctx: ToolContext` parameter to every handler, replace `await getAuthContext()` with `ctx.auth`, replace singleton service imports with `ctx.services.*`.

**Step 1: Refactor `assets.ts`**

In `mcp-server/src/tools/assets.ts`:

1. Remove imports of `getAuthContext` and `categoryService, assetService` from context
2. Add import of `ToolContext` from `./types.js`
3. Change both handler signatures:

```typescript
import type { ToolContext } from './types.js';

// Remove these imports:
// import { getAuthContext } from '../auth.js';
// import { categoryService, assetService } from '../context.js';

export async function handleListCategories(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = listCategoriesSchema.parse(args);

  const categories = await ctx.services.category.findAll(workspaceId, {
    type: input.type,
    is_active: true,
  });
  // ... rest unchanged
}

export async function handleListAssets(_args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  listAssetsSchema.parse(_args);

  const assets = await ctx.services.asset.findAll(workspaceId);
  // ... rest unchanged
}
```

**Step 2: Refactor `budget.ts`**

In `mcp-server/src/tools/budget.ts`:

1. Remove imports of `getAuthContext` and `budgetService`
2. Add import of `ToolContext`
3. Change handler signature:

```typescript
import type { ToolContext } from './types.js';

export async function handleGetBudgetSummary(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = budgetSummarySchema.parse(args);
  // ...
  const overview = await ctx.services.budget.getMonthlyOverview(
    workspaceId,
    year,
    month,
    input.currency
  );
  // ... rest unchanged
}
```

**Step 3: Refactor `dashboard.ts`**

In `mcp-server/src/tools/dashboard.ts`:

1. Remove imports of `getAuthContext` and `dashboardService, assetService`
2. Add import of `ToolContext`
3. Change both handler signatures:

```typescript
import type { ToolContext } from './types.js';

export async function handleGetDashboard(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = dashboardSchema.parse(args);
  // ...
  const data = await ctx.services.dashboard.getDashboardData(
    workspaceId,
    month,
    year,
    input.currency
  );
  // ... rest unchanged
}

export async function handleGetAssetSummary(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = assetSummarySchema.parse(args);

  const [byCurrency, byType] = await Promise.all([
    ctx.services.asset.getTotalByCurrency(workspaceId),
    ctx.services.asset.getTotalByType(workspaceId),
  ]);
  // ... rest unchanged
}
```

**Step 4: Refactor `transactions.ts`**

In `mcp-server/src/tools/transactions.ts`:

1. Remove imports of `getAuthContext` and `transactionService, categoryService, assetService`
2. Add import of `ToolContext`
3. Change handler signatures and internal helpers:

```typescript
import type { ToolContext } from './types.js';

// Remove these imports:
// import { getAuthContext } from '../auth.js';
// import { transactionService, categoryService, assetService } from '../context.js';

export async function handleListTransactions(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = listTransactionsSchema.parse(args);
  // ...
  const transactions = await ctx.services.transaction.findAll(filters);
  const count = await ctx.services.transaction.count(filters);
  // ... rest unchanged
}

// Internal helpers also need ctx:
async function resolveCategory(
  name: string,
  type: 'expense' | 'income',
  workspaceId: string,
  ctx: ToolContext
) {
  const categories = await ctx.services.category.findAll(workspaceId, {
    type,
    is_active: true,
  });
  // ... rest unchanged
}

async function resolveAsset(name: string, workspaceId: string, ctx: ToolContext) {
  const assets = await ctx.services.asset.findAll(workspaceId);
  // ... rest unchanged
}

export async function handleAddTransaction(
  args: Record<string, unknown>,
  type: 'expense' | 'income',
  ctx: ToolContext
) {
  const { workspaceId, userId } = ctx.auth;
  const input = addTransactionSchema.parse(args);

  const categoryResult = await resolveCategory(input.category_name, type, workspaceId, ctx);
  // ...
  const assetResult = await resolveAsset(input.asset_name, workspaceId, ctx);
  // ...
  const transaction = await ctx.services.transaction.create({
    workspace_id: workspaceId,
    created_by_user_id: userId,
    // ... rest unchanged
  });
  // ... rest unchanged
}
```

**Step 5: Update `index.ts` to pass ctx through**

In `mcp-server/src/tools/index.ts`:

```typescript
import type { ToolContext } from './types.js';

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'list_categories':
        return await handleListCategories(args, ctx);
      case 'list_assets':
        return await handleListAssets(args, ctx);
      case 'list_transactions':
        return await handleListTransactions(args, ctx);
      case 'add_expense':
        return await handleAddTransaction(args, 'expense', ctx);
      case 'add_income':
        return await handleAddTransaction(args, 'income', ctx);
      case 'get_budget_summary':
        return await handleGetBudgetSummary(args, ctx);
      case 'get_dashboard':
        return await handleGetDashboard(args, ctx);
      case 'get_asset_summary':
        return await handleGetAssetSummary(args, ctx);
      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${message}` }],
    };
  }
}
```

Also re-export `ToolContext` for consumers:

```typescript
export type { ToolContext } from './types.js';
```

**Step 6: Run existing tests to verify nothing broke**

Run: `bun test mcp-server/`
Expected: All existing tests PASS (schema tests don't call handlers, so they're unaffected).

**Step 7: Commit**

```bash
git add mcp-server/src/tools/
git commit -m "refactor(mcp): inject ToolContext into all tool handlers"
```

---

## Task 11: Refactor context.ts to Service Factory + Update stdio Entry Point

**Files:**

- Modify: `mcp-server/src/context.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Convert context.ts to a factory function**

Replace `mcp-server/src/context.ts` with:

```typescript
import type { IDatabase } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AssetService } from '@/services/asset.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';

export interface McpServices {
  transaction: TransactionService;
  budget: BudgetService;
  asset: AssetService;
  dashboard: DashboardService;
  category: CategoryService;
}

export function createServices(db: IDatabase): McpServices {
  return {
    transaction: new TransactionService(db),
    budget: new BudgetService(db),
    asset: new AssetService(db),
    dashboard: new DashboardService(db),
    category: new CategoryService(db),
  };
}
```

**Step 2: Update stdio entry point to construct ToolContext**

Replace `mcp-server/src/index.ts` with:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { db } from '@/db';
import { authenticate } from './auth.js';
import { createServices } from './context.js';
import { registerTools, handleToolCall } from './tools/index.js';
import type { ToolContext } from './tools/types.js';

const server = new Server(
  { name: 'allowealth', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: registerTools() };
});

async function main(): Promise<void> {
  const auth = await authenticate();
  const services = createServices(db);
  const ctx: ToolContext = { auth, services };

  console.error(`Allowealth MCP server started (workspace: ${auth.workspaceId.slice(0, 8)}…)`);

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments ?? {}, ctx);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
```

Key change: `CallToolRequestSchema` handler is registered inside `main()` so it has access to the `ctx` closure. `ListToolsRequestSchema` stays outside since it doesn't need context.

**Step 3: Run tests**

Run: `bun test mcp-server/`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add mcp-server/src/context.ts mcp-server/src/index.ts
git commit -m "refactor(mcp): convert context.ts to factory, wire ToolContext in stdio entry"
```

---

## Task 12: Add API Key Cache Keys and Tags

**Files:**

- Modify: `src/lib/cache/keys.ts`
- Modify: `src/lib/cache/tags.ts`

**Step 1: Add `apiKey` to CacheKeys**

In `src/lib/cache/keys.ts`, add inside the `CacheKeys` object (after the `layout` entry):

```typescript
  /** API key auth context: cache:apikey:{prefix} */
  apiKey: (prefix: string): string => `${PREFIX}:apikey:${prefix}`,
```

**Step 2: Add `API_KEYS` to CacheTags**

In `src/lib/cache/tags.ts`, add inside the `CacheTags` object (after `LAYOUT`):

```typescript
  API_KEYS: 'api_keys' as const,
```

**Step 3: Commit**

```bash
git add src/lib/cache/keys.ts src/lib/cache/tags.ts
git commit -m "feat(mcp): add cache keys and tags for API key auth"
```

---

## Task 13: Implement HTTP MCP Endpoint

**Files:**

- Create: `src/pages/api/mcp.ts`
- Reference: `mcp-server/src/tools/index.ts` (registerTools, handleToolCall)
- Reference: `mcp-server/src/context.ts` (createServices)
- Reference: `src/services/api-key.service.ts` (validate)
- Reference: `src/lib/cache/index.ts` (getCacheManager, CacheKeys, CacheTags)

**Step 1: Create the API route**

Create `src/pages/api/mcp.ts`:

```typescript
import type { APIRoute } from 'astro';
import { getDb } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
import { createServices } from '../../mcp-server/src/context';
import { registerTools, handleToolCall } from '../../mcp-server/src/tools/index';
import type { ToolContext } from '../../mcp-server/src/tools/types';

const API_KEY_CACHE_TTL = 300; // 5 minutes

interface AuthContext {
  workspaceId: string;
  userId: string;
  apiKeyId: string;
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

async function validateApiKeyWithCache(apiKey: string): Promise<AuthContext | null> {
  if (!apiKey.startsWith('aw_')) return null;

  const prefix = apiKey.slice(0, 8);
  const cacheKey = CacheKeys.apiKey(prefix);
  const cache = getCacheManager();

  const cached = await cache.get<AuthContext>(cacheKey);
  if (cached) return cached;

  const db = getDb();
  const service = new ApiKeyService(db);
  const result = await service.validate(apiKey);
  if (!result) return null;

  await cache.set(cacheKey, result, {
    ttl: API_KEY_CACHE_TTL,
    tags: [CacheTags.API_KEYS, `apikey:${prefix}`],
  });

  return result;
}

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

function jsonResponse(body: JsonRpcResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function dispatchMcpMessage(
  message: JsonRpcRequest,
  ctx: ToolContext
): Promise<JsonRpcResponse> {
  switch (message.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'allowealth', version: '1.0.0' },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: { tools: registerTools() },
      };

    case 'tools/call': {
      const params = message.params as { name: string; arguments?: Record<string, unknown> };
      const result = await handleToolCall(params.name, params.arguments ?? {}, ctx);
      return {
        jsonrpc: '2.0',
        id: message.id,
        result,
      };
    }

    case 'notifications/initialized':
    case 'ping':
      // Notifications don't need a response, but since we're stateless
      // just acknowledge
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {},
      };

    default:
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      };
  }
}

export const POST: APIRoute = async (context) => {
  // 1. Authenticate via Bearer token
  const apiKey = extractBearerToken(context.request);
  if (!apiKey) {
    return errorResponse(401, 'Missing Authorization header. Use: Bearer aw_...');
  }

  const auth = await validateApiKeyWithCache(apiKey);
  if (!auth) {
    return errorResponse(401, 'Invalid API key');
  }

  // 2. Build ToolContext with current request's DB
  const db = getDb();
  const services = createServices(db);
  const ctx: ToolContext = { auth, services };

  // 3. Parse and dispatch JSON-RPC message
  let body: JsonRpcRequest;
  try {
    body = await context.request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  if (!body.method) {
    return errorResponse(400, 'Missing "method" field in JSON-RPC request');
  }

  const result = await dispatchMcpMessage(body, ctx);
  return jsonResponse(result);
};

// Only POST is supported (stateless, no SSE)
export const GET: APIRoute = async () => {
  return errorResponse(405, 'Method not allowed. Use POST.');
};

export const DELETE: APIRoute = async () => {
  return errorResponse(405, 'Method not allowed. Use POST.');
};
```

**Step 2: Verify CSRF is naturally bypassed**

The CSRF middleware at `src/middleware/csrf.ts:28` checks `isAuthenticated && isApiRequest && requiresCsrfProtection(method) && !isCsrfExempt(pathname)`. The `isAuthenticated` check uses `!!context.locals.session`. Since our MCP endpoint uses API key auth (not session cookies), `context.locals.session` is `null`, so `isAuthenticated` is `false`. CSRF validation is skipped automatically. No middleware changes needed.

**Step 3: Verify route guard is naturally bypassed**

The route guard at `src/middleware/route-guard.ts` only protects routes starting with `/dashboard`, `/transactions`, `/budget`, etc. The `/api/mcp` route is not in the protected list, so it passes through automatically. No middleware changes needed.

**Step 4: Commit**

```bash
git add src/pages/api/mcp.ts
git commit -m "feat(mcp): add HTTP MCP endpoint at /api/mcp"
```

---

## Task 14: Quality Gates & Manual Testing

**Step 1: Run lint and typecheck**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass. Fix any issues.

**Step 2: Run all MCP tests**

Run: `bun test mcp-server/`
Expected: All existing tests PASS.

**Step 3: Test stdio transport still works**

Run the existing MCP server with a valid API key:

```bash
ALLOWEALTH_API_KEY=aw_<your-key> bun run mcp:start
```

Expected: `Allowealth MCP server started (workspace: ...)` printed to stderr. Press Ctrl+C.

**Step 4: Test HTTP transport locally**

Start the dev server:

```bash
bun run dev
```

Test `initialize`:

```bash
curl -s -X POST http://localhost:4321/api/mcp \
  -H "Authorization: Bearer aw_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | jq .
```

Expected: JSON response with `serverInfo.name: "allowealth"`.

Test `tools/list`:

```bash
curl -s -X POST http://localhost:4321/api/mcp \
  -H "Authorization: Bearer aw_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | jq .
```

Expected: JSON with all 8 tools.

Test `tools/call` (list_categories):

```bash
curl -s -X POST http://localhost:4321/api/mcp \
  -H "Authorization: Bearer aw_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_categories","arguments":{}}}' | jq .
```

Expected: JSON with categories from your workspace.

Test unauthorized:

```bash
curl -s -X POST http://localhost:4321/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | jq .
```

Expected: 401 `Missing Authorization header`.

Test invalid key:

```bash
curl -s -X POST http://localhost:4321/api/mcp \
  -H "Authorization: Bearer aw_invalidkey12345678901234567890" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | jq .
```

Expected: 401 `Invalid API key`.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore(mcp): quality gates and verify HTTP transport"
```

---

## Summary

| Task | Description                                          | Estimated Size |
| ---- | ---------------------------------------------------- | -------------- |
| 9    | Define `ToolContext` interface                       | Small          |
| 10   | Refactor all tool handlers to accept `ToolContext`   | Medium         |
| 11   | Convert `context.ts` to factory + update stdio entry | Small          |
| 12   | Add API key cache keys and tags                      | Small          |
| 13   | Implement HTTP MCP endpoint (`/api/mcp`)             | Medium         |
| 14   | Quality gates & manual testing                       | Small          |

**Total: 6 tasks, ~20 steps.**

Each task builds on the previous. Tasks 9-11 are the refactor (no new functionality). Tasks 12-13 add the HTTP transport. Task 14 verifies everything works.
