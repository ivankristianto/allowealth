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
`AW_BACKFILL_PASSWORD`, and `AW_BACKFILL_SECONDARY_EMAIL` /
`AW_BACKFILL_SECONDARY_PASSWORD` for the second member — used by
`setup --create-user` and by `run` whenever that member owns a transaction.
There is no password flag on any subcommand, so a secret cannot land in shell
history.

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
its opening balance is stamped from that month. For an account that already
exists, `run` checks the month's opening against the previous month's closing
in the saved plan, in **local currency**: the sheet carries every balance over
exactly there, while a foreign balance moves with each month's rate. Loading a later month first
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

| Abort                                                                               | Fix                                                                                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Account "X" is not in the roster`                                                  | Add it to `accounts` with its currency, or map it with `accountAliases` if it is a rename                                               |
| `` `expenseAccounts.X` points at "Y", which is not in this month's accounts ``      | The paying account closed or was renamed. Point `expenseAccounts` at an account in the sheet                                            |
| `Account "X" has no category in the config`                                         | Give it a `category` in `accounts`                                                                                                      |
| `Account category "X" does not exist`                                               | Run `aw backfill setup`; it creates every account category the config names                                                             |
| `Account "X" appears N times … with no rule`                                        | Add a `duplicateRules` entry for that month, name and occurrence, and add the renamed account to `accounts`                             |
| `Unknown expense/income category: "X"`                                              | Add it to `categories.expense` / `categories.income`, or map it with `categoryRenames`                                                  |
| `… blank local amount but a foreign amount`                                         | A placeholder row. Add a `suppressedRows` entry for it                                                                                  |
| `… has a blank amount`                                                              | Fill the cell in the CSV, or add a `suppressedRows` entry                                                                               |
| `Income row "…" matches no routing rule`                                            | Add an `incomeRouting` rule naming the account it is paid into                                                                          |
| `… routes to a USD account but has no foreign amount`                               | Fill the foreign column, or set `convert` on the rule if converting at the month's rate is intended                                     |
| `Account "X" closed <prev> at A, but <month> opens it at B (local currency)`        | The sheet does not carry the balance over. Compare both months' balance sheets; never edit the config to pass                           |
| `Account "X" already exists with an origin balance of A, but <month> opens it at B` | An account new to this month already exists at another balance — a later month or a manual entry created it. Investigate before purging |
| `Date "…" falls outside <month>`                                                    | Fix the cell, or suppress the row                                                                                                       |
| `… is already loaded`                                                               | Re-run with `--force` to purge and reload                                                                                               |
| `rows diverge from the plan this tool saved`                                        | Something else wrote into the month. Investigate before passing `--force`                                                               |
| `No free balance-history slot left`                                                 | The day's 12:00–12:59 UTC window is full. Clear the stale snapshots for that day first                                                  |
| `loaded but does not reconcile`                                                     | Link 2 failed. The month stays `loading`; investigate, then re-run                                                                      |

**Salary is not `incomeRouting`.** Salary routes by category through
`salaryRouting`, to the member's own account; the sheet's `Income` column
records exactly those rows. Every other income row — coupons, dividends,
deposit interest, one-off receipts — is placed by `incomeRouting`, an
**ordered** list where the first matching rule wins. A rule matches by exact
`category`, by `match` terms that must each start a word in the description
(case-insensitive, so `INDON` finds `INDON28newnew`), or both; put specific
rules before the broad ones they would otherwise lose to. A row no rule
matches aborts: there is no default bucket for unexplained income.

A foreign-currency account takes the row's foreign figure. A row carrying only
a local amount aborts unless its rule sets `convert`, which divides the local
amount by the month's rate — an explicit choice, since that rate is a
month-end figure and the coupon may have cleared at another.

**Transaction ownership is configured, never inferred.** The app records a
transaction as owned by whoever posts it, so `run` signs in as each member who
owns a row and posts it as them. `expenseOwners` gives an expense to a member
by exact category or by a whole word in the description; an expense no rule
matches belongs to `members.fallback`. Two rules giving one row to different
members abort the run rather than pick one. An expense is paid from its
owner's account in `expenseAccounts` — a local-currency roster account — so an
ownership rule moves the paying account too. That account must appear in the
month's sheet, or the run aborts rather than create it at a zero balance.
Income needs no owner rule: it belongs to the roster owner of the account it
is paid into, whatever the description says.

**Rename or closure?** An account that stops appearing at a **non-zero**
balance was renamed — map it with `accountAliases`. At **zero** it was closed —
leave it out of later months; `settle` will write its balance to `0`.

Currency is never inferred. It comes from `accounts` and cannot be recovered
from the data once an account has been created with the wrong one.

Classification is never inferred either. Each roster account names the app
account `category` it is filed under — a default such as `Bank Account` or
`Bond`, or a custom one (`Time Deposit`) that `setup` creates as a non-liquid
asset. The category decides the account's type and liquidity. Editing it in the
config moves an existing account on the next load. Accounts are opened on the
first day of their first month, so balance history carries no entry dated on
the day of the load.

Month-end snapshots are written at 12:00 UTC on the month's last day. The app
cuts months at midnight in the server's local time, so a snapshot at 23:00 UTC
lands in the next month for any server east of UTC, and that month's historical
view and reconciliation pick it up instead of this one.

## 4. Reading `verify` output

Four links check the load, at two different moments.

| Link | When             | Gates? | What it proves                                             |
| ---- | ---------------- | ------ | ---------------------------------------------------------- |
| 1    | Before any write | Yes    | The plan's totals match the sheet's own printed totals     |
| 4    | Before any write | Yes    | Per-account income matches the sheet's `Income` column     |
| 2    | After the load   | Yes    | The month read back out of the app reconciles as predicted |
| 3    | After the load   | No     | The recombined figure against the sheet's balance          |

Links 1 and 4 both sum the CSV's **local** column and never convert a foreign
amount. The reference rate is a month-end figure while receipts cleared at other
rates, so converting would introduce a spread the sheet's printed totals do not
contain — and both links are exact in every month.

**The account table is written in local currency for every account, foreign ones
included.** `Total Akhir Bulan` is therefore the plain sum of the `Akhir Bulan`
column, with nothing converted. A foreign account's balance is _divided_ by the
rate to reach the currency the app holds it in, and `localClosing` keeps the
sheet's own figure so Link 1 stays exact. Link 1 also converts each foreign
balance back and compares it to that figure, because the total alone cannot see
a conversion that went the wrong way.

Do not assume an account named `… USD` is foreign-denominated. One such account
sat at an unchanged local-currency book value for four consecutive months while
the rate moved; declaring it foreign would have fabricated a drifting balance.
Check that the balance divides cleanly by the rate before declaring a currency.

Link 4 closes a hole Link 1 cannot see: the totals still match when every
income row is routed to the wrong account. It compares in **local**
currency — the foreign column would reintroduce the rate spread — and
subtracts rows placed by `incomeRouting`, because the sheet's `Income`
column excludes them. Those rows have no per-account figure in the sheet to
check against; Link 1's income total is the only sheet check they get, so a
rule pointing at the wrong account is caught by nothing but review.

Link 2 recomputes the variance from the accounts and transactions read back
out of the app, because the app derives reconciliation only for its own
accounts page and exposes no API route for it. That independence is the
point: a write the API silently altered shows up as drift. It fails the load
with the month still claimed as `loading`, so a re-run purges and reloads it.

Link 3 cannot be exact. It recombines currencies at a single month-end rate,
while the sheet's balance moved at whatever rate applied on each day. It
informs and never gates.

`verify` checks ten dimensions: expense and income count and total, expense
and income per category, income per account, transactions per owner, budget
per category, account closing balance, current account balance, and
reconciliation variance. Its
reconciliation figure uses the month's own balance **history** for end
balances, not the account's current balance, which is settled to the newest
loaded month and would be the wrong end point for any earlier month.

The transaction totals and grouped dimensions compare the app against the
**plan**, not the sheet: each side is summed in the currency it was posted in,
keyed `<key> <currency>`, and nothing is converted. Link 1 has already tied the
plan to the sheet's printed totals; converting the app's foreign amounts at the
month-end rate would reintroduce the spread Links 1 and 4 avoid.

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
