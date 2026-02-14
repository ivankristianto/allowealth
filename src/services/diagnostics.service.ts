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
      isSupabase: config.isSupabase,
      isTransactionPooler: config.isTransactionPooler,
      isHyperdrive: config.isHyperdrive,
    };

    if (config.poolConfig) {
      info.connectionPoolConfig = config.poolConfig;
    }

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
      status: 'healthy',
    };

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
   * Get environment variables (sanitized)
   */
  getEnvironmentVariables(): EnvironmentVariable[] {
    const vars: EnvironmentVariable[] = [];

    const varsToShow = [
      'NODE_ENV',
      'DATABASE_URL',
      'CACHE_DRIVER',
      'UPSTASH_REDIS_REST_URL',
      'AUTH_SECRET',
      'PUBLIC_URL',
      'EMAIL_MODE',
      'LOG_LEVEL',
      'PERF_DEBUG',
    ];

    for (const name of varsToShow) {
      const value = getEnv(name);
      const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(name));

      vars.push({
        name,
        value: isSensitive && value ? this.maskValue(value) : (value ?? '(not set)'),
        isSet: value !== undefined,
        isSensitive,
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

  /**
   * Mask sensitive value (show first and last 4 chars)
   */
  private maskValue(value: string): string {
    if (value.length <= 8) {
      return '***';
    }
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
}

// Import database instance for singleton
import { db } from '@/db';

export const diagnosticsService = new DiagnosticsService(db);
