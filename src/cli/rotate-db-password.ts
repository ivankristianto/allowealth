/**
 * CLI Script: Rotate Supabase Database Password
 *
 * Updates the DATABASE_URL in .env.production with a new password
 * and optionally updates the Cloudflare Hyperdrive config.
 *
 * Usage:
 *   bun run cli:rotate-db-password                    # Reads new password from .env.production
 *   bun run cli:rotate-db-password -- --ask           # Prompts for new password
 *   bun run cli:rotate-db-password -- --hyperdrive    # Also updates Hyperdrive config
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';

const ENV_FILE = path.resolve(import.meta.dir, '../../.env.production');
const WRANGLER_TOML = path.resolve(import.meta.dir, '../../wrangler.toml');

// ============================================================================
// HELPERS
// ============================================================================

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(question);
      let value = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007F') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          value += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Parse DATABASE_URL into components
 */
function parseDatabaseUrl(url: string): {
  protocol: string;
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
} | null {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(':', ''),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.replace('/', ''),
    };
  } catch {
    return null;
  }
}

/**
 * Build DATABASE_URL from components with a new password
 */
function buildDatabaseUrl(url: string, newPassword: string): string {
  const parsed = new URL(url);
  parsed.password = newPassword; // URL API handles encoding internally
  return parsed.toString();
}

/**
 * Get the direct connection URL (port 5432) from any Supabase URL
 */
function getDirectConnectionUrl(url: string, newPassword: string): string {
  const parsed = parseDatabaseUrl(url);
  if (!parsed) throw new Error('Invalid DATABASE_URL');

  // Extract the project ref from the user (e.g., postgres.cuswjkrkspmnatxeniyd -> cuswjkrkspmnatxeniyd)
  const userParts = parsed.user.split('.');
  const projectRef = userParts.length > 1 ? userParts[1] : userParts[0];

  // Direct connection uses postgres user (no project ref prefix) on port 5432
  const directUrl = new URL(
    `postgresql://postgres@db.${projectRef}.supabase.co:5432/${parsed.database}`
  );
  directUrl.password = newPassword;
  return directUrl.toString();
}

/**
 * Read Hyperdrive ID from wrangler.toml
 */
function getHyperdriveId(): string | null {
  if (!fs.existsSync(WRANGLER_TOML)) return null;

  const content = fs.readFileSync(WRANGLER_TOML, 'utf8');
  const match = content.match(/\[\[hyperdrive\]\][\s\S]*?id\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const askForPassword = args.includes('--ask');
  const updateHyperdrive = args.includes('--hyperdrive');

  console.log('\n🔑 Supabase Database Password Rotation\n');

  // 1. Read .env.production
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env.production not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const envLines = envContent.split('\n');

  // Find active DATABASE_URL line
  const dbUrlLineIndex = envLines.findIndex(
    (line) => line.startsWith('DATABASE_URL=') && !line.startsWith('#')
  );

  if (dbUrlLineIndex === -1) {
    console.error('❌ No active DATABASE_URL found in .env.production');
    process.exit(1);
  }

  const currentUrl = envLines[dbUrlLineIndex].replace('DATABASE_URL=', '');
  const currentParsed = parseDatabaseUrl(currentUrl);

  if (!currentParsed) {
    console.error('❌ Could not parse DATABASE_URL');
    process.exit(1);
  }

  console.log(`  Host:     ${currentParsed.host}`);
  console.log(`  Port:     ${currentParsed.port}`);
  console.log(`  User:     ${currentParsed.user}`);
  console.log(`  Database: ${currentParsed.database}`);
  console.log(
    `  Password: ${'*'.repeat(currentParsed.password.length)} (${currentParsed.password.length} chars)\n`
  );

  // 2. Get new password
  let newPassword: string;

  if (askForPassword) {
    newPassword = await prompt('Enter new database password: ', true);
    if (!newPassword) {
      console.error('❌ Password cannot be empty');
      process.exit(1);
    }

    const confirm = await prompt('Confirm new password: ', true);
    if (newPassword !== confirm) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }
  } else {
    // Read from .env.production (assumes user already updated the password there)
    newPassword = currentParsed.password;
    console.log('📖 Using password from .env.production');
    console.log('   (Use --ask flag to enter a new password interactively)\n');
  }

  // 3. Update all DATABASE_URL lines in .env.production
  let updatedCount = 0;
  const updatedLines = envLines.map((line) => {
    // Match uncommented DATABASE_URL lines
    if (line.startsWith('DATABASE_URL=') && !line.startsWith('#')) {
      const url = line.replace('DATABASE_URL=', '');
      const newUrl = buildDatabaseUrl(url, newPassword);
      updatedCount++;
      return `DATABASE_URL=${newUrl}`;
    }
    // Match commented DATABASE_URL lines pointing to Supabase (update for consistency)
    if (line.startsWith('# DATABASE_URL=postgresql://') && line.includes('supabase')) {
      const url = line.replace('# DATABASE_URL=', '');
      try {
        const newUrl = buildDatabaseUrl(url, newPassword);
        updatedCount++;
        return `# DATABASE_URL=${newUrl}`;
      } catch {
        return line; // Skip if URL can't be parsed
      }
    }
    return line;
  });

  fs.writeFileSync(ENV_FILE, updatedLines.join('\n'));
  console.log(`✅ Updated ${updatedCount} DATABASE_URL(s) in .env.production`);

  // 4. Test connection
  console.log('\n🔌 Testing connection...');
  try {
    const postgres = (await import('postgres')).default;
    const testUrl = buildDatabaseUrl(currentUrl, newPassword);
    const isPooler = currentParsed.port === '6543';
    const sql = postgres(testUrl, { ssl: 'require', prepare: !isPooler });
    const result = await sql`SELECT current_database() as db, current_user as user`;
    console.log(`✅ Connected: ${result[0].db} as ${result[0].user}`);
    await sql.end();
  } catch (error: any) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.error('   The password may be incorrect. Check .env.production and try again.');
    process.exit(1);
  }

  // 5. Update Hyperdrive (optional)
  if (updateHyperdrive) {
    const hyperdriveId = getHyperdriveId();
    if (!hyperdriveId) {
      console.error('\n⚠️  No Hyperdrive config found in wrangler.toml');
    } else {
      console.log(`\n☁️  Updating Hyperdrive config (${hyperdriveId})...`);
      const directUrl = getDirectConnectionUrl(currentUrl, newPassword);
      try {
        execSync(`wrangler hyperdrive update ${hyperdriveId} --connection-string="${directUrl}"`, {
          stdio: 'inherit',
        });
        console.log('✅ Hyperdrive config updated');
      } catch {
        console.error('❌ Failed to update Hyperdrive. Run manually:');
        console.error(
          `   wrangler hyperdrive update ${hyperdriveId} --connection-string="<direct-url>"`
        );
      }
    }
  } else {
    const hyperdriveId = getHyperdriveId();
    if (hyperdriveId) {
      console.log('\n💡 Tip: Add --hyperdrive flag to also update Cloudflare Hyperdrive config');
    }
  }

  console.log('\n✅ Password rotation complete!\n');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
