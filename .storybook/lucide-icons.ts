/**
 * Lucide icon utilities for Storybook stories.
 *
 * This module provides a bridge between the vanilla `lucide` package and
 * Storybook's HTML renderer. It exports icon creators that work without
 * Astro component imports (which would fail during Storybook build).
 *
 * Usage in stories:
 * ```ts
 * import { createIcon, icons } from '../../.storybook/lucide-icons';
 *
 * // Create an SVG element
 * const svg = createIcon(icons.X, { size: 16, class: 'stroke-current' });
 *
 * // Or render to HTML string
 * const html = renderIcon(icons.X, { size: 16, class: 'stroke-current' });
 * container.innerHTML = html;
 * ```
 */

import {
  createElement,
  X,
  Plus,
  Minus,
  Check,
  Pencil,
  Trash2,
  Menu,
  Bell,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  TriangleAlert,
  CircleX,
  CircleCheck,
  CircleOff,
  CircleAlert,
  Lock,
  Eye,
  EyeOff,
  Info,
  Clock,
  DollarSign,
  CreditCard,
  Wallet,
  ChartPie,
  RefreshCw,
  Download,
  TrendingUp,
  ShieldCheck,
  User,
  LogOut,
  SlidersHorizontal,
  Tag,
  Ban,
  List,
  Folder,
  Inbox,
  File,
} from 'lucide';

// Type for lucide icon definition
type IconNode = [string, Record<string, string | number>, IconNode[]?][];

// Export all icon definitions for use in stories
export const icons = {
  X,
  Plus,
  Minus,
  Check,
  Pencil,
  Trash2,
  Menu,
  Bell,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  TriangleAlert,
  CircleX,
  CircleCheck,
  CircleOff,
  CircleAlert,
  Lock,
  Eye,
  EyeOff,
  Info,
  Clock,
  DollarSign,
  CreditCard,
  Wallet,
  ChartPie,
  RefreshCw,
  Download,
  TrendingUp,
  ShieldCheck,
  User,
  LogOut,
  SlidersHorizontal,
  Tag,
  Ban,
  List,
  Folder,
  Inbox,
  File,
} as const;

export type IconName = keyof typeof icons;

interface IconOptions {
  size?: number;
  class?: string;
  'aria-hidden'?: 'true' | 'false';
  'aria-label'?: string;
}

/**
 * Create an SVG element from a Lucide icon definition.
 * Returns an actual SVGElement that can be appended to the DOM.
 */
export function createIcon(iconNode: IconNode, options: IconOptions = {}): SVGElement {
  const { size = 24, class: className, ...attrs } = options;

  const customAttrs: Record<string, string | number> = {
    width: size,
    height: size,
    ...attrs,
  };

  if (className) {
    customAttrs.class = className;
  }

  return createElement(iconNode, customAttrs);
}

/**
 * Render a Lucide icon to an HTML string.
 * Useful for setting innerHTML.
 */
export function renderIcon(iconNode: IconNode, options: IconOptions = {}): string {
  const svg = createIcon(iconNode, options);
  return svg.outerHTML;
}

/**
 * Helper to create an icon element - mirrors the @lucide/astro `.render()` API
 * for easier migration from existing stories.
 * Returns an SVGElement that can be used with appendChild().
 */
export function iconRender(iconNode: IconNode) {
  return (options: IconOptions = {}, extraAttrs: Record<string, string> = {}): SVGElement => {
    return createIcon(iconNode, { ...options, ...extraAttrs });
  };
}

/**
 * Helper to render an icon to HTML string - for use in template literals and innerHTML.
 */
export function iconRenderString(iconNode: IconNode) {
  return (options: IconOptions = {}, extraAttrs: Record<string, string> = {}): string => {
    const svg = createIcon(iconNode, { ...options, ...extraAttrs });
    return svg.outerHTML;
  };
}

// String renderers for template literal usage
// Synced with IconRenderers - all icons are available in both exports
export const IconStrings = {
  X: { render: iconRenderString(X) },
  Plus: { render: iconRenderString(Plus) },
  Minus: { render: iconRenderString(Minus) },
  Check: { render: iconRenderString(Check) },
  Pencil: { render: iconRenderString(Pencil) },
  Trash2: { render: iconRenderString(Trash2) },
  Menu: { render: iconRenderString(Menu) },
  Bell: { render: iconRenderString(Bell) },
  Search: { render: iconRenderString(Search) },
  Calendar: { render: iconRenderString(Calendar) },
  ChevronDown: { render: iconRenderString(ChevronDown) },
  ChevronUp: { render: iconRenderString(ChevronUp) },
  ChevronLeft: { render: iconRenderString(ChevronLeft) },
  ChevronRight: { render: iconRenderString(ChevronRight) },
  ArrowRight: { render: iconRenderString(ArrowRight) },
  ArrowLeft: { render: iconRenderString(ArrowLeft) },
  ArrowUpDown: { render: iconRenderString(ArrowUpDown) },
  TriangleAlert: { render: iconRenderString(TriangleAlert) },
  CircleX: { render: iconRenderString(CircleX) },
  CircleCheck: { render: iconRenderString(CircleCheck) },
  CircleOff: { render: iconRenderString(CircleOff) },
  CircleAlert: { render: iconRenderString(CircleAlert) },
  Lock: { render: iconRenderString(Lock) },
  Eye: { render: iconRenderString(Eye) },
  EyeOff: { render: iconRenderString(EyeOff) },
  Info: { render: iconRenderString(Info) },
  Clock: { render: iconRenderString(Clock) },
  DollarSign: { render: iconRenderString(DollarSign) },
  CreditCard: { render: iconRenderString(CreditCard) },
  Wallet: { render: iconRenderString(Wallet) },
  ChartPie: { render: iconRenderString(ChartPie) },
  RefreshCw: { render: iconRenderString(RefreshCw) },
  Download: { render: iconRenderString(Download) },
  TrendingUp: { render: iconRenderString(TrendingUp) },
  ShieldCheck: { render: iconRenderString(ShieldCheck) },
  User: { render: iconRenderString(User) },
  LogOut: { render: iconRenderString(LogOut) },
  SlidersHorizontal: { render: iconRenderString(SlidersHorizontal) },
  Tag: { render: iconRenderString(Tag) },
  Ban: { render: iconRenderString(Ban) },
  List: { render: iconRenderString(List) },
  Folder: { render: iconRenderString(Folder) },
  Inbox: { render: iconRenderString(Inbox) },
  File: { render: iconRenderString(File) },
};

// Pre-configured render functions that match the @lucide/astro API
// These can be used as drop-in replacements for the Astro icon imports
// Returns SVGElement for use with appendChild()
export const IconRenderers = {
  X: { render: iconRender(X) },
  Plus: { render: iconRender(Plus) },
  Minus: { render: iconRender(Minus) },
  Check: { render: iconRender(Check) },
  Pencil: { render: iconRender(Pencil) },
  Trash2: { render: iconRender(Trash2) },
  Menu: { render: iconRender(Menu) },
  Bell: { render: iconRender(Bell) },
  Search: { render: iconRender(Search) },
  Calendar: { render: iconRender(Calendar) },
  ChevronDown: { render: iconRender(ChevronDown) },
  ChevronUp: { render: iconRender(ChevronUp) },
  ChevronLeft: { render: iconRender(ChevronLeft) },
  ChevronRight: { render: iconRender(ChevronRight) },
  ArrowRight: { render: iconRender(ArrowRight) },
  ArrowLeft: { render: iconRender(ArrowLeft) },
  ArrowUpDown: { render: iconRender(ArrowUpDown) },
  TriangleAlert: { render: iconRender(TriangleAlert) },
  CircleX: { render: iconRender(CircleX) },
  CircleCheck: { render: iconRender(CircleCheck) },
  CircleOff: { render: iconRender(CircleOff) },
  CircleAlert: { render: iconRender(CircleAlert) },
  Lock: { render: iconRender(Lock) },
  Eye: { render: iconRender(Eye) },
  EyeOff: { render: iconRender(EyeOff) },
  Info: { render: iconRender(Info) },
  Clock: { render: iconRender(Clock) },
  DollarSign: { render: iconRender(DollarSign) },
  CreditCard: { render: iconRender(CreditCard) },
  Wallet: { render: iconRender(Wallet) },
  ChartPie: { render: iconRender(ChartPie) },
  RefreshCw: { render: iconRender(RefreshCw) },
  Download: { render: iconRender(Download) },
  TrendingUp: { render: iconRender(TrendingUp) },
  ShieldCheck: { render: iconRender(ShieldCheck) },
  User: { render: iconRender(User) },
  LogOut: { render: iconRender(LogOut) },
  SlidersHorizontal: { render: iconRender(SlidersHorizontal) },
  Tag: { render: iconRender(Tag) },
  Ban: { render: iconRender(Ban) },
  List: { render: iconRender(List) },
  Folder: { render: iconRender(Folder) },
  Inbox: { render: iconRender(Inbox) },
  File: { render: iconRender(File) },
};

// Default export for convenient importing
export default IconRenderers;
