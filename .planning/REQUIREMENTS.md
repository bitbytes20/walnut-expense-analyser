# Requirements: Walnut Expense Analyser

**Defined:** 2026-03-30
**Core Value:** A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.

## v2.0 Requirements

Requirements for milestone v2.0 — Release 2: Core. Builds on the v1.0 trusted import-to-insight loop.

### Workflow Polish

- [x] **WORKFLOW-01**: User can select multiple transactions via checkboxes, with shift+click range-select and select-all support
- [x] **WORKFLOW-02**: User can assign a category to all selected transactions in one step, with inline count confirmation
- [x] **WORKFLOW-03**: User can assign freeform tags to multiple selected transactions at once
- [x] **WORKFLOW-04**: User can select multiple review queue items and approve or dismiss them in bulk while existing mixed-import gating rules are still respected
- [x] **WORKFLOW-05**: User sees import error messages that name the failing row, describe what was expected vs found, and suggest a remedy
- [x] **WORKFLOW-06**: User can retry a failed import with a corrected file without navigating away from the import session
- [x] **WORKFLOW-07**: User can approve and reject review queue items using keyboard shortcuts
- [x] **WORKFLOW-08**: User can save the current transaction filter state as a named preset and restore it in one click
- [x] **WORKFLOW-09**: User can manage saved filter presets (rename, delete, list)

### Rule System Expansion

- [x] **RULES-01**: User can write rule conditions using contains, starts-with, and ends-with string operators
- [x] **RULES-02**: User can write rule conditions using amount range operators (greater than, less than, between)
- [x] **RULES-03**: User can add multiple AND conditions to a single rule (e.g. "Description contains Uber AND amount > 200")
- [ ] **RULES-04**: User can reorder rules by drag-and-drop to control first-match-wins priority
- [x] **RULES-05**: User can rename a category and the new name propagates atomically to all associated transactions and rule targets
- [x] **RULES-06**: User can merge one category into another; all affected transactions and rule targets are reassigned atomically with a preview count shown before confirmation
- [x] **RULES-07**: User can archive a category so it disappears from active pickers but its historical transactions remain intact
- [x] **RULES-08**: User can write a regex rule condition via an opt-in advanced toggle, with live preview of matched transactions and ReDoS validation on input
- [ ] **RULES-09**: User can export all categorization rules to a JSON file
- [ ] **RULES-10**: User can import rules from a JSON file, with conflict detection showing a side-by-side diff when an incoming rule overlaps an existing rule
- [ ] **RULES-11**: User-authored categorization rules are automatically applied to transactions at import commit time

### Budgeting Foundations

- [ ] **BUDGET-01**: User can set a monthly spend target per category
- [ ] **BUDGET-02**: User can apply the same budget amount to all 12 months for a category in one step
- [ ] **BUDGET-03**: User can view a budget vs actual comparison per category per month, with color-coded remaining (green/amber/red) and a summary card showing total budgeted, total spent, and over-budget count
- [ ] **BUDGET-04**: User sees an in-app over-budget indicator on any category that has exceeded its monthly spend target
- [ ] **BUDGET-05**: User can opt a category into rollover so unspent or overspent amounts carry forward into the next month's budget

### AI Insights

- [ ] **AI-01**: Owner can configure the AI provider in Settings — Claude API (with API key) or local Ollama (with endpoint URL) — and switch between them
- [ ] **AI-02**: Dashboard shows an AI insights card with a monthly spend narrative, anomaly/unusual spend callouts, budget health commentary, and actionable suggestions (e.g. rule creation prompts)
- [ ] **AI-03**: AI summary generation is explicitly owner-triggered; no spending data is sent to a cloud provider without a deliberate owner action
- [ ] **AI-04**: Owner can regenerate or dismiss the AI insights card from the dashboard

### Family Members

- [ ] **FAMILY-01**: Owner can create family member profiles (name) managed entirely by the owner — no per-member PIN required
- [ ] **FAMILY-02**: Owner can import ICICI statements for any family member's account profile
- [ ] **FAMILY-03**: Each family member's transactions are stored and attributed separately to their profile
- [ ] **FAMILY-04**: Family Dashboard shows aggregate household spend by category across all members for a selected period
- [ ] **FAMILY-05**: Family Dashboard shows per-member spend breakdown alongside household totals
- [ ] **FAMILY-06**: Family Dashboard shows family-level budget vs actual using the shared household category budgets
- [ ] **FAMILY-07**: Family Dashboard shows a unified activity feed of recent transactions across all members
- [ ] **FAMILY-08**: All family members' transactions share the household category taxonomy and categorization rules
- [ ] **FAMILY-09**: Owner can manage family members (add, rename, deactivate)

### WanderLog (Custom Expense Tracking)

- [ ] **WLOG-01**: Owner can create a WanderLog with a name, optional date range, and optional budget target
- [ ] **WLOG-02**: Owner can add individual transactions to a WanderLog from the transaction ledger
- [ ] **WLOG-03**: Owner can bulk-assign selected transactions to a WanderLog using multi-select
- [ ] **WLOG-04**: Owner can define auto-assignment rules for a WanderLog so matching transactions join automatically
- [ ] **WLOG-05**: Owner can tag all transactions in a statement import to a WanderLog at import time
- [ ] **WLOG-06**: A transaction can belong to multiple WanderLogs simultaneously without affecting its base category or ledger record
- [ ] **WLOG-07**: WanderLog dashboard shows total spend vs optional budget, spend by category, and a scoped searchable transaction list
- [ ] **WLOG-08**: WanderLog dashboard shows per-member spend breakdown when family members are enabled
- [ ] **WLOG-09**: Owner can add a WanderLog-scoped annotation to any transaction within that WanderLog (e.g. "Rahul's share", "Cab to airport"); annotation is stored separately and does not modify the original transaction description
- [ ] **WLOG-10**: Owner can close or archive a WanderLog; auto-assignment stops but history is preserved
- [ ] **WLOG-11**: Owner can manage WanderLogs (rename, delete, list all)

## Future Requirements

Acknowledged but deferred to v3.0 or later.

### Rule System

- **RULES-F01**: User can write OR conditions or nested boolean rule logic
- **RULES-F02**: User can view rule change history and revert to a previous rule state
- **RULES-F03**: App suggests rules based on detected transaction patterns (AI/ML)

### Budgeting

- **BUDGET-F01**: Zero-based / envelope budgeting ("assign every rupee" model)
- **BUDGET-F02**: Income and savings rate tracking
- **BUDGET-F03**: Historical budget comparison across years
- **BUDGET-F04**: Goal-based saving targets (e.g. "save ₹50,000 for vacation")
- **BUDGET-F05**: Budget templates / pre-built starter budgets

### Family

- **FAMILY-F01**: Per-member PIN access — each family member logs in with their own PIN
- **FAMILY-F02**: Per-member category and rule customization
- **FAMILY-F03**: Role-based permissions (member vs owner capabilities)

## Out of Scope

Explicitly excluded with rationale.

| Feature | Reason |
|---------|--------|
| OR / nested boolean rule conditions | Produces hard-to-understand rules and conflict detection nightmares; AND-only in v2.0 |
| Zero-based / envelope budgeting | Requires income tracking and a fundamentally different data model |
| Income / savings rate tracking | No import path for income category semantics in v2.0 |
| Windows toast notifications for budget alerts | Adds Electron OS integration complexity; in-app indicators sufficient |
| Historical budget year-on-year comparison | New view type and schema complexity; monthly only in v2.0 |
| Goal-based saving targets | Separate feature domain from spend budgeting |
| Budget templates / library | Marginal value for a single-household app |
| Recent search history | Surfaces sensitive payee names; named presets cover the use case |
| Per-member PIN / role-based permissions | Added complexity; owner manages all in v2.0 |
| Multi-bank support beyond ICICI | Single format proven first before expanding |
| Web app / mobile app | Deferred until modular desktop core is proven |
| WanderLog split-expense calculator | Calculating "who owes whom" is a separate product feature; annotations cover the naming use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WORKFLOW-01 | Phase 9 | Complete |
| WORKFLOW-02 | Phase 9 | Complete |
| WORKFLOW-03 | Phase 9 | Complete |
| WORKFLOW-04 | Phase 9 | Complete |
| WORKFLOW-05 | Phase 9 | Complete |
| WORKFLOW-06 | Phase 9 | Complete |
| WORKFLOW-07 | Phase 9 | Complete |
| WORKFLOW-08 | Phase 9 | Complete |
| WORKFLOW-09 | Phase 9 | Complete |
| RULES-01 | Phase 10 | Complete |
| RULES-02 | Phase 10 | Complete |
| RULES-03 | Phase 10 | Complete |
| RULES-04 | Phase 10 | Pending |
| RULES-05 | Phase 10 | Complete |
| RULES-06 | Phase 10 | Complete |
| RULES-07 | Phase 10 | Complete |
| RULES-08 | Phase 10 | Complete |
| RULES-09 | Phase 10 | Pending |
| RULES-10 | Phase 10 | Pending |
| RULES-11 | Phase 10 | Pending |
| BUDGET-01 | Phase 11 | Pending |
| BUDGET-02 | Phase 11 | Pending |
| BUDGET-03 | Phase 11 | Pending |
| BUDGET-04 | Phase 11 | Pending |
| BUDGET-05 | Phase 11 | Pending |
| AI-01 | Phase 12 | Pending |
| AI-02 | Phase 12 | Pending |
| AI-03 | Phase 12 | Pending |
| AI-04 | Phase 12 | Pending |
| FAMILY-01 | Phase 13 | Pending |
| FAMILY-02 | Phase 13 | Pending |
| FAMILY-03 | Phase 13 | Pending |
| FAMILY-04 | Phase 13 | Pending |
| FAMILY-05 | Phase 13 | Pending |
| FAMILY-06 | Phase 13 | Pending |
| FAMILY-07 | Phase 13 | Pending |
| FAMILY-08 | Phase 13 | Pending |
| FAMILY-09 | Phase 13 | Pending |
| WLOG-01 | Phase 14 | Pending |
| WLOG-02 | Phase 14 | Pending |
| WLOG-03 | Phase 14 | Pending |
| WLOG-04 | Phase 14 | Pending |
| WLOG-05 | Phase 14 | Pending |
| WLOG-06 | Phase 14 | Pending |
| WLOG-07 | Phase 14 | Pending |
| WLOG-08 | Phase 14 | Pending |
| WLOG-09 | Phase 14 | Pending |
| WLOG-10 | Phase 14 | Pending |
| WLOG-11 | Phase 14 | Pending |

**Coverage:**
- v2.0 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 — v2.0 traceability complete (49/49 mapped across Phases 9-14)*
