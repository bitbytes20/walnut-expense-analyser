# Walnut Expense Analyser Roadmap

## Roadmap Overview

The delivery roadmap is organized into three releases:

- Foundation
- Core
- Smart

Release 1 is the trusted local import-to-insight loop for one ICICI account profile. Later releases extend polish, budgeting, AI summaries, and future-client readiness.

## Release 1: Foundation

### Phase 1: Product Shell and Security

Goal: establish the local app shell, guided onboarding, one-account setup, PIN protection, and recovery posture.
Status: completed and merged into `release/1.0.0`.

### Phase 2: Statement Import Pipeline

Goal: build the strict ICICI import flow and local record-only persistence model with hard duplicate blocking.
Status: implemented on `phase/2-statement-import-pipeline`.

### Phase 3: Review Queue and Import History

Goal: handle ambiguous imports explicitly and preserve trust through review workflows.
Status: completed on `phase/3-review-queue-and-import-history`.

### Phase 4: Transaction Ledger and Search

Goal: make imported data explorable, editable, and filterable enough for real analysis.

### Phase 5: Categories and Rules

Goal: provide strong categorization defaults while keeping user control over rules and custom categories.

### Phase 6: Dashboard Analytics

Goal: turn trusted local data into fast, premium-feeling insight views.

### Phase 7: Audit and Diagnostics

Goal: make important actions traceable and supportable through the audit ledger and diagnostics flow.

### Phase 8: Settings and Release Hardening

Goal: complete owner controls, backup/restore, accessibility, and release quality rails.

## Release 2: Core

### Phase 9: Workflow Polish

Goal: improve review throughput, search ergonomics, and import troubleshooting speed.

### Phase 10: Rule System Expansion

Goal: strengthen categorization controls and operational safety for daily use.

### Phase 11: Budgeting Foundations

Goal: begin budgeting only after trust in import and categorization is proven.

## Release 3: Smart

### Phase 12: AI Summaries

Goal: add lightweight narrative AI summaries behind owner-controlled feature flags.

### Phase 13: Expansion Architecture

Goal: prepare for additional banks, sync, web, and mobile clients without destabilizing the local core.

## Phase 1 Completed Waves

Phase 1 was decomposed into three execution waves and all three are now implemented:

- Wave 1: desktop shell scaffold, persistence layer, typed contracts
- Wave 2: onboarding wizard, recovery confirmation, empty-dashboard handoff
- Wave 3: lock screen, PIN enforcement, relock behavior, recovery reset

Execution artifacts:

- `.planning/phases/01-product-shell-and-security/01-01-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-02-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-03-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-VERIFICATION.md`

## Phase 2 Completed Waves

Phase 2 was decomposed into three execution waves and all three are now implemented:

- Wave 1: import fixtures, parser contracts, and preload import foundation
- Wave 2: main-process parsing, record-only persistence, and duplicate blocking
- Wave 3: shared import workspace, import summary, and end-to-end coverage

Execution artifacts:

- `.planning/phases/02-statement-import-pipeline/02-01-SUMMARY.md`
- `.planning/phases/02-statement-import-pipeline/02-02-SUMMARY.md`
- `.planning/phases/02-statement-import-pipeline/02-03-SUMMARY.md`
- `.planning/phases/02-statement-import-pipeline/02-VERIFICATION.md`
- `.planning/phases/02-statement-import-pipeline/02-01-PLAN.md`
- `.planning/phases/02-statement-import-pipeline/02-02-PLAN.md`
- `.planning/phases/02-statement-import-pipeline/02-03-PLAN.md`
- GitHub epic `#2`
- GitHub stories `#18`, `#19`, and `#20`

## Phase 3 Completed Waves

Phase 3 was decomposed into four execution waves and is now implemented:

- Wave 1: review-item persistence, import attempts, and mixed gating
- Wave 2: import history and batch detail receipt views
- Wave 3: auditable review mutations and restore-capable backend flows
- Wave 4: dedicated review queue UI, restore UX, and end-to-end review coverage

Execution artifacts:

- `.planning/phases/03-review-queue-and-import-history/03-01-SUMMARY.md`
- `.planning/phases/03-review-queue-and-import-history/03-02-SUMMARY.md`
- `.planning/phases/03-review-queue-and-import-history/03-03-SUMMARY.md`
- `.planning/phases/03-review-queue-and-import-history/03-04-SUMMARY.md`
- `.planning/phases/03-review-queue-and-import-history/03-VERIFICATION.md`
- GitHub epic `#3`
- GitHub stories `#22`, `#23`, `#24`, and `#25`

## Active Enhancement Branches

### UI Polish and Multi-Profile Lock Screen

Goal: improve the product shell presentation between roadmap phases without changing the release roadmap shape.

Current branch scope:

- left-rail-first navigation with duplicate top-right actions removed
- refreshed empty dashboard and import workspace spacing
- multi-profile local lock screen with profile selection before PIN entry
- dedicated create-new-profile screen instead of inline expansion
- PIN reveal toggle on the lock screen
- refreshed browser and unit tests covering the new shell and lock flows

## How We Track Delivery

- GitHub Milestone: release-level target date
- GitHub Project: board-style tracking across backlog, ready, in progress, review, done
- Epic issues: one per roadmap phase
- Story issues: one per planned wave once a phase is planned
