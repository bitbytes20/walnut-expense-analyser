# AGENTS.md

## Project

Walnut Expense Analyser is a Windows-first, local-first desktop personal finance app. The first release is a trusted import-to-insight loop for a shared household on one device, starting with one ICICI account profile and strong privacy, review, audit, search, and dashboard workflows.

## Source of Truth

- Project context: `.planning/PROJECT.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Roadmap: `.planning/ROADMAP.md`
- State: `.planning/STATE.md`
- Config: `.planning/config.json`

Read those files before planning or implementing work.

## Workflow Expectations

- Use GSD phase flow rather than ad hoc execution when possible.
- Recommended next step after initialization: `$gsd-discuss-phase 1`
- Keep documentation current after every feature and bug fix.
- Maintain a full test pyramid for all implemented work.
- Prefer modular boundaries between domain logic, parsing, persistence, and UI so future web/mobile clients stay feasible.

## Product Guardrails

- Release 1 is Windows desktop only.
- Core flows must work offline.
- Use local PIN unlock with recovery key, not web-style auth.
- Never retain uploaded statement files after parsing.
- Favor parsing correctness over aggressive guessing.
- User rules always override heuristics.
- Built-in categories are protected; user-created categories are manageable.
- Auditability and privacy are first-class requirements, not polish.

## Current Roadmap Shape

- Release 1: Foundation
- Release 2: Core
- Release 3: Smart

Phase 1 is `Product Shell and Security`.
