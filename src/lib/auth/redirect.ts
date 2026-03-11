/**
 * Normalize post-auth redirect targets to same-origin relative paths.
 *
 * Reject protocol-relative, backslash-based, and encoded leading slash/backslash
 * variants so auth flows cannot be turned into open redirects.
 */
export function sanitizePostAuthRedirect(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    lower.startsWith('/%2f') ||
    lower.startsWith('/%5c')
  ) {
    return '';
  }

  try {
    const normalized = new URL(trimmed, 'http://allowealth.local');

    if (normalized.origin !== 'http://allowealth.local') {
      return '';
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return '';
  }
}

export const GOOGLE_AUTH_ALLOWED_ORIGINS = ['https://accounts.google.com'] as const;

interface ClientAuthNavigationOptions {
  currentOrigin: string;
  allowedExternalOrigins?: readonly string[];
}

/**
 * Normalize auth result URLs before navigating on the client.
 *
 * Same-origin destinations are collapsed to path/search/hash form.
 * External destinations are allowed only when their origin is explicitly allowlisted.
 */
export function sanitizeClientAuthNavigationTarget(
  value: string | null | undefined,
  options: ClientAuthNavigationOptions
): string {
  if (!value) {
    return '';
  }

  try {
    const target = new URL(value.trim(), options.currentOrigin);

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return '';
    }

    if (target.origin === options.currentOrigin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }

    if (options.allowedExternalOrigins?.includes(target.origin)) {
      return target.toString();
    }

    return '';
  } catch {
    return '';
  }
}
