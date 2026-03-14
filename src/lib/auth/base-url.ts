import { getEnv } from '@/lib/env';

export function getDevelopmentBaseURL(): string {
  const devHost = getEnv('DEV_HOST');
  const port = getEnv('PORT') ?? '4321';
  return `http://${devHost || 'localhost'}:${port}`;
}

export function getAuthBaseURL(): string {
  return getEnv('PUBLIC_URL') ?? getDevelopmentBaseURL();
}
