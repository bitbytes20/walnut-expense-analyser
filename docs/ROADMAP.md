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
Status: implemented on `phase/1-product-shell-and-security`, in PR review against `release/1.0.0`.

### Phase 2: Statement Import Pipeline

Goal: build the strict ICICI import flow and local record-only persistence model with hard duplicate blocking.

### Phase 3: Review Queue and Import History

Goal: handle ambiguous imports explicitly and preserve trust through review workflows.

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

## Phase 1 Planned Waves

Phase 1 was decomposed into three execution waves and all three are now implemented:

- Wave 1: desktop shell scaffold, persistence layer, typed contracts
- Wave 2: onboarding wizard, recovery confirmation, empty-dashboard handoff
- Wave 3: lock screen, PIN enforcement, relock behavior, recovery reset

Execution artifacts:

- `.planning/phases/01-product-shell-and-security/01-01-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-02-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-03-SUMMARY.md`
- `.planning/phases/01-product-shell-and-security/01-VERIFICATION.md`

## How We Track Delivery

- GitHub Milestone: release-level target date
- GitHub Project: board-style tracking across backlog, ready, in progress, review, done
- Epic issues: one per roadmap phase
- Story issues: one per planned wave once a phase is planned
