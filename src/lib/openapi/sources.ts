/**
 * The spec YAML inlined at build time, keyed by repo path (`openapi/paths/recurring.yml`).
 * The runtime image ships only `dist/`, so production can't read the files from disk.
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
