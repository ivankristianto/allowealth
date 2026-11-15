import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { describeAppPasswordToken, type TokenInfo } from '@/lib/app-password-access';
import type { ToolContext } from './types.js';

export const tokenInfoTool: Tool = {
  name: 'get_token_info',
  description:
    'Describe the token this connection uses. For an app password: its name, preset, permissions, write limits, expiry and rate limit. For OAuth: the permissions it holds. Call it first to learn what you may do.',
  inputSchema: { type: 'object', properties: {} },
};

/** Null when the app password was revoked between authentication and this lookup. */
async function describeToken(ctx: ToolContext): Promise<TokenInfo | null> {
  const { kind, userId, tokenId, permissions } = ctx.auth;
  if (kind === 'oauth') return { kind, permissions };
  const token = await ctx.services.appPassword.findForUser(userId, tokenId);
  return token && describeAppPasswordToken(token, permissions, ctx.rateLimit);
}

export async function handleGetTokenInfo(_args: Record<string, unknown>, ctx: ToolContext) {
  const info = await describeToken(ctx);
  if (!info) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: 'This app password is no longer valid.' }],
    };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
}
