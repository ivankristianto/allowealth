/// <reference types="astro/client" />

import type { User, Session } from '@/lib/auth/lucia';

declare global {
  namespace App {
    interface Locals {
      user?: User | null;
      session?: Session | null;
      cspNonce?: string;
    }
  }

  interface Window {
    showToast?: (message: string, type?: string, duration?: number) => HTMLDivElement | undefined;
  }

  /// <reference types="vite/client" />
  interface ImportMetaEnv {
    /** Base URL for API endpoints (default: /api) */
    readonly PUBLIC_API_URL?: string;
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
