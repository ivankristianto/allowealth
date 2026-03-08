import { describe, expect, it } from 'bun:test';
import { House, ShoppingBasket, Tag, TrendingUp } from '@lucide/astro';
import { resolveCategoryIconComponent } from './categoryIconRegistry';

describe('resolveCategoryIconComponent', () => {
  it('resolves known aliases to the same icon component', () => {
    expect(resolveCategoryIconComponent('home')).toBe(House);
    expect(resolveCategoryIconComponent('house')).toBe(House);
    expect(resolveCategoryIconComponent('shopping-basket')).toBe(ShoppingBasket);
  });

  it('normalizes spacing, casing, and camelCase input before lookup', () => {
    expect(resolveCategoryIconComponent('TrendingUp')).toBe(TrendingUp);
    expect(resolveCategoryIconComponent('trending up')).toBe(TrendingUp);
    expect(resolveCategoryIconComponent('shopping_basket')).toBe(ShoppingBasket);
  });

  it('falls back to Tag for nullish and unknown icon names', () => {
    expect(resolveCategoryIconComponent(undefined)).toBe(Tag);
    expect(resolveCategoryIconComponent(null)).toBe(Tag);
    expect(resolveCategoryIconComponent('does-not-exist')).toBe(Tag);
  });

  it('honors a custom fallback when one is provided', () => {
    expect(resolveCategoryIconComponent('', House)).toBe(House);
    expect(resolveCategoryIconComponent('missing-icon', House)).toBe(House);
  });
});
