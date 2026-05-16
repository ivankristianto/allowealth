/**
 * Landing Page Content Data
 * Centralized content for public landing pages
 */

import type { ImageMetadata } from 'astro';
import dashboardImg from '@/assets/screenshots/dashboard.jpg';
import transactionsImg from '@/assets/screenshots/transactions.jpg';
import budgetImg from '@/assets/screenshots/budget.jpg';
import accountsImg from '@/assets/screenshots/accounts.jpg';
import reportsImg from '@/assets/screenshots/reports.jpg';

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
  spotIllustration: 'dashboard' | 'transactions' | 'budget' | 'accounts' | 'reports';
  iconColor: string; // DaisyUI color class
  iconBg: string; // DaisyUI background class
  title: string;
  titleHighlight: string;
  highlightColor: string; // Text color class for highlight
  description: string;
  features: string[];
  featureIconColor: string;
  image: ImageMetadata;
  imageAlt: string;
  gradientClass: string; // Gradient overlay class
  reverse?: boolean; // Alternate layout direction
}

export interface FeatureGridItem {
  id: string;
  spotIllustration: 'fast' | 'secure' | 'multicultural' | 'households' | 'opensource' | 'forecast';
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

const DEMO_URL = 'https://preview.allowealth.io';
const SELF_HOST_DOCS_URL = 'https://docs.allowealth.io/self-host';

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
      { label: 'Self-Host Guide', href: SELF_HOST_DOCS_URL },
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
    spotIllustration: 'dashboard',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Shared clarity',
    titleHighlight: 'every day.',
    highlightColor: 'text-primary',
    description:
      'No more end-of-month surprises. One shared view of spending, accounts, and budget health — so everyone stays on the same page.',
    features: ['Shared monthly overview', 'Group account totals', 'Shared budget health'],
    featureIconColor: 'text-primary',
    image: dashboardImg,
    imageAlt: 'allowealth Dashboard',
    gradientClass: 'from-primary/20 to-transparent',
  },
  {
    id: 'transactions',
    spotIllustration: 'transactions',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'Track spending',
    titleHighlight: 'together.',
    highlightColor: 'text-accent',
    description:
      'Every dollar in, every dollar out — logged and categorized. No more guessing who paid for what or where it all went.',
    features: ['Log shared expenses', 'Filter by month or category', 'Import bank statements'],
    featureIconColor: 'text-accent',
    image: transactionsImg,
    imageAlt: 'allowealth Transactions',
    gradientClass: 'from-accent/20 to-transparent',
    reverse: true,
  },
  {
    id: 'budget',
    spotIllustration: 'budget',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Plan your month,',
    titleHighlight: 'not just track it.',
    highlightColor: 'text-success',
    description:
      'Set limits before the month starts, not after. Get alerts before you overspend and stay accountable together.',
    features: ['Category limits with alerts', 'Monthly budget planning', 'Copy budgets forward'],
    featureIconColor: 'text-success',
    image: budgetImg,
    imageAlt: 'allowealth Budget Planning',
    gradientClass: 'from-success/20 to-transparent',
  },
  {
    id: 'accounts',
    spotIllustration: 'accounts',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'All your accounts,',
    titleHighlight: 'one workspace.',
    highlightColor: 'text-warning',
    description:
      'Every bank account, savings pot, and investment in one place. Track across currencies without the spreadsheet juggling.',
    features: [
      'Multi-currency (IDR / USD / EUR)',
      'Bank, savings & investment accounts',
      'Recurring transactions',
    ],
    featureIconColor: 'text-warning',
    image: accountsImg,
    imageAlt: 'allowealth Account Management',
    gradientClass: 'from-warning/20 to-transparent',
    reverse: true,
  },
  {
    id: 'reports',
    spotIllustration: 'reports',
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
    title: 'See the',
    titleHighlight: 'full picture.',
    highlightColor: 'text-info',
    description:
      'Spot patterns before they become problems. Category breakdowns, monthly trends, and year-over-year analysis — always at hand.',
    features: ['Spending trends by category', 'Monthly and yearly analysis', 'Export and share'],
    featureIconColor: 'text-info',
    image: reportsImg,
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
    spotIllustration: 'fast',
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
    spotIllustration: 'secure',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'Secure',
    description: 'Your data is encrypted. Self-host for full control.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'multi-currency',
    spotIllustration: 'multicultural',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Multi-Currency',
    description: 'IDR, USD, EUR and more — all in one workspace.',
    colSpan: 'md:col-span-5',
    variant: 'light',
  },
  {
    id: 'for-everyone',
    spotIllustration: 'households',
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
    spotIllustration: 'opensource',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'You Own Your Data',
    description: 'Hosted for convenience, or self-hosted for complete control. No lock-in, ever.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'forecast',
    spotIllustration: 'forecast',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Forecast',
    description: 'See months ahead. Model scenarios. Plan your financial future with confidence.',
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
      'Spreadsheets are powerful but a pain to maintain. One wrong formula and your entire budget is toast. Allowealth handles the boring stuff—currency conversions, recurring transactions, shared access—so you can focus on actually managing your money instead of debugging formulas.',
  },
  {
    question: 'Can I manage money with my partner or group?',
    answer:
      "Absolutely! That's literally what we're built for. Invite your partner, roommates, or family. Everyone sees the same numbers in real-time, so no more 'Wait, did you pay the electric bill?' text chains at midnight.",
  },
  {
    question: 'Is my financial data secure?',
    answer:
      "Yes. Your data is encrypted, and we don't sell your info to advertisers (because that's creepy). Want maximum privacy? Self-host it on your own server. Your data, your rules—always.",
  },
  {
    question: 'Do I have to pay to use Allowealth?',
    answer:
      "Nope! The core app is free and open-source. Self-host it forever at zero cost. We do offer a hosted version for a small monthly fee if you'd rather we handle the technical stuff. Your choice.",
  },
  {
    question: 'What currencies do you support?',
    answer:
      'All the major ones—IDR, USD, EUR, GBP, JPY, and more. Track accounts in different currencies and see your total net worth converted to whatever currency you prefer. No more mental math required.',
  },
];

// ============================================================================
// Hero Content
// ============================================================================

export const heroContent = {
  badge: 'For Households & Communities',
  typingHeadlines: [
    'Where did all the money go?',
    'Who paid for groceries again?',
    'Are we even close to budget?',
  ],
  titleSuffix: 'Now you know.',
  description:
    'Stop playing detective with your own bank account. Allowealth shows you exactly where your household money goes—so you can stop worrying and start planning.',
  ctaGuest: 'See it in action',
  ctaGuestHref: DEMO_URL,
  ctaLoggedIn: 'Go to Dashboard',
  ctaSecondary: 'Self-host for free',
  ctaSecondaryHref: SELF_HOST_DOCS_URL,
};

// ============================================================================
// Brand Content
// ============================================================================

export const brandContent = {
  name: 'allowealth',
  tagline: "Stop guessing where your money went. Start knowing where it's going.",
  copyright: `© ${new Date().getFullYear()} allowealth. Built for households who actually want to see their money.`,
};
