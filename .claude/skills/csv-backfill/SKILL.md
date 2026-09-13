---
name: csv-backfill
description: Use when backfilling a month of household finance records from the CSV exports into the app, adding a new month to the backfill config, or interpreting an `aw backfill verify` failure. Covers the data directory layout, the parsing defects the tool works around, and how to respond to each detection abort.
---

# CSV Backfill

`aw backfill` loads monthly household-finance CSV pairs into Allowealth over
the REST API. It refuses to guess: anything it does not recognise aborts with
a message naming the config field that resolves it.

## 1. The monthly procedure

Everything month-specific lives in the data directory, never in the repository.

```
$AW_BACKFILL_DIR/
  <the CSV pairs, named by the `filenames` templates>
  .aw-backfill/
    config.json      # the only place month-specific knowledge lives
    ledger.json      # which months are claimed and which are loaded
    plans/           # the plan this tool saved for each loaded month
```

Environment: `AW_BACKFILL_DIR`, `AW_BACKFILL_BASE_URL`, `AW_BACKFILL_EMAIL`,
`AW_BACKFILL_PASSWORD`, and `AW_BACKFILL_SECONDARY_PASSWORD` for
`setup --create-user`. There is no password flag on any subcommand, so a
secret cannot land in shell history.

```bash
bun run aw backfill scaffold --from <first> --to <last>   # once, then edit by hand
bun run aw backfill setup                                  # idempotent
bun run aw backfill run --month <mon> --dry-run            # always first
bun run aw backfill run --from <first> --to <last>
bun run aw backfill verify --month <mon>                   # read-only, exits 1 on drift
```

**Always dry-run first.** A dry run builds and verifies the plan and writes
nothing — not to the app, not to the ledger.

**Months load in order.** An account is created on its first appearance, and
its opening balance is stamped from that month. Loading a later month first
stamps the wrong origin balance onto every account it creates, silently. Gap
detection walks forward from `dateRules.earliestMonth` and aborts naming any
month behind the target that is not loaded.

## 2. The three parsing defects

The exports carry three defects the parser works around. **The parser is
positional by necessity. Do not "simplify" it to read by header name.**

1. **Blank `No` column.** Account rows past the numbered block have an empty
   row-number cell. The account table therefore terminates on footnote markers
   (`*`, `(`, `....`), never on the row-number column.
2. **Currency-prefixed amounts.** Some cells carry a currency prefix. `parseAmount`
   strips it.
3. **Drifting header labels.** The label in the `Timestamp` position changes
   between months. Transaction columns are read by position; only the summary
   scalars (`USD to IDR`, `Total Income`, `Total Expenses`, `Total Akhir Bulan`)
   are found by label, because their position is what moves.

A blank cell and an unparseable cell are distinct from zero throughout. A new
defect aborts the run rather than being silently recorded as a zero-value row.

## 3. Responding to a detection abort

| Abort                                                | Fix                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Account "X" is not in the roster`                   | Add it to `accounts` with its currency, or map it with `accountAliases` if it is a rename                   |
| `Account "X" appears N times … with no rule`         | Add a `duplicateRules` entry for that month, name and occurrence, and add the renamed account to `accounts` |
| `Unknown expense/income category: "X"`               | Add it to `categories.expense` / `categories.income`, or map it with `categoryRenames`                      |
| `… blank local amount but a foreign amount`          | A placeholder row. Add a `suppressedRows` entry for it                                                      |
| `… has a blank amount`                               | Fill the cell in the CSV, or add a `suppressedRows` entry                                                   |
| `… carries a foreign amount but has no routing rule` | Add an `incomeRouting` entry mapping the category to a foreign-currency account                             |
| `Row "…" names both members`                         | Rename the row in the CSV, or suppress it                                                                   |
| `Date "…" falls outside <month>`                     | Fix the cell, or suppress the row                                                                           |
| `… is already loaded`                                | Re-run with `--force` to purge and reload                                                                   |
| `rows diverge from the plan this tool saved`         | Something else wrote into the month. Investigate before passing `--force`                                   |
| `No free balance-history slot left`                  | The day's 23:00–23:59 window is full. Clear the stale snapshots for that day first                          |
| `loaded but does not reconcile`                      | Link 2 failed. The month stays `loading`; investigate, then re-run                                          |

**Rename or closure?** An account that stops appearing at a **non-zero**
balance was renamed — map it with `accountAliases`. At **zero** it was closed —
leave it out of later months; `settle` will write its balance to `0`.

Currency is never inferred. It comes from `accounts` and cannot be recovered
from the data once an account has been created with the wrong one.

## 4. Reading `verify` output

Four links check the load, at two different moments.

| Link | When             | Gates? | What it proves                                             |
| ---- | ---------------- | ------ | ---------------------------------------------------------- |
| 1    | Before any write | Yes    | The plan's totals match the sheet's own printed totals     |
| 4    | Before any write | Yes    | Per-account income matches the sheet's `Income` column     |
| 2    | After the load   | Yes    | The month read back out of the app reconciles as predicted |
| 3    | After the load   | No     | The recombined figure against the sheet's balance          |

Link 4 closes a hole Link 1 cannot see: the totals still match when every
income row is routed to the wrong account. It compares in each account's **own**
currency, which is how the sheet prints that column. Synthetic buckets
(`Household (historical)`, `Passive Income (…)`) have no column to compare
against and are deliberately out of its scope.

Link 2 recomputes the variance from the accounts and transactions read back
out of the app, because the app derives reconciliation only for its own
accounts page and exposes no API route for it. That independence is the
point: a write the API silently altered shows up as drift. It fails the load
with the month still claimed as `loading`, so a re-run purges and reloads it.

Link 3 cannot be exact. It recombines currencies at a single month-end rate,
while the sheet's balance moved at whatever rate applied on each day. It
informs and never gates.

`verify` also audits the account's **current** balance, separately from its
balance history. `settle` writes it and net worth reads it, yet no
history-based check would notice it going stale.

## 5. The privacy rule

Real account names, balances, transaction amounts, category labels, people,
employers and filesystem paths never enter this repository — not in source,
fixtures, test names, comments, commit messages, or this file. Use
placeholders: `Bank1 OwnerA USD`, `OwnerA`, `OwnerB`, `<data-dir>`.

The test fixtures are hand-authored, not derived from real data. A fixed-factor
scramble is reversible and preserves the real shape of the source; invented
figures leak nothing. They use year 2099 so a fixture can never be mistaken for
a real month.
