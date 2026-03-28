# Phase 3: Review Queue and Import History - Research

**Researched:** 2026-03-27
**Domain:** Electron desktop review workflows, import-history persistence, local-first finance triage
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- Full transaction-ledger exploration and advanced search belong to Phase 4.
- Categorization and user-rule application belong to Phase 5.
- Dashboard analytics that surface import-history metrics belong to Phase 6.
- Broader audit-ledger browsing and diagnostics UX belong to Phase 7.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPT-05 | App routes uncertain duplicate or parsing cases into review instead of silently accepting them. | Persist unresolved review items as first-class records with typed reasons, per-batch grouping, and explicit resolution actions. |
| IMPT-06 | Import flow blocks completion on critical issues but allows lower-risk review items to remain queued. | Add severity-aware gating in the import coordinator so blocking items stop finalization while warning-level items create queue entries and still expose accepted transactions. |
| IMPT-07 | User can view import history with batch status, counts, and errors. | Store every import attempt, including failed/rejected batches, and expose indexed history summary/detail queries over IPC. |
| REVW-01 | User can return to a dedicated review queue to resolve pending review items after import. | Build a batch-centric unresolved-item query model with durable review state, partial-progress support, and undoable mutations. |
</phase_requirements>

## Summary

Phase 3 is not a renderer-only feature. The current Phase 2 pipeline only knows how to stage files and either import, reject, or duplicate-block them. It does not yet have a durable concept of an unresolved review item, a failed import attempt record, or a batch that is simultaneously "partially accepted" and still "needs review". The plan has to extend parser output, import coordination, persistence, IPC contracts, and renderer navigation together.

The established pattern for this repo is still the right one: main-process ownership for file/import logic, typed preload IPC, shared contracts as the source of truth, and feature-local renderer state. For Phase 3, add a durable review subsystem inside the import domain rather than introducing a separate queue service or client-side cache layer. Use SQLite as the source of truth for batch summaries, unresolved items, reversible resolutions, and drill-down queries. Renderer "live updates" should mean refetch-after-mutation from the repository, not a background sync architecture.

The biggest hidden risks are data-model drift and trust erosion. If unresolved items live only in memory, if history counts are denormalized but not transactionally maintained, or if review edits mutate trusted amount/balance fields, the product will become hard to trust. The safe path is a batch-centric review-item table, explicit severity and lifecycle states, soft-delete style reversibility, and atomic audit emission with every resolution.

**Primary recommendation:** Extend the current import domain with durable `review_items` and `import_attempts` persistence, indexed batch/history queries, and batch-scoped undoable resolution mutations over the existing preload IPC boundary.

## Project Constraints (from AGENTS.md)

- Read `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/config.json` before planning or implementing work.
- Use GSD phase flow rather than ad hoc execution when possible.
- Keep documentation current after every feature and bug fix.
- Maintain a full test pyramid for all implemented work.
- Prefer modular boundaries between domain logic, parsing, persistence, and UI so future web/mobile clients stay feasible.
- Release 1 is Windows desktop only.
- Core flows must work offline.
- Use local PIN unlock with recovery key, not web-style auth.
- Never retain uploaded statement files after parsing.
- Favor parsing correctness over aggressive guessing.
- User rules always override heuristics.
- Built-in categories are protected; user-created categories are manageable.
- Auditability and privacy are first-class requirements, not polish.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `electron` | `30.5.1` | Main/preload/renderer boundary for import, history, and review actions | The repo already uses `ipcMain.handle` + preload exposure, which matches Electron's documented invoke/handle pattern for calling main-process modules from the renderer. |
| `react` | `19.1.1` | Renderer UI for queue, history, filters, and optimistic resolution feedback | React 19 supports `startTransition`, `useDeferredValue`, and `useOptimistic`, which is enough for responsive local list UIs without adding another state library. |
| `better-sqlite3` | `11.8.1` | Durable local source of truth for batches, review items, counters, and reversibility | Synchronous local transactions match the app's offline desktop posture and the library explicitly supports transaction-heavy SQLite usage. |
| `drizzle-orm` | `0.44.5` | Schema definitions and typed query construction around SQLite | Already present in the repo and the documented better-sqlite3 driver path fits the existing persistence layer. |
| `zod` | `4.3.6` | Typed IPC and review-mutation contract validation | The repo already uses shared contracts; Zod is the right place to lock payloads before main-process mutations. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | `4.1.0` | Import-history date formatting and deterministic date normalization | Use for batch labels, history display, and edited review-field normalization instead of native date parsing/formatting. |
| `vitest` | `3.2.4` | Unit and component tests for repository, coordinator, IPC contract, and queue UI behavior | Use for all Phase 3 domain and renderer validation. |
| `@playwright/test` | `1.55.0` | End-to-end import-history and review-queue flows | Use for batch reopen, partial review, undo, and history-count regression coverage. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Feature-local React state plus refetch-after-mutation | `@tanstack/react-query` | Useful for networked apps, but unnecessary indirection for a preload-only local desktop flow this phase. |
| SQLite-backed reversible resolutions | Renderer-only toast undo state | Simpler visually, but it fails D-11 and D-17 because decisions would not survive relaunch or cross-view navigation. |
| Batch-first review grouping | Global flat queue | Faster to build, but it contradicts D-02 and removes the import context users need to trust each resolution. |

**Installation:**
```bash
# No new packages are required for Phase 3.
# Stay on the repo-pinned stack unless a separate upgrade phase is approved.
```

**Version verification:** Verified from the npm registry on 2026-03-27.

- `electron`: repo uses `30.5.1` (published 2024-09-13); latest is `41.1.0` (published 2026-03-27)
- `react`: repo uses `19.1.1` (published 2025-07-28); latest is `19.2.4` (published 2026-01-26)
- `better-sqlite3`: repo uses `11.8.1` (published 2025-01-18); latest is `12.8.0` (published 2026-03-14)
- `drizzle-orm`: repo uses `0.44.5` (published 2025-08-25); latest is `0.45.1` (published 2025-12-10)
- `zod`: repo uses `4.3.6` and it is current (published 2026-01-22)
- `vitest`: repo uses `3.2.4` (published 2025-06-17); latest is `4.1.2` (published 2026-03-26)
- `@playwright/test`: repo uses `1.55.0` (published 2025-08-20); latest is `1.58.2` (published 2026-02-06)

**Recommendation:** Do not combine Phase 3 with dependency upgrades. Use the repo-pinned versions for implementation and capture upgrade debt separately.

## Architecture Patterns

### Recommended Project Structure
```text
src/
+-- main/import/                    # parser output, coordinator gating, history/review services
+-- main/persistence/               # schema, indexes, repository methods, transactions
+-- main/ipc/import.ts              # history/review IPC handlers
+-- shared/contracts/import.ts      # batch, history, review item, mutation contracts
+-- renderer/features/import/       # import workspace, summary, history list/detail, review queue
\-- renderer/App.tsx                # top-level view switching into queue/history
tests/
+-- unit/import/                    # coordinator, repository, mutation, counter drift tests
+-- unit/review/                    # queue UI and bulk-action behavior
\-- e2e/                            # reopen queue, partial resolution, undo, live count updates
```

### Pattern 1: Batch-Centric Review Persistence
**What:** Persist unresolved items as durable rows keyed to `import_batch_id`, with explicit reason type, severity, resolution state, and optional transaction/source-file linkage.
**When to use:** For every ambiguity that should survive app restarts or be reopenable from history.
**Example:**
```ts
// Source pattern: existing SQLite repository shape in
// /f:/BitBytes/github/walnut-expense-analyser/src/main/persistence/db.ts
type ReviewItemSeverity = 'blocking' | 'warning'
type ReviewItemState = 'pending' | 'resolved' | 'restored'

interface ReviewItemRecord {
  id: string
  importBatchId: string
  sourceFileId?: string
  importedTransactionId?: string
  reasonCode:
    | 'duplicate-candidate'
    | 'parser-uncertainty'
    | 'deferred-worksheet'
    | 'balance-continuity-warning'
    | 'unsupported-row-skipped'
  severity: ReviewItemSeverity
  state: ReviewItemState
  snapshotJson: string
  lastResolutionAction?: string
  lastResolutionAuditEventId?: string
  createdAt: string
  updatedAt: string
}
```

### Pattern 2: Import Attempt Ledger Separate From Imported Batch Success
**What:** Store every import attempt, including failed or fully rejected runs, instead of only successful persisted batches.
**When to use:** For IMPT-07 and D-06. Current `import_batches` alone is not enough because it only represents successful writes.
**Example:**
```ts
// Source: project requirement IMPT-07 and D-06 from
// /f:/BitBytes/github/walnut-expense-analyser/.planning/phases/03-review-queue-and-import-history/03-CONTEXT.md
interface ImportAttemptSummary {
  attemptId: string
  relatedBatchId?: string
  status: 'imported' | 'needs-review' | 'rejected' | 'failed'
  importedAt: string
  accountLabel?: string
  fileCount: number
  acceptedTransactionCount: number
  blockedDuplicateCount: number
  unresolvedReviewCount: number
  errorCount: number
}
```

### Pattern 3: Resolution Mutations Must Be Atomic and Reversible
**What:** Wrap review resolution in one SQLite transaction that updates the review item, applies any transaction/file changes, refreshes summary counters, and emits an audit row.
**When to use:** For every single-item or bulk resolution action.
**Example:**
```ts
// Source: transaction usage pattern already established in
// /f:/BitBytes/github/walnut-expense-analyser/src/main/persistence/db.ts
const resolveReviewItems = sqlite.transaction((input) => {
  // 1. validate mutation contract
  // 2. update review_items.state + resolution metadata
  // 3. apply soft-delete / duplicate flag / accepted edits
  // 4. recompute or update import batch counters
  // 5. insert audit event in the same transaction
})
```

### Pattern 4: Renderer Refetch After Mutation, Not Event-Bus Complexity
**What:** After a review action, refetch the affected batch summary and unresolved queue over IPC, and mark UI updates as transitions when large grouped lists rerender.
**When to use:** For live summary counts and batch detail updates.
**Example:**
```ts
// Source: https://react.dev/reference/react/startTransition
import { startTransition } from 'react'

async function resolveAndRefresh(input: ResolveReviewItemsInput) {
  await window.walnut.resolveReviewItems(input)
  startTransition(async () => {
    const [history, queue] = await Promise.all([
      window.walnut.listImportHistory(),
      window.walnut.getReviewQueue({ batchId: input.batchId })
    ])
    setHistory(history)
    setQueue(queue)
  })
}
```

### Pattern 5: Indexed Counter Queries, Not Renderer Recalculation
**What:** Compute import-history badges from repository queries keyed by batch and review state, with indexes on batch/status/state columns.
**When to use:** For D-05, D-09, and D-12.
**Example:**
```sql
-- Source rationale: better-sqlite3 transaction-heavy usage and WAL recommendation
CREATE INDEX IF NOT EXISTS idx_review_items_batch_state
  ON review_items(import_batch_id, state);

CREATE INDEX IF NOT EXISTS idx_import_attempts_status_imported_at
  ON import_attempts(status, imported_at DESC);
```

### Anti-Patterns to Avoid
- **Transient review state only in `ImportCoordinator` memory:** It breaks D-11 immediately because unresolved work disappears on relaunch.
- **Using `import_batches` alone as history:** It cannot represent failed/rejected attempts, so IMPT-07 will be under-modeled.
- **Editing amount or running balance in review:** D-14 explicitly forbids this trust-risky shortcut.
- **Flat global queue first, batch context later:** It conflicts with D-02 and makes duplicate/parser decisions harder to evaluate.
- **Client-only undo:** If undo exists only in a toast timer, destructive decisions are not actually recoverable.
- **Non-atomic audit writes:** If the mutation succeeds but audit insert fails, the trust model is broken.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Review queue durability | In-memory arrays or local component state as the source of truth | SQLite-backed `review_items` rows and repository queries | The queue must survive restarts, batch reopening, and partial sessions. |
| Undo/restore safety | Ephemeral toast-only rollback logic | Soft-resolution state plus persisted prior snapshot metadata | D-17 requires recoverability, not just a short-lived UI affordance. |
| History counters | Renderer-side `reduce()` over whatever rows happen to be loaded | Indexed repository aggregate queries | Counts must stay consistent across views and large batches. |
| Review mutation validation | Ad hoc conditionals per IPC handler | Shared Zod-backed contracts | Review actions are high-risk and need stable typed payloads. |
| Live updates | Homegrown event bus or polling loop | Explicit refetch-after-mutation over the existing preload IPC surface | Local desktop data does not need subscription infrastructure for this phase. |
| High-write concurrency tuning | Custom job queue before measuring anything | `better-sqlite3` transactions plus WAL mode | The documented SQLite path is simpler and fits the local single-user workload. |

**Key insight:** The tricky work in this phase is not rendering the queue. It is modeling reversible, auditable, partially accepted import state without losing trust or allowing summary drift.

## Common Pitfalls

### Pitfall 1: Modeling Review as a UI Filter Instead of Domain State
**What goes wrong:** Unresolved rows can be shown after import, but they cannot be reopened later or survive relaunch.
**Why it happens:** Teams extend the staged-import UI without adding persistence for unresolved cases.
**How to avoid:** Introduce durable review-item rows and history queries before building the final screens.
**Warning signs:** Review data only exists in renderer state or `ImportCoordinator.stagedImportFiles`.

### Pitfall 2: Treating All Review Items as Blocking
**What goes wrong:** Warning-level imports stop completely, which violates IMPT-06 and slows throughput.
**Why it happens:** Severity is not modeled explicitly.
**How to avoid:** Store `blocking` vs `warning` on each unresolved item and make coordinator commit behavior depend on that severity.
**Warning signs:** Any unresolved item prevents accepted transactions from being created.

### Pitfall 3: Counter Drift Between Queue and History
**What goes wrong:** A batch detail screen says 2 unresolved items while history says 3.
**Why it happens:** Summary counts are denormalized but not updated in the same transaction as the resolution.
**How to avoid:** Recompute counts transactionally after each mutation or maintain them in the same SQLite transaction.
**Warning signs:** Counts differ across views after bulk actions or undo.

### Pitfall 4: Making Review Edits Too Powerful
**What goes wrong:** Owners can "fix" imported numbers inside review, undermining statement trust.
**Why it happens:** Review editing is treated like generic transaction editing.
**How to avoid:** Lock amount and running balance in Phase 3. Limit edits to date, description, reference ID, and tags per D-13/D-14.
**Warning signs:** Review forms include amount or balance controls.

### Pitfall 5: Failing to Persist Failed Attempts
**What goes wrong:** Import history only shows successes, so the owner loses a trustworthy receipt of what happened.
**Why it happens:** Existing schema records only committed batches.
**How to avoid:** Add a separate attempt-level record for rejected/failed imports and map it into history status badges.
**Warning signs:** Fully rejected imports disappear after the summary screen closes.

### Pitfall 6: Adding Queue Optimism Without Recovery Semantics
**What goes wrong:** The UI looks fast, but a failed mutation leaves queue/history state inconsistent.
**Why it happens:** Optimistic UI is added without a persisted rollback model.
**How to avoid:** Use `useOptimistic` only on top of authoritative repository refetch and persisted reversibility.
**Warning signs:** The queue removes an item locally before the underlying mutation is confirmed and there is no restore path.

## Code Examples

Verified patterns from official sources and current repo conventions:

### Main-Process Invoke/Handle IPC for Import Operations
```ts
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc
ipcMain.handle('import:history:list', async () => {
  return repository.listImportHistory()
})

contextBridge.exposeInMainWorld('walnut', {
  listImportHistory: () => ipcRenderer.invoke('import:history:list')
})
```

### Non-Blocking Refresh After Review Mutations
```ts
// Source: https://react.dev/reference/react/startTransition
import { startTransition } from 'react'

async function refreshBatch(batchId: string) {
  const next = await window.walnut.getReviewQueue({ batchId })
  startTransition(() => {
    setReviewQueue(next)
  })
}
```

### Defer Expensive Filtered Queue Rendering
```ts
// Source: https://react.dev/reference/react/useDeferredValue
import { useDeferredValue, useState } from 'react'

function ReviewQueueScreen() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const visibleItems = filterItems(reviewItems, deferredQuery)
  // render grouped results
}
```

### Optimistic Removal With Recovery
```ts
// Source: https://react.dev/reference/react/useOptimistic
import { useOptimistic } from 'react'

const [optimisticItems, removeOptimistically] = useOptimistic(items, (current, id: string) =>
  current.filter((item) => item.id !== id)
)
```

### Atomic SQLite Mutation
```ts
// Source: established transaction pattern in
// /f:/BitBytes/github/walnut-expense-analyser/src/main/persistence/db.ts
const tx = sqlite.transaction((reviewItemIds: string[]) => {
  for (const reviewItemId of reviewItemIds) {
    updateReviewItem.run(reviewItemId)
    insertAuditEvent.run(reviewItemId)
  }
  refreshBatchCounters.run()
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Add another client cache/store for any multi-screen data | Use React 19 transitions/optimistic hooks plus authoritative server-state refetch | React 19.2 docs current as of 2026-03-27 | Phase 3 can stay within the repo's simple renderer architecture without adding a second state system. |
| Treat "live updates" as subscriptions/websocket-style infrastructure | In a local single-user Electron app, refetch-after-mutation is the current pragmatic choice | Inference from current Electron + local SQLite architecture, supported by modern React concurrency APIs | Lower complexity, fewer sync bugs, still satisfies D-12. |
| Store only successful imports as history | Modern personal-finance import UX keeps a durable receipt of outcomes, including review-needed and failed work | Verified by current Quicken and Monarch help flows | Users expect to revisit what happened, not just what succeeded. |
| Generic flat "needs review" lists | Batch/context-aware review grouped by source import | Verified by this phase's locked decisions and current finance-app help patterns | Preserves trust because the user sees source context before resolving ambiguity. |

**Deprecated/outdated:**
- Renderer-owned filesystem/import state as a system of record.
- Silent acceptance of ambiguous rows without a review trail.
- Undo that exists only as a temporary toast.

## Open Questions

1. **Should balance-continuity warnings attach to a single row or the batch/file level?**
   - What we know: D-01 requires them in the queue, and current parser warnings are file-level strings.
   - What's unclear: Whether the user should resolve them one row at a time or once per batch/file warning.
   - Recommendation: Model them as batch/file-scoped review items with enough row context in `snapshotJson` to drill into the implicated transactions.

2. **How much denormalized counter storage is worth keeping?**
   - What we know: History needs live counts and status badges.
   - What's unclear: Whether to fully recompute counts on read or store summary columns and refresh them on write.
   - Recommendation: Store summary columns on `import_attempts`/`import_batches`, but recompute/update them in the same transaction as each review mutation.

3. **What exact undo window UX should the planner choose?**
   - What we know: D-17 requires undo or soft-restore, but not the precise interaction.
   - What's unclear: Whether the first ship should use a timed snackbar, inline restore action, or a dedicated "recently resolved" affordance.
   - Recommendation: Build persisted soft-restore first; let UI timing be secondary.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Electron build/test runtime | Yes | `v22.16.0` | - |
| npm | Script execution and package resolution | Yes | repo uses npm; direct PowerShell `npm` is policy-blocked | Use `cmd /c npm ...` |
| Vitest | Unit/component validation | Yes | repo dependency `3.2.4` | `cmd /c npm run test:unit` |
| Playwright | End-to-end validation | Yes | repo dependency `1.55.0` | Run targeted unit coverage if browser validation is temporarily blocked |
| Electron CLI/runtime | Desktop execution | Yes | repo dependency `30.5.1` | `npm run dev:electron` / `npm run build` |

**Missing dependencies with no fallback:**
- None identified for planning.

**Missing dependencies with fallback:**
- Direct `npm` and `npx` invocation from PowerShell is blocked by execution policy on this machine; use `cmd /c npm ...` and `cmd /c npx ...`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` and Playwright `1.55.0` |
| Config file | [vitest.config.ts](/f:/BitBytes/github/walnut-expense-analyser/vitest.config.ts), [playwright.config.ts](/f:/BitBytes/github/walnut-expense-analyser/playwright.config.ts) |
| Quick run command | `cmd /c npx vitest run tests/unit/import/*.test.ts tests/unit/*review*.test.tsx` |
| Full suite command | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/import-flow.spec.ts tests/e2e/review-queue.spec.ts` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPT-05 | Ambiguous duplicates/parser cases persist as review items instead of silent acceptance | unit | `cmd /c npx vitest run tests/unit/import/review-routing.test.ts` | No - Wave 0 |
| IMPT-06 | Blocking vs warning review items gate import completion correctly | unit | `cmd /c npx vitest run tests/unit/import/review-gating.test.ts` | No - Wave 0 |
| IMPT-07 | Import history lists all attempts with counts and statuses | unit + component | `cmd /c npx vitest run tests/unit/import/history-repository.test.ts tests/unit/import-history.test.tsx` | No - Wave 0 |
| REVW-01 | User can reopen queue later, resolve partially, and continue across sessions | e2e + unit | `cmd /c npx playwright test tests/e2e/review-queue.spec.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cmd /c npx vitest run tests/unit/import/*.test.ts tests/unit/*review*.test.tsx`
- **Per wave merge:** `cmd /c npm run test:unit`
- **Phase gate:** `cmd /c npm run test:unit` plus `cmd /c npx playwright test tests/e2e/import-flow.spec.ts tests/e2e/review-queue.spec.ts`

### Wave 0 Gaps
- [ ] `tests/unit/import/review-routing.test.ts` - unresolved-item creation by reason/severity
- [ ] `tests/unit/import/review-gating.test.ts` - blocking vs warning completion behavior
- [ ] `tests/unit/import/history-repository.test.ts` - import attempt history, counters, and reopen queries
- [ ] `tests/unit/import/review-mutations.test.ts` - atomic resolution, undo, and audit emission
- [ ] `tests/unit/import-history.test.tsx` - renderer history list/detail screens
- [ ] `tests/unit/review-queue.test.tsx` - grouped queue, bulk actions, optimistic refresh behavior
- [ ] `tests/e2e/review-queue.spec.ts` - reopen unresolved batch, partial resolution, live count updates, undo

## Sources

### Primary (HIGH confidence)
- Local repo files:
  - `AGENTS.md`
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/STATE.md`
  - `.planning/config.json`
  - `.planning/phases/03-review-queue-and-import-history/03-CONTEXT.md`
  - `.planning/phases/02-statement-import-pipeline/02-RESEARCH.md`
  - `package.json`
  - `src/main/import/import-coordinator.ts`
  - `src/main/import/parser.ts`
  - `src/main/ipc/import.ts`
  - `src/main/persistence/db.ts`
  - `src/main/persistence/schema.ts`
  - `src/preload/index.ts`
  - `src/shared/contracts/app-state.ts`
  - `src/shared/contracts/import.ts`
  - `src/renderer/App.tsx`
  - `src/renderer/features/import/ImportWorkspace.tsx`
  - `src/renderer/features/import/ImportSummary.tsx`
  - `src/renderer/mockWalnutApi.ts`
  - `tests/unit/import/persistence.test.ts`
  - `tests/unit/import/duplicates.test.ts`
  - `tests/unit/import-workspace.test.tsx`
  - `tests/e2e/import-flow.spec.ts`
- Electron IPC tutorial: https://www.electronjs.org/docs/latest/tutorial/ipc
- React `startTransition`: https://react.dev/reference/react/startTransition
- React `useDeferredValue`: https://react.dev/reference/react/useDeferredValue
- React `useOptimistic`: https://react.dev/reference/react/useOptimistic
- Drizzle SQLite docs: https://orm.drizzle.team/docs/get-started-sqlite
- better-sqlite3 README: https://github.com/WiseLibs/better-sqlite3
- Monarch review guidance: https://help.monarch.com/hc/en-us/articles/5528707082516-Reviewing-Transactions
- Monarch manual import guidance: https://help.monarch.com/hc/en-us/articles/4409682789908-Importing-Transaction-History-Manually
- Quicken Windows import guidance: https://www.quicken.com/support/how-do-i-import-data-quicken-windows/

### Secondary (MEDIUM confidence)
- npm registry package metadata for version verification:
  - `electron`
  - `react`
  - `better-sqlite3`
  - `drizzle-orm`
  - `zod`
  - `vitest`
  - `@playwright/test`
  - `date-fns`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - recommendations stay on the repo's existing libraries and versions were verified against the npm registry.
- Architecture: HIGH - directly supported by locked phase decisions, current code seams, and official Electron/React/SQLite documentation.
- Pitfalls: HIGH - they follow directly from the current Phase 2 data model gaps and the finance trust constraints locked in project artifacts.

**Research date:** 2026-03-27
**Valid until:** 2026-04-03
