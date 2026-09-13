# Backfill test fixtures

Hand-authored. Every name and figure is invented; no real financial data
appears here or anywhere else in this repository.

Year 2099 is deliberate — a fixture can never be mistaken for a real month.

The pair reproduces the three parsing defects found in the real exports:

1. Account rows past the numbered block have a blank `No` column.
2. Some amounts carry a currency prefix (`Rp`).
3. Header labels drift — `Column 1` appears in the `Timestamp` position.

The printed totals agree with the rows, so `verify.ts` Links 1 and 4 can
run against this pair in CI.

## Printed totals

| label             | value      | derivation                                                    |
| ----------------- | ---------- | ------------------------------------------------------------- |
| Total Expenses    | 1,000,000  | the six expense rows, one of which is zero                    |
| Total Income      | 16,000,000 | the four income rows                                          |
| Total Akhir Bulan | 50,750,000 | the six closing balances, the USD account converted at 10,000 |

Per-account `Income` is denominated in **local** currency even for a foreign
account, because Link 4 compares against the transaction sheet's local column:
`Bank2 OwnerA USD` 10,000,000, `Bank1 OwnerB` 5,000,000, every other account 0.
`Awal Bulan` and `Akhir Bulan` for that account stay in its own currency and are
converted at the reference rate for the closing total.
