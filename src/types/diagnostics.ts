/**
 * Diagnostics data types for admin system information page
 */

export interface RuntimeInfo {
  environment: 'development' | 'production' | 'test';
  runtime: 'bun' | 'node' | 'workers';
  region?: string;
  nodeVersion?: string;
  bunVersion?: string;
  workersCf?: string; // Cloudflare Workers metadata
}

export interface DatabaseInfo {
  dialect: 'sqlite';
  url: string; // Sanitized (passwords removed)
  isConnected: boolean;
  isD1: boolean;
  queryMetrics?: {
    totalQueries: number;
    avgLatency: number;
    slowQueries: number;
  };
}

export interface CacheInfo {
  driver: 'memory' | 'upstash' | 'noop';
  isEnabled: boolean;
  config: {
    ttl?: number;
    maxSize?: number; // for memory driver
  };
  upstashConfig?: {
    url: string; // Sanitized (token removed)
    restUrl: string;
  };
  status: 'healthy' | 'error' | 'disabled';
  lastError?: string;
}

export interface EnvironmentVariable {
  name: string;
  value: string; // Masked if sensitive
  isSet: boolean;
  isSensitive: boolean;
}

export interface ConfigurationValidation {
  isValid: boolean;
  missingRequired: string[];
  warnings: string[];
}

export interface DiagnosticsData {
  runtime: RuntimeInfo;
  database: DatabaseInfo;
  cache: CacheInfo;
  environment: EnvironmentVariable[];
  configuration: ConfigurationValidation;
  timestamp: string; // ISO 8601
}

// Sensitive variable patterns (passwords, keys, secrets)
export const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /private/i,
];

export const REQUIRED_ENV_VARS: string[] = [];
