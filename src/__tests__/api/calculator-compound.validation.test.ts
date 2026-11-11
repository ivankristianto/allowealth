import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { workspaceMetaService } from '@/services';

let POST: any;

const originalGetCurrency = workspaceMetaService.getCurrency;

function expectNormalizedIssue(issue: any, path: string[]) {
  expect(issue.path).toEqual(path);
  expect(typeof issue.message).toBe('string');
  expect(typeof issue.code).toBe('string');
}

function createApiContext(
  body: unknown,
  {
    html = false,
    xhr = html,
    signedIn = true,
  }: { html?: boolean; xhr?: boolean; signedIn?: boolean } = {}
) {
  const url = new URL(`http://localhost/api/calculators/compound${html ? '?_render=html' : ''}`);
  return {
    url,
    request: new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(xhr ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
      },
      body: JSON.stringify(body),
    }),
    locals: {
      user: signedIn
        ? {
            id: 'user-1',
            workspaceId: 'workspace-1',
            role: 'member',
          }
        : null,
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

  describe('?_render=html', () => {
    it('renders the results partial instead of JSON', async () => {
      workspaceMetaService.getCurrency = mock(async () => 'IDR') as any;

      const response = await POST(
        createApiContext({ principal: 1000, rate: 10, years: 2 }, { html: true })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      // bun:test cannot compile .astro, so the container echoes the component path
      expect(await response.text()).toContain('CalculatorResultsPartial');
    });

    it('returns the first validation message as an HTML alert', async () => {
      workspaceMetaService.getCurrency = mock(async () => 'IDR') as any;

      const response = await POST(
        createApiContext({ principal: 1000, rate: 10, years: 51 }, { html: true })
      );
      const html = await response.text();

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      expect(html).toContain('role="alert"');
      expect(html).toContain('Years must be at most 50');
    });

    it('returns an HTML alert with 401 when signed out', async () => {
      const response = await POST(
        createApiContext({ principal: 1000, rate: 10, years: 2 }, { html: true, signedIn: false })
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toContain('Unauthorized');
    });

    it('rejects HTML requests without X-Requested-With', async () => {
      const response = await POST(
        createApiContext({ principal: 1000, rate: 10, years: 2 }, { html: true, xhr: false })
      );

      expect(response.status).toBe(403);
    });
  });
});
