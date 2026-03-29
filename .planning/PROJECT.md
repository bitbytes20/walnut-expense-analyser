# Walnut Expense Analyser

## What This Is

Walnut Expense Analyser is a Windows-first desktop app for a local household to import personal bank statements and understand spending clearly. The first release focuses on one trusted import-to-insight loop for a single ICICI account profile, combining guided onboarding, strong local privacy, statement parsing, review workflows, search, rules, and a premium analytics dashboard.

## Core Value

A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.

## Requirements

### Validated

- Trusted local-first onboarding-to-dashboard shell validated in Phase 1: Product Shell and Security.
- PIN launch/manual lock flows and recovery-key confirmation posture validated in Phase 1: Product Shell and Security.
- Single-account ICICI setup path validated in Phase 1: Product Shell and Security.

### Active

- [x] Deliver a trusted local-first desktop workflow from onboarding to dashboard insight. — Validated in Phase 1: Product Shell and Security
- [x] Support strict ICICI statement ingestion with strong correctness, review, and duplicate handling. — Validated in Phases 2–3: Statement Import Pipeline and Review Queue
- [x] Provide searchable transactions, category/rule management, and auditability for every meaningful change. — Validated in Phase 7: Audit and Diagnostics
- [x] Ship a premium finance dashboard with fast filtering, date controls, and strong keyboard accessibility. — Validated in Phases 6 and 8: Dashboard Analytics and Settings/Release Hardening
- [x] Keep data private on-device with PIN protection, encrypted backups, diagnostics redaction, and no retained statement files. — Validated in Phase 8: Settings and Release Hardening (backup encryption, change-PIN, full reset)

### Out of Scope

- Multi-bank and multi-account support - deferred until the single-account ICICI flow is stable.
- Web app and mobile app clients - explicitly deferred until the modular desktop core proves itself.
- Private family member profiles and role-based permissions - early releases are a shared household space on one device.
- Budgeting - intentionally deferred until the import, categorization, and analytics loop is trusted.
- Rich AI recommendations or advisor-style coaching - early AI should remain lightweight, optional, and non-core.

## Context

- The repo is greenfield and currently contains no application code or planning artifacts.
- The initial statement samples available to the project are ICICI yearly `.xls` exports, with CSV/XLS/XLSX support expected where the format is known and trusted.
- The product is intended for personal use on Windows, starting with one device owner and one account profile in a shared household context.
- The user wants a premium finance-dashboard feel with both light and dark themes, strong keyboard support, and near-instant dashboard/search responsiveness on local datasets.
- Trust and privacy matter more than aggressive automation. Parsing should favor correctness, route uncertain cases to review, and maintain a full event ledger.
- Uploaded statement files must never be retained in-app; only parsed transaction records, metadata, audit events, rules, and app state should be stored.
- AI summaries are desired only as lightweight, feature-flagged, ephemeral dashboard text and should not become a dependency for core product value.
- Delivery process should use GitHub Issues, Projects, and Wiki, with documentation updates required after each feature and bug fix and a full test pyramid expected from the start.

## Constraints

- **Platform**: Windows desktop only for release 1 - scope must stay tight and native desktop workflows should be prioritized.
- **Data ownership**: Local-first single device owner - the owner controls recovery artifacts, flags, backups, and reset tools.
- **Security**: PIN-based unlock with 6+ digits, launch lock, and 15-minute idle re-lock - privacy must work without web-style authentication.
- **Privacy**: Store parsed records only, not imported files - reduces long-term sensitive-file retention risk.
- **Import compatibility**: Strict ICICI format first - correctness matters more than early breadth.
- **Performance**: Dashboard and transaction filtering should feel near-instant on local data - analysis UX must remain fluid.
- **Accessibility**: Solid keyboard navigation and keyboard shortcuts are required - core workflows cannot depend on mouse-only operation.
- **Language/Currency**: English only with one base currency for early releases - future currency expansion should be planned but not implemented yet.
- **Supportability**: Diagnostics must be safe to share by default and richer only locally - support tools cannot leak sensitive transaction details.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Windows-first desktop release | Faster path to a trusted local product in the user's current environment | - Pending |
| Shared household on one device | Family direction matters, but role complexity should wait | - Pending |
| PIN unlock instead of username/password | Desktop-only local app does not need web auth yet | - Pending |
| Recovery via one-time recovery key | Enables local recovery without central accounts | - Pending |
| Parsed records only, no file retention | Protects privacy and limits sensitive document storage | - Pending |
| Strict ICICI import first | Trustworthy narrow support is better than weak generic parsing | - Pending |
| User rules always override heuristics | Manual corrections must stay authoritative | - Pending |
| Dedicated review queue plus mixed import gating | Critical errors should block, lower-risk items can be resolved later | - Pending |
| Built-in starter categories and rules | Improves first-use value and reduces manual setup friction | - Pending |
| Premium dashboard with both themes | Product should feel intentional and polished from the start | - Pending |
| Full audit ledger and diagnostics bundle | Finance workflows need traceability and supportability | Validated in Phase 7 |
| Release roadmap `Foundation -> Core -> Smart` | Keeps the first release focused while preserving future AI and expansion plans | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after Phase 7 execution — Phases 1–7 complete, Phase 8 (Settings and Release Hardening) next*
