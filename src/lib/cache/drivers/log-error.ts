const UPSTASH_COMMAND_SUFFIX = ', command was:';

/**
 * Error text that is safe to log. Cache keys and values hold session and reset
 * tokens, so this drops the command Upstash appends and the value JSON.parse quotes.
 */
export function describeCacheError(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  if (error instanceof SyntaxError) return 'SyntaxError: cached value is not valid JSON';
  const commandAt = error.message.indexOf(UPSTASH_COMMAND_SUFFIX);
  const message = commandAt === -1 ? error.message : error.message.slice(0, commandAt);
  return `${error.name}: ${message}`;
}
