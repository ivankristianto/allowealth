import { getCacheManager } from './cache-manager';

/**
 * Invalidates cache entries by tag. App cache drivers log and swallow backend errors, so a cache
 * outage never fails the write that triggered it.
 */
export async function invalidateTags(tags: string[]): Promise<void> {
  const uniqueTags = Array.from(new Set(tags.filter((tag) => tag && tag.trim() !== '')));
  if (uniqueTags.length === 0) return;

  await getCacheManager().invalidateByTags(uniqueTags);
}
