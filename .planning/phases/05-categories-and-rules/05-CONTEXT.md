# Phase 5: Categories and Rules - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn imported and editable transactions into a trustworthy categorization system. This phase covers the built-in category taxonomy, income categorization, starter categorization rules, rule precedence, user-created category management, rule testing/management UX, and controlled re-categorization behavior for existing transactions. Dashboard analytics, audit-screen surfacing, and broader rule-system expansion remain separate phases.

</domain>

<decisions>
## Implementation Decisions

### Category Model
- **D-01:** Phase 5 uses top-level categories with optional subcategories.
- **D-02:** The built-in system taxonomy should keep the agreed base set:
  - Food & Dining
  - Groceries
  - Shopping
  - Bills & Utilities
  - Rent / Housing
  - Transport
  - Travel
  - Healthcare
  - Entertainment
  - Education
  - Insurance
  - Taxes & Fees
  - Cash / ATM
  - Transfers
  - Credit Card Payment
  - Income
  - Refunds / Reimbursements
  - Investments / Savings
  - Uncategorized
- **D-03:** Income ships with built-in subcategories such as Salary, Business Income, Interest, Refund / Reimbursement Income, Investment Income, and Other Income.
- **D-04:** User-created categories may exist either as top-level categories or as subcategories under an existing parent.

### Rule Model
- **D-05:** Phase 5 rules can match on description, amount range, transaction type, tags, and debit/credit direction.
- **D-06:** Phase 5 rules can assign category/subcategory, type, and tags.
- **D-07:** When multiple user rules match, the most specific rule should win automatically.
- **D-08:** After a ledger edit is saved, Walnut should offer a rule-creation side flow with prefilled values rather than interrupting the save flow.

### Categories and Rules UX
- **D-09:** Categories and rules should live in one screen with two side-by-side panes.
- **D-10:** User-created categories support create, rename, move under parent, merge, activate/deactivate, and delete.
- **D-11:** Rules support create, edit, test against sample matches, enable/disable, and delete.
- **D-12:** The screen should show how many transactions currently map to a category or are affected by a rule.

### Re-categorization Behavior
- **D-13:** New rules apply to future transactions by default, with an optional apply-to-existing step.
- **D-14:** Editing an existing rule should offer a preview and optional re-apply to existing matching transactions.
- **D-15:** Merging a category should migrate existing transactions immediately to the target category.
- **D-16:** Before applying a rule to existing transactions, Walnut should show both a count and a sample list of affected transactions.

### At the Agent's Discretion
- Exact built-in subcategory distribution under non-income parents, as long as it remains intuitive and consistent with the protected system taxonomy.
- Exact specificity scoring for rule precedence, provided it remains explainable and stable.
- Exact pane proportions and interaction details for the dual-pane Categories and Rules screen.
- Exact wording of rule previews and re-apply confirmations, provided users can understand the impact before changing existing transactions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning artifacts
- `.planning/PROJECT.md` - Product trust posture, local-first privacy model, and release-1 scope
- `.planning/REQUIREMENTS.md` - Category and rule requirements `CATR-01` through `CATR-06`
- `.planning/ROADMAP.md` - Phase 5 goal, success criteria, and relation to nearby phases
- `.planning/STATE.md` - Current project position and next-step expectations
- `.planning/phases/04-transaction-ledger-and-search/04-CONTEXT.md` - Prior phase decisions around transaction editing and rule-suggestion hooks

### Existing implementation
- `src/renderer/features/transactions/TransactionsScreen.tsx` - Current transaction workspace and edit flow that Phase 5 should build on
- `src/renderer/features/transactions/TransactionDetailDrawer.tsx` - Existing correction surface where rule suggestions currently begin
- `src/main/persistence/db.ts` - Current transaction persistence, query, and update layer to extend for categories and rules
- `src/shared/contracts/transactions.ts` - Existing transaction contracts that should gain category/rule shapes rather than being replaced
- `src/renderer/App.tsx` - Current shell routing and left-rail destinations
- `src/renderer/styles/tokens.css` - Existing Walnut visual system that Categories and Rules should preserve

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 4 already introduced a dedicated Transactions workspace, filtered ledger queries, and immediate-save editing, which gives Phase 5 a strong base for category assignment and rule suggestions.
- The current typed preload/main-process boundary is already in place and should remain the source of truth for category/rule operations.
- The shell already supports domain-specific left-rail destinations and split-pane workflows, which fits the Phase 5 two-pane screen decision.

### Established Patterns
- Corrective changes should save against authoritative repository state instead of relying on long-lived renderer-only caches.
- The product favors conservative automation with strong user override.
- Protected system data and editable user data should remain clearly separated in both storage and UI behavior.

### Integration Points
- Phase 5 must attach cleanly to Phase 4 transaction editing and rule-suggestion flow.
- Phase 6 dashboard analytics will depend on the Phase 5 categorization model being stable and queryable.
- Phase 7 audit work should be able to attach to category/rule mutations without redesigning these Phase 5 payloads later.

</code_context>

<specifics>
## Specific Ideas

- The category system should feel opinionated enough to be useful on day one, but not rigid enough to force awkward personal finance habits.
- Rules should feel powerful but understandable; matching and precedence need to be explainable in the UI.
- Re-apply flows must help users trust bulk categorization changes by previewing impact before they touch existing history.
- The Categories and Rules screen should feel like an operational control surface, not a buried settings form.

</specifics>

<deferred>
## Deferred Ideas

- Broader rule-system expansion beyond Phase 5 belongs to Phase 10.
- Dashboard consumption of categories and rules belongs to Phase 6.
- Audit-screen browsing of category/rule edits belongs to Phase 7.
- Saved filters and broader workflow polish remain later concerns.

</deferred>

---
*Phase: 05-categories-and-rules*
*Context gathered: 2026-03-28*
