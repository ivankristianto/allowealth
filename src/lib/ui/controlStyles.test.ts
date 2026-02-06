import { describe, expect, it } from 'bun:test';
import {
  CONTROL_BASE_CLASSES,
  CONTROL_FOCUS_CLASSES,
  CONTROL_SURFACE_CLASSES,
  BUTTON_BASE_CLASSES,
  BUTTON_ACCESSIBLE_OUTLINE_CLASSES,
} from './controlStyles';

describe('controlStyles contract', () => {
  it('enforces rounded-lg for controls', () => {
    expect(CONTROL_BASE_CLASSES).toContain('rounded-lg');
  });

  it('keeps visible control borders', () => {
    expect(CONTROL_SURFACE_CLASSES).toContain('border');
    expect(CONTROL_SURFACE_CLASSES).toContain('border-base-300');
    expect(CONTROL_SURFACE_CLASSES).not.toContain('border-0');
  });

  it('enforces rounded-2xl for actionable buttons', () => {
    expect(BUTTON_BASE_CLASSES).toContain('rounded-2xl');
  });

  it('uses non-opaque outline borders', () => {
    expect(BUTTON_ACCESSIBLE_OUTLINE_CLASSES).toContain('border-accent');
    expect(BUTTON_ACCESSIBLE_OUTLINE_CLASSES).not.toContain('border-accent/10');
  });

  it('uses visible focus styles', () => {
    expect(CONTROL_FOCUS_CLASSES).toContain('focus-visible:ring-2');
  });
});
