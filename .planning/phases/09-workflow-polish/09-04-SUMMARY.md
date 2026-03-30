---
phase: 09-workflow-polish
plan: 04
subsystem: import-error-diagnostics
tags: [import, parser, error-diagnostics, inline-ui, retry]
dependency_graph:
  requires:
    - 09-01 (ParseRowError contract, ReplaceStagedFileInput, StagedImportFile.parseErrors field, replaceStagedFile IPC channel)
  provides:
    - Row-level ParseRowError collection in icici-parser with date and amount validation
    - Inline error expansion panel in StagedFileRow with per-row number/expected/found/suggestion
    - Replace-in-place retry via replaceStagedFile IPC preserving other staged files
  affects:
    - ImportWorkspace (handleRetry added, onRetry passed to StagedFileRow)
    - StagedFileRow (new isExpanded, isRetrying state; new onRetry prop)
tech_stack:
  added: []
  patterns:
    - TDD red-green for parser row error collection
    - Excel serial date validation alongside DD/MM/YYYY string format detection
    - Inline expansion panel with role=region aria-label for accessibility
    - Loading state (isRetrying) for async IPC calls within component
key_files:
  created: []
  modified:
    - src/main/import/parser.ts
    - src/renderer/features/import/StagedFileRow.tsx
    - src/renderer/features/import/ImportWorkspace.tsx
    - tests/unit/import/parser.test.ts
    - tests/unit/import/persistence.test.ts
decisions:
  - Excel serial date numbers (positive floats 1-80000) accepted as valid dates since xlsx returns these from XLS/XLSX cells with raw formatting
  - Files with parseErrors get status=rejected with reasonCode=parse-error so they sort into the Rejected section
  - onRetry passed only to rejected files; other sections not affected
metrics:
  duration_minutes: 45
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 5
---

# Phase 9 Plan 04: Row-Level Import Error Diagnostics Summary

Row-level import error diagnostics with inline expansion panel and in-place file retry — parser collects ParseRowError on invalid date/amount rows, StagedFileRow expands errors inline with per-row detail, and replace-in-place retry swaps one file while preserving the rest of the staged session.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Parser emits row-level ParseRowError and coordinator replaceStagedFile tests | c29b81e |
| 2 | StagedFileRow inline error expansion and replace-in-place retry UI | 61d18a0 |

## Verification

- `npx vitest run tests/unit/import/parser.test.ts tests/unit/import/persistence.test.ts`: 11 passed, 0 failed
- `npx tsc --noEmit`: 48 errors — all pre-existing (same count as Plan 01 baseline), 0 new
- Row-level errors surface with row number, expected, found, suggestion
- In-place retry replaces single file via replaceStagedFile IPC; other staged files preserved

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Excel serial date numbers rejected as invalid dates**
- **Found during:** Task 1 GREEN phase
- **Issue:** The xlsx library returns date cells as floating-point Excel serial numbers (e.g. `42380.00011574074`) when reading XLS/XLSX files. The initial `isValidDate()` helper only checked DD/MM/YYYY string patterns, so valid fixture rows triggered false parse errors.
- **Fix:** Added Excel serial date range check (1–80000 = 1900-01-01 to 2100s) before the string pattern match. Real invalid dates like `'INVALID-DATE'` and `'BAD-DATE-1'` still fail as expected.
- **Files modified:** `src/main/import/parser.ts`
- **Commit:** c29b81e

## Known Stubs

None — all data flows are wired. Error details come from real parser output. Replace retry calls real IPC.

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commit c29b81e: FOUND
- Commit 61d18a0: FOUND
