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
# Seed database (keeps existing data)
bun run db:seed

# Reset database (deletes .dev.db, migrates, and seeds)
bun run db:reset
```

### Troubleshooting

**Issue:** "no such table" error when running `db:seed`

**Solution:** The database tables haven't been created yet. Run `bun run db:reset` to set up the database from scratch.

**Issue:** Database becomes corrupted or has invalid data

**Solution:** Run `bun run db:reset` to start fresh with a clean database.
