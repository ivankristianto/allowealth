import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Card',
  tags: ['autodocs'],
  argTypes: {
    bordered: { control: 'boolean' },
    compact: { control: 'boolean' },
    hoverable: { control: 'boolean' },
  },
};

export default meta;

const createCard = (args: {
  bordered?: boolean;
  compact?: boolean;
  hoverable?: boolean;
  title?: string;
  content?: string;
}): HTMLElement => {
  const {
    bordered = true,
    compact = false,
    hoverable = false,
    title = 'Card Title',
    content = 'Card content goes here. This is a versatile container component.',
  } = args;

  const card = document.createElement('div');
  const classes = ['card', 'bg-base-100'];
  if (bordered) classes.push('card-bordered');
  if (compact) classes.push('card-compact', 'p-4');
  else classes.push('p-6');
  if (hoverable) classes.push('shadow-xl', 'hover:shadow-2xl', 'transition-shadow', 'duration-200');
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
    card.className = 'card bg-base-100 card-bordered p-6';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Budget Summary';

    const content = document.createElement('p');
    content.textContent = 'Monthly spending overview and analysis.';

    const actions = document.createElement('div');
    actions.className = 'card-actions justify-end mt-4';

    const btn1 = document.createElement('button');
    btn1.className = 'btn btn-primary';
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
    card.className = 'card bg-base-100 card-bordered p-6';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';

    const titleDiv = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'card-title text-lg';
    title.textContent = 'Groceries';

    const subtitle = document.createElement('p');
    subtitle.className = 'text-neutral-500 text-sm';
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
    progress.value = '50';
    progress.max = '100';

    card.appendChild(header);
    card.appendChild(stats);
    card.appendChild(progress);

    return card;
  },
};
