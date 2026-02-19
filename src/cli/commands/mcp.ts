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
