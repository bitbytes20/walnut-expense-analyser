# Phase 9: Workflow Polish - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver three speed improvements to the existing v1.0 workflow:
1. **Multi-select batch operations** on the transaction ledger (checkbox select, bulk category + tag assignment)
2. **Bulk + keyboard operations** on the review queue (bulk approve/dismiss, A/R shortcuts, arrow navigation)
3. **Import error diagnostics + retry** (row-level error detail, inline expansion, in-place retry)
4. **Named filter presets** for the transaction ledger (save, restore, rename, delete)

New capabilities (budgeting, rule expansion, family members) are NOT in scope.

</domain>

<decisions>
## Implementation Decisions

### Transaction Multi-select

- **D-01:** Checkboxes are always visible — a permanent leftmost column in TransactionLedgerTable. No hover-reveal or toggle-mode.
- **D-02:** Select-all covers the current page only (what the user sees). No cross-page bulk select.
- **D-03:** Bulk action bar appears sticky below the table header when one or more rows are selected. Disappears when selection is cleared.
- **D-04:** Bulk category assignment uses an inline dropdown directly in the bulk action bar — no slide-out panel or modal.
- **D-05:** Bulk tag assignment follows the same inline-in-action-bar pattern as category (Claude's Discretion on the exact tag picker UI, consistent with D-04).

### Review Queue: Bulk Actions

- **D-06:** Mixed-state bulk approve (some items import-gated, some not): approve all approvable items and surface a count summary — e.g. "8 approved, 3 skipped (import gate still active)". Do NOT block the whole action or prompt before executing.

### Review Queue: Keyboard Shortcuts

- **D-07:** `A` to approve, `R` to reject individual review queue items. Single-key, no Ctrl modifier.
- **D-08:** Up/Down arrow keys navigate between items in the review queue list.
- Note: Ctrl+1-8 navigation shortcuts from Phase 8 remain unchanged. A/R are scoped to the review queue focus context only.

### Import Error Diagnostics

- **D-09:** Parse errors show row-level detail: row number + what was expected vs what was found + a suggested fix. e.g. "Row 47: Expected a date in DD/MM/YYYY, found 'N/A'. Try cleaning the row or removing it."
- **D-10:** Errors appear inline, expanding below the StagedFileRow when user clicks "View reason". Consistent with the existing rejected-file expand pattern. Extends `StagedFileRow` rather than always routing to `ReasonPanel`.
- **D-11:** Retry = replace in-place. User picks a corrected file; it replaces the rejected file in the staging list. Import batch context and other staged files are preserved. No navigation away required.

### Filter Presets

- **D-12:** Presets are stored in SQLite via IPC — part of the app database, covered by backup/restore. Not localStorage or Electron userData.
- **D-13:** Preset picker lives inside the filter drawer: preset list at the top of the drawer for one-click restore; "Save as preset" button at the bottom.
- **D-14:** Naming on save: a small inline input appears when user clicks "Save as preset". User types the name and confirms. No auto-generation or deferred naming.
- **D-15:** Preset management (rename, delete, list) is handled inline within the filter drawer — no separate settings screen.

### Claude's Discretion

- Shift+click range-select implementation details (anchor tracking, visual feedback)
- Bulk tag assignment picker UI (follows D-04/D-05 intent but exact component design is open)
- Keyboard focus management when A/R shortcuts are used (whether focus auto-advances to next item)
- Error copy tone for import diagnostics (friendly/actionable, consistent with existing reason panel copy)
- Empty state for filter preset list (before any presets are saved)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` §Workflow Polish — WORKFLOW-01 through WORKFLOW-09 (all 9 requirements are in scope for this phase)

### Prior Context (key decisions that still apply)
- `.planning/PROJECT.md` §Key Decisions — keyboard shortcuts Ctrl+1-8, keyboard navigation requirement, no OS notifications
- `.planning/milestones/v1.0-ROADMAP.md` — Phase 8 shipped shortcuts; understand what's already wired before adding A/R shortcuts

### Phase Success Criteria (from ROADMAP.md)
1. Multi-select transactions with checkboxes and shift+click range-select, apply category to all in one step
2. Bulk approve/dismiss review queue items; mixed-state handled with count summary
3. Keyboard shortcuts (A/R) for approve/reject individual review items without mouse
4. Import error messages: failing row, expected vs found, suggested fix; retry with corrected file without navigating away
5. Save current filter state as named preset, restore in one click; rename, delete, list presets

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/renderer/features/import/ReviewBulkActionBar.tsx` — existing bulk action bar for review queue; extend for mixed-state count summary
- `src/renderer/features/import/ReviewQueueScreen.tsx` — already has `selectedReviewItemIds` state; needs keyboard shortcut wiring
- `src/renderer/features/import/StagedFileRow.tsx` — extend to render inline expanded error detail (row-level messages)
- `src/renderer/features/import/ReasonPanel.tsx` — existing panel pattern; may be extended or partially replaced for row-level error display
- `src/renderer/features/transactions/TransactionFilterDrawer.tsx` — extend with preset list at top + save button at bottom
- `src/renderer/features/transactions/TransactionsScreen.tsx` — bulk action bar goes here; filter state already managed here

### Established Patterns
- Keyboard events: `window.addEventListener('keydown', handler)` with cleanup in `useEffect` — pattern in `App.tsx`, `ImportWorkspace.tsx`, `SettingsScreen.tsx`
- IPC: `ipcMain.handle` / `window.walnut.*` — all data ops go through IPC, no direct DB from renderer
- Styling: inline style objects with CSS custom properties (e.g. `var(--color-accent)`, `var(--space-lg)`)
- No UI component library — components are hand-built with inline styles

### Integration Points
- `src/main/ipc/transactions.ts` — add `transactions:bulk-update` IPC handler for bulk category/tag assignment
- `src/main/ipc/import.ts` (or new `filter-presets.ts`) — add CRUD IPC handlers for saved filter presets
- `src/main/persistence/schema.ts` — add `filter_presets` table for D-12
- `src/shared/contracts/import.ts` — extend `ImportFileReason` / `StagedImportFile` to carry row-level parse error detail (array of `{row, expected, found, suggestion}`)
- `src/shared/contracts/transactions.ts` — add `BulkUpdateTransactionsInput` contract; add `FilterPreset` type

</code_context>

<specifics>
## Specific Ideas

- Mixed-state count summary phrasing: "8 approved, 3 skipped (import gate still active)" — clear and non-alarming
- Inline error expansion follows the existing collapsed/expanded file row pattern in `StagedFileRow` — no new UI paradigm
- A/R shortcuts are scoped to review queue focus context to avoid conflicts with other parts of the app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 09-workflow-polish*
*Context gathered: 2026-03-30*
