/**
 * Atomic Design Reclassification Tests
 *
 * Ensures misplaced organisms are moved to molecules.
 */

import { describe, it, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const legacyRoot = ['src', 'components', 'organisms'].join('/');
const moleculeRoot = ['src', 'components', 'molecules'].join('/');

const reclassifiedComponents = [
  {
    name: 'DashboardError',
    oldPath: [legacyRoot, 'DashboardError.astro'].join('/'),
    newPath: [moleculeRoot, 'DashboardError.astro'].join('/'),
  },
  {
    name: 'AssetItemRow',
    oldPath: [legacyRoot, 'AssetItemRow.astro'].join('/'),
    newPath: [moleculeRoot, 'AssetItemRow.astro'].join('/'),
  },
  {
    name: 'TransactionActionsBar',
    oldPath: [legacyRoot, 'TransactionActionsBar.astro'].join('/'),
    newPath: [moleculeRoot, 'TransactionActionsBar.astro'].join('/'),
  },
  {
    name: 'BudgetActions',
    oldPath: [legacyRoot, 'BudgetActions.astro'].join('/'),
    newPath: [moleculeRoot, 'BudgetActions.astro'].join('/'),
  },
  {
    name: 'HeroSection',
    oldPath: [legacyRoot, 'landing', 'HeroSection.astro'].join('/'),
    newPath: [moleculeRoot, 'landing', 'HeroSection.astro'].join('/'),
  },
  {
    name: 'FeaturesGrid',
    oldPath: [legacyRoot, 'landing', 'FeaturesGrid.astro'].join('/'),
    newPath: [moleculeRoot, 'landing', 'FeaturesGrid.astro'].join('/'),
  },
  {
    name: 'RecentTransactionsList',
    oldPath: [legacyRoot, 'RecentTransactionsList.astro'].join('/'),
    newPath: [moleculeRoot, 'RecentTransactionsList.astro'].join('/'),
  },
];

describe('Atomic design reclassification', () => {
  reclassifiedComponents.forEach(({ name, oldPath, newPath }) => {
    it(`${name} should live under molecules`, () => {
      expect(existsSync(join(projectRoot, newPath))).toBe(true);
      expect(existsSync(join(projectRoot, oldPath))).toBe(false);
    });
  });
});
