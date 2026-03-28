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

At the moment, Phase 1, Phase 2, and Phase 3 have plan files, so the active story set is:

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
- Next discussion track is Phase 4: Transaction Ledger and Search

## Documentation Expectations

For every feature and bug fix:

- update relevant docs in `docs/`
- update planning artifacts in `.planning/` where required
- keep GitHub issue and project status in sync with actual delivery state
