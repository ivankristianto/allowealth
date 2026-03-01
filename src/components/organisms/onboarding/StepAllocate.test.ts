import { describe, expect, it } from 'bun:test';

describe('StepAllocate onboarding dialogs', () => {
  it('uses design-system modals instead of browser dialogs', async () => {
    const source = await Bun.file(new URL('./StepAllocate.astro', import.meta.url).pathname).text();

    expect(source).not.toContain('window.alert(');
    expect(source).not.toContain('window.prompt(');
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('onboarding-category-rename-modal');
    expect(source).toContain('onboarding-category-delete-modal');
  });
});
