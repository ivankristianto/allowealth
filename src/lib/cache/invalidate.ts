import { getCacheManager } from './cache-manager';

export type InvalidationPolicy = 'strict' | 'best-effort';

/**
 * Shared cache invalidation helper with explicit policy control.
 * - strict: rethrow cache errors to preserve current transactional behavior.
 * - best-effort: swallow cache errors to keep primary operation successful.
 */
export async function invalidateTags(
  tags: string[],
  policy: InvalidationPolicy = 'best-effort'
): Promise<void> {
  const uniqueTags = Array.from(new Set(tags.filter((tag) => tag && tag.trim() !== '')));
  if (uniqueTags.length === 0) return;

  const cache = getCacheManager();

  try {
    await cache.invalidateByTags(uniqueTags);
  } catch (error) {
    if (policy === 'strict') {
      throw error;
    }
  }
}
