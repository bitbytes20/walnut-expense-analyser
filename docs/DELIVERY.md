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

At the moment, only Phase 1 has plan files, so the initial story set is:

- Phase 1 / Wave 1
- Phase 1 / Wave 2
- Phase 1 / Wave 3

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

## Completion Workflow

When a phase completes:

- update story issues to done/closed
- update the epic issue with completion status
- move project items accordingly
- review milestone progress
- carry any deferred or follow-up work into later epic/story creation

## Documentation Expectations

For every feature and bug fix:

- update relevant docs in `docs/`
- update planning artifacts in `.planning/` where required
- keep GitHub issue and project status in sync with actual delivery state
