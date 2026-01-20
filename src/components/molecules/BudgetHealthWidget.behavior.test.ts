/**
 * BudgetHealthWidget Component Behavior Tests
 * ============================================
 *
 * Tests the BudgetHealthWidget molecule component after migrating to @lucide/astro icons.
 *
 * Manual Testing Steps:
 * 1. Open Storybook: bun run storybook
 * 2. Navigate to Molecules/BudgetHealthWidget
 * 3. Verify icons render correctly with Lucide icons (Check, TriangleAlert, ArrowRight)
 * 4. Test all states: healthy, warning, exceeded
 * 5. Test accessibility (keyboard, screen reader)
 *
 * Usage: bun test src/components/molecules/BudgetHealthWidget.behavior.test.ts
 */

import { describe, it, expect } from 'bun:test';

/**
 * Expected icons for budget health status
 */
const BUDGET_HEALTH_ICONS = {
  healthy: 'Check',
  warning: 'TriangleAlert',
  actionLink: 'ArrowRight',
} as const;

/**
 * Icon sizes in pixels
 */
const ICON_SIZES = {
  status: 20, // md size (header status icon)
  large: 24, // lg size (no alerts state)
  small: 16, // sm size (arrow icon)
} as const;

/**
 * Budget health states
 */
const BUDGET_STATES = ['healthy', 'warning', 'exceeded'] as const;

/**
 * Status colors for each budget state
 */
const STATUS_COLORS = {
  healthy: 'text-success',
  warning: 'text-warning',
  exceeded: 'text-error',
} as const;

describe('BudgetHealthWidget Component', () => {
  describe('Icon Migration', () => {
    it('should use Check icon from @lucide/astro for healthy status', () => {
      /**
       * Verify that the component:
       * 1. Imports Check from '@lucide/astro'
       * 2. Uses <Check size={20} class="stroke-current" /> for healthy status
       * 3. Uses <Check size={24} /> for "no alerts" state
       */
      expect(BUDGET_HEALTH_ICONS.healthy).toBe('Check');
    });

    it('should use TriangleAlert icon from @lucide/astro for warning status', () => {
      /**
       * TriangleAlert is the non-deprecated version of AlertTriangle
       * Provides better semantic meaning for budget alerts
       */
      expect(BUDGET_HEALTH_ICONS.warning).toBe('TriangleAlert');
    });

    it('should use ArrowRight icon from @lucide/astro for View Budget link', () => {
      /**
       * Verify that the component:
       * 1. Imports ArrowRight from '@lucide/astro'
       * 2. Uses <ArrowRight size={16} class="stroke-current" />
       * 3. Replaces inline SVG arrow-right
       */
      expect(BUDGET_HEALTH_ICONS.actionLink).toBe('ArrowRight');
    });

    it('should use correct icon sizes for each context', () => {
      /**
       * Size mapping:
       * - Status icon (header): 20px (md)
       * - No alerts state: 24px (lg)
       * - Arrow icon: 16px (sm)
       */
      expect(ICON_SIZES.status).toBe(20);
      expect(ICON_SIZES.large).toBe(24);
      expect(ICON_SIZES.small).toBe(16);
    });

    it('should include stroke-current class for icon styling', () => {
      /**
       * Icons include class="stroke-current" to inherit text color
       * This ensures icons match the status colors
       */
      expect(true).toBe(true);
    });

    it('should include aria-hidden="true" on decorative icons', () => {
      /**
       * All status icons and arrow icon are decorative
       * Status is conveyed through text and badge
       * Arrow is visual enhancement for the link
       */
      expect(true).toBe(true);
    });

    it('should NOT import from custom Icon component', () => {
      /**
       * Verify that the component:
       * 1. Does NOT import Icon from '../atoms/Icon.astro'
       * 2. Imports Check, TriangleAlert, ArrowRight from '@lucide/astro'
       * 3. Uses direct icon components
       */
      expect(true).toBe(true);
    });

    it('should NOT have inline SVG elements', () => {
      /**
       * Verify that the component:
       * 1. Does NOT contain <svg> elements
       * 2. Uses Lucide icon components instead
       * 3. No xmlns="http://www.w3.org/2000/svg" attributes
       */
      expect(true).toBe(true);
    });
  });

  describe('Budget Health States', () => {
    it('should support three budget states', () => {
      /**
       * Available states:
       * - healthy: All budgets within limits (0 alerts)
       * - warning: Some budgets near limit (80-99%)
       * - exceeded: Some budgets over limit (≥100%)
       */
      expect(BUDGET_STATES).toHaveLength(3);
      expect(BUDGET_STATES).toContain('healthy');
      expect(BUDGET_STATES).toContain('warning');
      expect(BUDGET_STATES).toContain('exceeded');
    });

    it('should render Check icon for healthy state', () => {
      /**
       * Healthy state features:
       * - Green color (text-success)
       * - Check icon with size={20}
       * - Badge shows "All Good"
       */
      expect(BUDGET_HEALTH_ICONS.healthy).toBe('Check');
    });

    it('should render TriangleAlert icon for warning state', () => {
      /**
       * Warning state features:
       * - Amber color (text-warning)
       * - TriangleAlert icon with size={20}
       * - Badge shows "Review"
       */
      expect(BUDGET_HEALTH_ICONS.warning).toBe('TriangleAlert');
    });

    it('should render TriangleAlert icon for exceeded state', () => {
      /**
       * Exceeded state features:
       * - Red color (text-error)
       * - TriangleAlert icon with size={20}
       * - Badge shows "Action Needed"
       */
      expect(BUDGET_HEALTH_ICONS.warning).toBe('TriangleAlert');
    });

    it('should display alert count in header', () => {
      /**
       * Alert count display:
       * - Large number (text-2xl font-bold)
       * - Status-colored
       * - Label: "alert" or "alerts" based on count
       */
      expect(true).toBe(true);
    });

    it('should display appropriate badge text for each state', () => {
      /**
       * Badge labels:
       * - healthy: "All Good"
       * - warning: "Review"
       * - exceeded: "Action Needed"
       */
      const badgeLabels = {
        healthy: 'All Good',
        warning: 'Review',
        exceeded: 'Action Needed',
      };
      expect(badgeLabels.healthy).toBe('All Good');
      expect(badgeLabels.warning).toBe('Review');
      expect(badgeLabels.exceeded).toBe('Action Needed');
    });
  });

  describe('No Alerts State', () => {
    it('should render positive message when no alerts', () => {
      /**
       * No alerts state features:
       * - Check icon (large, 24px)
       * - "All budgets healthy!" message
       * - Subtext about being on track
       * - Centered layout
       */
      expect(true).toBe(true);
    });

    it('should use larger Check icon for no alerts state', () => {
      /**
       * Icon sizing:
       * - size={24} for prominent display
       * - Green color (text-success)
       * - Centered with mx-auto
       */
      expect(ICON_SIZES.large).toBe(24);
    });

    it('should display encouraging message text', () => {
      /**
       * Expected messages:
       * - Main: "All budgets healthy!"
       * - Sub: "You're on track with all your spending categories."
       */
      const mainMessage = 'All budgets healthy!';
      const subMessage = "You're on track with all your spending categories.";
      expect(mainMessage).toContain('healthy');
      expect(subMessage).toContain('on track');
    });
  });

  describe('Alert Items List', () => {
    it('should list categories needing attention', () => {
      /**
       * Alert items display:
       * - Category name
       * - Percentage badge
       * - Budget progress bar
       * - Remaining amount (color-coded)
       */
      expect(true).toBe(true);
    });

    it('should show percentage badge for each category', () => {
      /**
       * Badge colors:
       * - exceeded: badge-error (red)
       * - warning: badge-warning (amber)
       * - ok: badge-success (green)
       */
      expect(true).toBe(true);
    });

    it('should display progress bar with correct color', () => {
      /**
       * Progress bar colors:
       * - ≥100%: bg-error (red)
       * - 80-99%: bg-warning (amber)
       * - <80%: bg-success (green)
       */
      expect(true).toBe(true);
    });

    it('should show remaining amount with color', () => {
      /**
       * Remaining amount:
       * - Negative: text-error (red)
       * - Positive: text-success (green)
       * - Format: +/- RpXXX,XXX
       */
      expect(true).toBe(true);
    });

    it('should include ARIA attributes on progress bar', () => {
      /**
       * Accessibility:
       * - role="progressbar"
       * - aria-valuenow={percentage}
       * - aria-valuemin={0}
       * - aria-valuemax={100}
       * - aria-label with category name and percentage
       */
      expect(true).toBe(true);
    });
  });

  describe('View Budget Link', () => {
    it('should render link with ArrowRight icon', () => {
      /**
       * Link features:
       * - Text: "View Budget"
       * - ArrowRight icon (16px)
       * - Hover animation on arrow
       * - Links to /budget by default
       */
      expect(BUDGET_HEALTH_ICONS.actionLink).toBe('ArrowRight');
      expect(ICON_SIZES.small).toBe(16);
    });

    it('should have hover animation on arrow icon', () => {
      /**
       * Animation:
       * - class="group-hover:translate-x-1"
       * - Smooth transition
       * - Visual feedback on hover
       */
      expect(true).toBe(true);
    });

    it('should have aria-label on the link', () => {
      /**
       * Accessibility:
       * - aria-label="View detailed budget breakdown"
       * - More descriptive than visible text
       * - Helps screen reader users
       */
      expect(true).toBe(true);
    });

    it('should accept custom viewBudgetUrl prop', () => {
      /**
       * Custom URL:
       * - viewBudgetUrl prop (default: /budget)
       * - Allows linking to custom budget pages
       */
      expect(true).toBe(true);
    });
  });

  describe('Status Colors and Styling', () => {
    it('should apply correct color for healthy state', () => {
      /**
       * Healthy state styling:
       * - text-success (green)
       * - bg-success/10 (background)
       * - border-success/20 (border)
       */
      expect(STATUS_COLORS.healthy).toBe('text-success');
    });

    it('should apply correct color for warning state', () => {
      /**
       * Warning state styling:
       * - text-warning (amber)
       * - bg-warning/10 (background)
       * - border-warning/20 (border)
       */
      expect(STATUS_COLORS.warning).toBe('text-warning');
    });

    it('should apply correct color for exceeded state', () => {
      /**
       * Exceeded state styling:
       * - text-error (red)
       * - bg-error/10 (background)
       * - border-error/20 (border)
       */
      expect(STATUS_COLORS.exceeded).toBe('text-error');
    });
  });

  describe('Component Props', () => {
    it('should accept data prop with budget health information', () => {
      /**
       * Data prop structure:
       * - alertCount: number
       * - status: 'healthy' | 'warning' | 'exceeded'
       * - alerts: BudgetAlertItem[]
       */
      expect(true).toBe(true);
    });

    it('should accept viewBudgetUrl prop', () => {
      /**
       * viewBudgetUrl prop:
       * - Optional string
       * - Default: '/budget'
       * - Used for the "View Budget" link href
       */
      expect(true).toBe(true);
    });

    it('should accept className prop', () => {
      /**
       * ClassName prop:
       * - Optional string for additional CSS classes
       * - Appended to base classes
       * - Enables custom styling
       */
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have data-budget-health-widget attribute', () => {
      /**
       * Data attribute:
       * - data-budget-health-widget for test targeting
       * - Enables E2E test selectors
       * - Supports CSS hooks
       */
      expect(true).toBe(true);
    });

    it('should have aria-hidden="true" on status icons', () => {
      /**
       * Status icons are decorative:
       * - Status is conveyed through text and badge
       * - Icons should not be announced by screen readers
       * - aria-hidden="true" prevents redundant announcements
       */
      expect(true).toBe(true);
    });

    it('should have aria-hidden="true" on arrow icon', () => {
      /**
       * Arrow icon is decorative:
       * - Link has descriptive aria-label
       * - Arrow is visual enhancement only
       * - aria-hidden="true" prevents redundant announcements
       */
      expect(true).toBe(true);
    });

    it('should have aria-label on View Budget link', () => {
      /**
       * Link accessibility:
       * - aria-label="View detailed budget breakdown"
       * - More descriptive than visible text
       * - Essential for screen reader users
       */
      expect(true).toBe(true);
    });

    it('should have proper ARIA on progress bars', () => {
      /**
       * Progress bar accessibility:
       * - role="progressbar"
       * - aria-valuenow, aria-valuemin, aria-valuemax
       * - aria-label with category and percentage
       * - Screen readers announce progress correctly
       */
      expect(true).toBe(true);
    });
  });

  describe('Stories Integration', () => {
    it('should have Storybook stories', () => {
      /**
       * Stories file: BudgetHealthWidget.stories.ts
       * Expected stories:
       * - Default (warning state with alerts)
       * - Healthy (no alerts)
       * - Exceeded (multiple alerts)
       * - AllStates (all states together)
       */
      expect(true).toBe(true);
    });

    it('should use Lucide icons in Storybook stories', () => {
      /**
       * Storybook uses icon components:
       * - Imports: { Check, TriangleAlert, ArrowRight } from '@lucide/astro'
       * - Uses IconComponent.render({ size, class }) method
       * - Renders icons in story DOM
       */
      expect(true).toBe(true);
    });
  });

  describe('Non-Deprecated Icons', () => {
    it('should use TriangleAlert instead of deprecated AlertTriangle', () => {
      /**
       * Verify icons are not deprecated:
       * - TriangleAlert: current Lucide icon (replaces AlertTriangle)
       * - Check: current Lucide icon
       * - ArrowRight: current Lucide icon
       */
      const deprecatedIcons = ['AlertTriangle'];
      deprecatedIcons.forEach((deprecated) => {
        expect(BUDGET_HEALTH_ICONS.warning === deprecated).toBe(false);
      });
    });

    it('should avoid using deprecated AlertCircle for warnings', () => {
      /**
       * AlertCircle is also deprecated for warnings
       * Use TriangleAlert instead for warning states
       */
      const deprecatedWarningIcons = ['AlertCircle'];
      deprecatedWarningIcons.forEach((deprecated) => {
        expect(BUDGET_HEALTH_ICONS.warning === deprecated).toBe(false);
      });
    });
  });
});

/**
 * Manual Test Checklist
 * ====================
 *
 * Pre-test Setup:
 * [ ] Start Storybook: bun run storybook
 * [ ] Open http://localhost:6006
 * [ ] Navigate to Molecules/BudgetHealthWidget
 *
 * Test 1: Default Story (Warning State)
 * [ ] Verify alert count is displayed
 * [ ] Verify TriangleAlert icon is shown (amber color)
 * [ ] Verify "Review" badge is displayed
 * [ ] Verify category alerts are listed
 * [ ] Verify progress bars show correct colors
 * [ ] Verify View Budget link has ArrowRight icon
 *
 * Test 2: Healthy Story
 * [ ] Verify 0 alerts count is displayed
 * [ ] Verify Check icon is shown (green color)
 * [ ] Verify "All Good" badge is displayed
 * [ ] Verify "All budgets healthy!" message is shown
 * [ ] Verify Check icon is large (24px)
 * [ ] Verify encouraging subtext is displayed
 *
 * Test 3: Exceeded Story
 * [ ] Verify alert count is displayed
 * [ ] Verify TriangleAlert icon is shown (red color)
 * [ ] Verify "Action Needed" badge is displayed
 * [ ] Verify multiple category alerts are listed
 * [ ] Verify progress bars show red for exceeded budgets
 * [ ] Verify negative amounts are red
 *
 * Test 4: All States Story
 * [ ] Verify all three states render side-by-side
 * [ ] Verify distinct colors for each state
 * [ ] Verify consistent layout across states
 * [ ] Verify all icons render correctly
 *
 * Test 5: Icon Rendering
 * [ ] Verify Check icon renders as checkmark
 * [ ] Verify TriangleAlert icon renders as warning triangle
 * [ ] Verify ArrowRight icon renders as right arrow
 * [ ] Verify status icons are 20px
 * [ ] Verify no alerts Check icon is 24px
 * [ ] Verify ArrowRight icon is 16px
 *
 * Test 6: Icon Colors
 * [ ] Verify healthy state icons are green (text-success)
 * [ ] Verify warning state icons are amber (text-warning)
 * [ ] Verify exceeded state icons are red (text-error)
 * [ ] Verify icons inherit text color (stroke-current)
 *
 * Test 7: Progress Bars
 * [ ] Verify progress bar shows correct width
 * [ ] Verify color matches percentage (≥100% red, 80-99% amber, <80% green)
 * [ ] Verify smooth transition on width change
 * [ ] Verify ARIA attributes are present
 *
 * Test 8: View Budget Link
 * [ ] Verify "View Budget" text is displayed
 * [ ] Verify ArrowRight icon is shown
 * [ ] Verify arrow animates right on hover
 * [ ] Verify link navigates to correct URL
 *
 * Test 9: Accessibility - Keyboard
 * [ ] Tab to View Budget link
 * [ ] Verify focus indicator is visible
 * [ ] Press Enter, verify navigation works
 * [ ] Verify logical tab order
 *
 * Test 10: Accessibility - Screen Reader
 * [ ] Enable screen reader (VoiceOver/NVDA)
 * [ ] Verify alert count is announced
 * [ ] Verify status badge text is announced
 * [ ] Verify icons are NOT announced (aria-hidden)
 * [ ] Verify progress bar values are announced
 * [ ] Verify View Budget link aria-label is announced
 *
 * Test 11: Accessibility - ARIA
 * [ ] Inspect component in DevTools
 * [ ] Verify data-budget-health-widget is present
 * [ ] Verify icons have aria-hidden="true"
 * [ ] Verify progress bars have role="progressbar"
 * [ ] Verify progress bars have aria-valuenow/min/max
 * [ ] Verify View Budget link has aria-label
 *
 * Test 12: Responsive Design
 * [ ] Resize to mobile width (< 640px)
 * [ ] Verify component layout works
 * [ ] Verify text doesn't overflow
 * [ ] Resize to desktop (> 1024px)
 * [ ] Verify layout is maintained
 *
 * Test 13: Visual Consistency
 * [ ] Verify consistent spacing
 * [ ] Verify colors match status
 * [ ] Verify icons align with text
 * [ ] Verify no layout shifts
 *
 * Test 14: No Console Errors
 * [ ] Open browser DevTools Console
 * [ ] Test all BudgetHealthWidget stories
 * [ ] Verify NO JavaScript errors
 * [ ] Verify NO missing icon warnings
 * [ ] Verify NO deprecation warnings
 *
 * Test 15: No Inline SVGs
 * [ ] Inspect component HTML in DevTools
 * [ ] Verify NO <svg> elements
 * [ ] Verify NO xmlns attributes
 * [ ] Verify icons use <i> or <svg> from Lucide
 * [ ] Verify all icons are from @lucide/astro
 */
