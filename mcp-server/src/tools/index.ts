import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export function registerTools(): Tool[] {
  return [];
}

export async function handleToolCall(
  name: string,
  _args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return {
    isError: true,
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
  };
}
