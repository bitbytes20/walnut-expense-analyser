# Phase 2: Statement Import Pipeline - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the first trusted statement-ingestion flow for known ICICI exports. This phase covers file selection, staging, format detection, parsing, record-only persistence, and clear duplicate blocking for CSV, XLS, and XLSX statements. Ambiguous duplicate triage, review-queue resolution, and import history browsing belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Import Entry Flow
- **D-01:** Import should be launchable from both the dashboard empty state and the dedicated Import Statements screen.
- **D-02:** Phase 2 should allow selecting multiple statement files in one import action.
- **D-03:** After file selection, imports should first enter a lightweight staging step before parsing starts.
- **D-04:** If onboarding account setup was skipped, the first successful import should auto-create the account profile and then show a confirmation summary to the owner.

### Format Detection and Validation
- **D-05:** Phase 2 should use best-effort parsing as long as the key ICICI columns are recognizable, rather than requiring an exact export template match.
- **D-06:** Rejection errors should explain the exact reason for rejection and include guidance describing what supported exports look like.
- **D-07:** For Excel files, if multiple worksheets look plausible, the app should ask the user to choose which sheet to parse.
- **D-08:** In a multi-file selection, valid files should continue through the flow while invalid files are rejected individually rather than blocking the entire batch.

### Parsed Transaction Shape
- **D-09:** Phase 2 should preserve these raw fields from the statement when available: transaction date, value date, raw narration/description, debit amount, credit amount, running balance, statement reference or cheque or transaction ID, source file identifier, and import batch identifier.
- **D-10:** Phase 2 should derive only a basic debit/credit direction during normalization and should defer richer financial typing like expense, income, or transfer classification to later phases.
- **D-11:** The import model should preserve both the original raw narration and a cleaned display description for UI readability.
- **D-12:** Parse-time validation should perform a soft balance continuity check and flag suspicious discontinuities without hard-failing the import.

### Duplicate Blocking Strategy
- **D-13:** Clear duplicate blocking should use both file-level fingerprinting and transaction-level matching.
- **D-14:** The app should still block a re-imported statement even if the same file has been renamed.
- **D-15:** Transaction-level duplicate matching should use exact matching plus a small tolerance for harmless formatting differences.
- **D-16:** When a duplicate is blocked, the app should show the reason, reference the earlier import batch, and offer a way to inspect that earlier batch.

### the agent's Discretion
- Exact visual structure of the staging step as long as it keeps the premium finance-dashboard feel and clearly separates ready, invalid, and duplicate files
- Exact normalization heuristics for cleaned display descriptions, provided the raw narration remains canonical
- Exact fingerprint implementation details for file-level and transaction-level duplicate detection
- Exact thresholds for balance soft-check warnings and formatting-tolerance comparisons

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning artifacts
- `.planning/PROJECT.md` - Product vision, privacy posture, import trust principles, and release-1 constraints
- `.planning/REQUIREMENTS.md` - Phase-linked requirements including `IMPT-01`, `IMPT-02`, `IMPT-03`, and `IMPT-04`
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, and roadmap sequencing
- `.planning/STATE.md` - Current project status and next planning target
- `.planning/phases/01-product-shell-and-security/01-CONTEXT.md` - Prior locked decisions that affect lazy account creation and dashboard handoff

### Existing implementation
- `src/main/persistence/db.ts` - Current SQLite repository and account/security persistence boundaries that the import pipeline must extend
- `src/main/persistence/schema.ts` - Existing schema conventions and likely integration point for import records
- `src/shared/contracts/account.ts` - Current single-account ICICI contract shape and fields available for lazy account creation
- `src/shared/contracts/app-state.ts` - Current shell state contracts that will need import-state extension
- `src/renderer/App.tsx` - Existing empty-dashboard entry point and first-import handoff
- `src/renderer/features/dashboard/EmptyDashboard.tsx` - Dashboard import CTA entry surface

### External transaction-shape references
- `https://plaid.com/docs/api/products/transactions/` - Reference model for keeping both canonical/raw transaction descriptions and richer display-facing fields
- `https://plaid.com/docs/transactions/` - Additional transaction-field and normalization context
- `https://teller.io/docs/api/account/transactions` - Reference model for preserving institution descriptions and optional running balance data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/persistence/db.ts` already establishes the local SQLite repository pattern, singleton access, and row-mapping approach that import persistence should reuse.
- `src/shared/contracts/*` already define the shared contract style between main, preload, and renderer, which Phase 2 should extend instead of inventing local-only types.
- `src/renderer/features/dashboard/EmptyDashboard.tsx` provides the first import CTA surface that can route into the new import flow.
- `src/renderer/features/app-shell/AppShell.tsx` provides the current branded shell wrapper for any new import screens or staging states.

### Established Patterns
- Main-process capabilities are exposed through typed preload IPC methods rather than direct renderer filesystem access.
- SQLite is the local source of truth, with lightweight repository methods owning persistence and row-shape translation.
- The renderer already uses feature-scoped components and shared inline token-driven styling rather than ad hoc page-level structure.
- The product is already carrying a browser-backed mock API harness for development, so import contracts may need mock implementations alongside real IPC handlers.

### Integration Points
- New import entry points should connect from the empty dashboard CTA and the future Import Statements screen route/entry.
- Import state, batch metadata, and duplicate-check results will likely extend `src/shared/contracts/app-state.ts` and the main repository in `src/main/persistence/db.ts`.
- Lazy account creation after first successful import must integrate with the existing account-profile persistence path rather than bypassing it.
- Phase 2 should leave clean extension points for Phase 3 review queue and import history without implementing those full capabilities yet.

</code_context>

<specifics>
## Specific Ideas

- Import should feel staged and trustworthy rather than immediately destructive or opaque.
- Multi-file import should act like a curated batch where each file can independently succeed or fail without collapsing the whole flow.
- File retention remains explicitly out of bounds; the system should persist imported records and metadata only.
- Duplicate messaging should feel investigable, not merely blocking, by giving the owner a path back to the earlier import batch.

</specifics>

<deferred>
## Deferred Ideas

- Ambiguous duplicate resolution and parser-confidence review handling belong to Phase 3: Review Queue and Import History.
- Batch-level history browsing and deep inspection UIs belong to Phase 3 beyond the minimum prior-batch reference needed for duplicate blocking.

</deferred>

---
*Phase: 02-statement-import-pipeline*
*Context gathered: 2026-03-27*
