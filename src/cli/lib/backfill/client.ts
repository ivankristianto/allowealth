export interface ClientOptions {
  baseUrl: string;
  email: string;
  password: string;
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
}

const PAGE_SIZE = 100;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authenticated REST client for the app's own API.
 *
 * Everything the backfill writes goes through the public API rather than the
 * database, so the same validation, ownership and audit rules apply.
 */
export class BackfillClient {
  private readonly fetchImpl: typeof fetch;
  private readonly retryDelayMs: number;
  private readonly cookies = new Map<string, string>();

  constructor(private readonly opts: ClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.retryDelayMs = opts.retryDelayMs ?? 500;
  }

  private absorbCookies(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(';')[0] ?? '';
      const index = pair.indexOf('=');
      if (index <= 0) continue;
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  }

  private cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async signIn(): Promise<void> {
    this.cookies.clear();

    const signIn = await this.fetchImpl(`${this.opts.baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.opts.email, password: this.opts.password }),
    });
    if (!signIn.ok) {
      throw new HttpError(
        `Sign-in failed (${signIn.status}): ${await signIn.text()}`,
        signIn.status
      );
    }
    this.absorbCookies(signIn);

    // The CSRF cookie is minted by a page render, not by the sign-in endpoint.
    const page = await this.fetchImpl(`${this.opts.baseUrl}/dashboard`, {
      headers: { cookie: this.cookieHeader() },
    });
    this.absorbCookies(page);

    if (!this.cookies.has('csrf_token')) {
      throw new Error('Signed in but no csrf_token cookie was issued; cannot make writes.');
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let reauthenticated = false;

    for (let attempt = 0; ; attempt++) {
      const headers: Record<string, string> = {
        cookie: this.cookieHeader(),
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        // The cookie is percent-encoded; the server compares the decoded value.
        const token = this.cookies.get('csrf_token');
        if (token) headers['X-CSRF-Token'] = decodeURIComponent(token);
      }

      let response: Response;
      try {
        response = await this.fetchImpl(`${this.opts.baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (attempt >= MAX_RETRIES) throw error;
        await sleep(this.retryDelayMs * (attempt + 1));
        continue;
      }

      this.absorbCookies(response);

      if ((response.status === 401 || response.status === 403) && !reauthenticated) {
        reauthenticated = true;
        await this.signIn();
        continue;
      }

      if (response.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          throw new HttpError(
            `${method} ${path} failed (${response.status}): ${await response.text()}`,
            response.status
          );
        }
        await sleep(this.retryDelayMs * (attempt + 1));
        continue;
      }

      const text = await response.text();
      let parsed: ApiEnvelope<T> | null = null;
      try {
        parsed = text === '' ? null : (JSON.parse(text) as ApiEnvelope<T>);
      } catch {
        parsed = null;
      }

      if (!response.ok || parsed?.success === false) {
        const message = parsed?.error?.message ?? text ?? response.statusText;
        throw new HttpError(
          `${method} ${path} failed (${response.status}): ${message}`,
          response.status
        );
      }

      return (parsed?.data ?? parsed) as T;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  del<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /** Pages past the API's 100-row cap, which silently truncates a busy month. */
  async getAll<T>(path: string, key: string): Promise<T[]> {
    const separator = path.includes('?') ? '&' : '?';
    const rows: T[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await this.get<Record<string, T[]>>(
        `${path}${separator}limit=${PAGE_SIZE}&offset=${offset}`
      );
      const batch = page?.[key] ?? [];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) return rows;
    }
  }
}
