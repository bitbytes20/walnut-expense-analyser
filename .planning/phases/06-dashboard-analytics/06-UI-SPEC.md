---
phase: 06
slug: dashboard-analytics
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-28
reviewed_at: 2026-03-28
---

# Phase 06 - UI Design Contract

> Visual and interaction contract for frontend phases. Generated from locked Phase 6 decisions and approved for planning.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | lucide |
| Font | Manrope |

Manual token contract inherited from `src/renderer/styles/tokens.css`. Preserve the current React + Vite renderer, inline style composition, token names, and light/dark theme behavior. Do not introduce shadcn, Tailwind, or a second component system in this phase.

---

## Dashboard Workspace Contract

### Primary Screen
- Keep `Dashboard` as a first-class destination in the existing left rail.
- Replace the current empty-state-first dashboard with a live analytics workspace once data exists.
- The dashboard should feel like a premium finance board grounded in Walnut's current shell, not a generic BI screen and not a toy card collage.
- The page should use a hybrid structure: a strong top summary row followed by a dense but readable analytics grid.

### Above-the-Fold Layout
- The top scan order should be:
  - global date range controls
  - key summary cards
  - spend trend chart
  - category breakdown
  - top merchants
- Below the fold or lower in the page, place:
  - recent transactions preview
  - recurring items
  - largest transactions
  - separate type summary cards for transfers, refunds, ATM withdrawals, and credit-card payments
- The top of the page should immediately answer:
  - how much came in
  - how much went out
  - what changed versus the previous period
  - where the money went

### Summary Card Contract
- The key summary row should feel fast and scannable before any chart reading is required.
- Summary cards should support comparison language against the previous period.
- Income-vs-expense math must:
  - count refunds as income
  - exclude transfers
- Separate operational summary cards must exist for:
  - transfers
  - refunds
  - ATM withdrawals
  - credit-card payments
- These operational cards should read as supporting context, not compete visually with the main top-row financial summary.

### Trend and Breakdown Widgets
- The spend trend chart is the primary visual anchor below the summary row.
- Category breakdown and top merchants should remain visible without requiring local navigation away from the page.
- Main spend widgets must count:
  - spending
  - ATM withdrawals
  - credit-card payments
- The category and merchant surfaces should feel analytical and actionable, not decorative.

### Recurring and Recent Widgets
- Recurring detection should include both recurring debits and recurring credits.
- Recurring items should present pattern confidence and timing clearly enough that a user understands why the item appears.
- Recent transactions should remain a small preview only, not a second ledger.
- The recent transactions block should be visually lighter than the primary analytics widgets and function as a jump-off point into the Transactions workspace.

### Drill-Down Behavior
- Clicking a chart segment or chart bar should jump to the Transactions workspace with the relevant filters pre-applied.
- Category, merchant, and largest-transaction widgets may use widget-specific drill-down behavior, but they must preserve user orientation.
- Clicking a recurring item should open a recurring-detail panel first, not immediately navigate away.
- Recent transactions preview supports click-through only.
- Drill-down interactions must feel like a continuation of analysis, not a context reset.

### Global and Local Controls
- The dashboard must support:
  - quick presets
  - custom date range
  - remembered last global range
  - optional compare toggle for custom ranges
- Global date controls should anchor the page.
- Individual widgets may expose local controls when needed, but local controls must not visually overpower the shared dashboard range.
- If a widget has a local control, it should be obvious whether it is using global range, local override, or comparison mode.

### Compact Mode
- The dashboard must support a compact mode for smaller desktop windows from day one.
- Compact mode should reflow the analytics grid, reduce panel density, and preserve the top summary without clipping or hidden critical actions.
- Compact mode may stack widgets sooner, but it must preserve:
  - summary row visibility
  - trend chart legibility
  - easy access to category and merchant insights
- Avoid hidden overflow traps and avoid relying on giant fixed-width cards.

### Visual Focal Points
- The eye should land first on the summary row, then the trend chart, then the category/merchant area.
- Recent transactions and recurring activity should support the story told by the top half of the page, not disrupt it.
- Supporting operational cards for transfers/refunds/ATM/card payments should live in a lower-priority region with consistent rhythm and alignment.

---

## State and Feedback Contract

- Dashboard loading should feel structured, with placeholder regions that match the final widget layout rather than a generic spinner.
- Empty analytics states must clearly distinguish between:
  - no imported data yet
  - data exists but nothing matches the selected filters/range
- Comparison messaging must stay understandable for both preset and custom ranges.
- When a widget is locally filtered or uses local controls, the state must be visible in its header or control chrome.
- Drill-down actions should make it clear that Walnut is opening the Transactions workspace with scoped filters.
- Widget-level errors should preserve the rest of the dashboard instead of blanking the whole screen.

### Empty States
- Dashboard empty state heading: `Your dashboard is ready`
- Dashboard empty state body: `Import statements to start tracking spend trends, top merchants, recurring activity, and household cash flow.`
- Filtered-empty heading: `No transactions match this view`
- Filtered-empty body: `Try a different date range, remove a filter, or switch off comparison to widen the results.`
- Recurring-empty heading: `No recurring patterns yet`
- Recurring-empty body: `Walnut will surface repeating debits and credits once enough matching activity exists in the selected range.`

### Keyboard Contract
- `Tab` and `Shift+Tab` must traverse dashboard controls in a predictable top-to-bottom order.
- Date range presets, comparison toggle, and widget-local controls must be fully keyboard reachable.
- `Enter` on chart legends, category rows, merchant rows, and recent-transaction rows should trigger their drill-down action.
- `Esc` should close any recurring-detail or secondary in-dashboard panel without losing the current dashboard state.
- Compact mode must preserve keyboard order and not create unreachable hidden controls.

---

## Component Inventory

- `Dashboard workspace header`
- `Global date preset group`
- `Custom date range picker`
- `Comparison toggle`
- `Primary summary card row`
- `Operational summary card row`
- `Spend trend chart`
- `Category breakdown widget`
- `Top merchants widget`
- `Largest transactions widget`
- `Recurring activity widget`
- `Recurring detail panel`
- `Recent transactions preview`
- `Dashboard loading skeleton set`
- `Compact-mode widget stack`

Use the established Walnut surface language: large rounded panels, restrained accent emphasis, readable density, and clear scan order over decorative noise.

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline comparison deltas, chart legends, metadata markers |
| sm | 8px | Chip gaps, compact controls, small widget metadata |
| md | 16px | Standard card spacing, widget internals, compact mode gutters |
| lg | 24px | Widget padding, chart spacing, section rhythm |
| xl | 32px | Major layout gutters and dashboard row separation |
| 2xl | 48px | Large breathing room between major dashboard bands |

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 32px | 600 | 1.1 |

Use sentence case throughout. Reserve display size for the page heading and the most important summary metrics only.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F5F1E8 | Page background, dashboard canvas, large neutral surfaces |
| Secondary (30%) | #E2D7C5 | Widget surfaces, local-control regions, supporting cards |
| Accent (10%) | #0F766E | Active controls, selected presets, positive/emphasized financial signals |
| Contrast Accent | #1F2937 | Primary chart text, headings, dense analytical content |

Keep the current Walnut palette and avoid introducing a new theme family for charts. Use the existing accent and neutral system to create hierarchy instead of adding unrelated dashboard colors.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Dashboard heading | Dashboard |
| Empty state heading | Your dashboard is ready |
| Filtered-empty heading | No transactions match this view |
| Recurring-empty heading | No recurring patterns yet |
| Drill-down helper copy | Open in Transactions |
| Compare toggle label | Compare with previous period |

Microcopy rules:
- Lead with clarity and financial trust, not hype.
- Prefer `spend`, `credited`, `debited`, `trend`, `compare`, `recurring`, `top merchants`, and `open in transactions`.
- Avoid `AI`, `smart`, `magic`, `predicted`, or language that implies opaque reasoning.
- Comparison text should be short and literal.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved
