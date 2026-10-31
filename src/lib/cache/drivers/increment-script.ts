/**
 * Lua for `CacheDriver.increment`: INCR, then set the TTL only on the first
 * increment, in one atomic step. Shared by the Redis and Upstash drivers.
 */
export const INCREMENT_WITH_TTL_SCRIPT = `
local value = redis.call('INCR', KEYS[1])
if value == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return value
`;
