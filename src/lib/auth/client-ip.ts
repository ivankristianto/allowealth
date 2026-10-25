import { getEnv } from '@/lib/env';

/**
 * Internal header carrying the client IP to Better Auth.
 *
 * Better Auth only sees request headers, never the socket, so its rate limiter
 * keys on whatever header it is told to trust. Any header a client can send
 * (`cf-connecting-ip`, a single-value `x-forwarded-for`) lets an attacker pick a
 * fresh rate-limit bucket per request. The auth route strips this header from
 * the incoming request and sets it itself.
 */
export const INTERNAL_IP_HEADER = 'x-allowealth-client-ip';

/**
 * Header a reverse proxy sets to the real client IP, from `CLIENT_IP_HEADER`
 * (e.g. `cf-connecting-ip` behind Cloudflare, `x-real-ip` behind nginx).
 *
 * Only safe when the app is reachable exclusively through that proxy: anyone
 * who can connect directly can send the header with any value.
 */
export function getClientIpHeader(): string | undefined {
  const header = getEnv('CLIENT_IP_HEADER')?.trim().toLowerCase();
  return header || undefined;
}

/**
 * Pick the client IP for rate limiting.
 *
 * Uses the configured proxy header when it holds a single value, otherwise the
 * connection address. `clientAddress` must be the socket peer: Astro reports
 * the leftmost `x-forwarded-for` entry instead when `security.allowedDomains`
 * is set, which a client controls.
 */
export function resolveClientIp(
  headers: Headers,
  clientAddress: string | undefined,
  clientIpHeader: string | undefined
): string | undefined {
  const forwarded = clientIpHeader ? headers.get(clientIpHeader)?.trim() : undefined;
  if (forwarded && !forwarded.includes(',')) {
    return forwarded;
  }

  return clientAddress;
}

/**
 * Return a copy of `request` whose {@link INTERNAL_IP_HEADER} is set by the
 * server. A client-supplied value is always dropped; when no client IP can be
 * resolved the header is left unset.
 */
export function withClientIpHeader(
  request: Request,
  clientAddress: string | undefined,
  clientIpHeader: string | undefined = getClientIpHeader()
): Request {
  const headers = new Headers(request.headers);
  headers.delete(INTERNAL_IP_HEADER);

  const clientIp = resolveClientIp(request.headers, clientAddress, clientIpHeader);
  if (clientIp) {
    headers.set(INTERNAL_IP_HEADER, clientIp);
  }

  // Not `new Request(request, { headers })`: Bun merges those headers into the
  // original ones, so a deleted client-supplied header would survive.
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    signal: request.signal,
    redirect: request.redirect,
  });
}
