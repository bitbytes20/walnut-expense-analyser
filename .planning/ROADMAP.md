# Roadmap: Walnut Expense Analyser

**Created:** 2026-03-27

## Milestones

- ✅ **v1.0 Release 1: Foundation** — Phases 1-8 (shipped 2026-03-29)
- 📋 **v2.0 Release 2: Core** — Phases 9-14 (planned)
- 📋 **v3.0 Release 3: Smart** ��� Phases 15-16 (planned)

## Phases

<details>
<summary>✅ v1.0 Release 1: Foundation (Phases 1-8) — SHIPPED 2026-03-29</summary>

Trusted import-to-insight loop for a single ICICI account profile on a local Windows desktop app.
Full archive: `.planning/milestones/v1.0-ROADMAP.md`

- [x] Phase 1: Product Shell and Security (3/3 plans) — completed 2026-03-27
- [x] Phase 2: Statement Import Pipeline (3/3 plans) — completed 2026-03-27
- [x] Phase 3: Review Queue and Import History (4/4 plans) — completed 2026-03-27
- [x] Phase 4: Transaction Ledger and Search (4/4 plans) — completed 2026-03-28
- [x] Phase 5: Categories and Rules (4/4 plans) — completed 2026-03-28
- [x] Phase 6: Dashboard Analytics (4/4 plans) — completed 2026-03-28
- [x] Phase 7: Audit and Diagnostics (4/4 plans) — completed 2026-03-29
- [x] Phase 8: Settings and Release Hardening (4/4 plans) — completed 2026-03-29

</details>

### 📋 v2.0 Release 2: Core (Planned)

Polish and hardening once the trusted local loop is working end-to-end.

- [ ] **Phase 9: Workflow Polish** — Multi-select batch operations, import error diagnostics, and filter state persistence
- [ ] **Phase 10: Rule System Expansion** — Richer rule authoring, category safety correctness fixes, rule maintenance tools
- [ ] **Phase 11: Budgeting Foundations** ��� Monthly category targets, budget vs actual variance view, over-budget indicators
- [ ] **Phase 12: AI Insights** — Owner-controlled AI provider config, triggered dashboard insights card with spend narrative
- [ ] **Phase 13: Family Members** ��� Multi-member account profiles, family dashboard with aggregate and per-member views
- [ ] **Phase 14: WanderLog** — Custom expense tracking contexts with auto-assignment rules and scoped dashboards

### 📋 v3.0 Release 3: Smart (Planned)

Future-facing expansion once the local foundation and core workflows are stable.

- [ ] **Phase 15: AI Summaries** — Ephemeral dashboard summaries behind owner-controlled feature flags
- [ ] **Phase 16: Expansion Architecture** — Additional banks, sync planning, shared-domain extraction

## Phase Details

### Phase 9: Workflow Polish
**Goal**: Users can move through review, categorization, and transaction management faster with fewer interactions per task
**Depends on**: Phase 8 (v1.0 complete)
**Requirements**: WORKFLOW-01, WORKFLOW-02, WORKFLOW-03, WORKFLOW-04, WORKFLOW-05, WORKFLOW-06, WORKFLOW-07, WORKFLOW-08, WORKFLOW-09
**Success Criteria** (what must be TRUE):
  1. User can select multiple transactions with checkboxes and shift+click range-select, then apply a category to all of them in one step
  2. User can select multiple review queue items and approve or dismiss them in bulk; mixed-state selections are handled gracefully with a count summary rather than an error
  3. User can approve and reject individual review queue items using keyboard shortcuts without reaching for the mouse
  4. User sees import error messages that identify the failing row, describe what was expected vs found, and suggest a fix; user can retry with a corrected file without navigating away
  5. User can save the current filter state as a named preset and restore it in one click; user can rename, delete, and list all saved presets
**Plans:** 2/5 plans executed
Plans:
- [x] 09-01-PLAN.md — Shared contracts, DB schema, IPC handlers, preload bridge, and Wave 0 test scaffolds
- [x] 09-02-PLAN.md — Transaction multi-select with checkboxes, shift+click, and bulk category/tag assignment
- [x] 09-03-PLAN.md — Review queue keyboard shortcuts (A/R/arrows) and mixed-state bulk approve
- [x] 09-04-PLAN.md — Import error diagnostics with row-level detail and in-place file retry
- [x] 09-05-PLAN.md — Named filter presets (save, restore, rename, delete) in filter drawer
**UI hint**: yes

### Phase 10: Rule System Expansion
**Goal**: Users can author precise, composable categorization rules and trust that category renames and merges do not silently corrupt rule targets or transaction labels
**Depends on**: Phase 9
**Requirements**: RULES-01, RULES-02, RULES-03, RULES-04, RULES-05, RULES-06, RULES-07, RULES-08, RULES-09, RULES-10, RULES-11
**Success Criteria** (what must be TRUE):
  1. User can write rule conditions using contains, starts-with, ends-with, and amount range operators; user can combine multiple conditions with AND logic on a single rule
  2. User renames a category and the new name immediately appears on all existing transactions and rule targets — no stale labels anywhere
  3. User merges a category into another and sees a transaction count preview before confirming; all transactions and any rules pointing at the source category are reassigned atomically to the target
  4. User can archive a category so it disappears from active pickers while its historical transactions remain intact and searchable
  5. User can drag rules to reorder them and export/import them as a JSON file; on import, any conflict with an existing rule shows a side-by-side diff before committing; rules apply automatically when a new import is committed
**Plans:** 5 plans
Plans:
- [ ] 10-01-PLAN.md — Contracts, schema columns, descriptionTerms migration, Wave 0 test scaffolds
- [ ] 10-02-PLAN.md — Rule engine evolution: matchesRuleCondition rewrite, dynamic condition row editor UI
- [ ] 10-03-PLAN.md — Category correctness: rename propagation, merge preview + atomic merge, archive/restore
- [ ] 10-04-PLAN.md — Drag-reorder rule priority, auto-apply rules at import commit, import summary
- [ ] 10-05-PLAN.md — Rule export/import with conflict detection and side-by-side diff resolution
**UI hint**: yes

### Phase 11: Budgeting Foundations
**Goal**: Users can set monthly spend targets per category and immediately see whether they are on track, over, or under budget for any month
**Depends on**: Phase 10
**Requirements**: BUDGET-01, BUDGET-02, BUDGET-03, BUDGET-04, BUDGET-05
**Success Criteria** (what must be TRUE):
  1. User can set a monthly spend target for any category and apply the same amount across all 12 months in one step
  2. User can view a budget vs actual comparison per category for any month, with color-coded remaining amounts (green/amber/red) and a summary card showing total budgeted, total spent, and over-budget count
  3. Any category that has exceeded its monthly target shows a visible over-budget indicator in the app without the user navigating to the budget screen
  4. User can opt a category into rollover so unspent or overspent amounts carry forward automatically into the next month
**Plans**: TBD
**UI hint**: yes

### Phase 12: AI Insights
**Goal**: Owners who choose to use AI can get a triggered spend narrative and anomaly callouts on the dashboard without any data leaving the device without a deliberate action
**Depends on**: Phase 11
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Owner can configure an AI provider in Settings — either Claude API with an API key or a local Ollama endpoint — and switch between them at any time
  2. Dashboard shows an AI insights card only after the owner explicitly triggers generation; the card includes a monthly spend narrative, anomaly callouts, budget health commentary, and actionable suggestions
  3. No spending data is sent to any cloud provider unless the owner takes a deliberate action to generate or regenerate the card
  4. Owner can regenerate the AI insights card to get fresh commentary or dismiss it to hide it entirely
**Plans**: TBD
**UI hint**: yes

### Phase 13: Family Members
**Goal**: The owner can add family member profiles so household spending across multiple ICICI accounts is visible in one place, with each member's transactions kept separate but sharing a single category taxonomy
**Depends on**: Phase 11
**Requirements**: FAMILY-01, FAMILY-02, FAMILY-03, FAMILY-04, FAMILY-05, FAMILY-06, FAMILY-07, FAMILY-08, FAMILY-09
**Success Criteria** (what must be TRUE):
  1. Owner can create, rename, and deactivate family member profiles entirely from the owner account — no per-member PIN is required
  2. Owner can import ICICI statements for any family member's profile and each member's transactions are stored and attributed to their profile separately
  3. Family Dashboard shows aggregate household spend by category across all members for a selected period, alongside a per-member spend breakdown
  4. Family Dashboard shows family-level budget vs actual using the shared household category budgets and a unified recent activity feed across all members
  5. All family members' transactions share the same household category taxonomy and categorization rules, so rules written for one member apply consistently to all
**Plans**: TBD
**UI hint**: yes

### Phase 14: WanderLog
**Goal**: Owners can create named expense-tracking contexts (trips, projects, events) that overlay on top of the standard ledger, grouping transactions without altering their base categories or records
**Depends on**: Phase 13
**Requirements**: WLOG-01, WLOG-02, WLOG-03, WLOG-04, WLOG-05, WLOG-06, WLOG-07, WLOG-08, WLOG-09, WLOG-10, WLOG-11
**Success Criteria** (what must be TRUE):
  1. Owner can create a WanderLog with a name, optional date range, and optional budget target; owner can rename, delete, close, archive, and list all WanderLogs
  2. Owner can add transactions to a WanderLog individually from the ledger, bulk-assign selected transactions using multi-select, tag all transactions in a statement import to a WanderLog at import time, and define auto-assignment rules so matching transactions join automatically
  3. A transaction can belong to multiple WanderLogs simultaneously without affecting its base category or any ledger record
  4. WanderLog dashboard shows total spend vs optional budget, spend by category, a scoped searchable transaction list, and per-member spend breakdown when family members are enabled
  5. Owner can attach a WanderLog-scoped annotation to any transaction within that WanderLog (e.g. "Rahul's share", "Cab to airport"); the annotation is stored separately and does not modify the original transaction description
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Product Shell and Security | v1.0 | 3/3 | Complete | 2026-03-27 |
| 2. Statement Import Pipeline | v1.0 | 3/3 | Complete | 2026-03-27 |
| 3. Review Queue and Import History | v1.0 | 4/4 | Complete | 2026-03-27 |
| 4. Transaction Ledger and Search | v1.0 | 4/4 | Complete | 2026-03-28 |
| 5. Categories and Rules | v1.0 | 4/4 | Complete | 2026-03-28 |
| 6. Dashboard Analytics | v1.0 | 4/4 | Complete | 2026-03-28 |
| 7. Audit and Diagnostics | v1.0 | 4/4 | Complete | 2026-03-29 |
| 8. Settings and Release Hardening | v1.0 | 4/4 | Complete | 2026-03-29 |
| 9. Workflow Polish | v2.0 | 5/5 | Complete |  |
| 10. Rule System Expansion | v2.0 | 0/5 | Planned | — |
| 11. Budgeting Foundations | v2.0 | TBD | Not started | — |
| 12. AI Insights | v2.0 | TBD | Not started | — |
| 13. Family Members | v2.0 | TBD | Not started | — |
| 14. WanderLog | v2.0 | TBD | Not started | ��� |
| 15. AI Summaries | v3.0 | TBD | Not started | — |
| 16. Expansion Architecture | v3.0 | TBD | Not started | — |

---
*Last updated: 2026-03-30 — Phase 10 plans created (5 plans, 3 waves)*
