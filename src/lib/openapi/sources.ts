/**
 * The spec YAML inlined into the server bundle at build time; the runtime image
 * ships `dist/` only, so the files cannot be read from disk in production.
 * Keys are repo-relative paths such as `openapi/paths/recurring.yml`.
 */
export function loadOpenApiSources(): Record<string, string> {
  const modules = import.meta.glob<string>(['/openapi.yml', '/openapi/**/*.yml'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  return Object.fromEntries(
    Object.entries(modules).map(([path, text]) => [path.replace(/^\//, ''), text])
  );
}
