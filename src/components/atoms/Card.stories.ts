import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Card',
  tags: ['autodocs'],
  argTypes: {
    bordered: { control: 'boolean' },
    compact: { control: 'boolean' },
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Padding size: sm (1rem), md (1.75rem), lg (2rem/premium)',
    },
    rounded: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
      description: 'Border radius',
    },
    hoverable: { control: 'boolean' },
  },
};

export default meta;

const createCard = (args: {
  bordered?: boolean;
  compact?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hoverable?: boolean;
  title?: string;
  content?: string;
}): HTMLElement => {
  const {
    bordered = true,
    compact = false,
    padding = 'md',
    rounded = 'md',
    hoverable = false,
    title = 'Card Title',
    content = 'Card content goes here. This is a versatile container component.',
  } = args;

  const card = document.createElement('div');
  const classes = ['card', 'bg-base-100'];
  if (bordered) classes.push('card-bordered', 'border-base-300');

  // Padding classes
  const paddingClasses: Record<string, string> = {
    sm: 'p-4',
    md: 'p-7',
    lg: 'p-8',
  };

  // Rounded classes
  const roundedClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  };

  if (compact) classes.push('card-compact', 'p-4');
  else classes.push(paddingClasses[padding]);

  classes.push(roundedClasses[rounded], 'shadow-premium');

  if (hoverable) {
    classes.push('hover:-translate-y-1', 'hover:shadow-lg', 'transition-all', 'duration-200');
  }

  card.className = classes.join(' ');

  const titleEl = document.createElement('h2');
  titleEl.className = 'card-title';
  titleEl.textContent = title;

  const body = document.createElement('p');
  body.textContent = content;

  card.appendChild(titleEl);
  card.appendChild(body);

  return card;
};

export const Default: StoryObj = {
  args: {
    title: 'Welcome',
    content: 'This is the default card style with border.',
  },
  render: (args) => createCard(args),
};

export const Compact: StoryObj = {
  args: {
    compact: true,
    title: 'Compact Card',
    content: 'A compact version with smaller padding.',
  },
  render: (args) => createCard(args),
};

export const Hoverable: StoryObj = {
  args: {
    hoverable: true,
    title: 'Hoverable Card',
    content: 'Hover over me to see the shadow effect!',
  },
  render: (args) => createCard(args),
};

export const NoBorder: StoryObj = {
  args: {
    bordered: false,
    title: 'No Border',
    content: 'A card without visible border.',
  },
  render: (args) => createCard(args),
};

export const WithActions: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered border-base-300 p-7 shadow-premium';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Budget Summary';

    const content = document.createElement('p');
    content.textContent = 'Monthly spending overview and analysis.';

    const actions = document.createElement('div');
    actions.className = 'card-actions justify-end mt-4';

    const btn1 = document.createElement('button');
    btn1.className = 'btn btn-accent';
    btn1.textContent = 'View Details';

    const btn2 = document.createElement('button');
    btn2.className = 'btn btn-ghost';
    btn2.textContent = 'Cancel';

    actions.appendChild(btn2);
    actions.appendChild(btn1);

    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(actions);

    return card;
  },
};

export const BudgetCard: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered border-base-300 p-7 shadow-premium';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';

    const titleDiv = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'card-title text-lg';
    title.textContent = 'Groceries';

    const subtitle = document.createElement('p');
    subtitle.className = 'text-base-content/60 text-sm';
    subtitle.textContent = 'Monthly budget';

    titleDiv.appendChild(title);
    titleDiv.appendChild(subtitle);

    const badge = document.createElement('span');
    badge.className = 'badge badge-success';
    badge.textContent = 'On Track';

    header.appendChild(titleDiv);
    header.appendChild(badge);

    const stats = document.createElement('div');
    stats.className = 'stats stats-vertical bg-base-200 mt-4 w-full';

    const stat1 = document.createElement('div');
    stat1.className = 'stat';
    stat1.innerHTML = `
      <div class="stat-title">Spent</div>
      <div class="stat-value text-primary">Rp 2.5M</div>
      <div class="stat-desc">of Rp 5M budget</div>
    `;

    const stat2 = document.createElement('div');
    stat2.className = 'stat';
    stat2.innerHTML = `
      <div class="stat-title">Remaining</div>
      <div class="stat-value text-success">Rp 2.5M</div>
      <div class="stat-desc">15 days left</div>
    `;

    stats.appendChild(stat1);
    stats.appendChild(stat2);

    const progress = document.createElement('progress');
    progress.className = 'progress progress-primary w-full mt-4';
    progress.value = 50;
    progress.max = 100;

    card.appendChild(header);
    card.appendChild(stats);
    card.appendChild(progress);

    return card;
  },
};

// New stories for padding and rounded variants

export const LargePadding: StoryObj = {
  args: {
    padding: 'lg',
    rounded: 'xl',
    title: 'Premium Card',
    content: 'A card with large padding (2rem) and extra large rounded corners for a premium look.',
  },
  render: (args) => createCard(args),
};

export const ExtraRounded: StoryObj = {
  args: {
    rounded: '3xl',
    title: 'Extra Rounded',
    content: 'A card with maximum rounded corners (3xl) for a modern, soft appearance.',
  },
  render: (args) => createCard(args),
};

export const AllPaddingSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const sizes = ['sm', 'md', 'lg'] as const;
    const sizeLabels = { sm: 'Small (1rem)', md: 'Medium (1.75rem)', lg: 'Large (2rem)' };

    sizes.forEach((size) => {
      const card = createCard({
        padding: size,
        rounded: 'xl',
        title: sizeLabels[size],
        content: `Card with ${sizeLabels[size]} padding.`,
      });
      container.appendChild(card);
    });

    return container;
  },
};

export const AllRoundedSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-2 md:grid-cols-4 gap-4';

    const sizes = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

    sizes.forEach((size) => {
      const card = createCard({
        rounded: size,
        title: size.toUpperCase(),
        content: `${size} corners`,
      });
      container.appendChild(card);
    });

    return container;
  },
};

export const PremiumCard: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered border-base-300 p-8 shadow-premium rounded-xl';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start mb-6';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'flex flex-col gap-1';

    const label = document.createElement('span');
    label.className = 'text-xs uppercase tracking-widest text-base-content/60 font-semibold';
    label.textContent = 'MONTHLY SPENDING';

    const title = document.createElement('h3');
    title.className = 'text-2xl font-bold tracking-tight text-primary';
    title.textContent = 'Rp53.694.000';

    titleDiv.appendChild(label);
    titleDiv.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'badge badge-success';
    badge.textContent = '82% used';

    header.appendChild(titleDiv);
    header.appendChild(badge);

    const progress = document.createElement('progress');
    progress.className = 'progress progress-success w-full';
    progress.value = 82;
    progress.max = 100;

    const remaining = document.createElement('p');
    remaining.className = 'text-sm text-base-content/60 mt-3';
    remaining.textContent = 'Remaining for Jan: Rp12.246.000';

    card.appendChild(header);
    card.appendChild(progress);
    card.appendChild(remaining);

    return card;
  },
};
