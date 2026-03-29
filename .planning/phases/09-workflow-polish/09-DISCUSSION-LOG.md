# Phase 9: Workflow Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 09-workflow-polish
**Areas discussed:** Transaction multi-select, Review queue bulk + keyboard, Import error diagnostics + retry, Filter presets

---

## Transaction Multi-select

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Checkbox column always shown on the left | ✓ |
| Appear on hover/focus | Checkboxes only visible on hover or keyboard focus | |
| Toggle mode | 'Select' button activates multi-select mode globally | |

**User's choice:** Always visible

---

| Option | Description | Selected |
|--------|-------------|----------|
| Current page only | Selects rows visible on screen | ✓ |
| All matching transactions | Selects every transaction matching current filters across pages | |

**User's choice:** Current page only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky below table header | Appears inline at top of table body when rows are selected | ✓ |
| Floating overlay at bottom | Fixed bar at bottom of screen | |
| Replaces filter bar | Takes over filter area when selection is active | |

**User's choice:** Sticky below table header

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown in action bar | Category picker opens directly in bulk action bar | ✓ |
| Slide-out side panel | Opens TransactionDetailDrawer-style panel | |
| Modal dialog | Focused modal with category picker + confirmation | |

**User's choice:** Inline dropdown in action bar

---

## Review Queue: Bulk + Keyboard

| Option | Description | Selected |
|--------|-------------|----------|
| Approve what's possible, report blocked | Approves approvable items, shows count summary for blocked | ✓ |
| Block the whole action | If any item is gated, entire bulk approve is blocked | |
| Prompt before executing | Confirmation dialog before acting on mixed selection | |

**User's choice:** Approve what's possible, report what's blocked

---

| Option | Description | Selected |
|--------|-------------|----------|
| A to approve, R to reject | Single-key shortcuts | ✓ |
| Enter to approve, Delete to reject | Standard confirm/cancel semantics | |
| Ctrl+A / Ctrl+R | Follows app's Ctrl-modifier convention | |

**User's choice:** A to approve, R to reject

---

| Option | Description | Selected |
|--------|-------------|----------|
| Up/Down arrow keys | Move focus between items in the list | ✓ |
| J/K (vim-style) | J = next, K = previous | |
| Tab/Shift+Tab | Standard focus traversal | |

**User's choice:** Up/Down arrow keys

---

## Import Error Diagnostics + Retry

| Option | Description | Selected |
|--------|-------------|----------|
| Row number + expected vs found + suggested fix | Full detail per row | ✓ |
| Row number + description only | Row number with brief description | |
| File-level summary only | Count of unparseable rows, no row detail | |

**User's choice:** Row number + expected vs found + suggested fix

---

| Option | Description | Selected |
|--------|-------------|----------|
| Expand in StagedFileRow inline | Error detail expands inline below file row | ✓ |
| In the existing ReasonPanel side panel | Opens ReasonPanel with error list | |
| Toast / inline banner above table | Banner across top of staging area | |

**User's choice:** Expand in StagedFileRow inline

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace in-place: re-stage without leaving | User picks corrected file, replaces rejected one in staging | ✓ |
| Remove and re-add | User removes rejected file, adds new file manually | |
| Restart import session | Retry clears whole staging area | |

**User's choice:** Replace in-place: re-stage without leaving

---

## Filter Presets

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite via IPC | Stored in app database, covered by backup/restore | ✓ |
| localStorage / Electron userData | Quick to implement, outside backup/restore system | |

**User's choice:** SQLite via IPC

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the filter drawer | Save button at bottom, preset list at top of drawer | ✓ |
| Dedicated preset button near filter button | Separate preset icon in toolbar | |
| Both: quick picker + full management in drawer | Toolbar quick-load + drawer management | |

**User's choice:** Inside the filter drawer

---

| Option | Description | Selected |
|--------|-------------|----------|
| User types a name on save | Inline input appears on 'Save as preset' click | ✓ |
| Auto-named from active filters | Name generated from filter values | |
| Unnamed until user edits | Saved as 'Preset 1', 'Preset 2' etc. | |

**User's choice:** User types a name on save

---

## Claude's Discretion

- Shift+click range-select implementation details
- Bulk tag assignment picker UI
- Keyboard focus management after A/R shortcuts
- Import error copy tone
- Empty state for filter preset list

## Deferred Ideas

None.
