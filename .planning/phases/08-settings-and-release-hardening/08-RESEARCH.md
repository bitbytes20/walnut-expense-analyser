# Phase 8: Settings and Release Hardening - Research

**Researched:** 2026-03-29
**Domain:** Electron/React settings screen expansion, AES-256 backup/restore, keyboard shortcut system, feature flags, reset/cleanup tools
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Settings uses a single scrollable page divided into named sections. No tabs or sidebar nav.
- **D-02:** Section order (top to bottom): Preferences → Security → Backup → Support → Feature Flags / Lab → Danger Zone.
- **D-03:** Feature flags get their own dedicated section labelled "Feature Flags" or "Lab" — between Support and Danger Zone.
- **D-04:** Backup includes all data **except** PIN and recovery key hashes: transaction records, categories, rules, audit events, household profile, account profile, and app config.
- **D-05:** Backup file is AES-256 encrypted using a key derived from the owner's PIN (PBKDF2 or Argon2). No separate passphrase — restoring requires knowing the PIN used at backup time.
- **D-06:** Restore flow: import backup file → decrypt with current/entered PIN → restore all data → prompt owner to set a new PIN → regenerate recovery key. PIN and recovery key are always fresh after restore.
- **D-07:** Scope is global navigation shortcuts + critical in-screen actions. Tab/focus navigation on all interactive elements is also required as a baseline.
- **D-08:** Global workspace navigation uses Ctrl+1 through Ctrl+8 (matching the 8 sidebar icons in order). No letter mnemonics.
- **D-09:** Shortcuts are surfaced via tooltip hints on sidebar nav buttons (e.g. title="Dashboard (Ctrl+1)"). No dedicated shortcuts panel needed.
- **D-10:** Critical in-screen actions (Esc to close drawers/modals, Enter to confirm, relevant action shortcuts per screen) should be covered but exact bindings are Claude's discretion.
- **D-11:** Release 1 ships with one feature flag only: AI summaries toggle (enable/disable narrative AI text on dashboard). Off by default.
- **D-12:** Feature flag state is persisted in app config (not per-session).
- **D-13:** Two granular cleanup options: (1) Clear transactions, (2) Full app reset.
- **D-14:** Confirmation UX is proportional to consequence — clear transactions: single dialog; full reset: type-to-confirm.

### Claude's Discretion

- Exact critical in-screen keyboard bindings (D-10) — choose bindings that avoid Electron/browser defaults.
- Backup file extension and format wrapper (e.g. `.walnut-backup`, `.wbk`) — pick something unambiguous.
- Exact PBKDF2 vs Argon2 choice for PIN key derivation — pick the more appropriate one for an Electron/Node.js context.
- Idle-lock timeout options (e.g. 5 min, 15 min, 30 min, never) — pick a sensible set, with 15 min as the default.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SECU-03 | Owner can access advanced owner-only settings including feature flags, diagnostics, backup/restore, and reset tools | Settings screen expansion, backup/restore IPC, feature flag persistence, danger-zone reset IPC |
| SETG-01 | Settings screen includes theme, idle-lock timeout, encrypted backup/restore, diagnostics, feature flags, granular cleanup, and full reset controls | All sections fully scoped; theme is CSS-variable switch; idle timeout replaces hardcoded constant; backup uses Node crypto |
| ACCS-01 | Core workflows support solid keyboard navigation and keyboard shortcuts | Centralized keydown listener in App.tsx, Ctrl+1–8 navigation, in-screen action bindings, focus order audit |
</phase_requirements>

---

## Summary

Phase 8 is a pure expansion of existing infrastructure. The project already has strong patterns for every sub-problem: `app_settings` key-value storage for persisted config, IPC handler modules for each domain, `@node-rs/argon2` for PIN hashing, and `node:crypto` for symmetric encryption. No new external libraries are needed.

The backup/restore subsystem is the most complex deliverable. The correct approach for this Electron/Node.js context is `scrypt` (built into `node:crypto`, Node v10+) for key derivation — it is memory-hard, requires no additional package, and is the native alternative to Argon2 for key-derivation tasks (Argon2 is used for password verification, scrypt for key derivation). The encrypted file format should be a single binary buffer: `[4 bytes version][16 bytes salt][12 bytes IV][16 bytes GCM tag][N bytes ciphertext]`, saved with a `.wbk` extension. All plaintext content is a JSON payload. This is a self-contained, proven approach with no external dependencies.

The keyboard shortcut system is a centralized `keydown` listener in `App.tsx`. The existing sidebar already carries `title` and `aria-label` on every button — updating those titles to include shortcut hints is a one-line change per button. The idle-lock timeout must become a configurable value read from `app_settings` by `SessionLockManager` at reset-timer time rather than a hardcoded constant.

**Primary recommendation:** Implement all phase work in four clean waves: (1) app config foundation — new IPC contracts for settings read/write, feature flags, idle timeout, theme, and change-PIN; (2) backup/restore — encryption/decryption service + IPC + restore flow; (3) keyboard shortcut system — centralized listener + sidebar hint updates; (4) settings screen expansion — UI sections wired to the new IPC.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` (built-in) | Node v22 (project uses v22.16) | AES-256-GCM encryption, scrypt key derivation | Zero new dependencies; scrypt is memory-hard KDF built into Node; AES-256-GCM is authenticated encryption |
| `@node-rs/argon2` | ^2.0.2 (already installed) | Argon2id for new PIN hashing (change PIN flow) | Already used in `pin-service.ts`; keep consistent |
| `electron` dialog API | ^30 (already installed) | `dialog.showSaveDialog` / `dialog.showOpenDialog` | Native OS file picker in main process — correct Electron approach |
| `better-sqlite3` / drizzle-orm | Already installed | Persisting app settings, feature flags, idle timeout | Existing persistence pattern — `getAppSetting` / `setAppSetting` used for dashboard preferences |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` (built-in) | Node v22 | Writing and reading backup files | After dialog returns path |
| CSS custom properties (`:root`) | CSS3 | Theme toggle implementation | Already tokenized in `tokens.css`; dark mode already declared via `@media (prefers-color-scheme: dark)` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:crypto` scrypt | `@noble/hashes` scrypt | Noble is more portable but adds a dependency; native Node crypto is sufficient here |
| Native CSS class toggle for theme | CSS-in-JS runtime theming | Class toggle on `<html>` or `<body>` is simple, matches existing token approach, no library needed |
| IPC dialog in main process | `<input type="file">` in renderer | Renderer file input does not support write paths; main-process dialog is required for save path |

**Installation:** No new packages required. All needed capabilities are already in the dependency tree or Node built-ins.

**Version verification:** All dependencies already in `package.json` — no npm install step required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main/
│   ├── ipc/
│   │   ├── settings.ts          # NEW: settings IPC (theme, idle, feature flags, change-PIN, cleanup, reset)
│   │   ├── backup.ts            # NEW: backup/restore IPC
│   │   └── ...existing
│   ├── security/
│   │   ├── backup-service.ts    # NEW: encryption/decryption service
│   │   ├── pin-service.ts       # EXTEND: add changePin function
│   │   └── session-lock.ts      # EXTEND: read idle timeout from app_settings
│   └── persistence/
│       └── db.ts                # EXTEND: add getAppConfig / setAppConfig methods + clearTransactions + fullReset
├── shared/
│   └── contracts/
│       └── app-state.ts         # EXTEND: WalnutApi with new settings + backup IPC signatures
└── renderer/
    ├── App.tsx                  # EXTEND: centralized keydown listener + sidebar title hints
    └── features/
        └── settings/
            └── SettingsScreen.tsx  # EXPAND: all six sections
```

### Pattern 1: App Config Storage

**What:** All new persistent settings (theme, idle timeout, feature flags) follow the existing `getAppSetting` / `setAppSetting` key-value pattern already proven by `DashboardPreferences`.

**When to use:** For any scalar or JSON-serializable app-level setting.

**Example:**
```typescript
// Source: existing db.ts pattern (getDashboardPreferences / setDashboardPreferences)
const APP_CONFIG_KEY = 'app_config'

interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  idleLockTimeoutMs: number // 5 * 60_000 | 15 * 60_000 | 30 * 60_000 | 0 (never)
  featureFlags: {
    aiSummaries: boolean
  }
}

getAppConfig(): AppConfig {
  const stored = this.getAppSetting(APP_CONFIG_KEY)
  if (!stored) return this.getDefaultAppConfig()
  return { ...this.getDefaultAppConfig(), ...(JSON.parse(stored) as Partial<AppConfig>) }
}

setAppConfig(input: Partial<AppConfig>): AppConfig {
  const current = this.getAppConfig()
  const next = { ...current, ...input, featureFlags: { ...current.featureFlags, ...input.featureFlags } }
  this.setAppSetting(APP_CONFIG_KEY, JSON.stringify(next))
  return next
}
```

### Pattern 2: Backup File Format

**What:** A self-describing binary blob containing version, KDF salt, AES-IV, GCM auth tag, and JSON ciphertext.

**When to use:** Only in `backup-service.ts` — never construct in renderer.

**Example:**
```typescript
// Source: node:crypto docs + project crypto conventions from pin-service.ts
import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const BACKUP_VERSION = 1
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

export function encryptBackup(plaintext: string, pin: string): Buffer {
  const salt = randomBytes(SALT_LEN)
  const key = scryptSync(pin, salt, 32) // 256-bit key
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Layout: [4B version][16B salt][12B IV][16B tag][N body]
  const versionBuf = Buffer.alloc(4)
  versionBuf.writeUInt32BE(BACKUP_VERSION)
  return Buffer.concat([versionBuf, salt, iv, tag, body])
}

export function decryptBackup(blob: Buffer, pin: string): string {
  let offset = 0
  const version = blob.readUInt32BE(offset); offset += 4
  if (version !== BACKUP_VERSION) throw new Error('Unsupported backup version')
  const salt = blob.subarray(offset, offset + SALT_LEN); offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN); offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN); offset += TAG_LEN
  const body = blob.subarray(offset)
  const key = scryptSync(pin, salt, 32)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}
```

### Pattern 3: Centralized Keyboard Shortcut Listener

**What:** A single `useEffect` in `App.tsx` that listens to `keydown` events and maps `Ctrl+1–8` to workspace screens.

**When to use:** All global shortcuts go here. Screen-local shortcuts (Esc, Enter) live in their own components.

**Example:**
```typescript
// Source: existing App.tsx pattern + web platform keydown API
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (state.currentView !== 'dashboard') return
    if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
      switch (event.key) {
        case '1': event.preventDefault(); setWorkspaceScreen('home'); break
        case '2': event.preventDefault(); setWorkspaceScreen('imports'); setImportAreaScreen({ type: 'workspace' }); break
        case '3': event.preventDefault(); setWorkspaceScreen('transactions'); break
        case '4': event.preventDefault(); setWorkspaceScreen('imports'); setImportAreaScreen({ type: 'history' }); break
        case '5': event.preventDefault(); setWorkspaceScreen('categories-rules'); break
        case '6': event.preventDefault(); setWorkspaceScreen('audit'); break
        case '7': event.preventDefault(); setWorkspaceScreen('settings'); break
        // Ctrl+8 = Lock (sidebar position 8)
        case '8': event.preventDefault(); void window.walnut.lockNow().then(/* ... */); break
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [state.currentView, setWorkspaceScreen])
```

**Note:** Ctrl+1–9 is not intercepted by Electron itself or modern browsers by default — verified safe on Windows. Ctrl+W/R/T/F/L/U/N/P are browser-reserved and must be avoided.

### Pattern 4: Theme Toggle

**What:** Add a CSS class (`data-theme="dark"` or `data-theme="light"`) to `<html>` and replace the media query in `tokens.css` with an attribute selector. System default falls back to `prefers-color-scheme`.

**When to use:** When owner explicitly overrides the OS setting from the Preferences section.

**Example:**
```typescript
// In renderer — apply theme on app startup and on settings change
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const html = document.documentElement
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light')
  } else if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark')
  } else {
    html.removeAttribute('data-theme') // falls back to @media prefers-color-scheme
  }
}
```
```css
/* tokens.css — replace @media block with: */
[data-theme="dark"],
:not([data-theme="light"]):root:not([data-theme]) {
  /* dark tokens */
}
/* Or simpler: */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark tokens */ }
}
[data-theme="dark"] { /* dark tokens */ }
[data-theme="light"] { /* light tokens override */ }
```

### Pattern 5: Idle Timeout Configuration

**What:** `SessionLockManager` reads the idle timeout from `app_settings` at reset-timer time, replacing the hardcoded `IDLE_LOCK_TIMEOUT_MS` constant.

**When to use:** Every time `resetIdleTimer` is called — it should fetch the current setting each invocation, not cache it.

**Example:**
```typescript
// session-lock.ts EXTEND
resetIdleTimer(window: BrowserWindow) {
  if (this.idleTimer) clearTimeout(this.idleTimer)
  const repository = getWalnutRepository()
  const config = repository.getAppConfig()
  const timeoutMs = config.idleLockTimeoutMs
  if (timeoutMs === 0) return // 'Never' — no timer
  this.idleTimer = setTimeout(() => void this.lock(window, 'idle'), timeoutMs)
}
```

### Pattern 6: Backup Payload Structure

**What:** JSON payload of all tables included in backup.

**Example:**
```typescript
interface BackupPayload {
  version: 1
  createdAt: string        // ISO timestamp
  householdName: string    // for display on restore verification
  tables: {
    onboardingProgress: object    // without PIN/recovery hashes
    accountProfiles: object[]
    importBatches: object[]
    importAttempts: object[]
    importSourceFiles: object[]
    importedTransactions: object[]
    reviewItems: object[]
    categories: object[]
    categorizationRules: object[]
    auditEvents: object[]
    appSettings: Array<{ key: string; value: string }> // settings only, not security keys
  }
}
```

**Security note (D-04):** The `security_state` table row (which contains `pin_hash`, `recovery_code_ciphertext`, `recovery_words_ciphertext`) is explicitly excluded. After restore the owner sets a fresh PIN and a new recovery key is generated — same flow as `beginRecoveryReset`.

### Anti-Patterns to Avoid

- **Hand-rolling a file format parser:** The backup is a binary buffer with a fixed layout — no custom parsing library needed.
- **Storing PIN-derived key material:** Never persist the scrypt key. Derive it fresh on each encrypt/decrypt call.
- **Putting keyboard shortcuts in individual screens:** All global shortcuts must live in the centralized `App.tsx` handler. Only Esc/Enter/screen-local bindings live in leaf components.
- **Theme via inline style toggling:** Toggle a CSS data attribute, not individual inline styles. CSS variables propagate automatically.
- **Type-to-confirm using uncontrolled input:** Use controlled React state so the confirm button can track match status reactively.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memory-hard KDF for backup encryption | Custom iterated PBKDF2 | `node:crypto` `scryptSync` | scrypt is memory-hard (resists GPU/ASIC brute force), already in Node.js, no install needed |
| File save/open dialogs | Custom renderer-side `<input type="file">` for save | `electron.dialog.showSaveDialog` / `showOpenDialog` in main process | Renderer `<input>` cannot return a save path; native dialog gives OS-native UX |
| Keyboard shortcut registry | Full HotKey library (mousetrap, hotkeys-js) | Single `addEventListener('keydown')` in App.tsx | Scope is narrow — 8 global shortcuts + Esc/Enter; no library warranted |
| Feature flag system | LaunchDarkly, Unleash, Flagsmith | Single JSON field in `app_settings` | Release 1 has one flag; a JSON field is sufficient and keeps it offline-first |
| Confirmation dialog component | Custom modal framework | Inline React state + existing button/style patterns | The project uses inline styles throughout; no dialog library introduced |
| Backup serialization | Custom binary format with compression | JSON stringified into AES-256-GCM | Dataset is small (household expenses); no compression needed |

**Key insight:** This phase works almost entirely with Node.js built-ins and patterns already established in the codebase. The most dangerous trap is adding unnecessary packages for problems that are well in scope of `node:crypto`, CSS custom properties, and React state.

---

## Common Pitfalls

### Pitfall 1: scrypt Cost Parameters Too Low or Too High

**What goes wrong:** scrypt with default parameters (N=16384 for interactive) can take 50–200 ms — fine for backup/restore (one-time operation). But if wrong parameters are used, it can either be too fast (brute-forceable) or block the Electron main process for seconds.

**Why it happens:** Developers copy parameters from web tutorials that assume async usage; Node's `scryptSync` blocks the main thread.

**How to avoid:** Use `scryptSync` with `{ N: 16384, r: 8, p: 1 }` (Node default, ~100ms on modern hardware). Backup/restore is intentionally a slow operation — the user expects latency. Run it in a try/catch with a clear loading state in the UI.

**Warning signs:** Restore button unresponsive for >3 seconds with no feedback.

### Pitfall 2: GCM Authentication Tag Not Verified

**What goes wrong:** Decryption appears to succeed but returns garbage because the auth tag was not set before `decipher.final()`.

**Why it happens:** Missing `decipher.setAuthTag(tag)` call.

**How to avoid:** Always call `decipher.setAuthTag(tag)` before `decipher.final()`. The `final()` call will throw if the tag doesn't match — wrap in try/catch and surface as "Wrong PIN or corrupted backup file."

**Warning signs:** Decryption succeeds with wrong PIN (means auth tag is not being checked).

### Pitfall 3: Ctrl+1–8 Firing While Typing in Input Fields

**What goes wrong:** Owner types in a search input and Ctrl+1 navigates away instead of being a browser text operation.

**Why it happens:** Global `keydown` listener fires regardless of which element has focus.

**How to avoid:** Check `event.target` before handling:
```typescript
const target = event.target as HTMLElement
if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
```

**Warning signs:** Navigation triggers when typing PIN, searching transactions, or typing in type-to-confirm input.

### Pitfall 4: Full Reset Wipes PIN Before Confirm Flow Completes

**What goes wrong:** Calling `fullReset()` immediately clears all data including security state, and the app enters onboarding without any security — or crashes because expected tables are empty.

**Why it happens:** Reset implementation deletes all rows atomically without sequencing the UI confirm flow.

**How to avoid:** The full-reset IPC handler must follow the same `startNewProfileSetup` → `clearWorkspaceTables` → `resetWorkspaceRows` pattern already proven in `db.ts`. Let onboarding re-establish PIN from scratch. Test that the app returns to onboarding step 'welcome' after reset.

**Warning signs:** App enters dashboard or crashes after reset.

### Pitfall 5: Backup Restore Skips the PIN Regeneration Step

**What goes wrong:** Data is restored successfully but the old PIN hash from the backup is also restored, allowing the original PIN (and potentially a known-bad PIN) to unlock the app.

**Why it happens:** Naive restore copies everything from the backup payload including security fields.

**How to avoid:** D-06 explicitly excludes PIN/recovery key from backup (D-04). After restore, force the owner through a fresh PIN-setup flow, using the same `setupSecuritySecrets` path as `beginRecoveryReset`. Verify the restored backup does not include `security_state`.

**Warning signs:** After restore, the app can be unlocked without setting a new PIN.

### Pitfall 6: Theme Toggle Reverts on Reload

**What goes wrong:** Owner sets dark theme, reloads the app (or it relaunches), and theme resets to OS default.

**Why it happens:** Theme is applied in a `useEffect` that runs after hydration but the persisted preference was not loaded yet.

**How to avoid:** Apply theme via `applyTheme(config.theme)` in the same `useEffect` that loads `AppShellState` from the IPC (`loadAppState`). Alternatively, have the IPC response include the current `appConfig` so the renderer can apply theme synchronously on first render.

**Warning signs:** Flash of wrong theme on app start (FOWT).

### Pitfall 7: "Clear Transactions" Leaves Orphaned Audit Events

**What goes wrong:** Clearing transactions deletes `imported_transactions` rows but leaves audit events that reference those transaction IDs, leading to orphaned events and confusing audit history.

**Why it happens:** The clear-transactions operation only DELETEs from the transaction table.

**How to avoid:** Per D-13: "Clear transactions — deletes all transaction records and associated audit events for those transactions." The implementation must also DELETE audit events where `entity_id` matches a deleted transaction ID, or where `category` is a transaction-related event type. Review existing `clearWorkspaceTables` to see if audit events need explicit scoping.

**Warning signs:** Audit screen shows events for transactions that no longer exist.

---

## Code Examples

### IPC Contract Extension (app-state.ts)

```typescript
// Source: existing WalnutApi pattern in src/shared/contracts/app-state.ts
export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  idleLockTimeoutMs: number
  featureFlags: {
    aiSummaries: boolean
  }
}

export interface BackupResult {
  ok: boolean
  filePath?: string
  error?: string
}

export interface RestoreResult {
  ok: boolean
  householdName?: string  // from backup — for verification display
  error?: string
}

export interface ChangePinInput {
  currentPin: string
  newPin: string
}

export interface ClearTransactionsResult {
  deletedCount: number
}

// Add to WalnutApi:
getAppConfig: () => Promise<AppConfig>
setAppConfig: (input: Partial<AppConfig>) => Promise<AppConfig>
changePin: (input: ChangePinInput) => Promise<{ ok: boolean; error?: string }>
exportBackup: () => Promise<BackupResult>
importBackup: (pin: string) => Promise<RestoreResult>
clearTransactions: () => Promise<ClearTransactionsResult>
fullReset: () => Promise<AppShellState>
```

### Sidebar Title Hint Update (App.tsx)

```typescript
// Source: existing App.tsx — update each nav button's title prop
<button
  type="button"
  title="Dashboard (Ctrl+1)"
  aria-label="Open dashboard workspace"
  // ... rest unchanged
>
```

### Settings Section Skeleton (SettingsScreen.tsx)

```typescript
// Source: existing SettingsScreen.tsx action-card pattern
// Each section follows the same <section aria-labelledby="..."> structure
// Preferences section example:
<section style={styles.section} aria-labelledby="prefs-heading">
  <h2 id="prefs-heading" style={styles.sectionHeading}>Preferences</h2>
  {/* Theme toggle row */}
  {/* Idle lock timeout selector row */}
</section>
```

---

## Runtime State Inventory

> This is not a rename/refactor phase — no runtime state migration is required.

None — Phase 8 adds new settings fields to `app_settings` KV table (which is additive and auto-created) and does not rename or migrate existing stored data.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `node:crypto` | Backup encryption | Yes | Node v22.16 | — |
| `@node-rs/argon2` | Change PIN flow | Yes | ^2.0.2 | — |
| `electron.dialog` | File save/open for backup | Yes | Electron ^30 | — |
| `better-sqlite3` | App config persistence | Yes | ^11.8.1 | — |
| Vitest | Unit tests | Yes | ^3.2.4 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 with jsdom + React Testing Library |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test:unit -- --reporter=verbose` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETG-01 | `encryptBackup` / `decryptBackup` round-trip | unit | `vitest run tests/unit/backup-service.test.ts` | No — Wave 0 |
| SETG-01 | Wrong PIN produces auth tag failure | unit | `vitest run tests/unit/backup-service.test.ts` | No — Wave 0 |
| SETG-01 | Backup payload excludes PIN hash and recovery key fields | unit | `vitest run tests/unit/backup-service.test.ts` | No — Wave 0 |
| SETG-01 | `getAppConfig` defaults and round-trip persistence | unit | `vitest run tests/unit/app-config.test.ts` | No — Wave 0 |
| SETG-01 | `setAppConfig` partial update merges correctly | unit | `vitest run tests/unit/app-config.test.ts` | No — Wave 0 |
| SETG-01 | `clearTransactions` removes transactions + associated audit events | unit | `vitest run tests/unit/cleanup.test.ts` | No — Wave 0 |
| SECU-03 | `changePin` rejects wrong current PIN | unit | `vitest run tests/unit/pin-service.test.ts` | Partial — extend |
| SECU-03 | `changePin` succeeds and new PIN unlocks | unit | `vitest run tests/unit/pin-service.test.ts` | Partial — extend |
| ACCS-01 | Keyboard shortcut handler ignores events when target is INPUT | unit | `vitest run tests/unit/keyboard-shortcuts.test.ts` | No — Wave 0 |
| ACCS-01 | Ctrl+1 navigates to dashboard screen | unit | `vitest run tests/unit/keyboard-shortcuts.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- --reporter=dot`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/backup-service.test.ts` — covers backup encrypt/decrypt, wrong-PIN rejection, and payload exclusion (SETG-01)
- [ ] `tests/unit/app-config.test.ts` — covers `getAppConfig` defaults, partial `setAppConfig`, idle timeout options (SETG-01)
- [ ] `tests/unit/cleanup.test.ts` — covers `clearTransactions` orphan audit event handling (SETG-01)
- [ ] `tests/unit/keyboard-shortcuts.test.ts` — covers shortcut guard against INPUT targets, navigation dispatch (ACCS-01)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PBKDF2 for symmetric key derivation | `scrypt` (memory-hard) | Node v10+ (2018) | scrypt resists GPU brute force; PBKDF2 is still acceptable but scrypt is the modern default for new implementations |
| CSS media-query-only theming | Data attribute + media query fallback | CSS4 era best practice | Allows programmatic override without flash; theme toggle requires attribute approach |
| Hardcoded idle timeout constant | Configurable via app settings | Phase 8 (this phase) | `IDLE_LOCK_TIMEOUT_MS` in `session-lock.ts` becomes a DB-read value |
| No keyboard shortcut system | Centralized `keydown` in App.tsx | Phase 8 (this phase) | First centralized shortcut registration; ImportWorkspace already uses ad-hoc keydown — should be consolidated |

**Deprecated/outdated:**
- `IDLE_LOCK_TIMEOUT_MS` hardcoded constant: Replace with `repository.getAppConfig().idleLockTimeoutMs` — must remain backward-compatible (default 15 min if not set).
- `@media (prefers-color-scheme: dark)` as the sole theme mechanism: Extend with data-attribute override while keeping the media query as the system-default fallback.

---

## Open Questions

1. **Audit table scope for "clear transactions"**
   - What we know: `audit_events` table (added in Phase 7) logs events per entity. The schema was not read in full.
   - What's unclear: Whether audit events store `entity_id` per row, or whether a batch-level granularity is sufficient for the clear operation.
   - Recommendation: Read `src/main/persistence/db.ts` audit event logging methods before implementing `clearTransactions`. If `entity_id` exists on audit rows, delete where `entity_id IN (SELECT id FROM imported_transactions)`. If not, delete all transaction-category audit event types.

2. **"Restore from backup" entry point on lock screen**
   - What we know: `LockScreen.tsx` already has a `DatabaseBackup` icon button stub ("Restore from backup") in the `linkCluster` section (line 485).
   - What's unclear: Whether the restore flow should be accessible from the lock screen (where no PIN has been entered yet) or only from the Settings screen when unlocked.
   - Recommendation: Per D-06, restore requires entering the PIN used at backup time. The lock-screen stub can open a dedicated restore modal — enter backup file, enter backup PIN, restore data, then require a fresh PIN setup. This is a distinct flow from the main settings restore. The planner should decide if this is in scope for Phase 8 or if the lock-screen button remains a stub.

3. **ImportWorkspace ad-hoc keydown listener**
   - What we know: `ImportWorkspace.tsx` has its own `keydown` listener (noted in CONTEXT.md as "ad-hoc one in ImportWorkspace").
   - What's unclear: Whether Phase 8 should consolidate it into the centralized handler or leave it scoped to the component.
   - Recommendation: Leave `ImportWorkspace`'s listener in place for screen-local bindings. Only navigation shortcuts (Ctrl+1–8) should be in `App.tsx`. The consolidation is additive, not a migration.

---

## Sources

### Primary (HIGH confidence)

- `node:crypto` documentation — `scryptSync`, `createCipheriv('aes-256-gcm')`, `setAuthTag` API — verified by running Node v22.16.0 in environment
- Existing codebase — `pin-service.ts`, `session-lock.ts`, `db.ts`, `SettingsScreen.tsx`, `App.tsx`, `LockScreen.tsx`, `schema.ts` — direct source reads
- `package.json` — dependency versions verified by file read
- `08-CONTEXT.md` — locked decisions read directly

### Secondary (MEDIUM confidence)

- Node.js scrypt vs PBKDF2 guidance: MDN Web Docs and Node.js documentation consistently recommend scrypt for key derivation (memory-hard), PBKDF2 as a fallback for compatibility — consistent with project's existing Argon2 posture for password hashing
- CSS data-attribute theme toggling: Established pattern in design system literature; avoids flash-of-wrong-theme vs pure media-query approach

### Tertiary (LOW confidence)

- Ctrl+1–8 not intercepted by Electron/Chromium by default on Windows: Based on knowledge of browser reserved shortcuts; Ctrl+1–8 is not in Chromium's reserved shortcut list. Recommend verifying by running the app during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified present; Node crypto primitives tested in environment
- Architecture: HIGH — directly derived from reading existing codebase patterns (IPC modules, db.ts settings storage, pin-service.ts)
- Pitfalls: HIGH — derived from reading actual implementation code; scrypt parameter guidance from Node.js docs
- Keyboard shortcut safety: MEDIUM — Ctrl+1–8 safety on Windows verified against known browser reserved list but should be confirmed in running app

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable dependencies; no fast-moving ecosystem)
