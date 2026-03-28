# Phase 4: Transaction Ledger and Search - Research

**Researched:** 2026-03-28
**Domain:** Electron desktop transaction ledgers, local-first search/filter workflows, transaction-type normalization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

- Dense table ledger, newest first, no default grouping
- Default columns: `date`, `description`, `amount`, `type`, `tags`
- Search bar plus advanced filter drawer
- First-class filters: `date range`, `type`, `amount range`, `tags`, `review state`, `category`
- Saved filters deferred
- Right-side edit drawer with immediate-save local mutations
- Editable fields: `amount`, `date`, `description`, `type`, `tags`, `category`, `reference`, `review-state override`
- Baseline `expense` / `income` typing plus conservative special-type detection for `transfer`, `refund`, `atm-withdrawal`, and `credit-card-payment`
- Manual type changes may feed rule suggestions later, but full rule management stays out of scope
- Preserve the current Walnut token system and shell
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRAN-01 | App normalizes transactions into types including expense, income, transfer, refund, ATM withdrawal, and credit-card payment. | Extend imported transactions with a conservative normalized type field derived from debit/credit plus confident special-type heuristics. |
| TRAN-02 | User can edit transaction amount, date, description, type, category, tags, and rule associations. | Use a drawer-driven repository mutation path with authoritative refetch instead of renderer-only row editing. |
| TRAN-04 | User can apply freeform tags to transactions. | Keep tags in the same transaction model and query surface used by the ledger. |
| TRAN-05 | User can search transactions by text and tags and filter by date, category, amount, type, and review state. | Use quick text search over description/reference/tags and structured filters over the required facets. |
</phase_requirements>

## Summary

Phase 4 should be implemented as a real transaction workspace, not a read-only extension of import history. The cleanest path is to extend the existing `imported_transactions` model and expose dedicated list, detail, and update APIs for the renderer instead of creating a parallel ledger store.

For the renderer, dense ledgers are easiest to keep correct and keyboard-friendly when a table abstraction owns row modeling, sorting, and filtering. That avoids spending the phase on custom grid machinery. For responsiveness, quick search and filter changes should stay immediate in the input while expensive recomputation is deferred with React concurrent primitives.

The safest transaction model is conservative: derive `expense` and `income` from debit/credit, then layer a narrow set of confident special-type detections for `transfer`, `refund`, `atm-withdrawal`, and `credit-card-payment`. Anything ambiguous should remain correctable by the user, and user edits should write back to SQLite and refetch authoritative state rather than drift in renderer-only caches.

**Primary recommendation:** Build Phase 4 as a dedicated transaction query/update domain over the existing imported-transaction store, using a table abstraction in the renderer, conservative type normalization in main, and immediate-save drawer edits with authoritative refetch.

## Architecture Patterns

### Recommended Project Structure
```text
src/
+-- main/transactions/              # normalization, list/detail/update services
+-- main/persistence/               # imported transaction schema and query methods
+-- main/ipc/transactions.ts        # transaction ledger IPC handlers
+-- shared/contracts/transactions.ts# ledger query, row, drawer, and update contracts
+-- renderer/features/transactions/ # ledger, filter drawer, edit drawer
\-- renderer/App.tsx                # left-rail route wiring
tests/
+-- unit/transactions/              # normalization, query, update tests
+-- unit/transaction-ledger.test.tsx
\-- e2e/transaction-ledger.spec.ts
```

### Pattern 1: Extend Imported Transactions, Do Not Fork the Store
- Keep `imported_transactions` as the system of record and add the normalized fields Phase 4 needs.
- Do not introduce a separate `ledger_transactions` table that could drift from imports.

### Pattern 2: Separate Quick Search from Structured Filters
- Treat quick text search over description, reference, and tags as one input.
- Model `date range`, `type`, `amount range`, `tags`, `review state`, and `category` as structured filters.

### Pattern 3: Defer Expensive Filter Recalculation
- Use `useDeferredValue` and `startTransition` so typing stays responsive while rows and counts recompute.

### Pattern 4: Immediate-Save Drawer Backed by Repository Refetch
- Save drawer edits directly to SQLite.
- Refetch the authoritative row/list state after mutation instead of maintaining a shadow transaction store in the renderer.

### Pattern 5: Conservative Special-Type Detection
- Auto-assign special transaction types only when text/reference patterns are strong enough.
- Fall back to `expense` or `income` when confidence is not high.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dense ledger row modeling | Custom grid state machine | A table abstraction with sorting/filtering/row models | Faster and safer for a finance-style ledger. |
| Local search performance from day one | Ad hoc nested scans everywhere or premature FTS | One query contract first, FTS5 later if needed | Keeps scope focused while preserving an upgrade path. |
| Multi-surface transaction truth | Separate renderer cache or mirrored table | SQLite-backed imported transactions and authoritative refetch | Preserves trust and consistency with earlier phases. |
| Another review step inside edits | Draft-state modal review | Immediate-save drawer mutations | The product decision is direct correction. |

## Common Pitfalls

1. **Building the ledger like a dashboard table**: too sparse to support fast finance work.
2. **Making search feel slow**: synchronous heavy recomputation blocks typing.
3. **Over-normalizing transaction types**: aggressive heuristics damage trust faster than a conservative fallback.
4. **Hiding important fields in the wrong place**: cluttered rows or a drawer without enough source context.
5. **Letting search/filter logic drift across layers**: renderer and repository disagree about which rows should appear.

## Code Examples

### Responsive Search Input
```tsx
import { useDeferredValue } from 'react'

const [query, setQuery] = useState('')
const deferredQuery = useDeferredValue(query)
```

### Non-Blocking Refetch After Save
```tsx
import { startTransition } from 'react'

await window.walnut.updateTransaction(input)
startTransition(() => {
  refreshLedger()
})
```

### SQLite FTS5 Future Upgrade Path
```sql
CREATE VIRTUAL TABLE transaction_search USING fts5(
  transaction_id UNINDEXED,
  description,
  reference,
  tags
);
```

## Validation Architecture

| Property | Value |
|----------|-------|
| Quick run command | `cmd /c npx vitest run tests/unit/transactions/*.test.ts tests/unit/transaction-ledger.test.tsx` |
| Full suite command | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/transaction-ledger.spec.ts` |

Phase 4 should add:
- `tests/unit/transactions/normalization.test.ts`
- `tests/unit/transactions/query-transactions.test.ts`
- `tests/unit/transactions/update-transaction.test.ts`
- `tests/unit/transaction-ledger.test.tsx`
- `tests/e2e/transaction-ledger.spec.ts`

## Sources

### Primary
- Local repo files:
  - `AGENTS.md`
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/STATE.md`
  - `.planning/phases/04-transaction-ledger-and-search/04-CONTEXT.md`
  - `src/main/persistence/db.ts`
  - `src/main/persistence/schema.ts`
  - `src/main/import/import-coordinator.ts`
  - `src/shared/contracts/import.ts`
  - `src/shared/contracts/app-state.ts`
  - `src/renderer/App.tsx`
- React `useDeferredValue`: https://react.dev/reference/react/useDeferredValue
- React `useTransition`: https://react.dev/reference/react/useTransition
- TanStack Table row models: https://tanstack.com/table/latest/docs/guide/row-models
- TanStack Table filtering: https://tanstack.com/table/latest/docs/guide/column-filtering
- SQLite FTS5: https://sqlite.org/fts5.html

## Metadata

**Research date:** 2026-03-28
**Valid until:** 2026-04-04
