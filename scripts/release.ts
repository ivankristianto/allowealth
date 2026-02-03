#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Release Script
 *
 * Interactive script to bump version, create git tag, and publish GitHub release.
 *
 * Usage: bun run release
 *
 * Prerequisites:
 * - gh CLI installed and authenticated (gh auth login)
 * - Clean working directory (no uncommitted changes)
 * - On main branch
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const ROOT_DIR = join(import.meta.dir, '..');
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json');

type BumpType = 'patch' | 'minor' | 'major';

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function bumpVersion(version: string, type: BumpType): string {
  const { major, minor, patch } = parseVersion(version);

  switch (type) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkPrerequisites(): Promise<void> {
  console.log('\n🔍 Checking prerequisites...\n');

  // Check gh CLI
  try {
    await $`gh --version`.quiet();
    console.log('  ✓ gh CLI installed');
  } catch {
    console.error('  ✗ gh CLI not found. Install it: https://cli.github.com/');
    process.exit(1);
  }

  // Check gh auth
  try {
    await $`gh auth status`.quiet();
    console.log('  ✓ gh CLI authenticated');
  } catch {
    console.error('  ✗ gh CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }

  // Check clean working directory
  const status = await $`git status --porcelain`.text();
  if (status.trim()) {
    console.error('  ✗ Working directory not clean. Commit or stash changes first.');
    process.exit(1);
  }
  console.log('  ✓ Working directory clean');

  // Check current branch
  const branch = (await $`git branch --show-current`.text()).trim();
  if (branch !== 'main') {
    console.error(`  ✗ Not on main branch (current: ${branch}). Switch to main first.`);
    process.exit(1);
  }
  console.log('  ✓ On main branch');

  // Check if up to date with remote
  await $`git fetch origin main`.quiet();
  const behind = await $`git rev-list HEAD..origin/main --count`.text();
  if (parseInt(behind.trim()) > 0) {
    console.error('  ✗ Local main is behind origin. Run: git pull');
    process.exit(1);
  }
  console.log('  ✓ Up to date with remote');

  console.log('');
}

async function getCurrentVersion(): Promise<string> {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return packageJson.version;
}

async function updatePackageVersion(newVersion: string): Promise<void> {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  packageJson.version = newVersion;
  writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
}

async function main(): Promise<void> {
  console.log('\n🚀 Release Script\n');

  await checkPrerequisites();

  const currentVersion = await getCurrentVersion();
  console.log(`Current version: ${currentVersion}\n`);

  // Show bump options
  console.log('Version bump options:');
  console.log(`  1. patch  ${currentVersion} → ${bumpVersion(currentVersion, 'patch')}`);
  console.log(`  2. minor  ${currentVersion} → ${bumpVersion(currentVersion, 'minor')}`);
  console.log(`  3. major  ${currentVersion} → ${bumpVersion(currentVersion, 'major')}`);
  console.log('');

  const choice = await prompt('Select bump type (1/2/3): ');

  let bumpType: BumpType;
  switch (choice) {
    case '1':
      bumpType = 'patch';
      break;
    case '2':
      bumpType = 'minor';
      break;
    case '3':
      bumpType = 'major';
      break;
    default:
      console.error('Invalid choice. Exiting.');
      process.exit(1);
  }

  const newVersion = bumpVersion(currentVersion, bumpType);
  const tagName = `v${newVersion}`;

  console.log(`\n📦 Bumping version: ${currentVersion} → ${newVersion}\n`);

  // Confirm
  const confirm = await prompt(`Create release ${tagName}? (y/n): `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  // Update package.json
  console.log('\n📝 Updating package.json...');
  await updatePackageVersion(newVersion);

  // Commit
  console.log('📝 Creating commit...');
  await $`git add package.json`;
  await $`git commit -m ${'chore: release ' + tagName}`;

  // Tag
  console.log('🏷️  Creating tag...');
  await $`git tag ${tagName}`;

  // Push
  console.log('⬆️  Pushing to remote...');
  await $`git push`;
  await $`git push --tags`;

  // Create GitHub release with auto-generated notes
  console.log('🎉 Creating GitHub release...');
  await $`gh release create ${tagName} --generate-notes`;

  console.log(`\n✅ Release ${tagName} created successfully!\n`);

  // Show release URL
  const releaseUrl = await $`gh release view ${tagName} --json url -q .url`.text();
  console.log(`View release: ${releaseUrl.trim()}\n`);
}

main().catch((error) => {
  console.error('Release failed:', error);
  process.exit(1);
});
