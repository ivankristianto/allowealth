/**
 * Render Response Utility
 *
 * Provides helpers for returning HTML or JSON responses from API endpoints.
 * Supports the `_render=html` query parameter convention for HTMX-style responses.
 *
 * Usage:
 *   const render = createRenderHelper(url);
 *   if (render.wantsHtml()) {
 *     return render.html(htmlString);
 *   }
 *   return render.json(data);
 */

export type RenderFormat = 'html' | 'json';

export const HTML_RENDER_REQUEST_HEADER = 'X-Requested-With';
export const HTML_RENDER_REQUEST_VALUE = 'XMLHttpRequest';
export const HTML_RENDER_REQUEST_REQUIRED_MESSAGE =
  'HTML partial requests require X-Requested-With: XMLHttpRequest.';

export interface RenderHelper {
  /** Check if the request wants HTML response */
  wantsHtml: () => boolean;
  /** Check if the request wants JSON response (default) */
  wantsJson: () => boolean;
  /** Get the requested format */
  getFormat: () => RenderFormat;
  /** Return an HTML response */
  html: (content: string, status?: number) => Response;
  /** Return a JSON response (uses successResponse wrapper) */
  json: (data: unknown, status?: number) => Response;
  /** Return an error response (format-aware) */
  error: (message: string, status?: number) => Response;
}

/**
 * Create a render helper for the given request URL
 * @param url - The request URL (to check for _render param)
 * @returns RenderHelper with format-aware response methods
 */
function requestedHtmlWithoutHeader(url: URL, request?: Request): boolean {
  if (url.searchParams.get('_render') !== 'html') {
    return false;
  }

  const requestedWith = request?.headers.get(HTML_RENDER_REQUEST_HEADER);
  return requestedWith?.toLowerCase() !== HTML_RENDER_REQUEST_VALUE.toLowerCase();
}

export function isRejectedHtmlRenderRequest(url: URL, request?: Request): boolean {
  return requestedHtmlWithoutHeader(url, request);
}

export function createRenderHelper(url: URL, request?: Request): RenderHelper {
  const renderParam = url.searchParams.get('_render');
  const format: RenderFormat =
    renderParam === 'html' && !requestedHtmlWithoutHeader(url, request) ? 'html' : 'json';

  return {
    wantsHtml: () => format === 'html',
    wantsJson: () => format === 'json',
    getFormat: () => format,

    html: (content: string, status = 200) => {
      return new Response(content, {
        status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    },

    json: (data: unknown, status = 200) => {
      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    },

    error: (message: string, status = 400) => {
      if (format === 'html') {
        // Return error as HTML alert
        const errorHtml = `
          <div class="alert alert-error rounded-xl" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${escapeHtml(message)}</span>
          </div>
        `;
        return new Response(errorHtml, {
          status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: { message },
        }),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    },
  };
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Check if a URL requests HTML rendering
 * Convenience function for quick checks
 */
export function wantsHtmlRender(url: URL, request?: Request): boolean {
  return createRenderHelper(url, request).wantsHtml();
}
