/**
 * Security Headers Middleware
 *
 * Adds Content-Security-Policy (with nonce-based script allowlisting),
 * X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and
 * Referrer-Policy headers to every response. For HTML responses, injects
 * nonce attributes into all <script> tags so they pass CSP validation.
 */

import type { MiddlewareHandler } from 'astro';

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
  return applySecurityHeaders(response, nonce);
};

/**
 * Apply security headers and optionally inject nonces into HTML responses.
 * Reads the body only when Content-Type suggests HTML.
 */
async function applySecurityHeaders(response: Response, nonce: string): Promise<Response> {
  const contentType = response.headers.get('Content-Type') || '';
  const mightBeHtml = contentType === '' || contentType.includes('text/html');

  if (mightBeHtml) {
    const body = await response.text();
    const trimmed = body.trimStart().toLowerCase();
    const isHtml = trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
    const finalBody = isHtml ? injectScriptNonces(body, nonce) : body;

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
