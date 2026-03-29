---
phase: 04
slug: transaction-ledger-and-search
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.55.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c npx vitest run tests/unit/transactions/*.test.ts tests/unit/transaction-ledger.test.tsx` |
| **Full suite command** | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/transaction-ledger.spec.ts` |
| **Estimated runtime** | ~80 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-local Vitest command declared in the active plan.
- **After every plan wave:** Run `cmd /c npm run test:unit`
- **Before `$gsd-verify-work`:** Full unit suite plus `cmd /c npx playwright test tests/e2e/transaction-ledger.spec.ts`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | TRAN-01 | unit | `cmd /c npx vitest run tests/unit/transactions/normalization.test.ts tests/unit/transactions/query-transactions.test.ts` | No - W0 | pending |
| 04-01-02 | 01 | 1 | TRAN-05 | unit | `cmd /c npx vitest run tests/unit/transactions/query-transactions.test.ts` | No - W0 | pending |
| 04-02-01 | 02 | 2 | TRAN-05 | component | `cmd /c npx vitest run tests/unit/transaction-ledger.test.tsx` | No - W0 | pending |
| 04-02-02 | 02 | 2 | TRAN-05 | unit + component | `cmd /c npx vitest run tests/unit/transactions/query-transactions.test.ts tests/unit/transaction-ledger.test.tsx` | No - W0 | pending |
| 04-03-01 | 03 | 3 | TRAN-02 | unit | `cmd /c npx vitest run tests/unit/transactions/update-transaction.test.ts` | No - W0 | pending |
| 04-03-02 | 03 | 3 | TRAN-04 | component | `cmd /c npx vitest run tests/unit/transaction-ledger.test.tsx tests/unit/transactions/update-transaction.test.ts` | No - W0 | pending |
| 04-04-01 | 04 | 4 | TRAN-01, TRAN-02, TRAN-04, TRAN-05 | unit + e2e | `cmd /c npx vitest run tests/unit/transactions/*.test.ts tests/unit/transaction-ledger.test.tsx && cmd /c npx playwright test tests/e2e/transaction-ledger.spec.ts` | No - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/transactions/normalization.test.ts` - baseline and conservative special-type normalization
- [ ] `tests/unit/transactions/query-transactions.test.ts` - search and structured filter queries
- [ ] `tests/unit/transactions/update-transaction.test.ts` - immediate-save transaction mutation coverage
- [ ] `tests/unit/transaction-ledger.test.tsx` - renderer ledger, search, filter drawer, and edit drawer coverage
- [ ] `tests/e2e/transaction-ledger.spec.ts` - browse, filter, edit, and persist transaction workflow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dense ledger remains readable in both themes on a realistic imported dataset | TRAN-05 | Density, alignment, and visual scan quality are easier to confirm interactively | Open the Transactions workspace in light and dark themes with imported records and verify row density, amount alignment, and tag readability |
| Drawer editing feels immediate and trustworthy on native desktop | TRAN-02 | Native feel and perceived latency are best judged interactively | Open several transactions, edit different fields, save, and confirm the drawer and ledger refresh without stutter or confusing state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification commands
- [x] Sampling continuity is preserved across waves
- [x] Wave 0 gaps are explicitly listed
- [x] No watch-mode commands are used
- [x] Feedback latency stays under the phase target
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
