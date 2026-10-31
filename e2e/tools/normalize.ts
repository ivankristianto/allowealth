/**
 * Remove markup that legitimately varies between runs or between Astro
 * versions, so a snapshot diff surfaces whitespace and structure only.
 *
 * Deliberately does NOT collapse whitespace: whitespace is what we measure.
 */
export function normalizeHtml(html: string): string {
  return (
    html
      // Per-request CSP nonce
      .replace(/nonce="[^"]*"/g, 'nonce="NONCE"')
      // CSRF tokens in hidden inputs
      .replace(/(name="(?:_csrf|csrfToken|csrf_token)"\s+value=")[^"]*"/gi, '$1CSRF"')
      // Astro scoped-style hashes: class="astro-abc123" / data-astro-cid-abc123
      .replace(/astro-[a-z0-9]{6,}/gi, 'astro-HASH')
      .replace(/data-astro-cid-[a-z0-9]{6,}/gi, 'data-astro-cid-HASH')
      // Hashed asset filenames
      .replace(/\.([A-Za-z0-9_-]{8})\.(js|css)/g, '.HASH.$2')
      // Absolute timestamps and ISO dates
      .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, 'TIMESTAMP')
      // Session/request ids Astro or Better Auth may embed.
      // Capturing group: a non-capturing (?:...) would leave $1 undefined.
      .replace(/"(sessionId|requestId)":"[^"]*"/g, '"$1":"ID"')
  );
}
