import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const removedCamelSetting = ['compact', 'Numbers'].join('');
const removedSnakeSetting = ['compact', 'numbers'].join('_');
const removedKebabSetting = ['compact', 'numbers'].join('-');
const removedConstantName = ['COMPACT', 'NUMBERS'].join('_');
const removedGetterName = ['get', 'Compact', 'Numbers'].join('');
const removedSetterName = ['set', 'Compact', 'Numbers'].join('');
const compactNumberLabel = ['Compact Number', 'Display'].join(' ');

describe('compact number settings removal', () => {
  it('removes compact number workspace meta definitions and service helpers', () => {
    const metaKeysSource = read('src/lib/constants/workspace-meta-keys.ts');
    const metaServiceSource = read('src/services/workspace-meta.service.ts');

    expect(metaKeysSource).not.toContain(removedConstantName);
    expect(metaKeysSource).not.toContain(removedCamelSetting);
    expect(metaKeysSource).not.toContain(removedSnakeSetting);

    expect(metaServiceSource).not.toContain(removedConstantName);
    expect(metaServiceSource).not.toContain(removedCamelSetting);
    expect(metaServiceSource).not.toContain(removedGetterName);
    expect(metaServiceSource).not.toContain(removedSetterName);
  });

  it('removes compact number handling from workspace settings API and OpenAPI files', () => {
    const apiSource = read('src/pages/api/workspace/settings.ts');
    const workspaceSettingsSchema = read('openapi/schemas/WorkspaceSettings.yml');
    const updateSettingsSchema = read('openapi/schemas/UpdateWorkspaceSettingsRequest.yml');
    const workspacePath = read('openapi/paths/workspace.yml');

    expect(apiSource).not.toContain(removedCamelSetting);
    expect(workspaceSettingsSchema).not.toContain(removedCamelSetting);
    expect(updateSettingsSchema).not.toContain(removedCamelSetting);
    expect(workspacePath).not.toContain(removedCamelSetting);
  });

  it('removes compact number defaults from workspace CLI and seed flows', () => {
    const cliSource = read('src/cli/commands/workspace.ts');
    const seedSource = read('src/db/seed/domains/workspace.ts');

    expect(cliSource).not.toContain(removedKebabSetting);
    expect(cliSource).not.toContain(removedConstantName);
    expect(cliSource).toContain('isValidWorkspaceMetaKey(meta.meta_key)');
    expect(seedSource).not.toContain(removedConstantName);
    expect(seedSource).not.toContain(removedSnakeSetting);
  });

  it('removes compact number documentation and legacy raw-setting displays', () => {
    const readmeSource = read('README.md');
    const settingsDocSource = read('apps/docs/src/content/docs/end-users/settings.md');
    const architectureDocSource = read('docs/architecture/004-database-schema.md');
    const superAdminSource = read('src/services/super-admin.service.ts');

    expect(readmeSource).not.toContain(removedKebabSetting);
    expect(readmeSource).not.toContain(removedSnakeSetting);
    expect(readmeSource).not.toContain(['Compact', ' Numbers'].join(''));
    expect(settingsDocSource).not.toContain(compactNumberLabel);
    expect(architectureDocSource).not.toContain(removedCamelSetting);
    expect(superAdminSource).toContain('isValidWorkspaceMetaKey(meta.meta_key)');
  });
});
