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

interface WorkflowStep {
  uses?: string;
  with?: Record<string, unknown>;
}

interface Workflow {
  permissions?: unknown;
  jobs: Record<string, { steps?: WorkflowStep[] }>;
}

const WORKFLOW_FILES = [...new Bun.Glob('.github/workflows/*.yml').scanSync(ROOT)].sort();

function workflowSteps(file: string): WorkflowStep[] {
  const workflow = readYaml<Workflow>(file);
  return Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
}

// CI, Docker and local dev drifted across three Bun versions (audit 7.4)
describe('bun version', () => {
  const pinned = read('.bun-version').trim();

  it('.bun-version holds an exact version', () => {
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('package.json packageManager matches .bun-version', () => {
    const pkg = JSON.parse(read('package.json')) as { packageManager?: string };
    expect(pkg.packageManager).toBe(`bun@${pinned}`);
  });

  it('the Dockerfile builds every stage on the pinned version', () => {
    const dockerfile = read('docker/Dockerfile');
    const fromLines = dockerfile.split('\n').filter((line) => line.startsWith('FROM '));

    expect(dockerfile).toContain(`ARG BUN_VERSION=${pinned}\n`);
    expect(fromLines.length).toBeGreaterThan(0);
    for (const line of fromLines) {
      expect(line).toMatch(/^FROM oven\/bun:\$\{BUN_VERSION\}(-slim)? AS /);
    }
  });

  it('every workflow installs Bun from .bun-version', () => {
    const setups = WORKFLOW_FILES.flatMap((file) =>
      workflowSteps(file)
        .filter((step) => step.uses?.startsWith('oven-sh/setup-bun@'))
        .map((step) => ({ file, with: step.with }))
    );

    expect(setups.length).toBeGreaterThan(0);
    for (const setup of setups) {
      expect(setup).toEqual({ file: setup.file, with: { 'bun-version-file': '.bun-version' } });
    }
  });
});

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
