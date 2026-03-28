---
phase: 03-review-queue-and-import-history
plan: 01
subsystem: database
tags: [sqlite, import-history, review-queue, electron, vitest]
requires:
  - phase: 02-statement-import-pipeline
    provides: duplicate detection, import batch persistence, staged import coordinator
provides:
  - durable import attempt ledger with status and counter snapshots
  - persisted review items with severity-aware gating inputs
  - typed preload and IPC reads for import history, batch detail, and review queue
affects: [03-02, 03-03, 03-04, import-history, review-queue]
tech-stack:
  added: []
  patterns: [attempt-ledger persistence, review-item severity gating, batch-scoped unresolved queue queries]
key-files:
  created: [.planning/phases/03-review-queue-and-import-history/03-01-SUMMARY.md, tests/unit/import/review-routing.test.ts, tests/unit/import/review-gating.test.ts]
  modified: [src/shared/contracts/import.ts, src/shared/contracts/app-state.ts, src/preload/index.ts, src/main/ipc/import.ts, src/main/persistence/schema.ts, src/main/persistence/db.ts, src/main/import/import-coordinator.ts, tests/unit/import/persistence.test.ts]
key-decisions:
  - "Duplicate candidates, parser uncertainty, and deferred worksheet selection are blocking review items; balance continuity and unsupported skipped rows are warnings."
  - "Import attempts store summary counters and file snapshots durably in SQLite, while review items remain queryable as separate rows."
patterns-established:
  - "Pattern 1: import coordination emits review signals, derives severity-aware gating, then persists a single attempt ledger record."
  - "Pattern 2: history and queue reads refetch from SQLite-backed summaries instead of renderer-owned unresolved state."
requirements-completed: [IMPT-05, IMPT-06]
duration: 18 min
completed: 2026-03-27
---

# Phase 3 Plan 1: Review Queue and Import History Summary

**SQLite-backed import attempts and review items with severity-aware gating for ambiguous imports**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T17:39:26Z
- **Completed:** 2026-03-27T17:57:26Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Extended the shared import contract surface with durable review-item, attempt-summary, batch-detail, and queue-query types.
- Added a persistent `import_attempts` ledger plus `review_items` storage and history/detail/queue repository reads.
- Updated import coordination to classify blocking versus warning review items and preserve accepted transactions only for warning-only batches.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Phase 2 import contracts into durable Phase 3 review and attempt models** - `28fa68f` (`test`)
2. **Task 2: Persist import attempts and review items with severity-aware coordinator behavior** - `051da92` (`feat`)

## Files Created/Modified
- `src/shared/contracts/import.ts` - Phase 3 review item, attempt summary, batch detail, and queue query contracts.
- `src/shared/contracts/app-state.ts` - Expanded `WalnutApi` for history, batch detail, and review queue reads.
- `src/preload/index.ts` - Mirrored the new import history and review queue IPC bridge methods.
- `src/main/ipc/import.ts` - Registered typed read handlers for history, detail, and unresolved queue data.
- `src/main/persistence/schema.ts` - Declared `import_attempts` and `review_items` tables.
- `src/main/persistence/db.ts` - Added durable attempt persistence, review-item writes, and history/detail/queue queries.
- `src/main/import/import-coordinator.ts` - Implemented review signal classification and severity-aware commit gating.
- `tests/unit/import/review-routing.test.ts` - Locked the unresolved reason-code to severity mapping.
- `tests/unit/import/review-gating.test.ts` - Locked the blocking versus warning gating behavior.
- `tests/unit/import/persistence.test.ts` - Updated legacy persistence expectations to the Phase 3 mixed-gating model.

## Decisions Made

- Blocking review items now map to `duplicate-candidate`, `parser-uncertainty`, and `deferred-worksheet`, while warnings map to `balance-continuity-warning` and `unsupported-row-skipped`.
- Import attempts retain file outcome snapshots in SQLite so later history/detail surfaces can render without relying on in-memory staged state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `better-sqlite3` was built against the wrong Node module ABI for the local test runtime. Running `cmd /c npm rebuild better-sqlite3` restored the broader import regression suite so persistence changes could be verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase `03-02` can now build import history and batch detail UI on top of durable SQLite queries instead of transient import-session state.
- Phase `03-03` can layer review mutations onto persisted `review_items` and `import_attempts` without redesigning the storage model.

## Self-Check: PASSED

---
*Phase: 03-review-queue-and-import-history*
*Completed: 2026-03-27*
