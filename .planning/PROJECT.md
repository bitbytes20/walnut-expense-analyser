# Walnut Expense Analyser

## What This Is

Walnut Expense Analyser is a Windows-first desktop app for a local household to import personal bank statements and understand spending clearly. v1.0 shipped a complete import-to-insight loop for a single ICICI account profile, combining guided onboarding, strong local privacy, strict statement parsing, review workflows, searchable transaction ledger, category/rule engine, premium analytics dashboard, full audit ledger, diagnostics, and owner settings with encrypted backup/restore.

## Current State

**v1.0 shipped 2026-03-29** — 8 phases, 30 plans, ~19,100 lines TypeScript across 78 source files.

The trusted local loop is complete: import → review → categorize → analyze → audit. All 34 v1 requirements satisfied. The app is usable end-to-end for a single ICICI account on Windows.

**Next milestone:** v2.0 Release 2: Core — workflow polish, rule system expansion, budgeting foundations (Phases 9-11).

## Core Value

A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.

## Requirements

### Validated — v1.0

- ✓ Trusted local-first desktop workflow from onboarding to dashboard insight — v1.0 (Phases 1-8)
- ✓ Guided onboarding with 6-digit PIN, recovery key, and single ICICI account setup — v1.0 (Phase 1)
- ✓ Strict ICICI CSV/XLS/XLSX import with parser confidence scoring and hard duplicate blocking — v1.0 (Phase 2)
- ✓ Review queue, mixed import gating, and full import history with batch detail receipts — v1.0 (Phase 3)
- ✓ Transaction normalization, full-field editing, freeform tags, and advanced search/filter — v1.0 (Phase 4)
- ✓ Protected system taxonomy with starter categories/rules, user-rule precedence, preview-first bulk apply — v1.0 (Phase 5)
- ✓ Premium dashboard with spend-by-category, trends, recurring detection, merchant insights, date-range controls — v1.0 (Phase 6)
- ✓ Full audit event ledger, redacted diagnostics bundle, and local crash report storage — v1.0 (Phase 7)
- ✓ Owner settings with encrypted backup/restore, change-PIN, configurable idle timeout, theme toggle, keyboard shortcuts — v1.0 (Phase 8)
- ✓ Data privacy: parsed records only, no retained statement files, PIN protection, diagnostics redaction — v1.0 (Phases 1-8)

### Active — v2.0 Goals

- [ ] Improve review throughput, search ergonomics, and import troubleshooting speed
- [ ] Strengthen categorization controls and operational safety for daily use
- [ ] Begin budgeting only after trust in import and categorization is proven

### Out of Scope

- Multi-bank and multi-account support — deferred until the single-account ICICI flow is proven stable in real use
- Web app and mobile app clients — explicitly deferred until the modular desktop core proves itself
- Private family member profiles and role-based permissions — early releases are a shared household space on one device
- Budgeting in v1.0 — intentionally deferred until the import, categorization, and analytics loop is trusted
- Rich AI recommendations or advisor-style coaching — AI should remain lightweight, optional, and non-core in early releases

## Context

- **Tech stack:** Electron, React, TypeScript, SQLite (better-sqlite3), Vitest, @node-rs/argon2
- **Codebase:** ~19,100 lines TypeScript, 78 source files, 30 plans executed
- **Platform:** Windows-first, local-first, offline-first
- **Import:** Strict ICICI CSV/XLS/XLSX support. Parser favors correctness; uncertain cases route to review queue
- **Security:** scrypt + AES-256-GCM backup encryption, argon2 PIN hashing, session lock, no cloud dependency
- **Known gaps surfaced in UAT:** Settings screen visual walkthrough (pending human verification), theme persistence, backup native dialog behavior — these are human-verified items from phase 8 UAT

## Constraints

- **Platform**: Windows desktop only for release 1 — scope stays tight and native desktop workflows prioritized
- **Data ownership**: Local-first single device owner — owner controls recovery artifacts, flags, backups, and reset tools
- **Security**: PIN-based unlock with 6+ digits, launch lock, configurable idle re-lock — privacy works without web-style authentication
- **Privacy**: Store parsed records only, not imported files — limits long-term sensitive-file retention risk
- **Import compatibility**: Strict ICICI format first — correctness matters more than early breadth
- **Performance**: Dashboard and transaction filtering feel near-instant on local data — analysis UX must remain fluid
- **Accessibility**: Solid keyboard navigation and shortcuts required — core workflows cannot depend on mouse-only operation
- **Language/Currency**: English only with one base currency for early releases
- **Supportability**: Diagnostics safe to share by default, richer locally — support tools cannot leak sensitive transaction details

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Windows-first desktop release | Faster path to a trusted local product in the user's current environment | ✓ Shipped v1.0 |
| Shared household on one device | Family direction matters, but role complexity should wait | ✓ Working in v1.0 |
| PIN unlock instead of username/password | Desktop-only local app does not need web auth yet | ✓ Validated |
| Recovery via one-time recovery key | Enables local recovery without central accounts | ✓ Validated |
| Parsed records only, no file retention | Protects privacy and limits sensitive document storage | ✓ Validated |
| Strict ICICI import first | Trustworthy narrow support is better than weak generic parsing | ✓ Validated |
| User rules always override heuristics | Manual corrections must stay authoritative | ✓ Validated in Phase 5 |
| Dedicated review queue plus mixed import gating | Critical errors should block, lower-risk items can be resolved later | ✓ Validated in Phase 3 |
| Built-in starter categories and rules | Improves first-use value and reduces manual setup friction | ✓ Validated in Phase 5 |
| Premium dashboard with both themes | Product should feel intentional and polished from the start | ✓ Validated in Phase 6 |
| Full audit ledger and diagnostics bundle | Finance workflows need traceability and supportability | ✓ Validated in Phase 7 |
| scrypt + AES-256-GCM for backup encryption | Node crypto built-ins, no extra deps, strong security | ✓ Shipped in Phase 8 |
| Keyboard shortcuts Ctrl+1-8 for navigation | Keyboard-first workflows; Ctrl+8 also locks app | ✓ Shipped in Phase 8 |
| Release roadmap `Foundation → Core → Smart` | Keeps first release focused while preserving AI and expansion plans | ✓ v1.0 complete, v2.0 planned |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after v1.0 milestone completion — all 8 phases, 34/34 requirements satisfied*
