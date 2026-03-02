/**
 * Security Headers Middleware
 *
 * Adds Content-Security-Policy (with nonce-based script allowlisting),
 * X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and
 * Referrer-Policy headers to every response. For HTML responses, injects
 * nonce attributes into all <script> tags so they pass CSP validation.
 */

import type { MiddlewareHandler } from 'astro';
import type { PerfCollector } from '@/lib/perf';

const isDev = import.meta.env.DEV;

// ---------- CSP directives ----------

const CSP_DIRECTIVES_PROD = {
  'default-src': "'self'",
  'script-src': "'self' https://challenges.cloudflare.com",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'img-src': "'self' data: https:",
  'font-src': "'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  'connect-src': "'self' https://challenges.cloudflare.com",
  'frame-src': 'https://challenges.cloudflare.com',
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'object-src': "'none'",
  'report-to': "'csp-endpoint'",
} as const;

const CSP_DIRECTIVES_DEV = {
  ...CSP_DIRECTIVES_PROD,
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
} as const;

// ---------- Helpers ----------

/** Generate a cryptographically random nonce (base64, 16 bytes) */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/** Serialize CSP directives into a header string, adding nonce in production */
function buildCSPHeader(nonce: string): string {
  const directives = isDev ? CSP_DIRECTIVES_DEV : CSP_DIRECTIVES_PROD;

  return Object.entries(directives)
    .map(([directive, source]) => {
      if (!isDev && directive === 'script-src') {
        return `${directive} ${source} 'nonce-${nonce}'`;
      }
      return `${directive} ${source}`;
    })
    .join('; ');
}

/** Add nonce attribute to every <script> tag that doesn't already have one */
function injectScriptNonces(html: string, nonce: string): string {
  return html.replace(/<script(?![^>]*\bnonce\b)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
}

/** Set common security headers on a Headers object */
function setSecurityHeaders(headers: Headers, nonce: string): void {
  headers.set('Content-Security-Policy', buildCSPHeader(nonce));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/** Clone response headers into a new mutable Headers object, preserving multiple Set-Cookie values */
function cloneHeaders(response: Response): Headers {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return; // handled below
    headers.set(key, value);
  });
  // Set-Cookie must use append to preserve multiple values
  for (const cookie of response.headers.getSetCookie()) {
    headers.append('Set-Cookie', cookie);
  }
  return headers;
}

// ---------- Middleware ----------

export const securityHeaders: MiddlewareHandler = async (context, next) => {
  const nonce = generateNonce();
  context.locals.cspNonce = nonce;

  const response = await next();
  const contentType = response.headers.get('Content-Type') || '';

  // Fast path: JSON/API responses — set headers without body processing
  if (contentType.includes('application/json') || contentType.includes('application/octet')) {
    const headers = cloneHeaders(response);
    setSecurityHeaders(headers, nonce);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // On Cloudflare Workers, use HTMLRewriter for streaming nonce injection
  // (avoids buffering entire HTML body + regex scan — saves ~5-15ms CPU)
  const isWorkers =
    typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

  if (isWorkers) {
    return applySecurityHeadersStreaming(response, nonce);
  }

  const perf = context.locals.perf as PerfCollector | undefined;
  return applySecurityHeaders(response, nonce, perf);
};

/**
 * Workers-optimized: use HTMLRewriter for streaming nonce injection.
 * No body buffering, no regex — processes HTML as a stream.
 */
function applySecurityHeadersStreaming(response: Response, nonce: string): Response {
  const contentType = response.headers.get('Content-Type') || '';
  const mightBeHtml = contentType === '' || contentType.includes('text/html');

  if (mightBeHtml && typeof (globalThis as any).HTMLRewriter !== 'undefined') {
    const HtmlRewriter = (globalThis as any).HTMLRewriter;
    const rewriter = new HtmlRewriter().on('script:not([nonce])', {
      element(el: any) {
        el.setAttribute('nonce', nonce);
      },
    });

    const rewritten = rewriter.transform(response);
    setSecurityHeaders(rewritten.headers, nonce);
    return rewritten;
  }

  // Non-HTML on Workers: clone headers to avoid immutable-header exceptions
  const headers = cloneHeaders(response);
  setSecurityHeaders(headers, nonce);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Check if body starts with an HTML doctype or html tag (case-insensitive, ignoring leading whitespace) */
function looksLikeHtml(body: string): boolean {
  // Find first non-whitespace character index
  let i = 0;
  while (
    i < body.length &&
    (body[i] === ' ' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t')
  ) {
    i++;
  }
  // Check first ~20 chars case-insensitively instead of lowercasing the entire body
  const prefix = body.slice(i, i + 20).toLowerCase();
  return prefix.startsWith('<!doctype') || prefix.startsWith('<html');
}

/**
 * Apply security headers and optionally inject nonces into HTML responses.
 * Reads the body only when Content-Type suggests HTML.
 * Used for non-Workers runtimes (Bun, Node).
 */
async function applySecurityHeaders(
  response: Response,
  nonce: string,
  perf?: PerfCollector
): Promise<Response> {
  const contentType = response.headers.get('Content-Type') || '';
  const mightBeHtml = contentType === '' || contentType.includes('text/html');

  if (mightBeHtml) {
    const readStart = performance.now();
    const body = await response.text();
    const readDuration = performance.now() - readStart;
    perf?.recordPhase('csp.readBody', readDuration);

    const isHtml = looksLikeHtml(body);

    let finalBody = body;
    if (isHtml) {
      const nonceStart = performance.now();
      finalBody = injectScriptNonces(body, nonce);
      const nonceDuration = performance.now() - nonceStart;
      perf?.recordPhase('csp.injectNonces', nonceDuration);
    }

    const headers = cloneHeaders(response);
    setSecurityHeaders(headers, nonce);

    return new Response(finalBody, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Non-HTML response — add headers without touching the body
  const headers = cloneHeaders(response);
  setSecurityHeaders(headers, nonce);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
