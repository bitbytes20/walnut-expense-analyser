# Phase 5 Discussion Log

**Date:** 2026-03-28
**Phase:** 05-categories-and-rules

## Discussed Areas

### 1. Category Model
- Chosen: top-level categories with optional subcategories
- Kept the agreed built-in base category set
- Income should ship with built-in subcategories
- User-created categories can be top-level or nested under a parent

### 2. Rule Model
- Rules can match on description, amount range, transaction type, tags, and debit/credit direction
- Rules can assign category/subcategory, type, and tags
- Most specific matching user rule wins automatically
- Ledger edits should save first, then offer a prefilled reusable-rule flow

### 3. Categories and Rules UX
- Categories and rules should share one screen with two side-by-side panes
- User-created categories support create, rename, move, merge, activate/deactivate, and delete
- Rules support create, edit, test, enable/disable, and delete
- The screen should show how many transactions map to categories or are affected by rules

### 4. Re-categorization Behavior
- New rules apply to future transactions by default, with an optional apply-to-existing step
- Editing a rule offers preview and optional re-apply to existing matches
- Category merges migrate existing transactions immediately
- Rule re-apply confirmation should show both a count and a sample list of affected transactions

## Outcome

Phase 5 context is now locked enough for UI design and planning.

## Recommended Next Steps

- `$gsd-ui-phase 5`
- `$gsd-plan-phase 5`
