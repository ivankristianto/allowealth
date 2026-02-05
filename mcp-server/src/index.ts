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
