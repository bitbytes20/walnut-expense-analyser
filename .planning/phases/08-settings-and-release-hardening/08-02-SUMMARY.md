---
phase: 08-settings-and-release-hardening
plan: 02
subsystem: auth
tags: [pin, security, sqlite, session-lock, css-themes, ipc, argon2]

# Dependency graph
requires:
  - phase: 08-settings-and-release-hardening-plan-01
    provides: AppConfig type, getAppConfig/setAppConfig in db.ts, WalnutApi extensions, preload wiring for changePin/clearTransactions/fullReset
provides:
  - changePin service function in pin-service.ts with current-PIN verification and audit logging
  - clearTransactionsAndAudit repository method: transactional delete of transactions and associated audit events
  - fullAppReset repository method: wipes all data, re-seeds categories/rules, returns to onboarding welcome
  - walnut:changePin, walnut:clearTransactions, walnut:fullReset IPC handlers in security.ts
  - Configurable idle lock timeout from AppConfig (0 = never) replacing hardcoded constant in session-lock.ts
  - data-theme attribute selectors in tokens.css for explicit light/dark theme override
  - _setRepositoryForTesting helper for unit testing singleton-dependent security functions
affects:
  - 08-settings-and-release-hardening-plan-04 (Settings UI wires to these IPC handlers)
  - 08-settings-and-release-hardening-plan-03 (keyboard shortcuts — no dependency on this)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "_setRepositoryForTesting pattern: exported test helper to inject in-memory WalnutRepository singleton for testing functions that call getWalnutRepository()"
    - "TDD with vitest — RED (failing test), GREEN (implementation), verified GREEN before commit"
    - "CSS data-theme attribute + media query guard: :root:not([data-theme=light]) for OS dark mode, [data-theme=dark]/[data-theme=light] for explicit override"
    - "Idle lock timeout reads from AppConfig.idleLockTimeoutMs at timer-reset time; 0 means never"

key-files:
  created:
    - tests/unit/cleanup.test.ts
  modified:
    - src/main/security/pin-service.ts
    - src/main/persistence/db.ts
    - src/main/ipc/security.ts
    - src/main/security/session-lock.ts
    - src/renderer/styles/tokens.css
    - tests/unit/pin-service.test.ts

key-decisions:
  - "Used _setRepositoryForTesting export pattern instead of vi.mock to inject in-memory repo for changePin tests — cleaner, avoids dynamic import overhead"
  - "Kept IDLE_LOCK_TIMEOUT_MS as deprecated alias for backward compatibility while renaming to DEFAULT_IDLE_LOCK_TIMEOUT_MS"
  - "clearTransactionsAndAudit wraps deletes in a SQLite BEGIN/COMMIT transaction to ensure atomicity"
  - "fullAppReset deletes device_profiles and device_profile_snapshots tables to ensure clean slate before re-seeding"

patterns-established:
  - "Test helper export: _setRepositoryForTesting(repo | undefined) for singleton injection in unit tests"
  - "CSS theme toggle: data-theme attribute on html/body element with :root:not guard on OS preference media query"

requirements-completed: [SECU-03, SETG-01]

# Metrics
duration: 25min
completed: 2026-03-29
---

# Phase 8 Plan 02: Security Mutations and Cleanup Backend Summary

**changePin with argon2 verification, clearTransactionsAndAudit with atomic SQLite transaction, fullAppReset, configurable idle timeout from AppConfig, and data-theme CSS attribute override**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-29T18:52:00Z
- **Completed:** 2026-03-29T19:01:00Z
- **Tasks:** 2 (TDD + wiring)
- **Files modified:** 6

## Accomplishments

- changePin service: verifies current PIN with argon2, rejects wrong PIN with specific error, validates new PIN length, updates hash and logs security.pin_changed / security.pin_change_failed events
- clearTransactionsAndAudit: deletes transactions + associated audit events (by entity_id and category = 'transaction') in a single SQLite transaction, returns deletedCount; preserves categories, rules, and non-transaction audit events
- fullAppReset: wipes all workspace tables, deletes categories/rules/audit_events/app_settings/device_profiles, resets to onboarding welcome, re-seeds starter categories and rules
- walnut:changePin, walnut:clearTransactions, walnut:fullReset IPC handlers registered in security.ts
- Idle lock timeout now reads from AppConfig.idleLockTimeoutMs at each timer reset (0 = never set a timer)
- tokens.css now supports explicit data-theme attribute override for both light and dark, with OS preference fallback guarded by :not([data-theme="light"])

## Task Commits

1. **Task 1: changePin, clearTransactionsAndAudit, fullAppReset with tests** - `3e5cc51` (feat)
2. **Task 2: IPC handlers, configurable idle timeout, theme CSS** - `874f554` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/main/security/pin-service.ts` - Added changePin export with argon2 verification and audit events
- `src/main/persistence/db.ts` - Added ClearTransactionsResult import, clearTransactionsAndAudit, fullAppReset public methods, _setRepositoryForTesting helper
- `src/main/ipc/security.ts` - Added walnut:changePin, walnut:clearTransactions, walnut:fullReset handlers
- `src/main/security/session-lock.ts` - Replaced hardcoded IDLE_LOCK_TIMEOUT_MS with getAppConfig().idleLockTimeoutMs read
- `src/renderer/styles/tokens.css` - Added data-theme attribute selectors alongside existing media query
- `tests/unit/pin-service.test.ts` - Extended with changePin describe block (4 tests)
- `tests/unit/cleanup.test.ts` - New file with 8 tests for clearTransactionsAndAudit and fullAppReset

## Decisions Made

- Used `_setRepositoryForTesting` export pattern to inject in-memory WalnutRepository singleton for changePin tests, since changePin calls `getWalnutRepository()` which requires Electron's `app.getPath()` in the default path.
- Kept `IDLE_LOCK_TIMEOUT_MS` as a deprecated alias pointing to `DEFAULT_IDLE_LOCK_TIMEOUT_MS` for backward compatibility.
- `clearTransactionsAndAudit` uses BEGIN/COMMIT for atomicity — either all audit events and transactions are deleted, or none are.
- `fullAppReset` deletes `device_profiles` and `device_profile_snapshots` since a full reset should clear profile history too.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added _setRepositoryForTesting export**
- **Found during:** Task 1 (changePin tests)
- **Issue:** changePin calls getWalnutRepository() singleton which calls Electron's app.getPath() — unavailable in jsdom test environment. Tests were failing with "Cannot read properties of undefined (reading 'getPath')"
- **Fix:** Added `_setRepositoryForTesting(repo: WalnutRepository | undefined)` export to db.ts; tests call this in beforeEach/afterEach to inject in-memory repo
- **Files modified:** src/main/persistence/db.ts, tests/unit/pin-service.test.ts
- **Verification:** All 14 tests pass
- **Committed in:** 3e5cc51 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical test infrastructure)
**Impact on plan:** The test helper is necessary for correctness — without it the tests cannot exercise the changePin function. No scope creep.

## Issues Encountered

- The `imported_transactions` table schema uses `import_batch_id` and `raw_narration`/`cleaned_description` columns (not `batch_id`, `description`, `amount_minor`). Had to fix cleanup test insert statements to match actual schema.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All security mutation IPC handlers are now registered: changePin, clearTransactions, fullReset
- Settings UI (Plan 04) can wire directly to walnut:changePin, walnut:clearTransactions, walnut:fullReset
- Idle timeout is now configurable from app_settings — Settings UI can expose the idle timeout picker
- Theme CSS data-theme attribute is ready — Settings UI can set document.documentElement.dataset.theme
- No blockers for Plan 04

---
*Phase: 08-settings-and-release-hardening*
*Completed: 2026-03-29*
