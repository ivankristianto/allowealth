import type { APIRoute } from 'astro';
import { db } from '@/db';
import { validateMcpToken } from '@/lib/mcp-auth';
import { checkMcpRateLimit } from '@/lib/mcp-rate-limit';
import { createRateLimitResponse } from '@/lib/rate-limit';
import { createServices } from '@mcp-server/context';
import { registerTools, handleToolCall } from '@mcp-server/tools/index';
import type { ToolContext } from '@mcp-server/tools/types';

const MAX_BODY_BYTES = 65_536;

/**
 * Extract bearer token from Authorization header.
 * Expected format: "Bearer <oauth-token>"
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/** JSON-RPC 2.0 request shape */
interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response shape */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Build an HTTP error response (non-JSON-RPC) */
function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readValidatedBodyText(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength) {
    const parsedLength = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_BODY_BYTES) {
      return null;
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return '';
  }

  const decoder = new TextDecoder();
  let bodyText = '';
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      bodyText += decoder.decode();
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }

    bodyText += decoder.decode(value, { stream: true });
  }

  if (totalBytes > MAX_BODY_BYTES) {
    return null;
  }

  return bodyText;
}

/**
 * Dispatch a JSON-RPC message to the appropriate MCP handler.
 * Supports: initialize, tools/list, tools/call, notifications/initialized, ping.
 */
async function dispatchMcpMessage(
  message: JsonRpcRequest,
  ctx: ToolContext
): Promise<JsonRpcResponse | null> {
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

    case 'ping':
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {},
      };

    case 'notifications/initialized':
      // Notifications don't need a JSON-RPC response
      return null;

    default:
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      };
  }
}

/**
 * POST /api/mcp - MCP JSON-RPC 2.0 endpoint
 *
 * Authenticates via Bearer token (OAuth token), builds a per-request ToolContext,
 * and dispatches JSON-RPC messages to the MCP tool handlers.
 */
export const POST: APIRoute = async (context) => {
  const accessToken = extractBearerToken(context.request);
  if (!accessToken) {
    return errorResponse(401, 'Missing Authorization header. Use: Bearer <oauth-token>');
  }

  const bodyText = await readValidatedBodyText(context.request);
  if (bodyText === null) {
    return errorResponse(413, 'Request body too large');
  }

  const auth = await validateMcpToken(accessToken);
  if (!auth) {
    return errorResponse(401, 'Invalid or expired OAuth token');
  }

  const rateLimit = await checkMcpRateLimit(accessToken);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit, 'Too many MCP requests. Please try again later.');
  }

  // Build per-request ToolContext with fresh DB connection and service instances
  const services = createServices(db);
  const ctx: ToolContext = { auth, services };

  let body: JsonRpcRequest;
  try {
    body = JSON.parse(bodyText) as JsonRpcRequest;
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  if (!body.method) {
    return errorResponse(400, 'Missing "method" field in JSON-RPC request');
  }

  const result = await dispatchMcpMessage(body, ctx);

  // Notifications (no id) get 204 No Content
  if (!result) {
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetTime),
    },
  });
};

/** Reject all non-POST methods */
export const ALL: APIRoute = async () => {
  return errorResponse(405, 'Method not allowed. Use POST.');
};
