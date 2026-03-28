---
phase: 05
slug: categories-and-rules
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-28
reviewed_at: 2026-03-28
---

# Phase 05 - UI Design Contract

> Visual and interaction contract for frontend phases. Generated from locked Phase 5 decisions and approved for planning.

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

## Categories and Rules Workspace Contract

### Primary Screen
- Add one dedicated `Categories & Rules` destination to the existing left rail.
- Keep the workspace inside the current Walnut shell, not in settings and not in detached modal-only flows.
- The primary visual anchor is the dual-pane operational workspace: categories on one side, rules on the other.
- The page should feel like a finance control surface, not a generic admin table.

### Categories Pane
- The categories pane should present a protected system taxonomy plus user-created categories in one hierarchy.
- Top-level categories and optional subcategories should be visually distinct through indentation and hierarchy cues, not separate screens.
- Built-in system categories must always read as protected and stable.
- User-created categories must clearly expose their editable/manageable state.
- Each category row should show:
  - category name
  - parent context when relevant
  - active/inactive state
  - mapped transaction count
- Income categories should appear inside the same taxonomy and visibly support subcategories.

### Rules Pane
- The rules pane should act as a deterministic automation list, not a hidden background system.
- Each rule row should show:
  - rule name
  - enabled/disabled state
  - a short readable summary of match conditions
  - a short readable summary of actions
  - affected transaction count
- Most-specific-wins precedence should be explainable in rule detail and test preview language.
- Rules should remain declarative and readable; do not present them like scripts.

### Split-Pane Behavior
- Categories and rules should remain visible side-by-side on standard desktop widths.
- On narrower widths, the layout may stack, but it must preserve clear return paths and pane identity.
- The focused pane should have stronger visual priority, while the secondary pane remains legible and contextual.
- Destructive or trust-sensitive actions should never replace the whole screen with blocking modal flows unless absolutely necessary.

### Edit and Create Surfaces
- Category creation and editing should open in a focused side panel or embedded detail area rather than navigating away.
- Rule creation from a transaction edit should open as a prefilled side flow that keeps the user grounded in the current context.
- Editing a rule should expose:
  - match conditions
  - resulting category/type/tag actions
  - enable/disable state
  - test-preview action
- Category merge and rule re-apply actions must surface impact preview before commit.

### Preview and Re-apply
- Any “apply to existing transactions” workflow must show:
  - affected count
  - a sample transaction list
  - a clear action summary
- The preview should feel confirmatory and trust-building, not like a bulk data mystery.
- Sample lists should be concise and scan-friendly, with the option to proceed or cancel without losing current context.

### Visual Focal Points
- In the categories pane, the eye should land first on the hierarchy header and transaction counts so users immediately understand scope.
- In the rules pane, the eye should land first on enabled rule summaries and affected counts so the impact of automation is legible at a glance.

---

## State and Feedback Contract

- Protected system categories must visually read as protected before a user attempts an action.
- User-created categories must visually read as flexible and manageable.
- Rule changes should feel deterministic and locally applied, not eventually consistent.
- Testing a rule should show a concise preview state rather than a passive success message only.
- Apply-to-existing confirmations must make impact obvious before committing changes.
- Category merges should confirm destination and affected transaction count before running.
- Error copy must explain that the operation was not applied and current category/rule state remains unchanged.
- Success feedback should confirm local completion without relying only on toasts.

### Empty States
- Categories empty state heading: `No custom categories yet`
- Categories empty state body: `System categories are ready. Add a custom category when the built-in taxonomy is not enough for your household.`
- Rules empty state heading: `No rules yet`
- Rules empty state body: `Use ledger corrections or create a rule here to start automating recurring category and type decisions.`
- Preview empty state heading: `No matching transactions`
- Preview empty state body: `This rule does not affect any current transactions with the chosen conditions.`

### Keyboard Contract
- `Tab` and `Shift+Tab` traverse category rows, rule rows, create actions, preview actions, and side-panel form fields in visual order.
- `Enter` on a focused category or rule row opens its detail/edit surface.
- `Esc` closes the active side panel or preview surface without leaving the Categories & Rules workspace.
- Hierarchy rows, enable/disable toggles, and test-preview actions must be fully keyboard reachable.

---

## Component Inventory

- `Categories and Rules workspace header`
- `Categories hierarchy pane`
- `Category row`
- `Protected category badge`
- `User category row actions`
- `Rules list pane`
- `Rule row`
- `Rule match summary`
- `Rule action summary`
- `Category detail side panel`
- `Rule detail side panel`
- `Rule preview panel`
- `Apply-to-existing confirmation surface`

Use the established Walnut surface language: large rounded cards, restrained accent emphasis, readable density, and clear scan order over decorative noise.

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Badge gaps, inline hierarchy markers |
| sm | 8px | Compact metadata, chip spacing |
| md | 16px | Default row spacing, form fields, pane rhythm |
| lg | 24px | Card padding, pane padding, section separation |
| xl | 32px | Main layout gutters and major workspace separation |
| 2xl | 48px | Large region breathing room |

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 32px | 600 | 1.1 |

Use sentence case throughout. Reserve display size for the top-level page heading only.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F5F1E8 | Page background, main workspace canvas |
| Secondary (30%) | #E2D7C5 | Pane surfaces, side panels, preview cards |
| Accent (10%) | #0F766E | Active controls, selected rows, primary actions, enabled-rule emphasis |
| Destructive | #B42318 | Merge/delete warnings, failed apply messaging, irreversible confirmations |

Keep the current Walnut palette and avoid introducing new semantic accent families beyond the existing token vocabulary.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Categories pane heading | Categories |
| Rules pane heading | Rules |
| Categories empty state heading | No custom categories yet |
| Rules empty state heading | No rules yet |
| Apply preview heading | Review affected transactions |
| Error state | This change was not applied. Review the current configuration, adjust the inputs, and try again. |

Microcopy rules:
- Lead with clarity and trust, not automation hype.
- Prefer `match`, `apply`, `preview`, `affected`, `protected`, and `local`.
- Avoid `smart`, `magic`, `auto-fix`, or language that implies hidden behavior.
- Rule precedence language must be explainable and plain.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved
