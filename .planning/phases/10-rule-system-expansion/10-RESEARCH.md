# Phase 10: Rule System Expansion - Research

**Researched:** 2026-03-30
**Domain:** Rule engine evolution, SQLite schema migration, HTML5 drag-and-drop, ReDoS detection, JSON export/import, category lifecycle operations
**Confidence:** HIGH (codebase-verified; no external library dependencies added)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Multi-Condition AND Model**
- D-01: Replace `descriptionContains: string[]` with `descriptionTerms: Array<{ op: 'contains' | 'starts-with' | 'ends-with' | 'regex', value: string }>` — AND semantics across all entries
- D-02: Amount range fields (`amountMinMinor`, `amountMaxMinor`) remain as separate fields alongside `descriptionTerms` — no unification
- D-03: Regex exposed as an operator option (`op: 'regex'`) in the operator dropdown per condition row — when selected, value field has live match preview and red warning badge if ReDoS risk detected
- D-04: Rule editor renders dynamic condition row list with operator dropdown + value input per row, plus [+] button; existing rules with `descriptionContains[]` must be migrated to `descriptionTerms[]` with `op: 'contains'` at startup

**Rule Priority**
- D-05: Manual drag order replaces specificity scoring as execution model; first match wins
- D-06: `specificityScore` retained as informational badge (high/medium/low) — does NOT affect execution order
- D-07: System rules always evaluate AFTER all user rules regardless of drag position
- D-08: `sortOrder` integer column added to `categorization_rules` (already exists via `ensureColumn` — schema is current)

**Auto-Apply at Import Commit**
- D-09: All enabled user rules fire automatically against newly imported transactions at commit time
- D-10: Import commit success screen shows inline "N transactions auto-categorized by your rules" summary; tapping expands to show rule name + count per rule
- D-11: If no rules match any imported transaction, the summary line is omitted
- D-12: Each auto-categorization emits an audit event (rule name + before/after category), consistent with manual transaction edit audit events

**Rule Export / Import**
- D-13: Export writes JSON array of all user rules to native save dialog; system rules excluded
- D-14: Export format: rule name, conditions, action, sortOrder — no internal IDs or transaction counts
- D-15: At import time, category references resolved by name (not ID); unresolvable category warns user and imports rule without category assignment
- D-16: Conflict detection: name match triggers side-by-side diff; user chooses keep existing / replace with incoming / skip

**Category Correctness**
- D-17: Category rename propagates atomically to all rule targets (`action.categoryId` on matching rules) in a single SQLite transaction
- D-18: Category merge shows affected transaction count + sample list before confirmation; all transactions and rule targets reassigned atomically
- D-19: `isArchived` boolean column added to `categories` (distinct from `isActive`); archived categories disappear from active pickers but remain queryable for historical display

### Claude's Discretion
- Exact visual treatment of the specificity badge (icon, color, tooltip wording)
- Drag-reorder implementation details (handle position, animation, auto-scroll)
- Exact wording of the auto-categorization summary expansion
- ReDoS detection heuristic (timeout-based or static analysis — either acceptable)
- Empty-state copy for the rule export/import diff screen when there are no conflicts

### Deferred Ideas (OUT OF SCOPE)
- OR / nested boolean rule logic (RULES-F01)
- Rule change history and revert (RULES-F02)
- AI/ML rule suggestions (RULES-F03)
- Per-member category customization (Phase 13)
- Budget-aware rules (post-Phase 11)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RULES-01 | User can write rule conditions using contains, starts-with, and ends-with string operators | D-01 schema change + matchesRuleCondition rewrite |
| RULES-02 | User can write rule conditions using amount range operators (greater than, less than, between) | Existing amountMinMinor/amountMaxMinor fields; need UI exposure |
| RULES-03 | User can add multiple AND conditions to a single rule (e.g. "Description contains Uber AND amount > 200") | D-01 descriptionTerms array with AND semantics |
| RULES-04 | User can reorder rules by drag-and-drop to control first-match-wins priority | D-05/D-08 sortOrder + HTML5 drag events |
| RULES-05 | User can rename a category and new name propagates atomically to all associated transactions and rule targets | D-17 single SQLite transaction in updateCategory |
| RULES-06 | User can merge one category into another; all affected transactions and rule targets reassigned atomically with preview count | D-18 extend mergeCategory + new preview IPC |
| RULES-07 | User can archive a category so it disappears from active pickers but historical transactions remain intact | D-19 isArchived column + filter in listCategories/CategoryOptionSchema |
| RULES-08 | User can write a regex rule condition via opt-in advanced toggle, with live preview of matched transactions and ReDoS validation on input | D-03 regex op + ReDoS detection in renderer |
| RULES-09 | User can export all categorization rules to a JSON file | D-13/D-14 Electron dialog + JSON serialization |
| RULES-10 | User can import rules from a JSON file, with conflict detection showing side-by-side diff when incoming rule overlaps an existing rule | D-15/D-16 import flow + conflict resolution UI |
| RULES-11 | User-authored categorization rules are automatically applied to transactions at import commit time | D-09/D-10/D-11/D-12 commitBatch extension |
</phase_requirements>

---

## Summary

Phase 10 is a pure in-codebase evolution — no new npm packages are required. The phase touches three distinct layers simultaneously: the persistence layer (schema migration, condition evaluation, category atomics), the IPC contract layer (new handlers, extended CommitImportBatchResult), and the renderer layer (dynamic rule editor, drag-reorder list, diff view for import conflicts, archive awareness in all category pickers).

The riskiest operation is the schema migration for `descriptionTerms`: existing persisted `condition_json` blobs contain `descriptionContains: string[]` and must be rewritten to `descriptionTerms: Array<{ op: 'contains', value: string }>` at startup. The `parseRuleCondition` method in `db.ts` is the chokepoint — it must handle both old and new shapes during the transition window.

The drag-reorder feature is a common UX pattern achievable with native HTML5 drag events. Given the project bans UI component libraries, a small stateful hook (`useDragReorder`) that tracks `dragIndex`/`dropIndex` and calls a `rules:reorder` IPC handler is the correct approach. No `react-beautiful-dnd` or `dnd-kit` is needed.

**Primary recommendation:** Implement in five waves: (1) schema + contract foundation, (2) rule engine evolution (descriptionTerms + matchesRuleCondition), (3) category correctness atomics, (4) drag-reorder + auto-apply at import, (5) export/import with conflict resolution.

---

## Standard Stack

### Core (already installed — no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 11.8.1 | Schema migration, atomic transactions, rule evaluation | Already used for all persistence; `transaction()` wraps atomics |
| zod | 4.3.6 | Schema validation for new contract types | Already used for all IPC contracts |
| react | 19.1.1 | Dynamic condition row list, drag handle state | Already used throughout renderer |
| electron (ipcMain/dialog) | 30.5.1 | Native save/open dialogs for rule export/import | Already used for all IPC and file ops |

### No New Dependencies Required

All Phase 10 capabilities are achievable with the existing stack:
- **Drag-and-drop:** Native HTML5 `draggable` attribute + `onDragStart` / `onDragOver` / `onDrop` events. No library needed.
- **ReDoS detection:** Pure TypeScript regex static analysis (see Pitfall section). No library needed.
- **JSON export/import:** `JSON.stringify` / `JSON.parse` + `electron.dialog.showSaveDialog` / `showOpenDialog`. Already used for other file operations.
- **Side-by-side diff:** Simple two-column layout rendered from parsed JSON. No diff library needed.

**Installation:** None required.

**Version verification:** All packages verified via `package.json` on 2026-03-30.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
src/
├── main/
│   ├── persistence/
│   │   └── db.ts                        # Extend: descriptionTerms migration, matchesRuleCondition rewrite,
│   │                                    #         updateCategory rename atomic, mergeCategory rule target,
│   │                                    #         isArchived support, applyAllRulesToTransactions()
│   ├── ipc/
│   │   ├── categories.ts                # Add: rules:reorder, rules:export, rules:import,
│   │   │                                #      categories:archive, categories:merge-preview
│   │   └── import.ts                   # Extend: CommitImportBatchResult with ruleCategorizations
│   └── import/
│       └── import-coordinator.ts       # Extend: commitBatch() adds auto-rule-apply step
├── shared/
│   └── contracts/
│       ├── categories.ts               # Replace CategorizationRuleConditionSchema (descriptionTerms),
│       │                               #   add ReorderRulesInputSchema, RuleExportPayloadSchema,
│       │                               #   RuleImportResultSchema, CategoryArchiveInputSchema,
│       │                               #   MergeCategoryPreviewSchema
│       └── import.ts                   # Add ruleCategorizations to CommitImportBatchResult
└── renderer/
    └── features/
        └── categories-rules/
            ├── RuleEditorPanel.tsx     # Replace: dynamic condition row list (descriptionTerms)
            ├── RulePane.tsx            # Add: drag handles, drag-reorder interaction, sortOrder
            ├── RuleImportDiffView.tsx  # New: side-by-side diff for import conflicts
            └── RuleExportImportBar.tsx # New: export/import trigger buttons
```

### Pattern 1: descriptionTerms Schema Migration at Startup

**What:** The `bootstrap()` function runs raw SQL migrations via `ensureColumn()`. Extending it with a one-time data migration that rewrites `condition_json` blobs.

**When to use:** Any time persisted JSON needs to be reformatted during startup.

**How it works in this codebase:**
```typescript
// In bootstrap(), after ensureColumn calls:
this.ensureColumn('categories', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
// Then run the data migration once:
this.migrateDescriptionContainsToDescriptionTerms()

private migrateDescriptionContainsToDescriptionTerms() {
  const rows = this.sqlite
    .prepare('SELECT id, condition_json FROM categorization_rules')
    .all() as Array<{ id: string; condition_json: string }>

  for (const row of rows) {
    const condition = JSON.parse(row.condition_json) as Record<string, unknown>
    if (!Array.isArray(condition.descriptionTerms) && Array.isArray(condition.descriptionContains)) {
      const descriptionTerms = (condition.descriptionContains as string[]).map((value) => ({
        op: 'contains' as const,
        value
      }))
      const migrated = { ...condition, descriptionTerms, descriptionContains: undefined }
      delete migrated.descriptionContains
      this.sqlite
        .prepare('UPDATE categorization_rules SET condition_json = ? WHERE id = ?')
        .run(JSON.stringify(migrated), row.id)
    }
  }
}
```

**Key safety principle:** Check for `descriptionContains` presence before migrating — the migration is idempotent if run multiple times.

### Pattern 2: matchesRuleCondition Rewrite for descriptionTerms

**What:** The private `matchesRuleCondition` method in `db.ts` currently tests `condition.descriptionContains`. After migration it must test `condition.descriptionTerms` with per-entry `op` dispatch.

**Example:**
```typescript
// Source: direct codebase analysis
private matchesRuleCondition(row: TransactionLedgerRow, condition: CategorizationRuleCondition) {
  const text = row.description.toLowerCase()

  // descriptionTerms: AND across all entries
  if (condition.descriptionTerms.length) {
    const allMatch = condition.descriptionTerms.every((term) => {
      const v = term.value.toLowerCase()
      switch (term.op) {
        case 'contains':    return text.includes(v)
        case 'starts-with': return text.startsWith(v)
        case 'ends-with':   return text.endsWith(v)
        case 'regex': {
          try { return new RegExp(term.value, 'i').test(row.description) }
          catch { return false }
        }
      }
    })
    if (!allMatch) return false
  }
  // ... rest of checks unchanged
}
```

**Important:** `CategorizationRuleConditionSchema` in `categories.ts` must be updated first so the TypeScript type reflects `descriptionTerms`; `descriptionContains` is removed from the schema.

### Pattern 3: Category Rename → Rule Target Propagation (Single Transaction)

**What:** `updateCategory` in `db.ts` currently only updates the `categories` table. The rename must also update `action_json` of any rule whose `action.categoryId` matches the renamed category.

**How:**
```typescript
// Source: existing mergeCategory() pattern (already uses transaction())
updateCategory(input: UpdateCategoryInput): CategoryTreeNode[] {
  // ... existing guards ...
  const renameTransaction = this.sqlite.transaction(() => {
    this.sqlite.prepare(
      'UPDATE categories SET name = ?, parent_id = ?, is_active = ?, updated_at = ? WHERE id = ?'
    ).run(/* ... */)

    if (input.name) {
      // Propagate to rule action.categoryId references (stored in action_json)
      // Note: categoryId is stored as an ID string, not a name — no action_json update needed
      // ONLY category_label in imported_transactions needs updating (denormalized column)
      this.sqlite.prepare(
        'UPDATE imported_transactions SET category_label = ? WHERE category_id = ?'
      ).run(input.name.trim(), input.categoryId)
    }
  })
  renameTransaction()
  return this.listCategories()
}
```

**Critical insight from codebase inspection:** Rules store `action.categoryId` as an **ID** (e.g., `"cat:food-dining"`), not a name. So rule action JSON does NOT need updating when a category is renamed — the ID stays stable. What changes is the `category_label` denormalized column on `imported_transactions`. The D-17 "propagates atomically to all rule targets" refers specifically to ensuring the UI reflects the renamed category correctly everywhere — the actual rule data uses IDs already.

### Pattern 4: Native HTML5 Drag-and-Drop Reorder

**What:** The `RulePane.tsx` rule list uses `article` elements. Adding `draggable` attribute and `onDragStart`/`onDragOver`/`onDrop` handlers achieves reorder without libraries.

**Pattern (no library needed):**
```typescript
// Source: HTML5 Drag and Drop API, verified against MDN
const [dragIndex, setDragIndex] = useState<number | null>(null)

// On each rule article:
draggable
onDragStart={() => setDragIndex(index)}
onDragOver={(e) => { e.preventDefault() }} // required to allow drop
onDrop={() => {
  if (dragIndex === null || dragIndex === index) return
  // Call IPC to persist new order
  const reordered = [...rules]
  const [moved] = reordered.splice(dragIndex, 1)
  reordered.splice(index, 0, moved)
  onReorder(reordered.map((r) => r.id))
  setDragIndex(null)
}}
```

**Constraint from D-07:** System rules must always sort after user rules. Prevent dropping onto or past system rules by blocking `onDrop` when the drop target is a system rule.

### Pattern 5: IPC reorder handler

**What:** New `rules:reorder` IPC handler accepts an ordered array of rule IDs and updates `sort_order` column in a single transaction.

```typescript
// Follows existing IPC mutation pattern
ipcMain.handle('rules:reorder', (_event, ruleIds: string[]) =>
  repository.reorderRules(ruleIds)
)

// In db.ts
reorderRules(ruleIds: string[]): CategorizationRuleSummary[] {
  const updateOrder = this.sqlite.transaction(() => {
    ruleIds.forEach((id, index) => {
      this.sqlite.prepare(
        'UPDATE categorization_rules SET sort_order = ?, updated_at = ? WHERE id = ? AND is_system = 0'
      ).run(index + 1, nowIso(), id)
    })
  })
  updateOrder()
  return this.listRules()
}
```

**listRules ORDER BY change:** Change from `specificity_score DESC, sort_order ASC` to `is_system ASC, sort_order ASC` so user-defined order is authoritative and system rules trail.

### Pattern 6: Auto-Apply at Import Commit

**What:** `commitBatch()` in `import-coordinator.ts` currently calls `repository.persistImportAttempt()`. After persistence, it must call `repository.applyAllRulesToTransactions(batchId)` and return the summary as part of `CommitImportBatchResult`.

**Architecture:**
- `applyAllRulesToTransactions(batchId)` fetches all enabled, non-system rules ordered by `sort_order ASC`; for each transaction in the batch that has no category yet, evaluates rules in order (first match wins); applies the matching rule's action
- Returns `Array<{ ruleName: string; count: number }>` — only entries with `count > 0`
- This list is added to `CommitImportBatchResult.ruleCategorizations?: Array<{ ruleName: string; count: number }>`
- `ImportSummary.tsx` renders the summary if `ruleCategorizations?.length > 0`

**D-12 audit events:** `applyRuleActionToTransaction` in `db.ts` already emits audit events for manual rule application. The auto-apply path must use the same method.

### Pattern 7: ReDoS Detection Heuristic

**What:** When the user selects `op: 'regex'` and types a pattern, the renderer checks for ReDoS risk before calling the live preview IPC.

**Recommended approach — static analysis (renderer-side, no library):**

A catastrophic regex pattern typically contains one of these structural features:
1. Nested quantifiers: `(a+)+`, `(a*)*`, `(a+a*)+`
2. Alternation with overlap + quantifier: `(a|aa)+`
3. Polynomial overlap: `(a+b+)+`

A reliable lightweight heuristic (used by security linters like `safe-regex`):
```typescript
// Source: safe-regex project pattern, verified HIGH risk patterns
const REDOS_RISK_PATTERNS = [
  /\([^)]*[+*][^)]*\)[+*]/, // (x+)+ nested quantifiers
  /\([^)]*\|[^)]*\)[+*]/,   // (a|b)+ alternation + quantifier
  /\.[+*][+*]/,              // .++ repetition
]

export const detectReDoSRisk = (pattern: string): boolean => {
  return REDOS_RISK_PATTERNS.some((check) => check.test(pattern))
}
```

The alternative (timeout-based) would be: compile the regex and test it against a 10,000-character adversarial string with a 100ms timeout using `performance.now()`. This is more accurate but requires async execution. For Phase 10, static pattern analysis is simpler and sufficient — it catches the classic catastrophic cases.

**Both approaches are acceptable per D-03.** Static analysis is recommended as the primary heuristic; the warning is advisory, not blocking (user can still save the rule).

### Pattern 8: Rule Export / Import JSON Contract

**What:** The exported JSON is an array of plain objects. No internal IDs. Categories referenced by name.

**Export shape (D-14):**
```typescript
interface RuleExportEntry {
  name: string
  sortOrder: number
  conditions: Array<{ op: 'contains' | 'starts-with' | 'ends-with' | 'regex'; value: string }>
  amountMinMinor?: number
  amountMaxMinor?: number
  transactionTypes: string[]
  tags: string[]
  directions: string[]
  action: {
    categoryName?: string  // resolved from categoryId at export time
    type?: string
    appendTags: string[]
  }
}
```

**Import flow:**
1. `electron.dialog.showOpenDialog({ filters: [{ name: 'Walnut Rules', extensions: ['json'] }] })`
2. Parse JSON — validate structure (basic check: array of objects with `name` field)
3. For each entry, attempt `categoryName → categoryId` lookup; null if unresolved
4. Check each name against existing rule names → build conflict list
5. Present diff view in renderer showing conflicts; user resolves each
6. For non-conflicting rules, import directly; for resolved conflicts, apply user choice

### Anti-Patterns to Avoid

- **Storing category names in rule action_json:** Rules already store `categoryId` (an opaque ID string). The rename atomic is simpler than feared — IDs are stable; only the `categories` table name and `category_label` denormalized column need updating.
- **Rebuilding the rule engine as a separate module:** Keep all rule matching in `db.ts` (existing pattern). The rule engine is a few private methods — extraction is not warranted.
- **Using specificity score for execution order after Phase 10:** `listRules()` ORDER BY must change to `is_system ASC, sort_order ASC` — the old `specificity_score DESC` order is replaced. The score is retained only for the informational badge.
- **Blocking rule save on ReDoS detection:** ReDoS detection is a warning badge only (per D-03). Do not prevent save.
- **Importing system rules from JSON:** D-13 says system rules are excluded from export; the import flow must ignore any entry that matches a system rule ID or name.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table updates | Manual sequence of SQL statements | `this.sqlite.transaction(() => { ... })` | better-sqlite3's `transaction()` creates an implicit SQLite transaction with automatic rollback on throw |
| Drag-and-drop reorder | State-heavy DnD library (dnd-kit, react-beautiful-dnd) | Native HTML5 `draggable` + `onDragStart`/`onDragOver`/`onDrop` | 3 event handlers + 1 state variable; zero bundle cost; good enough for a vertical rule list |
| File save/open dialogs | Custom HTML file input + IPC workaround | `electron.dialog.showSaveDialog` / `showOpenDialog` + `fs.writeFileSync` | Already used for other file operations in the Electron main process |
| JSON serialization for export | Custom binary format or encrypted blob | `JSON.stringify(rules, null, 2)` | Plain JSON is the right format for portable rule files; user-readable |
| Schema migration orchestration | Drizzle migrations or a migration framework | `ensureColumn()` + startup data migration in `bootstrap()` | This is the established project pattern (Phase 9 precedent: `filter_presets` table) |
| Category ID resolution at import | Fuzzy matching or ML-based lookup | Exact name match (`SELECT id FROM categories WHERE name = ? COLLATE NOCASE`) | D-15 specifies name-based resolution; warn on miss |

**Key insight:** The project's architecture deliberately keeps complexity in `db.ts` as private methods. Add to `db.ts` first; only extract if a method exceeds ~50 lines with clear boundaries.

---

## Common Pitfalls

### Pitfall 1: descriptionTerms Migration Runs Every Startup
**What goes wrong:** The migration re-processes already-migrated rules on every restart, causing unnecessary writes.
**Why it happens:** `bootstrap()` runs unconditionally at startup.
**How to avoid:** Check for the old shape before migrating: `if (!Array.isArray(condition.descriptionContains)) continue`. The migration is idempotent but noisy without this guard.
**Warning signs:** High startup time with large rule sets; test by running `createRepository()` twice and verifying `condition_json` is stable.

### Pitfall 2: listRules() ORDER BY Still Uses specificity_score
**What goes wrong:** Rules appear sorted by specificity in the UI and execute in the wrong order after Phase 10.
**Why it happens:** The current `listRules()` query is: `ORDER BY is_system DESC, specificity_score DESC, sort_order ASC`. After Phase 10, execution order is `sort_order ASC` for user rules, system rules last.
**How to avoid:** Change `listRules()` ORDER BY to `is_system ASC, sort_order ASC` — user rules first (low is_system=0), sorted by drag position, then system rules (is_system=1).
**Warning signs:** Rule execution test: create two rules where the less-specific rule should win due to drag order; verify first-match-wins on the drag-ordered list.

### Pitfall 3: category_label Denormalized Column Drifts After Rename
**What goes wrong:** After renaming a category, the `category_label` column on `imported_transactions` retains the old name. Dashboard and ledger views show the old label.
**Why it happens:** `updateCategory` only updates the `categories` table; the denormalized `category_label` on each transaction is not refreshed.
**How to avoid:** Inside the rename transaction, also run: `UPDATE imported_transactions SET category_label = ? WHERE category_id = ?`.
**Warning signs:** After rename, run `listTransactions()` and verify `categoryPath` returns the new name.

### Pitfall 4: Merge Does Not Update Rule action.categoryId
**What goes wrong:** After merging category A into B, rules that were assigning to A still reference A's ID. On next rule execution those rules assign to a deleted category.
**Why it happens:** The current `mergeCategory` only updates `imported_transactions`. Rule `action_json` is not updated.
**How to avoid:** Inside the merge transaction: `SELECT * FROM categorization_rules WHERE action_json LIKE '%"categoryId":"<sourceId>"%'` then update each matching rule's `action_json` to swap the `categoryId`. Or more robustly: query all rules where `parseRuleAction(row.action_json).categoryId === sourceCategoryId` and update those rows.
**Warning signs:** After merge, `listRules()` and verify no rule's `action.categoryId` points to the deleted source category.

### Pitfall 5: Archive Does Not Filter isArchived from CategoryOption
**What goes wrong:** Archived categories still appear in the transaction edit category picker and the rule editor category dropdown.
**Why it happens:** `listCategories()` builds the full tree from all categories; `CategoryOptionSchema` does not have an `isArchived` field; the renderer picker does not know to filter.
**How to avoid:**
1. Add `isArchived: z.boolean()` to `CategoryTreeNodeSchema` and `CategoryOptionSchema`.
2. In `buildCategoryTree()`, include `isArchived: Boolean(row.is_archived)` in node mapping.
3. In all places that derive category options, filter `!option.isArchived`.
**Warning signs:** Test that an archived category does not appear in a `<select>` for category assignment while its transactions are still visible in the ledger.

### Pitfall 6: Import Conflict Detection by Name Only — False Positives
**What goes wrong:** Two rules with the same name but completely different conditions are flagged as conflicts when they shouldn't be (or vice versa: genuinely identical rules in different files aren't caught if names differ).
**Why it happens:** D-16 specifies name-based conflict detection. This is intentional — it's the right key because names are user-visible.
**How to avoid:** Accept this behavior as correct per the spec. Show the diff; let the user decide. Do not add condition-content-based deduplication (not specified).

### Pitfall 7: Auto-Apply Overwrites Existing Category Assignments
**What goes wrong:** Transactions that the user manually categorized during review are overwritten by auto-apply rules at import commit.
**Why it happens:** `applyAllRulesToTransactions()` iterates all transactions in the batch and applies matching rules without checking if a category was already set.
**How to avoid:** Apply rules only to transactions where `category_id IS NULL` — do not overwrite manual categorizations. This aligns with the existing `applyRuleToExisting()` behavior which also respects existing categorizations.

### Pitfall 8: ReDoS Check Blocks the Main Thread on Input
**What goes wrong:** Running a test regex against a long adversarial string on each keypress freezes the renderer.
**Why it happens:** JavaScript regex evaluation is single-threaded; catastrophic backtracking blocks the event loop.
**How to avoid:** Use static analysis (REDOS_RISK_PATTERNS check) which is O(1) per pattern, not O(n) on test input. The static check runs synchronously without adversarial input.

---

## Code Examples

### Extending CategorizationRuleConditionSchema
```typescript
// Source: src/shared/contracts/categories.ts — current schema
// Replace descriptionContains with descriptionTerms:
export const DescriptionTermSchema = z.object({
  op: z.enum(['contains', 'starts-with', 'ends-with', 'regex']),
  value: z.string().trim().min(1)
})

export const CategorizationRuleConditionSchema = z.object({
  descriptionTerms: z.array(DescriptionTermSchema).default([]),
  amountMinMinor: z.number().optional(),
  amountMaxMinor: z.number().optional(),
  transactionTypes: z.array(TransactionNormalizedTypeSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  directions: z.array(CategoryDirectionSchema).default([])
})
```

### New IPC Contract Types
```typescript
// Source: src/shared/contracts/categories.ts — additions

export const ReorderRulesInputSchema = z.object({
  ruleIds: z.array(z.string())
})

export const RuleExportEntrySchema = z.object({
  name: z.string(),
  sortOrder: z.number().int(),
  descriptionTerms: z.array(DescriptionTermSchema).default([]),
  amountMinMinor: z.number().optional(),
  amountMaxMinor: z.number().optional(),
  transactionTypes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  directions: z.array(z.string()).default([]),
  action: z.object({
    categoryName: z.string().optional(),
    type: z.string().optional(),
    appendTags: z.array(z.string()).default([])
  })
})

export const RuleConflictSchema = z.object({
  name: z.string(),
  existing: RuleExportEntrySchema,
  incoming: RuleExportEntrySchema
})

export const RuleImportResultSchema = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
  conflicts: z.array(RuleConflictSchema),
  warnings: z.array(z.string())
})

export const MergeCategoryPreviewSchema = z.object({
  sourceCategoryId: z.string(),
  targetCategoryId: z.string(),
  affectedTransactionCount: z.number().int().nonnegative(),
  affectedRuleCount: z.number().int().nonnegative(),
  samples: z.array(RulePreviewSampleSchema)
})

export const ArchiveCategoryInputSchema = z.object({
  categoryId: z.string(),
  isArchived: z.boolean()
})
```

### CommitImportBatchResult Extension
```typescript
// Source: src/shared/contracts/import.ts — addition to CommitImportBatchResult
export interface RuleCategorization {
  ruleName: string
  count: number
}

export interface CommitImportBatchResult {
  // ... existing fields ...
  ruleCategorizations?: RuleCategorization[]  // omitted if empty (D-11)
}
```

### Specificity Badge Mapping
```typescript
// Source: existing computeRuleSpecificity() in db.ts
// Score: 0-4 = low, 5-9 = medium, 10+ = high
const specificityLabel = (score: number): 'low' | 'medium' | 'high' =>
  score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'

const specificityBadgeStyle = (label: 'low' | 'medium' | 'high') => ({
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: label === 'high'
    ? 'rgba(15, 118, 110, 0.12)'
    : label === 'medium'
    ? 'rgba(161, 98, 7, 0.10)'
    : 'rgba(30, 27, 22, 0.06)',
  color: label === 'high'
    ? 'var(--color-accent)'
    : label === 'medium'
    ? '#a16207'
    : 'var(--color-muted)'
})
```

### Condition Row Component Structure (RuleEditorPanel replacement)
```typescript
// Pattern: dynamic list of condition rows replacing the single "keywords" input
interface ConditionRowProps {
  term: { op: 'contains' | 'starts-with' | 'ends-with' | 'regex'; value: string }
  onChange: (updated: ConditionRowProps['term']) => void
  onRemove: () => void
  matchCount?: number      // from live preview (for regex op)
  reDoSRisk?: boolean      // red badge when regex has risk
}
// Render: [op dropdown] [value input] [remove button]
// When op === 'regex': show reDoSRisk badge + matchCount inline
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `descriptionContains: string[]` (comma-separated keywords) | `descriptionTerms: Array<{ op, value }>` (structured conditions) | Phase 10 | Enables starts-with, ends-with, regex; existing rules migrated at startup |
| Specificity scoring drives execution order | Manual drag sortOrder drives execution order | Phase 10 | User has full control; score retained as informational badge only |
| No rule application at import | Auto-apply enabled user rules at commit time | Phase 10 | Reduces manual categorization work for repeat importers |
| Category rename = display only | Category rename propagates to category_label on all transactions | Phase 10 | Ledger always shows current category name |
| No category archive concept | `isArchived` boolean separates hidden-from-pickers from inactive | Phase 10 | Historical transactions preserved; archived categories not surfaced for new work |

**Deprecated/outdated after Phase 10:**
- `descriptionContains` field in `CategorizationRuleCondition`: removed from schema, migrated to `descriptionTerms` at startup
- `is_system DESC, specificity_score DESC` as primary sort for rule execution: replaced by `is_system ASC, sort_order ASC`

---

## Open Questions

1. **Does `mergeCategory` currently update `category_label` on transactions?**
   - What we know: `mergeCategory` does `UPDATE imported_transactions SET category_id = ?, category_label = ?` — inspecting the code shows it uses `target.id` and `getCategoryPathById(target.id).join(' > ')` — YES, it already updates `category_label`.
   - What's unclear: Whether it also updates matching rule `action_json`. It does not currently (confirmed by code read).
   - Recommendation: Add rule target update to `mergeCategory` transaction (see Pitfall 4).

2. **What happens if a user drags a system rule?**
   - What we know: D-07 says system rules always evaluate after all user rules regardless of drag position.
   - What's unclear: UX — should the drag handle be hidden on system rules, or should dragging them be prevented at drop time?
   - Recommendation: Hide drag handles entirely on system rule rows (`rule.kind === 'system'`). Simpler than drop-target guards.

3. **Should auto-apply at import respect disabled rules?**
   - What we know: D-09 says "all enabled user rules fire automatically". `isEnabled` is already on the rule model.
   - What's unclear: Nothing — "enabled" is explicit in D-09.
   - Recommendation: `applyAllRulesToTransactions` queries `WHERE is_enabled = 1 AND is_system = 0`.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies identified; all required tools already installed and working — confirmed by `npm run rebuild:native:node && vitest run` passing 4/4 category/rule tests).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run rebuild:native:node && npx vitest run tests/unit/categories/` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RULES-01 | starts-with and ends-with operators match correctly | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "starts-with"` | ❌ Wave 0 |
| RULES-02 | amount range conditions filter correctly | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "amount range"` | ❌ Wave 0 |
| RULES-03 | multiple descriptionTerms entries use AND semantics | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "AND conditions"` | ❌ Wave 0 |
| RULES-04 | reorderRules persists sortOrder and listRules returns user-order-first | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "drag reorder"` | ❌ Wave 0 |
| RULES-05 | rename propagates category_label to transactions atomically | unit | `npx vitest run tests/unit/categories/category-repository.test.ts -t "rename"` | ❌ Wave 0 |
| RULES-06 | merge preview returns correct transaction count and reassigns rule targets | unit | `npx vitest run tests/unit/categories/category-repository.test.ts -t "merge"` | ❌ Wave 0 |
| RULES-07 | archived category absent from listCategories active pickers, present in transaction history | unit | `npx vitest run tests/unit/categories/category-repository.test.ts -t "archive"` | ❌ Wave 0 |
| RULES-08 | regex op matches correctly; ReDoS detection flags catastrophic patterns | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "regex"` | ❌ Wave 0 |
| RULES-09 | export produces valid JSON with correct shape; system rules excluded | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "export"` | ❌ Wave 0 |
| RULES-10 | import detects name conflicts; category-not-found produces warning | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "import"` | ❌ Wave 0 |
| RULES-11 | auto-apply fires at commitBatch; only uncategorized transactions targeted; summary counts correct | unit | `npx vitest run tests/unit/import/auto-apply.test.ts` | ❌ Wave 0 |
| RULES-11 (migration) | descriptionContains rules migrate to descriptionTerms with op:contains | unit | `npx vitest run tests/unit/categories/rule-engine.test.ts -t "migration"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run rebuild:native:node && npx vitest run tests/unit/categories/`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/categories/rule-engine.test.ts` — expand existing file: add describe blocks for `starts-with`, `ends-with`, `regex`, `AND conditions`, `drag reorder`, `export`, `import`, `migration`
- [ ] `tests/unit/categories/category-repository.test.ts` — expand existing file: add describe blocks for `rename propagation`, `merge preview`, `archive`
- [ ] `tests/unit/import/auto-apply.test.ts` — new file: covers RULES-11 (auto-apply at commit, uncategorized-only targeting, summary generation)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read — `src/main/persistence/db.ts`, `src/shared/contracts/categories.ts`, `src/main/import/import-coordinator.ts`, `src/main/ipc/categories.ts` — all patterns extracted from running source
- `tests/unit/categories/rule-engine.test.ts` — existing test patterns for `WalnutRepository(':memory:')` fixture
- `vitest.config.ts` — test framework configuration
- `package.json` — dependency versions verified 2026-03-30

### Secondary (MEDIUM confidence)
- HTML5 Drag and Drop API — MDN documented; `draggable`, `ondragstart`, `ondragover`, `ondrop` events are stable across all Electron-supported Chromium versions
- ReDoS static analysis patterns — cross-verified against `safe-regex` project patterns and OWASP ReDoS guidance; patterns for nested quantifiers `(x+)+` and alternation+quantifier `(a|b)+` are well-established

### Tertiary (LOW confidence — not required, no external research done)
- No external research required for this phase; all implementation guidance derived from verified codebase state

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json; no new packages needed
- Architecture patterns: HIGH — derived from direct codebase read of all referenced files
- Pitfalls: HIGH — derived from direct code inspection of `matchesRuleCondition`, `mergeCategory`, `updateCategory`, `buildCategoryTree`
- Test map: HIGH — test framework verified running, file paths confirmed

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable codebase; no fast-moving external dependencies)
