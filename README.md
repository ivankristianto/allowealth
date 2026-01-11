# expenses

Personal and Family Financial Application

## Quick Start

```bash
# Install dependencies
bun install

# Set up database (migrate + seed with demo data)
bun run db:reset

# Start development server
bun run dev
```

## Database Seeding

### Demo User Credentials

After seeding, you can log in with:

- **Email:** `demo@example.com`
- **Password:** `demo123`

### Seeded Data

The seeder creates realistic sample data for testing:

- **1 User** with default settings (IDR as primary currency)
- **15 Categories** (4 income, 11 expense types)
- **5 Payment Methods** (Cash, BCA Debit/Credit, GoPay, OVO)
- **360+ Transactions** spanning 90 days with Indonesian spending patterns
- **6 Assets** (bank accounts, mutual funds, stocks, crypto)
- **72 Asset History entries** (weekly balance updates)
- **6 Asset Update Reminders**
- **3 Asset Snapshots** with items
- **90 Exchange Rate entries** (IDR/USD for last 90 days)

### Seed Commands

```bash
# Seed database with full demo data (keeps existing data)
bun run db:seed

# Seed database with dashboard test data (lightweight, focused on dashboard)
bun run db:seed:dashboard

# Reset database with full demo data
bun run db:reset

# Reset database with dashboard test data
bun run db:reset:dashboard
```

### Dashboard Test User

For dashboard testing, you can use the dashboard seeder which creates:

- **Email:** `test@example.com`
- **Password:** `Test12345678!`

The dashboard seeder creates focused test data:

- **1 User** with default settings
- **11 Categories** (3 income, 8 expense types)
- **3 Payment Methods** (Cash, Bank Transfer, Credit Card)
- **200+ Transactions** spanning 90 days
- **6 Assets** with varied update dates (to test priority logic)
- **90 Exchange Rate entries** (IDR/USD)

### Troubleshooting

**Issue:** "no such table" error when running `db:seed`

**Solution:** The database tables haven't been created yet. Run `bun run db:reset` to set up the database from scratch.

**Issue:** Database becomes corrupted or has invalid data

**Solution:** Run `bun run db:reset` to start fresh with a clean database.
