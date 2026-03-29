# Phase 8: Settings and Release Hardening - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete owner controls in the Settings screen (theme, idle-lock timeout, encrypted backup/restore, diagnostics, feature flags, granular cleanup, full reset) and quality rails for keyboard navigation and shortcuts across core workflows. This is the final phase before release 1.

</domain>

<decisions>
## Implementation Decisions

### Settings Screen Structure
- **D-01:** Settings uses a single scrollable page divided into named sections. No tabs or sidebar nav — consistent with the current SettingsScreen.tsx layout.
- **D-02:** Section order (top to bottom): **Preferences → Security → Backup → Support → Feature Flags / Lab → Danger Zone**.
- **D-03:** Feature flags get their own dedicated section labelled "Feature Flags" or "Lab" — between Support and Danger Zone. Not hidden inside Support, not lumped into Danger Zone.

### Backup and Restore
- **D-04:** Backup includes all data **except** PIN and recovery key hashes: transaction records, categories, rules, audit events, household profile, account profile, and app config.
- **D-05:** Backup file is AES-256 encrypted using a key derived from the owner's PIN (PBKDF2 or Argon2). No separate passphrase — restoring requires knowing the PIN used at backup time.
- **D-06:** Restore flow: import backup file → decrypt with current/entered PIN → restore all data → prompt owner to set a new PIN → regenerate recovery key. PIN and recovery key are always fresh after restore.

### Keyboard Shortcut Coverage
- **D-07:** Scope is **global navigation shortcuts + critical in-screen actions**. Tab/focus navigation on all interactive elements is also required as a baseline.
- **D-08:** Global workspace navigation uses **Ctrl+1 through Ctrl+8** (matching the 8 sidebar icons in order). No letter mnemonics.
- **D-09:** Shortcuts are surfaced via **tooltip hints on sidebar nav buttons** (e.g. title="Dashboard (Ctrl+1)"). No dedicated shortcuts panel needed.
- **D-10:** Critical in-screen actions (e.g. Esc to close drawers/modals, Enter to confirm, relevant action shortcuts per screen) should be covered but exact bindings are Claude's discretion.

### Feature Flags
- **D-11:** Release 1 ships with **one feature flag only**: AI summaries toggle (enable/disable the narrative AI text on the dashboard). Off by default.
- **D-12:** Feature flag state is persisted in app config (not per-session).

### Danger Zone / Reset Tools
- **D-13:** Two granular cleanup options:
  1. **Clear transactions** — deletes all transaction records (and associated audit events for those transactions) while keeping categories, rules, household profile, and account profile.
  2. **Full app reset** — wipes everything and returns to onboarding.
- **D-14:** Confirmation UX is proportional to consequence:
  - Clear transactions → single confirmation dialog ("Are you sure? This cannot be undone.")
  - Full app reset → type-to-confirm (owner must type `RESET` or similar before proceeding).

### Claude's Discretion
- Exact critical in-screen keyboard bindings (D-10) — choose bindings that avoid Electron/browser defaults.
- Backup file extension and format wrapper (e.g. `.walnut-backup`, `.wbk`) — pick something unambiguous.
- Exact PBKDF2 vs Argon2 choice for PIN key derivation — pick the more appropriate one for an Electron/Node.js context.
- Idle-lock timeout options (e.g. 5 min, 15 min, 30 min, never) — pick a sensible set, with 15 min as the default (matches existing security spec).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — SECU-03, SETG-01, ACCS-01 (the three requirements this phase delivers)
- `.planning/PROJECT.md` — Section: Constraints (PIN security, privacy, accessibility, performance)

### Existing Implementation
- `src/renderer/features/settings/SettingsScreen.tsx` — Current settings screen (diagnostics export only); Phase 8 expands this significantly
- `src/renderer/App.tsx` — Navigation sidebar with 8 icon buttons; keyboard shortcuts wire into this component
- `src/renderer/features/lock-screen/LockScreen.tsx` — PIN entry pattern to reference for backup restore PIN prompt
- `src/shared/contracts/app-state.ts` — App state contracts; backup/restore and feature flag state will extend this

### Prior Phase Decisions
- `.planning/phases/06-dashboard-analytics/06-CONTEXT.md` — Theme (light/dark) was planned for Phase 6; confirm current state before adding theme toggle to settings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LockScreen.tsx` and `RecoveryResetFlow.tsx`: PIN entry and recovery flow patterns — reuse for backup restore PIN prompt
- `AppShell.tsx`: Existing shell with `contentMode` prop — settings can use centered mode
- `App.tsx` sidebar: 8 nav buttons already have `title` and `aria-label` — adding shortcut hints is minimal change
- Diagnostics export cards in `SettingsScreen.tsx`: Established action-card pattern to reuse for backup/restore UI

### Established Patterns
- State management: `useState` + IPC calls via `window.walnut.*` — backup/restore will follow same pattern
- Styling: Inline style objects with CSS variables (e.g. `var(--space-xl)`, `var(--color-surface)`) — no CSS modules
- No existing keyboard shortcut system — Phase 8 introduces the first centralised `useEffect` keydown listener in `App.tsx`
- No existing feature flag infrastructure — needs to be built from scratch (persisted in app config)

### Integration Points
- Backup/restore: New IPC handlers in `src/main/ipc/` and new persistence methods in `src/main/persistence/db.ts`
- Feature flags: New field in app config contract (`src/shared/contracts/app-state.ts`) + IPC to read/write
- Keyboard shortcuts: Centralised `keydown` listener in `src/renderer/App.tsx` — replaces the ad-hoc one in `ImportWorkspace.tsx`
- Reset tools: New IPC handlers that clear DB tables or trigger full reset flow

</code_context>

<specifics>
## Specific Ideas

- The backup file should be clearly labelled as owner-only and not safe to share (unlike the redacted diagnostics bundle which is designed for sharing).
- The Settings "Preferences" section should have: theme toggle (light/dark) and idle-lock timeout selector.
- The Settings "Security" section should have: change PIN, and a note about recovery key management.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-settings-and-release-hardening*
*Context gathered: 2026-03-29*
