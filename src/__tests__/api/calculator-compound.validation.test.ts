import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { workspaceMetaService } from '@/services';

let POST: any;

const originalGetCurrency = workspaceMetaService.getCurrency;

function expectNormalizedIssue(issue: any, path: string[]) {
  expect(issue.path).toEqual(path);
  expect(typeof issue.message).toBe('string');
  expect(typeof issue.code).toBe('string');
}

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/calculators/compound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'workspace-1',
        role: 'member',
      },
    },
  } as any;
}

describe('POST /api/calculators/compound validation', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/calculators/compound'));
  });

  afterEach(() => {
    workspaceMetaService.getCurrency = originalGetCurrency;
  });

  it('returns normalized validation details for invalid calculator input', async () => {
    workspaceMetaService.getCurrency = mock(async () => 'IDR') as any;

    const response = await POST(
      createApiContext({
        principal: -1,
        rate: 10,
        years: 5,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['principal']);
  });

  it('still accepts valid calculator input', async () => {
    workspaceMetaService.getCurrency = mock(async () => 'IDR') as any;

    const response = await POST(
      createApiContext({
        principal: 1000,
        rate: 10,
        years: 2,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.totalInterest).toBeCloseTo(210, 5);
    expect(payload.data.finalBalance).toBeCloseTo(1210, 5);
    expect(payload.data.currency).toBe('IDR');
  });
});
