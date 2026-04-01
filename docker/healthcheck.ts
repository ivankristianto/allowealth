#!/usr/bin/env bun
/**
 * Docker health check script
 * Returns exit code 0 if healthy, 1 if unhealthy
 */

export {};

const port = process.env.PORT ?? '3000';
const url = `http://localhost:${port}/`;

try {
  // 5 second timeout to fail fast on hanging connections
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    console.error(`Health check failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  // Health check passed
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Health check failed: ${message}`);
  process.exit(1);
}
