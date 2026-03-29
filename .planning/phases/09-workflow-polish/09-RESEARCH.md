# Phase 9: Workflow Polish - Research

**Researched:** 2026-03-30
**Domain:** React UI patterns (multi-select, keyboard shortcuts, inline editing), SQLite persistence, Electron IPC extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Transaction Multi-select**
- D-01: Checkboxes are always visible — a permanent leftmost column in TransactionLedgerTable. No hover-reveal or toggle-mode.
- D-02: Select-all covers the current page only (what the user sees). No cross-page bulk select.
- D-03: Bulk action bar appears sticky below the table header when one or more rows are selected. Disappears when selection is cleared.
- D-04: Bulk category assignment uses an inline dropdown directly in the bulk action bar — no slide-out panel or modal.
- D-05: Bulk tag assignment follows the same inline-in-action-bar pattern as category (Claude's Discretion on the exact tag picker UI, consistent with D-04).

**Review Queue: Bulk Actions**
- D-06: Mixed-state bulk approve (some items import-gated, some not): approve all approvable items and surface a count summary — e.g. "8 approved, 3 skipped (import gate still active)". Do NOT block the whole action or prompt before executing.

**Review Queue: Keyboard Shortcuts**
- D-07: `A` to approve, `R` to reject individual review queue items. Single-key, no Ctrl modifier.
- D-08: Up/Down arrow keys navigate between items in the review queue list.
- Note: Ctrl+1-8 navigation shortcuts from Phase 8 remain unchanged. A/R are scoped to the review queue focus context only.

**Import Error Diagnostics**
- D-09: Parse errors show row-level detail: row number + what was expected vs what was found + a suggested fix.
- D-10: Errors appear inline, expanding below the StagedFileRow when user clicks "View reason". Extends `StagedFileRow` rather than always routing to `ReasonPanel`.
- D-11: Retry = replace in-place. User picks a corrected file; it replaces the rejected file in the staging list. Import batch context and other staged files are preserved. No navigation away required.

**Filter Presets**
- D-12: Presets are stored in SQLite via IPC — part of the app database, covered by backup/restore. Not localStorage or Electron userData.
- D-13: Preset picker lives inside the filter drawer: preset list at the top of the drawer for one-click restore; "Save as preset" button at the bottom.
- D-14: Naming on save: a small inline input appears when user clicks "Save as preset". User types the name and confirms. No auto-generation or deferred naming.
- D-15: Preset management (rename, delete, list) is handled inline within the filter drawer — no separate settings screen.

### Claude's Discretion

- Shift+click range-select implementation details (anchor tracking, visual feedback)
- Bulk tag assignment picker UI (follows D-04/D-05 intent but exact component design is open)
- Keyboard focus management when A/R shortcuts are used (whether focus auto-advances to next item)
- Error copy tone for import diagnostics (friendly/actionable, consistent with existing reason panel copy)
- Empty state for filter preset list (before any presets are saved)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORKFLOW-01 | User can select multiple transactions via checkboxes, with shift+click range-select and select-all support | Multi-select state management pattern; anchor tracking for range-select |
| WORKFLOW-02 | User can assign a category to all selected transactions in one step, with inline count confirmation | Bulk IPC handler pattern; optimistic vs confirmed count display |
| WORKFLOW-03 | User can assign freeform tags to multiple selected transactions at once | Inline tag input in bulk action bar; same IPC handler as category bulk |
| WORKFLOW-04 | User can select multiple review queue items and approve or dismiss them in bulk while existing mixed-import gating rules are still respected | Review gating audit in repository; count-summary response contract |
| WORKFLOW-05 | User sees import error messages that name the failing row, describe what was expected vs found, and suggest a remedy | Row-level error array on `StagedImportFile`; parser extension |
| WORKFLOW-06 | User can retry a failed import with a corrected file without navigating away from the import session | Replace-in-place IPC handler; coordinator `replaceStagedFile` method |
| WORKFLOW-07 | User can approve and reject review queue items using keyboard shortcuts | `keydown` event pattern already used in project; focus-scope guard |
| WORKFLOW-08 | User can save the current transaction filter state as a named preset and restore it in one click | New `filter_presets` table; CRUD IPC handlers; WalnutApi extension |
| WORKFLOW-09 | User can manage saved filter presets (rename, delete, list) | Same as WORKFLOW-08 — inline within filter drawer per D-15 |
</phase_requirements>

---

## Summary

Phase 9 is a pure UI-and-plumbing polish phase — no new domain model is introduced. Every feature is an extension of existing surfaces: the transaction ledger table gets checkboxes and a bulk action bar, the review queue gets keyboard shortcuts and a count-summary bulk action, `StagedFileRow` gets inline error expansion and in-place retry, and the filter drawer gets a preset management strip. The tech stack does not change.

The main areas requiring careful design are: (1) multi-select state that must be reset on page change but not on sort/filter change, and (2) the `filter_presets` SQLite table which is the only new persistence surface — it must be added to `bootstrap()` in `db.ts` using the existing `CREATE TABLE IF NOT EXISTS` pattern and also declared in `schema.ts` for Drizzle. The row-level parse error structure requires extending `StagedImportFile` with an optional `parseErrors` array and updating the parser to populate it.

**Primary recommendation:** Implement in five self-contained plans: (1) transaction multi-select UI + bulk action bar, (2) bulk category/tag IPC backend, (3) review queue keyboard shortcuts + bulk mixed-state, (4) import error diagnostics + in-place retry, (5) filter presets end-to-end. Each plan can be merged independently.

---

## Standard Stack

### Core (unchanged from v1.0)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component model, `useState` / `useEffect` | Already in use |
| TypeScript | 5.x | Type safety across renderer/main boundary | Already in use |
| better-sqlite3 | 9.x | SQLite persistence in main process | Already in use |
| Electron | 33.x | IPC bridge, file picker | Already in use |
| Vitest | 2.x | Unit tests | Already in use — `vitest.config.ts` present |
| Zod | 3.x | Contract validation at IPC boundary | Already in use in `transactions.ts` contracts |

### No new libraries required
All features in Phase 9 can be built with the existing stack. Specific callouts:
- No drag-and-drop library needed (shift+click is the only range-select mechanism).
- No virtual-list library needed (existing pagination handles table scale).
- No toast library needed (inline count confirmation in bulk action bar is sufficient per D-03/D-04).

---

## Architecture Patterns

### Pattern 1: Multi-select State in TransactionsScreen

**What:** A `Set<string>` of selected transaction IDs, managed in `TransactionsScreen`. The bulk action bar renders when `selectedIds.size > 0`. The anchor ID for shift+click is tracked separately as `useRef<string | null>`.

**Critical:** Selection must reset when `pagedRows` changes (page navigation, filter change). It must NOT reset on sort changes within the same page.

**Example:**
```typescript
// TransactionsScreen.tsx additions
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const shiftAnchorRef = useRef<string | null>(null)

// Reset when page or filter changes
useEffect(() => {
  setSelectedIds(new Set())
  shiftAnchorRef.current = null
}, [currentPage, submittedSearch, filters])

const handleRowSelect = (id: string, checked: boolean, shiftHeld: boolean) => {
  if (shiftHeld && shiftAnchorRef.current) {
    const anchorIdx = pagedRows.findIndex(r => r.id === shiftAnchorRef.current)
    const targetIdx = pagedRows.findIndex(r => r.id === id)
    const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
    const rangeIds = pagedRows.slice(from, to + 1).map(r => r.id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      rangeIds.forEach(rid => checked ? next.add(rid) : next.delete(rid))
      return next
    })
  } else {
    shiftAnchorRef.current = checked ? id : null
    setSelectedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }
}

const handleSelectAll = (checked: boolean) => {
  setSelectedIds(checked ? new Set(pagedRows.map(r => r.id)) : new Set())
  shiftAnchorRef.current = null
}
```

**When to use:** Pass `selectedIds`, `onSelect`, `onSelectAll` down to `TransactionLedgerTable`.

### Pattern 2: Checkbox Column in TransactionLedgerTable

**What:** Add a leftmost `<th>` with an indeterminate-state `<input type="checkbox">` for select-all, and a `<td>` per row with a row checkbox. The indeterminate state is set via a `ref` (React does not support the `indeterminate` attribute declaratively).

**Example:**
```typescript
// TransactionLedgerTable.tsx — header checkbox
const selectAllRef = useRef<HTMLInputElement>(null)
useEffect(() => {
  if (!selectAllRef.current) return
  const allSelected = pagedRows.length > 0 && pagedRows.every(r => selectedIds.has(r.id))
  const someSelected = pagedRows.some(r => selectedIds.has(r.id))
  selectAllRef.current.indeterminate = someSelected && !allSelected
  selectAllRef.current.checked = allSelected
}, [selectedIds, pagedRows])

// In <th>:
<input
  ref={selectAllRef}
  type="checkbox"
  aria-label="Select all on this page"
  onChange={e => onSelectAll(e.target.checked)}
/>
// In <td> per row:
<input
  type="checkbox"
  checked={selectedIds.has(row.id)}
  aria-label={`Select ${row.description}`}
  onChange={e => onSelect(row.id, e.target.checked, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
/>
```

### Pattern 3: Sticky Bulk Action Bar (conditional render)

**What:** The bulk action bar component already exists for the review queue (`ReviewBulkActionBar`). A new `TransactionBulkActionBar` follows the same style. It is rendered conditionally in `TransactionsScreen` when `selectedIds.size > 0`, placed between the pagination bar and the table.

**Styling pattern (from existing components):**
```typescript
const styles = {
  bar: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.96)',
    boxShadow: 'var(--shadow-panel)'
  }
}
```

### Pattern 4: Bulk IPC Handler (`transactions:bulk-update`)

**What:** A new IPC handler takes an array of transaction IDs and a partial update (categoryId or tags). Runs a SQLite transaction wrapping all row updates. Returns the count of rows actually updated.

**Contract addition in `transactions.ts`:**
```typescript
export const BulkUpdateTransactionsInputSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
  categoryId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional()
})
export type BulkUpdateTransactionsInput = z.infer<typeof BulkUpdateTransactionsInputSchema>

export const BulkUpdateTransactionsResultSchema = z.object({
  updatedCount: z.number()
})
export type BulkUpdateTransactionsResult = z.infer<typeof BulkUpdateTransactionsResultSchema>
```

**Repository implementation pattern (from existing `updateTransaction`):**
```typescript
bulkUpdateTransactions(input: BulkUpdateTransactionsInput): BulkUpdateTransactionsResult {
  const updates: string[] = []
  const params: unknown[] = []
  if (input.categoryId !== undefined) {
    updates.push('category_id = ?', 'category_label = ?')
    params.push(input.categoryId, input.category ?? null)
  }
  if (input.tags !== undefined) {
    updates.push('tags_json = ?')
    params.push(JSON.stringify(input.tags))
  }
  if (updates.length === 0) return { updatedCount: 0 }

  const run = this.sqlite.transaction(() => {
    let count = 0
    for (const id of input.transactionIds) {
      const result = this.sqlite
        .prepare(`UPDATE imported_transactions SET ${updates.join(', ')} WHERE id = ?`)
        .run([...params, id])
      count += result.changes
    }
    return count
  })
  return { updatedCount: run() }
}
```

### Pattern 5: Keyboard Shortcuts in ReviewQueueScreen

**What:** The existing pattern in `ImportWorkspace.tsx` and `App.tsx` is `window.addEventListener('keydown', handler)` with cleanup in `useEffect`. The new A/R shortcuts must be **guarded by a focus-scope check** to avoid firing when the user is typing in an input (e.g., the tag field in `ReviewBulkActionBar`).

**Guard pattern:**
```typescript
useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    // Guard: do not fire when focused on an input/textarea/select/contenteditable
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    if (event.key === 'a' || event.key === 'A') {
      event.preventDefault()
      // approve active item
    }
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      // reject active item
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      // advance to next item
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      // advance to previous item
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [activeItem, filteredQueue]) // dependencies: current active item state
```

**Note:** The keyboard handler needs access to `activeBatch`, `activeItem`, and the ordered list of review items. These come from component state already present in `ReviewQueueScreen`. The handler is re-registered when these change (deps array).

### Pattern 6: Review Queue Up/Down Navigation

**What:** "Next item" logic must traverse across batch groups: when the last item in `filteredQueue[n]` is active, ArrowDown moves to `filteredQueue[n+1].reviewItems[0]`. Build a flat list of `{batchId, itemId}` pairs for O(1) prev/next lookup.

**Example:**
```typescript
const flatItems = useMemo(
  () => filteredQueue.flatMap(batch =>
    batch.reviewItems.map(item => ({ batchId: batch.summary.batchId, itemId: item.id }))
  ),
  [filteredQueue]
)
const activeIndex = flatItems.findIndex(f => f.itemId === activeItem?.id)
// ArrowDown: Math.min(activeIndex + 1, flatItems.length - 1)
// ArrowUp: Math.max(activeIndex - 1, 0)
```

### Pattern 7: Mixed-State Bulk Approve (D-06)

**What:** `resolveReviewItems` currently takes a flat list of IDs and applies one action. The mixed-state requirement is: run the action on items that are not import-gated, skip those that are, return a count summary.

**Contract addition in `import.ts`:**
```typescript
export interface BulkResolveResult {
  approvedCount: number
  skippedCount: number
  skippedReason?: string
}
```

**Implementation note:** The review gating logic already lives in `src/main/import/import-coordinator.ts` (see `REVIEW_SEVERITY_BY_REASON`). The repository's `resolveReviewItems` must check each item's gating state — items with an unresolved blocking `duplicate-candidate` sibling in the same batch cannot be approved (the import gate). The simplest approach is to check each item independently and collect the result counts. Returns `BulkResolveResult` alongside or replacing the current `ImportBatchDetail` return for bulk operations.

### Pattern 8: Row-Level Parse Errors in `StagedImportFile`

**What:** Extend `StagedImportFile` with an optional `parseErrors` field. The parser populates this when it encounters rows it cannot parse rather than rejecting the whole file.

**Contract addition in `import.ts`:**
```typescript
export interface ParseRowError {
  rowNumber: number        // 1-based row number in the source file
  expected: string         // e.g. "date in DD/MM/YYYY format"
  found: string            // e.g. "'N/A'"
  suggestion: string       // e.g. "Remove this row or correct the date value"
}

// Add to StagedImportFile:
parseErrors?: ParseRowError[]
```

**`StagedFileRow` expansion pattern:** When `file.parseErrors?.length`, the "View reason" button triggers local expand/collapse state (`isExpanded: boolean`) instead of calling `onViewReason`. The expanded section renders inline below the file card — consistent with D-10.

### Pattern 9: In-Place File Retry (D-11)

**What:** A "Replace file" button in the expanded error section triggers a file picker scoped to one file. The selected file path is sent to a new IPC handler `import:replace-staged-file` which:
1. Removes the existing staged entry (by ID).
2. Stages the replacement file.
3. Returns the full updated `StageImportFilesResult`.

**IPC contract:**
```typescript
export interface ReplaceStagedFileInput {
  stagedFileId: string  // the rejected file to replace
  newFilePath?: string  // provided in mock mode; omit to trigger OS file picker
}
```

**Coordinator method:** `replaceStagedFile(input: ReplaceStagedFileInput)` — calls `removeStagedFile` then `stageFilePaths([newPath])` on the coordinator, preserving the rest of `stagedFiles` state.

**Renderer:** In `ImportWorkspace`, `onRetry(fileId)` calls `window.walnut.replaceStagedFile({ stagedFileId: fileId })` and calls `updateStage(result)` on success — same as the result of a normal stage operation.

### Pattern 10: Filter Presets — SQLite Table and IPC

**What:** New table `filter_presets` added to `bootstrap()` in `db.ts` and declared in `schema.ts`. CRUD IPC handlers registered in a new file `src/main/ipc/filter-presets.ts` and wired in `main.ts`.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS filter_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**`schema.ts` addition:**
```typescript
export const filterPresets = sqliteTable('filter_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  filtersJson: text('filters_json').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
```

**Contracts in `transactions.ts`:**
```typescript
export const FilterPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: TransactionLedgerQuerySchema,
  createdAt: z.string(),
  updatedAt: z.string()
})
export type FilterPreset = z.infer<typeof FilterPresetSchema>

export const SaveFilterPresetInputSchema = z.object({
  name: z.string().min(1).max(100),
  filters: TransactionLedgerQuerySchema
})
export type SaveFilterPresetInput = z.infer<typeof SaveFilterPresetInputSchema>

export const RenameFilterPresetInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100)
})
export type RenameFilterPresetInput = z.infer<typeof RenameFilterPresetInputSchema>

export const DeleteFilterPresetInputSchema = z.object({
  id: z.string()
})
export type DeleteFilterPresetInput = z.infer<typeof DeleteFilterPresetInputSchema>
```

**IPC handler registration pattern:**
```typescript
// src/main/ipc/filter-presets.ts
import { ipcMain } from 'electron'
import { getWalnutRepository } from '../persistence/db'

export const registerFilterPresetsIpc = () => {
  const repository = getWalnutRepository()
  ipcMain.handle('filter-presets:list', () => repository.listFilterPresets())
  ipcMain.handle('filter-presets:save', (_event, input) => repository.saveFilterPreset(input))
  ipcMain.handle('filter-presets:rename', (_event, input) => repository.renameFilterPreset(input))
  ipcMain.handle('filter-presets:delete', (_event, input) => repository.deleteFilterPreset(input))
}
```

**`WalnutApi` extensions required:**
```typescript
listFilterPresets: () => Promise<FilterPreset[]>
saveFilterPreset: (input: SaveFilterPresetInput) => Promise<FilterPreset[]>
renameFilterPreset: (input: RenameFilterPresetInput) => Promise<FilterPreset[]>
deleteFilterPreset: (input: DeleteFilterPresetInput) => Promise<FilterPreset[]>
```

### Pattern 11: Filter Drawer Preset UI

**What:** `TransactionFilterDrawer` receives `presets`, `onSavePreset`, `onRestorePreset`, `onRenamePreset`, `onDeletePreset` props. The preset strip renders at the **top** of the drawer (D-13); the "Save as preset" inline input renders at the **bottom** (D-14). Preset management (rename, delete) renders inline — a small edit icon per preset chip that reveals a rename input.

**Preset list structure:**
- Each preset renders as a clickable chip with a preset name.
- Clicking restores the filter state (calls `onRestorePreset(preset)`).
- A small rename/delete control per chip (pencil icon toggles inline rename input; trash icon calls delete with confirmation label).

**Save-as-preset interaction:**
```typescript
const [saveInputVisible, setSaveInputVisible] = useState(false)
const [saveName, setSaveName] = useState('')

// "Save as preset" button at bottom of drawer
// When clicked: setSaveInputVisible(true)
// When name confirmed (Enter or button): onSavePreset(saveName); setSaveInputVisible(false); setSaveName('')
```

### Anti-Patterns to Avoid

- **Cross-page bulk select:** Decision D-02 explicitly scopes select-all to the current page. Do not add a "select all N transactions" affordance.
- **Shift+click via complex library:** Shift+click range-select is straightforward with an anchor index and array slice — do not reach for a selection library.
- **Modal/drawer for bulk category assignment:** D-04 mandates inline dropdown in action bar. Do not render a modal overlay.
- **Keyboard shortcuts without input-field guard:** Without the `tagName === 'INPUT'` guard, pressing 'A' while typing in the tag field will trigger approve.
- **Filter presets in localStorage:** D-12 mandates SQLite. localStorage is not covered by backup/restore.
- **Re-staging all files on retry:** On in-place retry (D-11), only the one rejected file is replaced; the rest of the staged session must not be discarded.
- **Blocking bulk approve on mixed-state:** D-06 says to proceed and surface a count — never block or prompt first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Indeterminate checkbox state | Custom CSS-only trick | `ref.current.indeterminate = true` | The DOM property exists but is not a React prop; a one-liner via ref is reliable and correct |
| Date formatting in filter preset names | Custom formatter | Existing `Intl.DateTimeFormat` or `date-fns` (already in deps) | Both available; `date-fns` is already imported in `db.ts` |
| UUID for new filter preset IDs | Custom ID generator | `crypto.randomUUID()` | Already used throughout the codebase (e.g., `buildReviewItemsForSignals`) |
| SQLite array storage | Custom delimiter encoding | `JSON.stringify` / `JSON.parse` | Already the pattern for `tags_json`, `completed_steps_json`, etc. |

---

## Common Pitfalls

### Pitfall 1: Selection state not cleared on page change
**What goes wrong:** User selects 5 items on page 1, navigates to page 2, and the bulk action bar still shows "5 selected" but those IDs no longer appear in `pagedRows`.
**Why it happens:** `selectedIds` is driven by IDs, not by the visible row list, so page changes alone do not clear it.
**How to avoid:** Add `currentPage` and filter state to the `useEffect` dependency array that calls `setSelectedIds(new Set())`.
**Warning signs:** Bulk action dispatches IDs that are not in the current page.

### Pitfall 2: Shift+click fires on sort-column clicks
**What goes wrong:** User clicks a sort header column while holding shift and accidentally triggers range-select.
**Why it happens:** The shift key check is on click events in row checkboxes, but the table header buttons also receive click events.
**How to avoid:** The shift+click check must only be in the row checkbox `onChange` handler — not on any other table element.
**Warning signs:** Sort clicks with shift held change selection state.

### Pitfall 3: Keyboard shortcuts fire inside the tag input field
**What goes wrong:** User types "Approved" in the `ReviewBulkActionBar` tag input; pressing 'A' triggers the approve shortcut before the character is entered.
**Why it happens:** `keydown` event bubbles to `window` before React's `onChange` can handle it.
**How to avoid:** The `tagName === 'INPUT'` guard in the keydown handler must be checked before acting on the key.
**Warning signs:** Inputs that contain the letters A or R become unusable in the review queue.

### Pitfall 4: ArrowDown/ArrowUp scrolls the page
**What goes wrong:** Arrow key navigation moves the active review item but also scrolls the page, causing jarring UX.
**Why it happens:** Arrow keys have native scroll behavior on the document.
**How to avoid:** Call `event.preventDefault()` on ArrowUp/ArrowDown in the keydown handler. Only call it when the handler is going to act on the key (i.e., when the focus guard passes).
**Warning signs:** Page scroll occurs in sync with item navigation.

### Pitfall 5: `filter_presets` table missing from backup payload
**What goes wrong:** User exports a backup, restores it on another machine, and all filter presets are missing.
**Why it happens:** The `BackupPayload` interface in `app-state.ts` and the backup/restore logic in `db.ts` have an explicit list of tables to include. New tables must be added to this list.
**How to avoid:** After adding the `filter_presets` table to `bootstrap()`, also add it to the `BackupPayload.tables` interface and to the `exportBackup` / `importBackup` methods in `db.ts`.
**Warning signs:** Backup/restore tests pass but filter presets vanish after restore.

### Pitfall 6: `parseErrors` not surfaced through the staging result
**What goes wrong:** The parser sets `parseErrors` on a `ParsedImportFile` but the staging result returned to the renderer has the field stripped because `StagedImportFile` wasn't updated.
**Why it happens:** `StagedImportFile` is the DTO that travels over IPC. If `parseErrors` is only added to the internal `ParsedImportFile` type and not to `StagedImportFile`, the renderer never sees it.
**How to avoid:** Add `parseErrors?: ParseRowError[]` to `StagedImportFile` in `import.ts` (the shared contract). The coordinator maps `parsedFile.stagedFile` to the result — ensure the field is preserved.
**Warning signs:** `file.parseErrors` is always `undefined` in the renderer even after the parser emits errors.

### Pitfall 7: In-place retry loses session context
**What goes wrong:** After a successful retry, the staging list shows only the replacement file — all other staged files are gone.
**Why it happens:** If `import:replace-staged-file` calls `coordinator.stageFilePaths` starting from a fresh coordinator state, it loses the in-memory staged records.
**How to avoid:** The `ImportCoordinator` holds staged records in memory. The `replaceStagedFile` method must mutate `this.stagedRecords` — remove the old entry, add the new one, then return the updated staging result across all records. Do not create a new coordinator instance.
**Warning signs:** After retry, `stagedFiles` has length 1 instead of the expected multi-file session count.

---

## Code Examples

### Indeterminate checkbox via ref
```typescript
// Source: React docs + MDN HTMLInputElement.indeterminate
const headerCheckboxRef = useRef<HTMLInputElement>(null)
useEffect(() => {
  if (!headerCheckboxRef.current) return
  const allChecked = pagedRows.length > 0 && pagedRows.every(r => selectedIds.has(r.id))
  const anyChecked = pagedRows.some(r => selectedIds.has(r.id))
  headerCheckboxRef.current.indeterminate = anyChecked && !allChecked
}, [selectedIds, pagedRows])
```

### Shift+click range-select (pure React, no library)
```typescript
// Source: standard web pattern
const handleRowCheckboxChange = (
  rowId: string,
  checked: boolean,
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const shiftHeld = (event.nativeEvent as MouseEvent).shiftKey
  if (shiftHeld && shiftAnchorRef.current) {
    const anchorIdx = pagedRows.findIndex(r => r.id === shiftAnchorRef.current)
    const targetIdx = pagedRows.findIndex(r => r.id === rowId)
    if (anchorIdx !== -1 && targetIdx !== -1) {
      const [lo, hi] = anchorIdx < targetIdx
        ? [anchorIdx, targetIdx]
        : [targetIdx, anchorIdx]
      const rangeIds = pagedRows.slice(lo, hi + 1).map(r => r.id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        rangeIds.forEach(id => checked ? next.add(id) : next.delete(id))
        return next
      })
      return
    }
  }
  shiftAnchorRef.current = checked ? rowId : null
  setSelectedIds(prev => {
    const next = new Set(prev)
    checked ? next.add(rowId) : next.delete(rowId)
    return next
  })
}
```

### Review queue keyboard handler with input guard
```typescript
// Source: ImportWorkspace.tsx pattern extended with guard
useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) return

    if (event.key === 'a' || event.key === 'A') {
      event.preventDefault()
      if (activeBatch && activeItem) {
        void resolveItems(activeBatch.summary.batchId, [activeItem.id], 'accept-as-is')
      }
    }
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      if (activeBatch && activeItem) {
        void resolveItems(activeBatch.summary.batchId, [activeItem.id], 'discard')
      }
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const dir = event.key === 'ArrowDown' ? 1 : -1
      const idx = flatItems.findIndex(f => f.itemId === activeItem?.id)
      const nextIdx = Math.max(0, Math.min(flatItems.length - 1, idx + dir))
      const next = flatItems[nextIdx]
      if (next) {
        setActiveBatchId(next.batchId)
        setActiveReviewItemId(next.itemId)
      }
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [activeBatch, activeItem, flatItems])
```

### SQLite bulk update in a transaction
```typescript
// Source: existing pattern in db.ts (clearTransactionsAndAudit wraps in BEGIN/COMMIT)
bulkUpdateTransactions(input: BulkUpdateTransactionsInput): BulkUpdateTransactionsResult {
  const run = this.sqlite.transaction(() => {
    let count = 0
    for (const id of input.transactionIds) {
      const stmt = this.sqlite.prepare(
        'UPDATE imported_transactions SET category_id = ?, category_label = ?, tags_json = ? WHERE id = ?'
      )
      const result = stmt.run(
        input.categoryId ?? null,
        input.category ?? null,
        input.tags !== undefined ? JSON.stringify(input.tags) : null,
        id
      )
      count += result.changes
    }
    return count
  })
  return { updatedCount: run() }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `indeterminate` as a React prop (never worked) | `ref.current.indeterminate = true` via `useEffect` | Always — React never supported it as a prop | Must use ref pattern |
| `window.onkeydown = handler` | `window.addEventListener('keydown', handler)` with `useEffect` cleanup | React 16+ | Multiple handlers can coexist without clobbering |
| Storing filter presets in `localStorage` | SQLite via IPC (D-12) | Phase 9 decision | Covered by backup/restore; survives full reset |

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tools and runtimes are established from v1.0).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/unit` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORKFLOW-01 | Shift+click range-select logic (pure function) | unit | `npx vitest run tests/unit/transactions/multi-select.test.ts` | ❌ Wave 0 |
| WORKFLOW-02 | `bulkUpdateTransactions` — category update, count returned | unit | `npx vitest run tests/unit/transactions-repository.test.ts` | ✅ extend |
| WORKFLOW-03 | `bulkUpdateTransactions` — tag update | unit | `npx vitest run tests/unit/transactions-repository.test.ts` | ✅ extend |
| WORKFLOW-04 | Mixed-state bulk approve — gated items skipped, counts correct | unit | `npx vitest run tests/unit/import/review-mutations.test.ts` | ✅ extend |
| WORKFLOW-05 | `parseErrors` populated on parse failure | unit | `npx vitest run tests/unit/import/parser.test.ts` | ✅ extend |
| WORKFLOW-06 | `replaceStagedFile` — replaces one entry, preserves rest | unit | `npx vitest run tests/unit/import/persistence.test.ts` | ✅ extend |
| WORKFLOW-07 | Keyboard handler dispatches correct actions, guarded on input elements | unit | `npx vitest run tests/unit/import/review-keyboard.test.ts` | ❌ Wave 0 |
| WORKFLOW-08 | `saveFilterPreset` — persists and returns list | unit | `npx vitest run tests/unit/filter-presets-repository.test.ts` | ❌ Wave 0 |
| WORKFLOW-09 | `renameFilterPreset`, `deleteFilterPreset` | unit | `npx vitest run tests/unit/filter-presets-repository.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/transactions/multi-select.test.ts` — range-select pure logic (covers WORKFLOW-01)
- [ ] `tests/unit/import/review-keyboard.test.ts` — keyboard handler action dispatch and input guard (covers WORKFLOW-07)
- [ ] `tests/unit/filter-presets-repository.test.ts` — CRUD against `:memory:` db (covers WORKFLOW-08, WORKFLOW-09)

*(Existing test files for WORKFLOW-02 through WORKFLOW-06 need new test cases added, not new files.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/renderer/features/transactions/TransactionLedgerTable.tsx` — current table structure, no checkboxes
- Direct source read: `src/renderer/features/transactions/TransactionsScreen.tsx` — state shape, pagination, filter handling
- Direct source read: `src/renderer/features/import/ReviewQueueScreen.tsx` — existing `selectedReviewItemIds`, `resolveItems`, keyboard event pattern
- Direct source read: `src/renderer/features/import/ReviewBulkActionBar.tsx` — existing bulk action bar structure
- Direct source read: `src/renderer/features/import/StagedFileRow.tsx` — current rejected-file rendering pattern
- Direct source read: `src/renderer/features/transactions/TransactionFilterDrawer.tsx` — current filter drawer structure
- Direct source read: `src/main/persistence/db.ts` — `bootstrap()` pattern for new tables, `transaction()` pattern
- Direct source read: `src/shared/contracts/transactions.ts` — Zod schema and type pattern
- Direct source read: `src/shared/contracts/import.ts` — `StagedImportFile`, `ImportFileReason`
- Direct source read: `src/main/ipc/transactions.ts`, `src/main/ipc/import.ts` — IPC handler registration pattern
- Direct source read: `src/shared/contracts/app-state.ts` — `WalnutApi` interface shape
- Direct source read: `src/main/persistence/schema.ts` — Drizzle table declaration pattern
- MDN HTMLInputElement: `indeterminate` is a DOM property, not an HTML attribute — must be set via JavaScript

### Secondary (MEDIUM confidence)
- React docs: `useRef` for DOM property assignment (`indeterminate`) is the documented approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; everything verified from source
- Architecture: HIGH — all patterns traced directly from existing codebase
- Pitfalls: HIGH — each pitfall identified from direct code inspection of where the bug would occur
- Test infrastructure: HIGH — `vitest.config.ts` and existing test files verified directly

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack; no fast-moving dependencies)
