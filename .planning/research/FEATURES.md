# Feature Landscape: v2.0 New Capabilities

**Domain:** Personal finance desktop app — workflow polish, rule system expansion, budgeting foundations
**Researched:** 2026-03-29
**Scope:** Only what is NEW in v2.0. Existing v1.0 features are taken as given.

---

## Category 1: Workflow Polish

### Table Stakes

Features that users who've been using the app for weeks will expect before the next milestone.
Missing any of these makes daily use feel friction-heavy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-select checkboxes in transaction list | Standard in every finance ledger (QuickBooks, Actual, YNAB) — users select 10 transactions and categorize in one step | Low | Needs select-all, range-select (shift+click), and deselect-all |
| Batch categorize selected transactions | Companion to multi-select — the action that makes bulk review worthwhile | Low | Category picker appears once, applies to all selected |
| Batch approve/dismiss in review queue | Review queue processes one item at a time now — bulk approve obvious items is expected after v1.0 daily use | Low | Must respect existing mixed-import gating rules |
| Clearer import error messages | "Parse failed" is not actionable. Apps like Quicken show specific error codes and suggested fixes | Medium | Needs structured error taxonomy — what failed, why, what to do |
| Import retry flow | After fixing a file (wrong format, wrong account), user expects to re-import without navigating away | Low | "Fix and retry" button on error state, not just dismiss |
| Keyboard shortcut for approve/reject in review queue | Users processing 50 items in a sitting need keyboard-only flow | Low | Builds on existing Ctrl+1-8 nav shortcuts from v1.0 Phase 8 |

### Differentiators

Features that set this app apart from generic expense trackers in the same desktop niche.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Saved searches / filter presets | Users building a "monthly dining spend" view repeatedly shouldn't rebuild it each time. Cloudscape and PocketSmith both document this pattern as a high-value time-saver | Medium | Name + optional description, apply from dropdown, unsaved-changes label when modified. 5-10 presets is enough for v2.0 |
| Import troubleshooting inline hints | Inline contextual text explaining what the confidence score means and how to resolve a low-confidence import — most apps bury this in docs | Medium | Surface parser confidence score meaning at the point of failure, not in settings |
| Batch tag assignment | Assign freeform tags to multiple transactions at once — builds on v1.0 tagging system | Low | Tag picker with multi-select support |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| "Recent searches" history | Adds persistence complexity, surfaces sensitive payee names in a visible list | Saved presets cover the 80% case; skip recent history entirely |
| Drag-and-drop reordering of filter presets | Users have 5-10 presets max, not dozens — sort is not the pain | Simple list with edit/delete, name them clearly |
| Complex filter logic in saved presets (AND/OR nested) | Filter presets are recall helpers, not query builders | Save flat filter state only; complex logic belongs in the rule engine |
| Review queue "approve all" single click | Defeats the purpose of review; one misclick approves suspicious transactions | Batch select then approve is the right interaction — user must commit to selection first |

### User Behaviors Described

**Bulk categorize flow:** User opens transaction ledger, shift-clicks 12 transactions from the same merchant, clicks "Categorize selected," picks "Groceries" from the category picker — all 12 update, rules are NOT auto-created (that is a separate rule authoring step). User sees inline count confirmation "12 transactions updated."

**Saved search flow:** User filters by date range (last 30 days), merchant contains "Swiggy", category is Uncategorized — clicks "Save as preset," names it "Swiggy uncategorized." Next session they open the presets dropdown and apply it in one click. If they change the date range, an "unsaved" indicator appears.

**Import retry flow:** Import fails with "Column count mismatch on row 47." Error message names the row, describes what was expected vs found, offers "Download diagnostic" and "Retry with this file" buttons. User opens the file, fixes the encoding issue, clicks Retry — same import session resumes with the corrected file.

---

## Category 2: Rule System Expansion

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Contains / starts-with / ends-with match operators | Every rule engine offers string operators beyond exact-match. PocketSmith, Actual, QuickBooks all support keyword containment | Low | Extend existing rule condition model to expose match type |
| Amount range conditions (greater than, less than, between) | "Anything over ₹5000 in Miscellaneous needs review" is a real use case | Low | Single condition node type: field=amount, operator=gt/lt/between, value |
| Multi-condition AND rules | "Merchant contains Uber AND amount > 200" — needed once users have 20+ rules and need precision | Medium | AND-only for v2.0; OR adds significant UI complexity (see anti-features) |
| Rule ordering / drag-and-drop priority | First-match-wins is the standard (PocketSmith documents this explicitly). Users need to promote a specific rule above a general one | Low | Drag handle in rule list, numeric priority visible on hover |
| Rule export to JSON | Users who back up their data expect rules to be portable. Backup/restore in v1.0 covers the DB, but a standalone rule file is useful for sharing or migration | Medium | JSON array of rule objects, same schema as internal storage |
| Rule import from JSON | Companion to export | Medium | Conflict detection required before applying — see below |
| Category rename (propagates to transactions and rules) | Users who start with "Food" and want "Groceries" expect rename to be non-destructive — Quicken documents this behavior explicitly | Low | Single rename operation updates category name, all associated transactions, all rule targets |
| Category merge (combine two categories, reassign transactions) | Standard in Quicken and YNAB; users consolidate categories after experimentation | Medium | Source → target merge with preview count ("47 transactions will move to Groceries") |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Regex match operator (opt-in, clearly labelled) | Power users need pattern matching for complex merchant strings like "POS 4521*ZOMATO*" | Medium | MEDIUM complexity: gate behind "Advanced" toggle, show live preview of matched transactions before saving. Validate regex on input, reject catastrophic backtracking patterns |
| Rule conflict detection on import | When importing rules from JSON, detect if an incoming rule's conditions overlap with an existing rule and present a diff view | Medium | Overlap = same field + same operator + overlapping value; show both rules side-by-side, user picks winner or keeps both |
| Category archive (hide without delete) | Users who have "Old Car Loan" category with historical transactions can archive it — it disappears from pickers but data stays intact | Low | Archived categories show in historical views, excluded from active pickers and budget setup |
| Rule preview count | Before saving a rule, show "This rule would match 8 existing transactions" — already present as preview-first bulk apply in v1.0; extend to individual rule save | Low | Reuse existing preview infrastructure from Phase 5 |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full OR / nested boolean rule conditions in v2.0 | OR conditions require a query-builder UI (complex), produce hard-to-understand rules, and create conflict detection nightmares. Actual Budget took years to get this right | AND-only in v2.0. OR is v3.0 territory. If a user needs OR, they create two separate rules |
| Regex as the default match operator | Most users do not write regex. Forcing regex for simple containment is hostile UX | Regex is one advanced option among contains/starts-with/ends-with/exact. Default is "contains" |
| Rule versioning / history | Adds storage and UI complexity with negligible day-to-day value | Rule export serves as manual versioning; audit log captures rule changes |
| "Smart suggest" rule authoring from transaction patterns | AI/ML territory, explicitly out of scope per PROJECT.md | Let users author rules explicitly; pattern suggestions are v3.0 |
| Rule import that silently overwrites | Overwriting without review is destructive for a trusted local finance tool | Always show conflict diff, require explicit user confirmation per conflict |

### User Behaviors Described

**Multi-condition rule authoring:** User clicks "Add rule." Condition picker defaults to "Description contains [text]." User adds a second condition via "+ AND condition," picks "Amount greater than 500." Action is "Set category to Dining." Rule preview shows "3 existing transactions match." User saves. Rule appears in list with priority indicator.

**Regex rule:** User enables "Advanced mode" for a condition. Text field gains a `/pattern/` hint. User types `SWIGGY\d+` — live preview shows 6 matching transactions. Validation rejects `(a+)+` as a catastrophic backtracking pattern with an inline error. User saves.

**Category merge:** User opens category list, selects "Food" (23 transactions), clicks "Merge into..." picker, selects "Groceries." Preview shows "23 transactions will be moved to Groceries. Rules targeting 'Food' will be updated. 'Food' will be deleted." User confirms. Done in one step.

**Rule import conflict:** User imports `rules-backup.json` containing 15 rules. System detects 2 conflicts with existing rules — both have "Description contains 'Netflix'" but different categories. Modal shows side-by-side diff: incoming rule targets "Entertainment," existing rule targets "Subscriptions." User picks "keep existing" for rule 1, "use incoming" for rule 2. 13 rules import cleanly.

---

## Category 3: Budgeting Foundations

### Table Stakes

Features that any budgeting module must have. Missing these means the budgeting feature is not usable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Monthly budget amount per category | The atomic unit of every budgeting app (YNAB, Actual, Mint, PocketGuard all share this) | Low | One budget amount per category per calendar month. No income tracking needed in v2.0 |
| Budget vs actual view per month | Users set budgets to compare — without this view, budgets are useless. Core pattern in every budgeting app surveyed | Medium | Show: budgeted amount, actual spend, remaining, % used. Color-coded: green < 80%, amber 80-100%, red over |
| Annual budget setup (copy monthly across 12 months) | Users set the same ₹3000 grocery budget every month — re-entering 12 times is hostile | Low | "Set same for all months" toggle in budget setup. Annual view is secondary to monthly |
| Over-budget alert in the interface | Every budgeting app surfaces over-budget categories prominently. PocketGuard shows a special icon. PocketSmith changes label to "Left to rollover" | Low | Red indicator in category budget row, surfaced in dashboard summary |
| No-budget fallback state | Categories without a budget set must have a clear "no budget set" state — not 0, not empty, explicitly none | Low | "Set budget" affordance in empty state rather than showing ₹0 |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Budget rollover per category (opt-in) | Carry unspent or overspent amount into next month — PocketSmith and PocketGuard both document this as high-value for irregular spending categories like car maintenance | Medium | Off by default. When enabled: unspent adds to next month's budget, overspent subtracts. Visual indicator on rollover-enabled categories. Show rollover contribution in budget row |
| Monthly budget summary card | "You've spent ₹18,400 of ₹22,000 budgeted this month. 3 categories over budget." — quick status at a glance | Low | Builds on existing dashboard card pattern from Phase 6 |
| Budget progress bars in category list | Inline progress bars next to each category — users understand remaining budget without arithmetic | Low | Reuses dashboard UI patterns from v1.0 Phase 6 |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Zero-based / envelope budgeting (assign every rupee) | YNAB-style zero-based requires income tracking, unassigned money concepts, and "ready to assign" logic. This is a significantly different data model that would require rearchitecting Phase 6 analytics | Simple per-category monthly targets. The user does not need to assign their total income to categories in v2.0 |
| Income / savings rate tracking | Adds a second dimension (income) the app currently has no import path for — ICICI statements show debits/credits but the system has no income category semantics | Deferred. Budgets in v2.0 are spend targets only |
| Budget alerts via system notifications (Windows toast) | Adds Electron OS integration surface, notification permission handling, and user annoyance risk | In-app visual indicators and a summary card are sufficient for v2.0 |
| Historical budget comparison across years | Requires budget records to span years and year-on-year comparison UI — adds schema complexity and a new view type | Monthly view only in v2.0. Year-on-year is v3.0 |
| Goal-based saving targets | "Save ₹50,000 for vacation" is goal tracking, not budgeting. Requires separate goal data model | Explicitly deferred. Budget = spend target. Goals = separate feature |
| Budget templates / library | Pre-built budget templates ("Typical household") add marginal value for a single-user private app and introduce cultural assumptions about INR household spending | User sets their own budgets from scratch; starter values are 0 |

### User Behaviors Described

**Monthly budget setup:** User navigates to Budgets section (new top-level nav entry). Category list shows all active categories. User clicks "Set budget" on Groceries, types ₹6000, saves. Row updates to show ₹6000 / ₹4200 spent / ₹1800 remaining with a green progress bar. For Dining Out, user enables "Set same for all months," types ₹3000 — all 12 months get ₹3000 without manual repetition.

**Over-budget alert:** Dining Out shows ₹3200 spent against ₹3000 budget. Row turns red, remaining shows "−₹200 over." Dashboard summary card updates to "2 categories over budget." No notification fires — user sees this the next time they open the app.

**Rollover opt-in:** User clicks the settings icon on the "Car Maintenance" budget row, toggles "Roll over unspent amount." Next month, if only ₹800 of ₹2000 was spent, the new month shows ₹2000 + ₹1200 rollover = ₹3200 budget. A small "↑ ₹1200 rolled over" annotation appears in the budget row.

---

## Feature Dependencies

```
Multi-select checkboxes → Batch categorize
Multi-select checkboxes → Batch tag assignment
Multi-select checkboxes → Batch approve in review queue

v1.0 preview-first bulk apply (Phase 5) → Rule preview count (extend, not rebuild)
v1.0 category/rule engine (Phase 5) → All rule expansion features (extend condition model)
v1.0 freeform tags (Phase 4) → Batch tag assignment
v1.0 dashboard card pattern (Phase 6) → Budget summary card (reuse pattern)
v1.0 advanced search/filter (Phase 4) → Saved filter presets (persist existing filter state)

Category rename → Rule targets must update (atomic operation)
Category merge → Transaction reassignment + rule target update (atomic operation)
Category archive → Budget setup must exclude archived categories

Monthly budget setup → Budget vs actual view (budget must exist to compare)
Monthly budget setup → Over-budget alert (threshold derived from budget amount)
Monthly budget setup → Rollover (rollover amount derived from budget vs actual delta)

Rule export JSON → Rule import JSON (shared schema)
Rule import JSON → Conflict detection (always precedes import)
```

---

## MVP Recommendation per Category

### Workflow Polish MVP
Prioritize:
1. Multi-select + batch categorize (highest day-to-day leverage)
2. Batch approve in review queue (review throughput was explicit goal)
3. Clearer import error messages + retry (import troubleshooting was explicit goal)
4. Keyboard shortcuts for review queue approve/reject

Defer to Phase 9 stretch:
- Saved filter presets (valuable but not urgent for small datasets)
- Batch tag assignment (nice-to-have after core bulk actions land)

### Rule System Expansion MVP
Prioritize:
1. Additional match operators (contains / starts-with / ends-with / amount range) — high leverage, low complexity
2. Multi-condition AND rules — most requested pattern once rules exist
3. Category rename and merge — operational safety needed before category count grows
4. Rule ordering / priority

Defer to Phase 10 stretch:
- Regex operator (gate behind advanced toggle; can ship after AND rules stabilize)
- Rule export/import (useful but not blocking daily use)
- Category archive (can be simulated by rename convention until proper archive ships)
- Rule conflict detection on import (only needed when import ships)

### Budgeting Foundations MVP
Prioritize:
1. Monthly budget amount per category
2. Budget vs actual view with color coding
3. Over-budget indicator
4. No-budget fallback state

Defer to Phase 11 stretch:
- Rollover (semantically simple but requires careful delta math and edge cases with edited transactions)
- Annual budget setup shortcut (convenience, not correctness)

---

## Complexity Notes

| Area | Risk | Detail |
|------|------|--------|
| Regex rule matching | MEDIUM | Catastrophic backtracking on malformed user patterns is a real risk. Validate with safe-regex or equivalent on input. Reject known catastrophic patterns (nested quantifiers). Keep regex as opt-in advanced feature only |
| Rule conflict detection | MEDIUM | Defining "overlap" between two rules requires a clear semantic model. Keep it simple: same field + same operator + identical or substring value = conflict. Don't attempt full predicate coverage analysis |
| Budget rollover delta math | MEDIUM | Rollover interacts with transaction edits, retroactive categorization changes, and import of past-dated transactions. Cap rollover calculation to the previous completed month only — do not retroactively recompute all historical rollover chains |
| Multi-condition AND rules | LOW-MEDIUM | AND is a straightforward extension to the condition model. The complexity is in the UI (adding/removing conditions, showing all conditions in the rule list summary) not the evaluation logic |
| Category merge atomicity | LOW-MEDIUM | Must update category_id on all transactions and all rule targets in one SQLite transaction. Failure midway must roll back entirely |
| Saved filter presets | LOW | Persist the current filter state as a JSON blob with a user-supplied name. The complexity is UI state management (unsaved indicator), not storage |
| Batch actions | LOW | Standard checkbox + action bar pattern. Main complexity is maintaining correct selection state when the list is sorted or filtered mid-session |

---

## Sources

- [Actual vs YNAB — Actual Budget](https://actualbudget.org/blog/2024-07-01-actual-vs-ynab/) — rule system comparison, rollover behavior
- [Using Category Rules — PocketSmith](https://learn.pocketsmith.com/article/156-using-category-rules-to-automatically-categorize-transactions) — first-match-wins ordering, rule management UX
- [Saved Filter Sets — Cloudscape Design System](https://cloudscape.design/patterns/general/filter-patterns/saved-filter-sets/) — naming, unsaved indicator, confirmation modals
- [Bulk action UX design guidelines — Eleken](https://www.eleken.co/blog-posts/bulk-actions-ux) — selection model, keyboard navigation
- [Rollover budgeting — PocketSmith](https://www.pocketsmith.com/blog/rollover-budgeting-in-pocketsmith-now-in-beta/) — rollover UX patterns, visual indicators
- [Rollover budget — PocketGuard](https://pocketguard.com/helps/how-to-use-the-rollover-budget-feature-in-pocketguard/) — rollover direction, over-budget carry-forward
- [Bulk categorize — QuickBooks Community](https://www.uncat.com/blog/how-to-bulk-categorize-in-quickbooks-from-the-bank-feed) — batch actions implementation reference
- [Category rename/merge — Quicken](https://info.quicken.com/win/how-do-i-edit-change-or-delete-a-category-or-subca) — merge with reassignment pattern
- [Filter UX patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) — filter positioning, preset design
- [Regex pitfalls — LogScale](https://library.humio.com/kb/kb-avoiding-regex-pitfalls.html) — catastrophic backtracking, validation discipline
- [Budget app design tips — Eleken](https://www.eleken.co/blog-posts/budget-app-design) — simplicity imperative in first budgeting implementation
- [Transaction categorization — PocketSmith auto-categorize](https://learn.pocketsmith.com/article/255-auto-categorize-transactions) — rule precedence patterns
