import { bundleOpenApiDocument } from '@/lib/openapi/bundle';
import { loadOpenApiSources } from '@/lib/openapi/sources';

export interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

let cachedDocument: OpenApiDocument | null = null;
let cachedJson: string | null = null;

/** The bundled document, built on first call and shared for the process lifetime: never mutate it. */
export function getOpenApiDocument(): OpenApiDocument {
  if (cachedDocument === null) {
    const sources = loadOpenApiSources();
    cachedDocument = bundleOpenApiDocument((path) => {
      const text = sources[path];
      if (text === undefined) throw new Error(`Missing OpenAPI source: ${path}`);
      return text;
    }) as OpenApiDocument;
  }
  return cachedDocument;
}

/** The whole bundled document as JSON. */
export function getOpenApiJson(): string {
  cachedJson ??= JSON.stringify(getOpenApiDocument());
  return cachedJson;
}
