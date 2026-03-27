# Phase 3: Review Queue and Import History - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface unresolved import issues and prior import batches in a trustworthy owner-facing workflow. This phase covers the dedicated review queue, import history list and detail views, batch reopening into review, live import-status updates, and safe resolution actions for ambiguous or flagged records. Full transaction-ledger exploration, categorization, dashboard analytics, and broader audit reporting remain separate phases.

</domain>

<decisions>
## Implementation Decisions

### Review Queue Model
- **D-01:** The Phase 3 review queue should include all current unresolved item types: duplicate-candidate transactions, parser-uncertainty rows, deferred worksheet decisions, balance continuity warnings, and unsupported rows skipped from an otherwise accepted import.
- **D-02:** The review queue should be organized by import batch first, not by issue type or a flat global queue.
- **D-03:** Review actions must include mark as duplicate, mark as not duplicate, accept parsed row as-is, edit key transaction fields before accepting, discard row, and apply a tag for later follow-up.
- **D-04:** The review queue should show unresolved items only, rather than mixing resolved history into the same surface.

### Import History Behavior
- **D-05:** Each import-history row should show import date/time, account, file count, accepted transaction count, blocked duplicate count, unresolved review count, and a status badge.
- **D-06:** Import history should include all import attempts, including successful, failed, and rejected imports.
- **D-07:** Batch detail should include a summary, per-file outcomes, and transaction-level drill-down.
- **D-08:** A past import batch should be directly reopenable into its unresolved review workflow from import history.

### Review-to-Import Relationship
- **D-09:** Any batch with unresolved items should remain in a `Needs review` state until all items are resolved.
- **D-10:** Accepted transactions from a batch should still be available to later ledger and dashboard phases even while review remains pending.
- **D-11:** Review work may happen across multiple sessions and partial passes; the user does not need to finish a batch in one sitting.
- **D-12:** Import-history summary counts should update live as review items are resolved or reclassified.

### Resolution Workflow and Safety
- **D-13:** When editing a review item before accepting, the recommended editable field set for Phase 3 is date, description, reference ID, and tags.
- **D-14:** Amount and running balance should not be bulk-editable or casually mutable during Phase 3 review because they are the highest-risk fields for statement trust; those should stay protected unless a later dedicated correction workflow is designed.
- **D-15:** Recommended bulk actions for Phase 3 are accept selected as-is, discard selected, mark selected as duplicate, mark selected as not duplicate, and apply a tag to selected.
- **D-16:** Every review resolution action must create an audit event.
- **D-17:** Phase 3 should support undo or soft-restore for mistaken discard or duplicate decisions.

### the agent's Discretion
- Exact visual treatment for batch-grouped review cards, provided unresolved urgency and batch context stay clear.
- Exact wording and iconography for `Needs review`, `Rejected`, `Imported`, and related status badges.
- Exact undo-window implementation details, as long as mistaken destructive review decisions are recoverable.
- Exact threshold language for warning-style review items such as balance continuity concerns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning artifacts
- `.planning/PROJECT.md` - Product vision, trust posture, privacy constraints, and locked release-1 expectations
- `.planning/REQUIREMENTS.md` - Phase-linked requirements that Phase 3 should satisfy around reviewability, import history, and trust workflows
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and its position between import ingestion and transaction-ledger phases
- `.planning/STATE.md` - Current project status and immediate planning focus
- `.planning/phases/02-statement-import-pipeline/02-CONTEXT.md` - Prior import-pipeline constraints and duplicate-blocking assumptions that Phase 3 must extend

### Existing implementation
- `src/main/import/import-coordinator.ts` - Current import orchestration and batch outcomes that Phase 3 will surface and extend
- `src/main/import/parser.ts` - Current parser result structure and warning/rejection hooks
- `src/main/persistence/db.ts` - Import-batch and transaction persistence layer to extend for review state and history queries
- `src/shared/contracts/import.ts` - Shared import contracts that should evolve to include review queue and history shapes
- `src/renderer/features/import/ImportWorkspace.tsx` - Existing import workspace that should hand off naturally into history and unresolved review flows
- `src/renderer/App.tsx` - Current shell routing and state transitions that will need new history/review entry points

### External reference signals
- `https://help.monarchmoney.com/hc/en-us/articles/5528707082516-Reviewing-Transactions` - Example of keeping imported transactions reviewable and editable after import
- `https://help.monarchmoney.com/hc/en-us/articles/4409682789908-Import-transaction-data-manually-from-banks-or-other-finance-apps` - Import workflow reference for manual batch handling
- `https://www.quicken.com/support/how-do-i-import-data-quicken-windows/` - Import-history and post-import review expectations in a desktop finance context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/import/import-coordinator.ts` already centralizes per-file outcomes and is the natural place to emit reviewable unresolved states.
- `src/main/persistence/db.ts` already persists import batches and imported rows, making it the primary extension point for batch history and review resolution state.
- `src/shared/contracts/import.ts` already defines staged-file, duplicate, and normalized-row contracts that should be extended rather than replaced.
- `src/renderer/features/import/ImportWorkspace.tsx` already contains the visual language for file outcomes and can seed the import-history/detail experience.

### Established Patterns
- Main-process capabilities are exposed through typed preload IPC surfaces rather than renderer-owned data access.
- Shared contracts remain the source of truth between renderer and main process.
- The app favors explicit trust cues, inspectable outcomes, and owner-facing corrective workflows over silent automation.
- Feature UIs are organized by domain folders under `src/renderer/features`.

### Integration Points
- Phase 3 should turn current import outcomes into persisted history entries and unresolved review items without changing the record-only storage posture.
- The import workspace, dedicated review queue, and future transaction ledger need a clean handoff model so accepted transactions remain usable even when some review work is still pending.
- Audit hooks for review decisions should align with the future dedicated audit phase rather than inventing incompatible event shapes now.

</code_context>

<specifics>
## Specific Ideas

- Review should feel like a financial operations inbox, grouped by import batch so users always understand the source context behind each unresolved item.
- Import history should be useful both as a trusted receipt of what happened and as a re-entry point into unfinished work.
- Live summary updates matter because the user explicitly wants counts and batch state to reflect ongoing resolution work.
- Undo or soft-restore is part of the product trust model for destructive review decisions.

</specifics>

<deferred>
## Deferred Ideas

- Full transaction-ledger exploration and advanced search belong to Phase 4.
- Categorization and user-rule application belong to Phase 5.
- Dashboard analytics that surface import-history metrics belong to Phase 6.
- Broader audit-ledger browsing and diagnostics UX belong to Phase 7.

</deferred>

---
*Phase: 03-review-queue-and-import-history*
*Context gathered: 2026-03-27*
