# Technology Stack — v2.0 Delta

**Project:** Walnut Expense Analyser v2.0 (Release 2: Core)
**Researched:** 2026-03-29
**Scope:** Stack additions and changes for new features only. Existing stack (Electron, React 19, TypeScript, SQLite via better-sqlite3, Drizzle ORM, Vitest, Zod, date-fns, recharts, lucide-react) is validated and not re-evaluated here.

---

## Decision Summary

**Add exactly one new runtime dependency:** `react-hotkeys-hook`
**Add exactly one new dev/utility dependency:** `safe-regex2` (used in main process at save-time, not shipped as renderer dep)
**Leverage existing stack more deeply:** Zod, date-fns, drizzle-orm, recharts, better-sqlite3's `ensureColumn` pattern
**Do not add:** fuzzy search library, headless UI component library, charting library, form library

---

## New Dependencies

### `react-hotkeys-hook` — Keyboard-Driven Workflow Polish

| Attribute | Value |
|-----------|-------|
| Package | `react-hotkeys-hook` |
| Current version | 5.2.4 (as of 2026-03-29) |
| Install as | Runtime dependency (`dependencies`) |
| Confidence | MEDIUM — confirmed active, v5 current via search; npm page returned 403 during fetch verification |

**Why needed:** v1.0 keyboard shortcuts are wired with raw `window.addEventListener('keydown', ...)` calls scattered across `App.tsx`, `SettingsScreen.tsx`, and `ImportWorkspace.tsx`. This approach works for global nav shortcuts (Ctrl+1-8) but becomes problematic as v2.0 adds per-screen action shortcuts (e.g. Escape to close panels, Enter to confirm review, `/` to focus search, `n` to create rule). Raw listeners do not compose cleanly — multiple useEffect registrations share no awareness of each other, and focus-scope (only fire when a component is mounted and focused) requires manual plumbing.

`react-hotkeys-hook` provides `useHotkeys(keys, callback, options)` with built-in focus-scoping via a ref, hotkey groups/scopes, and automatic mount/unmount cleanup. It is the standard hook for this pattern in React.

**Why not keep raw listeners:** Adding 6-8 more screen-level shortcuts in v2.0 via raw `addEventListener` will produce difficult-to-debug listener collisions, especially between the review queue, rule editor panel, and transactions ledger, which are all simultaneously mounted in some flows.

**Why not global Electron accelerators:** `globalShortcut` fires even when the app window is not focused. These are per-component, per-screen shortcuts that must respect UI state (e.g. `/` should only focus search when the ledger is active).

**Integration:** Renderer only. Drop-in alongside existing `useEffect` shortcuts. Existing `App.tsx` global nav shortcuts (Ctrl+1-8) can be kept as-is or migrated incrementally — they work fine as global hooks.

```bash
npm install react-hotkeys-hook
```

---

### `safe-regex2` — ReDoS Protection for User-Authored Regex

| Attribute | Value |
|-----------|-------|
| Package | `safe-regex2` |
| Current version | 5.1.0 (as of 2026-03-29, maintained by Fastify team) |
| Install as | Runtime dependency (`dependencies`) — called in main process at rule-save time |
| Confidence | MEDIUM — confirmed current version and active maintenance via search |

**Why needed:** v2.0 adds regex pattern support to rule conditions (matching transaction descriptions by regex rather than keyword substring). User-authored regex runs against every transaction on every rule-apply pass. A catastrophic backtracking pattern (e.g. `(a+)+$`) applied to long narration strings will block the Node.js main process synchronously in better-sqlite3's synchronous execution model, freezing the app.

`safe-regex2` takes a regex string and returns `true` if it passes a safety heuristic, `false` if it exhibits exponential backtracking risk. This is not perfect — it has documented false positives and false negatives — but it is the right lightweight defence for user-authored patterns. The strategy is: reject patterns flagged as unsafe at save time with a clear error message, rather than attempting runtime timeouts.

**Why not a worker thread timeout:** better-sqlite3 is synchronous and does not yield. A regex executing inside a SQLite user-defined function or a JS filter loop cannot be interrupted by a timeout. Prevention at save time is the only safe approach.

**Why not `safe-regex` (original):** The original is unmaintained. `safe-regex2` is the Fastify-maintained fork, actively updated (last publish 11 days before this research).

**Integration:** Main process only. Validate on `createRule` and `updateRule` IPC handlers before persisting to DB. Not imported in renderer.

```bash
npm install safe-regex2
```

---

## Existing Stack — Deeper Leverage

### Zod — Already in use, already v4

The project is already on Zod `^4.3.6`. Zod v4 ships in the current `package.json`. For v2.0:

- Add `z.string().regex(...)` validators for the new regex condition field on `CategorizationRuleConditionSchema`. The regex field stores the pattern as a string; Zod validates the string is non-empty and parseable via `new RegExp(value)` at schema parse time. safe-regex2 adds the safety check on top.
- Extend `CategorizationRuleConditionSchema` with `descriptionMatchesRegex: z.string().optional()`.
- Add new budget schemas (`BudgetTargetSchema`, `BudgetPeriodSchema`, `BudgetVarianceSchema`) following the exact same pattern used for dashboard and transaction contracts.

No version bump needed. Zod v4 is already present and the v3→v4 migration is already done.

**Confidence:** HIGH — package.json shows `"zod": "^4.3.6"`.

---

### date-fns — Already in use v4, has all budget period utilities

The project already uses `date-fns@^4.1.0` in the main process (`db.ts` imports `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`, `format`, `parseISO`, `addDays`, `subDays`, `differenceInCalendarDays`).

For v2.0 budget periods:
- `startOfMonth` / `endOfMonth` — already imported, compute monthly period boundaries
- `eachMonthOfInterval` — enumerate months in an annual budget
- `isSameMonth` — match a transaction date to a budget target period
- All available in the existing dependency, no new import needed

**Confidence:** HIGH — confirmed via direct source file read.

---

### drizzle-orm + better-sqlite3 — Schema extension via ensureColumn pattern

The project already has a working `ensureColumn(tableName, columnName, definition)` method in `db.ts` that checks `PRAGMA table_info` and issues `ALTER TABLE ... ADD COLUMN` if absent. This is the correct migration strategy for this app's embedded SQLite model (no drizzle-kit migration runner is invoked at runtime).

For v2.0 schema additions:

**Schema file (`schema.ts`) additions:**

```typescript
// Rule condition extension (regex field)
// Add to existing categorizationRules: descriptionMatchesRegex TEXT

// New budget tables
export const budgetTargets = sqliteTable('budget_targets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull(),
  periodType: text('period_type').notNull(),   // 'monthly' | 'annual'
  periodKey: text('period_key').notNull(),      // 'YYYY-MM' or 'YYYY'
  targetAmountMinor: integer('target_amount_minor').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
```

`periodKey` as a string (`'2026-03'` for monthly, `'2026'` for annual) avoids date arithmetic complexity and makes SQL WHERE clauses trivial: `WHERE period_type = 'monthly' AND period_key = '2026-03'`.

**Migration:** Call `ensureColumn` for the new `description_matches_regex` column on `categorization_rules`. For the new `budget_targets` table, use `CREATE TABLE IF NOT EXISTS` in the initialise block (same pattern used for all existing tables).

**Confidence:** HIGH — confirmed via direct source read of `db.ts` and `schema.ts`.

---

### recharts — Budget variance visualisation

The project already uses `recharts@^3.8.1` for dashboard charts. For budgeting:
- A simple `BarChart` with two bars per category (target vs actual) is sufficient for variance reporting.
- `ReferenceLine` can mark the target threshold on a spend bar.
- No new version or additional charting library needed.

**Confidence:** HIGH — confirmed in `package.json`.

---

### lucide-react — Already provides all needed icons

Already at `^0.542.0`. Relevant icons for new features that are available in current lucide-react:
- `Target` — budget target
- `TrendingUp` / `TrendingDown` — variance direction
- `AlertCircle` — over-budget warning
- `Regex` — regex toggle in rule editor (added in lucide ~0.400)
- `Search` — search focus affordance
- `CheckCheck` — bulk review confirm

No upgrade needed.

**Confidence:** HIGH — confirmed package.json version; lucide-react icon availability inferred from known library scope (MEDIUM for specific icon names — verify at implementation time).

---

## Explicitly Rejected Additions

### Fuzzy Search Library (fuse.js, minisearch)

**Rejected.** The transaction ledger search already works against SQLite via a `LIKE`-based description search in the main process. The correct v2.0 improvement is to extend the SQLite query to support `GLOB` patterns or FTS5 full-text search — both are built into SQLite and require no new dependency. Adding a client-side fuzzy search library means hydrating all transactions into the renderer just to search them, which is the wrong architecture for a local desktop app with potentially thousands of rows.

**Use instead:** SQLite `FTS5` virtual table extension (built into better-sqlite3's bundled SQLite) or enhanced `LIKE '%term%'` across multiple fields. FTS5 tokenizes descriptions and supports prefix queries. This is zero-dependency and works in the existing IPC call pattern.

### Headless UI / Radix UI (for combobox/command palette)

**Rejected.** The existing style approach is custom inline-style React components (no CSS framework). Adding a headless component library introduces a style contract mismatch and requires adapting to a different component model. The existing `TransactionFilterDrawer` and `RuleEditorPanel` are custom and consistent. The search ergonomics improvement in v2.0 is about keyboard behaviour (focus, Escape, arrow keys) and filtering speed — both achievable with `react-hotkeys-hook` focus management and SQLite query improvements without a new component system.

### Form Library (React Hook Form, Formik)

**Rejected.** The rule editor, budget target editor, and category editor are all single-panel forms with 4-8 fields. They use controlled `useState` per field, which is already established throughout the codebase. Introducing a form library for this scope is over-engineering. Zod is already handling validation.

### Date Picker Component Library

**Rejected.** Budget target period selection is a month/year picker (not a full date range picker). A custom `<select>` for month + year is simpler, more consistent with the existing UI, and avoids adding a dependency for a single use case.

---

## Installation Summary

```bash
# New runtime dependencies
npm install react-hotkeys-hook safe-regex2
```

No devDependency additions. No version bumps to existing packages required.

---

## Integration Points by Feature

| Feature Area | Library/Pattern | Specific Use |
|---|---|---|
| Keyboard-driven review throughput | `react-hotkeys-hook` useHotkeys | Escape closes panels, Enter confirms, Arrow keys navigate review queue |
| Search focus ergonomics | `react-hotkeys-hook` useHotkeys + ref | `/` key focuses search input on transactions and categories screens |
| Regex rule conditions | `safe-regex2` (main process) + Zod regex field | Validate at save, store as string, execute via JS `.test()` in filter logic |
| Budget table storage | `drizzle-orm` + `better-sqlite3` schema extension | New `budget_targets` table, `ensureColumn` for `categorization_rules` extension |
| Budget period arithmetic | `date-fns` (already imported) | `startOfMonth`, `endOfMonth`, `eachMonthOfInterval` |
| Budget variance charts | `recharts` (already imported) | `BarChart` with target/actual bars per category |
| Multi-condition rule UI | Existing React controlled state + Zod | Extend existing `RuleEditorPanel.tsx` with additional condition rows |
| Category merge safety | Existing drizzle query layer | Add pre-merge transaction count check before allowing merge |

---

## Sources

- `package.json` — confirmed existing dependency versions (HIGH confidence)
- `src/main/persistence/db.ts` — confirmed `ensureColumn` pattern, existing date-fns imports (HIGH confidence)
- `src/main/persistence/schema.ts` — confirmed existing table structure (HIGH confidence)
- `src/renderer/App.tsx` — confirmed raw addEventListener approach for current shortcuts (HIGH confidence)
- [react-hotkeys-hook docs](https://react-hotkeys-hook.vercel.app/) — v5.0 current, basic usage confirmed (MEDIUM confidence)
- [safe-regex2 GitHub](https://github.com/fastify/safe-regex2) — v5.1.0, Fastify-maintained fork (MEDIUM confidence)
- [Zod v4 changelog](https://zod.dev/v4/changelog) — confirmed v4 features in use (HIGH confidence)
- WebSearch: react-hotkeys-hook v5.2.4 latest, safe-regex2 v5.1.0 latest (MEDIUM confidence — npm page 403'd, sourced from search snippets)
