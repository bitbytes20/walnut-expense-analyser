# State: Walnut Expense Analyser

**Initialized:** 2026-03-27
**Project status:** Phase 2 UI spec approved, ready for Phase 2 planning
**Roadmap status:** Release 1 Phase 1 complete, Phase 2 discussed with approved UI contract and awaiting planning

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-27)

**Core value:** A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.
**Current focus:** Phase 2 - Statement Import Pipeline planning

## Current Position

- Repo now includes the initial desktop shell, onboarding flow, lock screen, and Phase 1 verification artifacts.
- Release 1 is the trusted import-to-insight loop for one ICICI account profile.
- The project should stay Windows-first, local-first, and offline-first for core flows.
- Future releases cover budgeting, AI summaries, additional banks, sync, web, and mobile.

## Active Decisions Already Locked

- Shared household model on one local device
- Device owner with PIN unlock and recovery key
- Parsed records only, no stored import files
- Strict ICICI import support in release 1
- Dedicated review queue with mixed import gating
- Starter categories and rules with user-rule precedence
- Premium dashboard with both themes
- Full audit ledger, redacted diagnostics, and local crash reports

## Delivery Expectations

- Use GitHub Issues, Projects, and Wiki for tracking and reference material.
- Update relevant documentation with every feature and bug fix.
- Maintain a full test pyramid.
- Preserve modular boundaries so future web/mobile clients can reuse domain logic.

## Session History

- 2026-03-27: Phase 1 context gathered at `.planning/phases/01-product-shell-and-security/01-CONTEXT.md`
- 2026-03-27: Phase 1 UI design contract approved at `.planning/phases/01-product-shell-and-security/01-UI-SPEC.md`
- 2026-03-27: Phase 1 execution plans created at `.planning/phases/01-product-shell-and-security/01-01-PLAN.md`, `.planning/phases/01-product-shell-and-security/01-02-PLAN.md`, and `.planning/phases/01-product-shell-and-security/01-03-PLAN.md`
- 2026-03-27: Phase 2 context gathered at `.planning/phases/02-statement-import-pipeline/02-CONTEXT.md`
- 2026-03-27: Phase 2 UI design contract approved at `.planning/phases/02-statement-import-pipeline/02-UI-SPEC.md`

## Immediate Next Action

Run `$gsd-plan-phase 2` to turn the import-pipeline decisions into executable waves.

---
*Last updated: 2026-03-27 after Phase 2 discussion*
