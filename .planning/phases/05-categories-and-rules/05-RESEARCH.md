# Phase 5 Research: Categories and Rules

**Phase:** 05-categories-and-rules  
**Date:** 2026-03-28  
**Mode:** implementation / ecosystem  
**Status:** Complete

## Recommendation Summary

Phase 5 should extend the existing SQLite-backed transaction model rather than introducing a parallel categorization service. The right implementation is:

- store categories and rules in SQLite as first-class tables
- keep system categories and user categories in the same table with explicit protection flags
- model category hierarchy as a simple parent-child adjacency list
- evaluate rules in the main process, not in the renderer
- keep rule matching deterministic and explainable
- preview rule re-apply impact before touching existing transactions
- use repository-backed refetch-after-mutation, consistent with Phases 3 and 4

This phase should not attempt a generalized automation engine. It should ship a narrow but strong local categorization system that future dashboard and audit phases can trust.

## Standard Stack

Use the repo’s existing stack and extend it:

- **Persistence:** `better-sqlite3` with the existing repository layer in `src/main/persistence/db.ts`
- **Validation and contracts:** `zod`
- **Renderer:** `React 19` with the current Walnut shell patterns
- **IPC boundary:** typed preload bridge in `src/preload/index.ts`
- **Testing:** `vitest` for repository/renderer coverage and `playwright` for full end-to-end rule/category workflows

For this phase, keep the implementation inside the current app architecture:

- categories and rules are stored locally in SQLite
- main process owns mutation and matching logic
- renderer consumes typed query/result payloads and refetches authoritative state after mutations

## Architecture Patterns

### 1. Category hierarchy should use an adjacency-list table

Use one categories table with:

- `id`
- `name`
- `parent_id` nullable
- `kind` or `is_system`
- `is_income_category`
- `is_active`
- `sort_order`
- timestamps

Why:

- it fits the chosen “top-level with optional subcategories” model cleanly
- SQLite handles parent-child lookups well enough for this size of dataset
- it keeps user-created and system categories in one queryable structure
- it makes merge/move operations straightforward

Do not create separate tables for system categories and user categories unless forced later. Phase 5 benefits from one tree with explicit protection flags.

### 2. Rules should be row-based and deterministic

Use one rules table plus a compiled/mapped in-memory evaluation pass in the main process.

Suggested rule shape:

- `id`
- `name`
- `is_enabled`
- `scope` or `applies_to_existing_default`
- `conditions_json`
- `actions_json`
- `specificity_score`
- timestamps

Conditions should represent the locked scope:

- description match terms
- amount min/max
- normalized transaction type
- tags
- debit/credit direction

Actions should represent the locked scope:

- assign category
- assign subcategory
- assign normalized type
- apply tags

Evaluation order:

1. collect matching enabled user rules
2. compute specificity from the populated conditions
3. choose the most specific
4. if tied, use a stable deterministic fallback such as lower creation order or explicit stored order

This keeps “most specific rule wins” explainable and testable.

### 3. Keep category application and rule creation separate

Phase 4 already introduced transaction editing and a rule-suggestion hook. Build on that without forcing the user into rule authoring.

Recommended flow:

- user edits transaction
- transaction saves immediately
- response includes optional “create rule from this change” suggestion payload
- user opens a side flow with prefilled condition/action values
- rule creation remains explicit

This matches the user decision that ledger edits should save first, then offer a reusable rule side flow.

### 4. Re-apply to existing transactions should use preview-first repository operations

When creating or editing a rule:

1. calculate affected transaction ids in the repository
2. return a count plus a representative sample list
3. ask for confirmation
4. apply in one transaction
5. refetch affected screen state

This same pattern should power category merges:

- resolve source category
- calculate affected transaction count
- migrate rows immediately to target category
- return updated counts

### 5. Rule testing should run against real local data, not static examples only

The rule-management pane should support “test against matches” using the current transaction dataset.

Recommended output:

- number of matches
- a small sample list
- what action would be applied

This is better than synthetic-only previews because the product is local-first and already owns the dataset.

## Don't Hand-Roll

### 1. Don’t build a second renderer-owned category/rule state model

The repo already established a safer pattern in Phase 3 and Phase 4:

- mutate in main process
- refetch authoritative state

Do not replace that with a complicated optimistic store for categories/rules.

### 2. Don’t make precedence depend on vague heuristics alone

The user explicitly chose “most specific rule wins automatically.”  
That requires a stable, explainable scoring model.

Do not ship a fuzzy priority model that changes unpredictably based on match order.

### 3. Don’t hand-roll a generalized workflow engine

Phase 5 needs deterministic category and rule application, not a scripting platform.  
Avoid turning rules into arbitrary code or layered automations.

Keep rules declarative and limited to the chosen match/action set.

### 4. Don’t store category labels only where ids should exist

Phase 4 currently exposes `category` as a label-shaped field. Phase 5 should shift toward durable category ids in persistence and contract payloads, even if the UI still shows labels.

Using labels as the long-term relational key will make:

- renames fragile
- merges harder
- dashboard joins error-prone

### 5. Don’t make bulk re-apply opaque

Any operation that changes existing transactions in bulk must preview impact first.  
Do not silently re-apply edited rules to history.

## Common Pitfalls

### 1. Category renames vs merges get conflated

They are not the same operation.

- rename changes the label of one category
- merge migrates transactions from one category id to another and then retires the source

If these are implemented as the same operation, counts and later auditability get messy fast.

### 2. System-category protection leaks into the UI only

If protection exists only in the renderer, it will be bypassable or inconsistent.  
Enforce “system categories are protected” in the repository layer too.

### 3. Rules that write type and category can create surprising loops

If a rule changes type, and type is also one of its matching conditions, careless re-evaluation can create inconsistent behavior.

Recommendation:

- evaluate against the pre-update row
- apply one winning rule
- do not recursively re-run rule evaluation inside the same operation

### 4. Existing transaction counts become stale

The Categories and Rules screen needs live counts.  
If counts are stored separately without refresh strategy, they drift from reality.

Prefer query-derived counts for Phase 5 unless profiling proves otherwise.

### 5. Hierarchy moves can create cycles

If user-created categories can move under parents, the repository must block:

- moving a category under itself
- moving a category under one of its descendants

That validation belongs in the main process, not just the UI.

## Suggested Data Model

### Categories

Use:

- `categories`
- `category_merge_history` only if needed later; Phase 5 can often get by without a dedicated history table

Suggested columns:

- `id`
- `name`
- `parent_id`
- `is_system`
- `is_active`
- `is_income_category`
- `sort_order`
- `created_at`
- `updated_at`

Suggested transaction change:

- add `category_id` to transactions
- keep human-readable label mapping in query results

### Rules

Use:

- `categorization_rules`

Suggested columns:

- `id`
- `name`
- `is_enabled`
- `conditions_json`
- `actions_json`
- `specificity_score`
- `created_at`
- `updated_at`

### Transaction integration

Transactions should expose:

- assigned `category_id`
- derived category label path for UI
- rule-origin metadata only if cheap to return; otherwise defer that to Phase 7 audit work

## Suggested API Surface

Add dedicated contracts instead of overloading transaction-only payloads.

Recommended new operations:

- `listCategories()`
- `createCategory()`
- `updateCategory()`
- `mergeCategory()`
- `deleteCategory()`
- `listRules()`
- `createRule()`
- `updateRule()`
- `deleteRule()`
- `toggleRule()`
- `testRule()`
- `previewRuleApplyToExisting()`
- `applyRuleToExisting()`
- `suggestRuleFromTransactionEdit()`

Keep category and rule payloads typed with `zod`, consistent with the existing contracts strategy.

## Verification Guidance

Repository coverage should emphasize:

- protected system categories cannot be modified destructively
- user-created categories support move, merge, deactivate, delete
- rule specificity is deterministic
- preview counts and samples for re-apply are correct
- category merges migrate matching transactions correctly
- rule application to existing rows updates the intended set only

Renderer coverage should emphasize:

- categories and rules render in side-by-side panes
- counts update after mutations
- rule test previews show a sample set
- post-save rule suggestion flow from ledger edits is prefilled

E2E coverage should emphasize:

- create user category
- assign or merge category
- create rule from transaction edit
- preview and apply to existing
- verify updated transaction list results

## Code Examples

### Example: specificity scoring

Use a simple weighted score based on populated conditions.

Pseudo-approach:

```ts
const scoreRuleSpecificity = (rule: RuleConditions) =>
  [
    rule.descriptionTerms?.length ? 4 : 0,
    rule.amountMinMinor !== undefined || rule.amountMaxMinor !== undefined ? 3 : 0,
    rule.normalizedType ? 2 : 0,
    rule.direction ? 2 : 0,
    rule.tags?.length ? 1 : 0
  ].reduce((sum, part) => sum + part, 0)
```

Then sort by:

1. score descending
2. explicit stable fallback such as `created_at ASC`

### Example: preview before apply

```ts
const matchingRows = repository.listTransactions(buildRuleQuery(rule))
return {
  matchCount: matchingRows.length,
  samples: matchingRows.slice(0, 10)
}
```

Only apply after explicit confirmation.

### Example: category protection check

```ts
if (category.isSystem && destructiveActionRequested) {
  throw new Error('System categories are protected and cannot be deleted or merged into a user edit flow.')
}
```

## Confidence

- **High:** extending the existing SQLite + preload + renderer pattern is the correct architecture for this phase
- **High:** adjacency-list categories are sufficient and preferable for the current hierarchy scope
- **High:** declarative, repository-owned rule evaluation is the right fit for the chosen requirements
- **Medium:** exact specificity weighting should be refined during planning and verified with real data

## Bottom Line

Phase 5 should be built as a repository-backed local taxonomy and rule system, not as a UI-only categorization layer and not as a general automation engine. The best path is:

- categories as a protected hierarchical SQLite model
- rules as declarative rows with deterministic specificity
- preview-first bulk apply behavior
- strong reuse of the Phase 4 transaction editing and suggestion seams

That gives Phase 6 and Phase 7 a stable base without overbuilding Phase 5.
