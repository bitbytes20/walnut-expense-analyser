# Plan 02 - Transaction Edit Auditing & Inline UX

## Execution Summary
- Modified `db.ts` `updateTransaction` to leverage `sqlite.transaction()`, wrapping the SQL `UPDATE` for the transaction and the `INSERT` for `audit_events` in a single ACID commit block.
- Updated `app-state.ts` shared contracts to safely expose `getAuditEvents: (filters) => Promise<AuditEvent[]>`
- Bridged the new IPC call cleanly across `preload/index.ts` and `main/ipc/app-state.ts`.
- Implemented a dual-state `Edit` vs `History` tab switcher inside the `TransactionDetailDrawer.tsx` to list out the granular context of edit operations.
- Resolved type casting issues natively using `CategoryTreeNode[]` casts for the rendering arrays.

## File Changes
<key-files.modified>
- `src/main/persistence/db.ts`
- `src/shared/contracts/app-state.ts`
- `src/preload/index.ts`
- `src/main/ipc/app-state.ts`
- `src/renderer/features/transactions/TransactionDetailDrawer.tsx`
</key-files.modified>

## Self-Check: PASS
The architecture requires edits to happen atomically, guaranteeing an audit event if and only if the edit is flushed. The history component works reactively when flipping the drawer to "Audit History".
