# Phase 6: Dashboard Analytics - Research

**Researched:** 2026-03-28
**Domain:** Local desktop analytics dashboards on Electron + React + SQLite
**Confidence:** HIGH

<user_constraints>
## User Constraints

### Locked Decisions
- Dashboard should be a hybrid layout: strong top summary row plus a dense analytics grid
- Above-the-fold order: date range controls, key summary cards, spend trend chart, category breakdown, top merchants, then lower widgets for recent transactions, recurring, and largest transactions
- Recent transactions should be a smaller preview, not a full ledger
- Dashboard should support compact behavior for smaller desktop windows
- Main spend widgets should count spending, ATM withdrawals, and credit-card payments
- Income vs expense should count refunds as income and exclude transfers
- Separate summary cards for transfers, refunds, ATM withdrawals, and credit-card payments should all appear in Phase 6
- Recurring detection should include both recurring debits and recurring credits
- Date controls should support presets, custom range, and remembered last selection
- "Vs previous period" should appear on key cards and charts
- Custom ranges should support optional comparison via toggle
- Widgets can have local controls in addition to the global range
- Clicking category/merchant/largest-transaction widgets should use widget-specific drill-down behavior
- Clicking recurring items should open a recurring-detail panel first
- Recent transactions preview should support click-through only
- Clicking a chart segment/bar should jump to the ledger with the relevant filters applied

### Claude's Discretion
- None provided beyond the locked decisions above.

### Deferred Ideas (OUT OF SCOPE)
- None provided in phase context.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard presents spend by category, spend trends, top merchants/payees, largest transactions, recurring charges, income-vs-expense summary, recent transactions, and separate summaries for transfers, cash withdrawals, refunds, and credit-card payments. | Repository-owned aggregate queries, Recharts widget stack, drill-down contract design, recurring heuristic guidance |
| DASH-02 | Dashboard supports week, month, year, all-time, and custom date-range analysis. | Global date-range model, `date-fns` interval helpers, persisted selection in `app_settings`, period-comparison rules |
| DASH-03 | Dashboard and transaction exploration feel near-instant on local datasets expected for release 1. | SQLite aggregate-first query pattern, multi-column index recommendations, React `startTransition` / `useDeferredValue`, no full-ledger hydration in renderer |
| DASH-04 | App supports both light and dark themes with a premium finance-dashboard presentation. | Reuse token-driven theming, compact responsive grid pattern, chart color/token rules, accessibility-ready chart configuration |
</phase_requirements>

## Summary

Phase 6 should extend the repo's existing pattern, not introduce a separate analytics subsystem. The right architecture is a repository-owned dashboard snapshot API in the main process, typed through shared contracts and exposed through preload, with the renderer responsible only for orchestration, local widget state, and drill-down navigation. The current codebase already follows that shape for imports, transactions, and categories, and Phase 6 should stay on that rail.

The core performance decision is to compute dashboard aggregates in SQLite and return small, purpose-built payloads. Do not fetch the full ledger into React and derive charts client-side. SQLite's query planner documentation is explicit that multi-column and covering indexes are how you get maximum performance for AND-filtered search and search+sort workloads, which is exactly what date-scoped dashboard widgets and ledger drill-downs need.

The standard ecosystem add for this phase is `recharts` for charts, while keeping existing React, Electron, `better-sqlite3`, `drizzle-orm`, `date-fns`, and `zod`. Recharts 3.x documents built-in accessibility support, synchronized charts via `syncId`, and responsive chart sizing; React's official docs still point to `startTransition` and `useDeferredValue` for interruptible background rendering, which is a better fit than ad hoc debounce-heavy UI code.

**Primary recommendation:** Build one typed `getDashboardSnapshot()` IPC route backed by aggregate SQL queries and render it with a compact, token-driven dashboard shell plus `recharts` 3.8.1.

## Project Constraints (from AGENTS.md)

- Use GSD phase flow rather than ad hoc execution when possible.
- Keep documentation current after every feature and bug fix.
- Maintain a full test pyramid for all implemented work.
- Prefer modular boundaries between domain logic, parsing, persistence, and UI so future web/mobile clients stay feasible.
- Release 1 is Windows desktop only.
- Core flows must work offline.
- Use local PIN unlock with recovery key, not web-style auth.
- Never retain uploaded statement files after parsing.
- Favor parsing correctness over aggressive guessing.
- User rules always override heuristics.
- Built-in categories are protected; user-created categories are manageable.
- Auditability and privacy are first-class requirements, not polish.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | Repo: `19.1.1`; npm latest verified: `19.2.4` on 2026-03-28 | Renderer UI and concurrent updates | Already in repo; official React guidance for heavy UI favors `startTransition` and `useDeferredValue` |
| Electron | Repo: `30.5.1`; npm latest verified: `41.1.0` on 2026-03-27 | Windows desktop shell and IPC boundary | Already in repo; Phase 6 should stay inside the existing desktop shell |
| better-sqlite3 | Repo: `11.8.1`; npm latest verified: `12.8.0` on 2026-03-14 | Local analytics execution in the main process | Fast sync SQLite access fits local-first desktop dashboards |
| drizzle-orm | Repo: `0.44.5`; npm latest verified: `0.45.2` on 2026-03-27 | Schema definitions and typed DB layer | Already defines schema; keep analytics queries in the same persistence layer |
| zod | Repo and npm latest verified: `4.3.6` on 2026-01-25 | Shared dashboard contracts and validation | Consistent with current `src/shared/contracts/*` pattern |
| date-fns | Repo and npm latest verified: `4.1.0` on 2025-08-03 | Date preset math, comparison windows, bucketing helpers | Already in repo; do not hand-roll date-range math |
| recharts | npm latest verified: `3.8.1` on 2026-03-25 | Spend trend, category, merchant, and comparison charts | Official docs expose accessibility, sync, and responsive chart behaviors needed here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Repo: `0.542.0`; npm latest verified: `1.7.0` on 2026-03-25 | Widget chrome and dashboard affordances | Keep existing icon set; no icon-library swap in this phase |
| Vitest | Repo: `3.2.4`; npm latest verified: `4.1.2` on 2026-03-26 | Repository and renderer verification | Use existing config; no test runner migration |
| Playwright | Repo: `1.55.0`; npm latest verified: `1.58.2` on 2026-03-28 | End-to-end dashboard flow coverage | Use for widget drill-down and range-selection journeys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `recharts` | `visx` | `visx` gives finer control but requires more low-level composition and more custom accessibility work |
| Main-process aggregate queries | Renderer-side derivation over `listTransactions()` | Simpler to start, but directly conflicts with near-instant analytics on larger local datasets |
| Persisting global dashboard filters in SQLite `app_settings` | Renderer-only `localStorage` | Faster to wire, but diverges from the real app architecture and does not persist through the actual desktop repository layer |

**Installation:**
```bash
npm.cmd install recharts
```

**Version verification:** Verified with local registry queries on 2026-03-28 using:
```bash
npm.cmd view react version time.modified
npm.cmd view electron version time.modified
npm.cmd view better-sqlite3 version time.modified
npm.cmd view drizzle-orm version time.modified
npm.cmd view zod version time.modified
npm.cmd view date-fns version time.modified
npm.cmd view recharts version time.modified
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
|-- main/
|   |-- ipc/                  # Add dashboard IPC registration
|   `-- persistence/          # Add aggregate queries and supporting indexes
|-- preload/
|   `-- index.ts              # Expose dashboard calls through WalnutApi
|-- renderer/
|   `-- features/dashboard/   # Dashboard screen, widgets, drill-down glue
`-- shared/
    `-- contracts/            # Dashboard request/response schemas
```

### Pattern 1: Repository-Owned Dashboard Snapshot
**What:** Add a dedicated dashboard contract and repository method such as `getDashboardSnapshot(input)` that returns summary cards, chart series, widget rows, and ledger drill-down payload seeds in one typed response.

**When to use:** Use for the global dashboard load and whenever the global date range or comparison toggle changes.

**Example:**
```ts
// Source pattern: existing typed contract + preload bridge flow in src/shared/contracts/app-state.ts and src/preload/index.ts
export const DashboardSnapshotQuerySchema = z.object({
  range: z.object({
    preset: z.enum(['week', 'month', 'year', 'all-time', 'custom']),
    from: z.string(),
    to: z.string()
  }),
  compare: z.object({
    enabled: z.boolean(),
    from: z.string().optional(),
    to: z.string().optional()
  }).optional()
})

export interface WalnutApi {
  getDashboardSnapshot: (input: DashboardSnapshotQuery) => Promise<DashboardSnapshot>
}
```

### Pattern 2: Aggregate in SQLite, Shape in TypeScript
**What:** Run grouped SQL for cards and charts in the repository, then do small final shaping in TypeScript before returning the payload.

**When to use:** Use for spend trend series, category totals, merchant rankings, recurring candidates, largest transactions, and previous-period comparisons.

**Example:**
```ts
// Source: https://www.sqlite.org/queryplanner.html and https://www.sqlite.org/windowfunctions.html
const rows = sqlite.prepare(`
  SELECT
    transaction_date_sortable AS day,
    SUM(CASE WHEN normalized_type = 'expense' THEN ABS(debit_amount_minor) ELSE 0 END) AS spend_minor,
    SUM(CASE WHEN normalized_type = 'refund' THEN ABS(credit_amount_minor) ELSE 0 END) AS refunds_minor
  FROM imported_transactions
  WHERE transaction_date_sortable BETWEEN ? AND ?
    AND review_state_override IS NOT 'pending-review'
  GROUP BY transaction_date_sortable
  ORDER BY transaction_date_sortable ASC
`).all(range.from, range.to)
```

### Pattern 3: Persist Global Range, Keep Widget Controls Local
**What:** Store the user's last global range and compare-toggle choice in `app_settings`; keep widget-local controls in component state unless they must survive app restarts.

**When to use:** Use for week/month/year/all-time/custom range selection and optional custom-range compare behavior.

**Example:**
```ts
// Source pattern: app_settings table in src/main/persistence/schema.ts
type PersistedDashboardPrefs = {
  preset: 'week' | 'month' | 'year' | 'all-time' | 'custom'
  from?: string
  to?: string
  compareEnabled: boolean
}
```

### Pattern 4: Drill Down by Emitting Ledger Filters, Not by Rebuilding the Ledger
**What:** Each interactive widget should emit a `TransactionLedgerQuery` plus a navigation target. Clicking a category slice, merchant row, or largest transaction should reuse the Phase 4 ledger screen instead of inventing a second detail table.

**When to use:** Use for category/merchant/largest-transaction/recent-transaction interactions and chart segment clicks.

**Example:**
```ts
// Source pattern: src/shared/contracts/transactions.ts
const toMerchantDrilldown = (merchant: string, from: string, to: string): TransactionLedgerQuery => ({
  search: merchant,
  dateFrom: from,
  dateTo: to
})
```

### Pattern 5: Keep Heavy UI Updates Interruptible
**What:** Use `startTransition` for non-urgent dashboard refreshes and `useDeferredValue` only where widget-local controls can momentarily lag without harming correctness.

**When to use:** Use when the dashboard rerenders multiple charts/tables after changing filters or compact layout state.

**Example:**
```tsx
// Source: https://react.dev/reference/react/startTransition
const refresh = async (nextQuery: DashboardSnapshotQuery) => {
  const snapshot = await window.walnut.getDashboardSnapshot(nextQuery)
  startTransition(() => {
    setSnapshot(snapshot)
  })
}
```

### Anti-Patterns to Avoid
- **One query per widget from the renderer:** causes avoidable loading waterfalls and repeated date/filter logic.
- **Full-ledger hydration for charts:** `listTransactions()` is the wrong primitive for the main dashboard surface.
- **Separate dashboard-only state store:** the repo already uses authoritative refetch-after-mutation patterns; keep Phase 6 aligned.
- **Widget logic coupled to chart libraries:** keep domain shaping in repository/contracts so widgets stay swappable.
- **Comparison math based on sign only:** business rules are type-driven here, not purely debit/credit driven.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG chart system | `recharts` 3.8.1 | Accessibility, responsive sizing, sync, tooltips, and click handling are already solved |
| Date preset and custom-range math | Ad hoc date arithmetic with `Date` objects | `date-fns` | Range boundaries and previous-period calculations are easy to get subtly wrong |
| Analytics over the full ledger in React | Renderer-side reducers over every transaction | SQLite aggregate queries in `WalnutRepository` | Better fit for near-instant local analytics and drill-down filters |
| Search+sort performance tuning | Trial-and-error query changes only | SQLite multi-column / covering indexes | Official SQLite guidance is explicit on index strategy for AND-filtered, ordered queries |
| Cross-widget navigation | Dashboard-specific detail tables everywhere | Existing Phase 4 `TransactionLedgerQuery` + navigation flow | Reuses trusted ledger/search behavior and avoids duplicate filtering logic |

**Key insight:** The dashboard's hard problems are not drawing bars and pies. They are correctness of money classification, date-window semantics, repeatable drill-down behavior, and keeping analytics payloads small enough that the UI always feels instant.

## Common Pitfalls

### Pitfall 1: Counting by sign instead of normalized type
**What goes wrong:** Refunds, transfers, ATM withdrawals, and credit-card payments land in the wrong cards or comparisons.
**Why it happens:** The raw data has debit/credit directions, but the product rules are type-based.
**How to avoid:** Build every summary from `normalized_type` first, then use debit/credit values only for amount extraction.
**Warning signs:** Refunds reduce expense instead of showing up as income; transfers appear in income-vs-expense.

### Pitfall 2: Using `listTransactions()` as the dashboard backend
**What goes wrong:** The dashboard feels fast on fixtures and degrades once the local dataset grows.
**Why it happens:** Full-row hydration and renderer-side grouping do unnecessary work.
**How to avoid:** Add dedicated aggregate repository methods and indexes for dashboard workloads.
**Warning signs:** Filter changes re-render slowly; charts block interactions; main process stays idle while renderer churns.

### Pitfall 3: Comparison windows drift on custom ranges
**What goes wrong:** "Vs previous period" looks plausible but compares the wrong dates.
**Why it happens:** Previous-period math is often implemented as calendar-month shortcuts instead of "same duration immediately before."
**How to avoid:** For custom ranges, compute comparison windows by duration, with the compare toggle explicitly controlling whether comparison exists.
**Warning signs:** A 17-day custom range compares against a full month or a mismatched week.

### Pitfall 4: Recurring detection is too fuzzy
**What goes wrong:** One-off merchants appear recurring, or true recurring credits are missed.
**Why it happens:** Narrative-only matching and loose amount tolerances overfit noisy bank descriptions.
**How to avoid:** Use deterministic candidates keyed on cleaned description + normalized type + cadence bucket + bounded amount tolerance, and expose the result as a "candidate" panel first.
**Warning signs:** ATM sequences, credit-card bill runs, or salary payments disappear or show obvious false positives.

### Pitfall 5: Compact desktop behavior gets handled only with CSS shrinkage
**What goes wrong:** Charts become unreadable and interaction targets collapse in smaller windows.
**Why it happens:** The current shell has a desktop minimum width, but Phase 6 explicitly needs compact behavior inside that range.
**How to avoid:** Define compact widget variants and a grid that collapses panels intentionally rather than letting charts auto-compress indefinitely.
**Warning signs:** Legend overlap, clipped labels, scroll traps, or unusable tooltip hover targets.

## Code Examples

Verified patterns from official sources:

### Accessible, synchronized chart wiring
```tsx
// Source: https://recharts.github.io/en-US/api/BarChart/
<BarChart
  data={series}
  syncId="dashboard-period"
  accessibilityLayer
  role="img"
  onClick={(state) => state?.activeLabel && onBarClick(state.activeLabel)}
>
  <XAxis dataKey="label" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="amountMinor" radius={[10, 10, 0, 0]} />
</BarChart>
```

### Interruptible dashboard refresh
```tsx
// Source: https://react.dev/reference/react/useDeferredValue
const deferredMerchantFilter = useDeferredValue(merchantFilter)

useEffect(() => {
  void refresh({
    ...query,
    merchantFilter: deferredMerchantFilter || undefined
  })
}, [deferredMerchantFilter, query])
```

### Search-and-sort index shape for ledger drill-down
```sql
-- Source: https://www.sqlite.org/queryplanner.html
CREATE INDEX IF NOT EXISTS idx_transactions_date_type_category
ON imported_transactions (
  transaction_date_sortable,
  normalized_type,
  category_id
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Debounce-heavy UI to hide slow rerenders | React official guidance uses `startTransition` and `useDeferredValue` for interruptible background rendering | Current official React docs as of 2026-03-28; pattern established in React 18+ and still current in React 19 | Keep filter interactions responsive without hiding correctness behind timers |
| Custom chart accessibility and hand-linked widgets | Recharts 3 docs expose `accessibilityLayer`, `role`, and `syncId` on chart components | Present in current Recharts 3.8.1 docs on 2026-03-28 | Phase 6 can ship accessible, linked widgets without building chart plumbing from scratch |
| Renderer owns most analytics derivation | Desktop local apps increasingly push aggregation into SQLite and return small view models | Current repo fit plus official SQLite planner guidance | Better matches offline desktop performance and keeps business rules in one place |

**Deprecated/outdated:**
- Renderer-only derivation of all dashboard cards from a fetched ledger array: outdated for this phase because it duplicates filter semantics and wastes render budget.
- Treating refunds as "negative spend" everywhere: outdated for this product because the locked decision explicitly counts refunds as income.
- Recharts-by-example without explicit accessibility props: outdated because current docs document `accessibilityLayer` and `role`.

## Open Questions

1. **Recurring candidate thresholds**
   - What we know: recurring debits and credits are both in scope, and the first interaction is a recurring-detail panel.
   - What's unclear: exact cadence windows and allowed amount variance for a "candidate".
   - Recommendation: plan deterministic thresholds and mark them configurable in code constants, not user settings, for Phase 6.

2. **Persistence scope for remembered dashboard range**
   - What we know: the last global range must be remembered.
   - What's unclear: whether that should be global app state or active-profile state.
   - Recommendation: persist per active profile in `app_settings` naming or a profile-scoped settings row so future multi-profile work does not have to unwind a global preference.

3. **Do we need precomputed analytics tables?**
   - What we know: release-1 datasets are local and modest, and the repo already uses direct SQLite reads.
   - What's unclear: exact performance ceiling after adding Phase 6 aggregate queries.
   - Recommendation: start with indexed on-demand queries and only add materialized summaries if profiling shows real regressions.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, Vitest, Playwright, package scripts | Yes | `v22.16.0` | None |
| npm | Package install and scripts | Yes | `10.9.2` via `npm.cmd` | `npx` for targeted runs |
| Git | Docs commit workflow | Yes | `2.49.0.windows.1` | None |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` in repo, Playwright `1.55.0` in repo |
| Config file | [`vitest.config.ts`](/f:/BitBytes/github/walnut-expense-analyser/vitest.config.ts), [`playwright.config.ts`](/f:/BitBytes/github/walnut-expense-analyser/playwright.config.ts) |
| Quick run command | `npx vitest run tests/unit/dashboard*.test.ts tests/unit/dashboard*.test.tsx` |
| Full suite command | `npm.cmd run test:unit && npm.cmd run test:e2e` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Dashboard renders summary cards, trend/category/merchant widgets, recent/largest/recurring sections, and drill-down actions | unit + e2e | `npx vitest run tests/unit/dashboard-screen.test.tsx` | No - Wave 0 |
| DASH-02 | Presets, custom range, comparison toggle, and remembered selection work correctly | unit | `npx vitest run tests/unit/dashboard-range-state.test.ts` | No - Wave 0 |
| DASH-03 | Aggregate queries and drill-down filters stay fast and correct on realistic local data | unit | `npx vitest run tests/unit/dashboard-repository.test.ts` | No - Wave 0 |
| DASH-04 | Light/dark tokens and compact window behavior remain usable and intentional | e2e | `npx playwright test tests/e2e/dashboard-analytics.spec.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/dashboard*.test.ts tests/unit/dashboard*.test.tsx`
- **Per wave merge:** `npm.cmd run test:unit`
- **Phase gate:** `npm.cmd run test:unit && npx playwright test tests/e2e/dashboard-analytics.spec.ts`

### Wave 0 Gaps
- [ ] `tests/unit/dashboard-repository.test.ts` - aggregate cards, trends, category/merchant rankings, recurring candidates, and drill-down query payloads
- [ ] `tests/unit/dashboard-range-state.test.ts` - preset math, custom compare windows, and remembered selection persistence
- [ ] `tests/unit/dashboard-screen.test.tsx` - widget layout, compact mode, loading states, and widget interaction routing
- [ ] `tests/e2e/dashboard-analytics.spec.ts` - global range changes, chart click-through, recurring-detail panel, and ledger handoff

## Sources

### Primary (HIGH confidence)
- Official React docs: https://react.dev/reference/react/startTransition - current transition guidance
- Official React docs: https://react.dev/reference/react/useDeferredValue - interruptible deferred rendering guidance
- Official Recharts docs: https://recharts.github.io/en-US/api/BarChart/ - accessibility, click events, `syncId`
- Official Recharts docs: https://recharts.github.io/en-US/api/ComposedChart/ - synchronized categorical chart behavior
- Official Recharts docs: https://recharts.github.io/en-US/api/ResponsiveContainer/ - responsive sizing guidance
- Official SQLite docs: https://www.sqlite.org/queryplanner.html - multi-column and covering index guidance
- Official SQLite docs: https://www.sqlite.org/windowfunctions.html - window-function support for analytics shaping
- Local npm registry verification via `npm.cmd view` on 2026-03-28 for `react`, `electron`, `better-sqlite3`, `drizzle-orm`, `zod`, `date-fns`, `recharts`, `vitest`, `@playwright/test`
- Repo source: [`src/main/persistence/db.ts`](/f:/BitBytes/github/walnut-expense-analyser/src/main/persistence/db.ts) - existing repository and index patterns
- Repo source: [`src/preload/index.ts`](/f:/BitBytes/github/walnut-expense-analyser/src/preload/index.ts) - typed preload bridge pattern
- Repo source: [`src/shared/contracts/app-state.ts`](/f:/BitBytes/github/walnut-expense-analyser/src/shared/contracts/app-state.ts) - current Walnut API contract pattern
- Repo source: [`src/shared/contracts/transactions.ts`](/f:/BitBytes/github/walnut-expense-analyser/src/shared/contracts/transactions.ts) - ledger drill-down contract shape

### Secondary (MEDIUM confidence)
- None needed for critical recommendations.

### Tertiary (LOW confidence)
- Deterministic recurring-candidate heuristics are recommended from product/domain fit and current codebase shape, not from a single official standard.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - built mostly from the existing repo plus current official React/Recharts/SQLite docs and verified package versions
- Architecture: HIGH - directly aligned with established repo boundaries in main/preload/shared/renderer and reinforced by SQLite/React official guidance
- Pitfalls: MEDIUM - strongest pitfalls are repo- and finance-domain-specific, though they are supported by locked product rules and current architecture

**Research date:** 2026-03-28
**Valid until:** 2026-04-27
