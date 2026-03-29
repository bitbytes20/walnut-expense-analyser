# Pitfalls Research

**Domain:** Personal finance desktop app — adding workflow polish, rule system expansion, and budgeting to an existing trusted v1.0 Electron/SQLite app
**Researched:** 2026-03-29
**Confidence:** HIGH — all findings grounded in the actual v1.0 codebase (`src/main/persistence/db.ts`, `src/shared/contracts/`, `src/renderer/`)

---

## Critical Pitfalls

### Pitfall 1: Category Merge Orphans Rules (confirmed gap in v1.0 code)

**What goes wrong:**
`mergeCategory()` (db.ts line 1804) correctly repoints `imported_transactions.category_id` from source to target inside a SQLite transaction. It then deletes the source category. However, it does NOT scan `categorization_rules.action_json` for rules whose `action.categoryId` equals the source category ID. After the merge, those rules silently still reference the deleted category. When such a rule is applied to existing or new transactions, `getCategoryPathById()` throws `Category ${categoryId} was not found`, crashing the apply operation and leaving the transaction uncategorized.

**Why it happens:**
The merge was built to fix transactions — the immediate visible symptom. Rule actions are JSON blobs (`action_json TEXT`), so there is no foreign-key constraint to make the breakage visible at the DB layer. The failure is deferred until someone tries to apply the orphaned rule.

**How to avoid:**
Inside the `mergeCategory()` SQLite transaction, add a step that:
1. Reads all `categorization_rules` where `json_extract(action_json, '$.categoryId') = sourceCategoryId`
2. Updates each matching rule's `action_json` to point to `targetCategoryId`
3. Recalculates and updates `specificity_score` if needed

This must happen inside the same transaction as the transaction update and category delete so the DB is never in a partial state.

**Warning signs:**
- Rule list shows rules whose target category no longer appears in the category picker
- `applyRuleToExisting` or import-time auto-categorization throws "Category not found" errors
- UAT: merge a user category that has at least one rule pointing to it, then try to apply that rule

**Phase to address:** Phase 10 (Rule System Expansion) — before any rule import or merge-safety UI is built

---

### Pitfall 2: Category Rename Stales `category_label` Denormalization

**What goes wrong:**
`imported_transactions` stores both `category_id` (FK) and `category_label` (denormalized path string, e.g. `"Income > Salary"`). When a category is renamed via `updateCategory()`, the category name changes in the `categories` table, but `category_label` on every existing transaction remains the old value. Dashboard queries, ledger display, and export all read `category_label` as the authoritative display string. After a rename, the ledger shows stale labels and dashboard spend-by-category groupings break (one group for the old name, one for the new name).

**Why it happens:**
The v1.0 design stores `category_label` as a snapshot for performance. Snapshots must be invalidated on rename. The current `updateCategory()` does not perform this invalidation.

**How to avoid:**
On any category rename (or parent reparent that changes path), issue:
```sql
UPDATE imported_transactions
SET category_label = [new_path_string]
WHERE category_id = [categoryId]
```
inside the same transaction as the categories table update. Run this recursively for all descendant category IDs if a parent is renamed.

**Warning signs:**
- Ledger shows two rows in the category filter for what should be one category
- Dashboard spend totals do not match the sum of transactions shown when clicking through
- After renaming "Salary" to "Monthly Salary", old transactions still show "Income > Salary"

**Phase to address:** Phase 10 (Rule System Expansion) — any category rename/merge safety work must include this fix

---

### Pitfall 3: Batch Review Operations Breaking Queue Integrity

**What goes wrong:**
v2.0 adds batch resolve/discard to the review queue for throughput. The existing `resolveReviewItems()` (db.ts line 2362) fetches items with `state = 'pending'` and throws if any item in the batch is not pending. A mixed batch (some already resolved, some pending) will throw and resolve nothing — no partial success. If the UI allows selecting items across different resolution states (e.g. showing resolved items for reference while bulk-selecting), the user's entire selection is silently rejected. Worse, the error message "Only pending review items from the selected batch can be resolved" is not surfaced per-item in the UI, so the user does not know which items blocked the batch.

**Why it happens:**
The single-item resolve path is strict-correct but the batch path needs smarter filtering. The natural instinct when adding batch operations is to reuse the existing resolver directly. The UI also currently shows all review items in a batch (pending and resolved together for context), which enables accidental mixed selections.

**How to avoid:**
- The batch resolver should pre-filter to pending items only, silently skip already-resolved items, and report counts (X resolved, Y skipped) rather than throwing
- The batch selection UI must visually distinguish pending from resolved items and default to selecting pending only
- Add an integration test: batch resolve a list containing one already-resolved item — verify the pending items succeed and the count is correct

**Warning signs:**
- Users report "nothing happened" after selecting all and clicking resolve
- The existing "Only pending review items" error surfaces in user-facing UI
- Batch resolution count in the result doesn't match the selection count

**Phase to address:** Phase 9 (Workflow Polish) — batch review operations

---

### Pitfall 4: ReDoS Risk When Adding Regex to Rule Conditions

**What goes wrong:**
The current `descriptionContains` condition matching uses `String.includes()` (db.ts line 3083) — O(n) and safe. Phase 10 plans to add regex support to rule conditions for richer rule authoring. User-supplied regex patterns that contain catastrophic backtracking (e.g. `(a+)+`, `(.+)*b`) will cause the main process to hang when `matchesRuleCondition` is called across thousands of transactions. Because rule matching runs synchronously in the main process (better-sqlite3 is synchronous), a single bad regex freezes the entire Electron app until the OS kills it or the user force-quits.

**Why it happens:**
Regex support feels like a small addition to the existing condition object. The performance risk is invisible in dev with small datasets (50 transactions) but catastrophic in prod (5,000+ transactions, bad pattern).

**How to avoid:**
- Validate regex patterns at save time using a ReDoS linter (the `safe-regex` or `vuln-regex-detector` npm packages)
- Apply a timeout to regex execution. In Node.js, use a Worker thread with a timeout for the regex match step, or use the `re2` package (Google's RE2 engine, which guarantees O(n) match time and rejects unbounded backtracking patterns at compile time)
- Show a match-time estimate in the rule preview UI: "matches N transactions" — if this preview is slow, the rule will be slow at apply time
- Unit test: `(a+)+b` against a 5,000-character string must not hang for more than 100ms

**Warning signs:**
- Rule preview takes more than 500ms for a regex condition on a corpus of 1,000+ transactions
- Any pattern that contains `(.*)(.*)`, `(a+)+`, or nested quantifiers
- User reports app freezing when saving a rule

**Phase to address:** Phase 10 (Rule System Expansion) — must be addressed before regex input is exposed in the UI

---

### Pitfall 5: User Rules Not Applied to New Imports (existing design gap)

**What goes wrong:**
`persistImportAttempt()` (db.ts line 2519) calls `deriveStarterCategorization()` for each incoming transaction — this applies heuristic system rules (ATM, salary, credit-card-payment). It does NOT run user-authored categorization rules at import time. User rules must be applied manually after import via `applyRuleToExisting`. A user who has spent time creating rules will import a new statement and see all transactions uncategorized, concluding the rules "don't work." This is a UX regression relative to expectation even though the architecture was always this way.

**Why it happens:**
The v1.0 design separated import (pure data ingestion) from categorization (user-driven). This is correct architecturally but creates a jarring experience once users have rules set up.

**How to avoid (scoped to v2.0):**
Phase 10 or Phase 9 should add an "auto-apply all user rules after import" step that runs immediately after `persistImportBatch` completes, inside the commit transaction or as a follow-up query. The ordering must follow the existing `listRules()` sort: `is_system DESC, specificity_score DESC, sort_order ASC` — first-match-wins semantics.

If auto-apply is deferred, at minimum add a post-import prompt: "You have N rules. Apply them to this import?"

**Warning signs:**
- User creates rules then imports — all new transactions still show "Uncategorized"
- Support asks "why don't my rules work?" after every import
- UAT: create two rules, import a fresh statement, verify new transactions match rule assignments

**Phase to address:** Phase 10 (Rule System Expansion) or Phase 9 if workflow polish covers import throughput

---

### Pitfall 6: Budget Period Boundary Arithmetic on Month Edges

**What goes wrong:**
Monthly budget variance calculations using JS `Date` arithmetic without a date library will produce wrong results at month boundaries. Common failures: February (28/29 days), months with 30 vs 31 days, and partial-period variance ("I've spent X of Y this month with Z days left"). The app already imports `date-fns` and uses `startOfMonth`, `endOfMonth` in db.ts — but budget calculations that mix local time zone `new Date()` with sortable date strings (`YYYY-MM-DD` stored as TEXT) can silently compare cross-timezone date boundaries.

**Why it happens:**
The transaction date is stored as a sortable TEXT key (`transactionDateSortable` via `toSortableDateKey()`). Budget period logic must use the same string comparison semantics as the storage format, not `Date` object comparison. If budget start/end dates are created as `new Date()` in local time and then converted to ISO strings, daylight-saving-time transitions can push the boundary by one day.

**How to avoid:**
- All budget period boundaries must be calculated using `date-fns` (already a dependency) with explicit UTC or fixed-offset arithmetic, never `new Date()` directly
- Period start: `format(startOfMonth(parseISO(referenceDate)), 'yyyy-MM-dd')`, period end: `format(endOfMonth(...), 'yyyy-MM-dd')`
- Budget queries against `imported_transactions` must use `transactionDateSortable >= periodStart AND transactionDateSortable <= periodEnd` string comparison — same as the existing dashboard range queries
- Write parametric tests for: Feb in a leap year, Feb in a non-leap year, Dec 31 → Jan 1 boundary, and any month with a DST transition date

**Warning signs:**
- Budget variance shows one transaction missing or extra at month start/end
- Test on February with a 2024 (leap) vs 2025 (non-leap) fixture
- Variance for current month changes at midnight local time vs midnight UTC

**Phase to address:** Phase 11 (Budgeting Foundations) — must be addressed before any period-based variance UI is built

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `category_label` denormalized snapshot on transactions | Fast display without joins | Stales on every rename; dashboard grouping breaks | Never acceptable once rename is a user feature — fix in Phase 10 |
| Rules stored as opaque JSON blobs in `condition_json`/`action_json` | Simple, schema-free condition extension | No FK constraints; merge orphans rules; hard to query for maintenance | Acceptable for condition extension if a scan-and-fix step is added to every mutation that touches categories |
| User rules require manual apply after import | Clean separation of concerns | UX expectation gap for users with established rules | Acceptable in v1.0 (no rules yet); unacceptable in v2.0 where rules are the main value |
| Search filter state lives in React component state only | Trivial to implement | Filter resets on every navigation; workflow friction | Acceptable for v1.0; should be addressed in Phase 9 before adding more filters |
| Budget rollover logic before core budgets proven | Solves an interesting problem | Adds complexity to period arithmetic before anyone uses basic budgets | Never in Phase 11 — defer rollover to Phase 12+ |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SQLite transaction + rule apply | Running rule matching inside the import transaction adds latency and can silently fail without surfacing a count | Run rule auto-apply as a separate step after `persistImportBatch` commits; report match count to the UI separately |
| Electron `ipcMain.handle` + synchronous better-sqlite3 | Long-running queries (regex match across 5,000 rows) block the main process and freeze the renderer | For any rule operation that scans the full transaction set, consider using a Worker thread or breaking into paged batches via IPC |
| `date-fns` + TEXT date storage | `parseISO` returns UTC midnight; `startOfMonth` applied to a local-time `Date` shifts the boundary | All period calculations must start from the stored sortable string, parse with `parseISO`, and serialize back with `format(date, 'yyyy-MM-dd')` — never round-trip through `new Date()` |
| Rule import/export + existing rules | Imported rules may have `action.categoryId` values that do not exist in the target installation | Rule import must validate every `categoryId` in the action against the local category list before persisting; unknown IDs must be flagged, not silently dropped |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full transaction scan for every rule preview | Rule preview takes 2–5 seconds; UI feels slow | Add SQLite index on `cleaned_description` for text search; for regex conditions use the existing in-memory filter on a paged result rather than scanning all rows on every keystroke | Noticeable at 2,000+ transactions; severe at 10,000+ |
| `findMatchingTransactions` loads all rows into memory | Memory spike when applying rules to large datasets | Already fetches all transactions (db.ts line 3065). For v2.0 scale (single household, ~5,000 rows/year) this is acceptable. Add a comment noting the threshold; revisit if multi-year data exceeds 20,000 rows | Not critical in v2.0 scope; monitor if Phase 13 adds multi-bank data |
| Budget variance query running on every render | Dashboard flicker; frequent IPC round-trips | Budget snapshot should be computed once per period boundary change, not per render. Cache the last computed period in a `budget_snapshots` table similar to the dashboard snapshot pattern | Immediately visible if naive — budget card re-queries on every transaction update |
| Category tree rebuilt on every category operation | UI lag when renaming/merging in a large category set | `listCategories()` is already called after every mutation. At ~20 categories this is fine. Do not add recursive path computation inside a transaction loop | Not a problem at expected scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| User regex patterns executed without sanitization | ReDoS denial-of-service — app hangs or crashes; no data exfiltration risk on local-only app, but UX destruction is equivalent | Validate patterns at save time with `re2` or `safe-regex`; never execute unsanitized user regex in the main process synchronously |
| Rule import accepting arbitrary `categoryId` values | Imported rules pointing to non-existent categories cause silent miscategorization or crashes | Validate all foreign-key references in imported rule JSON against the local DB before committing; reject unknown IDs with a clear error |
| Budget target amounts stored without validation | Negative budget targets or zero-division in variance calculations | Enforce `amountMinor > 0` constraint at the Zod schema layer before persistence; guard all variance calculations against divide-by-zero |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Filter state resets on navigation | User sets complex filter (5 criteria), navigates to a transaction detail, returns to find all filters cleared | Persist filter state in a React context or `app_settings` key so navigation within the app preserves the active filter |
| Batch review with no per-item feedback | User selects 20 items, 3 are already resolved; entire batch fails with a cryptic error | Pre-filter batch to pending-only; show "20 selected, 17 resolved, 3 skipped (already resolved)" in the result banner |
| Rule reorder UI implying explicit priority when specificity already handles it | User drags rules expecting the dragged rule to "win" but specificity score still determines precedence | Either expose specificity scores visibly in the rule list or remove drag-reorder entirely; never show drag handles if the ordering semantics are not drag-driven |
| Category rename not reflected in ledger filter chips | User renames "Food" to "Dining Out"; the ledger filter still shows "Food" from a cached list | Invalidate category option caches on every category mutation; re-fetch category list after any rename/merge operation |
| Budget screen before categories are stable | Adding budget targets while still merging/renaming categories creates confusing "budget for a category that no longer exists" states | Enforce a soft prerequisite: surface budget targets only when the category tree has been stable (no changes) for the current session |

---

## "Looks Done But Isn't" Checklist

- [ ] **Category merge:** Only transaction labels updated — verify rules pointing to source category are also repointed to target
- [ ] **Category rename:** Only `categories` table updated — verify all `imported_transactions.category_label` are regenerated
- [ ] **Batch review resolve:** Returns success — verify count in result matches selection count (not silently skipping items)
- [ ] **Rule import:** Rules saved to DB — verify every `action.categoryId` resolves to a live category before commit
- [ ] **Budget period variance:** Shows a number — verify with a February fixture (28 days) and a Dec 31 → Jan 1 boundary fixture
- [ ] **Auto-apply rules on import:** Rules trigger — verify the ordering is `is_system DESC, specificity_score DESC` (not insertion order)
- [ ] **Regex rule condition:** Saves and matches — verify a catastrophic backtracking pattern (`(a+)+b`) is rejected at save time, not at match time
- [ ] **Search filter persistence:** Survives navigation to transaction detail and back — verify filters are not cleared on screen transitions

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Category merge orphaned rules | MEDIUM | Write a one-time migration: scan all `categorization_rules`, find any whose `action_json.categoryId` no longer exists in `categories`, prompt user to re-assign each orphaned rule to a live category |
| Category label stale on transactions | LOW | Write a repair query: `UPDATE imported_transactions SET category_label = [recomputed_path] WHERE category_id = ?` for each affected category — safe, idempotent, no data loss |
| Batch review broke queue integrity | LOW | Items remain in `pending` state — re-expose them in the queue; no data is lost, only a UX disruption |
| Bad regex rule hangs app | MEDIUM | Force-quit Electron; on next launch the rule is already saved — must add a startup rule validation pass that detects and disables rules with patterns that exceed a complexity threshold; log a warning to the audit ledger |
| Budget period boundary miscalculation | HIGH | Incorrect variance totals may have been shown for days before detection; requires re-running period queries with the corrected boundary logic and comparing against the user's own bank records |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Category merge orphans rules | Phase 10 | Integration test: merge category that has a rule pointing to it; apply that rule; verify it assigns the target category |
| Category rename stales labels | Phase 10 | Integration test: rename a category; reload ledger; verify display names match the new name throughout |
| Batch review queue integrity | Phase 9 | Integration test: batch-resolve a list with one already-resolved item; verify pending items succeed and no error is thrown |
| ReDoS via user regex conditions | Phase 10 | Unit test: `(a+)+b` against a long string must return in under 100ms; must be rejected at save time |
| User rules not applied on import | Phase 10 (or Phase 9 if import flow is touched) | UAT: create two user rules, import a fresh statement, verify transactions matching those rules are automatically categorized |
| Budget period boundary arithmetic | Phase 11 | Parametric test suite for Feb (28/29 days), Dec 31 → Jan 1, and DST transition date |
| Filter state lost on navigation | Phase 9 | Manual: apply three filters, navigate to transaction detail, press back, verify all three filters are still active |
| Rule import with unknown categoryIds | Phase 10 | Integration test: import a rule JSON whose `action.categoryId` does not exist locally; verify import is rejected with a clear error, no partial write |

---

## Sources

- Codebase inspection: `src/main/persistence/db.ts` (lines 1804–1825 mergeCategory, 2519–2551 persistImportAttempt, 3080–3103 matchesRuleCondition)
- Codebase inspection: `src/shared/contracts/categories.ts` (CategorizationRuleActionSchema, MergeCategoryInputSchema)
- Codebase inspection: `src/renderer/features/transactions/TransactionFilterDrawer.tsx` (filter state in component props, no persistence)
- Codebase inspection: `src/renderer/App.tsx` (lines 27–50, handleGlobalShortcut — Ctrl+1–8)
- ReDoS attack patterns: OWASP ReDoS guidance (https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) — HIGH confidence established pattern
- date-fns DST and timezone arithmetic: date-fns docs (https://date-fns.org/docs/parseISO) — known issue with local-time Date construction
- Personal finance app category denormalization pattern: general SQLite snapshot design pattern with known stale-read risk

---
*Pitfalls research for: Walnut Expense Analyser v2.0 — adding workflow polish, rule system expansion, and budgeting foundations to existing v1.0 app*
*Researched: 2026-03-29*
