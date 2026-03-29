# Architecture Patterns

**Project:** Walnut Expense Analyser — v2.0 Release 2: Core
**Researched:** 2026-03-29
**Scope:** Integration architecture for Phases 9-11 into the existing v1.0 codebase

---

## Existing Architecture Baseline

The v1.0 codebase follows a strict three-layer Electron pattern:

```
Renderer (React/TypeScript)
    |  window.walnut.* calls via contextBridge
    v
Preload (preload/index.ts)
    |  ipcRenderer.invoke(channel, payload)
    v
Main Process (ipc/*.ts → persistence/db.ts)
    |  WalnutRepository methods
    v
SQLite (better-sqlite3, raw SQL, schema in db.ts)
```

All business logic lives in `WalnutRepository` in `src/main/persistence/db.ts` (the monolithic repository). IPC handlers in `src/main/ipc/*.ts` are thin wires — they call exactly one repository method per channel. The renderer never touches SQLite directly; it calls `window.walnut.*` which resolves to typed IPC channels exposed through the preload bridge. Shared contracts (Zod schemas + TypeScript types) live in `src/shared/contracts/` and are imported by both renderer and main.

### Current IPC Channel Map

```
app-state:*          → AppState, onboarding, security events, audit
security:*           → lock/unlock, recovery reset
import:*             → stage files, commit batch, review queue, history
transactions:*       → list, get-detail, update
categories:*         → list, create, update, merge, delete
rules:*              → list, create, update, toggle, delete, test, preview-apply, apply
dashboard:*          → preferences, snapshot, recurring detail
diagnostics:*        → generate bundle
walnut:getAppConfig / setAppConfig / changePin / exportBackup / importBackup / clearTransactions / fullReset
```

### Current SQLite Tables

```
app_settings               key-value config store
onboarding_progress        single-row onboarding state
security_state             PIN hash, lock state
security_events            login/lock audit trail
account_profiles           ICICI account profile
import_batches             batch-level import records
import_attempts            attempt-level import records with file outcomes
import_source_files        per-file import metadata
imported_transactions      the core transaction rows (all data)
categories                 category tree (system + user, hierarchical via parent_id)
categorization_rules       rules with condition_json + action_json blobs
review_items               review queue items with resolution tracking
audit_events               financial mutation ledger
```

### Current Rule Engine

The rule engine lives entirely inside `WalnutRepository.matchesRuleCondition()`. It evaluates:

- `descriptionContains`: array of substrings — ALL must match (AND logic, case-insensitive substring)
- `amountMinMinor` / `amountMaxMinor`: amount range bounds
- `transactionTypes`: array of allowed types (OR match)
- `tags`: array of required tags (AND match)
- `directions`: debit/credit filter (OR match)

Specificity scoring in `computeRuleSpecificity()` weights: keywords(×5) > tags(×4) > types(×3) > directions(×2) > amount bounds(×1 each). Rules are stored as JSON blobs in `condition_json` and `action_json` columns.

### Current Screen Navigation

`App.tsx` manages `WorkspaceScreen` state as a top-level enum. Navigation uses sidebar icon buttons (Ctrl+1 through Ctrl+8 shortcuts). Screens are: `home` | `imports` | `transactions` | `categories-rules` | `audit` | `settings`. The keyboard handler `handleGlobalShortcut()` is a module-level function in `App.tsx`.

---

## Component Boundaries for v2.0

### Phase 9: Workflow Polish

#### 9A — Review Queue: Batch-Level Bulk Actions

**Existing code touched:** `ReviewQueueScreen.tsx`, `ReviewBulkActionBar.tsx`

The bulk action bar already exists and handles: accept-as-is, discard, mark-duplicate, mark-not-duplicate, apply-tag. The `resolveItems()` function in `ReviewQueueScreen` already supports multi-item arrays. The gaps for "batch operations" are:

- No "select all in batch" toggle — `ReviewBatchGroup.tsx` needs a header checkbox to select all items in that batch's group
- No keyboard shortcut support within the review queue for navigating items (Tab/Arrow) or resolving the focused item
- The `ReviewBulkActionBar` renders even with zero selected — should be contextually visible

**What changes (MODIFY, not new):**
- `ReviewBatchGroup.tsx`: add select-all header checkbox; emit selection events upward
- `ReviewBulkActionBar.tsx`: add contextual visibility (hide or disable visually when nothing selected); add `Ctrl+A` select-all keyboard shortcut scoped to the active batch
- `ReviewQueueScreen.tsx`: wire batch-level select-all into `selectedReviewItemIds` state; consider keyboard navigation state (`focusedItemIndex`)

**No new IPC channels needed.** The existing `import:resolve-review-items` channel already accepts arrays.

#### 9B — Search Filter Persistence

**Existing code touched:** `TransactionsScreen.tsx`, `TransactionFilterDrawer.tsx`

Currently `filters` state in `TransactionsScreen` is ephemeral — it resets on component unmount (navigating away and back). The `TransactionLedgerQuery` type already contains all filterable fields.

**What changes (MODIFY, not new):**
- `TransactionsScreen.tsx`: persist `filters` and `submittedSearch` to `localStorage` using a fixed key (e.g., `walnut.transaction-filters`); restore on mount; provide a clear-and-reset action that also clears storage
- `TransactionFilterDrawer.tsx`: expose a "Clear filters" button that is visible when any filter is active

**No new IPC channels.** No new shared contracts. This is a pure renderer-side concern.

The existing `navigationQuery` + `navigationVersion` props on `TransactionsScreen` already allow the app shell to push a query override (used when navigating from dashboard). Persisted filters should be overridden by any incoming `navigationQuery` — the existing prop already does this correctly.

#### 9C — Keyboard Shortcut Enhancements

**Existing code touched:** `App.tsx` (`handleGlobalShortcut`), `ReviewQueueScreen.tsx`, `TransactionsScreen.tsx`

Current shortcuts: Ctrl+1-7 = navigation, Ctrl+8 = lock. All live in `handleGlobalShortcut()` in `App.tsx`.

**What changes:**
- `App.tsx`: Add `Ctrl+/` or `Ctrl+K` as a "jump to search / focus search field" shortcut; emit a focus-search event down to `TransactionsScreen` via a ref or state version bump
- `ReviewQueueScreen.tsx`: Add local keyboard handler for Arrow Up/Down to navigate between review items; `Enter` or `A` to accept focused item; `D` to discard — these are scoped to the review queue only and should not conflict with global shortcuts
- Consider extracting keyboard shortcut documentation to a help overlay (modal) — new minor component, no IPC

**Pattern:** Global shortcuts stay in `App.tsx`. Screen-local shortcuts are handled by `useEffect` + `addEventListener` within each screen component, guarded by screen-active checks.

---

### Phase 10: Rule System Expansion

#### 10A — Regex Evaluation in Rule Engine

**Existing code touched:** `WalnutRepository.matchesRuleCondition()` in `db.ts`, `CategorizationRuleConditionSchema` in `shared/contracts/categories.ts`, `RuleEditorPanel.tsx`

The current `descriptionContains` is a plain substring AND-chain. Adding regex means extending the condition model.

**Data model change — EXTEND `CategorizationRuleCondition`:**
```typescript
// In shared/contracts/categories.ts
// ADD optional field to CategorizationRuleConditionSchema:
descriptionPattern: z.string().optional()  // a single regex string, OR in addition to descriptionContains
```

The `condition_json` column in `categorization_rules` is already a JSON blob — no DDL migration is needed. Old rules simply have no `descriptionPattern` field and continue working.

**What changes (MODIFY):**
- `shared/contracts/categories.ts`: add `descriptionPattern` optional field to `CategorizationRuleConditionSchema`
- `db.ts` → `matchesRuleCondition()`: add a regex evaluation branch — if `descriptionPattern` is set, compile it (with try/catch for invalid regex) and test against the description; treat as an additional AND constraint alongside `descriptionContains`
- `db.ts` → `computeRuleSpecificity()`: give regex a specificity weight (suggested: same as 2 keywords = 10 points) since regex patterns are typically more targeted
- `db.ts` → `normalizeRuleCondition()`: normalize `descriptionPattern` (trim, fallback to undefined if empty)
- `RuleEditorPanel.tsx`: add an optional regex input field; show a live validation indicator (compiled regex test against a sample string)

**Regex safety:** Compile with `new RegExp(pattern, 'i')` inside a try/catch. Invalid patterns should fail closed (log and skip the condition, not crash the rule engine). The editor UI should validate on input and block saving invalid patterns.

**No new IPC channels.** `rules:create` and `rules:update` already accept the full `condition` object. The condition JSON blob absorbs the new field transparently.

#### 10B — Multi-Condition Rule Model

**Existing code touched:** `CategorizationRuleConditionSchema`, `matchesRuleCondition()`, `RuleEditorPanel.tsx`

Currently a rule has exactly one `condition` object. Multi-condition means: a rule fires when ANY of N conditions match (OR between conditions), while within each condition all fields remain AND.

**Data model change — EXTEND the condition schema:**
```typescript
// Option A (preferred): add conditions array as a sibling of condition
// In CategorizationRuleSummarySchema and CreateCategorizationRuleInputSchema:
conditions: z.array(CategorizationRuleConditionSchema).optional()
// When conditions is present, condition is ignored; when absent, fall back to condition (backward compat)
```

The `condition_json` blob in `categorization_rules` needs to accommodate this. The simplest approach: keep storing a single condition in `condition_json` for backward compat; store the full conditions array as a new `conditions_json` column.

**Schema change (ADD COLUMN):**
```sql
ALTER TABLE categorization_rules ADD COLUMN conditions_json TEXT;
```
Use `db.ts`'s existing `ensureColumn()` helper — this runs at startup and is safe. No data loss. Old rules have `conditions_json = NULL` and continue using `condition_json`.

**What changes:**
- `db.ts` → `ensureColumn()` call at init: add `conditions_json` to `categorization_rules`
- `db.ts` → `matchesRuleCondition()`: when `conditions_json` is present, evaluate as OR across conditions; when absent, evaluate single condition as before
- `db.ts` → `createRule()` / `updateRule()`: serialize `conditions_json` when input provides `conditions` array
- `shared/contracts/categories.ts`: extend `CreateCategorizationRuleInputSchema` and `UpdateCategorizationRuleInputSchema` to accept optional `conditions` array
- `RuleEditorPanel.tsx`: add "Add another condition" flow; show each condition as a collapsible block with its own AND-fields; "OR" label between blocks

#### 10C — Rule Conflict Detection

**Where it lives:** `WalnutRepository` method, surfaced via UI in `RuleEditorPanel.tsx` or `RulePane.tsx`

A conflict exists when two enabled rules match the same transactions and assign different categories or types. Detection can be done at rule-save time (compare new rule's match set against all other enabled rules' match sets).

**New repository method (EXTEND `db.ts`):**
```typescript
detectRuleConflicts(ruleId: string): RuleConflict[]
// Returns list of other rule IDs and overlapping transaction counts
```

**New shared contract type:**
```typescript
// In shared/contracts/categories.ts
RuleConflictSchema = z.object({
  conflictingRuleId: z.string(),
  conflictingRuleName: z.string(),
  overlapCount: z.number().int(),
  resolution: z.enum(['this-wins', 'other-wins', 'ambiguous'])
  // resolution: which rule has higher specificity_score
})
```

**New IPC channel:**
```
rules:detect-conflicts  → repository.detectRuleConflicts(ruleId)
```

**Preload addition:** `detectRuleConflicts: (ruleId) => ipcRenderer.invoke('rules:detect-conflicts', ruleId)`

**UI:** Show conflict warnings inline in `RuleEditorPanel.tsx` after save or test; also optionally as a badge count in `RulePane.tsx` rule list.

**Implementation note:** Conflict detection computes match sets in memory by re-running `findMatchingTransactions()` for all enabled rules. This is acceptable for typical rule counts (<50) and transaction volumes (<10K on local household data). If performance degrades, the detection can be deferred to a background idle task.

#### 10D — Category Merge/Rename with Re-Categorization

**Existing code — already partially implemented:**

`mergeCategory()` already exists in `WalnutRepository` and is exposed via `categories:merge`. It:
1. Updates all `imported_transactions` rows setting `category_id` and `category_label` to the target
2. Deletes the source category

`updateCategory()` handles rename but does NOT re-write `category_label` on existing transactions. This is a gap.

**What changes (MODIFY `db.ts`):**
- `updateCategory()`: when `name` changes, also update `category_label` on all transactions with that `category_id` to reflect the new path — query `getCategoryPathById(categoryId)` after updating and run `UPDATE imported_transactions SET category_label = ? WHERE category_id = ?`
- `mergeCategory()`: currently lacks an audit event — add `logAuditEvent()` call with `category.merged` event type recording source/target IDs and affected transaction count
- `updateCategory()`: add `logAuditEvent()` for `category.renamed` when name changes

**These are targeted modifications** to existing methods. No new IPC channels needed — `categories:update` and `categories:merge` already exist.

**Safety check for merge:** The existing implementation does not check whether rules reference the source category. Add a warning: before deleting the source, find any rules whose `action_json` contains `categoryId == sourceCategoryId` and either auto-update them to target or surface a warning to the user. Recommended: auto-update rules to point to target category silently (same transaction atomically).

---

### Phase 11: Budgeting Foundations

#### 11A — Budget Data Model

**New SQLite tables (ADD, no existing table modified):**

```sql
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL,        -- 'monthly' | 'custom'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_category_targets (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id),
  category_id TEXT NOT NULL,        -- FK to categories.id (soft reference, not enforced by SQLite)
  target_amount_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(budget_id, category_id)
);

CREATE TABLE IF NOT EXISTS budget_periods (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id),
  period_label TEXT NOT NULL,       -- e.g. '2026-03'
  date_from TEXT NOT NULL,          -- ISO date
  date_to TEXT NOT NULL,            -- ISO date
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_category_targets_budget
  ON budget_category_targets(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_budget_date
  ON budget_periods(budget_id, date_from DESC);
```

These are added via the same `CREATE TABLE IF NOT EXISTS` pattern already used in `db.ts`'s `initializeDatabase()`. No migration tooling is needed — the pattern is already established.

#### 11B — BudgetRepository (New Class or Extended WalnutRepository)

The current `WalnutRepository` in `db.ts` is already large (~3500 lines). For maintainability, budget operations should be implemented in a dedicated class **that shares the same `better-sqlite3` Database instance** — not as a separate connection.

**Recommended approach:** Extract budget logic into a `BudgetRepository` class in `src/main/persistence/budget-repository.ts` that accepts the shared `Database` instance in its constructor. The `WalnutRepository` keeps its singleton pattern but exposes a `getBudgetRepository()` factory, or the budget IPC module retrieves both from a shared module-level db instance.

Alternatively (simpler, lower refactor risk): extend `WalnutRepository` with budget methods and keep them grouped at the bottom of `db.ts`. This is consistent with the existing pattern and avoids cross-file coupling of the same SQLite connection. **Preferred for v2.0**: add to `WalnutRepository` in `db.ts` under a clearly marked section comment. Extract to separate file in v3.0 if the file becomes unmaintainable.

**New repository methods:**
```typescript
// Budget CRUD
createBudget(input: CreateBudgetInput): Budget
listBudgets(): Budget[]
updateBudget(input: UpdateBudgetInput): Budget
deleteBudget(input: { budgetId: string }): void

// Category targets
setBudgetCategoryTarget(input: SetBudgetCategoryTargetInput): void
removeBudgetCategoryTarget(input: { budgetId: string; categoryId: string }): void

// Budget periods
ensureBudgetPeriod(input: { budgetId: string; periodLabel: string; dateFrom: string; dateTo: string }): BudgetPeriod

// Variance calculation (read-only)
getBudgetVariance(input: GetBudgetVarianceInput): BudgetVarianceReport
```

#### 11C — Budget Shared Contracts

**New file:** `src/shared/contracts/budget.ts`

```typescript
// Core types
BudgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  periodType: z.enum(['monthly', 'custom']),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

BudgetCategoryTargetSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  categoryId: z.string(),
  categoryPath: z.array(z.string()),   // resolved at query time
  targetAmountMinor: z.number().int()
})

BudgetVarianceLineSchema = z.object({
  categoryId: z.string(),
  categoryPath: z.array(z.string()),
  targetAmountMinor: z.number().int(),
  actualAmountMinor: z.number().int(),
  varianceMinor: z.number().int(),         // actual - target (negative = over budget)
  variancePct: z.number()                  // variance / target * 100
})

BudgetVarianceReportSchema = z.object({
  budgetId: z.string(),
  periodLabel: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  lines: z.array(BudgetVarianceLineSchema),
  totalTargetMinor: z.number().int(),
  totalActualMinor: z.number().int(),
  totalVarianceMinor: z.number().int()
})

// Input schemas
CreateBudgetInputSchema = z.object({
  name: z.string().trim().min(1),
  periodType: z.enum(['monthly', 'custom'])
})

SetBudgetCategoryTargetInputSchema = z.object({
  budgetId: z.string(),
  categoryId: z.string(),
  targetAmountMinor: z.number().int().positive()
})

GetBudgetVarianceInputSchema = z.object({
  budgetId: z.string(),
  dateFrom: z.string(),
  dateTo: z.string()
})
```

#### 11D — Budget IPC Channels

**New file:** `src/main/ipc/budget.ts`

```typescript
export const registerBudgetIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('budget:list', () => repository.listBudgets())
  ipcMain.handle('budget:create', (_event, input: CreateBudgetInput) => repository.createBudget(input))
  ipcMain.handle('budget:update', (_event, input: UpdateBudgetInput) => repository.updateBudget(input))
  ipcMain.handle('budget:delete', (_event, input: { budgetId: string }) => repository.deleteBudget(input))
  ipcMain.handle('budget:set-category-target', (_event, input: SetBudgetCategoryTargetInput) => repository.setBudgetCategoryTarget(input))
  ipcMain.handle('budget:remove-category-target', (_event, input) => repository.removeBudgetCategoryTarget(input))
  ipcMain.handle('budget:get-variance', (_event, input: GetBudgetVarianceInput) => repository.getBudgetVariance(input))
}
```

Register `registerBudgetIpc()` in `src/main/main.ts`.

**Preload additions** in `src/preload/index.ts`:
```typescript
listBudgets: () => ipcRenderer.invoke('budget:list'),
createBudget: (input) => ipcRenderer.invoke('budget:create', input),
updateBudget: (input) => ipcRenderer.invoke('budget:update', input),
deleteBudget: (input) => ipcRenderer.invoke('budget:delete', input),
setBudgetCategoryTarget: (input) => ipcRenderer.invoke('budget:set-category-target', input),
removeBudgetCategoryTarget: (input) => ipcRenderer.invoke('budget:remove-category-target', input),
getBudgetVariance: (input) => ipcRenderer.invoke('budget:get-variance', input),
```

Add these to the `WalnutApi` interface in `src/shared/contracts/app-state.ts`.

#### 11E — Budget Variance Calculation

The variance query joins `imported_transactions` against `budget_category_targets` for a given budget and date range. It groups actual spending by category and subtracts from target.

**SQL pattern for actual spend:**
```sql
SELECT category_id, SUM(debit_amount_minor) as actual
FROM imported_transactions
WHERE transaction_date_sortable >= :dateFrom
  AND transaction_date_sortable <= :dateTo
  AND category_id IS NOT NULL
  AND direction = 'debit'
GROUP BY category_id
```

This is a read-only join computed entirely in the main process. No new tables needed. The calculation lives in `getBudgetVariance()` in `WalnutRepository`.

#### 11F — Budget UI Screen

**New feature folder:** `src/renderer/features/budget/`

**New components:**
- `BudgetScreen.tsx` — top-level screen, registered as `workspaceScreen: 'budget'` in `App.tsx`
- `BudgetList.tsx` — list of active budgets with a "New budget" action
- `BudgetEditorPanel.tsx` — create/edit budget name and period type
- `BudgetCategoryTargetsPanel.tsx` — set/edit per-category targets; uses existing `CategoryOption` type
- `BudgetVarianceReport.tsx` — variance table with color-coded over/under indicators

**App.tsx changes:**
- Add `'budget'` to the `WorkspaceScreen` union type
- Add sidebar nav button (Ctrl+9 shortcut — extends the keyboard handler)
- Add a `<BudgetScreen>` render case in the workspace router
- Update `handleGlobalShortcut()` to handle `case '9'`

---

## Data Flow Diagram

```
Renderer: BudgetScreen
    |  window.walnut.getBudgetVariance({ budgetId, dateFrom, dateTo })
    v
Preload: ipcRenderer.invoke('budget:get-variance', input)
    v
Main/IPC: registerBudgetIpc → budget:get-variance handler
    v
WalnutRepository.getBudgetVariance(input)
    |  JOIN budget_category_targets + imported_transactions
    v
SQLite: returns BudgetVarianceReport

Renderer: RuleEditorPanel (with regex)
    |  window.walnut.createRule({ name, condition: { descriptionPattern: /.../, ... }, action })
    v
Preload → Main/IPC: rules:create
    v
WalnutRepository.createRule(input)
    |  serializes condition_json with descriptionPattern field
    v
SQLite: INSERT INTO categorization_rules

WalnutRepository.matchesRuleCondition() — now evaluates regex if present
    |  try { new RegExp(condition.descriptionPattern, 'i').test(text) } catch { skip }
    v
Boolean match result
```

---

## New vs Modified Components Summary

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/shared/contracts/budget.ts` | Contract | Budget types and Zod schemas |
| `src/main/ipc/budget.ts` | IPC handler | Budget CRUD and variance IPC |
| `src/renderer/features/budget/BudgetScreen.tsx` | Screen | Budget workspace entry point |
| `src/renderer/features/budget/BudgetList.tsx` | Component | Budget list and create action |
| `src/renderer/features/budget/BudgetEditorPanel.tsx` | Component | Create/edit budget metadata |
| `src/renderer/features/budget/BudgetCategoryTargetsPanel.tsx` | Component | Category target management |
| `src/renderer/features/budget/BudgetVarianceReport.tsx` | Component | Variance table display |

### Modified Files

| File | Change Type | What Changes |
|------|-------------|-------------|
| `src/main/persistence/db.ts` | EXTEND | Budget methods; regex in matchesRuleCondition; conditions_json column; updateCategory re-labels transactions; merge audit event; rule auto-update on category merge |
| `src/main/main.ts` | EXTEND | Register `registerBudgetIpc()` |
| `src/preload/index.ts` | EXTEND | Budget IPC bindings in walnutApi object |
| `src/shared/contracts/app-state.ts` | EXTEND | Add budget methods to `WalnutApi` interface |
| `src/shared/contracts/categories.ts` | EXTEND | Add `descriptionPattern` to condition schema; add `conditions` array; add `RuleConflictSchema` |
| `src/main/ipc/categories.ts` | EXTEND | Add `rules:detect-conflicts` handler |
| `src/renderer/App.tsx` | MODIFY | Add `'budget'` to WorkspaceScreen; Ctrl+9 shortcut; BudgetScreen routing; sidebar button |
| `src/renderer/features/import/ReviewBatchGroup.tsx` | MODIFY | Select-all header checkbox |
| `src/renderer/features/import/ReviewBulkActionBar.tsx` | MODIFY | Contextual visibility; keyboard hints |
| `src/renderer/features/import/ReviewQueueScreen.tsx` | MODIFY | Batch-level select-all wiring; local keyboard nav |
| `src/renderer/features/transactions/TransactionsScreen.tsx` | MODIFY | Filter persistence via localStorage |
| `src/renderer/features/transactions/TransactionFilterDrawer.tsx` | MODIFY | "Clear filters" button when active |
| `src/renderer/features/categories-rules/RuleEditorPanel.tsx` | MODIFY | Regex input field; multi-condition UI; conflict warning display |
| `src/renderer/features/categories-rules/RulePane.tsx` | MODIFY | Conflict badge (optional) |

### No Changes Required

| File | Why Untouched |
|------|---------------|
| `src/main/ipc/transactions.ts` | Transactions IPC is complete for v2.0 |
| `src/main/ipc/import.ts` | Import pipeline unchanged |
| `src/main/ipc/security.ts` | Security unchanged |
| `src/main/ipc/backup.ts` | Backup unchanged — budget tables automatically included in the existing full-database backup |
| `src/main/persistence/schema.ts` | Drizzle schema file is not used for runtime DDL (raw SQL in db.ts is canonical); budget tables added to db.ts only |
| `src/renderer/features/dashboard/` | Dashboard unchanged |
| `src/renderer/features/audit/` | Audit screen reads `audit_events`; new audit events from category merge/rename will appear automatically |

---

## Recommended Build Order

Feature dependencies determine order:

### Phase 9: Workflow Polish (no dependencies on 10 or 11)

```
9.1  Filter persistence (TransactionsScreen + TransactionFilterDrawer)
       — pure renderer, no main process changes, fast win, boosts all subsequent testing
9.2  Review queue batch select-all (ReviewBatchGroup + ReviewQueueScreen)
       — no new IPC, extends existing bulk action path already tested
9.3  Keyboard shortcut enhancements (App.tsx + screen-local handlers)
       — low risk, builds on established pattern
```

### Phase 10: Rule System Expansion (no dependency on 11)

```
10.1  Category rename re-labeling (db.ts → updateCategory)
        — small, safe, fixes a correctness gap; audit event for rename
10.2  Category merge rule auto-update + audit event (db.ts → mergeCategory)
        — extends existing merge path; audit event makes it traceable
10.3  Regex condition support (db.ts → matchesRuleCondition; shared/contracts/categories.ts; RuleEditorPanel)
        — extends condition evaluation; backward compat guaranteed by optional field
10.4  Multi-condition (OR) rule model (db.ts → conditions_json column + matchesRuleCondition; contracts; RuleEditorPanel)
        — depends on 10.3 being stable (shares RuleEditorPanel work)
10.5  Rule conflict detection (db.ts new method; IPC channel; UI warning in RuleEditorPanel)
        — depends on 10.3 and 10.4 being done (conflict detection must understand all condition variants)
```

### Phase 11: Budgeting Foundations (depends on Phase 10 being stable — categories must be reliable)

```
11.1  Budget data model (DDL in db.ts; shared/contracts/budget.ts)
        — data foundation; no UI yet
11.2  BudgetRepository methods in WalnutRepository (CRUD + period management)
        — no UI yet; can write unit tests immediately
11.3  Budget IPC + preload + WalnutApi interface
        — wire the new methods to channels
11.4  Variance calculation (getBudgetVariance in WalnutRepository)
        — depends on 11.2 and 11.3; can be validated with direct IPC calls
11.5  BudgetScreen + BudgetList + BudgetEditorPanel + App.tsx wiring
        — screen shell and navigation
11.6  BudgetCategoryTargetsPanel + BudgetVarianceReport
        — the visible value; depends on 11.5
```

**Rationale for this order:**
- Phase 9 is fully independent of 10 and 11; it improves the surfaces used for testing the other two phases
- Phase 10 category safety work (10.1, 10.2) should come before budget foundations because budget targets reference category IDs — stable categories reduce re-work risk
- Budget schema is additive-only (new tables), so it can start as soon as Phase 10 category work is stable
- The backup mechanism in `backup-service.ts` reads all tables via `SELECT * FROM`-style queries — new tables will be included automatically in exports once they exist

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Regex ReDoS Risk

**What:** Storing user-supplied regex patterns in rule conditions without sanitization.
**Why bad:** A maliciously crafted or accidentally complex pattern like `(a+)+$` can hang the main process (synchronous SQLite + Node.js).
**Instead:** Validate regex at input time in the editor (compile + test against a fixed short string with a 50ms timeout via `AbortSignal`); store only patterns that compile cleanly; in `matchesRuleCondition()` wrap regex execution in try/catch, catching errors silently.

### Anti-Pattern 2: Separate SQLite Connection for Budget

**What:** Opening a second `better-sqlite3` Database connection for budget tables.
**Why bad:** better-sqlite3 uses synchronous I/O; two connections to the same file without WAL coordination can deadlock or corrupt on concurrent writes.
**Instead:** All budget operations share the same singleton Database instance already used by `WalnutRepository`. Add budget methods to the same repository class.

### Anti-Pattern 3: Running Conflict Detection on Every Keystroke

**What:** Calling `detectRuleConflicts()` via IPC on every field change in `RuleEditorPanel`.
**Why bad:** Conflict detection scans all transactions for every enabled rule — expensive on larger datasets.
**Instead:** Debounce the conflict check (500ms after last input change) and only trigger it when the user explicitly clicks "Test rule" or saves. Show a "checking for conflicts..." indicator.

### Anti-Pattern 4: Budget Variance at Transaction Granularity Without Date Index

**What:** Running variance queries without `transaction_date_sortable` index coverage.
**Why bad:** Full table scans on `imported_transactions` on every budget view will be slow as transaction history grows.
**Instead:** Ensure `idx_imported_transactions_date` index exists. The existing schema has no explicit index on `transaction_date_sortable` — add it:
```sql
CREATE INDEX IF NOT EXISTS idx_imported_transactions_date
  ON imported_transactions(transaction_date_sortable);
```
Add this to the `initializeDatabase()` DDL block in `db.ts`.

### Anti-Pattern 5: Persisting Filter State Across App Restarts Without Version Guard

**What:** Loading raw `TransactionLedgerQuery` from localStorage without validating its shape.
**Why bad:** If the query schema changes between v2.0 and v3.0, stale localStorage will cause runtime errors.
**Instead:** Store a schema version key alongside the filters (e.g., `walnut.transaction-filters.v1`). On load, validate with Zod against `TransactionLedgerQuerySchema`; if validation fails, discard and reset.

---

## Scalability Considerations

These features target a single-household dataset. Expected data range: 500-5000 transactions, <50 rules, <20 categories, <5 budgets.

| Concern | At current scale (<5K txns) | If grows to 50K txns |
|---------|-----------------------------|--------------------|
| Rule conflict detection | In-memory full scan, <50ms | May need early exit / index-backed set intersection |
| Budget variance query | Single GROUP BY, <10ms | Still fast with date index |
| Regex matching per transaction | O(n × rules), <100ms | O(n × rules) but regex can be slow — cache compiled RegExp objects per rule evaluation pass |
| Filter persistence | localStorage, trivial | No concern — only storing filter state, not data |

Compiled RegExp caching: in `matchesRuleCondition()`, if called in a batch context (e.g., `findMatchingTransactions()`), the regex is re-compiled for every transaction. Add a module-level WeakMap or plain Map cache keyed on the pattern string, populated once per evaluation pass.

---

## Sources

- Codebase analysis: `src/main/persistence/db.ts` (WalnutRepository, full schema, rule engine)
- Codebase analysis: `src/main/ipc/categories.ts`, `transactions.ts`, `settings.ts`, `app-state.ts`
- Codebase analysis: `src/shared/contracts/categories.ts`, `transactions.ts`, `app-state.ts`
- Codebase analysis: `src/renderer/App.tsx`, `ReviewQueueScreen.tsx`, `ReviewBulkActionBar.tsx`, `TransactionsScreen.tsx`, `RuleEditorPanel.tsx`
- Codebase analysis: `src/preload/index.ts` (full WalnutApi surface)
- Project context: `.planning/PROJECT.md`, `.planning/ROADMAP.md`
- Confidence: HIGH — all claims derive from direct codebase inspection, not training data assumptions
