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
Status: completed on `phase/4-transaction-ledger-and-search`.

### Phase 5: Categories and Rules

Goal: provide strong categorization defaults while keeping user control over rules and custom categories.
Status: completed on `phase/5-categories-and-rules`.

### Phase 6: Dashboard Analytics

Goal: turn trusted local data into fast, premium-feeling insight views.
Status: completed on `phase/6-dashboard-analytics`.

### Phase 7: Audit and Diagnostics

Goal: make important actions traceable and supportable through the audit ledger and diagnostics flow.
Status: completed and merged into `release/1.0.0`.

### Phase 8: Settings and Release Hardening

Goal: complete owner controls, backup/restore, accessibility, and release quality rails.
Status: completed and merged into `release/1.0.0`.

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

## Phase 4 Completed Waves

Phase 4 was decomposed into four execution waves and is now implemented:

- Wave 1: transaction contracts, normalization, and repository query foundation
- Wave 2: transactions workspace, ledger, search, and advanced filters
- Wave 3: transaction detail drawer, immediate-save edits, and rule-suggestion hook
- Wave 4: repository, renderer, and browser verification coverage

Execution artifacts:

- `.planning/phases/04-transaction-ledger-and-search/04-01-SUMMARY.md`
- `.planning/phases/04-transaction-ledger-and-search/04-02-SUMMARY.md`
- `.planning/phases/04-transaction-ledger-and-search/04-03-SUMMARY.md`
- `.planning/phases/04-transaction-ledger-and-search/04-04-SUMMARY.md`
- `.planning/phases/04-transaction-ledger-and-search/04-VERIFICATION.md`
- GitHub epic `#4`
- GitHub stories `#29`, `#30`, `#31`, and `#32`

Follow-through polish shipped on the same branch:

- responsive lock-screen layout for smaller window sizes
- multi-profile local selection before PIN entry
- dedicated create-new-profile screen
- import-workspace layout cleanup
- full-width ledger refinements, summary totals, pagination, explicit description search, and filtered difference totals

## Phase 5 Completed Waves

Phase 5 was decomposed into four execution waves and is now implemented:

- Wave 1: protected taxonomy foundation, durable category ids, and safe category management
- Wave 2: deterministic rule engine, preview-first bulk apply flows, and transaction rule-suggestion handoff
- Wave 3: dual-pane Categories & Rules workspace with side-panel editors and previews
- Wave 4: repository, renderer, and browser verification coverage

Execution artifacts:

- `.planning/phases/05-categories-and-rules/05-01-SUMMARY.md`
- `.planning/phases/05-categories-and-rules/05-02-SUMMARY.md`
- `.planning/phases/05-categories-and-rules/05-03-SUMMARY.md`
- `.planning/phases/05-categories-and-rules/05-04-SUMMARY.md`
- `.planning/phases/05-categories-and-rules/05-VERIFICATION.md`
- GitHub epic `#5`
- GitHub stories `#35`, `#36`, `#37`, and `#39`

## Phase 6 Completed Waves

Phase 6 was decomposed into four execution waves and is now implemented:

- Wave 1: dashboard contracts, aggregate snapshot queries, recurring detection, and persisted range preferences
- Wave 2: dashboard workspace, global controls, summary rows, comparison behavior, and compact-mode layout
- Wave 3: recurring detail, recent/largest widgets, and dashboard drill-down into the ledger
- Wave 4: repository, renderer, and browser verification coverage

Execution artifacts:

- `.planning/phases/06-dashboard-analytics/06-01-SUMMARY.md`
- `.planning/phases/06-dashboard-analytics/06-02-SUMMARY.md`
- `.planning/phases/06-dashboard-analytics/06-03-SUMMARY.md`
- `.planning/phases/06-dashboard-analytics/06-04-SUMMARY.md`
- `.planning/phases/06-dashboard-analytics/06-VERIFICATION.md`

## Phase 7 Completed Waves

Phase 7 was decomposed into four execution waves and all four are now implemented:

- Wave 1: unified audit persistence, `audit_events` ledger table, and crash logging via `electron-log`
- Wave 2: transaction edit auditing with ACID commit, and inline History tab in the transaction detail drawer
- Wave 3: diagnostics bundle generation with privacy redaction and IPC endpoint
- Wave 4: Audit screen, Settings navigation integration, and diagnostics export UI

Execution artifacts:

- `.planning/phases/07-audit-and-diagnostics/07-01-SUMMARY.md`
- `.planning/phases/07-audit-and-diagnostics/07-02-SUMMARY.md`
- `.planning/phases/07-audit-and-diagnostics/07-03-SUMMARY.md`
- `.planning/phases/07-audit-and-diagnostics/07-04-SUMMARY.md`
- `.planning/phases/07-audit-and-diagnostics/07-VERIFICATION.md`

## Phase 8 Completed Waves

Phase 8 was decomposed into four execution waves and all four are now implemented:

- Wave 1: settings backend — AppConfig persistence, encrypted backup/restore, settings and backup IPC
- Wave 2: security operations — change PIN, clear transactions, full reset, configurable idle lock timeout, theme data-attribute support
- Wave 3: keyboard navigation — global keyboard shortcuts with exported pure function for unit-testable handling
- Wave 4: settings UI — full Settings screen with theme toggle, PIN change, feature flags, danger zone, and accessibility

Execution artifacts:

- `.planning/phases/08-settings-and-release-hardening/08-01-SUMMARY.md`
- `.planning/phases/08-settings-and-release-hardening/08-02-SUMMARY.md`
- `.planning/phases/08-settings-and-release-hardening/08-03-SUMMARY.md`
- `.planning/phases/08-settings-and-release-hardening/08-04-SUMMARY.md`
- `.planning/phases/08-settings-and-release-hardening/08-VERIFICATION.md`

## How We Track Delivery

- GitHub Milestone: release-level target date
- GitHub Project: board-style tracking across backlog, ready, in progress, review, done
- Epic issues: one per roadmap phase
- Story issues: one per planned wave once a phase is planned
