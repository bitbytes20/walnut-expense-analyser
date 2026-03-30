---
phase: 10-rule-system-expansion
plan: 05
subsystem: categories-rules
tags: [rule-export, rule-import, conflict-detection, ipc, electron-dialog, json, tdd]

requires:
  - phase: 10-02
    provides: RuleExportEntry/RuleConflict/RuleImportResult contracts in categories.ts

provides:
  - exportRules() on WalnutRepository returning user-only RuleExportEntry[] with categoryName resolved
  - prepareRuleImport() with conflict detection, category-by-name COLLATE NOCASE lookup, system rule exclusion
  - commitRuleImport() applying resolutions (keep/replace/skip) atomically
  - rules:export, rules:import-prepare, rules:import-commit IPC handlers with Electron native file dialogs
  - RuleExportImportBar UI component with Download/Upload pill buttons
  - RuleImportDiffView UI component with side-by-side conflict diff and resolution actions
  - WalnutApi interface entries: exportRules, importRulesPrepare, importRulesCommit

affects: [categories-rules-screen, rule-pane, mock-api, test-fixtures]

tech-stack:
  added: []
  patterns:
    - "IPC import-prepare returns { result, entries } tuple so renderer has entries for commit"
    - "commitRuleImport uses SQLite transaction wrapping for atomicity"
    - "COLLATE NOCASE for category-by-name resolution"
    - "TDD: RED → GREEN tests before implementation"

key-files:
  created:
    - src/renderer/features/categories-rules/RuleExportImportBar.tsx
    - src/renderer/features/categories-rules/RuleImportDiffView.tsx
  modified:
    - src/main/persistence/db.ts
    - src/main/ipc/categories.ts
    - src/preload/index.ts
    - src/shared/contracts/app-state.ts
    - src/renderer/mockWalnutApi.ts
    - src/renderer/features/categories-rules/RulePane.tsx
    - src/renderer/features/categories-rules/CategoriesRulesScreen.tsx
    - tests/unit/categories/rule-engine.test.ts
    - tests/unit/categories-rules-screen.test.tsx
    - tests/unit/transaction-ledger.test.tsx
    - tests/unit/transactions/rule-suggestion.test.tsx

key-decisions:
  - "import-prepare IPC returns { result, entries } so renderer stores entries for commitRuleImport without re-reading file"
  - "Conflict resolution defaults to skip when no resolution chosen in RuleImportDiffView"
  - "Diff state managed inside RulePane component to replace list pane with conflict UI"
  - "Mock API stubs added to three test files to keep TypeScript at baseline error count"

requirements-completed: [RULES-09, RULES-10]

duration: 13min
completed: 2026-03-30
---

# Phase 10 Plan 05: Rule Export/Import Summary

**Rule export to JSON and conflict-aware import from JSON with side-by-side diff resolution, category-by-name lookup, and system rule exclusion.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-30T16:13:36Z
- **Completed:** 2026-03-30T16:36:14Z
- **Tasks:** 2/2
- **Files modified:** 11

## Accomplishments

- Added `exportRules()`, `prepareRuleImport()`, and `commitRuleImport()` to WalnutRepository with full category-by-name resolution using `COLLATE NOCASE`
- Wired three new IPC handlers (`rules:export`, `rules:import-prepare`, `rules:import-commit`) with Electron native save/open dialogs
- Built `RuleExportImportBar` (Download/Upload pill buttons, disabled export when no user rules, transient success feedback) and `RuleImportDiffView` (side-by-side conflict cards, Keep/Replace/Skip resolutions, warning chips for unresolvable categories, non-conflict preview section)
- 7 export/import tests pass (TDD RED→GREEN cycle confirmed)

## Task Commits

1. **Task 1: Implement exportRules, prepareRuleImport, commitRuleImport with IPC** - `eefaa01` (feat)
2. **Task 2: Build RuleExportImportBar and RuleImportDiffView UI components** - `f9f9410` (feat)

## Files Created/Modified

- `src/main/persistence/db.ts` — Added exportRules, prepareRuleImport, commitRuleImport methods
- `src/main/ipc/categories.ts` — Added rules:export, rules:import-prepare, rules:import-commit IPC handlers
- `src/preload/index.ts` — Added exportRules, importRulesPrepare, importRulesCommit bridge entries
- `src/shared/contracts/app-state.ts` — Added three new methods to WalnutApi interface
- `src/renderer/mockWalnutApi.ts` — Added mock stubs for new API methods
- `src/renderer/features/categories-rules/RuleExportImportBar.tsx` — New: export/import pill buttons
- `src/renderer/features/categories-rules/RuleImportDiffView.tsx` — New: conflict diff resolution UI
- `src/renderer/features/categories-rules/RulePane.tsx` — Renders RuleExportImportBar, manages diff state
- `src/renderer/features/categories-rules/CategoriesRulesScreen.tsx` — Passes onRulesChange to RulePane
- `tests/unit/categories/rule-engine.test.ts` — 7 new passing tests replacing it.todo stubs
- `tests/unit/categories-rules-screen.test.tsx`, `tests/unit/transaction-ledger.test.tsx`, `tests/unit/transactions/rule-suggestion.test.tsx` — Added exportRules/importRulesPrepare/importRulesCommit stubs to test mock APIs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added { result, entries } tuple return from import-prepare IPC**
- **Found during:** Task 1 design
- **Issue:** Plan's `rules:import-prepare` handler only returned `RuleImportResult`, but the renderer also needs the raw `RuleExportEntry[]` to pass to `commitRuleImport`. Without it the UI would need another round-trip or re-read.
- **Fix:** Updated `rules:import-prepare` handler to return `{ result: RuleImportResult, entries: RuleExportEntry[] }` (or null if canceled); updated `WalnutApi.importRulesPrepare` return type accordingly.
- **Files modified:** `src/main/ipc/categories.ts`, `src/shared/contracts/app-state.ts`

**2. [Rule 2 - Missing functionality] Added mock stubs to prevent TypeScript regressions**
- **Found during:** Task 1 TypeScript compilation check
- **Issue:** Adding new methods to `WalnutApi` caused 5 extra TypeScript errors in existing test files that cast `Partial<WalnutApi>` mocks.
- **Fix:** Added `exportRules`, `importRulesPrepare`, `importRulesCommit` stubs to three test mock APIs and one renderer mock.
- **Files modified:** `tests/unit/categories-rules-screen.test.tsx`, `tests/unit/transaction-ledger.test.tsx`, `tests/unit/transactions/rule-suggestion.test.tsx`, `src/renderer/mockWalnutApi.ts`

## Self-Check: PASSED

- FOUND: src/renderer/features/categories-rules/RuleExportImportBar.tsx
- FOUND: src/renderer/features/categories-rules/RuleImportDiffView.tsx
- FOUND: commit eefaa01 (Task 1)
- FOUND: commit f9f9410 (Task 2)
- TypeScript: 53 errors (baseline unchanged)
- Tests: 22/22 passing, 3 todo
