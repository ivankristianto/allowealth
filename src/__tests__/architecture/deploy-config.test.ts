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

// A moved tag on a third-party action runs new code with our secrets (audit 7.5)
describe('workflow supply chain', () => {
  for (const file of WORKFLOW_FILES) {
    it(`${file} pins every action to a commit SHA with its version`, () => {
      const usesLines = read(file)
        .split('\n')
        .filter((line) => /^\s*(- )?uses:/.test(line));

      expect(usesLines.length).toBeGreaterThan(0);
      for (const line of usesLines) {
        expect(line).toMatch(/uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
      }
    });

    it(`${file} sets least-privilege top-level permissions`, () => {
      expect(readYaml<Workflow>(file).permissions).toEqual({ contents: 'read' });
    });
  }

  it('dependabot watches actions and every bun lockfile', () => {
    const config = readYaml<{
      updates: { 'package-ecosystem': string; directory?: string; directories?: string[] }[];
    }>('.github/dependabot.yml');
    const ecosystems = config.updates.map((update) => update['package-ecosystem']);
    const bunDirs = config.updates
      .filter((update) => update['package-ecosystem'] === 'bun')
      .flatMap((update) => update.directories ?? [update.directory]);
    const lockfileDirs = [
      '/',
      ...[...new Bun.Glob('apps/*/bun.lock').scanSync(ROOT)].map(
        (path) => `/${path.replace(/\/bun\.lock$/, '')}`
      ),
    ].sort();

    expect(ecosystems).toContain('github-actions');
    expect([...bunDirs].sort()).toEqual(lockfileDirs);
  });
});

describe('unit test discovery', () => {
  it('bun test scans tests/ as well as src/, and leaves e2e/ to Playwright', () => {
    const bunfig = Bun.TOML.parse(read('bunfig.toml')) as {
      test: { root: string; pathIgnorePatterns: string[] };
    };

    expect(bunfig.test.root).toBe('.');
    expect(bunfig.test.pathIgnorePatterns).toContain('e2e/**');
  });

  it('CI runs the unit suite in random order', () => {
    const workflow = readYaml<Workflow>('.github/workflows/quality-gates.yml');
    const runs = (workflow.jobs['unit-tests'].steps ?? [])
      .map((step) => (step as { run?: string }).run ?? '')
      .filter((run) => run.startsWith('bun test'));

    expect(runs).toEqual(['bun test --randomize']);
  });
});

// The config sets process.env.TZ on import, so read it in a child process to keep this one clean
function playwrightWebServer(env: Record<string, string> = {}) {
  const script =
    "const c = (await import('./e2e/playwright.config.ts')).default;" +
    'console.log(JSON.stringify(c.webServer));';
  const { E2E_SERVER: _ignored, ...baseEnv } = process.env;
  const result = Bun.spawnSync(['bun', '-e', script], { cwd: ROOT, env: { ...baseEnv, ...env } });
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout.toString()) as {
    command: string;
    cwd?: string;
    env: Record<string, string>;
  };
}

// E2E ran against astro dev, so build-time CSP and adapter regressions were never tested (audit 7.7)
describe('e2e server', () => {
  it('serves the production build by default', () => {
    const server = playwrightWebServer();

    expect(server.command).toBe('bun run build && bun --bun ./dist/server/entry.mjs');
    expect(server.cwd?.replace(/\/$/, '')).toBe(ROOT);
    expect(server.env.DATABASE_URL).toBe('db/.e2e.db');
  });

  it('switches to astro dev with E2E_SERVER=dev', () => {
    const server = playwrightWebServer({ E2E_SERVER: 'dev' });

    expect(server.command).toStartWith('bun run dev');
    expect(server.env.DATABASE_URL).toBe('db/.e2e.db');
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
