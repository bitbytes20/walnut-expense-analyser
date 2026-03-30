---
phase: 09-workflow-polish
plan: 03
subsystem: ui
tags: [react, typescript, keyboard-navigation, review-queue, bulk-actions, sqlite]

# Dependency graph
requires:
  - phase: 09-01
    provides: BulkResolveResult contract, wave-0 test scaffolds, IPC handlers

provides:
  - handleReviewKeydown pure function with ReviewKeyboardContext interface
  - A/R keyboard shortcuts for approve/reject in review queue
  - ArrowUp/ArrowDown keyboard navigation with focus auto-advance
  - Input guard preventing shortcuts when typing in form fields
  - resolveBulkReviewItems on WalnutRepository with import gate detection
  - Mixed-state bulk approve skipping items blocked by active duplicate-candidate gate
  - ReviewBulkActionBar count summary: "N approved, M skipped (import gate still active)"
affects: [09-04, 09-05, review-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure keyboard handler function extracted from React component for testability without DOM"
    - "flatItems useMemo to flatten multi-batch queue into linear navigation list"
    - "Import gate check via SQL COUNT before bulk resolve to classify skippable items"
    - "BulkResolveResult returned alongside batchDetail via new IPC endpoint"

key-files:
  created:
    - tests/unit/import/review-keyboard.test.ts
  modified:
    - src/renderer/features/import/ReviewQueueScreen.tsx
    - src/renderer/features/import/ReviewBulkActionBar.tsx
    - src/renderer/features/import/ReviewItemCard.tsx
    - src/main/persistence/db.ts
    - src/main/ipc/import.ts
    - src/preload/index.ts
    - src/shared/contracts/app-state.ts
    - src/renderer/mockWalnutApi.ts
    - tests/unit/import/review-mutations.test.ts

key-decisions:
  - "handleReviewKeydown extracted as exported pure function for unit testing without React rendering"
  - "flatItems useMemo flattens filteredQueue into batchId/itemId pairs for linear keyboard navigation"
  - "Import gate = any pending duplicate-candidate item in the batch; non-gate items skipped when gate active"
  - "resolveBulkReviewItems is a new method; resolveReviewItems unchanged for backward compatibility"
  - "BulkResolveResult shown in ReviewBulkActionBar as inline text fading after 4 seconds"

patterns-established:
  - "Pure keyboard handler pattern: export function + context interface, wire via useEffect in component"
  - "Import gate detection: SQL COUNT of pending duplicate-candidate items before processing bulk IDs"

requirements-completed: [WORKFLOW-04, WORKFLOW-07]

# Metrics
duration: 14min
completed: 2026-03-30
---

# Phase 9 Plan 03: Review Queue Keyboard Navigation and Bulk Approve Summary

**A/R keyboard shortcuts, arrow navigation with auto-advance, and mixed-state bulk approve with count summary for the review queue**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-30T03:50:28Z
- **Completed:** 2026-03-30T04:05:23Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Exported `handleReviewKeydown` pure function with `ReviewKeyboardContext` interface — testable without React
- A/R keys approve/reject the focused review queue item; ArrowUp/Down navigate the flat item list with clamping at boundaries
- Input guard prevents shortcuts when target is INPUT, TEXTAREA, SELECT, or contentEditable
- Focus auto-advances after approve/reject to the next queue item (or stays on last when queue end reached)
- Visual focus indicator on active `ReviewItemCard` via enhanced `cardActive` style (outline + background tint)
- `resolveBulkReviewItems` on `WalnutRepository` checks for active import gate, skips non-duplicate items when gate active
- `ReviewBulkActionBar` shows "N approved, M skipped (import gate still active)" inline for 4 seconds after bulk action
- 9 new keyboard tests + 3 new bulk approve mutation tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Keyboard shortcuts and arrow navigation in ReviewQueueScreen** - `8fd2aa1` (feat + test TDD)
2. **Task 2: Mixed-state bulk approve with count summary** - `077f501` (feat + test)

## Files Created/Modified
- `tests/unit/import/review-keyboard.test.ts` - 9 tests for pure handleReviewKeydown function (replaces todo stubs)
- `src/renderer/features/import/ReviewQueueScreen.tsx` - handleReviewKeydown export, flatItems useMemo, useEffect keyboard handler, focus auto-advance, bulk IPC wiring
- `src/renderer/features/import/ReviewBulkActionBar.tsx` - bulkResult prop, count summary message with 4s timeout
- `src/renderer/features/import/ReviewItemCard.tsx` - Enhanced cardActive with outline + background focus indicator
- `src/main/persistence/db.ts` - resolveBulkReviewItems method with import gate detection
- `src/main/ipc/import.ts` - import:resolve-review-items-bulk IPC handler
- `src/preload/index.ts` - resolveReviewItemsBulk exposed to renderer
- `src/shared/contracts/app-state.ts` - WalnutApi.resolveReviewItemsBulk method type
- `src/renderer/mockWalnutApi.ts` - resolveReviewItemsBulk mock implementation
- `tests/unit/import/review-mutations.test.ts` - 3 new bulk approve tests (all approvable, mixed-state, all gated)

## Decisions Made
- `handleReviewKeydown` is exported as a pure function so tests can exercise it without React/JSDOM rendering
- `flatItems` useMemo flattens multi-batch `filteredQueue` into `{batchId, itemId}[]` pairs for clamped linear navigation
- Import gate = any `pending` `duplicate-candidate` item in the batch; all non-duplicate items are skipped when gate active (duplicate-candidate items themselves can still be resolved)
- `resolveBulkReviewItems` is a new repository method; `resolveReviewItems` unchanged for single-item backward compatibility
- Keyboard hint is inline text (no new visible UI chrome) with `title` attributes for tooltip accessibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged phase/9-workflow-polish branch before implementing**
- **Found during:** Task 1 setup
- **Issue:** Worktree was at v1.0 state; test scaffolds (review-keyboard.test.ts) and phase 9 contracts from 09-01 were not in the worktree
- **Fix:** Merged `phase/9-workflow-polish` branch into worktree branch via fast-forward
- **Files modified:** All phase 9 files (fast-forward merge)
- **Verification:** Test file exists in worktree, phase 9 contracts available
- **Committed in:** Pre-existing merge (no extra commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to have the correct foundation. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors (81 lines) in db.ts, DashboardScreen.tsx, CategoriesRulesScreen.tsx, and mockWalnutApi.ts existed before this plan. My changes did not introduce new TS errors (confirmed by error line count comparison before/after).
- Pre-existing test failures in review-mutations.test.ts: 6 tests checking `security_events` table fail because the implementation writes to `audit_events`. These failures were present before this plan and are out of scope.

## Next Phase Readiness
- Keyboard navigation and bulk approve with count summary are complete
- Phase 9 Plan 04 (multi-select range) can proceed independently
- Phase 9 Plan 05 (filter presets) can proceed independently

---
*Phase: 09-workflow-polish*
*Completed: 2026-03-30*
