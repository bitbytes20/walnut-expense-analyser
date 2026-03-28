# Phase 06 Context - Dashboard Analytics

## Phase Goal

Turn trusted imported, reviewed, searchable, and categorized local transaction data into a premium dashboard that helps the household quickly understand spending patterns, top spend areas, trends, recurring activity, and cash flow.

## Requirement Mapping

- `DASH-01`: Dashboard presents spend by category, spend trends, top merchants/payees, largest transactions, recurring charges, income-vs-expense summary, recent transactions, and separate summaries for transfers, cash withdrawals, refunds, and credit-card payments.
- `DASH-02`: Dashboard supports week, month, year, all-time, and custom date-range analysis.
- `DASH-03`: Dashboard and transaction exploration feel near-instant on local datasets expected for release 1.
- `DASH-04`: App supports both light and dark themes with a premium finance-dashboard presentation.

## Locked Product Decisions

### Layout and Composition
- Dashboard should be a hybrid layout: a strong top summary row plus a dense analytics grid.
- Above-the-fold order should be:
  - date range controls
  - key summary cards
  - spend trend chart
  - category breakdown
  - top merchants
  - lower widgets for recent transactions, recurring, and largest transactions
- Recent transactions should be a smaller preview, not a full ledger.
- Dashboard should support compact behavior for smaller desktop windows from day one.

### Metrics and Aggregation
- Main spend widgets should count spending, ATM withdrawals, and credit-card payments.
- Income vs expense should count refunds as income and exclude transfers.
- Separate summary cards for transfers, refunds, ATM withdrawals, and credit-card payments should all appear in Phase 6.
- Recurring detection should include both recurring debits and recurring credits.

### Time Controls and Comparisons
- Dashboard should support quick presets, custom range picker, and remembered last selection.
- “Vs previous period” should appear on key summary cards and charts.
- Custom ranges should support optional comparison via toggle.
- Widgets may have local controls in addition to the global date range.

### Drill-Down Behavior
- Category, merchant, and largest-transaction widgets may use widget-specific drill-down behavior.
- Clicking recurring items should open a recurring-detail panel first.
- Recent transactions preview should support click-through only.
- Clicking a chart segment or bar should jump to the Transactions workspace with relevant filters applied.

## Technical Direction

- Keep the existing `main -> preload -> shared contracts -> renderer` architecture.
- Add a repository-owned dashboard snapshot API rather than widget-by-widget renderer fetches.
- Compute dashboard aggregates in SQLite with targeted indexes.
- Reuse `TransactionLedgerQuery` for drill-down into the ledger instead of inventing a parallel detail flow.
- Keep the dashboard math type-driven and consistent with the normalized transaction model from earlier phases.

## Risks to Respect

- Do not compute dashboard analytics by hydrating the full transaction list into the renderer.
- Do not let dashboard math drift from the Phase 4 and Phase 5 transaction/category foundations.
- Do not turn the dashboard into a second ledger or a report-builder.
- Do not let compact-mode responsiveness become a post-hoc CSS patch; it must be part of the phase design.

## Out of Scope

- AI summaries and narrative insight text
- Audit-screen expansion
- Additional banks or account expansion
- Saved dashboard views
- Budgeting and forecast features

## Execution Bias

- Prioritize correctness and speed of aggregate math before chart polish.
- Prefer one cohesive dashboard snapshot payload with small widget-local overrides.
- Preserve Walnut’s current shell, token system, and theme model.
