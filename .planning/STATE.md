---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: "Release 2: Core"
status: executing
last_updated: "2026-03-30T15:03:00.000Z"
last_activity: 2026-03-30 -- Phase 10 Plan 03 complete
progress:
  total_phases: 11
  completed_phases: 9
  total_plans: 40
  completed_plans: 38
---

# State: Walnut Expense Analyser

**Initialized:** 2026-03-27
**Project status:** v2.0 roadmap created — Phase 9 next
**Roadmap status:** v1.0 shipped (8 phases, 30 plans); v2.0 Phases 9-14 defined (49 requirements)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-29)

**Core value:** A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.
**Current focus:** Phase 10 — rule-system-expansion

**Active implementation branch:** `release/1.1.0`

## Current Position

Phase: 10 (rule-system-expansion) — EXECUTING
Plan: 3 of 5 complete
Status: Executing Phase 10
Last activity: 2026-03-30 -- Phase 10 Plan 03 complete

Progress: [░░░░░░] 0/6 phases complete

- v1.0 shipped 2026-03-29: 8 phases, 30 plans, ~19,100 lines TypeScript across 78 source files.
- v2.0 starts at Phase 9 with workflow polish improvements to the surfaces used daily.
- Phase ordering: 9 (Workflow) → 10 (Rules) → 11 (Budget) → 12 (AI) → 13 (Family) → 14 (WanderLog).
- Phase 13 depends on Phase 11 (FAMILY-06 uses budget data); Phase 14 depends on Phase 13 (WLOG-08 needs family members) and Phase 9 (WLOG-03 reuses multi-select).
- Phase 12 (AI) depends on Phase 11 (AI-02 budget health commentary needs budget data).

## Active Decisions Already Locked

- Shared household model on one local device
- Device owner with PIN unlock and recovery key
- Parsed records only, no stored import files
- Strict ICICI import support in release 1
- Dedicated review queue with mixed import gating
- Starter categories and rules with user-rule precedence
- Protected system taxonomy with optional user subcategories and preview-first bulk rule application
- Premium dashboard with both themes
- Repository-backed dashboard snapshot aggregation with recurring detection and ledger drill-down
- Full audit ledger, redacted diagnostics, and local crash reports
- Duplicate candidates and worksheet/parser uncertainty persist as blocking review items
- Import attempts persist durable file outcomes and counters in SQLite for history and queue refetches
- Import history summaries derive live counts and final status from repository aggregates instead of stale stored attempt counters
- Batch detail now uses a receipt payload with summary, file outcomes, and grouped transaction drill-down
- Review mutations now emit durable audit rows through the existing local event ledger and persist resolution metadata for restore semantics
- Renderer queue work should refetch authoritative batch detail after resolve or restore instead of keeping mutation state locally

## v2.0 Phase Summary

| Phase | Goal | Requirements |
|-------|------|--------------|
| 9 — Workflow Polish | Users can move faster through review, categorization, and transaction management | WORKFLOW-01 to WORKFLOW-09 (9) |
| 10 — Rule System Expansion | Precise composable rules; category rename/merge correctness guaranteed | RULES-01 to RULES-11 (11) |
| 11 — Budgeting Foundations | Monthly spend targets with color-coded variance view | BUDGET-01 to BUDGET-05 (5) |
| 12 — AI Insights | Owner-triggered AI insights card with no passive data egress | AI-01 to AI-04 (4) |
| 13 — Family Members | Multi-member profiles sharing one taxonomy; family aggregate dashboard | FAMILY-01 to FAMILY-09 (9) |
| 14 — WanderLog | Named expense-tracking contexts overlaid on the standard ledger | WLOG-01 to WLOG-11 (11) |

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
- 2026-03-27: Phase 2 execution plans created at `.planning/phases/02-statement-import-pipeline/02-01-PLAN.md`, `.planning/phases/02-statement-import-pipeline/02-02-PLAN.md`, and `.planning/phases/02-statement-import-pipeline/02-03-PLAN.md`
- 2026-03-27: Phase 2 executed with summaries at `.planning/phases/02-statement-import-pipeline/02-01-SUMMARY.md`, `.planning/phases/02-statement-import-pipeline/02-02-SUMMARY.md`, `.planning/phases/02-statement-import-pipeline/02-03-SUMMARY.md`, and `.planning/phases/02-statement-import-pipeline/02-VERIFICATION.md`
- 2026-03-27: Phase 3 context gathered at `.planning/phases/03-review-queue-and-import-history/03-CONTEXT.md`
- 2026-03-27: Phase 3 research captured at `.planning/phases/03-review-queue-and-import-history/03-RESEARCH.md`
- 2026-03-27: Phase 3 UI design contract approved at `.planning/phases/03-review-queue-and-import-history/03-UI-SPEC.md`
- 2026-03-27: Phase 3 execution plans created at `.planning/phases/03-review-queue-and-import-history/03-01-PLAN.md`, `.planning/phases/03-review-queue-and-import-history/03-02-PLAN.md`, `.planning/phases/03-review-queue-and-import-history/03-03-PLAN.md`, and `.planning/phases/03-review-queue-and-import-history/03-04-PLAN.md`
- 2026-03-27: Phase 3 Plan 01 executed with summary at `.planning/phases/03-review-queue-and-import-history/03-01-SUMMARY.md`
- 2026-03-27: Phase 3 Plan 02 executed with summary at `.planning/phases/03-review-queue-and-import-history/03-02-SUMMARY.md`
- 2026-03-27: Phase 3 Plan 03 executed with summary at `.planning/phases/03-review-queue-and-import-history/03-03-SUMMARY.md`
- 2026-03-27: Phase 3 Plan 04 executed with summary at `.planning/phases/03-review-queue-and-import-history/03-04-SUMMARY.md`
- 2026-03-27: Phase 3 verification completed at `.planning/phases/03-review-queue-and-import-history/03-VERIFICATION.md`
- 2026-03-28: UI polish branch refreshed the shell navigation, lock screen, local profile selection flow, and regression coverage on `enhancement/ui-polish`
- 2026-03-28: Phase 4 context, research, UI contract, validation, and execution plans created at `.planning/phases/04-transaction-ledger-and-search/`
- 2026-03-28: Phase 4 executed with summaries at `.planning/phases/04-transaction-ledger-and-search/04-01-SUMMARY.md`, `.planning/phases/04-transaction-ledger-and-search/04-02-SUMMARY.md`, `.planning/phases/04-transaction-ledger-and-search/04-03-SUMMARY.md`, `.planning/phases/04-transaction-ledger-and-search/04-04-SUMMARY.md`, and `.planning/phases/04-transaction-ledger-and-search/04-VERIFICATION.md`
- 2026-03-28: Phase 4 branch absorbed the active shell polish work, including responsive lock-screen behavior, multi-profile selection, import-workspace layout cleanup, and ledger summary/filter refinements
- 2026-03-28: Phase 5 context gathered at `.planning/phases/05-categories-and-rules/05-CONTEXT.md`
- 2026-03-28: Phase 5 research captured at `.planning/phases/05-categories-and-rules/05-RESEARCH.md`
- 2026-03-28: Phase 5 UI design contract approved at `.planning/phases/05-categories-and-rules/05-UI-SPEC.md`
- 2026-03-28: Phase 5 validation strategy and execution plans created at `.planning/phases/05-categories-and-rules/05-VALIDATION.md`, `.planning/phases/05-categories-and-rules/05-01-PLAN.md`, `.planning/phases/05-categories-and-rules/05-02-PLAN.md`, `.planning/phases/05-categories-and-rules/05-03-PLAN.md`, and `.planning/phases/05-categories-and-rules/05-04-PLAN.md`
- 2026-03-28: Phase 5 executed with summaries at `.planning/phases/05-categories-and-rules/05-01-SUMMARY.md`, `.planning/phases/05-categories-and-rules/05-02-SUMMARY.md`, `.planning/phases/05-categories-and-rules/05-03-SUMMARY.md`, `.planning/phases/05-categories-and-rules/05-04-SUMMARY.md`, and `.planning/phases/05-categories-and-rules/05-VERIFICATION.md`
- 2026-03-28: Phase 6 context gathered at `.planning/phases/06-dashboard-analytics/06-CONTEXT.md`
- 2026-03-28: Phase 6 research captured at `.planning/phases/06-dashboard-analytics/06-RESEARCH.md`
- 2026-03-28: Phase 6 UI design contract approved at `.planning/phases/06-dashboard-analytics/06-UI-SPEC.md`
- 2026-03-28: Phase 6 validation strategy and execution plans created at `.planning/phases/06-dashboard-analytics/06-VALIDATION.md`, `.planning/phases/06-dashboard-analytics/06-01-PLAN.md`, `.planning/phases/06-dashboard-analytics/06-02-PLAN.md`, `.planning/phases/06-dashboard-analytics/06-03-PLAN.md`, and `.planning/phases/06-dashboard-analytics/06-04-PLAN.md`
- 2026-03-28: Phase 6 executed with summaries at `.planning/phases/06-dashboard-analytics/06-01-SUMMARY.md`, `.planning/phases/06-dashboard-analytics/06-02-SUMMARY.md`, `.planning/phases/06-dashboard-analytics/06-03-SUMMARY.md`, `.planning/phases/06-dashboard-analytics/06-04-SUMMARY.md`, and `.planning/phases/06-dashboard-analytics/06-VERIFICATION.md`
- 2026-03-29: Phase 7 and Phase 8 completed; v1.0 shipped
- 2026-03-30: v2.0 roadmap created — Phases 9-14, 49 requirements mapped
- 2026-03-30: Phase 9 planned — 5 plans (09-01 to 09-05), 2 waves, WORKFLOW-01 through WORKFLOW-09 covered
- 2026-03-30: Phase 9 complete — 13/13 must-haves verified, 24 new passing tests, human verification approved

## Phase 8 Decisions

- changePin uses _setRepositoryForTesting pattern for testability without mocking Electron IPC
- Idle lock timeout reads from AppConfig at timer-reset time; 0 means never lock
- CSS theme toggle: data-theme attribute on root element with :not guard on OS preference media query
- clearTransactionsAndAudit wraps deletes in SQLite BEGIN/COMMIT for atomicity
- fullAppReset deletes device_profiles/snapshots tables to ensure clean slate
- handleGlobalShortcut exported as pure function for testability; GlobalShortcutActions interface uses WorkspaceScreen union type for TypeScript correctness
- setImportAreaScreen in GlobalShortcutActions uses '{ type: workspace | history }' narrowing to satisfy Dispatch<SetStateAction<ImportAreaScreen>> constraint

## Phase 9 Decisions

- filter_presets uses raw SQL in bootstrap() consistent with all other Phase 9 table creation patterns (not Drizzle migration)
- Filter preset CRUD methods (save/rename/delete) return full list after mutation — matches categories and rules IPC pattern
- bulkUpdateTransactions wraps all updates in SQLite transaction() for atomicity; builds SET clause dynamically from input fields present
- replaceStagedFile deletes old staged entry and re-parses new file while preserving all other staged entries in coordinator
- Wave 0 test scaffolds use it.todo() stubs so vitest run passes without implementation (stubs enabled in Wave 2 plans)
- Excel serial date numbers (floats 1-80000) accepted as valid dates in parser since xlsx returns these from XLS/XLSX date cells
- StagedFileRow onRetry prop only passed to rejected files to limit replace-in-place to the right context
- Files with parseErrors get status=rejected so they sort into the Rejected section and show inline error expansion

## Phase 10 Decisions

- descriptionTerms uses AND semantics: all terms must match for rule to fire
- migrateDescriptionContainsToDescriptionTerms() runs at WalnutRepository bootstrap init
- RuleEditorPanel UI keeps simple comma-separated text field, maps to op:contains terms (full UI in later plans)
- listRules ORDER BY changed to is_system ASC, sort_order ASC (user rules first per D-05)
- is_archived column added via ensureColumn pattern for safe migration on existing DBs
- Live match preview only on regex rows — other operators don't benefit from per-keystroke IPC
- detectReDoSRisk exported from RuleEditorPanel for reuse
- Dynamic condition rows replace comma-separated keyword field in RuleEditorPanel
- Rename propagation wraps categories.name update + imported_transactions.category_label in SQLite transaction() for atomicity (D-17)
- mergeCategory extends atomic transaction to update rule action_json.categoryId from source to target (Pitfall 4)
- Archive is soft-delete via is_archived flag; pickers filter !isArchived; historical transaction data preserved
- CategoryPane uses RowAction union type for per-row inline states (rename/merge-pick/merge-preview/archive-confirm)
- LIKE-based rule scanning for mergeCategoryPreview: action_json LIKE '%categoryId:X%' to count affected rules

## Immediate Next Action

Phase 10 Plan 03 complete. Category rename propagation, merge preview with atomic rule target update, archive/restore with picker exclusion all implemented. Ready for Plan 04 (drag reorder for rules).

---
*Last updated: 2026-03-30 after Phase 10 Plan 03 completion*
