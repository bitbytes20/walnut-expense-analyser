---
phase: 08-settings-and-release-hardening
plan: 01
subsystem: settings-backend
tags: [app-config, backup, encryption, ipc, persistence]
dependency_graph:
  requires: []
  provides: [AppConfig-persistence, backup-encrypt-decrypt, settings-ipc, backup-ipc]
  affects: [preload, main-process, db-repository]
tech_stack:
  added: [scrypt, aes-256-gcm, Electron-file-dialogs]
  patterns: [TDD-red-green, repository-pattern, key-value-app-settings, deep-merge-config]
key_files:
  created:
    - src/main/security/backup-service.ts
    - src/main/ipc/settings.ts
    - src/main/ipc/backup.ts
    - tests/unit/backup-service.test.ts
    - tests/unit/app-config.test.ts
  modified:
    - src/shared/contracts/app-state.ts
    - src/main/persistence/db.ts
    - src/main/main.ts
    - src/preload/index.ts
decisions:
  - "exportBackup WalnutApi signature takes pin as explicit parameter — simpler than reading session state from IPC handler context"
  - "importBackupPayload does NOT touch security_state — PIN/recovery always fresh after restore"
  - "Backup binary format: [4B version][16B salt][12B IV][16B tag][N ciphertext] using scrypt+AES-256-GCM"
  - "Deep-merge strategy for setAppConfig: featureFlags merged independently to avoid clobbering"
metrics:
  duration_minutes: 35
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_modified: 9
---

# Phase 8 Plan 01: App Config, Backup Encryption, and Settings IPC Summary

**One-liner:** App config persistence with scrypt+AES-256-GCM encrypted backup using Electron native file dialogs and IPC wiring for the full settings API surface.

## What Was Built

### Task 1: Contracts, Persistence, Backup Encryption (TDD)

**Tests written first (RED), then implementation (GREEN).**

Added to `src/shared/contracts/app-state.ts`:
- `AppConfig` type: `{ theme, idleLockTimeoutMs, featureFlags: { aiSummaries } }`
- `BackupPayload`, `BackupResult`, `RestoreResult`, `ChangePinInput`, `ClearTransactionsResult`
- Fixed duplicate `AuditEvent` and `GenerateDiagnosticsBundleInput` imports
- Extended `WalnutApi` with: `getAppConfig`, `setAppConfig`, `changePin`, `exportBackup`, `importBackup`, `clearTransactions`, `fullReset`

Added to `src/main/persistence/db.ts`:
- `getAppConfig()` — reads from `app_settings` key `app_config`, returns defaults when unset
- `setAppConfig(Partial<AppConfig>)` — deep-merges featureFlags, persists full config
- `exportBackupPayload()` — reads all data tables, explicitly strips `pin_hash`, `recovery_code_ciphertext`, `recovery_words_ciphertext`, `draft_pin`, `recovery_code`, `recovery_words_json`
- `importBackupPayload(BackupPayload)` — transaction-wrapped: clears all data tables, inserts payload rows, leaves `security_state` untouched

Created `src/main/security/backup-service.ts`:
- `encryptBackup(plaintext, pin)` — scryptSync key derivation, AES-256-GCM encryption, binary format: `[4B version][16B salt][12B IV][16B tag][N body]`
- `decryptBackup(blob, pin)` — reads header, verifies version, reconstructs key, decrypts GCM, throws on auth tag failure

### Task 2: IPC Wiring

Created `src/main/ipc/settings.ts`:
- `walnut:getAppConfig` and `walnut:setAppConfig` handlers following existing IPC patterns

Created `src/main/ipc/backup.ts`:
- `walnut:exportBackup(pin)` — calls `exportBackupPayload`, shows `dialog.showSaveDialog` with `.wbk` filter and dated default filename, encrypts, writes to disk
- `walnut:importBackup(pin)` — shows `dialog.showOpenDialog`, reads file, decrypts with GCM error handling, imports payload

Updated `src/main/main.ts` — registered `registerSettingsIpc()` and `registerBackupIpc()`

Updated `src/preload/index.ts` — added IPC wiring for all 7 new WalnutApi methods

## Test Results

```
tests/unit/backup-service.test.ts  5 passed
tests/unit/app-config.test.ts      7 passed
Total: 12/12 passed
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate imports in app-state.ts**
- **Found during:** Task 1 contract extension
- **Issue:** `AuditEvent` and `GenerateDiagnosticsBundleInput` were imported twice from their respective modules
- **Fix:** Removed the duplicate import block at the end of the import section
- **Files modified:** `src/shared/contracts/app-state.ts`
- **Commit:** 811c641

**2. [Rule 3 - Blocking] Rebuilt better-sqlite3 native module**
- **Found during:** Task 1 test execution
- **Issue:** `better-sqlite3` was compiled against a different Node.js version (MODULE_VERSION 123 vs 127), causing `ERR_DLOPEN_FAILED` in tests
- **Fix:** `npm rebuild better-sqlite3` — all existing db tests also benefited
- **Files modified:** Native binary only (node_modules)
- **Commit:** N/A (native rebuild, no source change)

## Known Stubs

None — all IPC handlers are fully wired to real implementations.

## Self-Check: PASSED

All created files verified present. All three commits verified in git log.
