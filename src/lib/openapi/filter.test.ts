import { describe, expect, test } from 'bun:test';
import { filterOpenApiForAppPassword } from '@/lib/openapi/filter';

const operation = (summary: string) => ({ summary, responses: {} });

function sampleDocument() {
  return {
    openapi: '3.1.0',
    info: { title: 'Sample', version: '1' },
    paths: {
      '/api/openapi.json': { get: operation('document') },
      '/api/transactions': {
        summary: 'Transactions',
        get: operation('list'),
        post: operation('create'),
      },
      '/api/transactions/{id}': {
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        get: operation('read'),
        put: operation('update'),
        delete: operation('delete'),
      },
      '/api/accounts': { get: operation('accounts') },
      '/api/user/profile': { get: operation('profile') },
    },
    components: { parameters: { IdParameter: { name: 'id', in: 'path' } } },
  };
}

describe('filterOpenApiForAppPassword', () => {
  test('keeps the operations the permissions allow, with their path-level fields', () => {
    const filtered = filterOpenApiForAppPassword(sampleDocument(), ['transactions:read']);

    expect(filtered.paths).toEqual({
      '/api/openapi.json': { get: operation('document') },
      '/api/transactions': { summary: 'Transactions', get: operation('list') },
      '/api/transactions/{id}': {
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        get: operation('read'),
      },
    });
  });

  test('drops paths left without an operation and keeps everything outside paths', () => {
    const document = sampleDocument();

    const filtered = filterOpenApiForAppPassword(document, []);

    expect(Object.keys(filtered.paths)).toEqual(['/api/openapi.json']);
    expect(filtered.components).toBe(document.components);
    expect(filtered.info).toBe(document.info);
  });

  test('an operation outside the allowlist stays out, whatever the grants', () => {
    const filtered = filterOpenApiForAppPassword(sampleDocument(), ['transactions:read']);
    const all = filterOpenApiForAppPassword(sampleDocument(), [
      'transactions:read',
      'transactions:create',
      'transactions:update',
      'transactions:delete',
      'accounts:read',
    ]);

    expect(filtered.paths['/api/user/profile']).toBeUndefined();
    expect(all.paths['/api/user/profile']).toBeUndefined();
    expect(Object.keys(all.paths['/api/transactions/{id}'])).toEqual([
      'parameters',
      'get',
      'put',
      'delete',
    ]);
  });

  test('leaves the shared document untouched', () => {
    const document = sampleDocument();
    const snapshot = structuredClone(document);

    filterOpenApiForAppPassword(document, []);

    expect(document).toEqual(snapshot);
  });
});
