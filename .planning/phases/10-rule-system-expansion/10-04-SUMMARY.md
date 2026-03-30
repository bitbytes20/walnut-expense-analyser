---
phase: 10-rule-system-expansion
plan: 04
subsystem: categories
tags: [typescript, sqlite, better-sqlite3, react, drag-and-drop, rule-engine, import]

# Dependency graph
requires:
  - phase: 10-rule-system-expansion
    plan: 01
    provides: ReorderRulesInputSchema, RuleCategorization interface, CommitImportBatchResult.ruleCategorizations, descriptionTerms engine
  - phase: 10-rule-system-expansion
    plan: 02
    provides: rule engine descriptionTerms operators and test infrastructure
provides:
  - reorderRules(ruleIds) DB method: persists sort_order for user rules, ignores system rules
  - applyAllRulesToTransactions(batchId) DB method: first-match-wins rule application for uncategorized transactions
  - transaction:auto-categorized audit events emitted per categorized transaction
  - rules:reorder IPC handler and preload bridge
  - RulePane drag-and-drop reorder UI with GripVertical handles and system rule divider
  - ImportSummary collapsible auto-categorization disclosure with ChevronDown
  - Import coordinator calls applyAllRulesToTransactions after successful batch commit
affects: [10-rule-system-expansion/10-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "reorderRules: SQLite transaction sets sort_order = index+1 for user rules only (WHERE is_system = 0)"
    - "applyAllRulesToTransactions: fetch uncategorized batch transactions, iterate rules in sort_order ASC, break on first match"
    - "audit event pattern: INSERT INTO audit_events with category=transaction, event_type=transaction:auto-categorized"
    - "RulePane drag reorder: HTML5 drag events (onDragStart/onDragOver/onDrop) with dragIndex/dropIndex state"
    - "RulePane keyboard reorder: Space/Enter enters mode, ArrowUp/Down moves, Escape cancels"
    - "ImportSummary: native <details> element with controlled isRuleSummaryOpen state for chevron animation"
    - "TDD approach: RED commit (it.todo replaced with failing tests), GREEN commit (implementation)"

key-files:
  created:
    - tests/unit/import/auto-apply.test.ts (7 tests replacing it.todo stubs)
  modified:
    - src/main/persistence/db.ts (reorderRules, applyAllRulesToTransactions methods)
    - src/main/ipc/categories.ts (rules:reorder handler)
    - src/main/import/import-coordinator.ts (auto-apply call in commitBatch)
    - src/preload/index.ts (reorderRules bridge)
    - src/shared/contracts/app-state.ts (WalnutApi reorderRules, ReorderRulesInput import)
    - src/renderer/mockWalnutApi.ts (reorderRules mock)
    - src/renderer/features/categories-rules/RulePane.tsx (drag handles, divider, specificity badge)
    - src/renderer/features/import/ImportSummary.tsx (collapsible rule categorization summary)
    - tests/unit/categories/rule-engine.test.ts (3 drag reorder tests replacing it.todo stubs)
    - tests/unit/categories-rules-screen.test.tsx (added reorderRules to vi.fn mock)

key-decisions:
  - "applyAllRulesToTransactions uses mapTransactionLedgerRow + matchesRuleCondition to reuse existing matching logic"
  - "imported_transactions has no updated_at column — SQL UPDATEs omit that field"
  - "Import coordinator always calls applyAllRulesToTransactions when gate.shouldFinalizeAcceptedTransactions is true"
  - "ruleCategorizations only included in result when length > 0 (no noise on zero matches)"
  - "Keyboard reorder: optimistic reorder on each ArrowUp/Down step, confirmed by second Space/Enter press"
  - "Native HTML5 drag API used (no third-party DnD library) to keep bundle size small"

# Metrics
duration: ~25 minutes
completed: 2026-03-30
tasks-completed: 2
files-modified: 10

# Summary

One-liner: Drag-to-reorder rule list with system rule boundary and auto-apply rules at import commit with collapsible disclosure.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 (RED) | Failing tests for drag reorder and auto-apply | d196814 | Done |
| 1 (GREEN) | reorderRules, applyAllRulesToTransactions, IPC, import auto-apply | d657cc9 | Done |
| 2 | Drag-reorder RulePane UI and ImportSummary disclosure | defe57f | Done |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] imported_transactions has no updated_at column**
- **Found during:** Task 1 GREEN (test failures)
- **Issue:** Initial implementation included `updated_at = ?` in UPDATE statements for imported_transactions table, but that column does not exist in the schema
- **Fix:** Removed `updated_at` from both category_id and tags_json UPDATE statements in `applyAllRulesToTransactions`
- **Files modified:** src/main/persistence/db.ts
- **Commit:** d657cc9

**2. [Rule 1 - Bug] categoryId is undefined (not null) for uncategorized transactions**
- **Found during:** Task 1 GREEN (test assertion failure)
- **Issue:** Test used `toBeNull()` but `listTransactions` returns `undefined` for missing categoryId (mapped from SQLite NULL via `row.category_id ? String(row.category_id) : undefined`)
- **Fix:** Changed test assertion to `toBeUndefined()`
- **Files modified:** tests/unit/import/auto-apply.test.ts
- **Commit:** d657cc9

**3. [Rule 2 - Missing] categories-rules-screen test mock missing reorderRules**
- **Found during:** Task 2 TypeScript check
- **Issue:** After adding reorderRules to WalnutApi, the test file's vi.fn mock was missing the new method causing TypeScript error
- **Fix:** Added `reorderRules: vi.fn().mockResolvedValue(rules)` to the mock
- **Files modified:** tests/unit/categories-rules-screen.test.tsx
- **Commit:** defe57f

**4. [Rule 2 - Missing] Pluralization in ImportSummary disclosure text**
- **Found during:** Task 2 implementation review
- **Issue:** Plan acceptance criteria checked for exact text "transactions categorized by your rules" but correct grammar requires singular for count=1
- **Fix:** Used conditional plural: `transaction{count !== 1 ? 's' : ''} categorized by your rules` — the substring "transactions categorized by your rules" exists when count > 1
- **Impact:** Minor cosmetic deviation for grammatically correct output

## Known Stubs

None. All functionality is wired end-to-end.

## Self-Check: PASSED

- FOUND: tests/unit/import/auto-apply.test.ts
- FOUND: .planning/phases/10-rule-system-expansion/10-04-SUMMARY.md
- FOUND commit: d196814 (test RED)
- FOUND commit: d657cc9 (feat GREEN)
- FOUND commit: defe57f (feat UI)
