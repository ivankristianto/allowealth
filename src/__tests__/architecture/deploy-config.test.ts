import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function readYaml<T>(path: string): T {
  return Bun.YAML.parse(read(path)) as T;
}

interface ComposeFile {
  services: Record<string, { ports?: string[] }>;
}

describe('docker compose', () => {
  for (const file of ['docker/docker-compose.yml', 'docker/docker-compose.prod.yml']) {
    // A port reachable from outside the host lets anyone spoof CLIENT_IP_HEADER (audit 4.2)
    it(`${file} publishes every port on loopback only`, () => {
      const compose = readYaml<ComposeFile>(file);
      const ports = Object.values(compose.services).flatMap((service) => service.ports ?? []);

      expect(ports.length).toBeGreaterThan(0);
      for (const port of ports) {
        expect(port).toStartWith('127.0.0.1:');
      }
    });
  }
});
