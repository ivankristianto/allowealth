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

export interface FaqItem {
  question: string;
  answer: string;
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
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Self-Host Guide', href: 'https://docs.allowealth.io/self-host' },
      { label: 'Roadmap', href: 'https://github.com/ivankristianto/allowealth/issues' },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  {
    id: 'github',
    label: 'GitHub',
    href: 'https://github.com/ivankristianto/allowealth',
    icon: 'GitHub',
  },
];

export const legalLinks: FooterLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
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
    title: 'Shared clarity',
    titleHighlight: 'every day.',
    highlightColor: 'text-primary',
    description:
      'See household or group spending, account totals, and budget health in one shared view, without the admin work.',
    features: ['Shared monthly overview', 'Group account totals', 'Shared budget health'],
    featureIconColor: 'text-primary',
    imageUrl: '/screenshots/dashboard.jpg',
    imageAlt: 'allowealth Dashboard',
    gradientClass: 'from-primary/20 to-transparent',
  },
  {
    id: 'transactions',
    icon: 'ArrowLeftRight',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'Track spending',
    titleHighlight: 'together.',
    highlightColor: 'text-accent',
    description:
      'Record income and expenses as a household or community. No more guessing who paid for what. Import easily from your bank.',
    features: ['Log shared expenses', 'Filter by month or category', 'Import bank statements'],
    featureIconColor: 'text-accent',
    imageUrl: '/screenshots/transactions.jpg',
    imageAlt: 'allowealth Transactions',
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
      'Set limits by category and get alerts before you overspend. Plan each month together and stay accountable.',
    features: ['Category limits with alerts', 'Monthly budget planning', 'Copy budgets forward'],
    featureIconColor: 'text-success',
    imageUrl: '/screenshots/budget.jpg',
    imageAlt: 'allowealth Budget Planning',
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
      'Bank accounts, savings, and investments — all together. Track balances across currencies and automate recurring transactions.',
    features: [
      'Multi-currency (IDR / USD / EUR)',
      'Bank, savings & investment accounts',
      'Recurring transactions',
    ],
    featureIconColor: 'text-warning',
    imageUrl: '/screenshots/accounts.jpg',
    imageAlt: 'allowealth Account Management',
    gradientClass: 'from-warning/20 to-transparent',
    reverse: true,
  },
  {
    id: 'reports',
    icon: 'ChartColumn',
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
    title: 'See the',
    titleHighlight: 'full picture.',
    highlightColor: 'text-info',
    description:
      'Clear spending trends, category breakdowns, and month-over-month analysis. Export and share anytime.',
    features: ['Spending trends by category', 'Monthly and yearly analysis', 'Export and share'],
    featureIconColor: 'text-info',
    imageUrl: '/screenshots/reports.jpg',
    imageAlt: 'allowealth Financial Reports',
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
    description: 'Snappy on every device. No wait screens, no bloat.',
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
    title: 'Built for Households & Communities',
    description:
      'Couples, young families, and small groups — a shared financial workspace that keeps everyone on the same page.',
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
    description: 'Hosted for convenience, or self-hosted for complete control. No lock-in, ever.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'forecast',
    icon: 'TrendingUp',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Forecast',
    description: 'Project savings, explore what-ifs, and plan your financial future together.',
    colSpan: 'md:col-span-8',
    variant: 'light',
  },
];

// ============================================================================
// FAQ Data
// ============================================================================

export const faqItems: FaqItem[] = [
  {
    question: 'How is Allowealth different from a spreadsheet?',
    answer:
      'Spreadsheets are powerful but high-maintenance. Allowealth gives you a structured, mobile-friendly workspace designed specifically for money. It handles multi-currency, recurring transactions, and shared access much more elegantly than a row of cells.',
  },
  {
    question: 'Can I manage money with my partner or group?',
    answer:
      'Yes! Allowealth is built for collaboration. You can invite your partner, family members, or community leads to a shared workspace where everyone can see the same data in real-time.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Security is our priority. Your data is encrypted, and we never sell your information. For maximum privacy, you can also choose to self-host Allowealth on your own infrastructure.',
  },
  {
    question: 'Do I have to pay to use Allowealth?',
    answer:
      'The core version of Allowealth is free and open-source. You can self-host it for free forever. We offer a hosted SaaS version for a small monthly fee if you prefer convenience, automatic backups, and managed updates.',
  },
  {
    question: 'What currencies do you support?',
    answer:
      'Allowealth supports all major global currencies, including IDR, USD, EUR, and more. You can track accounts in different currencies and see your total net worth in your preferred base currency.',
  },
];

// ============================================================================
// Hero Content
// ============================================================================

export const heroContent = {
  badge: 'For Households & Communities',
  title: 'Manage money',
  titleHighlightPrefix: 'together. ',
  titleHighlight: 'Without stress.',
  description:
    'A shared money operating system for households and small communities. See where your money goes, plan budgets together, and skip the spreadsheets.',
  ctaGuest: 'Get Started Free',
  ctaLoggedIn: 'Go to Dashboard',
  ctaSecondary: 'See how it works',
  ctaSecondaryHref: '#showcase',
};

// ============================================================================
// Brand Content
// ============================================================================

export const brandContent = {
  name: 'allowealth',
  tagline: 'A shared money operating system for households and small communities.',
  copyright: `© ${new Date().getFullYear()} allowealth. Manage money together.`,
};
