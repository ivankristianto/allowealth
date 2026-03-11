/**
 * Rate Limiting Module
 *
 * Implements sliding window rate limiting for API endpoints.
 * Uses in-memory storage for development, can be extended to Redis for production.
 *
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - Per-IP tracking with configurable limits
 * - Standard rate limit headers (X-RateLimit-*)
 * - Automatic cleanup of expired entries
 *
 * @see https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025
 */

/**
 * Rate limit configuration for an endpoint
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom key generator (default: IP address) */
  keyGenerator?: (request: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (request: Request) => boolean;
  /** Custom message for rate limit exceeded */
  message?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the window */
  remaining: number;
  /** Maximum requests allowed */
  limit: number;
  /** Unix timestamp when the rate limit resets */
  resetTime: number;
  /** Time until reset in seconds */
  retryAfter: number;
}

/**
 * Maximum number of entries in the rate limit store
 * Prevents memory exhaustion attacks
 */
const MAX_STORE_ENTRIES = 100000;

/**
 * In-memory storage for rate limiting
 * Maps key -> array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Cleanup interval ID for memory management
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start automatic cleanup of expired entries
 * @param intervalMs - How often to run cleanup (default: 60 seconds)
 */
export function startCleanup(intervalMs = 60000): void {
  if (cleanupIntervalId) return; // Already running

  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore.entries()) {
      // Remove timestamps older than the longest possible window (1 hour)
      const maxWindow = 60 * 60 * 1000;
      const validTimestamps = timestamps.filter((ts) => now - ts < maxWindow);

      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else if (validTimestamps.length !== timestamps.length) {
        rateLimitStore.set(key, validTimestamps);
      }
    }
  }, intervalMs);
}

/**
 * Stop automatic cleanup
 */
export function stopCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Get client IP address from request headers
 *
 * WARNING: These headers can be spoofed by attackers. Only use this as a fallback
 * when a trusted `clientAddress` from the server context is not available.
 *
 * For production deployments behind a reverse proxy, configure the proxy to set
 * these headers and ensure direct access to the app is blocked.
 *
 * @param request - The HTTP request
 * @returns IP address from headers, or a unique fallback to prevent shared buckets
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (common for proxies/load balancers)
  // WARNING: Can be spoofed if not behind a trusted proxy
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header (nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // SECURITY: Don't fall back to Host header (attacker-controlled, shared across users)
  // Instead, return a unique identifier to fail safe (each request gets own bucket)
  // This effectively disables rate limiting for these requests, but prevents
  // the worse outcome of all users sharing a single bucket
  return `unknown-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Check rate limit for a request
 *
 * @param request - The HTTP request
 * @param config - Rate limit configuration
 * @param clientAddress - Trusted client IP from server context (e.g., Astro's clientAddress)
 * @returns Rate limit result with allowed status and metadata
 *
 * IMPORTANT: Always pass `clientAddress` from the server context when available.
 * This prevents IP spoofing attacks via X-Forwarded-For headers.
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  clientAddress?: string
): RateLimitResult {
  const { maxRequests, windowMs, keyGenerator, skip } = config;

  // Check if request should skip rate limiting
  if (skip && skip(request)) {
    return {
      allowed: true,
      remaining: maxRequests,
      limit: maxRequests,
      resetTime: Math.floor((Date.now() + windowMs) / 1000),
      retryAfter: 0,
    };
  }

  // Generate key for this request
  // Default: trusted client IP (or fallback) + endpoint path
  const endpoint = new URL(request.url).pathname;
  const ip = clientAddress || getClientIp(request);
  const key = keyGenerator ? keyGenerator(request) : `${ip}:${endpoint}`;
  const now = Date.now();

  // Prevent unbounded memory growth (DoS protection)
  if (rateLimitStore.size >= MAX_STORE_ENTRIES && !rateLimitStore.has(key)) {
    // Evict oldest entry to make room
    const oldestKey = rateLimitStore.keys().next().value;
    if (oldestKey) {
      rateLimitStore.delete(oldestKey);
    }
  }

  // Get existing timestamps for this key
  const timestamps = rateLimitStore.get(key) || [];

  // Filter to only include timestamps within the window (sliding window)
  const windowStart = now - windowMs;
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  // Calculate reset time (end of current window)
  const oldestTimestamp = validTimestamps[0] || now;
  const resetTime = Math.floor((oldestTimestamp + windowMs) / 1000);
  const retryAfter = Math.max(0, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  // Check if under limit
  if (validTimestamps.length < maxRequests) {
    // Add current timestamp and store
    validTimestamps.push(now);
    rateLimitStore.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length,
      limit: maxRequests,
      resetTime,
      retryAfter: 0,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    limit: maxRequests,
    resetTime,
    retryAfter,
  };
}

/**
 * Check rate limit using a custom key (e.g., email address)
 *
 * @param key - Custom rate limit key (e.g., "resend:user@example.com")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimitByKey(key: string, config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs } = config;
  const now = Date.now();

  if (rateLimitStore.size >= MAX_STORE_ENTRIES && !rateLimitStore.has(key)) {
    const oldestKey = rateLimitStore.keys().next().value;
    if (oldestKey) {
      rateLimitStore.delete(oldestKey);
    }
  }

  const timestamps = rateLimitStore.get(key) || [];
  const windowStart = now - windowMs;
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  const oldestTimestamp = validTimestamps[0] || now;
  const resetTime = Math.floor((oldestTimestamp + windowMs) / 1000);
  const retryAfter = Math.max(0, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  if (validTimestamps.length < maxRequests) {
    validTimestamps.push(now);
    rateLimitStore.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length,
      limit: maxRequests,
      resetTime,
      retryAfter: 0,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    limit: maxRequests,
    resetTime,
    retryAfter,
  };
}

/**
 * Apply rate limit headers to a response
 *
 * @param response - The response to add headers to
 * @param result - Rate limit check result
 * @returns New response with rate limit headers
 */
export function applyRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);

  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetTime.toString());

  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create a rate limit exceeded response
 *
 * @param result - Rate limit check result
 * @param message - Optional custom message
 * @returns 429 Too Many Requests response with headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message = 'Too many requests. Please try again later.'
): Response {
  const response = new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return applyRateLimitHeaders(response, result);
}

/**
 * Pre-configured rate limit settings for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes per IP
   */
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  } satisfies RateLimitConfig,

  /**
   * Moderate rate limit for login specifically
   * 10 requests per 15 minutes per IP
   */
  login: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again later.',
  } satisfies RateLimitConfig,

  /**
   * Strict rate limit for password reset
   * 3 requests per hour per IP
   */
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset requests. Please try again in an hour.',
  } satisfies RateLimitConfig,

  /**
   * Moderate rate limit for signup
   * 5 requests per hour per IP
   */
  signup: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many signup attempts. Please try again later.',
  } satisfies RateLimitConfig,

  /**
   * Rate limit for resend verification email
   * 3 requests per hour per IP
   */
  resendVerification: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many verification email requests. Please try again later.',
  } satisfies RateLimitConfig,

  /**
   * Per-email rate limit for resend verification
   * 3 requests per hour per email address
   */
  resendVerificationPerEmail: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many verification email requests for this address. Please try again later.',
  } satisfies RateLimitConfig,

  /**
   * Rate limit for resending email change verification
   * 3 requests per hour per user
   */
  resendEmailChange: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many resend requests. Please try again later.',
  } satisfies RateLimitConfig,

  /**
   * Rate limit for session revocation actions.
   * 5 requests per minute per authenticated user.
   */
  sessionRevocation: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many session revocation requests. Please try again in a minute.',
  } satisfies RateLimitConfig,

  /**
   * Standard API rate limit
   * 100 requests per minute per IP
   */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded. Please slow down.',
  } satisfies RateLimitConfig,
} as const;

// Start cleanup on module load (for long-running servers)
if (typeof globalThis !== 'undefined' && import.meta.env?.MODE !== 'test') {
  startCleanup();
}
