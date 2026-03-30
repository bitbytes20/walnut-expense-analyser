---
phase: 09-workflow-polish
plan: 01
subsystem: contracts-infrastructure
tags: [contracts, ipc, db-schema, test-scaffolds, filter-presets, bulk-update]
dependency_graph:
  requires: []
  provides:
    - BulkUpdateTransactionsInput/Result types and Zod schemas in shared contracts
    - FilterPreset, SaveFilterPresetInput, RenameFilterPresetInput, DeleteFilterPresetInput types
    - ParseRowError, BulkResolveResult, ReplaceStagedFileInput interfaces
    - filter_presets SQLite table via bootstrap()
    - filter preset CRUD repository methods
    - bulkUpdateTransactions repository method
    - registerFilterPresetsIpc wired in main.ts
    - 6 new IPC channels (transactions:bulk-update, import:replace-staged-file, filter-presets:list/save/rename/delete)
    - preload bridge extensions for all 6 new channels
    - mockWalnutApi stubs for all 6 new methods
    - Wave 0 test scaffolds (22 todo stubs across 3 files)
  affects:
    - Plans 09-02 through 09-05 (all depend on these contracts and IPC channels)
    - BackupPayload now includes filterPresets
tech_stack:
  added: []
  patterns:
    - Zod schema-first contract definition matching existing transactions.ts pattern
    - SQLite raw SQL in bootstrap() matching existing table creation pattern
    - IPC handler registration via registerXxxIpc() factory matching existing pattern
    - Repository method returning list after mutation (save/rename/delete all return listFilterPresets())
    - Wave 0 test scaffold with it.todo() stubs for future implementation
key_files:
  created:
    - src/main/ipc/filter-presets.ts
    - tests/unit/transactions/multi-select.test.ts
    - tests/unit/import/review-keyboard.test.ts
    - tests/unit/filter-presets-repository.test.ts
  modified:
    - src/shared/contracts/transactions.ts
    - src/shared/contracts/import.ts
    - src/shared/contracts/app-state.ts
    - src/main/persistence/schema.ts
    - src/main/persistence/db.ts
    - src/main/ipc/transactions.ts
    - src/main/ipc/import.ts
    - src/main/main.ts
    - src/main/import/import-coordinator.ts
    - src/preload/index.ts
    - src/renderer/mockWalnutApi.ts
    - tests/unit/categories-rules-screen.test.tsx
    - tests/unit/dashboard-screen.test.tsx
    - tests/unit/import-history.test.tsx
    - tests/unit/review-queue.test.tsx
    - tests/unit/transaction-ledger.test.tsx
    - tests/unit/transactions/rule-suggestion.test.tsx
decisions:
  - filter_presets table uses raw SQL in bootstrap() (not Drizzle ORM) consistent with all other Phase 9 tables
  - Filter preset CRUD methods return full list after each mutation (consistent with categories/rules IPC pattern)
  - bulkUpdateTransactions uses SQLite transaction() for atomicity and builds SET clause dynamically based on input fields present
  - replaceStagedFile removes old staged entry and parses new file preserving all other staged entries
  - Wave 0 test scaffolds use it.todo() so vitest run passes without implementation
metrics:
  duration_minutes: 45
  completed_date: "2026-03-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 16
---

# Phase 9 Plan 01: Shared Contracts and Infrastructure Summary

Typed contract foundation for the entire Workflow Polish phase — 6 Zod schemas, 9 new TypeScript types, 3 new interfaces, filter_presets SQLite table, 6 IPC channels, preload bridge extensions, and 22 Wave 0 test scaffolds.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add shared contracts and Zod schemas | 0017580 |
| 2 | Add DB schema, IPC handlers, preload bridge, and mock API | 33eecaf |
| 3 | Create Wave 0 test scaffolds | 7ee70f5 |

## Verification

- `npx tsc --noEmit`: 48 errors — all pre-existing in renderer and test files unrelated to this plan (pre-existing count confirmed by stash comparison)
- `npx vitest run tests/unit`: 19 failed / 75 passed / 22 todo — same failure count as pre-existing baseline; 22 todo stubs are new and pass correctly
- All new IPC channels registered in main.ts
- filter_presets table created in bootstrap()
- BackupPayload includes filterPresets
- All 6 new WalnutApi methods have preload bridge entries and mock stubs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added WalnutApi mock stubs to existing test files**
- **Found during:** Task 3 post-verification
- **Issue:** Adding 6 new methods to WalnutApi interface caused TS type-overlap check to flag existing test mock objects that cast partial mocks `as WalnutApi`. Without the new stubs, tests could also fail at runtime if new IPC methods were called.
- **Fix:** Added all 6 new method stubs (returning sensible defaults) to the 6 test files that mock WalnutApi: categories-rules-screen, dashboard-screen, import-history, review-queue, transaction-ledger, rule-suggestion tests.
- **Files modified:** 6 test files
- **Commit:** 673e79d

## Known Stubs

None — this plan defines contracts and infrastructure only. No UI data flows that could be stubbed.

## Self-Check: PASSED
