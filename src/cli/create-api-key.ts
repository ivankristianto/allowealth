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
