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
