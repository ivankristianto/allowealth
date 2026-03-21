/**
 * Diagnostics Service
 *
 * Aggregates system information for admin diagnostics page.
 * Provides runtime, database, cache, environment, and configuration data.
 */

import type { IDatabase } from '@/db';
import type {
  RuntimeInfo,
  DatabaseInfo,
  CacheInfo,
  EnvironmentVariable,
  ConfigurationValidation,
  DiagnosticsData,
} from '@/types/diagnostics';
import { SENSITIVE_PATTERNS, REQUIRED_ENV_VARS } from '@/types/diagnostics';
import { getEnv } from '@/lib/env';
import { getCacheManager } from '@/lib/cache/cache-manager';
import { getDatabaseConfig } from '@/db/config';

export class DiagnosticsService {
  constructor(private db: IDatabase) {}

  private static readonly HIDDEN_ENV_VARS = new Set(['DATABASE_URL', 'UPSTASH_REDIS_REST_URL']);

  /**
   * Get runtime environment information
   */
  async getRuntimeInfo(): Promise<RuntimeInfo> {
    const nodeEnv = getEnv('NODE_ENV') as 'development' | 'production' | 'test' | undefined;
    const environment = nodeEnv ?? 'development';

    // Detect runtime: bun, node, or workers (Cloudflare)
    const runtime: RuntimeInfo['runtime'] =
      typeof process !== 'undefined' && process.versions?.bun
        ? 'bun'
        : typeof caches !== 'undefined'
          ? 'workers'
          : 'node';

    const info: RuntimeInfo = { environment, runtime };

    // Add runtime-specific information
    if (runtime === 'bun') {
      info.bunVersion = process.versions.bun;
    } else if (runtime === 'node') {
      info.nodeVersion = process.version;
    } else if (runtime === 'workers') {
      info.workersCf = getEnv('CF_REGION');
      info.region = getEnv('CF_REGION');
    }

    return info;
  }

  /**
   * Get database connection information
   */
  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const config = getDatabaseConfig();
    const sanitizedUrl = this.sanitizeDbUrl(config.url);

    const info: DatabaseInfo = {
      dialect: config.dialect,
      url: sanitizedUrl,
      isConnected: false,
      isD1: config.isD1,
    };

    // Test database connectivity
    try {
      await this.db.query.users.findFirst({});
      info.isConnected = true;
    } catch {
      info.isConnected = false;
    }

    return info;
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<CacheInfo> {
    const cache = getCacheManager();
    const driverName = cache.getDriverName();

    const info: CacheInfo = {
      driver: driverName as 'memory' | 'upstash' | 'noop',
      isEnabled: driverName !== 'noop',
      config: {},
      status: driverName === 'noop' ? 'disabled' : 'healthy',
    };

    if (driverName === 'noop') {
      return info;
    }

    // Add driver-specific configuration
    if (driverName === 'memory') {
      const maxSize = getEnv('CACHE_MAX_SIZE');
      info.config.maxSize = maxSize ? Number(maxSize) : undefined;
    } else if (driverName === 'upstash') {
      const url = getEnv('UPSTASH_REDIS_REST_URL') ?? '';
      info.upstashConfig = {
        url: this.sanitizeUrl(url),
        restUrl: this.sanitizeUrl(url),
      };
    }

    // Test cache connectivity
    try {
      const testKey = `diagnostics:health:${Date.now()}`;
      await cache.set(testKey, 'ping', { ttl: 1 });
      const result = await cache.get<string>(testKey);

      if (result !== 'ping') {
        throw new Error('Cache readback failed');
      }

      info.status = 'healthy';
    } catch (error) {
      info.status = 'error';
      info.lastError = error instanceof Error ? error.message : String(error);
    }

    return info;
  }

  /**
   * Get environment variables (insensitive only)
   */
  getEnvironmentVariables(): EnvironmentVariable[] {
    const vars: EnvironmentVariable[] = [];

    const varsToShow = [
      'NODE_ENV',
      'DATABASE_URL',
      'CACHE_DRIVER',
      'UPSTASH_REDIS_REST_URL',
      'PUBLIC_URL',
      'DEV_HOST',
      'BETTER_AUTH_SECRET',
      'PUBLIC_TURNSTILE_SITE_KEY',
      'TURNSTILE_SECRET_KEY',
      'EMAIL_MODE',
      'LOG_LEVEL',
      'PERF_DEBUG',
    ];

    for (const name of varsToShow) {
      const value = getEnv(name);
      const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(name));
      const shouldHide = isSensitive || DiagnosticsService.HIDDEN_ENV_VARS.has(name);

      if (shouldHide) {
        continue;
      }

      vars.push({
        name,
        value: value || '(not set)',
        isSet: Boolean(value),
        isSensitive: false,
      });
    }

    return vars;
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): ConfigurationValidation {
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    for (const varName of REQUIRED_ENV_VARS) {
      if (!getEnv(varName)) {
        missingRequired.push(varName);
      }
    }

    // PUBLIC_URL is required only when DEV_HOST is not set
    if (!getEnv('DEV_HOST') && !getEnv('PUBLIC_URL')) {
      missingRequired.push('PUBLIC_URL');
    }

    if (getEnv('NODE_ENV') !== 'test' && !getEnv('BETTER_AUTH_SECRET')) {
      missingRequired.push('BETTER_AUTH_SECRET');
    }

    if (!import.meta.env.DEV && getEnv('NODE_ENV') !== 'test' && !getEnv('TURNSTILE_SECRET_KEY')) {
      missingRequired.push('TURNSTILE_SECRET_KEY');
    }

    if (getEnv('TURNSTILE_SECRET_KEY') && !getEnv('PUBLIC_TURNSTILE_SITE_KEY')) {
      missingRequired.push('PUBLIC_TURNSTILE_SITE_KEY');
    }

    if (getEnv('PUBLIC_TURNSTILE_SITE_KEY') && !getEnv('TURNSTILE_SECRET_KEY')) {
      missingRequired.push('TURNSTILE_SECRET_KEY');
    }

    // Add warnings for potential issues
    if (getEnv('NODE_ENV') === 'production' && getEnv('CACHE_DRIVER') === 'memory') {
      warnings.push('Using memory cache in production is not recommended');
    }

    if (getEnv('NODE_ENV') === 'production' && getEnv('LOG_LEVEL') === 'debug') {
      warnings.push('Debug logging enabled in production');
    }

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      warnings,
    };
  }

  /**
   * Get all diagnostics data
   */
  async getDiagnostics(): Promise<DiagnosticsData> {
    const [runtime, database, cache, environment, configuration] = await Promise.all([
      this.getRuntimeInfo(),
      this.getDatabaseInfo(),
      this.getCacheInfo(),
      Promise.resolve(this.getEnvironmentVariables()),
      Promise.resolve(this.validateConfiguration()),
    ]);

    return {
      runtime,
      database,
      cache,
      environment,
      configuration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sanitize database URL (remove password)
   */
  private sanitizeDbUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      // If URL parsing fails, truncate if too long
      return url.length > 50 ? `${url.substring(0, 50)}...` : url;
    }
  }

  /**
   * Sanitize URL (remove sensitive query params)
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.forEach((_value, key) => {
        if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
          parsed.searchParams.set(key, '***');
        }
      });
      return parsed.toString();
    } catch {
      return url;
    }
  }
}
