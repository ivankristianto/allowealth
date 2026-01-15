/// <reference types="astro/client" />

interface AstroLocals {
  user?: any & {
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

declare namespace Astro {
  interface Locals extends AstroLocals {}
}
