# Phase 10: Rule System Expansion - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver two distinct capability clusters:

1. **Richer rule authoring** — new string operators (starts-with, ends-with, regex opt-in), multi-condition AND via a structured condition array, manual drag-reorder priority, rule export/import with conflict detection
2. **Category correctness guarantees** — rename propagates atomically to all transactions and rule targets, merge shows preview count before committing, archive hides category from active pickers while preserving historical transaction data, user rules auto-apply at import commit time

New budgeting, AI, or family-member capabilities are NOT in scope.

</domain>

<decisions>
## Implementation Decisions

### Multi-Condition AND Model

- **D-01:** Replace the current `descriptionContains: string[]` field with a structured `descriptionTerms: Array<{ op: 'contains' | 'starts-with' | 'ends-with' | 'regex', value: string }>` array. All entries in the array must match (AND semantics).
- **D-02:** Amount range fields (`amountMinMinor`, `amountMaxMinor`) remain as separate fields alongside `descriptionTerms`. No unification into a single conditions array — less migration risk and the amount fields are already working.
- **D-03:** Regex is exposed as an operator option (`op: 'regex'`) in the operator dropdown per condition row, not as a separate per-rule toggle. When selected, the value field becomes a regex input with live match preview and a red warning badge if ReDoS risk is detected on input.
- **D-04:** The rule editor UI renders a dynamic list of condition rows, each with an operator dropdown + value input field, and an [+] button to add another row. Existing rules with the old `descriptionContains[]` schema must be migrated to `descriptionTerms[]` with `op: 'contains'` at startup.

### Rule Priority

- **D-05:** Manual drag order replaces specificity scoring as the execution model. Rules are evaluated in user-defined drag order; first match wins.
- **D-06:** The existing `specificityScore` field is retained and shown as an informational badge (e.g. "high / medium / low") in the rule list, but it does NOT affect rule execution order.
- **D-07:** System (built-in) rules always evaluate AFTER all user rules, regardless of drag position. Users cannot drag user rules below system rules. This preserves the "user rules always override heuristics" invariant from Phase 5.
- **D-08:** A `sortOrder` integer column is added to the `categorization_rules` table to persist drag positions.

### Auto-Apply at Import Commit

- **D-09:** When a user commits an import, all enabled user rules fire automatically against the newly imported transactions (RULES-11).
- **D-10:** The import commit success screen shows an inline summary: "N transactions auto-categorized by your rules." Tapping/clicking expands to list which rules matched and how many transactions each rule affected.
- **D-11:** If no rules match any imported transaction, the summary line is omitted (no "0 transactions categorized" noise).
- **D-12:** Each auto-categorization emits an audit event (rule name + before/after category) consistent with how manual transaction edits emit audit events (TRAN-03 precedent).

### Rule Export / Import

- **D-13:** Export writes a JSON array of all user rules to a file chosen via the native save dialog. System rules are excluded from export.
- **D-14:** The JSON export format includes: rule name, conditions, action, sortOrder. It does NOT include internal IDs or affected transaction counts (those are instance-specific).
- **D-15:** At import time, category references are resolved by name (not by ID). If a category name matches a local category, the ID is remapped silently. If a category name is not found locally, the rule is imported with no category assignment and the user sees a warning: "Category '[name]' not found — rule imported without category assignment."
- **D-16:** Conflict detection: an incoming rule whose name matches an existing rule name triggers a side-by-side diff (existing vs incoming conditions/actions). The user can choose to keep existing, replace with incoming, or skip (import neither).

### Category Correctness

- **D-17:** Category rename propagates atomically to all rule targets (the `action.categoryId` on rules pointing at the renamed category). The rename + rule update happen in a single SQLite transaction.
- **D-18:** Category merge shows the affected transaction count and a sample list before confirmation (extending the Phase 5 D-16 pattern). All transactions and rule targets pointing at the source category are atomically reassigned to the target.
- **D-19:** Category archive sets a new `isArchived` boolean column (distinct from the existing `isActive`). Archived categories disappear from active category pickers and the main category list but remain queryable for historical transaction display. The distinction: `isActive: false` means the user deactivated it for new assignments; `isArchived: true` means it's fully hidden. Existing behavior of `isActive` is preserved.

### Claude's Discretion

- Exact visual treatment of the specificity badge (icon, color, tooltip wording)
- Drag-reorder implementation details (drag handle position, animation, auto-scroll)
- Exact wording of the auto-categorization summary expansion (e.g. rule name display format)
- ReDoS detection heuristic (timeout-based or static analysis — either is acceptable)
- Empty-state copy for the rule export/import diff screen when there are no conflicts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` §Rule System Expansion — RULES-01 through RULES-11 (all 11 in scope)

### Prior Phase Context
- `.planning/phases/05-categories-and-rules/05-CONTEXT.md` — Phase 5 decisions on rule model, category management, re-apply preview flows, and merge behavior. Phase 10 extends these patterns.
- `.planning/PROJECT.md` §Key Decisions — "User rules always override heuristics" is a product-level invariant that Phase 10 must preserve.

### Existing Contracts (to extend, not replace)
- `src/shared/contracts/categories.ts` — Current `CategorizationRuleConditionSchema` (has `descriptionContains: string[]` — Phase 10 replaces this with `descriptionTerms`) and full category/rule type definitions
- `src/main/ipc/categories.ts` — Existing IPC handlers for rule CRUD, preview, and apply operations
- `src/main/persistence/schema.ts` — Current `categorization_rules` table (no `sortOrder` column yet; no `isArchived` on categories yet)
- `src/renderer/features/categories-rules/RuleEditorPanel.tsx` — Current rule editor UI (Phase 10 replaces keyword input with dynamic condition row list)
- `src/renderer/features/categories-rules/RulePane.tsx` — Current rule list (Phase 10 adds drag handles and sortOrder persistence)
- `src/main/import/import-coordinator.ts` — Import commit flow (Phase 10 adds auto-rule-apply step here)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CategorizationRuleConditionSchema` — extend by renaming `descriptionContains` to `descriptionTerms` with structured entries; migration needed for existing persisted rules
- `MergeCategoryInputSchema` — already exists and covers the merge operation; may need to add a preview endpoint alongside it (similar to `RuleApplyPreviewSchema` pattern)
- `RulePreviewPanel.tsx` / `RulePreviewSampleSchema` — existing preview infrastructure reusable for the import conflict diff view
- `ApplyRuleToExistingInputSchema` — existing pattern for applying a rule to historical transactions; auto-apply at import reuses the same engine call

### Established Patterns
- Schema migrations use raw SQL in `bootstrap()` (Phase 9 precedent) — `sortOrder` column addition and `isArchived` column addition should follow this pattern
- IPC mutation handlers return the full updated list after each mutation (categories and rules both do this) — export/import handlers should follow the same return shape
- Inline style objects with CSS custom properties — no UI component library; rule editor additions must stay consistent
- `window.addEventListener('keydown', handler)` with `useEffect` cleanup — keyboard event pattern; drag-and-drop will use native HTML5 drag events or a similar lightweight pattern
- Audit events are emitted from the repository layer (not the IPC layer) — auto-categorization audit events should follow the same pattern as transaction edit audit events in `db.ts`

### Integration Points
- `src/main/import/import-coordinator.ts` `commitBatch()` — add rule auto-apply step after transaction persistence, before returning the commit result
- `src/main/ipc/import.ts` — extend the commit result payload to carry the auto-categorization summary (rule name → count map)
- `src/shared/contracts/import.ts` — add `ruleCategorizations?: Array<{ ruleName: string; count: number }>` to the commit result contract
- `src/renderer/features/import/ImportSummary.tsx` — render the auto-categorization summary section from the new commit result field

</code_context>

<specifics>
## Specific Ideas

- The condition row list in the rule editor should visually mirror the filter drawer's chip/tag style from Phase 9 where possible — consistent visual language across the app's condition-building surfaces.
- The side-by-side rule import diff should show the rule name as the header, with two columns: "Current" (existing rule) and "Incoming" (from file), each showing the full condition/action breakdown.
- The "Category not found" warning during rule import should use the same warning chip pattern as import error diagnostics from Phase 9 — consistent error presentation.
- Auto-categorization summary expansion (the expandable detail under "N transactions auto-categorized") should be collapsible, defaulting to collapsed, so it doesn't push the main import success CTA off-screen.

</specifics>

<deferred>
## Deferred Ideas

- OR / nested boolean rule logic — explicitly out of scope per REQUIREMENTS.md; AND-only in v2.0
- Rule change history and revert — RULES-F02 in future requirements; not in Phase 10
- AI/ML rule suggestions — RULES-F03 in future requirements; not in Phase 10
- Per-member category customization — Phase 13 concern
- Budget-aware rules (e.g. "if over budget in category X, re-route to Y") — post-budgeting feature; not before Phase 11

</deferred>

---

*Phase: 10-rule-system-expansion*
*Context gathered: 2026-03-30*
