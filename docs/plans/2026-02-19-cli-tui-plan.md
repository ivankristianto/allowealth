# `aw` CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified `aw` CLI entry point using citty (UnJS) to replace 70+ package.json scripts with structured subcommands and a global `--prod` flag.

**Architecture:** Single entry point at `src/cli/index.ts` using citty's `defineCommand` + `runMain`. Root command handles `--prod` env loading in `setup()`. Subcommands are lazy-loaded. Shell-out commands delegate to existing tools. Logic commands extract `main()` from existing standalone scripts. D1 auto-migration is new logic that reads drizzle journal and applies pending migrations via wrangler.

**Tech Stack:** citty (UnJS CLI framework), Bun runtime, execFileSync for subprocess calls

**Design doc:** `docs/plans/2026-02-19-cli-tui-design.md`

---

### Task 1: Install citty and scaffold entry point

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/lib/env-loader.ts`
- Modify: `package.json` (add dependency + script)

**Step 1: Install citty**

Run: `cd /Users/ivan/Works/AI/expenses.worktrees/tui-cli && bun add citty`
Expected: citty added to dependencies in package.json

**Step 2: Create env-loader**

Create `src/cli/lib/env-loader.ts`:

```ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Load environment variables from a file into process.env.
 * Parses KEY=VALUE lines, ignoring comments and blank lines.
 */
export function loadEnvFile(filename: string): void {
  const filepath = resolve(import.meta.dir, '../../../', filename);

  if (!existsSync(filepath)) {
    console.error(`Environment file not found: ${filename}`);
    process.exit(1);
  }

  const content = readFileSync(filepath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    process.env[key] = value;
  }

  console.log(`Loaded environment from ${filename}`);
}
```

**Step 3: Create root command entry point**

Create `src/cli/index.ts`:

```ts
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'aw',
    description: 'Allowealth CLI — manage workspaces, database, deployments, and admin tasks',
  },
  args: {
    prod: {
      type: 'boolean',
      description: 'Use production environment (.env.production)',
    },
  },
  setup({ args }) {
    if (args.prod) {
      const { loadEnvFile } = require('./lib/env-loader');
      loadEnvFile('.env.production');
    }
  },
  subCommands: {
    workspace: () => import('./commands/workspace').then((m) => m.default),
    db: () => import('./commands/db').then((m) => m.default),
    admin: () => import('./commands/admin').then((m) => m.default),
    deploy: () => import('./commands/deploy').then((m) => m.default),
    mcp: () => import('./commands/mcp').then((m) => m.default),
    release: () => import('./commands/release').then((m) => m.default),
    backfill: () => import('./commands/backfill').then((m) => m.default),
  },
});

runMain(main);
```

Note: the `setup()` uses `require()` to avoid top-level import of env-loader (only needed when `--prod` is true). If citty's `setup()` runs before subcommand resolution, this ensures env is loaded first. If dynamic import is preferred, use `await import('./lib/env-loader')` instead — check if `setup` can be async in citty.

**Step 4: Add `aw` script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"aw": "bun run src/cli/index.ts"
```

**Step 5: Create stub command files so entry point doesn't crash**

Create these minimal stubs (each will be replaced in subsequent tasks):

- `src/cli/commands/workspace.ts`
- `src/cli/commands/db.ts`
- `src/cli/commands/admin.ts`
- `src/cli/commands/deploy.ts`
- `src/cli/commands/mcp.ts`
- `src/cli/commands/release.ts`
- `src/cli/commands/backfill.ts`

Each stub follows this pattern (example for deploy):

```ts
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'deploy', description: 'Deploy the application' },
  run() {
    console.log('Not implemented yet');
  },
});
```

**Step 6: Verify help output**

Run: `bun run aw --help`
Expected: Shows `aw` with `--prod` flag and lists all 7 subcommands

Run: `bun run aw`
Expected: Shows help/usage (citty auto-shows help when no subcommand given)

**Step 7: Commit**

```bash
git add src/cli/ package.json bun.lockb
git commit -m "feat(cli): scaffold aw CLI entry point with citty"
```

---

### Task 2: Implement shell-out commands (deploy, mcp, release, backfill)

These are thin wrappers that delegate to existing tools via `execFileSync`.

**Files:**
- Modify: `src/cli/commands/deploy.ts`
- Modify: `src/cli/commands/mcp.ts`
- Modify: `src/cli/commands/release.ts`
- Modify: `src/cli/commands/backfill.ts`

**Step 1: Create a shared shell-out helper**

Create `src/cli/lib/exec.ts`:

```ts
import { execFileSync } from 'child_process';

/**
 * Run a command with inherited stdio.
 * Uses execFileSync with argv array to avoid shell injection.
 */
export function exec(command: string, args: string[], env?: Record<string, string>): void {
  execFileSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}
```

**Step 2: Implement deploy.ts**

Replace `src/cli/commands/deploy.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'deploy', description: 'Build and deploy the application' },
  subCommands: {
    cloudflare: defineCommand({
      meta: { name: 'cloudflare', description: 'Build and deploy to Cloudflare Workers' },
      run() {
        exec('astro', ['build'], { DEPLOY_TARGET: 'cloudflare' });
        exec('wrangler', ['deploy']);
      },
    }),
    vercel: defineCommand({
      meta: { name: 'vercel', description: 'Build and deploy to Vercel' },
      run() {
        exec('astro', ['build'], { DEPLOY_TARGET: 'vercel' });
        exec('vercel', ['deploy', '--prod']);
      },
    }),
    netlify: defineCommand({
      meta: { name: 'netlify', description: 'Build and deploy to Netlify' },
      run() {
        exec('astro', ['build'], { DEPLOY_TARGET: 'netlify' });
        exec('netlify', ['deploy', '--prod']);
      },
    }),
  },
});
```

**Step 3: Implement mcp.ts**

Replace `src/cli/commands/mcp.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'mcp', description: 'MCP server management' },
  subCommands: {
    start: defineCommand({
      meta: { name: 'start', description: 'Start MCP server for AI assistant integration' },
      run() {
        exec('bun', ['run', 'mcp-server/src/index.ts']);
      },
    }),
  },
});
```

**Step 4: Implement release.ts**

Replace `src/cli/commands/release.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'release', description: 'Interactive release (bump version, tag, changelog)' },
  run() {
    exec('bun', ['run', 'scripts/release.ts']);
  },
});
```

**Step 5: Implement backfill.ts**

Replace `src/cli/commands/backfill.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'backfill', description: 'Run data backfill scripts' },
  subCommands: {
    'email-verification': defineCommand({
      meta: {
        name: 'email-verification',
        description: 'Backfill email verification for existing users',
      },
      run() {
        exec('bun', ['run', 'scripts/backfill-email-verification.ts']);
      },
    }),
  },
});
```

**Step 6: Verify each command**

Run: `bun run aw deploy --help`
Expected: Shows cloudflare, vercel, netlify subcommands

Run: `bun run aw mcp --help`
Expected: Shows start subcommand

Run: `bun run aw release --help`
Expected: Shows release description

Run: `bun run aw backfill --help`
Expected: Shows email-verification subcommand

**Step 7: Commit**

```bash
git add src/cli/commands/deploy.ts src/cli/commands/mcp.ts src/cli/commands/release.ts src/cli/commands/backfill.ts src/cli/lib/exec.ts
git commit -m "feat(cli): add deploy, mcp, release, backfill commands"
```

---

### Task 3: Implement db commands (shell-out wrappers)

**Files:**
- Modify: `src/cli/commands/db.ts`

**Step 1: Implement db.ts with all shell-out subcommands**

Replace `src/cli/commands/db.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      args: {
        d1: {
          type: 'boolean',
          description: 'Migrate Cloudflare D1 database instead of local/Postgres',
        },
        local: {
          type: 'boolean',
          description: 'Target local D1 instead of remote (only with --d1)',
        },
      },
      async run({ args }) {
        if (args.d1) {
          const { migrateD1 } = await import('../lib/d1-migrate');
          await migrateD1({ local: Boolean(args.local) });
        } else {
          exec('drizzle-kit', ['migrate']);
        }
      },
    }),
    generate: defineCommand({
      meta: { name: 'generate', description: 'Generate migration from schema changes' },
      run() {
        exec('drizzle-kit', ['generate']);
      },
    }),
    push: defineCommand({
      meta: { name: 'push', description: 'Push schema directly to database (dev only)' },
      run() {
        exec('drizzle-kit', ['push']);
      },
    }),
    studio: defineCommand({
      meta: { name: 'studio', description: 'Open Drizzle Studio visual DB browser' },
      run() {
        exec('drizzle-kit', ['studio']);
      },
    }),
    seed: defineCommand({
      meta: { name: 'seed', description: 'Seed database with demo data' },
      run() {
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    reset: defineCommand({
      meta: { name: 'reset', description: 'Delete SQLite DB, push schema, and seed (dev only)' },
      run() {
        console.log('Resetting database...');
        exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
        exec('mkdir', ['-p', 'db']);
        exec('drizzle-kit', ['push', '--force']);
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    empty: defineCommand({
      meta: { name: 'empty', description: 'Truncate all data (preserve schema)' },
      run() {
        exec('bun', ['run', 'src/db/empty.ts']);
      },
    }),
  },
});
```

Note: The `migrate` subcommand has a placeholder for `d1-migrate` that will be implemented in Task 5. For now, it will fail with a module-not-found error if `--d1` is used.

**Step 2: Verify db commands**

Run: `bun run aw db --help`
Expected: Shows all 7 subcommands (migrate, generate, push, studio, seed, reset, empty)

Run: `bun run aw db migrate --help`
Expected: Shows `--d1` and `--local` flags

**Step 3: Commit**

```bash
git add src/cli/commands/db.ts
git commit -m "feat(cli): add db commands (migrate, generate, push, studio, seed, reset, empty)"
```

---

### Task 4: Implement workspace commands (extract existing logic)

**Files:**
- Modify: `src/cli/commands/workspace.ts`

**Context:** These commands extract the `main()` logic from existing standalone scripts. The key change is that argument parsing moves from manual `process.argv` to citty's `args` definition. The business logic stays the same.

**Step 1: Implement workspace.ts**

Replace `src/cli/commands/workspace.ts`. This is the largest command file because it has 4 subcommands with extracted logic.

Source mapping:
- `create` ← `src/cli/create-workspace.ts`
- `create-d1` ← `src/cli/create-workspace-d1.ts`
- `list` ← `src/cli/list-workspaces.ts`
- `delete` ← `src/cli/delete-workspace.ts`

```ts
import { defineCommand } from 'citty';
import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default defineCommand({
  meta: { name: 'workspace', description: 'Workspace management commands' },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create workspace and send admin invitation email' },
      args: {
        name: { type: 'string', alias: 'n', description: 'Workspace name', required: true },
        email: { type: 'string', alias: 'e', description: 'Admin invitation email' },
        currency: { type: 'string', alias: 'c', description: 'Default currency', default: 'IDR' },
        'week-start': {
          type: 'string',
          alias: 'w',
          description: 'Week start day (monday or sunday)',
          default: 'monday',
        },
        'compact-numbers': {
          type: 'string',
          description: 'Compact number formatting (true or false)',
          default: 'true',
        },
      },
      async run({ args }) {
        // Lazy imports to avoid loading DB at CLI startup
        const { db } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { WorkspaceMetaService } = await import('@/services/workspace-meta.service');
        const { WorkspaceInvitationService } = await import(
          '@/services/workspace-invitation.service'
        );
        const { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } = await import(
          '@/lib/constants/workspace-meta-keys'
        );
        const { getEnv } = await import('@/lib/env');

        let email = (args.email as string | undefined)?.trim();
        if (!email) {
          email = (await prompt('Admin email: ')).trim();
        }
        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }
        const normalizedEmail = email.toLowerCase();

        console.log('\nCreating workspace...');

        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.create({ name: args.name as string });
        console.log(`✓ Created workspace: ${workspace.name} (${workspace.id})`);

        const metaService = new WorkspaceMetaService(db);
        const currency =
          (args.currency as string) || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);

        const weekStart =
          (args['week-start'] as string) ||
          WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

        const compactNumbers =
          (args['compact-numbers'] as string) ||
          WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.COMPACT_NUMBERS, compactNumbers);

        console.log(`✓ Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`);

        const invitationService = new WorkspaceInvitationService(db);
        const invitation = await invitationService.create({
          workspaceId: workspace.id,
          email: normalizedEmail,
          role: 'admin',
        });

        const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
        const signupLink = `${baseUrl}/signup?token=${invitation.token}`;

        console.log(`✓ Created admin invitation for: ${normalizedEmail}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Workspace created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\nInvitation link:\n  ${signupLink}\n`);
      },
    }),

    'create-d1': defineCommand({
      meta: {
        name: 'create-d1',
        description: 'Create workspace on Cloudflare D1 via wrangler',
      },
      args: {
        name: { type: 'string', alias: 'n', description: 'Workspace name', required: true },
        email: { type: 'string', alias: 'e', description: 'Admin invitation email' },
        currency: { type: 'string', alias: 'c', description: 'Default currency', default: 'IDR' },
        'week-start': {
          type: 'string',
          alias: 'w',
          description: 'Week start day (monday or sunday)',
          default: 'monday',
        },
        'compact-numbers': {
          type: 'string',
          description: 'Compact number formatting (true or false)',
          default: 'true',
        },
        local: {
          type: 'boolean',
          description: 'Execute against local D1 instead of remote',
        },
      },
      async run({ args }) {
        const { execFileSync } = await import('child_process');
        const { nanoid } = await import('nanoid');

        const D1_DATABASE_NAME = 'allowealth-db';
        const TOKEN_LENGTH = 64;
        const INVITATION_EXPIRY_DAYS = 7;
        const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const isLocal = Boolean(args.local);

        let email = (args.email as string | undefined)?.trim();
        if (!email) {
          email = (await prompt('Admin email: ')).trim();
        }
        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }
        const normalizedEmail = email.toLowerCase();

        console.log(`\nCreate Workspace (D1)`);
        console.log(`Target: ${isLocal ? 'local' : 'remote'} D1\n`);
        console.log('Creating workspace...');

        const sqlEscape = (v: string) => v.replace(/'/g, "''");
        const d1Execute = (sql: string) => {
          execFileSync(
            'wrangler',
            ['d1', 'execute', D1_DATABASE_NAME, isLocal ? '--local' : '--remote', '--command', sql],
            { stdio: 'inherit' },
          );
        };

        const workspaceId = nanoid();
        const invitationId = nanoid();
        const token = nanoid(TOKEN_LENGTH);
        const now = Date.now();
        const expiresAt = now + INVITATION_EXPIRY_MS;
        const name = args.name as string;
        const currency = args.currency as string;
        const weekStart = args['week-start'] as string;
        const compactNumbers = args['compact-numbers'] as string;

        d1Execute(
          `INSERT INTO workspaces (id, name, status, created_at, updated_at) VALUES ('${sqlEscape(workspaceId)}', '${sqlEscape(name)}', 'active', ${now}, ${now});`,
        );
        console.log(`  Created workspace: ${name} (${workspaceId})`);

        const metaRows = [
          { key: 'currency', value: currency },
          { key: 'week_start', value: weekStart },
          { key: 'compact_numbers', value: compactNumbers },
        ];
        const metaValues = metaRows
          .map(
            (m) =>
              `('${nanoid()}', '${workspaceId}', '${m.key}', '${sqlEscape(m.value)}', ${now}, ${now})`,
          )
          .join(', ');
        d1Execute(
          `INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value, created_at, updated_at) VALUES ${metaValues};`,
        );
        console.log(
          `  Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`,
        );

        d1Execute(
          `INSERT INTO workspace_invitations (id, workspace_id, email, token, role, expires_at, created_at) VALUES ('${invitationId}', '${workspaceId}', '${sqlEscape(normalizedEmail)}', '${token}', 'admin', ${expiresAt}, ${now});`,
        );
        console.log(`  Created admin invitation for: ${normalizedEmail}`);

        const baseUrl = isLocal ? 'http://localhost:4321' : 'https://allowealth.io';
        const signupLink = `${baseUrl}/signup?token=${token}`;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Workspace created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\nInvitation link:\n  ${signupLink}\n`);
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: 'List all workspaces with user counts' },
      async run() {
        const { db, workspaces, workspaceMeta, users } = await import('@/db');
        const { eq, sql } = await import('drizzle-orm');

        console.log('Fetching workspaces...\n');

        const allWorkspaces = await db.select().from(workspaces).orderBy(workspaces.created_at);

        if (allWorkspaces.length === 0) {
          console.log('No workspaces found.');
          return;
        }

        console.log(`Found ${allWorkspaces.length} workspace(s):\n`);
        console.log('─'.repeat(80));

        for (const workspace of allWorkspaces) {
          const memberResult = await (db as any)
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.workspace_id, workspace.id));

          const metaRecords = await db
            .select()
            .from(workspaceMeta)
            .where(eq(workspaceMeta.workspace_id, workspace.id));

          console.log(`\nWorkspace: ${workspace.name}`);
          console.log(`  ID:         ${workspace.id}`);
          console.log(`  Created:    ${workspace.created_at.toISOString().split('T')[0]}`);
          console.log(`  Members:    ${memberResult[0]?.count ?? 0}`);

          if (metaRecords.length > 0) {
            console.log(`  Settings:`);
            for (const meta of metaRecords) {
              console.log(`    ${meta.meta_key}: ${meta.meta_value}`);
            }
          }
          console.log('─'.repeat(80));
        }

        console.log(`\nTotal: ${allWorkspaces.length} workspace(s)`);
      },
    }),

    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete a workspace and all its data' },
      args: {
        id: { type: 'string', alias: 'i', description: 'Workspace ID to delete', required: true },
        force: {
          type: 'boolean',
          alias: 'f',
          description: 'Skip confirmation prompt',
        },
      },
      async run({ args }) {
        const { db, users } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { eq, sql } = await import('drizzle-orm');

        const workspaceId = args.id as string;
        console.log('Looking up workspace...\n');

        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.findById(workspaceId);

        if (!workspace) {
          console.error(`Error: Workspace with ID "${workspaceId}" not found`);
          process.exit(1);
        }

        const memberResult = await (db as any)
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.workspace_id, workspaceId));
        const memberCount = memberResult[0]?.count ?? 0;

        console.log(`Found workspace:`);
        console.log(`  ID:      ${workspace.id}`);
        console.log(`  Name:    ${workspace.name}`);
        console.log(`  Members: ${memberCount}`);

        if (!args.force) {
          console.log(`\nThis will permanently delete:`);
          console.log(`  - Workspace: ${workspace.name}`);
          console.log(`  - ${memberCount} member(s)`);
          console.log(`  - All related data (categories, transactions, assets, etc.)`);
          console.log(`\nThis action cannot be undone.`);

          const answer = await prompt('\nType "DELETE" to confirm: ');
          if (answer !== 'DELETE') {
            console.log('\nDeletion cancelled.');
            process.exit(0);
          }
        }

        console.log('\nDeleting workspace...');
        await workspaceService.delete(workspaceId);
        console.log('Workspace deleted successfully!');
      },
    }),
  },
});
```

**Step 2: Verify workspace commands**

Run: `bun run aw workspace --help`
Expected: Shows create, create-d1, list, delete subcommands

Run: `bun run aw workspace create --help`
Expected: Shows --name, --email, --currency, --week-start, --compact-numbers flags

**Step 3: Commit**

```bash
git add src/cli/commands/workspace.ts
git commit -m "feat(cli): add workspace commands (create, create-d1, list, delete)"
```

---

### Task 5: Implement admin commands (extract existing logic)

**Files:**
- Modify: `src/cli/commands/admin.ts`

**Context:** These commands extract logic from existing scripts. `rotate-db-password` and `generate-email-key` are simpler to delegate via shell-out since they have complex I/O (hidden password input, file manipulation).

**Step 1: Implement admin.ts**

Replace `src/cli/commands/admin.ts`:

```ts
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'admin', description: 'Admin and security commands' },
  subCommands: {
    'create-super-admin': defineCommand({
      meta: { name: 'create-super-admin', description: 'Promote a user to super admin' },
      args: {
        email: {
          type: 'string',
          alias: 'e',
          description: 'Email of the user to promote',
          required: true,
        },
      },
      async run({ args }) {
        const { db, users } = await import('@/db');
        const { eq, and, isNull } = await import('drizzle-orm');

        const email = (args.email as string).toLowerCase().trim();
        console.log(`\nLooking up user: ${email}...`);

        const user = await db.query.users.findFirst({
          where: and(eq(users.email, email), isNull(users.deleted_at)),
        });

        if (!user) {
          console.error(`Error: User with email "${email}" not found or is soft-deleted.`);
          process.exit(1);
        }

        if (user.role === 'super_admin') {
          console.log(`User "${user.name}" is already a super admin.`);
          return;
        }

        console.log(`Found user: ${user.name} (${user.email})`);
        console.log(`Current role: ${user.role}`);
        console.log(`Current workspace: ${user.workspace_id || 'none'}\n`);

        await (db as any)
          .update(users)
          .set({ role: 'super_admin', workspace_id: null, updated_at: new Date() })
          .where(eq(users.id, user.id));

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`User "${user.name}" promoted to super admin`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('The user can now access /admin routes.');
        console.log('Their workspace association has been removed.');
      },
    }),

    'create-api-key': defineCommand({
      meta: { name: 'create-api-key', description: 'Generate API key for a workspace' },
      args: {
        'workspace-id': {
          type: 'string',
          alias: 'w',
          description: 'Workspace ID',
          required: true,
        },
        'user-id': { type: 'string', alias: 'u', description: 'User ID', required: true },
        name: { type: 'string', alias: 'n', description: 'Key name', required: true },
      },
      async run({ args }) {
        const { db } = await import('@/db');
        const { ApiKeyService } = await import('@/services/api-key.service');

        const service = new ApiKeyService(db);
        const result = await service.generate({
          workspace_id: args['workspace-id'] as string,
          user_id: args['user-id'] as string,
          name: args.name as string,
        });

        console.log('\nAPI Key Created');
        console.log('==================\n');
        console.log(`Name:    ${args.name}`);
        console.log(`Prefix:  ${result.apiKey.key_prefix}...`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Your API key (shown ONCE, save it now):\n');
        console.log(`  ${result.plainKey}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      },
    }),

    'rotate-db-password': defineCommand({
      meta: {
        name: 'rotate-db-password',
        description: 'Update Supabase DB password and test connection',
      },
      args: {
        ask: { type: 'boolean', description: 'Prompt for new password interactively' },
        hyperdrive: { type: 'boolean', description: 'Also update Cloudflare Hyperdrive config' },
      },
      run({ args }) {
        const extraArgs: string[] = [];
        if (args.ask) extraArgs.push('--ask');
        if (args.hyperdrive) extraArgs.push('--hyperdrive');
        exec('bun', ['run', 'src/cli/rotate-db-password.ts', ...extraArgs]);
      },
    }),

    'generate-email-key': defineCommand({
      meta: {
        name: 'generate-email-key',
        description: 'Generate encryption key for email functionality',
      },
      run() {
        exec('bun', ['run', 'scripts/generate-email-key.ts']);
      },
    }),
  },
});
```

Note: `rotate-db-password` stays as a shell-out because it has complex raw-mode stdin handling for hidden password input that doesn't integrate cleanly with citty's argument parsing. The existing script remains at its current location.

**Step 2: Verify admin commands**

Run: `bun run aw admin --help`
Expected: Shows create-super-admin, create-api-key, rotate-db-password, generate-email-key subcommands

Run: `bun run aw admin create-api-key --help`
Expected: Shows --workspace-id, --user-id, --name flags

**Step 3: Commit**

```bash
git add src/cli/commands/admin.ts
git commit -m "feat(cli): add admin commands (create-super-admin, create-api-key, rotate-db-password, generate-email-key)"
```

---

### Task 6: Implement D1 auto-migration

**Files:**
- Create: `src/cli/lib/d1-migrate.ts`
- Create: `src/cli/lib/d1-migrate.test.ts`

**Context:** This is the only genuinely new logic. It reads the drizzle migration journal, queries D1 for applied migrations, and applies pending ones.

**Step 1: Write the test for journal parsing and diff logic**

Create `src/cli/lib/d1-migrate.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { parseJournal, findPendingMigrations } from './d1-migrate';

describe('parseJournal', () => {
  test('parses journal entries', () => {
    const journal = {
      version: '7',
      dialect: 'sqlite',
      entries: [
        { idx: 0, version: '6', when: 1771249670426, tag: '0000_woozy_steel_serpent', breakpoints: true },
        { idx: 1, version: '6', when: 1771349670426, tag: '0001_next_migration', breakpoints: true },
      ],
    };
    const result = parseJournal(journal);
    expect(result).toEqual([
      { idx: 0, tag: '0000_woozy_steel_serpent' },
      { idx: 1, tag: '0001_next_migration' },
    ]);
  });

  test('returns empty array for no entries', () => {
    const journal = { version: '7', dialect: 'sqlite', entries: [] };
    const result = parseJournal(journal);
    expect(result).toEqual([]);
  });
});

describe('findPendingMigrations', () => {
  test('returns all when none applied', () => {
    const all = [
      { idx: 0, tag: '0000_first' },
      { idx: 1, tag: '0001_second' },
    ];
    const applied: string[] = [];
    expect(findPendingMigrations(all, applied)).toEqual(all);
  });

  test('returns only unapplied', () => {
    const all = [
      { idx: 0, tag: '0000_first' },
      { idx: 1, tag: '0001_second' },
      { idx: 2, tag: '0002_third' },
    ];
    const applied = ['0000_first', '0001_second'];
    expect(findPendingMigrations(all, applied)).toEqual([{ idx: 2, tag: '0002_third' }]);
  });

  test('returns empty when all applied', () => {
    const all = [{ idx: 0, tag: '0000_first' }];
    const applied = ['0000_first'];
    expect(findPendingMigrations(all, applied)).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/cli/lib/d1-migrate.test.ts`
Expected: FAIL — cannot find module `./d1-migrate`

**Step 3: Implement d1-migrate.ts**

Create `src/cli/lib/d1-migrate.ts`:

```ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execFileSync } from 'child_process';

const D1_DATABASE_NAME = 'allowealth-db';
const MIGRATIONS_DIR = 'drizzle/sqlite';
const JOURNAL_PATH = `${MIGRATIONS_DIR}/meta/_journal.json`;

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  version: string;
  dialect: string;
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
}

/**
 * Parse journal file into simplified entries (idx + tag).
 */
export function parseJournal(journal: Journal): JournalEntry[] {
  return journal.entries.map((e) => ({ idx: e.idx, tag: e.tag }));
}

/**
 * Find migrations that haven't been applied yet.
 */
export function findPendingMigrations(
  all: JournalEntry[],
  appliedTags: string[],
): JournalEntry[] {
  const appliedSet = new Set(appliedTags);
  return all.filter((entry) => !appliedSet.has(entry.tag));
}

/**
 * Execute a SQL command against D1 via wrangler.
 */
function d1Execute(sql: string, local: boolean): string {
  const result = execFileSync(
    'wrangler',
    [
      'd1',
      'execute',
      D1_DATABASE_NAME,
      local ? '--local' : '--remote',
      '--command',
      sql,
    ],
    { encoding: 'utf-8' },
  );
  return result;
}

/**
 * Execute a SQL command and return JSON output from D1.
 */
function d1ExecuteJson(sql: string, local: boolean): any[] {
  const result = execFileSync(
    'wrangler',
    [
      'd1',
      'execute',
      D1_DATABASE_NAME,
      local ? '--local' : '--remote',
      '--command',
      sql,
      '--json',
    ],
    { encoding: 'utf-8' },
  );
  const parsed = JSON.parse(result);
  // wrangler d1 --json returns an array of result sets
  return parsed[0]?.results ?? [];
}

/**
 * Ensure the migration tracking table exists on D1.
 */
function ensureTrackingTable(local: boolean): void {
  d1Execute(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );`,
    local,
  );
}

/**
 * Get list of already-applied migration tags from D1.
 */
function getAppliedTags(local: boolean): string[] {
  const rows = d1ExecuteJson(
    'SELECT tag FROM __drizzle_migrations ORDER BY id;',
    local,
  );
  return rows.map((row: { tag: string }) => row.tag);
}

/**
 * Read and split a migration SQL file into individual statements.
 * Splits on Drizzle's `--> statement-breakpoint` markers.
 */
function readMigrationStatements(tag: string): string[] {
  const filePath = resolve(MIGRATIONS_DIR, `${tag}.sql`);
  if (!existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Run all pending D1 migrations.
 */
export async function migrateD1(options: { local: boolean }): Promise<void> {
  const { local } = options;
  const target = local ? 'local' : 'remote';

  console.log(`\nD1 Migration (${target})`);
  console.log('═'.repeat(40));

  // 1. Read journal
  const journalPath = resolve(JOURNAL_PATH);
  if (!existsSync(journalPath)) {
    console.error(`Journal not found: ${journalPath}`);
    console.error('Run "aw db generate" first to create migrations.');
    process.exit(1);
  }

  const journal: Journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  const allMigrations = parseJournal(journal);

  if (allMigrations.length === 0) {
    console.log('No migrations found in journal.');
    return;
  }

  console.log(`Found ${allMigrations.length} migration(s) in journal.`);

  // 2. Ensure tracking table exists
  ensureTrackingTable(local);

  // 3. Get applied migrations
  const appliedTags = getAppliedTags(local);
  console.log(`Already applied: ${appliedTags.length}`);

  // 4. Find pending
  const pending = findPendingMigrations(allMigrations, appliedTags);

  if (pending.length === 0) {
    console.log('\nAll migrations are up to date.');
    return;
  }

  console.log(`Pending: ${pending.length}\n`);

  // 5. Apply each pending migration
  for (const migration of pending) {
    console.log(`Applying: ${migration.tag}...`);

    const statements = readMigrationStatements(migration.tag);

    for (const statement of statements) {
      d1Execute(statement, local);
    }

    // Record as applied
    d1Execute(
      `INSERT INTO __drizzle_migrations (tag) VALUES ('${migration.tag}');`,
      local,
    );

    console.log(`  ✓ Applied ${migration.tag} (${statements.length} statements)`);
  }

  console.log(`\n✓ Applied ${pending.length} migration(s) successfully.`);
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/cli/lib/d1-migrate.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/cli/lib/d1-migrate.ts src/cli/lib/d1-migrate.test.ts
git commit -m "feat(cli): implement D1 auto-migration with journal-based tracking"
```

---

### Task 7: Clean up old scripts and update documentation

**Files:**
- Delete: `src/cli/create-workspace.ts`
- Delete: `src/cli/create-workspace-d1.ts`
- Delete: `src/cli/list-workspaces.ts`
- Delete: `src/cli/delete-workspace.ts`
- Delete: `src/cli/create-super-admin.ts`
- Delete: `src/cli/create-api-key.ts`
- Keep: `src/cli/rotate-db-password.ts` (still used via shell-out)
- Modify: `package.json` (remove replaced scripts)
- Modify: `COMMANDS.md` (document `aw` commands)

**Step 1: Delete old standalone CLI scripts that are now in citty commands**

Delete these files (their logic is now in `src/cli/commands/workspace.ts` and `src/cli/commands/admin.ts`):

- `src/cli/create-workspace.ts`
- `src/cli/create-workspace-d1.ts`
- `src/cli/list-workspaces.ts`
- `src/cli/delete-workspace.ts`
- `src/cli/create-super-admin.ts`
- `src/cli/create-api-key.ts`

Do NOT delete `src/cli/rotate-db-password.ts` — it's still used as a shell-out target.

**Step 2: Remove replaced scripts from package.json**

Remove these scripts from `package.json` `"scripts"` section:

```
"cli:create-super-admin"
"cli:create-super-admin:prod"
"cli:create-workspace"
"cli:create-workspace:prod"
"cli:create-workspace:d1"
"cli:list-workspaces"
"cli:list-workspaces:prod"
"cli:delete-workspace"
"cli:delete-workspace:prod"
"cli:create-api-key"
"cli:create-api-key:prod"
"cli:rotate-db-password"
"cli:generate-email-key"
"db:d1:migrate"
"db:d1:migrate:local"
"db:generate:prod"
"db:migrate:prod"
"db:empty:prod"
"backfill:email-verification"
"backfill:email-verification:prod"
"mcp:start"
"mcp:start:prod"
```

Keep all `bun run dev/build/test/lint` scripts unchanged.

**Step 3: Update COMMANDS.md**

Replace the CLI Tools, D1 Database, MCP Server, and Backfill sections with a single `aw` CLI section. Keep the Development, Build & Deploy, Quality Gates, Database (local), Database (production), Testing, and Release sections as-is but add notes that `aw` can also handle deploy/release/db operations.

Add this section after the existing Database sections:

```markdown
## Allowealth CLI (`aw`)

The `aw` CLI provides a unified interface for admin and operational commands. Use `--prod` to target production.

### Quick Reference

| Command | Description |
|---|---|
| `bun run aw --help` | Show all commands |
| `bun run aw <command> --help` | Show subcommand help |
| `bun run aw --prod <command>` | Run against production environment |

### Workspace Management

| Command | Description |
|---|---|
| `bun run aw workspace create --name "Name" --email admin@example.com` | Create workspace with admin invitation |
| `bun run aw workspace create-d1 --name "Name" --email admin@example.com` | Create workspace on D1 (remote) |
| `bun run aw workspace create-d1 --name "Name" --email admin@example.com --local` | Create workspace on D1 (local) |
| `bun run aw workspace list` | List all workspaces |
| `bun run aw workspace delete --id <id>` | Delete workspace (with confirmation) |
| `bun run aw workspace delete --id <id> --force` | Delete workspace (skip confirmation) |

Production: `bun run aw --prod workspace list`

### Database

| Command | Description |
|---|---|
| `bun run aw db migrate` | Apply pending migrations (SQLite) |
| `bun run aw --prod db migrate` | Apply pending migrations (PostgreSQL) |
| `bun run aw db migrate --d1` | Auto-apply pending migrations to remote D1 |
| `bun run aw db migrate --d1 --local` | Auto-apply pending migrations to local D1 |
| `bun run aw db generate` | Generate migration from schema changes |
| `bun run aw db push` | Push schema directly (dev only) |
| `bun run aw db studio` | Open Drizzle Studio |
| `bun run aw db seed` | Seed with demo data |
| `bun run aw db reset` | Delete + push + seed (dev only) |
| `bun run aw db empty` | Truncate all data |

### Admin & Security

| Command | Description |
|---|---|
| `bun run aw admin create-super-admin --email admin@example.com` | Promote user to super admin |
| `bun run aw admin create-api-key --workspace-id <id> --user-id <id> --name "Name"` | Generate API key |
| `bun run aw admin rotate-db-password [--ask] [--hyperdrive]` | Rotate DB password |
| `bun run aw admin generate-email-key` | Generate email encryption key |

### Deploy

| Command | Description |
|---|---|
| `bun run aw deploy cloudflare` | Build and deploy to Cloudflare Workers |
| `bun run aw deploy vercel` | Build and deploy to Vercel |
| `bun run aw deploy netlify` | Build and deploy to Netlify |

### Other

| Command | Description |
|---|---|
| `bun run aw mcp start` | Start MCP server |
| `bun run aw release` | Interactive release |
| `bun run aw backfill email-verification` | Backfill email verification |
```

Remove the old CLI Tools, D1 Database, MCP Server sections and the backfill section from COMMANDS.md since they're now covered by the `aw` CLI section.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No new errors from removed files (they were standalone entry points, not imported by anything)

**Step 5: Run tests**

Run: `bun test src/cli/`
Expected: D1 migration tests pass

**Step 6: Verify `aw --help` shows everything**

Run: `bun run aw --help`
Expected: Shows all 7 command groups

Run: `bun run aw workspace --help`
Expected: Shows create, create-d1, list, delete

Run: `bun run aw db --help`
Expected: Shows migrate, generate, push, studio, seed, reset, empty

Run: `bun run aw admin --help`
Expected: Shows create-super-admin, create-api-key, rotate-db-password, generate-email-key

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(cli): complete aw CLI, remove old standalone scripts, update docs"
```

---

### Task 8: Final verification and quality gates

**Files:** None (verification only)

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass including new D1 migration tests

**Step 3: Verify key commands work end-to-end (local)**

Run: `bun run aw db reset`
Expected: Resets local SQLite database, pushes schema, seeds data

Run: `bun run aw workspace list`
Expected: Lists seeded workspaces

Run: `bun run aw admin generate-email-key`
Expected: Prints encryption key

**Step 4: Commit any formatting fixes**

If quality gates made changes:
```bash
git add -A
git commit -m "style: format cli files"
```
