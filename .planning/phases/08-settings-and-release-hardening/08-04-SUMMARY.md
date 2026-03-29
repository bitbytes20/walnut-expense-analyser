---
phase: 08-settings-and-release-hardening
plan: 04
subsystem: settings-ui
tags: [settings, preferences, security, backup, feature-flags, danger-zone, accessibility]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [complete-settings-screen, SETG-01-UI, SECU-03-UI, ACCS-01-settings]
  affects: [src/renderer/features/settings/SettingsScreen.tsx, src/renderer/App.tsx]
tech_stack:
  added: []
  patterns:
    - "Segmented button group with aria-pressed for theme selection"
    - "Expandable inline form pattern for Change PIN card"
    - "Custom pill toggle switch with role=switch and aria-checked"
    - "Focus trap with auto-focus on safe default in confirmation modals"
    - "Inline focus ring via onFocus/onBlur style mutation (no global CSS needed)"
key_files:
  created: []
  modified:
    - src/renderer/features/settings/SettingsScreen.tsx
    - src/renderer/App.tsx
decisions:
  - "Built all six sections in a single file rewrite pass — SettingsScreen is self-contained with no sub-components"
  - "SettingsScreenProps accepts onRequirePinSetup and onFullReset callbacks; App.tsx wires them to loadAppState() re-navigation and setState()"
  - "Toggle switch uses inline style functions (toggleTrack/toggleThumb) outside the as-const styles object to allow dynamic checked prop"
  - "Backup/Restore flow: show PIN prompt inline before calling IPC — consistent with plan spec"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-29"
  tasks_completed: 3
  files_modified: 2
---

# Phase 8 Plan 04: Complete Settings Screen Summary

**One-liner:** Full six-section Settings screen (Preferences, Security, Backup, Support, Lab, Danger Zone) wired to all Plan 01/02 IPC handlers with accessible keyboard navigation, modal confirmations, and post-action navigation callbacks.

## What Was Built

### Task 1: Preferences + Security + Backup Sections

**Rewrote `src/renderer/features/settings/SettingsScreen.tsx`** from single-section Support page to full six-section layout.

**Section 1 — Preferences:**
- Theme segmented button group (Light / Dark / System) with `aria-pressed`, calls `applyTheme()` to set `data-theme` attribute on `<html>`, persists via `setAppConfig({ theme })`
- Idle-lock timeout `<select>` with 4 options (5min/15min/30min/Never), persists via `setAppConfig({ idleLockTimeoutMs })`
- Loads initial values from `getAppConfig()` on mount

**Section 2 — Security:**
- Change PIN action card that expands inline (controlled by `changePinExpanded` state)
- Three `type="password" inputMode="numeric"` inputs: Current PIN, New PIN, Confirm New PIN
- Inline validation: 6+ digit minimum, confirmation match, `var(--color-destructive)` error text
- Submit calls `window.walnut.changePin()`, shows "PIN updated successfully" on success / error text on wrong current PIN
- Ctrl+S shortcut submits when form is expanded
- Recovery key note card below

**Section 3 — Backup:**
- Create Backup: inline PIN prompt, calls `exportBackup(pin)`, native save dialog handled by IPC
- Restore from Backup: inline PIN prompt, calls `importBackup(pin)`, native open dialog handled by IPC, success calls `onRequirePinSetup` callback
- Backup warning note with left red-tint border

**Section 4 — Support (repositioned from original):**
- Existing diagnostics export cards and crash log note preserved exactly

### Task 2: Lab + Danger Zone Sections + Accessibility Polish

**Section 5 — Lab:**
- AI Summaries toggle: custom pill switch with `role="switch"`, `aria-checked`, keyboard (Space/Enter)
- Persists via `setAppConfig({ featureFlags: { aiSummaries } })`
- Off by default, loaded from config on mount

**Section 6 — Danger Zone:**
- Styled container: `borderLeft: 3px solid var(--color-destructive)`, `rgba(180, 35, 24, 0.04)` background
- Clear Transactions: single confirm modal (`aria-modal`, `aria-labelledby`, auto-focus on "Keep Transactions" safe default)
- Full App Reset: type-to-confirm modal ("RESET" required), `disabled` until exact match
- Both modals: Escape to close, `aria-live="polite"` success messages

**Accessibility polish:**
- All interactive elements: `onFocus`/`onBlur` inline focus ring (`2px solid var(--color-accent)`)
- `aria-live="polite"` on all async state messages
- All sections have `aria-labelledby` pointing to heading `id`
- `role="switch"` + `aria-checked` on toggle
- `aria-pressed` on segmented theme buttons

**App.tsx updates:**
- `<SettingsScreen>` now receives `onRequirePinSetup` (loads state, sets to onboarding) and `onFullReset` (sets returned `AppShellState`)

## Task Commits

1. **Task 1: Preferences + Security + Backup sections** — `eb38430`
2. **Task 2: Lab + Danger Zone + accessibility polish** — `2739ca3`
3. **Task 3: Human verification checkpoint** — approved 2026-03-29

## Verification

**TypeScript:** No errors in `SettingsScreen.tsx` or `App.tsx`

**Settings-related unit tests (all passing):**
- `backup-service.test.ts` — 5/5 passed
- `app-config.test.ts` — 7/7 passed
- `pin-service.test.ts` — 6/6 passed
- `cleanup.test.ts` — 8/8 passed

**Pre-existing test failures (out of scope):** 19 failures in import-history, review-queue, transaction-ledger, import/rejections, import/review-mutations — these existed before Plan 04 and are not caused by settings changes.

**Manual verification (Task 3 checkpoint):** Human approved 2026-03-29. All 15 verification steps passed — six sections render in correct order, all interactive controls work end-to-end, keyboard navigation and focus rings confirmed, modal confirmations function correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Combined onBlur handlers for PIN inputs**
- **Found during:** Task 2 accessibility review
- **Issue:** `new-pin` and `confirm-pin` inputs had `onBlur={validateChangePinFields}` but missing the focus ring removal — inconsistent with all other inputs
- **Fix:** Changed to combined lambda: `onBlur={(e) => { validateChangePinFields(); e.currentTarget.style.outline = ''; ... }}`
- **Files modified:** `src/renderer/features/settings/SettingsScreen.tsx`
- **Commit:** 2739ca3

**2. [Rule 2 - Missing Critical] Added border-radius to segmented button group**
- **Found during:** Task 2 polish
- **Issue:** Segmented buttons had `borderRadius: 0` on all — visually incorrect, first/last need rounded corners
- **Fix:** Added `borderRadius` and `marginLeft: -1` per segment index
- **Files modified:** `src/renderer/features/settings/SettingsScreen.tsx`
- **Commit:** 2739ca3

## Known Stubs

None — all IPC calls are wired to real handlers from Plans 01 and 02. All config persistence, backup encryption, PIN change, clear transactions, and full reset are production-ready.

## Self-Check: PASSED

- `src/renderer/features/settings/SettingsScreen.tsx` — exists, 630+ lines
- `src/renderer/App.tsx` — updated with onRequirePinSetup and onFullReset props
- Commits `eb38430` and `2739ca3` verified in git log
