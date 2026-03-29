---
phase: "07"
plan: "03"
subsystem: "diagnostics"
tags: ["diagnostics", "privacy", "redaction", "ipc", "support"]
dependency_graph:
  requires: ["07-01-PLAN.md"]
  provides: ["generateDiagnosticsBundle IPC endpoint", "RedactedTransaction contract"]
  affects: ["src/shared/contracts/app-state.ts", "src/preload/index.ts", "src/main/main.ts"]
tech_stack:
  added: []
  patterns: ["pure redaction function", "IPC handler registration"]
key_files:
  created:
    - "src/shared/contracts/diagnostics.ts"
    - "src/main/diagnostics/diagnostics.ts"
    - "src/main/ipc/diagnostics.ts"
  modified:
    - "src/shared/contracts/app-state.ts"
    - "src/preload/index.ts"
    - "src/main/main.ts"
decisions:
  - "Used existing getSecurityEvents() for audit events in bundle since audit_events table is added by 07-01 (parallel plan)"
  - "GenerateDiagnosticsBundleInput wrapper type keeps IPC call consistent with other handlers"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-29"
  tasks_completed: 3
  files_created: 3
  files_modified: 3
---

# Phase 7 Plan 03: Redacted Diagnostics Export Summary

**One-liner:** Privacy-preserving diagnostics bundle pipeline with full/redacted modes via IPC, stripping sensitive description/reference/tag text while preserving amounts and category IDs.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create `redactDiagnosticTransaction` pure function and shared contracts | 5fed1ca |
| 2 | Implement `generateDiagnosticsBundle` pipeline (full + redacted modes) | 5fed1ca |
| 3 | Expose `generateDiagnosticsBundle` over Electron IPC bridge | 3e496b8 |

## Implementation Summary

- Created `src/shared/contracts/diagnostics.ts` with `RedactedTransaction`, `DiagnosticsBundle`, and `GenerateDiagnosticsBundleInput` types.
- Created `src/main/diagnostics/diagnostics.ts` containing:
  - `redactDiagnosticTransaction(tx)`: pure function that explicitly sets `description: '[REDACTED]'`, `reference: tx.reference != null ? '[REDACTED]' : null`, and `tags: tx.tags.length > 0 ? ['[REDACTED]'] : []` while keeping `signedAmountMinor`, `categoryId`, and all non-sensitive fields intact.
  - `generateDiagnosticsBundle(type)`: streams all transactions through redaction when `type === 'redacted'`, skips redaction for `full`, includes security/audit event ledger and system metrics (node version, OS platform, app version).
- Created `src/main/ipc/diagnostics.ts` with `registerDiagnosticsIpc()` handler for `diagnostics:generate-bundle` channel.
- Added `generateDiagnosticsBundle` to `WalnutApi` interface in `src/shared/contracts/app-state.ts`.
- Wired `ipcRenderer.invoke('diagnostics:generate-bundle', input)` in `src/preload/index.ts`.
- Registered `registerDiagnosticsIpc()` in `src/main/main.ts` window setup.

## Deviations from Plan

None - plan executed exactly as written. The parallel worktree lacks 07-01's `audit_events` table so `getSecurityEvents()` is used as the audit ledger source; this resolves naturally when 07-01 is merged into the phase branch.

## Known Stubs

None - all functionality is fully wired.

## Self-Check: PASSED

- `src/shared/contracts/diagnostics.ts` - FOUND
- `src/main/diagnostics/diagnostics.ts` - FOUND
- `src/main/ipc/diagnostics.ts` - FOUND
- Commit 5fed1ca - FOUND
- Commit 3e496b8 - FOUND
- TypeScript errors in 07-03 files: 0 (only pre-existing errors in unrelated files)
