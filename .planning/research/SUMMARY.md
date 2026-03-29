# Project Research Summary

**Project:** Walnut Expense Analyser v2.0 (Release 2: Core)
**Domain:** Personal finance desktop app — workflow polish, rule system expansion, budgeting foundations
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

Walnut v2.0 is a targeted expansion of a working, production-quality v1.0 Electron/SQLite desktop app. The existing stack (Electron, React 19, TypeScript, SQLite via better-sqlite3, Drizzle ORM, Zod, date-fns, recharts) is validated and requires only two new runtime dependencies: `react-hotkeys-hook` for keyboard shortcut composability and `safe-regex2` for ReDoS protection on user-authored regex conditions. All three feature areas — workflow polish, rule system expansion, and budgeting foundations — are well-understood, largely additive extensions to existing subsystems. The primary risks are correctness gaps in the existing codebase that will become breaking bugs if v2.0 is built on top of them without remediation.

The recommended approach is sequential by phase with correctness fixes front-loaded: Phase 9 (Workflow Polish) first because it improves the surfaces used for testing phases 10 and 11, Phase 10 (Rule System Expansion) second with category safety fixes as its first items before any rule authoring additions, and Phase 11 (Budgeting Foundations) last because budget targets reference category IDs — stable categories reduce rework risk. The architecture requires no structural changes: all new features extend the existing three-layer Electron pattern (renderer IPC preload main WalnutRepository SQLite) and the existing `WalnutRepository` monolith is extended, not refactored. Budget logic is the only candidate for extraction to a separate class, and research recommends deferring that to v3.0.

The most serious risks are not new feature complexity but existing code gaps: `mergeCategory()` does not repoint rules that reference the deleted source category, `updateCategory()` does not propagate renamed labels to transactions, and user-authored rules are not applied at import time. These three gaps will produce silent data corruption or confusing UX on day one of v2.0 use and must be addressed in Phase 10 before any rule-authoring feature ships. The regex ReDoS risk is the only genuine new attack surface; `safe-regex2` validation at save time is the correct mitigation given the synchronous main-process constraint.

---

## Key Findings

### Recommended Stack

The existing stack absorbs all v2.0 features without new libraries. The only additions are `react-hotkeys-hook` (v5.2.4) to replace scattered raw `window.addEventListener` keyboard registrations that will produce listener collisions as per-screen shortcuts grow from 8 to 15+, and `safe-regex2` (v5.1.0, Fastify-maintained) for save-time regex validation in the main process. All other capability — schema extension, budget period arithmetic, variance charts, form validation — is covered by deeper use of what already exists.

Rejected additions with strong rationale: fuzzy search libraries (wrong architecture — SQLite FTS5 is built-in and keeps data in the main process), headless component libraries (style contract mismatch with existing custom component model), form libraries (controlled useState is already established, Zod handles validation), and date picker libraries (month/year select is a custom `<select>`, no library justified for a single use case).

**Core technologies — new or deepened:**
- `react-hotkeys-hook` v5.2.4: keyboard shortcut composability — replaces raw event listeners for per-screen focus-scoped shortcuts
- `safe-regex2` v5.1.0: ReDoS prevention — validates user regex patterns at save time in main process; prevents synchronous hang
- `date-fns` (existing, v4.1.0): budget period arithmetic — `startOfMonth`, `endOfMonth`, `eachMonthOfInterval` already imported in `db.ts`
- `recharts` (existing, v3.8.1): budget variance charts — `BarChart` with target/actual bars per category
- `drizzle-orm` + `better-sqlite3` (existing): schema extension — `ensureColumn` pattern for `conditions_json`; `CREATE TABLE IF NOT EXISTS` for three new budget tables
- `Zod v4` (existing): extended schemas for `CategorizationRuleConditionSchema` (regex field, conditions array) and new `budget.ts` contracts

### Expected Features

**Must have — Workflow Polish (Phase 9):**
- Multi-select checkboxes in transaction list with shift-click range select and batch categorize
- Batch approve/dismiss in review queue (with pending-only pre-filter to avoid queue integrity bug)
- Keyboard shortcuts for review queue approve/reject
- Clearer import error messages with row-level specifics and retry flow
- Filter state persistence (localStorage with Zod-versioned validation key)

**Must have — Rule System Expansion (Phase 10):**
- Contains / starts-with / ends-with / amount range operators on rule conditions
- Multi-condition AND rules (OR between condition groups)
- Category rename that propagates `category_label` to all transactions (correctness fix)
- Category merge that repoints orphaned rules to target category (correctness fix)
- Auto-apply user rules after import (closes UX expectation gap)
- Rule ordering / drag-and-drop priority

**Must have — Budgeting Foundations (Phase 11):**
- Monthly budget amount per category with a clear "no budget set" state
- Budget vs actual view with color-coded over/under indicators (green/amber/red)
- Over-budget alert in interface
- Annual budget setup shortcut ("set same for all months")

**Should have — differentiators (can defer within phase):**
- Saved filter presets (named, unsaved indicator, flat filter state only)
- Regex rule conditions (opt-in advanced mode, safe-regex2 guarded, live preview)
- Rule export/import JSON with conflict detection
- Category archive (hide without delete)
- Budget rollover per category (opt-in)
- Budget progress bars in category list and monthly summary card

**Defer to v3.0+:**
- OR/nested boolean rule conditions
- Zero-based / envelope budgeting (different data model)
- Income / savings rate tracking
- Budget alerts via OS notifications
- Historical budget comparison across years
- "Smart suggest" rule authoring (AI/ML, out of scope)
- Budget templates/library

### Architecture Approach

v2.0 is a pure extension of the existing three-layer Electron pattern. No structural refactor is needed. Phase 9 changes are renderer-only (filter persistence via localStorage, review queue checkbox wiring, keyboard hook migrations). Phase 10 extends `WalnutRepository.matchesRuleCondition()` and `db.ts` schema init with additive fields and two correctness fixes to existing methods. Phase 11 adds three new SQLite tables, a new `budget.ts` contracts file, a new `budget.ts` IPC module, and a new `BudgetScreen` feature folder — all additive, nothing displaced.

**Major components touched:**

1. `WalnutRepository` (`db.ts`) — extended with regex evaluation, `conditions_json` column, budget CRUD methods, budget variance query, and category rename/merge correctness fixes. Recommended to keep in one file for v2.0 (currently ~3500 lines); extract `BudgetRepository` to its own file in v3.0 if needed.
2. `shared/contracts/` — `categories.ts` extended for regex and multi-condition; new `budget.ts` file for budget types/schemas
3. `src/main/ipc/budget.ts` — new IPC module registering 7 budget channels; registered in `main.ts`
4. `src/renderer/features/budget/` — new feature folder with 5 components; `App.tsx` gets `'budget'` added to `WorkspaceScreen` union and Ctrl+9 shortcut
5. `src/preload/index.ts` — extended with 7 budget bindings and `detectRuleConflicts`; `WalnutApi` interface updated accordingly

### Critical Pitfalls

1. **Category merge orphans rules** — `mergeCategory()` repoints transactions but does not update `action_json` in rules referencing the deleted source category ID, causing silent "Category not found" crashes at rule-apply time. Fix: inside the merge SQLite transaction, scan and repoint all rules with matching `action.categoryId` before deleting the source.

2. **Category rename stales `category_label` denormalization** — `updateCategory()` updates the `categories` table but leaves the denormalized `category_label` on all existing transactions pointing to the old name. Dashboard groupings and ledger display break. Fix: after any rename, issue `UPDATE imported_transactions SET category_label = [new_path] WHERE category_id = ?` in the same transaction.

3. **Batch review queue integrity with mixed-state selections** — `resolveReviewItems()` throws if any item in the batch is not pending, resolving nothing. Fix: pre-filter the batch to pending-only, skip resolved items silently, and report counts (X resolved, Y skipped) rather than throwing.

4. **ReDoS risk via user-authored regex conditions** — synchronous main process + synchronous better-sqlite3 means a catastrophic backtracking pattern hangs the app with no recovery path. Fix: validate at save time with `safe-regex2`; wrap `new RegExp()` execution in try/catch in `matchesRuleCondition()`; cache compiled RegExp objects per evaluation pass to avoid re-compilation.

5. **Budget period boundary arithmetic on month/year edges** — mixing `new Date()` local-time construction with `YYYY-MM-DD` sortable text storage causes DST-shifted boundaries on some months. Fix: all period calculations must start from the stored sortable string, parse with `date-fns parseISO`, and serialize back with `format(date, 'yyyy-MM-dd')` — never round-trip through `new Date()`.

---

## Implications for Roadmap

Based on research, the three v2.0 phases map cleanly to the researcher's own suggested sub-task ordering. The phases are independent of each other at the IPC level but share data model assumptions (category stability) that justify the ordering below.

### Phase 9: Workflow Polish

**Rationale:** Fully independent of Phases 10 and 11 at the code level. Ships three table-stakes items users expect after daily v1.0 use. Improves the surfaces (review queue, transaction ledger, filter state) used for testing Phase 10 and 11 work — making this first accelerates the whole release.

**Delivers:** Multi-select batch categorize, batch review resolution with keyboard shortcuts, import error improvement with retry, filter persistence across navigation.

**Features addressed:** Workflow Polish table stakes + filter persistence differentiator.

**Build order within phase:**
- 9.1 Filter persistence (renderer-only, no IPC, fast win)
- 9.2 Review queue batch select-all and keyboard shortcuts
- 9.3 Import error messages and retry flow

**Pitfall to avoid:** Batch review mixed-state selection — pre-filter to pending-only before calling existing `resolveReviewItems()`.

**Research flag:** Standard patterns. No phase-level research needed. Bulk action UX is well-documented; keyboard hook integration is straightforward with `react-hotkeys-hook`.

---

### Phase 10: Rule System Expansion

**Rationale:** Must fix the two confirmed correctness gaps (category merge orphaning rules, category rename staling labels) before adding any new rule-authoring surface on top of a broken foundation. Rule expansion is the highest user-facing value area for power users; delivering it after workflow polish means users can immediately test new rules on the improved transaction-management surfaces.

**Delivers:** Correctness fixes to merge/rename, additional match operators, multi-condition AND rules, regex condition (opt-in), rule priority ordering, rule export/import with conflict detection, category archive, auto-apply rules on import.

**Features addressed:** Rule System Expansion table stakes + regex and conflict detection differentiators.

**Build order within phase:**
- 10.1 Category rename label propagation (correctness fix — db.ts `updateCategory`)
- 10.2 Category merge rule repoint + audit event (correctness fix — db.ts `mergeCategory`)
- 10.3 Additional match operators (contains/starts-with/ends-with/amount range)
- 10.4 Multi-condition AND rules (`conditions_json` column + `matchesRuleCondition` extension + `RuleEditorPanel` UI)
- 10.5 Regex condition (safe-regex2, opt-in advanced toggle, live preview)
- 10.6 Rule conflict detection (new IPC channel, inline warning in `RuleEditorPanel`)
- 10.7 Rule export/import JSON (shared schema + conflict diff modal)
- 10.8 Category archive, auto-apply rules on import

**Pitfalls to avoid:** ReDoS via user regex (safe-regex2 at save time); rule import with unknown categoryIds (validate all foreign-key references before commit); conflict detection on every keystroke (debounce to 500ms, trigger on test/save only).

**Research flag:** Phase-level research recommended for rule conflict detection semantics and rule import/export schema design. Regex validation approach is already resolved (safe-regex2). Category merge/rename fixes are confirmed via codebase inspection — no research needed there.

---

### Phase 11: Budgeting Foundations

**Rationale:** Budget targets reference category IDs directly. Phase 10's category safety work (rename propagation, merge correctness) must be stable before budget targets are set, otherwise a user could set a ₹6000 target for "Food" and immediately lose it to an unguarded merge into "Groceries." Budgeting is also the feature area with the highest period-arithmetic risk and the one benefit from having the improved transaction ledger (Phase 9) for validating actual spend figures.

**Delivers:** Monthly budget targets per category, budget vs actual variance view with color coding, over-budget indicators, no-budget fallback state, annual "same for all months" shortcut, monthly summary card, budget progress bars.

**Features addressed:** Budgeting Foundations table stakes + monthly summary card and progress bar differentiators.

**Build order within phase:**
- 11.1 Budget data model (DDL in `db.ts`, new `shared/contracts/budget.ts`)
- 11.2 `WalnutRepository` budget methods (CRUD + period management)
- 11.3 Budget IPC channels + preload + `WalnutApi` interface extension
- 11.4 Budget variance calculation (`getBudgetVariance` with date index)
- 11.5 `BudgetScreen` + `BudgetList` + `BudgetEditorPanel` + `App.tsx` wiring (Ctrl+9)
- 11.6 `BudgetCategoryTargetsPanel` + `BudgetVarianceReport` (the visible value)

**Pitfalls to avoid:** Budget period boundary arithmetic (always use `date-fns parseISO` + `format`, never `new Date()`); budget variance at render frequency (cache snapshot per period, not per render); missing `transaction_date_sortable` index (add `CREATE INDEX IF NOT EXISTS idx_imported_transactions_date` before any variance query ships).

**Defer within phase:** Budget rollover (semantically simple, but delta math interacts with retroactive edits and past-dated imports; defer to Phase 12).

**Research flag:** Phase-level research recommended for budget variance snapshot caching strategy (dashboard snapshot pattern is established; confirm the same approach applies for budget). Period boundary parametric tests are well-understood. Rollover deferred, no research needed for v2.0.

---

### Phase Ordering Rationale

- Phase 9 first because it is fully independent and improves the test surface for all subsequent phases.
- Phase 10 before Phase 11 because budget targets reference category IDs — stable categories (fixed by 10.1/10.2) are a soft prerequisite for meaningful budget setup.
- Phase 10 correctness fixes (10.1, 10.2) before Phase 10 new features (10.3+) because adding new rule-authoring on a foundation that silently corrupts rule targets would compound rework.
- Budget rollover deferred: FEATURES.md and PITFALLS.md both flag delta-math complexity as a Phase 12+ item; v2.0 scope is proven basic budgeting only.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 10, rule conflict detection:** Defining "overlap" semantics (same field + operator + overlapping value) needs implementation-level design before writing the `detectRuleConflicts` method. The architecture doc provides a starting contract but the implementation strategy for set intersection at scale needs validation.
- **Phase 10, rule import/export:** Schema versioning for the exported JSON and conflict resolution UX (side-by-side diff modal) are design decisions that benefit from a focused design spike before implementation.
- **Phase 11, budget variance snapshot caching:** Whether to cache variance snapshots in a `budget_snapshots` table (mirroring the dashboard pattern) or compute on demand with an indexed query — the right choice depends on observed query performance with real data.

Phases with standard patterns (research-phase can be skipped):
- **Phase 9:** Bulk action UX, keyboard hooks, and filter localStorage persistence are all well-documented patterns. Architecture doc specifies exact files and code paths.
- **Phase 10, correctness fixes (10.1, 10.2):** Exact fix strategy confirmed via codebase inspection — no unknowns.
- **Phase 10, match operators and multi-condition AND:** Additive extension to existing `matchesRuleCondition` with backward-compat JSON blobs. Architecture doc specifies the exact data model change.
- **Phase 11, budget data model and CRUD:** Additive-only tables following the established `CREATE TABLE IF NOT EXISTS` + `ensureColumn` pattern. Architecture doc specifies full DDL.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack confirmed via direct `package.json` and source file reads. New dependencies (`react-hotkeys-hook`, `safe-regex2`) confirmed via web search with MEDIUM confidence on exact versions (npm 403'd during verification) |
| Features | HIGH | Grounded in direct comparisons with PocketSmith, Actual Budget, YNAB, QuickBooks, Cloudscape patterns. Anti-features have clear rationale. MVP recommendations are specific and prioritized |
| Architecture | HIGH | All architecture findings derived from direct codebase inspection (`db.ts`, `schema.ts`, `App.tsx`, `preload/index.ts`, etc.), not assumptions. Component boundary decisions are precise and file-specific |
| Pitfalls | HIGH | All critical pitfalls confirmed via direct codebase line references (mergeCategory line 1804, persistImportAttempt line 2519, matchesRuleCondition line 3083). ReDoS and date boundary risks are established patterns with strong external sources |

**Overall confidence:** HIGH

### Gaps to Address

- **`react-hotkeys-hook` version pin:** npm page returned 403 during research; version 5.2.4 sourced from search snippets only. Verify with `npm info react-hotkeys-hook version` before install and confirm v5 API signature matches usage assumptions.
- **`safe-regex2` false negative rate:** Documented to have false positives and false negatives. Implementation must treat it as a first-line defence, not a guarantee — `new RegExp()` try/catch in `matchesRuleCondition` is mandatory regardless of save-time validation outcome.
- **lucide-react icon names:** Specific icon names (`Target`, `Regex`, `CheckCheck`) inferred from known library scope. Verify exact availability at implementation time with `import { Target } from 'lucide-react'` — fallback to nearby icons if missing.
- **Rule conflict detection performance at scale:** Architecture doc flags that detection computes match sets in memory by re-running `findMatchingTransactions()` for all enabled rules. Acceptable at <50 rules / <10K transactions; needs an explicit threshold comment and a plan for early-exit if growth exceeds that. Validate before Phase 10 ships.
- **Budget variance snapshot vs on-demand:** The right approach (snapshot table vs indexed query) is flagged as needing validation. Decide at Phase 11 planning time based on a benchmark against the existing indexed dashboard snapshot approach.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/main/persistence/db.ts` — `mergeCategory`, `persistImportAttempt`, `matchesRuleCondition`, `computeRuleSpecificity`, `ensureColumn`, `initializeDatabase`, existing date-fns imports
- `src/main/persistence/schema.ts` — confirmed existing table structure
- `src/shared/contracts/categories.ts` — `CategorizationRuleConditionSchema`, `CategorizationRuleActionSchema`, `MergeCategoryInputSchema`
- `src/renderer/App.tsx` — `handleGlobalShortcut`, raw `addEventListener` shortcut pattern
- `src/preload/index.ts` — full `WalnutApi` surface
- `src/renderer/features/transactions/TransactionFilterDrawer.tsx` — confirmed no filter persistence
- `package.json` — confirmed all existing dependency versions

### Secondary (MEDIUM confidence — web sources, multiple agreeing)
- [PocketSmith category rules](https://learn.pocketsmith.com/article/156-using-category-rules-to-automatically-categorize-transactions) — first-match-wins ordering, rule management UX
- [Actual vs YNAB](https://actualbudget.org/blog/2024-07-01-actual-vs-ynab/) — rule system comparison, rollover behavior
- [Cloudscape saved filter sets](https://cloudscape.design/patterns/general/filter-patterns/saved-filter-sets/) — naming, unsaved indicator pattern
- [Eleken bulk action UX](https://www.eleken.co/blog-posts/bulk-actions-ux) — selection model, keyboard navigation
- [PocketSmith rollover budgeting](https://www.pocketsmith.com/blog/rollover-budgeting-in-pocketsmith-now-in-beta/) — rollover UX patterns
- [Quicken category rename/merge](https://info.quicken.com/win/how-do-i-edit-change-or-delete-a-category-or-subca) — merge with reassignment pattern
- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) — catastrophic backtracking patterns and prevention

### Tertiary (MEDIUM confidence — search snippets, npm page unavailable)
- react-hotkeys-hook v5.2.4 version — sourced from search snippets; npm page 403'd
- safe-regex2 v5.1.0 — confirmed via GitHub search; Fastify-maintained fork

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
