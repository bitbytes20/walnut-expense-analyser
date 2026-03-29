# Plan 01 - Unified Audit Persistence & Crash Logging

## Execution Summary
- Added `electron-log` to capture and silently suppress uncaught exceptions without throwing a modal to the user, redirecting output to `{userData}/logs/walnut.log`.
- Created the core `AuditEvent` shape in `src/shared/contracts/audit.ts`.
- Created the persistent `audit_events` ledger table in SQLite mapped to `db.ts`.
- Created `getAuditEvents()` method for querying the ledger.
- Refactored `logSecurityEvent` and `insertReviewAuditEvent` to seamlessly insert to `audit_events` instead of legacy tables while maintaining contract compatibility.

## File Changes
<key-files.created>
- `src/shared/contracts/audit.ts`
</key-files.created>
<key-files.modified>
- `package.json`
- `src/main/main.ts`
- `src/main/persistence/db.ts`
</key-files.modified>

## Self-Check: PASS
All methods implemented exactly as described. The schema was successfully applied in `db.ts` bootstrap and all dependencies build.
