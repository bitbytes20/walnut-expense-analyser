---
phase: 10-rule-system-expansion
plan: 03
subsystem: categories
tags: [sqlite, react, category-management, archive, merge, rename, atomic-transactions]

requires:
  - phase: 10-01
    provides: MergeCategoryPreview and ArchiveCategoryInput schemas in shared contracts

provides:
  - Rename propagation: updateCategory atomically updates categories.name + imported_transactions.category_label
  - Merge preview: mergeCategoryPreview returns affectedTransactionCount, affectedRuleCount, and up to 5 samples
  - Merge rule target update: mergeCategory updates rule action_json.categoryId from source to target atomically
  - Archive/restore: archiveCategory sets is_archived flag; pickers exclude archived categories
  - CategoryPane UI: inline rename, merge picker + preview panel, archive confirm + restore disclosure
  - IPC channels: categories:merge-preview, categories:archive
  - Picker exclusion: CategoriesRulesScreen, TransactionDetailDrawer filter isArchived=true categories

affects: [10-04, 10-05, categories-and-rules, transaction-ledger]

tech-stack:
  added: []
  patterns:
    - "Atomic rename: SQLite transaction wraps categories UPDATE + imported_transactions category_label UPDATE"
    - "LIKE-based rule target scanning: SELECT action_json LIKE '%categoryId:source%' to find affected rules"
    - "Archive-as-soft-delete: is_archived=1 hides category from pickers while preserving historical data"
    - "Inline row actions: RowAction union type drives rename/merge-pick/merge-preview/archive-confirm states"

key-files:
  created: []
  modified:
    - src/main/persistence/db.ts
    - src/main/ipc/categories.ts
    - src/preload/index.ts
    - src/shared/contracts/app-state.ts
    - src/renderer/features/categories-rules/CategoryPane.tsx
    - src/renderer/features/categories-rules/CategoriesRulesScreen.tsx
    - src/renderer/features/transactions/TransactionDetailDrawer.tsx
    - src/renderer/mockWalnutApi.ts
    - tests/unit/categories/category-repository.test.ts
    - tests/unit/categories-rules-screen.test.tsx
    - tests/unit/dashboard-screen.test.tsx
    - tests/unit/transaction-ledger.test.tsx
    - tests/unit/transactions/rule-suggestion.test.tsx

key-decisions:
  - "Rename propagation uses SQLite transaction() to guarantee atomicity: categories name + imported_transactions category_label update together or not at all"
  - "mergeCategory extends existing SQLite transaction to include rule action_json updates, preventing orphaned rules pointing at deleted source category"
  - "mergeCategoryPreview uses LIKE '%categoryId:X%' pattern to count affected rules without parsing all JSON - acceptable for preview accuracy"
  - "CategoryPane uses a RowAction union type to manage row-level inline states (rename/merge-pick/merge-preview/archive-confirm) without a global modal"
  - "Archived categories are soft-deleted: is_archived=1 hides from pickers but historical transaction data remains queryable"
  - "Picker exclusion applied at the useMemo level in CategoriesRulesScreen and at the flattenCategories level in TransactionDetailDrawer"

patterns-established:
  - "Inline row interaction pattern: RowAction union state per-row drives conditional render of rename input, merge picker, preview panel, archive confirm"
  - "Danger zone preview panel grammar: var(--color-surface) background + borderLeft 3px var(--color-destructive) inherited from Phase 9 destructive block patterns"

requirements-completed:
  - RULES-05
  - RULES-06
  - RULES-07

duration: 25min
completed: 2026-03-30
---

# Phase 10 Plan 03: Category Correctness Guarantees Summary

**Rename propagates category_label atomically, merge updates both transactions and rule targets in one SQLite transaction, archive soft-deletes categories from pickers while preserving history.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-30T14:49:00Z
- **Completed:** 2026-03-30T15:03:00Z
- **Tasks:** 2/2
- **Files modified:** 13

## Accomplishments

### Task 1: Repository + IPC layer (TDD)

Implemented three new repository methods and extended one:

**`updateCategory` rename propagation (D-17):** When `input.name` is provided and differs from the current name, the update now wraps both the `categories.name` update AND the `imported_transactions.category_label` update in a single `sqlite.transaction()`. This guarantees atomicity — the denormalized label on every affected transaction is always consistent with the category name.

**`mergeCategoryPreview` (D-18):** New method returns `affectedTransactionCount`, `affectedRuleCount`, and up to 5 sample transactions as `RulePreviewSample` objects. Uses LIKE-based scanning (`action_json LIKE '%"categoryId":"X"%'`) to count affected rules efficiently.

**`mergeCategory` rule target update (Pitfall 4):** Extended the existing atomic merge transaction to also update `categorization_rules.action_json` — any rule whose `action.categoryId` equals the source is updated to point at the target. This prevents orphaned rules after a merge.

**`archiveCategory` (D-19):** New method flips `is_archived` on a category row and returns the updated tree. Bootstrap already adds `is_archived` via `ensureColumn`.

New IPC channels: `categories:merge-preview`, `categories:archive`. Preload bridge and `WalnutApi` interface updated. All 13 category repository tests pass (11 new Phase 10 tests, 2 existing).

### Task 2: CategoryPane UI

Rebuilt `CategoryPane.tsx` as a stateful component with per-row inline interactions:

**Inline rename (RULES-05):** Clicking a user category name converts it to an `<input aria-label="Rename category">` prefilled with the current name. Enter or blur commits (calls `window.walnut.updateCategory`). Escape cancels. Success shows a fading muted message; error reverts and shows a destructive message.

**Merge with preview (RULES-06):** "Merge into" action button opens a target picker `<select>`. Selecting a target calls `window.walnut.mergeCategoryPreview` and replaces the picker with a preview panel — `var(--color-surface)` background, `borderLeft: 3px solid var(--color-destructive)`, showing the source → target heading, affected transaction count (bold), up to 5 sample descriptions, "This cannot be undone." warning, and confirm/cancel buttons. Confirming calls `window.walnut.mergeCategory` and shows a fading success message.

**Archive (RULES-07):** "Archive" action button shows an inline confirmation row. Confirming calls `window.walnut.archiveCategory({ isArchived: true })`. Post-archive: category row disappears from the active list. An "Archived categories" `<details>` disclosure section appears at the bottom with each archived category showing a "Restore" button. Restoring calls `window.walnut.archiveCategory({ isArchived: false })`. The section is hidden when there are zero archived categories.

**Picker exclusion:** `CategoriesRulesScreen.tsx` filters `!category.isArchived` in the `categoryOptions` useMemo. `TransactionDetailDrawer.tsx` flattenCategories skips archived nodes. All category pickers (rule editor, editor panel, transaction drawer) now exclude archived categories.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Column name mismatch in mergeCategoryPreview query**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan specified `description` and `signed_amount_minor` but `imported_transactions` uses `cleaned_description` and `debit_amount_minor`/`credit_amount_minor` (no signed column)
- **Fix:** Changed query to `cleaned_description` and computed signed amount with `COALESCE(credit_amount_minor, -(debit_amount_minor))`
- **Files modified:** `src/main/persistence/db.ts`
- **Commit:** adadc98

**2. [Rule 1 - Bug] TransactionNormalizedType does not include 'unknown'**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan used `'unknown'` for sample `currentType`/`nextType` but the Zod schema only allows `expense|income|transfer|refund|atm-withdrawal|credit-card-payment`
- **Fix:** Changed to `'expense' as const`
- **Files modified:** `src/main/persistence/db.ts`
- **Commit:** adadc98

**3. [Rule 2 - Missing] Test mocks for new WalnutApi methods**
- **Found during:** Task 2 TypeScript check
- **Issue:** Adding `mergeCategoryPreview` and `archiveCategory` to `WalnutApi` caused type errors in 5 test files that mock `WalnutApi` without these methods
- **Fix:** Added stub implementations to `mockWalnutApi.ts` and stub vi.fn() entries to 4 test files
- **Files modified:** `src/renderer/mockWalnutApi.ts`, test files
- **Commit:** 2f10816

## Known Stubs

None — all implemented functionality is wired to real IPC calls.

## Self-Check: PASSED

- db.ts: FOUND
- CategoryPane.tsx: FOUND
- 10-03-SUMMARY.md: FOUND
- Commit adadc98 (Task 1): FOUND
- Commit 2f10816 (Task 2): FOUND
- archiveCategory method: present in db.ts
- mergeCategoryPreview method: present in db.ts
- IPC categories:merge-preview: present in categories.ts
- IPC categories:archive: present in categories.ts
- "Merge into" text: present in CategoryPane.tsx
- "Archive" text: present in CategoryPane.tsx
- "Archived categories" section: present in CategoryPane.tsx
- "Restore" button: present in CategoryPane.tsx
- "This cannot be undone" warning: present in CategoryPane.tsx
- borderLeft destructive: present in CategoryPane.tsx
- aria-label Rename category: present in CategoryPane.tsx
- isArchived filter: present in CategoriesRulesScreen.tsx
- All 13 category repository tests: passing
