/**
 * Landing Page Content Data
 * Centralized content for public landing pages
 */

// ============================================================================
// Types
// ============================================================================

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
}

export interface FooterLinkSection {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: string; // Lucide icon name
}

export interface ShowcaseItem {
  id: string;
  icon: string; // Lucide icon name
  iconColor: string; // DaisyUI color class
  iconBg: string; // DaisyUI background class
  title: string;
  titleHighlight: string;
  highlightColor: string; // Text color class for highlight
  description: string;
  features: string[];
  featureIconColor: string;
  imageUrl: string;
  imageAlt: string;
  gradientClass: string; // Gradient overlay class
  reverse?: boolean; // Alternate layout direction
}

export interface FeatureGridItem {
  id: string;
  icon: string; // Lucide icon name
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  colSpan: string; // Tailwind grid column span
  variant: 'light' | 'dark'; // Card theme
  size?: 'normal' | 'large'; // Text size variant
}

// ============================================================================
// Pricing Data
// ============================================================================

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Rp 0',
    description: 'The base ledger for individuals.',
    features: [
      'Manual Transaction Logging',
      '3 Account Accounts',
      'Single User Access',
      'Basic Reports',
    ],
  },
  {
    name: 'Pro',
    price: 'Rp 99k',
    description: 'The complete family headquarters.',
    featured: true,
    features: [
      'Unlimited Accounts',
      'AI Receipt Scanning',
      'Global Currency Sync',
      'Advanced 30-Year Forecasts',
      'Premium Dashboard Insights',
    ],
  },
  {
    name: 'Expert',
    price: 'Rp 249k',
    description: 'For high-net-worth households.',
    features: [
      'Up to 10 Members',
      'Custom Audit Logs',
      'Priority Support',
      'API Data Connectors',
      'Investment Accounts Hub',
    ],
  },
];

// ============================================================================
// Footer Data
// ============================================================================

export const footerLinks: FooterLinkSection[] = [
  {
    title: 'Ecosystem',
    links: [
      { label: 'Wealth View', href: '#' },
      { label: 'AI Receipt Scan', href: '#' },
      { label: 'Goal Forecast', href: '#' },
      { label: 'Audit Logs', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Finance API', href: '#' },
      { label: 'Security Audit', href: '#' },
      { label: 'Tax Integration', href: '#' },
      { label: 'Help Center', href: '#' },
    ],
  },
  {
    title: 'Privacy',
    links: [
      { label: 'Data Protocol', href: '#' },
      { label: 'Trust Center', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR Sync', href: '#' },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  { id: 'facebook', label: 'Facebook', href: '#', icon: 'Facebook' },
  { id: 'instagram', label: 'Instagram', href: '#', icon: 'Instagram' },
  { id: 'twitter', label: 'Twitter', href: '#', icon: 'Twitter' },
  { id: 'linkedin', label: 'LinkedIn', href: '#', icon: 'Linkedin' },
];

export const legalLinks: FooterLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Contact', href: '/contact' },
];

// ============================================================================
// Showcase Data
// ============================================================================

export const showcaseItems: ShowcaseItem[] = [
  {
    id: 'dashboard',
    icon: 'LayoutDashboard',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Everything in',
    titleHighlight: 'one place.',
    highlightColor: 'text-primary',
    description:
      'Get a clear picture of your finances every day. See monthly spending, account totals, and budget health at a glance — no digging required.',
    features: [
      'Monthly spending overview',
      'Account totals at a glance',
      'Budget health at a glance',
    ],
    featureIconColor: 'text-primary',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Dashboard',
    gradientClass: 'from-primary/20 to-transparent',
  },
  {
    id: 'transactions',
    icon: 'ArrowLeftRight',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'Track every dollar',
    titleHighlight: 'in and out.',
    highlightColor: 'text-accent',
    description:
      'Record income and expenses in seconds. Filter by month, category, or account. Import from CSV and keep your data accurate.',
    features: [
      'Log income and expenses',
      'Filter by month, category, account',
      'Import CSV from your bank',
    ],
    featureIconColor: 'text-accent',
    imageUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Transaction Tracking',
    gradientClass: 'from-accent/20 to-transparent',
    reverse: true,
  },
  {
    id: 'budget',
    icon: 'PiggyBank',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Plan your month,',
    titleHighlight: 'not just track it.',
    highlightColor: 'text-success',
    description:
      "Set spending limits by category and stay informed when you're close to the edge. Plan each month deliberately and carry your plan forward.",
    features: ['Category limits with alerts', 'Monthly budget planning', 'Copy budgets forward'],
    featureIconColor: 'text-success',
    imageUrl:
      'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Budget Planning',
    gradientClass: 'from-success/20 to-transparent',
  },
  {
    id: 'accounts',
    icon: 'Landmark',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'All your accounts,',
    titleHighlight: 'one workspace.',
    highlightColor: 'text-warning',
    description:
      'Connect bank accounts, savings, and investments in one place. Track balances across currencies and manage recurring transactions without manual work.',
    features: [
      'Multi-currency (IDR / USD / EUR)',
      'Bank, savings & investment accounts',
      'Recurring transactions',
    ],
    featureIconColor: 'text-warning',
    imageUrl:
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Account Management',
    gradientClass: 'from-warning/20 to-transparent',
    reverse: true,
  },
  {
    id: 'reports',
    icon: 'BarChart3',
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
    title: 'See the',
    titleHighlight: 'full picture.',
    highlightColor: 'text-info',
    description:
      'Understand where your money goes with clear spending trends, category breakdowns, and month-over-month analysis. Export and share when you need to.',
    features: ['Spending trends by category', 'Monthly and yearly analysis', 'Export and share'],
    featureIconColor: 'text-info',
    imageUrl:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Reports',
    gradientClass: 'from-info/20 to-transparent',
  },
];

// ============================================================================
// Features Grid Data
// ============================================================================

export const featureGridItems: FeatureGridItem[] = [
  {
    id: 'fast',
    icon: 'Zap',
    iconColor: 'text-white',
    iconBg: 'bg-white/10',
    title: 'Fast',
    description: 'Snappy on every device. Built with performance-first development.',
    colSpan: 'md:col-span-8',
    variant: 'dark',
    size: 'large',
  },
  {
    id: 'secure',
    icon: 'Shield',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'Secure',
    description: 'Your data is encrypted. Self-host for full control.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'multi-currency',
    icon: 'Globe',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Multi-Currency',
    description: 'IDR, USD, EUR and more — all in one workspace.',
    colSpan: 'md:col-span-5',
    variant: 'light',
  },
  {
    id: 'for-everyone',
    icon: 'Users',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'For Everyone',
    description: 'Individuals, families, or your small community — one workspace adapts to all.',
    colSpan: 'md:col-span-7',
    variant: 'light',
    size: 'large',
  },
  {
    id: 'open-source',
    icon: 'Lock',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'You Own Your Data',
    description: 'Open source. Self-host it. No lock-in, ever.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'forecast',
    icon: 'TrendingUp',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Forecast',
    description: 'Project savings, model scenarios, and plan your financial future.',
    colSpan: 'md:col-span-8',
    variant: 'light',
  },
];

// ============================================================================
// Hero Content
// ============================================================================

export const heroContent = {
  badge: 'Open Source · Free Forever',
  title: 'Track your',
  titleHighlightPrefix: 'wealth. ',
  titleHighlight: 'Your way.',
  description:
    'For individuals, families, and small communities. Track income, expenses, budgets, and accounts in one place. Self-host it or use our cloud.',
  ctaGuest: 'Get Started Free',
  ctaLoggedIn: 'Go to Dashboard',
  ctaSecondary: 'View on GitHub',
  ctaSecondaryHref: '#github',
};

// ============================================================================
// Brand Content
// ============================================================================

export const brandContent = {
  name: 'allowealth',
  tagline: 'Open source personal finance for individuals, families, and small communities.',
  copyright: `© ${new Date().getFullYear()} allowealth. Free and open source.`,
};
