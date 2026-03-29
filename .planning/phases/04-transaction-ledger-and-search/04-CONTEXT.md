# Phase 4: Transaction Ledger and Search - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn imported records into a real transaction workspace. This phase covers the dedicated `Transactions` destination, dense ledger presentation, search and advanced filtering, transaction-type normalization, and immediate-save correction workflows through a right-side detail drawer. Category management, reusable rule authoring, dashboard analytics, and audit-screen reporting remain separate phases.

</domain>

<decisions>
## Implementation Decisions

### Ledger Presentation
- **D-01:** The main transaction workspace should be a dense table-style ledger, not a card list.
- **D-02:** Default visible columns are `date`, `description`, `amount`, `type`, and `tags`.
- **D-03:** Default ordering is newest first.
- **D-04:** The ledger should not group rows by default.

### Search and Filter Experience
- **D-05:** Search should use a single search bar plus an advanced filter drawer.
- **D-06:** First-class filters in Phase 4 are `date range`, `type`, `amount range`, `tags`, `review state`, and `category`.
- **D-07:** Saved filters are deferred to a later polish phase.

### Editing Workflow
- **D-08:** Editing should open in a right-side detail drawer rather than inline or on a separate screen.
- **D-09:** Editable fields from the ledger are `amount`, `date`, `description`, `type`, `tags`, `category`, `reference`, and `review-state override`.
- **D-10:** Ledger edits should apply immediately on save to the local transaction row.

### Transaction Typing
- **D-11:** Phase 4 should infer baseline `expense` and `income` types automatically.
- **D-12:** Phase 4 should also auto-assign confident special types for `transfer`, `refund`, `atm-withdrawal`, and `credit-card-payment`.
- **D-13:** Special-type detection must stay conservative and always allow user override.
- **D-14:** Manual type changes should trigger a reusable rule suggestion flow, but Phase 4 itself should not become the full rule-authoring phase.

### UI Contract
- **D-15:** `Transactions` should become a new destination in the existing left rail.
- **D-16:** The default row surface should stay minimal; category, reference, and richer source context belong in the detail drawer.
- **D-17:** The edit drawer should have two sections: a top transaction snapshot and a lower editable form/action area.
- **D-18:** Preserve the current Walnut token system, palette, and shell patterns; do not migrate to a new component system in this phase.

### the agent's Discretion
- Exact column widths and density settings, as long as the default visible fields remain easy to scan.
- Exact filter-drawer visual treatment and chip/badge styles.
- Exact wording of special-type confidence hints, provided they remain conservative and correctable.
- Exact presentation of rule suggestions after manual type changes, provided the suggestion flow does not absorb full Phase 5 rule management.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning artifacts
- `.planning/PROJECT.md` - Product vision, local-first trust posture, and release-1 scope
- `.planning/REQUIREMENTS.md` - Phase-linked requirements for typing, editing, tagging, and search/filtering
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, and relation to nearby phases
- `.planning/STATE.md` - Current project status and active planning focus
- `.planning/phases/03-review-queue-and-import-history/03-CONTEXT.md` - Prior phase constraints around accepted transactions remaining visible during pending review

### Existing implementation
- `src/main/persistence/db.ts` - Current imported-transaction source of truth that Phase 4 should extend
- `src/main/import/import-coordinator.ts` - Existing import normalization boundary and transaction creation path
- `src/shared/contracts/import.ts` - Current import and review shared contracts that will need transaction-ledger extensions
- `src/shared/contracts/app-state.ts` - Preload API boundary that should grow with transaction list/detail/update methods
- `src/renderer/App.tsx` - Current shell routing and top-level screen orchestration
- `src/renderer/features/import/ImportHistoryScreen.tsx` - Nearby trust-oriented transaction surfaces and shell patterns to align with
- `src/renderer/features/import/ReviewQueueScreen.tsx` - Existing split-pane corrective workflow patterns relevant to the new drawer-based editor

### External reference signals
- `https://react.dev/reference/react/useDeferredValue` - Responsive search rendering guidance
- `https://react.dev/reference/react/useTransition` - Non-blocking update guidance for heavy local filtering
- `https://tanstack.com/table/latest/docs/guide/row-models` - Table row-model guidance for dense ledgers
- `https://tanstack.com/table/latest/docs/guide/column-filtering` - Filtering patterns for table-driven search UIs
- `https://sqlite.org/fts5.html` - Future-proof search upgrade path if local text search becomes a bottleneck

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/persistence/db.ts` already persists imported transactions and is the natural extension point for transaction-ledger queries and updates.
- `src/shared/contracts/import.ts` already contains normalized import row shapes and should be extended rather than replaced.
- `src/renderer/features/import/*` already uses the current Walnut shell, large rounded surfaces, and trust-oriented copy that the transaction workspace should preserve.
- `src/renderer/styles/tokens.css` already defines the visual system; no second design system is needed.

### Established Patterns
- Main-process ownership plus typed preload IPC remains the repo standard for trusted local data.
- Renderer state should refetch authoritative SQLite-backed data after mutation instead of inventing a second source of truth.
- Feature UIs live in domain folders under `src/renderer/features`.
- Local-first trust means the product should prefer correctable conservative defaults over aggressive inference.

### Integration Points
- Phase 4 should read accepted transactions even when some review items remain pending from Phase 3.
- Transaction editing must fit cleanly with later category/rule work in Phase 5.
- Mutation shapes should be structured so a later audit phase can record transaction edits cleanly without redesigning Phase 4 payloads.

</code_context>

<specifics>
## Specific Ideas

- The ledger should feel like a finance operations workspace, not a generic data table.
- Search must support both broad exploration and precise narrowing without slowing typing.
- The edit drawer should act like a focused correction surface: enough context to trust the row, enough controls to fix it quickly, and no modal sprawl.
- Conservative auto-typing should help the user immediately, but never feel like silent guessing.

</specifics>

<deferred>
## Deferred Ideas

- Full category management and rule authoring belong to Phase 5.
- Dashboard analytics that consume normalized transaction types belong to Phase 6.
- Audit-screen browsing of ledger edits belongs to Phase 7.
- Saved filters, advanced column customization, and richer personalization belong to a later polish phase.

</deferred>

---
*Phase: 04-transaction-ledger-and-search*
*Context gathered: 2026-03-28*
