import type { APIRoute } from 'astro';
import { db } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';
import type { ApiKeyContext } from '@/services/api-key.service';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
import { createServices } from '@mcp-server/context';
import { registerTools, handleToolCall } from '@mcp-server/tools/index';
import type { ToolContext } from '@mcp-server/tools/types';

/** Cache validated API key auth context for 5 minutes to avoid PBKDF2 per-request */
const API_KEY_CACHE_TTL = 300;

/**
 * Extract bearer token from Authorization header.
 * Expected format: "Bearer aw_..."
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/**
 * Validate an API key with caching to avoid expensive PBKDF2 hashing on every request.
 * Uses the key prefix (first 8 chars) as the cache lookup key.
 */
async function validateApiKeyWithCache(apiKey: string): Promise<ApiKeyContext | null> {
  if (!apiKey.startsWith('aw_')) return null;

  const prefix = apiKey.slice(0, 8);
  const cacheKey = CacheKeys.apiKey(prefix);
  const cache = getCacheManager();

  // Check cache first
  const cached = await cache.get<ApiKeyContext>(cacheKey);
  if (cached) return cached;

  // Cache miss: perform full PBKDF2 validation
  const service = new ApiKeyService(db);
  const result = await service.validate(apiKey);
  if (!result) return null;

  // Cache the validated auth context
  await cache.set(cacheKey, result, {
    ttl: API_KEY_CACHE_TTL,
    tags: [CacheTags.API_KEYS, `apikey:${prefix}`],
  });

  return result;
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

/** Build a JSON response with proper content-type */
function jsonResponse(body: JsonRpcResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build an HTTP error response (non-JSON-RPC) */
function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
 * Authenticates via Bearer token (API key), builds a per-request ToolContext,
 * and dispatches JSON-RPC messages to the MCP tool handlers.
 */
export const POST: APIRoute = async (context) => {
  const apiKey = extractBearerToken(context.request);
  if (!apiKey) {
    return errorResponse(401, 'Missing Authorization header. Use: Bearer aw_...');
  }

  const auth = await validateApiKeyWithCache(apiKey);
  if (!auth) {
    return errorResponse(401, 'Invalid API key');
  }

  // Build per-request ToolContext with fresh DB connection and service instances
  const services = createServices(db);
  const ctx: ToolContext = { auth, services };

  let body: JsonRpcRequest;
  try {
    body = await context.request.json();
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

  return jsonResponse(result);
};

/** Reject all non-POST methods */
export const ALL: APIRoute = async () => {
  return errorResponse(405, 'Method not allowed. Use POST.');
};
