import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { describeAppPasswordToken } from '@/lib/app-password-access';
import type { ToolContext } from './types.js';

export const tokenInfoTool: Tool = {
  name: 'get_token_info',
  description:
    'Describe the token this connection uses. For an app password: its name, preset, permissions, expiry and rate limit. For OAuth: the permissions it holds. Call it first to learn what you may do.',
  inputSchema: { type: 'object', properties: {} },
};

export async function handleGetTokenInfo(_args: Record<string, unknown>, ctx: ToolContext) {
  const { kind, userId, tokenId, permissions } = ctx.auth;
  let info: unknown = { kind, permissions };

  if (kind === 'app_password') {
    const token = await ctx.services.appPassword.findForUser(userId, tokenId);
    // Revoked between authentication and this lookup.
    if (!token) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: 'This app password is no longer valid.' }],
      };
    }
    info = describeAppPasswordToken(token, permissions, ctx.rateLimit);
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
}
