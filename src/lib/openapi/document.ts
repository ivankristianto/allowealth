import { bundleOpenApiDocument } from '@/lib/openapi/bundle';
import { loadOpenApiSources } from '@/lib/openapi/sources';

let cachedJson: string | null = null;

/** The bundled OpenAPI document as JSON, built on first call and kept for the process lifetime. */
export function getOpenApiJson(): string {
  if (cachedJson === null) {
    const sources = loadOpenApiSources();
    const document = bundleOpenApiDocument((path) => {
      const text = sources[path];
      if (text === undefined) throw new Error(`Missing OpenAPI source: ${path}`);
      return text;
    });
    cachedJson = JSON.stringify(document);
  }
  return cachedJson;
}
