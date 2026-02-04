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

    // Email configuration
    /** Email mode: 'console' for development logging, undefined for real sending */
    readonly EMAIL_MODE?: 'console';
    /** Base64-encoded 32-byte encryption key for email credentials */
    readonly EMAIL_ENCRYPTION_KEY?: string;
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
