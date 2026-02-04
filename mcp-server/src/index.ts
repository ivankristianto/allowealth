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
