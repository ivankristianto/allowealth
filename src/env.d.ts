/// <reference types="astro/client" />

import type { User, Session } from '@/lib/auth/lucia';
import type { UserSettings } from '@/lib/constants/user-meta-keys';
import type { PerfCollector } from '@/lib/perf';

declare global {
  namespace App {
    interface Locals {
      user?: User | null;
      session?: Session | null;
      userSettings?: UserSettings;
      cspNonce?: string;
      csrfToken?: string;
      perf?: PerfCollector;
      serverTimings?: Record<string, number>;
    }
  }

  interface Window {
    showToast?: (message: string, type?: string, duration?: number) => HTMLDivElement | undefined;
  }

  /// <reference types="vite/client" />
  interface ImportMetaEnv {
    /** Base URL for API endpoints (default: /api) */
    readonly PUBLIC_API_URL?: string;

    // Cache configuration
    readonly CACHE_DRIVER?: 'upstash' | 'memory' | 'none';
    readonly UPSTASH_REDIS_REST_URL?: string;
    readonly UPSTASH_REDIS_REST_TOKEN?: string;

    // Performance debugging
    /** Enable Server-Timing header for performance metrics (default: false) */
    readonly PERF_DEBUG?: string;

    // Logging
    /** Log verbosity: silent | fatal | error | warn | log | info | debug | trace | verbose */
    readonly LOG_LEVEL?: string;

    // Email configuration
    /** Email mode: 'console' for development logging, 'real' for provider sending */
    readonly EMAIL_MODE?: 'console' | 'real';
    /** Email provider: 'resend' or 'sendgrid' */
    readonly EMAIL_PROVIDER?: 'resend' | 'sendgrid';
    /** API key from your email provider dashboard */
    readonly EMAIL_API_KEY?: string;
    /** Sender display name */
    readonly EMAIL_SENDER_NAME?: string;
    /** Verified sender email address */
    readonly EMAIL_SENDER_ADDRESS?: string;

    // Cloudflare Turnstile (Bot Protection)
    /** Public site key for Turnstile widget (client-side) */
    readonly PUBLIC_TURNSTILE_SITE_KEY: string;
    /** Secret key for server-side Turnstile token verification */
    readonly TURNSTILE_SECRET_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * Astro type declarations
 *
 * This file extends TypeScript to recognize .astro files as modules.
 */

declare module '*.astro' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

declare module '*.astro?client' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

declare module '*.astro?server' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

export {};
