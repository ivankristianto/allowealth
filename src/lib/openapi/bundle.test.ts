import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundleOpenApiDocument } from '@/lib/openapi/bundle';

function fromFixtures(files: Record<string, string>) {
  return (path: string) => {
    const text = files[path];
    if (text === undefined) throw new Error(`no fixture ${path}`);
    return text;
  };
}

/** Every `$ref` in the document, which after bundling must all be local and resolvable. */
function collectRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((item) => collectRefs(item, refs));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
}

function resolveLocal(document: unknown, ref: string): unknown {
  return ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>(
      (node, segment) => (node as Record<string, unknown> | undefined)?.[segment],
      document
    );
}

const FIXTURES = {
  'openapi.yml': `
openapi: 3.1.0
info: { title: Test, version: 1.0.0 }
paths:
  /api/things/{id}:
    $ref: './openapi/paths/things.yml#/paths/~1api~1things~1{id}'
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer }
  schemas:
    Thing:
      $ref: './openapi/schemas/Thing.yml#/Thing'
`,
  'openapi/paths/things.yml': `
paths:
  /api/things/{id}:
    get:
      parameters:
        - $ref: '../parameters/common.yml#/IdParameter'
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: '../schemas/Thing.yml#/ThingResponse'
        '401':
          $ref: '../responses/common.yml#/Unauthorized'
`,
  'openapi/schemas/Thing.yml': `
Thing:
  type: object
  properties:
    children:
      type: array
      items:
        $ref: '#/Thing'
ThingResponse:
  type: object
  properties:
    data:
      $ref: '#/Thing'
`,
  'openapi/parameters/common.yml': `
IdParameter:
  name: id
  in: path
  required: true
  schema: { type: string }
`,
  'openapi/responses/common.yml': `
Unauthorized:
  description: Unauthorized
`,
};

describe('bundleOpenApiDocument', () => {
  const bundled = bundleOpenApiDocument(fromFixtures(FIXTURES)) as {
    paths: Record<string, { get: Record<string, unknown> }>;
    components: Record<string, Record<string, unknown>>;
  };

  test('inlines path items and decodes ~1 in pointers', () => {
    expect(bundled.paths['/api/things/{id}'].get).toBeDefined();
  });

  test('hoists schemas, parameters and responses into components', () => {
    expect(Object.keys(bundled.components.schemas).sort()).toEqual(['Thing', 'ThingResponse']);
    expect(bundled.components.parameters.IdParameter).toMatchObject({ name: 'id' });
    expect(bundled.components.responses.Unauthorized).toMatchObject({
      description: 'Unauthorized',
    });
    expect(bundled.components.securitySchemes.bearerAuth).toMatchObject({ scheme: 'bearer' });
  });

  test('rewrites same-file and cross-file refs to local component refs', () => {
    expect(bundled.components.schemas.Thing).toMatchObject({
      properties: { children: { items: { $ref: '#/components/schemas/Thing' } } },
    });
    const broken = collectRefs(bundled).filter(
      (ref) => !ref.startsWith('#/') || resolveLocal(bundled, ref) === undefined
    );
    expect(broken).toEqual([]);
  });

  test('throws on a ref to a missing pointer', () => {
    const broken = {
      ...FIXTURES,
      'openapi/schemas/Thing.yml': 'Thing: { $ref: "#/Missing" }\nThingResponse: { type: object }',
    };
    expect(() => bundleOpenApiDocument(fromFixtures(broken))).toThrow('Unresolved OpenAPI $ref');
  });

  test('throws on a ref to a missing file', () => {
    const broken = {
      ...FIXTURES,
      'openapi.yml': FIXTURES['openapi.yml'].replace('things.yml', 'nope.yml'),
    };
    expect(() => bundleOpenApiDocument(fromFixtures(broken))).toThrow('OpenAPI source not found');
  });
});

describe('the repository spec', () => {
  test('bundles with every ref local and resolvable', () => {
    const document = bundleOpenApiDocument((path) =>
      readFileSync(join(process.cwd(), path), 'utf8')
    );

    expect(Object.keys(document.paths as object).length).toBeGreaterThan(50);
    const broken = [...new Set(collectRefs(document))].filter(
      (ref) => !ref.startsWith('#/') || resolveLocal(document, ref) === undefined
    );
    expect(broken).toEqual([]);
  });
});
