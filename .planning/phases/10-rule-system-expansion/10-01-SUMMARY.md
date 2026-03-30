---
phase: 10-rule-system-expansion
plan: 01
subsystem: categories
tags: [typescript, sqlite, better-sqlite3, zod, vitest, categorization-rules]

# Dependency graph
requires:
  - phase: 05-categories-and-rules
    provides: CategorizationRuleConditionSchema, descriptionContains field, rule engine matching logic
provides:
  - DescriptionTermSchema with op (contains/starts-with/ends-with/regex) and value fields
  - descriptionTerms replaces descriptionContains in all rule condition types
  - ReorderRulesInputSchema, RuleExportEntrySchema, RuleConflictSchema, RuleImportResultSchema, MergeCategoryPreviewSchema, ArchiveCategoryInputSchema
  - RuleCategorization interface and extended CommitImportBatchResult.ruleCategorizations
  - DB schema: categories.is_archived column, migration for descriptionContains -> descriptionTerms
  - listRules ORDER BY changed to is_system ASC, sort_order ASC (user rules first)
  - Wave 0 test scaffolds with it.todo stubs for all 11 RULES requirements
affects: [10-rule-system-expansion/10-02, 10-rule-system-expansion/10-03, 10-rule-system-expansion/10-04, 10-rule-system-expansion/10-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DescriptionTerm op union: contains/starts-with/ends-with/regex used in matchesRuleCondition with switch statement"
    - "Bootstrap migration: migrateDescriptionContainsToDescriptionTerms runs at WalnutRepository init"
    - "Wave 0 test scaffolding: it.todo stubs define all requirements before implementation"

key-files:
  created:
    - tests/unit/import/auto-apply.test.ts
  modified:
    - src/shared/contracts/categories.ts
    - src/shared/contracts/import.ts
    - src/shared/contracts/transactions.ts
    - src/main/persistence/db.ts
    - src/renderer/features/categories-rules/CategoriesRulesScreen.tsx
    - src/renderer/features/categories-rules/RuleEditorPanel.tsx
    - src/renderer/features/categories-rules/RulePane.tsx
    - src/renderer/mockWalnutApi.ts
    - tests/unit/categories/rule-engine.test.ts
    - tests/unit/categories/category-repository.test.ts
    - tests/unit/categories-rules-screen.test.tsx
    - tests/unit/transaction-ledger.test.tsx
    - tests/unit/transactions/rule-suggestion.test.tsx

key-decisions:
  - "descriptionTerms uses AND semantics: all terms must match for rule to fire"
  - "Backward compatibility via migrateDescriptionContainsToDescriptionTerms() at bootstrap"
  - "RuleEditorPanel UI keeps simple comma-separated text field, maps to op:contains terms"
  - "listRules ORDER BY is_system ASC, sort_order ASC puts user rules first (D-05)"
  - "is_archived column added via ensureColumn pattern for safe migration on existing DBs"

patterns-established:
  - "DescriptionTerm matching: switch on op field in matchesRuleCondition private method"
  - "Schema migration at bootstrap: check for old field, transform to new, run UPDATE"

requirements-completed: [RULES-01, RULES-02, RULES-03, RULES-05, RULES-06, RULES-07, RULES-08, RULES-09, RULES-10, RULES-11]

# Metrics
duration: 45min
completed: 2026-03-30
---

# Phase 10 Plan 01: Contract Foundation and Test Scaffolds Summary

**Phase 10 contract foundation established: descriptionTerms multi-op matching replaces descriptionContains with backward-compat migration, all new IPC schemas defined, DB columns added, and 41 it.todo stubs scaffold all 11 RULES requirements.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-30T14:00:00Z
- **Completed:** 2026-03-30T14:45:00Z
- **Tasks:** 3 completed
- **Files modified:** 13

## Accomplishments

### Task 1: Replace descriptionContains with descriptionTerms in shared contracts

Updated `src/shared/contracts/categories.ts`:
- Added `DescriptionTermSchema` with `op` (contains/starts-with/ends-with/regex) and `value`
- Replaced `descriptionContains` with `descriptionTerms: z.array(DescriptionTermSchema).default([])`
- Added `sortOrder: z.number().int()` to `CategorizationRuleSummarySchema`
- Added `isArchived: z.boolean()` to `CategoryTreeNodeSchema` and `CategoryOptionSchema`
- Added 6 new schemas: `ReorderRulesInput`, `RuleExportEntry`, `RuleConflict`, `RuleImportResult`, `MergeCategoryPreview`, `ArchiveCategoryInput`

Updated `src/shared/contracts/import.ts`:
- Added `RuleCategorization` interface
- Extended `CommitImportBatchResult` with `ruleCategorizations?: RuleCategorization[]`

Updated `src/shared/contracts/transactions.ts`:
- Updated `TransactionRuleSuggestionSchema` draft condition to use `descriptionTerms`

### Task 2: DB schema columns and rule engine

Updated `src/main/persistence/db.ts`:
- Added `ensureColumn('categories', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')`
- Added `migrateDescriptionContainsToDescriptionTerms()` bootstrap migration
- Updated all `descriptionContains` references to `descriptionTerms`
- `matchesRuleCondition` now uses switch on `term.op` for contains/starts-with/ends-with/regex
- `listRules` ORDER BY changed to `is_system ASC, sort_order ASC`
- `mapRuleSummary` and `buildCategoryTree` map new fields
- Both `CategoryTreeNode` builders include `isArchived: Boolean(row.is_archived)`

Auto-fixed renderer and test files (Rule 1 deviation):
- `RulePane.tsx`, `RuleEditorPanel.tsx`, `CategoriesRulesScreen.tsx`, `mockWalnutApi.ts`
- All test files using `descriptionContains` updated to `descriptionTerms` with op:contains

### Task 3: Wave 0 test scaffolds

- `tests/unit/categories/rule-engine.test.ts`: 23 `it.todo` stubs across 8 describe blocks
- `tests/unit/categories/category-repository.test.ts`: 11 `it.todo` stubs across 3 describe blocks
- `tests/unit/import/auto-apply.test.ts`: 7 `it.todo` stubs for auto-apply at import commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated renderer files and all test files for descriptionTerms**
- **Found during:** Task 1 (TypeScript check after contract change)
- **Issue:** `RuleEditorPanel.tsx`, `RulePane.tsx`, `CategoriesRulesScreen.tsx`, `mockWalnutApi.ts`, and 4 test files all referenced `descriptionContains`
- **Fix:** Updated all references to use `descriptionTerms` with `{ op: 'contains', value }` mapping. Added `path` and `isArchived` to `categoryOptions` mapping in `CategoriesRulesScreen`. Fixed `onTest` call to extract `condition!` and `action!` from payload.
- **Files modified:** See key-files above
- **Commits:** 2b0f38d

**2. [Rule 2 - Missing Field] transactions.ts draft condition needed descriptionTerms**
- **Found during:** Task 1
- **Issue:** `TransactionRuleSuggestionSchema` had its own inline draft condition with `descriptionContains`
- **Fix:** Updated the inline draft condition schema to use `descriptionTerms`
- **Files modified:** `src/shared/contracts/transactions.ts`
- **Commit:** 1ad991a

## Known Stubs

None — `it.todo()` stubs are intentional scaffolds for Plans 02-05, not UI/data stubs.

## Self-Check: PASSED
