---
phase: 04
slug: transaction-ledger-and-search
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-28
reviewed_at: 2026-03-28
---

# Phase 04 - UI Design Contract

> Visual and interaction contract for frontend phases. Generated from locked Phase 4 decisions and approved for planning.

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

## Transactions Workspace Contract

### Primary Screens
- Add a dedicated `Transactions` destination to the existing left rail.
- Keep the transactions workspace inside the current Walnut shell, not in a detached modal or utility window.
- The primary visual anchor of the page is the ledger itself, not surrounding hero copy or large empty-state panels.

### Ledger Surface
- The default ledger is dense, row-first, and finance-oriented.
- Default columns are `Date`, `Description`, `Amount`, `Type`, and `Tags`.
- Sort newest first by default.
- Do not group rows by default.
- Category, reference, source-batch context, and review metadata should stay out of the default row surface and appear in the drawer.

### Search and Filters
- The primary header control is a single search input for quick narrowing.
- Search covers description, reference, and tags.
- Advanced filters open from a dedicated drawer or side panel.
- Phase 4 filters are `date range`, `type`, `amount range`, `tags`, `review state`, and `category`.

### Edit Drawer
- Editing opens in a right-side detail drawer.
- The drawer has two sections:
  - top section: transaction snapshot and source context
  - lower section: editable fields and actions
- Editable fields are `amount`, `date`, `description`, `type`, `tags`, `category`, `reference`, and `review-state override`.
- Saving from the drawer should feel immediate and local.
- Manual type changes may surface a subtle rule-suggestion hint, but the drawer must remain primarily a correction workflow.

### Empty, Loading, and No-Result States
- Empty ledger heading: `No transactions yet`
- Empty ledger body: `Import an ICICI statement to start browsing, correcting, and searching your local transaction history.`
- No-results heading: `No transactions match this view`
- No-results body: `Clear one or more filters or broaden your search to see more records.`

---

## State and Feedback Contract

- Search input should stay responsive even when the ledger is large.
- User-overridden types should read as settled values, not error states.
- Save feedback should confirm local success without noisy toast spam.
- Error copy must explain that the transaction was not updated and the existing local record remains unchanged.
- `Tab` and `Shift+Tab` traverse the search bar, filter controls, ledger rows, and drawer fields in visual order.
- `Enter` on a focused row opens the drawer.
- `Esc` closes the drawer or filter panel without leaving the transactions screen.

---

## Component Inventory

- `Transactions workspace header`
- `Dense ledger table`
- `Advanced filter drawer`
- `Transaction row`
- `Transaction edit drawer`
- `Type badge or label`
- `Tag chip`

Use the established Walnut card language: large rounded surfaces, restrained accent emphasis, and strong scan order over decorative density.

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Badge gaps, icon spacing |
| sm | 8px | Compact control spacing, tag gaps |
| md | 16px | Default control rhythm, row internals |
| lg | 24px | Toolbar spacing, drawer section padding |
| xl | 32px | Page gutters and major content separation |
| 2xl | 48px | Large-screen breathing room |

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 32px | 600 | 1.1 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F5F1E8 | App background, ledger canvas, drawer background |
| Secondary (30%) | #E2D7C5 | Toolbar surfaces, drawers, filter panels, selected row fills |
| Accent (10%) | #0F766E | Search focus, active controls, primary actions, selected states |
| Destructive | #B42318 | Save errors, invalid edits, destructive confirmations |

Keep the current Walnut palette.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary search placeholder | Search descriptions, references, or tags |
| Empty state heading | No transactions yet |
| Empty state body | Import an ICICI statement to start browsing, correcting, and searching your local transaction history. |
| No-results heading | No transactions match this view |
| Error state | This transaction update could not be saved. Check the values, try again, and confirm the row still reflects the source record you intend to correct. |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved
