---
phase: 03-review-queue-and-import-history
plan: 02
subsystem: ui
tags: [react, electron, sqlite, import-history, ipc, vitest]
requires:
  - phase: 03-01
    provides: persisted import attempts, review items, and mixed import gating
provides:
  - authoritative import history queries for all attempt outcomes
  - receipt-style batch detail payloads with file outcomes and transaction drill-down
  - import shell navigation for workspace, history, and batch detail screens
affects: [03-03, 03-04, import-review, renderer-navigation]
tech-stack:
  added: []
  patterns: [sqlite aggregate-backed view models, app-shell import sub-navigation, renderer refetch over preload IPC]
key-files:
  created: [src/renderer/features/import/ImportHistoryScreen.tsx, src/renderer/features/import/ImportBatchDetailScreen.tsx, src/renderer/features/import/ImportStatusBadge.tsx, tests/unit/import/history-repository.test.ts, tests/unit/import-history.test.tsx]
  modified: [src/shared/contracts/import.ts, src/main/persistence/db.ts, src/renderer/App.tsx, src/renderer/features/import/ImportWorkspace.tsx, src/renderer/mockWalnutApi.ts]
key-decisions:
  - "Import history summaries now derive accepted, duplicate, unresolved, and status values from repository state instead of stored counters so review mutations cannot drift the ledger."
  - "Batch detail is exposed as a receipt payload with summary, file outcomes, and grouped transactions rather than reusing the older imported/rejected file buckets."
patterns-established:
  - "Import history and batch detail screens are children of the existing import shell, not separate app routes."
  - "Mock renderer data mirrors the preload contract by storing summary rows and detail payloads keyed by batch id."
requirements-completed: [IMPT-07]
duration: 12 min
completed: 2026-03-27
---

# Phase 3 Plan 2: Expose import history and receipt-style batch detail Summary

**All-attempt import history with SQLite-backed live counters, receipt-style batch detail, and shell navigation between workspace, history, and batch detail**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-27T23:30:00+05:30
- **Completed:** 2026-03-27T23:42:03+05:30
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added repository coverage and implementation for all-attempt import history plus receipt-style batch detail queries.
- Reworked import-history summaries to use authoritative SQLite aggregates so unresolved counts and `Needs review` to `Imported` transitions update from repository state.
- Added import history and batch detail screens inside the existing shell, including unresolved-batch re-entry actions and mock API support for browser tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build repository and IPC history/detail queries for all import attempts** - `99878b3`, `2417aff` (test, feat)
2. **Task 2: Add import history and batch detail screens inside the existing shell** - `b2ba66a`, `a1f573e` (test, feat)

## Files Created/Modified
- `src/main/persistence/db.ts` - Added authoritative summary mapping, grouped transaction drill-down, and receipt-style batch detail mapping.
- `src/shared/contracts/import.ts` - Expanded import detail contracts to include summary, file outcomes, and transaction groups.
- `src/renderer/App.tsx` - Added import-area sub-navigation for workspace, history, and batch detail.
- `src/renderer/features/import/ImportWorkspace.tsx` - Added history entry from the existing import workspace.
- `src/renderer/features/import/ImportHistoryScreen.tsx` - Rendered the operational import-attempt ledger and empty state.
- `src/renderer/features/import/ImportBatchDetailScreen.tsx` - Rendered the summary strip, per-file outcomes, and read-only transaction drill-down.
- `src/renderer/features/import/ImportStatusBadge.tsx` - Added canonical Imported, Needs review, Rejected, and Failed badges.
- `src/renderer/mockWalnutApi.ts` - Mirrored the new history/detail contract for renderer tests.
- `tests/unit/import/history-repository.test.ts` - Covered all-attempt ordering, receipt detail shape, and live counters.
- `tests/unit/import-history.test.tsx` - Covered history rendering, batch detail navigation, and unresolved re-entry actions.

## Decisions Made

- Used repository aggregate queries for summary values instead of trusting persisted attempt counters, because review-item state changes must immediately affect history and batch detail.
- Kept history and batch detail inside the existing import shell to preserve Phase 2 workspace language and avoid premature top-level routing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced stale attempt counters with live aggregate reads**
- **Found during:** Task 1
- **Issue:** Stored `unresolved_review_count` and `status` values did not change when review items were resolved, so history could drift from repository state.
- **Fix:** Recomputed accepted counts, duplicate counts, unresolved counts, last-updated timestamps, and `needs-review` to `imported` transitions from SQLite tables and persisted file-outcome payloads.
- **Files modified:** `src/main/persistence/db.ts`, `src/shared/contracts/import.ts`, `tests/unit/import/history-repository.test.ts`
- **Verification:** `cmd /c npx vitest run tests/unit/import/history-repository.test.ts`
- **Committed in:** `2417aff`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for correctness. The fix tightened the plan’s intended D-12 live-counter behavior without expanding scope.

## Issues Encountered

- Receipt drill-down initially used generated source-file ids, which broke source-file linkage across file outcomes, review items, and transactions. The repository now persists accepted source files under the staged file id so the detail view stays traceable.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- History and batch detail now expose stable batch identifiers and authoritative counters for upcoming review mutations.
- Phase `03-03` can build review mutations against the live aggregate model without adding renderer-side reconciliation.

## Known Stubs

None.

## Self-Check: PASSED

---
*Phase: 03-review-queue-and-import-history*
*Completed: 2026-03-27*
