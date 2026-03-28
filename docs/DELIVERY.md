# Delivery Model

## Canonical Planning Model

The project uses `.planning/` as the internal source of truth for detailed planning and execution artifacts. The `docs/` directory mirrors the collaborator-facing view of that work for GitHub readers and contributors.

## Tracking Structure

### Milestone

- Milestone title: `Foundation Delivery`
- Initial due date: `2026-04-05`

### GitHub Project

Delivery should be tracked in a simple kanban project with these columns:

- Backlog
- Ready
- In Progress
- Review
- Done

### Issue Hierarchy

- Epic issue = one roadmap phase
- Story issue = one planned wave within a phase

Story issues are only created after a phase has been planned at wave level.

## Phase and Wave Mapping

### Epic Creation Rule

Create epics for all phases currently on the roadmap:

- Phase 1 through Phase 13

Each epic should include:

- phase goal
- mapped requirements
- success criteria
- current planning/execution status

### Story Creation Rule

Create stories only for phases that already have `*-PLAN.md` files.

At the moment, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, and Phase 6 have plan files, so the active story set is:

- Phase 1 / Wave 1
- Phase 1 / Wave 2
- Phase 1 / Wave 3
- Phase 2 / Wave 1
- Phase 2 / Wave 2
- Phase 2 / Wave 3
- Phase 3 / Wave 1
- Phase 3 / Wave 2
- Phase 3 / Wave 3
- Phase 3 / Wave 4
- Phase 4 / Wave 1
- Phase 4 / Wave 2
- Phase 4 / Wave 3
- Phase 4 / Wave 4
- Phase 5 / Wave 1
- Phase 5 / Wave 2
- Phase 5 / Wave 3
- Phase 5 / Wave 4
- Phase 6 / Wave 1
- Phase 6 / Wave 2
- Phase 6 / Wave 3
- Phase 6 / Wave 4

## Phase 1 Story Breakdown

### Wave 1 Story

Scope:

- shell scaffold
- persistence bootstrap
- typed IPC/shared contracts
- test harness setup

Plan reference:

- `.planning/phases/01-product-shell-and-security/01-01-PLAN.md`

### Wave 2 Story

Scope:

- onboarding wizard
- recovery-key confirmation
- account setup / skip path
- empty-dashboard handoff

Plan reference:

- `.planning/phases/01-product-shell-and-security/01-02-PLAN.md`

### Wave 3 Story

Scope:

- launch/idle/session lock enforcement
- branded lock screen
- manual lock action
- recovery-key reset and rotation

Plan reference:

- `.planning/phases/01-product-shell-and-security/01-03-PLAN.md`

## Phase 2 Story Breakdown

### Wave 1 Story

Scope:

- import fixtures from real ICICI samples
- shared import contracts
- preload/import boundary foundation
- parser and rejection fixture tests

Plan reference:

- `.planning/phases/02-statement-import-pipeline/02-01-PLAN.md`

### Wave 2 Story

Scope:

- main-process file staging and parser flow
- record-only persistence
- duplicate detection and blocking
- earlier-batch inspection plumbing

Plan reference:

- `.planning/phases/02-statement-import-pipeline/02-02-PLAN.md`

### Wave 3 Story

Scope:

- shared import workspace UI
- worksheet and rejection reason handling
- import summary and lazy-account confirmation
- end-to-end import coverage

Plan reference:

- `.planning/phases/02-statement-import-pipeline/02-03-PLAN.md`

## Phase 3 Story Breakdown

### Wave 1 Story

Scope:

- durable review items
- import attempts
- mixed import gating

Plan reference:

- `.planning/phases/03-review-queue-and-import-history/03-01-PLAN.md`

### Wave 2 Story

Scope:

- import history
- batch detail receipts
- per-file and transaction drill-down

Plan reference:

- `.planning/phases/03-review-queue-and-import-history/03-02-PLAN.md`

### Wave 3 Story

Scope:

- auditable review mutations
- restore-capable mutation backend
- review queue IPC contract

Plan reference:

- `.planning/phases/03-review-queue-and-import-history/03-03-PLAN.md`

### Wave 4 Story

Scope:

- dedicated review queue UI
- persisted restore affordance
- browser-harness and unit review coverage

Plan reference:

- `.planning/phases/03-review-queue-and-import-history/03-04-PLAN.md`

## Phase 4 Story Breakdown

### Wave 1 Story

Scope:

- transaction contracts
- normalization logic
- repository query surface
- transaction IPC boundary

Plan reference:

- `.planning/phases/04-transaction-ledger-and-search/04-01-PLAN.md`

### Wave 2 Story

Scope:

- transactions left-rail destination
- dense ledger workspace
- search-first header
- advanced filter drawer

Plan reference:

- `.planning/phases/04-transaction-ledger-and-search/04-02-PLAN.md`

### Wave 3 Story

Scope:

- right-side detail drawer
- immediate-save edits
- type/category/tag/reference updates
- rule-suggestion hook

Plan reference:

- `.planning/phases/04-transaction-ledger-and-search/04-03-PLAN.md`

### Wave 4 Story

Scope:

- repository tests
- renderer ledger tests
- browser ledger tests
- verification handoff

Plan reference:

- `.planning/phases/04-transaction-ledger-and-search/04-04-PLAN.md`

## Phase 5 Story Breakdown

### Wave 1 Story

Scope:

- protected taxonomy foundation
- durable category ids
- category-to-transaction linkage
- safe user-category management

Plan reference:

- `.planning/phases/05-categories-and-rules/05-01-PLAN.md`

### Wave 2 Story

Scope:

- deterministic rule engine
- specificity resolution
- preview-first apply flows
- transaction rule-suggestion handoff

Plan reference:

- `.planning/phases/05-categories-and-rules/05-02-PLAN.md`

### Wave 3 Story

Scope:

- Categories & Rules workspace
- category/rule side panels
- preview surface
- dual-pane management UX

Plan reference:

- `.planning/phases/05-categories-and-rules/05-03-PLAN.md`

### Wave 4 Story

Scope:

- repository tests
- renderer tests
- browser automation coverage
- verification handoff

Plan reference:

- `.planning/phases/05-categories-and-rules/05-04-PLAN.md`

## Phase 6 Story Breakdown

### Wave 1 Story

Scope:

- dashboard contracts
- aggregate snapshot queries
- recurring detection
- persisted dashboard preferences

Plan reference:

- `.planning/phases/06-dashboard-analytics/06-01-PLAN.md`

### Wave 2 Story

Scope:

- dashboard workspace
- global date controls
- summary and operational cards
- compact-mode layout

Plan reference:

- `.planning/phases/06-dashboard-analytics/06-02-PLAN.md`

### Wave 3 Story

Scope:

- recurring detail panel
- recent and largest widgets
- dashboard-to-ledger drill-down
- widget interaction flows

Plan reference:

- `.planning/phases/06-dashboard-analytics/06-03-PLAN.md`

### Wave 4 Story

Scope:

- repository analytics tests
- renderer dashboard tests
- browser dashboard coverage
- verification handoff

Plan reference:

- `.planning/phases/06-dashboard-analytics/06-04-PLAN.md`

## Completion Workflow

When a phase completes:

- move story issues into `Review` while the phase PR is open
- update the epic issue with execution status and linked PR
- move project items to `Done` and close them after the phase merges
- review milestone progress
- carry any deferred or follow-up work into later epic/story creation

## Current Delivery Snapshot

- Phase 1 implementation is complete and merged into `release/1.0.0`
- Phase 1 tracking items are epic `#1` and stories `#14`, `#15`, and `#16`
- Phase 2 implementation is complete on `phase/2-statement-import-pipeline`
- Phase 2 tracking items are epic `#2` and stories `#18`, `#19`, and `#20`
- Phase 3 implementation is complete on `phase/3-review-queue-and-import-history`
- Phase 3 tracking items are epic `#3` and stories `#22`, `#23`, `#24`, and `#25`
- Phase 4 implementation is complete on `phase/4-transaction-ledger-and-search`
- Phase 4 tracking items are epic `#4` and stories `#29`, `#30`, `#31`, and `#32`
- The current Phase 4 branch also carries the active shell and ledger polish follow-through
- That polish scope now includes multi-profile local selection on the lock screen, a dedicated new-profile flow, responsive lock-screen behavior, cleaner import workspace hierarchy, and updated ledger summaries/search/pagination coverage
- Phase 5 implementation is complete on `phase/5-categories-and-rules`
- Phase 5 tracking items are epic `#5` and stories `#35`, `#36`, `#37`, and `#39`
- Phase 6 implementation is complete on `phase/6-dashboard-analytics`
- Next discussion track is Phase 7: Audit and Diagnostics

## Documentation Expectations

For every feature and bug fix:

- update relevant docs in `docs/`
- update planning artifacts in `.planning/` where required
- keep GitHub issue and project status in sync with actual delivery state
