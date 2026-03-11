import { describe, expect, test } from 'bun:test';
import { createRenderHelper } from './renderResponse';

describe('createRenderHelper', () => {
  test('treats html render requests without XMLHttpRequest header as non-html', async () => {
    const url = new URL('http://localhost/api/example?_render=html');
    const request = new Request(url);
    const render = createRenderHelper(url, request);

    expect(render.wantsHtml()).toBe(false);
    expect(render.wantsJson()).toBe(true);

    const response = render.error('HTML partial requests require X-Requested-With', 403);

    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('X-Requested-With');
  });

  test('allows html render requests with XMLHttpRequest header', () => {
    const url = new URL('http://localhost/api/example?_render=html');
    const request = new Request(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const render = createRenderHelper(url, request);

    expect(render.wantsHtml()).toBe(true);
    expect(render.wantsJson()).toBe(false);
  });
});
