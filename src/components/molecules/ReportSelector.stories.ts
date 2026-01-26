import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { ChevronDown } = IconRenderers;

/**
 * ReportSelector Component Stories
 *
 * Toggle buttons for Monthly/Yearly selection with period dropdown.
 * Used for filtering financial reports by time range.
 *
 * @see src/components/molecules/ReportSelector.astro - Component implementation
 */

const meta: Meta = {
  title: 'Molecules/ReportSelector',
  tags: ['autodocs'],
  argTypes: {
    selectedRange: {
      control: 'select',
      options: ['monthly', 'yearly'],
      description: 'Selected time range',
    },
    selectedPeriod: {
      control: 'text',
      description: 'Selected period (e.g., "February 2024", "2024")',
    },
    availablePeriods: {
      control: 'object',
      description: 'Array of available periods to select from',
    },
  },
};

export default meta;

interface ReportSelectorArgs {
  selectedRange?: 'monthly' | 'yearly';
  selectedPeriod?: string;
  availablePeriods?: string[];
}

const createReportSelector = (args: ReportSelectorArgs): HTMLElement => {
  const {
    selectedRange = 'monthly',
    selectedPeriod = 'February 2024',
    availablePeriods = [],
  } = args;

  const container = document.createElement('div');
  container.className = 'flex flex-col sm:flex-row gap-4 items-start sm:items-center';

  // Range Toggle Buttons
  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'inline-flex rounded-2xl border border-base-300 bg-base-100 p-1';
  toggleGroup.setAttribute('role', 'group');
  toggleGroup.setAttribute('aria-label', 'Report time range selection');

  const ranges: Array<{ value: 'monthly' | 'yearly'; label: string }> = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  ranges.forEach((range) => {
    const button = document.createElement('button');
    button.className = `
      px-6 py-2 text-sm font-medium rounded-xl transition-all
      ${
        selectedRange === range.value
          ? 'bg-primary text-primary-content shadow-sm'
          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
      }
    `.trim();
    button.setAttribute('type', 'button');
    button.setAttribute('data-range', range.value);
    button.setAttribute('aria-pressed', (selectedRange === range.value).toString());
    button.textContent = range.label;
    toggleGroup.appendChild(button);
  });

  container.appendChild(toggleGroup);

  // Period Selector Dropdown
  if (availablePeriods.length > 0) {
    const dropdown = document.createElement('div');
    dropdown.className = 'relative';

    const dropdownButton = document.createElement('button');
    dropdownButton.className = `
      inline-flex items-center gap-3 px-6 py-2 rounded-2xl border border-base-300
      bg-base-100 text-sm font-medium hover:bg-base-200 transition-colors
    `.trim();
    dropdownButton.setAttribute('type', 'button');
    dropdownButton.setAttribute('aria-haspopup', 'listbox');
    dropdownButton.setAttribute('aria-expanded', 'false');

    const periodText = document.createElement('span');
    periodText.textContent = selectedPeriod;
    dropdownButton.appendChild(periodText);

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'text-base-content/60';
    iconWrapper.appendChild(ChevronDown.render({ size: 16 }, { 'aria-hidden': 'true' }));
    dropdownButton.appendChild(iconWrapper);

    dropdown.appendChild(dropdownButton);

    // Dropdown menu (hidden by default in Storybook)
    const menu = document.createElement('div');
    menu.className =
      'hidden absolute top-full mt-2 right-0 w-56 rounded-2xl bg-base-100 border border-base-300 shadow-lg z-10';
    menu.setAttribute('role', 'listbox');

    const menuInner = document.createElement('div');
    menuInner.className = 'p-2 max-h-64 overflow-y-auto';

    availablePeriods.forEach((period) => {
      const option = document.createElement('button');
      option.className = `
        w-full text-left px-4 py-2 rounded-xl text-sm
        ${
          period === selectedPeriod
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-base-content hover:bg-base-200'
        }
        transition-colors
      `.trim();
      option.setAttribute('type', 'button');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', (period === selectedPeriod).toString());
      option.textContent = period;
      menuInner.appendChild(option);
    });

    menu.appendChild(menuInner);
    dropdown.appendChild(menu);
    container.appendChild(dropdown);
  }

  return container;
};

// Default - Monthly selected
export const Default: StoryObj = {
  args: {
    selectedRange: 'monthly',
    selectedPeriod: 'February 2024',
    availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
  },
  render: (args) => createReportSelector(args as ReportSelectorArgs),
};

// Yearly selected
export const Yearly: StoryObj = {
  args: {
    selectedRange: 'yearly',
    selectedPeriod: '2024',
    availablePeriods: ['2022', '2023', '2024'],
  },
  render: (args) => createReportSelector(args as ReportSelectorArgs),
};

// Many periods available
export const ManyPeriods: StoryObj = {
  args: {
    selectedRange: 'monthly',
    selectedPeriod: 'February 2024',
    availablePeriods: [
      'January 2023',
      'February 2023',
      'March 2023',
      'April 2023',
      'May 2023',
      'June 2023',
      'July 2023',
      'August 2023',
      'September 2023',
      'October 2023',
      'November 2023',
      'December 2023',
      'January 2024',
      'February 2024',
    ],
  },
  render: (args) => createReportSelector(args as ReportSelectorArgs),
};

// Without period selector
export const WithoutPeriodSelector: StoryObj = {
  args: {
    selectedRange: 'monthly',
    selectedPeriod: 'February 2024',
    availablePeriods: [],
  },
  render: (args) => createReportSelector(args as ReportSelectorArgs),
};

// All States
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states = [
      {
        title: 'Monthly Selection',
        args: {
          selectedRange: 'monthly' as const,
          selectedPeriod: 'February 2024',
          availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
        },
      },
      {
        title: 'Yearly Selection',
        args: {
          selectedRange: 'yearly' as const,
          selectedPeriod: '2024',
          availablePeriods: ['2022', '2023', '2024'],
        },
      },
      {
        title: 'Without Period Selector',
        args: {
          selectedRange: 'monthly' as const,
          selectedPeriod: 'February 2024',
          availablePeriods: [],
        },
      },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');

      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold mb-4';
      title.textContent = state.title;
      section.appendChild(title);

      section.appendChild(createReportSelector(state.args));
      container.appendChild(section);
    });

    return container;
  },
};

// Dark Mode Comparison
export const DarkModeComparison: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    // Light mode
    const lightSection = document.createElement('section');
    lightSection.setAttribute('data-theme', 'light');
    lightSection.className = 'p-6 bg-base-200 rounded-lg';

    const lightTitle = document.createElement('h3');
    lightTitle.className = 'text-lg font-semibold mb-4';
    lightTitle.textContent = 'Light Mode';
    lightSection.appendChild(lightTitle);

    lightSection.appendChild(
      createReportSelector({
        selectedRange: 'monthly',
        selectedPeriod: 'February 2024',
        availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
      })
    );
    container.appendChild(lightSection);

    // Dark mode
    const darkSection = document.createElement('section');
    darkSection.setAttribute('data-theme', 'dark');
    darkSection.className = 'p-6 bg-base-200 rounded-lg';

    const darkTitle = document.createElement('h3');
    darkTitle.className = 'text-lg font-semibold mb-4';
    darkTitle.textContent = 'Dark Mode';
    darkSection.appendChild(darkTitle);

    darkSection.appendChild(
      createReportSelector({
        selectedRange: 'monthly',
        selectedPeriod: 'February 2024',
        availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
      })
    );
    container.appendChild(darkSection);

    return container;
  },
};

// Mobile Responsive
export const MobileResponsive: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    // Mobile viewport simulation
    const mobileSection = document.createElement('section');
    mobileSection.className = 'p-4 bg-base-200 rounded-lg max-w-sm';

    const mobileTitle = document.createElement('h3');
    mobileTitle.className = 'text-lg font-semibold mb-4';
    mobileTitle.textContent = 'Mobile View (< 640px)';
    mobileSection.appendChild(mobileTitle);

    mobileSection.appendChild(
      createReportSelector({
        selectedRange: 'monthly',
        selectedPeriod: 'February 2024',
        availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
      })
    );
    container.appendChild(mobileSection);

    // Desktop viewport
    const desktopSection = document.createElement('section');
    desktopSection.className = 'p-6 bg-base-200 rounded-lg';

    const desktopTitle = document.createElement('h3');
    desktopTitle.className = 'text-lg font-semibold mb-4';
    desktopTitle.textContent = 'Desktop View (>= 640px)';
    desktopSection.appendChild(desktopTitle);

    desktopSection.appendChild(
      createReportSelector({
        selectedRange: 'monthly',
        selectedPeriod: 'February 2024',
        availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
      })
    );
    container.appendChild(desktopSection);

    return container;
  },
};
