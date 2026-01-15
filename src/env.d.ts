/// <reference types="astro/client" />

import type { User } from 'lucia';

declare global {
  namespace Astro {
    interface Locals {
      user?: User & {
        attributes?: {
          name?: string;
        };
      };
      session?: {
        userId: string;
        expiresAt: Date;
        fresh: boolean;
      };
      cspNonce?: string;
    }
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
