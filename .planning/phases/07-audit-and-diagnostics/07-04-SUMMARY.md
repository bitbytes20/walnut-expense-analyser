---
phase: "07"
plan: "04"
subsystem: "audit-ui"
tags: ["audit", "ui", "settings", "diagnostics", "navigation"]
dependency_graph:
  requires: ["07-01-PLAN.md", "07-02-PLAN.md", "07-03-PLAN.md"]
  provides: ["AuditScreen", "SettingsScreen", "audit nav integration", "diagnostics export UI"]
  affects: ["src/renderer/App.tsx", "src/renderer/features/audit/AuditScreen.tsx", "src/renderer/features/settings/SettingsScreen.tsx", "src/shared/contracts/app-state.ts", "src/preload/index.ts"]
tech_stack:
  added: []
  patterns: ["React state-driven filter toggles", "category-filtered chron-feed", "browser File API for export"]
key_files:
  created:
    - "src/renderer/features/audit/AuditScreen.tsx"
    - "src/renderer/features/settings/SettingsScreen.tsx"
    - "src/shared/contracts/audit.ts"
    - "src/shared/contracts/diagnostics.ts"
  modified:
    - "src/renderer/App.tsx"
    - "src/preload/index.ts"
    - "src/renderer/mockWalnutApi.ts"
    - "src/shared/contracts/app-state.ts"
decisions:
  - "Bundled contracts (audit.ts, diagnostics.ts) from parallel plans into this worktree to enable UI compilation without merging parent branch"
  - "Settings nav item uses Settings icon from lucide alongside ShieldCheck for audit — matches icon vocabulary already in use"
  - "File-save dialog uses browser Blob + anchor pattern since saveAs dialog from electron is not wired in renderer context"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-29"
  tasks_completed: 3
  files_created: 4
  files_modified: 4
---

# Phase 7 Plan 04: Global Audit Workspace & Settings Panel Summary

**One-liner:** Audit workspace with category-filtered chronological event ledger and Settings panel with redacted/full diagnostics export plus crash log location disclosure.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create AuditScreen.tsx and connect to App.tsx routing (replace disabled placeholder) | c89d0ba |
| 2 | Implement filtered chron-feed UI with category toggles, empty/error states | c89d0ba |
| 3 | Create SettingsScreen with Support section (export buttons + crash log note) | 3943541 |

## Implementation Summary

- Created `src/shared/contracts/audit.ts` with `AuditEvent` interface (id, timestampISO, category, eventType, entityId, metadata).
- Created `src/shared/contracts/diagnostics.ts` with `RedactedTransaction`, `DiagnosticsBundle`, and `GenerateDiagnosticsBundleInput` types.
- Updated `src/shared/contracts/app-state.ts` to import and expose `getAuditEvents` and `generateDiagnosticsBundle` on `WalnutApi`.
- Updated `src/preload/index.ts` to bridge `getAuditEvents` and `generateDiagnosticsBundle` over IPC.
- Created `src/renderer/features/audit/AuditScreen.tsx`:
  - Fetches all events via `window.walnut.getAuditEvents()`
  - Renders category toggle buttons (`Security`, `Review`, `Edits`, `Import`, `Settings`) using `var(--accent-blue)` for active state
  - Sorts events chronologically (newest first)
  - Shows `No events found` / `Adjust your filters...` empty state (matching copy contract)
  - Shows error state: `Could not load audit log: Try restarting the application.`
  - Typography: Body 14px for descriptions, Label 12px for timestamps
- Updated `src/renderer/App.tsx`:
  - Replaced `aria-label="Audit workspace placeholder"` disabled button with active `ShieldCheck` nav button
  - Added `Settings` icon nav button for settings workspace
  - Extended `workspaceScreen` state type to include `'audit'` and `'settings'`
  - Added eyebrow text for both new workspaces
  - Wires `<AuditScreen />` and `<SettingsScreen />` into screen routing
- Created `src/renderer/features/settings/SettingsScreen.tsx`:
  - Support section with `Export Redacted Diagnostics` (primary/accent-blue) and `Export Full Diagnostics` (secondary) buttons
  - Both buttons call `window.walnut.generateDiagnosticsBundle()` and trigger browser download via Blob + anchor
  - Export states: idle, exporting, done (auto-clears after 3s), error (auto-clears after 4s)
  - Crash log note section: `{userData}/logs/walnut.log` location without surfacing on startup (D-04 requirement)

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Bundled audit/diagnostics contracts from parallel plans**

- **Found during:** Task 1
- **Issue:** This worktree was branched from release/1.0.0 before Plans 07-01 through 07-03 ran; `AuditEvent`, `GenerateDiagnosticsBundleInput`, `getAuditEvents`, and `generateDiagnosticsBundle` did not exist in this worktree.
- **Fix:** Created `src/shared/contracts/audit.ts` and `src/shared/contracts/diagnostics.ts` matching the shapes established in Plans 07-01 and 07-03. Added both methods to `WalnutApi` and the preload bridge. These are required for the UI to compile and function.
- **Files modified:** `src/shared/contracts/audit.ts` (created), `src/shared/contracts/diagnostics.ts` (created), `src/shared/contracts/app-state.ts`, `src/preload/index.ts`
- **Commit:** c89d0ba

**2. [Rule 2 - Missing Critical] Added Settings icon nav item alongside Audit**

- **Found during:** Task 3
- **Issue:** The plan scaffolds a Settings section but App.tsx had no navigation path to it.
- **Fix:** Added a `Settings` (lucide) icon button to the sidebar bottom cluster, routing to the new `SettingsScreen`. This is required for the settings panel to be reachable.
- **Files modified:** `src/renderer/App.tsx`
- **Commit:** 3943541

## Known Stubs

- `getAuditEvents()` mock in `mockWalnutApi.ts` returns an empty array — valid for development; real data flows through IPC when the main process has the `audit_events` table (provided by Plan 07-01 when merged).
- `generateDiagnosticsBundle()` mock returns a minimal JSON structure — valid for development.

## Self-Check: PASSED

- `src/renderer/features/audit/AuditScreen.tsx` - FOUND
- `src/renderer/features/settings/SettingsScreen.tsx` - FOUND
- `src/shared/contracts/audit.ts` - FOUND
- `src/shared/contracts/diagnostics.ts` - FOUND
- Commit c89d0ba - FOUND
- Commit 3943541 - FOUND
