---
phase: 07-audit-and-diagnostics
verified: 2026-03-29T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Diagnostics bundle now calls repository.getAuditEvents() (all categories) instead of repository.getSecurityEvents() (security only) — SUPP-01 and SUPP-02 fully satisfied"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Crash log silent retention"
    expected: "After simulating an uncaught exception, a walnut.log file is created in {userData}/logs/ with the error recorded. The app does not show a dialog."
    why_human: "Cannot trigger an uncaught exception and inspect the file system in a static code review"
  - test: "Redacted bundle preserves amounts, categories, and strips text"
    expected: "Exported redacted JSON has description='[REDACTED]' on every transaction row, but signedAmountMinor and categoryId are real numbers/strings from the DB"
    why_human: "Requires running the app with real data and inspecting exported JSON output"
  - test: "Transaction audit history tab renders correctly after an edit"
    expected: "Opening a transaction that has been edited shows the History tab with before/after entries timestamped correctly"
    why_human: "Requires exercising the UI with live data; cannot verify rendering behaviour from static analysis"
---

# Phase 7: Audit and Diagnostics Verification Report

**Phase Goal:** Ensure every important system or user action can be understood and supported later.
**Verified:** 2026-03-29
**Status:** passed
**Re-verification:** Yes — after gap closure (getSecurityEvents → getAuditEvents fix)

---

## Re-verification Summary

The single blocker gap from the initial verification has been resolved. `src/main/diagnostics/diagnostics.ts` line 36 now reads `repository.getAuditEvents()` (no category filter), replacing the previous `repository.getSecurityEvents()` call that restricted audit data to the `security` category only.

A focused regression check confirmed:

- No other call sites in the diagnostics pipeline reference `getSecurityEvents`.
- `db.ts` `getAuditEvents` method signature is unchanged (accepts optional filters, returns `AuditEvent[]`).
- `updateTransaction` atomic audit INSERT is intact.
- Preload bridge still exposes `getAuditEvents` and `generateDiagnosticsBundle`.
- `main.ts` still calls both `registerAppStateIpc()` and `registerDiagnosticsIpc()`.

All five must-have truths are now verified.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every transaction edit creates a durable audit event with before/after state in an atomic DB transaction | VERIFIED | `db.ts` `updateTransaction` wraps UPDATE + `INSERT INTO audit_events` in `this.sqlite.transaction()`. Category='transaction', eventType='transaction:edited', entity_id=transactionId, metadata contains before/after objects. |
| 2 | A global audit screen shows the full event ledger with category filters and an empty state | VERIFIED | `AuditScreen.tsx` calls `window.walnut.getAuditEvents()` in a `useEffect`, renders category toggle buttons using `var(--accent-blue)` for active state, and displays "No events found" empty state text. Wired in `App.tsx` at `workspaceScreen === 'audit'`. |
| 3 | User can export a redacted diagnostics bundle safe to share externally | VERIFIED | `SettingsScreen.tsx` calls `window.walnut.generateDiagnosticsBundle({ type: 'redacted' })`. `redactDiagnosticTransaction` correctly overwrites description, reference, tags while preserving amounts and categoryId. `generateDiagnosticsBundle` now calls `repository.getAuditEvents()` — all audit categories are included. |
| 4 | App keeps fuller diagnostics locally for owner troubleshooting | VERIFIED | "Export Full Diagnostics" button calls `generateDiagnosticsBundle({ type: 'full' })`, which skips redaction. `repository.getAuditEvents()` now returns all categories — transaction edits, review decisions, import events, security events, and settings events are all present in the full bundle. |
| 5 | App stores crash reports locally via silent electron-log integration | VERIFIED | `main.ts` lines 17-19: `log.initialize()`, `log.transports.file.resolvePathFn` set to `{userData}/logs/walnut.log`, `log.errorHandler.startCatching({ showDialog: false })`. `electron-log` v5.4.3 listed in `package.json` dependencies. SettingsScreen mentions the log path to users. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/contracts/audit.ts` | AuditEvent interface | VERIFIED | Exports `AuditEvent` with id, timestampISO, category union, eventType, entityId?, metadata |
| `src/shared/contracts/diagnostics.ts` | RedactedTransaction, DiagnosticsBundle, GenerateDiagnosticsBundleInput | VERIFIED | All three interfaces present with correct shapes |
| `src/main/diagnostics/diagnostics.ts` | redactDiagnosticTransaction + generateDiagnosticsBundle | VERIFIED | Both functions exist and are substantive. Line 36 now calls `repository.getAuditEvents()` — gap resolved |
| `src/main/ipc/diagnostics.ts` | registerDiagnosticsIpc | VERIFIED | Registers `diagnostics:generate-bundle` IPC handler wired to `generateDiagnosticsBundle` |
| `src/main/persistence/db.ts` | audit_events table + indexes + getAuditEvents method | VERIFIED | CREATE TABLE, two indexes (timestamp_iso DESC, entity_id), getAuditEvents with optional filters, all confirmed |
| `src/renderer/features/audit/AuditScreen.tsx` | Filtered chronological event ledger | VERIFIED | Calls getAuditEvents(), filter bar with all 5 categories, active state uses var(--accent-blue), "No events found" empty state |
| `src/renderer/features/settings/SettingsScreen.tsx` | Export buttons + crash log disclosure | VERIFIED | Both export buttons call generateDiagnosticsBundle, crash log path note present |
| `src/renderer/App.tsx` | AuditScreen and SettingsScreen routed, no disabled placeholder | VERIFIED | Both components imported and rendered conditionally. Audit workspace button is active (no disabled attribute). |
| `src/main/main.ts` | registerDiagnosticsIpc called | VERIFIED | Line 44: `registerDiagnosticsIpc()` |
| `src/preload/index.ts` | getAuditEvents + generateDiagnosticsBundle bridged | VERIFIED | Both IPC calls exposed via contextBridge |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AuditScreen.tsx` | `app-state:get-audit-events` IPC | `window.walnut.getAuditEvents()` | WIRED | useEffect calls getAuditEvents(), sets state, renders in JSX |
| `TransactionDetailDrawer.tsx` | `app-state:get-audit-events` IPC | `window.walnut.getAuditEvents({ entityId })` | WIRED | useEffect fetches on `detail` change, renders in History tab |
| `SettingsScreen.tsx` | `diagnostics:generate-bundle` IPC | `window.walnut.generateDiagnosticsBundle({ type })` | WIRED | handleExport calls the bridge method, downloads result as blob |
| `updateTransaction` in db.ts | `audit_events` table | `this.sqlite.transaction()` | WIRED | Both UPDATE and INSERT execute in same synchronous transaction callback |
| `logSecurityEvent` in db.ts | `audit_events` table | direct INSERT | WIRED | Inserts with category='security' |
| `insertReviewAuditEvent` in db.ts | `audit_events` table | direct INSERT | WIRED | Inserts with category='review' |
| `main.ts` | `registerDiagnosticsIpc` | direct call | WIRED | Line 44 confirmed |
| `generateDiagnosticsBundle` | `audit_events` data | `repository.getAuditEvents()` | WIRED | Returns all audit categories — gap resolved |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AuditScreen.tsx` | `events` (useState) | `getAuditEvents()` → IPC → `db.getAuditEvents()` → `SELECT * FROM audit_events` | Yes — real DB query | FLOWING |
| `TransactionDetailDrawer.tsx` | `auditEvents` (useState) | `getAuditEvents({ entityId })` → IPC → `db.getAuditEvents({ entityId })` → filtered SELECT | Yes — real DB query | FLOWING |
| `diagnostics.ts` | `auditEvents` | `repository.getAuditEvents()` | Yes — all categories, real DB query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — phase produces an Electron desktop app with no standalone runnable entry points. All critical paths verified via static code analysis.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRAN-03 | 07-02-PLAN.md | Every transaction edit creates an audit event with before/after context | SATISFIED | `updateTransaction` uses `db.transaction()` wrapping both UPDATE and INSERT INTO audit_events with JSON before/after in metadata |
| AUDT-01 | 07-04-PLAN.md | Audit screen shows full local event ledger covering all product events | SATISFIED | AuditScreen renders all 5 categories (security, review, transaction, import, settings), queries full ledger via getAuditEvents(), category filter bar present |
| SUPP-01 | 07-03-PLAN.md | User can generate a redacted diagnostics bundle safe to share externally | SATISFIED | Redaction correct; bundle now includes all audit categories via `repository.getAuditEvents()` |
| SUPP-02 | 07-03-PLAN.md | App keeps fuller diagnostics locally for owner troubleshooting without exposing by default | SATISFIED | Full bundle exists, not default-exposed, and now contains all audit event categories |
| CRSH-01 | 07-01-PLAN.md | App stores crash reports locally unless owner explicitly chooses to share | SATISFIED | electron-log configured in main.ts with resolvePathFn to {userData}/logs/walnut.log and startCatching({ showDialog: false }) |

**Orphaned requirements check:** No additional requirement IDs mapped to Phase 7 in REQUIREMENTS.md beyond the five above.

**Note on plan-internal requirement IDs (D-01 through D-05):** These appear in plan frontmatter as internal design requirements not listed in REQUIREMENTS.md. All are addressed: D-01 (AuditScreen UI), D-02 (TransactionDetailDrawer history tab), D-03 (redaction pipeline), D-04 (crash logging + Settings disclosure), D-05 (audit_events schema).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/shared/contracts/app-state.ts` | 26-27 and 59-60 | Duplicate `import type { AuditEvent }` and `import type { GenerateDiagnosticsBundleInput }` statements | Info | TypeScript may warn but it does not break compilation or runtime behaviour |

The blocker anti-pattern (`getSecurityEvents` in diagnostics.ts) has been resolved.

---

### Human Verification Required

#### 1. Crash Log Silent Retention

**Test:** Trigger an uncaught exception in the app (e.g., by temporarily throwing in a renderer IPC handler), then inspect `{userData}/logs/walnut.log`.
**Expected:** The error is recorded in the log file. No dialog appears on screen.
**Why human:** Cannot trigger runtime exceptions or inspect the filesystem during static analysis.

#### 2. Redacted Bundle Content

**Test:** Export a Redacted Diagnostics bundle from Settings after importing real transactions. Open the JSON file.
**Expected:** Every transaction row has `description: "[REDACTED]"`, `reference: "[REDACTED]"` or `null`, and `tags: ["[REDACTED]"]` or `[]`. All `signedAmountMinor` and `categoryId` values are real numbers/strings, not zeroed or nulled. The `auditEvents` array contains events from all categories (not only security events).
**Why human:** Requires live data and file inspection to confirm field-by-field correctness.

#### 3. Transaction Audit History Tab

**Test:** Edit a transaction in the transactions screen (change description or amount). Reopen that transaction in the detail drawer and switch to the "Audit History" tab.
**Expected:** At least one entry appears showing the edit event with before/after values and a correctly formatted timestamp.
**Why human:** Requires live UI interaction to verify the tab renders populated data and that the before/after display is readable.

---

### Gaps Summary

No automated gaps remain. The single blocker identified in the initial verification — `generateDiagnosticsBundle` using `repository.getSecurityEvents()` instead of `repository.getAuditEvents()` — has been fixed. All five observable truths are verified and all five phase requirements are satisfied by the codebase as it stands.

Three items are routed to human verification because they require running the application with live data (crash log file creation, redacted bundle inspection, and the History tab UI). These are confirmatory checks; the underlying implementation is complete.

---

_Initial verification: 2026-03-29_
_Re-verification: 2026-03-29 (after gap fix)_
_Verifier: Claude (gsd-verifier)_
